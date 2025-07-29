"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmOrchestrator = void 0;
class SwarmOrchestrator {
    constructor(bridge) {
        this.bridge = bridge;
    }
    async list() {
        try {
            return await this.bridge.runCommand('swarms.list_swarms');
        }
        catch (error) {
            console.error('Error listing swarms:', error);
            throw error;
        }
    }
    async create({ name, algorithm, config }) {
        try {
            return await this.bridge.runCommand('swarms.create_swarm', { name, algorithm, config });
        }
        catch (error) {
            console.error('Error creating swarm:', error);
            throw error;
        }
    }
    async get(id) {
        try {
            return await this.bridge.runCommand('swarms.get_swarm', { id });
        }
        catch (error) {
            console.error(`Error getting swarm ${id}:`, error);
            throw error;
        }
    }
    async start(id) {
        try {
            return await this.bridge.runCommand('swarms.start_swarm', { id });
        }
        catch (error) {
            console.error(`Error starting swarm ${id}:`, error);
            throw error;
        }
    }
    async stop(id) {
        try {
            return await this.bridge.runCommand('swarms.stop_swarm', { id });
        }
        catch (error) {
            console.error(`Error stopping swarm ${id}:`, error);
            throw error;
        }
    }
    async delete(id) {
        try {
            return await this.bridge.runCommand('swarms.delete_swarm', { id });
        }
        catch (error) {
            console.error(`Error deleting swarm ${id}:`, error);
            throw error;
        }
    }
    async addAgentToSwarm(swarm_id, agent_id) {
        try {
            return await this.bridge.runCommand('swarms.add_agent', { swarm_id, agent_id });
        }
        catch (error) {
            console.error(`Error adding agent ${agent_id} to swarm ${swarm_id}:`, error);
            throw error;
        }
    }
    async removeAgentFromSwarm(swarm_id, agent_id) {
        try {
            return await this.bridge.runCommand('swarms.remove_agent', { swarm_id, agent_id });
        }
        catch (error) {
            console.error(`Error removing agent ${agent_id} from swarm ${swarm_id}:`, error);
            throw error;
        }
    }
}
exports.SwarmOrchestrator = SwarmOrchestrator;
//# sourceMappingURL=SwarmOrchestrator.js.map