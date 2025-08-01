import { Logger } from '../utils/Logger';
import { AgentOrchestrator } from '../../backend/AgentOrchestrator';
import { SwarmOrchestrator } from '../../backend/SwarmOrchestrator';
import { CustomJuliaBridge } from '../../backend/CustomJuliaBridge';
import eventBus from '../events/EventBus';
import { AgentCommunication } from './AgentCommunication';

import { EventEmitter } from 'events';
import { SwarmMessage, MessageType, MessagePriority } from '../types';

export interface IAgentCommunication extends EventEmitter {
  registerHandler(agentId: string, handler: (message: SwarmMessage) => Promise<void>): void;
  broadcastMessage(type: MessageType, data: any, source: string, priority?: MessagePriority): Promise<void>;
  sendToAgent(agentId: string, type: MessageType, data: any, source: string, priority?: MessagePriority): Promise<void>;
}

export class SwarmCoordinator extends EventEmitter {
  private static instance: SwarmCoordinator;
  private logger: Logger;
  private bridge: CustomJuliaBridge;
  private agentOrchestrator: AgentOrchestrator;
  private swarmOrchestrator: SwarmOrchestrator;
  private recentAlerts: SwarmMessage[] = [];
  private MAX_ALERTS = 100; // Keep last 100 alerts
  private agentCommunication: AgentCommunication; // Internal communication bus

  private constructor() {
    super();
    this.logger = new Logger('SwarmCoordinator');
    this.bridge = new CustomJuliaBridge();
    this.agentOrchestrator = new AgentOrchestrator(this.bridge);
    this.swarmOrchestrator = new SwarmOrchestrator(this.bridge);
    this.agentCommunication = new AgentCommunication();
  }

  public getAgentCommunication(): IAgentCommunication {
    return this.agentCommunication;
  }

  public static getInstance(): SwarmCoordinator {
    if (!SwarmCoordinator.instance) {
      SwarmCoordinator.instance = new SwarmCoordinator();
    }
    return SwarmCoordinator.instance;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Swarm Coordinator...');
    try {
      await this.bridge.connect();
      this.logger.success('Swarm Coordinator initialized and connected to Julia backend.');
      this._subscribeToJuliaEvents();
      
    } catch (error) {
      this.logger.error('Failed to initialize Swarm Coordinator:', error);
      throw error;
    }
  }

  private _subscribeToJuliaEvents(): void {
    this.logger.info('Subscribing to Julia events...');
    
    eventBus.on('agent_created', (data: any) => {
      try {
        this.logger.info(`Julia Event: agent_created - Raw Data: ${JSON.stringify(data)}`);
        this.agentCommunication.broadcastMessage(MessageType.AGENT_CREATED, data, 'julia');
      } catch (e: any) {
        this.logger.error(`Error processing agent_created event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('agent_started', (data: any) => {
      try {
        this.logger.info(`Julia Event: agent_started - Raw Data: ${JSON.stringify(data)}`);
        this.agentCommunication.broadcastMessage(MessageType.AGENT_STARTED, data, 'julia');
      } catch (e: any) {
        this.logger.error(`Error processing agent_started event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('agent_stopped', (data: any) => {
      try {
        this.logger.info(`Julia Event: agent_stopped - Raw Data: ${JSON.stringify(data)}`);
        this.agentCommunication.broadcastMessage(MessageType.AGENT_STOPPED, data, 'julia');
      } catch (e: any) {
        this.logger.error(`Error processing agent_stopped event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('swarm_created', (data: any) => {
      try {
        this.logger.info(`Julia Event: swarm_created - Raw Data: ${JSON.stringify(data)}`);
        this.agentCommunication.broadcastMessage(MessageType.SWARM_CREATED, data, 'julia');
      } catch (e: any) {
        this.logger.error(`Error processing swarm_created event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('swarm_started', (data: any) => {
      try {
        this.logger.info(`Julia Event: swarm_started - Raw Data: ${JSON.stringify(data)}`);
        this.agentCommunication.broadcastMessage(MessageType.SWARM_STARTED, data, 'julia');
      } catch (e: any) {
        this.logger.error(`Error processing swarm_started event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('swarm_stopped', (data: any) => {
      try {
        this.logger.info(`Julia Event: swarm_stopped - Raw Data: ${JSON.stringify(data)}`);
        this.agentCommunication.broadcastMessage(MessageType.SWARM_STOPPED, data, 'julia');
      } catch (e: any) {
        this.logger.error(`Error processing swarm_stopped event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('swarm_optimized', (data: any) => {
      try {
        this.logger.info(`Julia Event: swarm_optimized - Raw Data: ${JSON.stringify(data)}`);
        this.agentCommunication.broadcastMessage(MessageType.PORTFOLIO_UPDATE, data.result, 'julia'); // Map to PORTFOLIO_UPDATE
      } catch (e: any) {
        this.logger.error(`Error processing swarm_optimized event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    // Listen for YIELD_OPPORTUNITY messages from the eventBus and re-emit them
    eventBus.on(MessageType.YIELD_OPPORTUNITY, (message: SwarmMessage) => {
      try {
        this.logger.info(`SwarmCoordinator: Re-emitting YIELD_OPPORTUNITY - ID: ${message.id}`);
        this.agentCommunication.broadcastMessage(MessageType.YIELD_OPPORTUNITY, message.data, message.source, message.priority);
      } catch (e: any) {
        this.logger.error(`Error re-emitting YIELD_OPPORTUNITY: ${e.message}, Raw Data: ${JSON.stringify(message)}`);
      }
    });

  }

  public broadcastMessage(type: MessageType, data: any, source: string, priority: MessagePriority = MessagePriority.NORMAL): void {
    const message: SwarmMessage = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      source,
      data,
      timestamp: Date.now(),
      priority
    };
    this.agentCommunication.broadcast(message);
    this.emit(type, message);

    // Store RISK_ALERT messages
    if (type === MessageType.RISK_ALERT) {
      this.recentAlerts.unshift(message); // Add to the beginning
      if (this.recentAlerts.length > this.MAX_ALERTS) {
        this.recentAlerts.pop(); // Remove the oldest if over limit
      }
    }
  }

  public getRecentAlerts(): SwarmMessage[] {
    return [...this.recentAlerts];
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Swarm Coordinator...');
    try {
      await this.bridge.disconnect();
      this.logger.success('Swarm Coordinator shut down.');
    }  catch (error) {
      this.logger.error('Failed to shut down Swarm Coordinator:', error);
      throw error;
    }
  }

  // Agent Management Methods
  async createAgent({ name, type, chain, config }: { name: string; type: string; chain?: string; config: any }): Promise<any> {
    this.logger.info(`Creating agent: ${name} (${type}) on chain: ${chain}`);
    
    const createParams: { name: string; type: string; chain?: string; config: any; } = { name, type, config };
    if (chain) {
      createParams.chain = chain;
    }

    const agent = await this.agentOrchestrator.create(createParams);
    this.logger.success(`Agent ${name} created with ID: ${agent.id}`);
    return agent;
  }

  async listAgents(): Promise<any[]> {
    this.logger.info('Listing agents...');
    const agents = await this.agentOrchestrator.list();
    this.logger.success(`Found ${agents.length} agents.`);
    return agents;
  }

  async getAgent(id: string): Promise<any> {
    this.logger.info(`Getting agent ${id}...`);
    const agent = await this.agentOrchestrator.get(id);
    this.logger.success(`Agent ${id} retrieved.`);
    return agent;
  }

  async startAgent(id: string): Promise<any> {
    this.logger.info(`Starting agent ${id}...`);
    const agent = await this.agentOrchestrator.start(id);
    this.logger.success(`Agent ${id} started.`);
    return agent;
  }

  async stopAgent(id: string): Promise<any> {
    this.logger.info(`Stopping agent ${id}...`);
    const agent = await this.agentOrchestrator.stop(id);
    this.logger.success(`Agent ${id} stopped.`);
    return agent;
  }

  async deleteAgent(id: string): Promise<any> {
    this.logger.info(`Deleting agent ${id}...`);
    const result = await this.agentOrchestrator.delete(id);
    this.logger.success(`Agent ${id} deleted.`);
    return result;
  }

  // Swarm Management Methods
  async createSwarm(name: string, algorithm: any, config: any): Promise<any> {
    this.logger.info(`Creating swarm: ${name}...`);
    const swarm = await this.swarmOrchestrator.create({ name, algorithm, config });
    this.logger.success(`Swarm ${name} created with ID: ${swarm.id}`);
    return swarm;
  }

  async listSwarms(): Promise<any[]> {
    this.logger.info('Listing swarms...');
    const swarms = await this.swarmOrchestrator.list();
    this.logger.success(`Found ${swarms.length} swarms.`);
    return swarms;
  }

  async getSwarm(id: string): Promise<any> {
    this.logger.info(`Getting swarm ${id}...`);
    const swarm = await this.swarmOrchestrator.get(id);
    this.logger.success(`Swarm ${id} retrieved.`);
    return swarm;
  }

  async startSwarm(id: string): Promise<any> {
    this.logger.info(`Starting swarm ${id}...`);
    const swarm = await this.swarmOrchestrator.start(id);
    this.logger.success(`Swarm ${id} started.`);
    return swarm;
  }

  async stopSwarm(id: string): Promise<any> {
    this.logger.info(`Stopping swarm ${id}...`);
    const swarm = await this.swarmOrchestrator.stop(id);
    this.logger.success(`Agent ${id} stopped.`);
    return swarm;
  }

  async deleteSwarm(id: string): Promise<any> {
    this.logger.info(`Deleting swarm ${id}...`);
    const result = await this.swarmOrchestrator.delete(id);
    this.logger.success(`Swarm ${id} deleted.`);
    return result;
  }

  async addAgentToSwarm(swarmId: string, agentId: string): Promise<any> {
    this.logger.info(`Adding agent ${agentId} to swarm ${swarmId}...`);
    const swarm = await this.swarmOrchestrator.addAgentToSwarm(swarmId, agentId);
    this.logger.success(`Agent ${agentId} added to swarm ${swarmId}.`);
    return swarm;
  }

  async removeAgentFromSwarm(swarmId: string, agentId: string): Promise<any> {
    this.logger.info(`Removing agent ${agentId} from swarm ${swarmId}...`);
    const swarm = await this.swarmOrchestrator.removeAgentFromSwarm(swarmId, agentId);
    this.logger.success(`Agent ${agentId} removed from swarm ${swarmId}.`);
    return swarm;
  }

  async getAvailableAlgorithms(): Promise<any[]> {
    this.logger.info('Fetching available algorithms from Julia...');
    const algorithms = await this.bridge.runCommand('portfolio.get_available_algorithms', {});
    this.logger.success(`Found ${algorithms.length} available algorithms.`);
    return algorithms;
  }
}

export const swarmCoordinator = SwarmCoordinator.getInstance();
(async () => {
  try {
    await swarmCoordinator.initialize();
  } catch (error) {
    console.error("CRITICAL: Swarm Coordinator failed to initialize during module load.", error);
  }
})();
