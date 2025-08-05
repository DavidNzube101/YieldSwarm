import { IAgentCommunication } from '../swarm/SwarmCoordinator';
import { Logger } from '../utils/Logger';
import { YieldOpportunity, PortfolioAllocation, AgentStatus, SwarmMessage, MessageType, MessagePriority } from '../types';
import { YieldCalculator } from '../defi/YieldCalculator';
import { CustomJuliaBridge } from '../../backend/CustomJuliaBridge';

export class AnalysisAgent {
  private client: IAgentCommunication;
  private logger: Logger;
  private yieldCalculator: YieldCalculator;
  private bridge: CustomJuliaBridge;
  private status: AgentStatus = AgentStatus.INACTIVE;
  private opportunities: Map<string, YieldOpportunity> = new Map();
  private currentPortfolio: PortfolioAllocation[] = [];
  private optimizationTimeout: NodeJS.Timeout | null = null;
  private isOptimizationPending: boolean = false;

  constructor(client: IAgentCommunication, bridge: CustomJuliaBridge) {
    this.client = client;
    this.logger = new Logger('AnalysisAgent');
    this.yieldCalculator = new YieldCalculator();
    this.bridge = bridge;
  }

  async start(): Promise<void> {
    this.logger.info('Starting Analysis Agent');
    this.status = AgentStatus.STARTING;

    try {
      await this.yieldCalculator.initialize();
      this.status = AgentStatus.ACTIVE;
      this.logger.success('Analysis Agent started successfully');
    } catch (error) {
      this.status = AgentStatus.ERROR;
      this.logger.error('Failed to start Analysis Agent:', error);
      throw error;
    }
  }

  private scheduleOptimization(): void {
    // If an optimization is already scheduled, do nothing.
    if (this.isOptimizationPending) {
      this.logger.debug('Optimization already pending, skipping new schedule.');
      return;
    }
    this.isOptimizationPending = true;
    this.logger.info('Scheduling portfolio optimization in 5 seconds...');

    // Clear any existing timeout to avoid multiple concurrent optimizations
    if (this.optimizationTimeout) {
      clearTimeout(this.optimizationTimeout);
    }

    this.optimizationTimeout = setTimeout(async () => {
      await this.optimizePortfolio();
      this.isOptimizationPending = false;
      this.optimizationTimeout = null;
    }, 5000); // 5-second debounce/cooldown period
  }

  async processYieldOpportunity(opportunity: YieldOpportunity): Promise<void> {
    this.logger.debug(`Processing yield opportunity: ${opportunity.id}`);
    this.opportunities.set(opportunity.id, opportunity);
    this.scheduleOptimization();
  }

  private async optimizePortfolio(): Promise<void> {
    this.logger.info('Performing portfolio optimization...');
    const opportunities = Array.from(this.opportunities.values());

    if (opportunities.length === 0) {
      this.logger.debug('No opportunities available for optimization');
      return;
    }

    try {
      const optimalAllocations = await this.calculateOptimalAllocations(opportunities);
      this.currentPortfolio = optimalAllocations;
      await this.broadcastPortfolioUpdate(optimalAllocations);
      this.logger.success(`Portfolio optimized and broadcasted with ${optimalAllocations.length} allocations`);
    } catch (error) {
      this.logger.error('Error optimizing portfolio:', error);
    }
  }

  private async calculateOptimalAllocations(opportunities: YieldOpportunity[]): Promise<PortfolioAllocation[]> {
    this.logger.debug(`Calculating optimal allocations for ${opportunities.length} opportunities`);

    try {
      // First, try LLM-based optimization
      const llmAllocations = await this.optimizeWithLLM(opportunities);
      if (llmAllocations && llmAllocations.length > 0) {
        this.logger.info('Using LLM-optimized allocations');
        return llmAllocations;
      }
      const optimizationData = this._toSnakeCase({
        opportunities: opportunities.map(opp => ({
          id: opp.id,
          expectedYield: opp.apy / 100,
          riskScore: opp.riskScore,
          chain: opp.chain,
          tvl: opp.tvl,
          volume24h: opp.volume24h
        })),
        constraints: {
          riskTolerance: 0.8, // Increased from 0.7
          maxAllocationPerOpportunity: 0.3, // Increased from 0.2
          minAllocationPerOpportunity: 0.01, // Decreased from 0.05
          totalAllocation: 1.0
        }
      });

      const result = await this.yieldCalculator.optimizePortfolio(optimizationData);
      return result.allocations.map((allocation: any) => ({
        opportunityId: allocation.opportunity_id,
        allocation: allocation.allocation,
        expectedYield: allocation.expected_yield,
        riskScore: allocation.risk_score,
        chain: allocation.chain
      }));
    } catch (error) {
      this.logger.error('Error calculating optimal allocations:', error);
      return this.calculateFallbackAllocations(opportunities);
    }
  }

  // --- LLM Integration Methods ---

  private async optimizeWithLLM(opportunities: YieldOpportunity[]): Promise<PortfolioAllocation[]> {
    try {
      this.logger.info('Attempting LLM-based portfolio optimization...');
      
      const llmResult = await this.bridge.runCommand('llm.optimize_allocation', {
        opportunities: opportunities.map(opp => ({
          id: opp.id,
          apy: opp.apy,
          riskScore: opp.riskScore,
          chain: opp.chain,
          tvl: opp.tvl,
          volume24h: opp.volume24h,
          dex: opp.dex,
          pool: opp.pool
        })),
        constraints: {
          riskTolerance: 0.8, // Increased from 0.7
          maxAllocationPerOpportunity: 0.3, // Increased from 0.2
          minAllocationPerOpportunity: 0.01, // Decreased from 0.05
          totalAllocation: 1.0
        },
        provider: 'echo', // For now using echo, can be changed to 'openai', 'anthropic', etc.
        config: {
          model: 'gpt-4',
          temperature: 0.7
        }
      });

      if (llmResult && llmResult.response) {
        this.logger.info('Successfully received LLM-optimized allocations');
        return this.parseLLMAllocationResult(llmResult.response, opportunities);
      }
      
      return [];
    } catch (error) {
      this.logger.warn('LLM optimization failed, falling back to traditional method:', error);
      return [];
    }
  }

  private parseLLMAllocationResult(llmResponse: string, opportunities: YieldOpportunity[]): PortfolioAllocation[] {
    try {
      this.logger.debug('Parsing LLM allocation result:', llmResponse);
      
      // For echo LLM, create a simple allocation based on APY ranking
      if (llmResponse.includes('LLM Response:')) {
        this.logger.info('Using echo LLM fallback allocation');
        return this.createFallbackAllocationFromAPY(opportunities);
      }
      
      // Try to parse JSON response from real LLM
      const response = JSON.parse(llmResponse);
      
      if (response.allocations && Array.isArray(response.allocations)) {
        return response.allocations.map((allocation: any) => ({
          opportunityId: allocation.opportunityId || allocation.id,
          allocation: allocation.allocation || allocation.percentage,
          expectedYield: allocation.expectedYield || 0,
          riskScore: allocation.riskScore || 0.5,
          chain: allocation.chain || 'unknown'
        }));
      }
      
      // Fallback parsing for different response formats
      return this.calculateFallbackAllocations(opportunities);
    } catch (error) {
      this.logger.warn('Failed to parse LLM allocation result, using fallback:', error);
      return this.calculateFallbackAllocations(opportunities);
    }
  }

  private createFallbackAllocationFromAPY(opportunities: YieldOpportunity[]): PortfolioAllocation[] {
    // Sort opportunities by APY (highest first)
    const sortedOpportunities = [...opportunities].sort((a, b) => b.apy - a.apy);
    
    // Create allocation based on APY ranking
    const totalAllocation = 1.0;
    const maxAllocationPerOpportunity = 0.2;
    const minAllocationPerOpportunity = 0.05;
    
    const allocations: PortfolioAllocation[] = [];
    let remainingAllocation = totalAllocation;
    
    for (let i = 0; i < sortedOpportunities.length && remainingAllocation > 0; i++) {
      const opportunity = sortedOpportunities[i];
      
      if (!opportunity) continue;
      
      // Calculate allocation based on APY ranking
      let allocation = Math.min(maxAllocationPerOpportunity, remainingAllocation);
      
      // Ensure minimum allocation
      if (allocation < minAllocationPerOpportunity && remainingAllocation >= minAllocationPerOpportunity) {
        allocation = minAllocationPerOpportunity;
      }
      
      if (allocation > 0) {
        allocations.push({
          opportunityId: opportunity.id,
          allocation: allocation,
          expectedYield: opportunity.apy / 100,
          riskScore: opportunity.riskScore,
          chain: opportunity.chain
        });
        
        remainingAllocation -= allocation;
      }
    }
    
    this.logger.info(`Created LLM fallback allocation with ${allocations.length} opportunities`);
    return allocations;
  }

  private calculateFallbackAllocations(opportunities: YieldOpportunity[]): PortfolioAllocation[] {
    this.logger.warn('Using fallback allocation strategy');
    const topOpportunities = opportunities.sort((a, b) => b.apy - a.apy).slice(0, 5);
    const equalAllocation = 1.0 / topOpportunities.length;
    return topOpportunities.map(opp => ({
      opportunityId: opp.id,
      allocation: equalAllocation,
      expectedYield: opp.apy / 100,
      riskScore: opp.riskScore,
      chain: opp.chain
    }));
  }

  private async broadcastPortfolioUpdate(allocations: PortfolioAllocation[]): Promise<void> {
    const messageData = {
      allocations,
      timestamp: Date.now(),
      totalExpectedYield: this.calculateTotalExpectedYield(allocations),
      totalRisk: this.calculateTotalRisk(allocations)
    };
    
    this.logger.info('Broadcasting portfolio update to all agents and UI.');
    await this.client.broadcastMessage(MessageType.PORTFOLIO_UPDATE, messageData, 'analysis', MessagePriority.HIGH);
  }

  private calculateTotalExpectedYield(allocations: PortfolioAllocation[]): number {
    return allocations.reduce((total, item) => total + (item.allocation * item.expectedYield), 0) * 100;
  }

  private calculateTotalRisk(allocations: PortfolioAllocation[]): number {
    const totalAllocation = allocations.reduce((sum, item) => sum + item.allocation, 0);
    if (totalAllocation === 0) return 0;
    return allocations.reduce((total, item) => total + (item.allocation * item.riskScore), 0) / totalAllocation;
  }

  async handleRiskAlert(riskAlert: any): Promise<void> {
    this.logger.warn(`Received risk alert: "${riskAlert.message}". Re-scheduling optimization.`);
    const affectedOpportunities = riskAlert.affectedOpportunities || [];
    for (const opportunityId of affectedOpportunities) {
      this.opportunities.delete(opportunityId);
    }
    this.scheduleOptimization();
  }

  async onMessage(message: SwarmMessage): Promise<void> {
    this.logger.debug(`Received message: ${message.type}`);
    switch (message.type) {
      case MessageType.YIELD_OPPORTUNITY:
        await this.processYieldOpportunity(message.data);
        break;
      case MessageType.RISK_ALERT:
        await this.handleRiskAlert(message.data);
        break;
      default:
        this.logger.debug(`Unhandled message type: ${message.type}`);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Analysis Agent');
    this.status = AgentStatus.INACTIVE;
    if (this.optimizationTimeout) {
      clearTimeout(this.optimizationTimeout);
    }
    await this.yieldCalculator.shutdown();
    this.logger.success('Analysis Agent shutdown completed');
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getCurrentPortfolio(): PortfolioAllocation[] {
    return this.currentPortfolio;
  }

  private _toSnakeCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(k => this._toSnakeCase(k));
    }
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    return Object.keys(obj).reduce((acc: Record<string, any>, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = this._toSnakeCase(obj[key]);
      return acc;
    }, {});
  }
}