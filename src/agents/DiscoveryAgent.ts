import { IAgentCommunication } from '../swarm/SwarmCoordinator';
import { Logger } from '../utils/Logger';
import { YieldOpportunity, AgentStatus, MessageType, MessagePriority, Pool } from '../types';
import { RealDEXIntegrations } from '../defi/RealDEXIntegrations';
import { CustomJuliaBridge } from '../../backend/CustomJuliaBridge';

export class DiscoveryAgent {
  private client: IAgentCommunication;
  private chain: string;
  private logger: Logger;
  private dexIntegrations: RealDEXIntegrations;
  private bridge: CustomJuliaBridge;
  private status: AgentStatus = AgentStatus.INACTIVE;
  private isRunning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;

  constructor(chain: string, client: IAgentCommunication, private globalConfig: any, bridge: CustomJuliaBridge) {
    this.client = client;
    this.bridge = bridge;
    this.chain = chain;
    this.logger = new Logger(`DiscoveryAgent-${chain}`);
    this.dexIntegrations = new RealDEXIntegrations(chain, globalConfig);
  }

  async reconfigure(newConfig: any): Promise<void> {
    this.logger.info(`Reconfiguring Discovery Agent for ${this.chain}`);
    await this.shutdown(); // Stop existing processes

    // Update config and re-initialize
    this.globalConfig = newConfig;
    this.dexIntegrations = new RealDEXIntegrations(this.chain, this.globalConfig);
    
    await this.start(); // Restart with new config
    this.logger.info(`Discovery Agent for ${this.chain} reconfigured and restarted.`);
  }

  async start(): Promise<void> {
    this.logger.info(`Starting Discovery Agent for ${this.chain}`);
    this.status = AgentStatus.STARTING;
    this.isRunning = true;

    try {
      // Initialize DEX integrations
      await this.dexIntegrations.initialize();
      
      // Start scanning for opportunities
      await this.startScanning();
      
      this.status = AgentStatus.ACTIVE;
      this.logger.success(`Discovery Agent for ${this.chain} started successfully`);
    } catch (error) {
      this.status = AgentStatus.ERROR;
      this.logger.error(`Failed to start Discovery Agent for ${this.chain}:`, error);
      throw error;
    }
  }

  private async startScanning(): Promise<void> {
    this.logger.info('Delaying initial scan for 5 seconds to allow other agents to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Initial scan
    await this.discoverOpportunities();

    // Set up periodic scanning
    this.scanInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.discoverOpportunities();
      }
    }, 300000); // Scan every 5 minutes
  }

  async discoverOpportunities(): Promise<void> {
    this.logger.debug(`Scanning for yield opportunities on ${this.chain}`);

    try {
      // First, try LLM-based discovery
      const llmOpportunities = await this.discoverWithLLM();
      if (llmOpportunities && llmOpportunities.length > 0) {
        this.logger.info(`Discovered ${llmOpportunities.length} opportunities on ${this.chain} using LLM`);
        for (const opportunity of llmOpportunities) {
          await this.broadcastOpportunity(opportunity);
        }
        return;
      }

      // Fallback to traditional discovery
      const supportedDEXes = await this.getSupportedDEXes();
      
      const opportunities: YieldOpportunity[] = [];

      // Scan each DEX for opportunities
      for (const dex of supportedDEXes) {
        try {
          const dexOpportunities = await this.scanDEX(dex);
          opportunities.push(...dexOpportunities);
        } catch (error) {
          this.logger.error(`Error scanning ${dex} on ${this.chain}:`, error);
        }
      }

      // Filter and rank opportunities
      const filteredOpportunities = await this.filterOpportunities(opportunities);
      
      // Send opportunities to Analysis Agent
      for (const opportunity of filteredOpportunities) {
        await this.broadcastOpportunity(opportunity);
      }

      this.logger.info(`Found ${filteredOpportunities.length} yield opportunities on ${this.chain}`);
    } catch (error) {
      this.logger.error(`Error discovering opportunities on ${this.chain}:`, error);
    }
  }

  private async getSupportedDEXes(): Promise<string[]> {
    // Get DEXes supported on this chain from configuration
    const chainConfig = await this.loadChainConfig();
    return chainConfig.dexes || [];
  }

  private async scanDEX(dexName: string): Promise<YieldOpportunity[]> {
    this.logger.debug(`Scanning ${dexName} on ${this.chain}`);

    try {
      // Use DEX integrations to get pool data
      const pools = await this.dexIntegrations.getPools(dexName);
      
      const opportunities: YieldOpportunity[] = [];

      for (const pool of pools) {
        try {
          const opportunity = await this.processPool(pool, dexName);
          if (opportunity) {
            opportunities.push(opportunity);
          }
        } catch (error) {
          this.logger.debug(`Error processing pool ${pool.id}:`, error);
        }
      }

      return opportunities;
    } catch (error) {
      this.logger.error(`Error scanning ${dexName}:`, error);
      return [];
    }
  }

  private async processPool(pool: Pool, dexName: string): Promise<YieldOpportunity | null> {
    try {
      // Calculate basic metrics
      const tvl = parseFloat(pool.reserve0) + parseFloat(pool.reserve1);
      const volume24h = parseFloat(pool.volumeUSD);
      
      // Get DEX configuration
      const dexConfig = this.dexIntegrations['dexes'][dexName];
      if (!dexConfig || !dexConfig.enabled) {
        return null;
      }

      // Calculate APY based on volume and fees
      const dailyVolume = volume24h;
      const dailyFees = dailyVolume * dexConfig.fee;
      const apy = (dailyFees * 365 / tvl) * 100;

      // Calculate risk score
      const riskScore = this.calculateRiskScore(tvl, volume24h, dexName);

      const opportunity: YieldOpportunity = {
        id: `${this.chain}-${dexName}-${pool.id}`,
        chain: this.chain,
        dex: dexName,
        pool: pool.id,
        poolAddress: pool.address || '',
        token0: pool.token0.id,
        token1: pool.token1.id,
        token0Symbol: pool.token0.symbol,
        token1Symbol: pool.token1.symbol,
        apy: Math.min(apy, 1000), // Cap at 1000% APY
        tvl,
        volume24h,
        fee: dexConfig.fee,
        riskScore
      };

      return opportunity;
    } catch (error) {
      this.logger.debug(`Error processing pool ${pool.id}:`, error);
      return null;
    }
  }

  private calculateRiskScore(tvl: number, volume24h: number, dexName: string): number {
    // Risk factors: low TVL, low volume, new DEX
    let riskScore = 0.5; // Base risk
    
    if (tvl < 100000) riskScore += 0.3; // Low TVL
    if (tvl < 10000) riskScore += 0.2; // Very low TVL
    
    if (volume24h < 10000) riskScore += 0.2; // Low volume
    if (volume24h < 1000) riskScore += 0.1; // Very low volume
    
    // DEX-specific risk adjustments
    const establishedDexes = ['uniswap_v2', 'uniswap_v3', 'sushiswap', 'pancakeswap_v2'];
    if (!establishedDexes.includes(dexName)) {
      riskScore += 0.1; // Newer/less established DEX
    }
    
    return Math.min(riskScore, 1.0); // Cap at 1.0
  }

  private async filterOpportunities(opportunities: YieldOpportunity[]): Promise<YieldOpportunity[]> {
    // First, try LLM-based filtering
    const llmFiltered = await this.filterWithLLM(opportunities);
    if (llmFiltered && llmFiltered.length > 0) {
      this.logger.info(`LLM filtered ${opportunities.length} opportunities down to ${llmFiltered.length}`);
      return llmFiltered;
    }

    // Fallback to traditional filtering
    return opportunities.filter(opportunity => {
      // Basic filtering criteria
      return opportunity.apy > 5 && // Minimum 5% APY
             opportunity.tvl > 100000 && // Minimum $100k TVL
             opportunity.riskScore < 0.8; // Maximum 80% risk score
    });
  }

  // --- LLM Integration Methods ---

  private async discoverWithLLM(): Promise<YieldOpportunity[]> {
    try {
      this.logger.info(`Attempting LLM-based discovery on ${this.chain}...`);
      
      const marketData = await this.getMarketContext();
      
      const llmResult = await this.bridge.runCommand('llm.discover_opportunities', {
        chain: this.chain,
        market_data: marketData,
        provider: 'echo',
        config: {
          model: 'gpt-4',
          temperature: 0.7
        }
      });

      if (llmResult && llmResult.response) {
        this.logger.info('Successfully received LLM-discovered opportunities');
        return this.parseLLMOpportunities(llmResult.response);
      }
      
      return [];
    } catch (error) {
      this.logger.warn('LLM discovery failed, falling back to traditional method:', error);
      return [];
    }
  }

  private parseLLMOpportunities(llmResponse: string): YieldOpportunity[] {
    try {
      const response = JSON.parse(llmResponse);
      
      if (response.opportunities && Array.isArray(response.opportunities)) {
        return response.opportunities.map((opp: any) => ({
          id: opp.id || `${opp.dex}-${opp.pool}-${this.chain}`,
          chain: this.chain,
          dex: opp.dex,
          pool: opp.pool,
          apy: opp.apy,
          tvl: opp.tvl,
          riskScore: opp.riskScore,
          volume24h: opp.volume24h,
          timestamp: Date.now()
        }));
      }
      
      return [];
    } catch (error) {
      this.logger.warn('Failed to parse LLM discovery result:', error);
      return [];
    }
  }

  private async filterWithLLM(opportunities: YieldOpportunity[]): Promise<YieldOpportunity[]> {
    try {
      this.logger.info('Attempting LLM-based opportunity filtering...');
      
      const marketContext = await this.getMarketContext();
      
      const llmResult = await this.bridge.runCommand('llm.chat', {
        provider: 'echo',
        prompt: `Analyze these DeFi yield opportunities and select the best ones:
        
        Opportunities: ${JSON.stringify(opportunities)}
        Market Context: ${JSON.stringify(marketContext)}
        
        Select opportunities that:
        1. Have good risk-adjusted returns
        2. Have sufficient liquidity
        3. Are from reputable protocols
        4. Have reasonable risk scores
        
        Return only the IDs of the best opportunities as a JSON array.
        `,
        config: {
          model: 'gpt-4',
          temperature: 0.7
        }
      });

      if (llmResult && llmResult.response) {
        return this.parseLLMFilterResult(llmResult.response, opportunities);
      }
      
      return [];
    } catch (error) {
      this.logger.warn('LLM filtering failed, using fallback:', error);
      return [];
    }
  }

  private async getMarketContext(): Promise<any> {
    return {
      chain: this.chain,
      timestamp: Date.now(),
      totalOpportunities: 0, // Will be set by caller
      marketConditions: 'stable',
      riskFreeRate: 0.05
    };
  }

  private parseLLMFilterResult(llmResponse: string, opportunities: YieldOpportunity[]): YieldOpportunity[] {
    try {
      // Try to parse JSON response from LLM
      const selectedIds = JSON.parse(llmResponse);
      
      if (Array.isArray(selectedIds)) {
        return opportunities.filter(opp => selectedIds.includes(opp.id));
      }
      
      // If response is not an array, try to extract IDs from text
      const idMatches = llmResponse.match(/"([^"]+)"/g);
      if (idMatches) {
        const ids = idMatches.map(match => match.replace(/"/g, ''));
        return opportunities.filter(opp => ids.includes(opp.id));
      }
      
      return [];
    } catch (error) {
      this.logger.warn('Failed to parse LLM filter result:', error);
      return [];
    }
  }

  

  private async broadcastOpportunity(opportunity: YieldOpportunity): Promise<void> {
    await this.client.broadcastMessage(MessageType.YIELD_OPPORTUNITY, opportunity, `${this.chain}-discovery`, MessagePriority.HIGH);
    this.logger.debug(`Broadcasted opportunity: ${opportunity.id} with ${opportunity.apy.toFixed(2)}% APY`);
    this.logger.info(`DiscoveryAgent broadcasted opportunity: ${opportunity.id}`);
  }

  private async loadChainConfig(): Promise<any> {
    // Load chain configuration from config file
    const config = await import('../../config/chains.json');
    return (config.default as Record<string, any>)[this.chain] || {};
  }

  async shutdown(): Promise<void> {
    this.logger.info(`Shutting down Discovery Agent for ${this.chain}`);
    this.isRunning = false;
    this.status = AgentStatus.INACTIVE;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    await this.dexIntegrations.shutdown();
    this.logger.success(`Discovery Agent for ${this.chain} shutdown completed`);
  }

  getStatus(): AgentStatus {
    return this.status;
  }
}