import { Logger } from '../utils/Logger';
import { AgentOrchestrator } from '../../backend/AgentOrchestrator';
import { SwarmOrchestrator } from '../../backend/SwarmOrchestrator';
import { CustomJuliaBridge } from '../../backend/CustomJuliaBridge';
import eventBus from '../events/EventBus';

import { EventEmitter } from 'events';
import { SwarmMessage, MessageType, MessagePriority } from '../types';

export interface IAgentCommunication {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
}

export class SwarmCoordinator extends EventEmitter {
  private static instance: SwarmCoordinator;
  private logger: Logger;
  private bridge: CustomJuliaBridge;
  private agentOrchestrator: AgentOrchestrator;
  private swarmOrchestrator: SwarmOrchestrator;

  private constructor() {
    super();
    this.logger = new Logger('SwarmCoordinator');
    this.bridge = new CustomJuliaBridge();
    this.agentOrchestrator = new AgentOrchestrator(this.bridge);
    this.swarmOrchestrator = new SwarmOrchestrator(this.bridge);
  }

  public getAgentCommunication(): IAgentCommunication {
    return {
      on: this.on.bind(this),
      emit: this.emit.bind(this),
      removeListener: this.removeListener.bind(this),
    };
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
        this.emit('agent_created', data);
      } catch (e: any) {
        this.logger.error(`Error processing agent_created event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('agent_started', (data: any) => {
      try {
        this.logger.info(`Julia Event: agent_started - Raw Data: ${JSON.stringify(data)}`);
        this.emit('agent_started', data);
      } catch (e: any) {
        this.logger.error(`Error processing agent_started event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('agent_stopped', (data: any) => {
      try {
        this.logger.info(`Julia Event: agent_stopped - Raw Data: ${JSON.stringify(data)}`);
        this.emit('agent_stopped', data);
      } catch (e: any) {
        this.logger.error(`Error processing agent_stopped event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('swarm_created', (data: any) => {
      try {
        this.logger.info(`Julia Event: swarm_created - Raw Data: ${JSON.stringify(data)}`);
        this.emit('swarm_created', data);
      } catch (e: any) {
        this.logger.error(`Error processing swarm_created event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('swarm_started', (data: any) => {
      try {
        this.logger.info(`Julia Event: swarm_started - Raw Data: ${JSON.stringify(data)}`);
        this.emit('swarm_started', data);
      } catch (e: any) {
        this.logger.error(`Error processing swarm_started event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('swarm_stopped', (data: any) => {
      try {
        this.logger.info(`Julia Event: swarm_stopped - Raw Data: ${JSON.stringify(data)}`);
        this.emit('swarm_stopped', data);
      } catch (e: any) {
        this.logger.error(`Error processing swarm_stopped event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
      }
    });

    eventBus.on('swarm_optimized', (data: any) => {
      try {
        this.logger.info(`Julia Event: swarm_optimized - Raw Data: ${JSON.stringify(data)}`);
        this.emit('swarm_optimized', data);
      } catch (e: any) {
        this.logger.error(`Error processing swarm_optimized event: ${e.message}, Raw Data: ${JSON.stringify(data)}`);
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
    this.emit(type, message);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Swarm Coordinator...');
    try {
      await this.bridge.disconnect();
      this.logger.success('Swarm Coordinator shut down.');
    } catch (error) {
      this.logger.error('Failed to shut down Swarm Coordinator:', error);
      throw error;
    }
  }

  // Agent Management Methods
  async createAgent(name: string, type: string, config: any): Promise<any> {
    this.logger.info(`Creating agent: ${name} (${type})...`);
    const agent = await this.agentOrchestrator.create({ name, type, config });
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
}

export const swarmCoordinator = SwarmCoordinator.getInstance();
(async () => {
  try {
    await swarmCoordinator.initialize();
  } catch (error) {
    console.error("CRITICAL: Swarm Coordinator failed to initialize during module load.", error);
  }
})();
