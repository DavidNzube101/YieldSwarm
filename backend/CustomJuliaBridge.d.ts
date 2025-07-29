export declare class CustomJuliaBridge {
    private host;
    private port;
    private client;
    private responses;
    constructor({ host, port }?: {
        host?: string | undefined;
        port?: number | undefined;
    });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    runCommand(command: string, params?: any, timeout?: number): Promise<any>;
}
//# sourceMappingURL=CustomJuliaBridge.d.ts.map