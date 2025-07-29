declare const dexes: {
    ethereum: {
        uniswap_v2: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
        uniswap_v3: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
        sushiswap: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
        pancakeswap_v3: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
    };
    bsc: {
        pancakeswap_v2: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
        pancakeswap_v3: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
        biswap: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
    };
    polygon: {
        quickswap: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
        sushiswap: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
        uniswap_v3: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
    };
    arbitrum: {
        uniswap_v3: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
        sushiswap: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
        pancakeswap_v3: {
            enabled: boolean;
            version: string;
            subgraph: string;
            fee: number;
        };
    };
    solana: {
        raydium: {
            enabled: boolean;
            version: string;
            restApi: string;
            fee: number;
        };
    };
};
export default dexes;
//# sourceMappingURL=dexes.d.ts.map