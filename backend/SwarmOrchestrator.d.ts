import { CustomJuliaBridge } from './CustomJuliaBridge';
export declare class SwarmOrchestrator {
    private bridge;
    constructor(bridge: CustomJuliaBridge);
    list(): Promise<any>;
    create({ name, algorithm, config }: {
        name: string;
        algorithm: any;
        config: any;
    }): Promise<any>;
    get(id: string): Promise<any>;
    start(id: string): Promise<any>;
    stop(id: string): Promise<any>;
    delete(id: string): Promise<any>;
    addAgentToSwarm(swarm_id: string, agent_id: string): Promise<any>;
    removeAgentFromSwarm(swarm_id: string, agent_id: string): Promise<any>;
}
//# sourceMappingURL=SwarmOrchestrator.d.ts.map