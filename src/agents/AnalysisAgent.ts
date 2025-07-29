import { ApiClient } from '../utils/JuliaOSMock';
import { Logger } from '../utils/Logger';
import { YieldOpportunity, PortfolioAllocation, AgentStatus, SwarmMessage, MessageType, MessagePriority } from '../types';
import { YieldCalculator } from '../defi/YieldCalculator';

export class AnalysisAgent {
  private client: ApiClient;
  private logger: Logger;
  private yieldCalculator: YieldCalculator;
  private status: AgentStatus = AgentStatus.INACTIVE;
  private opportunities: Map<string, YieldOpportunity> = new Map();
  private currentPortfolio: PortfolioAllocation[] = [];

  constructor(client: ApiClient) {
    this.client = client;
    this.logger = new Logger('AnalysisAgent');
    this.yieldCalculator = new YieldCalculator();
  }

  async start(): Promise<void> {
    this.logger.info('Starting Analysis Agent');
    this.status = AgentStatus.STARTING;

    try {
      // Initialize yield calculator
      await this.yieldCalculator.initialize();
      
      this.status = AgentStatus.ACTIVE;
      this.logger.success('Analysis Agent started successfully');
    } catch (error) {
      this.status = AgentStatus.ERROR;
      this.logger.error('Failed to start Analysis Agent:', error);
      throw error;
    }
  }

  async processYieldOpportunity(opportunity: YieldOpportunity): Promise<void> {
    this.logger.debug(`Processing yield opportunity: ${opportunity.id} with ${opportunity.apy.toFixed(2)}% APY`);

    try {
      // Store the opportunity
      this.opportunities.set(opportunity.id, opportunity);

      // Perform portfolio optimization
      await this.optimizePortfolio();
    } catch (error) {
      this.logger.error(`Error processing opportunity ${opportunity.id}:`, error);
    }
  }

  private async optimizePortfolio(): Promise<void> {
    this.logger.debug('Performing portfolio optimization...');

    try {
      // Get all current opportunities
      const opportunities = Array.from(this.opportunities.values());

      if (opportunities.length === 0) {
        this.logger.debug('No opportunities available for optimization');
        return;
      }

      // Calculate optimal allocations using Julia backend
      const optimalAllocations = await this.calculateOptimalAllocations(opportunities);

      // Update current portfolio
      this.currentPortfolio = optimalAllocations;

      // Broadcast portfolio update
      await this.broadcastPortfolioUpdate(optimalAllocations);

      this.logger.info(`Portfolio optimized with ${optimalAllocations.length} allocations`);
    } catch (error) {
      this.logger.error('Error optimizing portfolio:', error);
    }
  }

  private async calculateOptimalAllocations(opportunities: YieldOpportunity[]): Promise<PortfolioAllocation[]> {
    this.logger.debug(`Calculating optimal allocations for ${opportunities.length} opportunities`);

    try {
      // Prepare data for Julia optimization
      const optimizationData = {
        opportunities: opportunities.map(opp => ({
          id: opp.id,
          expectedYield: opp.apy / 100, // Convert to decimal
          riskScore: opp.riskScore,
          chain: opp.chain,
          tvl: opp.tvl,
          volume24h: opp.volume24h
        })),
        constraints: {
          riskTolerance: 0.3, // 30% risk tolerance
          maxAllocationPerOpportunity: 0.2, // Max 20% per opportunity
          minAllocationPerOpportunity: 0.05, // Min 5% per opportunity
          totalAllocation: 1.0 // 100% allocation
        }
      };

      // Call Julia backend for optimization
      const result = await this.yieldCalculator.optimizePortfolio(optimizationData);

      // Convert result to portfolio allocations
      const allocations: PortfolioAllocation[] = result.allocations.map((allocation: any) => ({
        opportunityId: allocation.opportunityId,
        allocation: allocation.allocation,
        expectedYield: allocation.expectedYield,
        riskScore: allocation.riskScore,
        chain: allocation.chain
      }));

      return allocations;
    } catch (error) {
      this.logger.error('Error calculating optimal allocations:', error);
      
      // Fallback to simple allocation strategy
      return this.calculateFallbackAllocations(opportunities);
    }
  }

  private calculateFallbackAllocations(opportunities: YieldOpportunity[]): PortfolioAllocation[] {
    this.logger.warn('Using fallback allocation strategy');

    // Simple strategy: allocate equally among top opportunities
    const topOpportunities = opportunities
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 5); // Top 5 opportunities

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
    const message: SwarmMessage = {
      id: `portfolio-update-${Date.now()}`,
      type: MessageType.PORTFOLIO_UPDATE,
      source: 'analysis',
      data: {
        allocations,
        timestamp: Date.now(),
        totalExpectedYield: this.calculateTotalExpectedYield(allocations),
        totalRisk: this.calculateTotalRisk(allocations)
      },
      timestamp: Date.now(),
      priority: MessagePriority.HIGH
    };

    await this.client.swarm.broadcast(message);
    this.logger.debug(`Broadcasted portfolio update with ${allocations.length} allocations`);
  }

  private calculateTotalExpectedYield(allocations: PortfolioAllocation[]): number {
    return allocations.reduce((total, allocation) => {
      return total + (allocation.allocation * allocation.expectedYield);
    }, 0) * 100; // Convert back to percentage
  }

  private calculateTotalRisk(allocations: PortfolioAllocation[]): number {
    // Calculate weighted average risk
    const totalAllocation = allocations.reduce((sum, allocation) => sum + allocation.allocation, 0);
    
    if (totalAllocation === 0) return 0;

    return allocations.reduce((total, allocation) => {
      return total + (allocation.allocation * allocation.riskScore);
    }, 0) / totalAllocation;
  }

  async handleRiskAlert(riskAlert: any): Promise<void> {
    this.logger.warn(`Handling risk alert: ${riskAlert.message}`);

    try {
      // Remove affected opportunities from portfolio
      const affectedOpportunities = riskAlert.affectedOpportunities || [];
      
      for (const opportunityId of affectedOpportunities) {
        this.opportunities.delete(opportunityId);
      }

      // Re-optimize portfolio without affected opportunities
      await this.optimizePortfolio();

      this.logger.info(`Portfolio re-optimized after risk alert affecting ${affectedOpportunities.length} opportunities`);
    } catch (error) {
      this.logger.error('Error handling risk alert:', error);
    }
  }

  async onMessage(message: SwarmMessage): Promise<void> {
    this.logger.debug(`Received message: ${message.type}`);

    switch (message.type) {
      case MessageType.YIELD_OPPORTUNITY:
        this.logger.info(`[DEBUG] AnalysisAgent received YIELD_OPPORTUNITY: ${message.data.id}`);
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

    await this.yieldCalculator.shutdown();
    this.logger.success('Analysis Agent shutdown completed');
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getCurrentPortfolio(): PortfolioAllocation[] {
    return [...this.currentPortfolio];
  }

  getOpportunityCount(): number {
    return this.opportunities.size;
  }

  getPortfolioMetrics(): any {
    const totalYield = this.calculateTotalExpectedYield(this.currentPortfolio);
    const totalRisk = this.calculateTotalRisk(this.currentPortfolio);

    return {
      totalExpectedYield: totalYield,
      totalRisk,
      allocationCount: this.currentPortfolio.length,
      opportunityCount: this.opportunities.size
    };
  }
}