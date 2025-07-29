import { CustomJuliaBridge } from './CustomJuliaBridge';
export declare class AgentOrchestrator {
    private bridge;
    constructor(bridge: CustomJuliaBridge);
    list(): Promise<any>;
    create({ name, type, config }: {
        name: string;
        type: string;
        config: any;
    }): Promise<any>;
    get(id: string): Promise<any>;
    start(id: string): Promise<any>;
    stop(id: string): Promise<any>;
    delete(id: string): Promise<any>;
}
//# sourceMappingURL=AgentOrchestrator.d.ts.map