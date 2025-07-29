"use strict";
// This file is now a TypeScript module exporting the DEX config object.
// The subgraph URLs will be injected at runtime from .env.
Object.defineProperty(exports, "__esModule", { value: true });
const dexes = {
    ethereum: {
        uniswap_v2: {
            enabled: true,
            version: '2',
            subgraph: '', // Will be injected from .env
            fee: 0.003
        },
        uniswap_v3: {
            enabled: true,
            version: '3',
            subgraph: '',
            fee: 0.0005
        },
        sushiswap: {
            enabled: true,
            version: '2',
            subgraph: '',
            fee: 0.003
        },
        pancakeswap_v3: {
            enabled: true,
            version: '3',
            subgraph: '',
            fee: 0.0005
        }
    },
    bsc: {
        pancakeswap_v2: {
            enabled: true,
            version: '2',
            subgraph: '',
            fee: 0.0025
        },
        pancakeswap_v3: {
            enabled: true,
            version: '3',
            subgraph: '',
            fee: 0.0005
        },
        biswap: {
            enabled: true,
            version: '2',
            subgraph: '',
            fee: 0.001
        }
    },
    polygon: {
        quickswap: {
            enabled: true,
            version: '2',
            subgraph: '',
            fee: 0.003
        },
        sushiswap: {
            enabled: true,
            version: '2',
            subgraph: '',
            fee: 0.003
        },
        uniswap_v3: {
            enabled: true,
            version: '3',
            subgraph: '',
            fee: 0.0005
        }
    },
    arbitrum: {
        uniswap_v3: {
            enabled: true,
            version: '3',
            subgraph: '',
            fee: 0.0005
        },
        sushiswap: {
            enabled: true,
            version: '2',
            subgraph: '',
            fee: 0.003
        },
        pancakeswap_v3: {
            enabled: true,
            version: '3',
            subgraph: '',
            fee: 0.0005
        }
    },
    solana: {
        raydium: {
            enabled: true,
            version: '3',
            restApi: '', // Will be injected from .env
            fee: 0.0025
        }
        // Add more Solana DEXes as needed
    }
};
exports.default = dexes;
//# sourceMappingURL=dexes.js.map