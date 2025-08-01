import { SwarmCoordinator } from '../src/swarm/SwarmCoordinator';
import { RiskAlert, SwarmMessage } from '../src/types';
import { Logger } from '../src/utils/Logger';

export class RiskService {
  private static instance: RiskService;
  private alerts: RiskAlert[] = [];
  private logger = new Logger('RiskService');
  private maxAlerts = 100; // Store the last 100 alerts

  private constructor() {
    const coordinator = SwarmCoordinator.getInstance();
    coordinator.on('risk_alert', (message: SwarmMessage) => {
      const alert = message.data as RiskAlert;
      this.logger.info(`Received risk alert: ${alert.type}`);
      this.addAlert(alert);
    });
  }

  public static getInstance(): RiskService {
    if (!RiskService.instance) {
      RiskService.instance = new RiskService();
    }
    return RiskService.instance;
  }

  private addAlert(alert: RiskAlert) {
    this.alerts.unshift(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.pop();
    }
  }

  public getAlerts(): RiskAlert[] {
    return this.alerts;
  }
}
