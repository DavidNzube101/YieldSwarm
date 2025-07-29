import { CustomJuliaBridge } from './CustomJuliaBridge';

export class SwarmOrchestrator {
  private bridge: CustomJuliaBridge;

  constructor(bridge: CustomJuliaBridge) {
    this.bridge = bridge;
  }

  async list() {
    try {
      return await this.bridge.runCommand('swarms.list_swarms');
    } catch (error) {
      console.error('Error listing swarms:', error);
      throw error;
    }
  }

  async create({ name, algorithm, config }: { name: string; algorithm: any; config: any }) {
    try {
      return await this.bridge.runCommand('swarms.create_swarm', { name, algorithm, config });
    } catch (error) {
      console.error('Error creating swarm:', error);
      throw error;
    }
  }

  async get(id: string) {
    try {
      return await this.bridge.runCommand('swarms.get_swarm', { id });
    } catch (error) {
      console.error(`Error getting swarm ${id}:`, error);
      throw error;
    }
  }

  async start(id: string) {
    try {
      return await this.bridge.runCommand('swarms.start_swarm', { id });
    } catch (error) {
      console.error(`Error starting swarm ${id}:`, error);
      throw error;
    }
  }

  async stop(id: string) {
    try {
      return await this.bridge.runCommand('swarms.stop_swarm', { id });
    } catch (error) {
      console.error(`Error stopping swarm ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      return await this.bridge.runCommand('swarms.delete_swarm', { id });
    } catch (error) {
      console.error(`Error deleting swarm ${id}:`, error);
      throw error;
    }
  }

  async addAgentToSwarm(swarm_id: string, agent_id: string) {
    try {
      return await this.bridge.runCommand('swarms.add_agent', { swarm_id, agent_id });
    } catch (error) {
      console.error(`Error adding agent ${agent_id} to swarm ${swarm_id}:`, error);
      throw error;
    }
  }

  async removeAgentFromSwarm(swarm_id: string, agent_id: string) {
    try {
      return await this.bridge.runCommand('swarms.remove_agent', { swarm_id, agent_id });
    } catch (error) {
      console.error(`Error removing agent ${agent_id} from swarm ${swarm_id}:`, error);
      throw error;
    }
  }
}