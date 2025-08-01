import { CustomJuliaBridge } from './CustomJuliaBridge';

export class AgentOrchestrator {
  private bridge: CustomJuliaBridge;

  constructor(bridge: CustomJuliaBridge) {
    this.bridge = bridge;
  }

  async list() {
    try {
      return await this.bridge.runCommand('agents.list_agents');
    } catch (error) {
      throw error;
    }
  }

  async create({ name, type, chain, config }: { name: string; type: string; chain?: string; config: any }) {
    try {
      // Manually construct the array in the correct order for Julia
      const params = [name, type, chain || null, config];
      return await this.bridge.runCommand('agents.create_agent', params);
    } catch (error) {
      throw error;
    }
  }

  async get(id: string) {
    try {
      return await this.bridge.runCommand('agents.get_agent', { id });
    } catch (error) {
      throw error;
    }
  }

  async start(id: string) {
    try {
      return await this.bridge.runCommand('agents.start_agent', { id });
    } catch (error) {
      throw error;
    }
  }

  async stop(id: string) {
    try {
      return await this.bridge.runCommand('agents.stop_agent', { id });
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string) {
    try {
      return await this.bridge.runCommand('agents.delete_agent', { id });
    } catch (error) {
      throw error;
    }
  }
}