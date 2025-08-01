import { IAgentCommunication } from '../swarm/SwarmCoordinator';
import { Logger } from '../utils/Logger';
import { PortfolioAllocation, RiskAlert, RiskAlertType, RiskSeverity, AgentStatus, SwarmMessage, MessageType, MessagePriority } from '../types';
import { calculateSeverity } from '../utils/riskCalculations';

export class RiskAgent {
  private client: IAgentCommunication;
  private logger: Logger;
  private status: AgentStatus = AgentStatus.INACTIVE;
  private isRunning: boolean = false;
  private currentPortfolio: PortfolioAllocation[] = [];
  private riskThresholds: Map<RiskAlertType, number> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(client: IAgentCommunication) {
    this.client = client;
    this.logger = new Logger('RiskAgent');
    this.initializeRiskThresholds();
  }

  private initializeRiskThresholds(): void {
    // Set risk thresholds for different alert types
    this.riskThresholds.set(RiskAlertType.HIGH_IMPERMANENT_LOSS, 0.7);
    this.riskThresholds.set(RiskAlertType.LOW_LIQUIDITY, 0.6);
    this.riskThresholds.set(RiskAlertType.SMART_CONTRACT_RISK, 0.8);
    this.riskThresholds.set(RiskAlertType.HIGH_VOLATILITY, 0.75);
    this.riskThresholds.set(RiskAlertType.CROSS_CHAIN_RISK, 0.65);
  }

  async start(): Promise<void> {
    this.logger.info('Starting Risk Management Agent');
    this.status = AgentStatus.STARTING;
    this.isRunning = true;

    try {
      // Start continuous risk monitoring
      this.startRiskMonitoring();
      
      this.status = AgentStatus.ACTIVE;
      this.logger.success('Risk Management Agent started successfully');
    } catch (error) {
      this.status = AgentStatus.ERROR;
      this.logger.error('Failed to start Risk Management Agent:', error);
      throw error;
    }
  }

  private startRiskMonitoring(): void {
    // Monitor risk every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      if (this.isRunning && this.currentPortfolio.length > 0) {
        await this.performRiskAssessment();
      }
    }, 30000);
  }

  async assessPortfolioRisk(portfolioData: any): Promise<void> {
    this.logger.debug('Assessing portfolio risk...');

    try {
      // Update current portfolio
      this.currentPortfolio = portfolioData.allocations || [];

      // Perform immediate risk assessment
      await this.performRiskAssessment();
    } catch (error) {
      this.logger.error('Error assessing portfolio risk:', error);
    }
  }

  private async performRiskAssessment(): Promise<void> {
    if (this.currentPortfolio.length === 0) {
      this.logger.debug('No portfolio allocations to assess');
      return;
    }

    this.logger.debug(`Performing risk assessment for ${this.currentPortfolio.length} allocations`);

    try {
      const riskAlerts: RiskAlert[] = [];

      // Check for high impermanent loss risk
      const ilRiskAlert = await this.checkImpermanentLossRisk();
      if (ilRiskAlert) riskAlerts.push(ilRiskAlert);

      // Check for low liquidity risk
      const liquidityRiskAlert = await this.checkLiquidityRisk();
      if (liquidityRiskAlert) riskAlerts.push(liquidityRiskAlert);

      // Check for smart contract risk
      const contractRiskAlert = await this.checkSmartContractRisk();
      if (contractRiskAlert) riskAlerts.push(contractRiskAlert);

      // Check for high volatility risk
      const volatilityRiskAlert = await this.checkVolatilityRisk();
      if (volatilityRiskAlert) riskAlerts.push(volatilityRiskAlert);

      // Check for cross-chain risk
      const crossChainRiskAlert = await this.checkCrossChainRisk();
      if (crossChainRiskAlert) riskAlerts.push(crossChainRiskAlert);

      // Broadcast risk alerts
      for (const alert of riskAlerts) {
        await this.broadcastRiskAlert(alert);
      }

      if (riskAlerts.length > 0) {
        this.logger.warn(`Generated ${riskAlerts.length} risk alerts`);
      }
    } catch (error) {
      this.logger.error('Error performing risk assessment:', error);
    }
  }

  private async checkImpermanentLossRisk(): Promise<RiskAlert | null> {
    const threshold = this.riskThresholds.get(RiskAlertType.HIGH_IMPERMANENT_LOSS) || 0.7;
    
    const highILAllocations = this.currentPortfolio.filter(allocation => {
      // In practice, you'd calculate IL risk based on token price correlation and volatility
      const ilRisk = allocation.riskScore * 0.8; // Simplified calculation
      return ilRisk > threshold;
    });

    if (highILAllocations.length > 0) {
      return {
        id: `il-risk-${Date.now()}`,
        type: RiskAlertType.HIGH_IMPERMANENT_LOSS,
        severity: calculateSeverity(highILAllocations.length, this.currentPortfolio.length),
        message: `High impermanent loss risk detected in ${highILAllocations.length} allocations`,
        affectedOpportunities: highILAllocations.map(a => a.opportunityId),
        timestamp: Date.now(),
        recommendations: [
          'Consider reducing exposure to volatile token pairs',
          'Monitor token price correlation trends',
          'Implement dynamic rebalancing strategies'
        ]
      };
    }

    return null;
  }

  private async checkLiquidityRisk(): Promise<RiskAlert | null> {
    const threshold = this.riskThresholds.get(RiskAlertType.LOW_LIQUIDITY) || 0.6;
    
    const lowLiquidityAllocations = this.currentPortfolio.filter(allocation => {
      // In practice, you'd check actual liquidity metrics
      const liquidityRisk = allocation.riskScore * 0.9; // Simplified calculation
      return liquidityRisk > threshold;
    });

    if (lowLiquidityAllocations.length > 0) {
      return {
        id: `liquidity-risk-${Date.now()}`,
        type: RiskAlertType.LOW_LIQUIDITY,
        severity: calculateSeverity(lowLiquidityAllocations.length, this.currentPortfolio.length),
        message: `Low liquidity risk detected in ${lowLiquidityAllocations.length} allocations`,
        affectedOpportunities: lowLiquidityAllocations.map(a => a.opportunityId),
        timestamp: Date.now(),
        recommendations: [
          'Consider moving to higher liquidity pools',
          'Monitor TVL and volume trends',
          'Implement gradual position reduction'
        ]
      };
    }

    return null;
  }

  private async checkSmartContractRisk(): Promise<RiskAlert | null> {
    const threshold = this.riskThresholds.get(RiskAlertType.SMART_CONTRACT_RISK) || 0.8;
    
    const highContractRiskAllocations = this.currentPortfolio.filter(allocation => {
      // In practice, you'd check audit status, age, insurance, etc.
      const contractRisk = allocation.riskScore * 0.7; // Simplified calculation
      return contractRisk > threshold;
    });

    if (highContractRiskAllocations.length > 0) {
      return {
        id: `contract-risk-${Date.now()}`,
        type: RiskAlertType.SMART_CONTRACT_RISK,
        severity: RiskSeverity.CRITICAL, // Smart contract risk is always critical
        message: `High smart contract risk detected in ${highContractRiskAllocations.length} allocations`,
        affectedOpportunities: highContractRiskAllocations.map(a => a.opportunityId),
        timestamp: Date.now(),
        recommendations: [
          'Immediately review smart contract audit status',
          'Consider moving to audited and insured protocols',
          'Implement emergency withdrawal procedures'
        ]
      };
    }

    return null;
  }

  private async checkVolatilityRisk(): Promise<RiskAlert | null> {
    const threshold = this.riskThresholds.get(RiskAlertType.HIGH_VOLATILITY) || 0.75;
    
    const highVolatilityAllocations = this.currentPortfolio.filter(allocation => {
      // In practice, you'd calculate actual volatility metrics
      const volatilityRisk = allocation.riskScore * 0.6; // Simplified calculation
      return volatilityRisk > threshold;
    });

    if (highVolatilityAllocations.length > 0) {
      return {
        id: `volatility-risk-${Date.now()}`,
        type: RiskAlertType.HIGH_VOLATILITY,
        severity: calculateSeverity(highVolatilityAllocations.length, this.currentPortfolio.length),
        message: `High volatility risk detected in ${highVolatilityAllocations.length} allocations`,
        affectedOpportunities: highVolatilityAllocations.map(a => a.opportunityId),
        timestamp: Date.now(),
        recommendations: [
          'Consider reducing position sizes',
          'Implement stop-loss mechanisms',
          'Diversify into stable assets'
        ]
      };
    }

    return null;
  }

  private async checkCrossChainRisk(): Promise<RiskAlert | null> {
    const threshold = this.riskThresholds.get(RiskAlertType.CROSS_CHAIN_RISK) || 0.65;
    
    // Check if portfolio is too concentrated on a single chain
    const chainAllocations = new Map<string, number>();
    
    for (const allocation of this.currentPortfolio) {
      const current = chainAllocations.get(allocation.chain) || 0;
      chainAllocations.set(allocation.chain, current + allocation.allocation);
    }

    const highChainConcentration = Array.from(chainAllocations.entries())
      .filter(([_chain, allocation]) => allocation > threshold);

    if (highChainConcentration.length > 0) {
      return {
        id: `cross-chain-risk-${Date.now()}`,
        type: RiskAlertType.CROSS_CHAIN_RISK,
        severity: calculateSeverity(highChainConcentration.length, chainAllocations.size),
        message: `High cross-chain concentration risk detected in ${highChainConcentration.map(([chain]) => chain).join(', ')}`,
        affectedOpportunities: this.currentPortfolio
          .filter(a => highChainConcentration.some(([chain]) => chain === a.chain))
          .map(a => a.opportunityId),
        timestamp: Date.now(),
        recommendations: [
          'Diversify allocations across multiple chains',
          'Monitor bridge and cross-chain protocol risks',
          'Consider chain-specific risk factors'
        ]
      };
    }

    return null;
  }

  
    private async broadcastRiskAlert(alert: RiskAlert): Promise<void> {
    await this.client.broadcastMessage(MessageType.RISK_ALERT, alert, 'risk-management', this.getAlertPriority(alert.severity));
    this.logger.warn(`Broadcasted risk alert: ${alert.type} - ${alert.message}`);
  }

  private getAlertPriority(severity: RiskSeverity): MessagePriority {
    switch (severity) {
      case RiskSeverity.CRITICAL:
        return MessagePriority.CRITICAL;
      case RiskSeverity.HIGH:
        return MessagePriority.HIGH;
      case RiskSeverity.MEDIUM:
        return MessagePriority.NORMAL;
      case RiskSeverity.LOW:
        return MessagePriority.LOW;
      default:
        return MessagePriority.NORMAL;
    }
  }

  async onMessage(message: SwarmMessage): Promise<void> {
    this.logger.debug(`Received message: ${message.type}`);

    switch (message.type) {
      case MessageType.PORTFOLIO_UPDATE:
        await this.assessPortfolioRisk(message.data);
        break;
      case MessageType.RISK_ALERT:
        // Ignore our own alerts
        break;
      default:
        this.logger.debug(`Unhandled message type: ${message.type}`);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Risk Management Agent');
    this.isRunning = false;
    this.status = AgentStatus.INACTIVE;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.logger.success('Risk Management Agent shutdown completed');
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getCurrentPortfolio(): PortfolioAllocation[] {
    return [...this.currentPortfolio];
  }

  getRiskMetrics(): any {
    const totalRisk = this.currentPortfolio.reduce((sum, allocation) => {
      return sum + (allocation.allocation * allocation.riskScore);
    }, 0);

    const totalAllocation = this.currentPortfolio.reduce((sum, allocation) => {
      return sum + allocation.allocation;
    }, 0);

    return {
      averageRisk: totalAllocation > 0 ? totalRisk / totalAllocation : 0,
      allocationCount: this.currentPortfolio.length,
      totalAllocation,
      riskThresholds: Object.fromEntries(this.riskThresholds)
    };
  }
} 