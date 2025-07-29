"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = void 0;
class AgentOrchestrator {
    constructor(bridge) {
        this.bridge = bridge;
    }
    async list() {
        try {
            return await this.bridge.runCommand('agents.list_agents');
        }
        catch (error) {
            console.error('Error listing agents:', error);
            throw error;
        }
    }
    async create({ name, type, config }) {
        try {
            return await this.bridge.runCommand('agents.create_agent', { name, type, config });
        }
        catch (error) {
            console.error('Error creating agent:', error);
            throw error;
        }
    }
    async get(id) {
        try {
            return await this.bridge.runCommand('agents.get_agent', { id });
        }
        catch (error) {
            console.error(`Error getting agent ${id}:`, error);
            throw error;
        }
    }
    async start(id) {
        try {
            return await this.bridge.runCommand('agents.start_agent', { id });
        }
        catch (error) {
            console.error(`Error starting agent ${id}:`, error);
            throw error;
        }
    }
    async stop(id) {
        try {
            return await this.bridge.runCommand('agents.stop_agent', { id });
        }
        catch (error) {
            console.error(`Error stopping agent ${id}:`, error);
            throw error;
        }
    }
    async delete(id) {
        try {
            return await this.bridge.runCommand('agents.delete_agent', { id });
        }
        catch (error) {
            console.error(`Error deleting agent ${id}:`, error);
            throw error;
        }
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
//# sourceMappingURL=AgentOrchestrator.js.map