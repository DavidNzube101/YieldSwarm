interface GlobalConfig {
  dataMode: 'mock' | 'real';
  activeChains: string[];
}

export const globalConfig: GlobalConfig = {
  dataMode: 'real', // Default to real data
  activeChains: ['solana'], // Default active chains
};