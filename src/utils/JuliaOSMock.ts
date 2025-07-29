import { Logger } from './Logger';
import { SwarmMessage } from '../types';

interface IEventEmitter {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
}

export class ApiClient {
  private logger: Logger;
  public swarm: SwarmClient;

  constructor(eventEmitter: IEventEmitter) {
    this.logger = new Logger('JuliaOS-ApiClient');
    this.swarm = new SwarmClient(eventEmitter);
  }

  async connect(): Promise<void> {
    this.logger.info('Mock JuliaOS API Client connected');
  }

  async disconnect(): Promise<void> {
    this.logger.info('Mock JuliaOS API Client disconnected');
  }
}

export class SwarmClient {
  private logger: Logger;
  private eventEmitter: IEventEmitter;

  constructor(eventEmitter: IEventEmitter) {
    this.logger = new Logger('JuliaOS-SwarmClient');
    this.eventEmitter = eventEmitter;
  }

  async subscribe(_callback: (message: SwarmMessage) => void): Promise<void> {
    this.logger.debug('Mock swarm subscribe called. The actual subscription is handled by the agent\'s onMessage method.');
  }

  async broadcast(message: SwarmMessage): Promise<void> {
    this.logger.debug(`Broadcasting message: ${message.type}`);
    this.eventEmitter.emit(message.type, message);
  }

  async send(target: string, message: SwarmMessage): Promise<void> {
    this.logger.debug(`Sending message to ${target}: ${message.type}`);
    this.eventEmitter.emit(target, message);
  }

  async getPeers(): Promise<string[]> {
    return ['ethereum-discovery', 'solana-discovery', 'analysis', 'risk-management'];
  }

  async getStatus(): Promise<any> {
    return {
      connected: true,
      peerCount: 4,
      uptime: Date.now(),
      version: '0.1.5-mock'
    };
  }
}
