import { Logger } from '../utils/Logger';
import axios from 'axios';
import dexes from '../config/dexes';

function injectEnvSubgraphs(dexConfig: any) {
  const endpoint = process.env['THEGRAPH_ENDPOINT'] || 'https://api.thegraph.com/subgraphs/name/';
  // Helper to support both full URLs and subgraph paths
  function resolveSubgraph(envVar: string, fallback: string) {
    const val = process.env[envVar] || fallback;
    console.log(`[DEBUG] resolveSubgraph - envVar: ${envVar}, value: ${val}`);
    return val.startsWith('http') ? val : endpoint + val;
  }
  // Ethereum
  if (dexConfig.ethereum?.uniswap_v2) {
    console.log(`[DEBUG] UNISWAP_V2_SUBGRAPH from process.env: ${process.env['UNISWAP_V2_SUBGRAPH']}`);
    dexConfig.ethereum.uniswap_v2.subgraph = resolveSubgraph('UNISWAP_V2_SUBGRAPH', 'uniswap/uniswap-v2');
  }
  if (dexConfig.ethereum?.uniswap_v3) {
    dexConfig.ethereum.uniswap_v3.subgraph = resolveSubgraph('UNISWAP_V3_SUBGRAPH', 'uniswap/uniswap-v3');
  }
  if (dexConfig.ethereum?.sushiswap) {
    dexConfig.ethereum.sushiswap.subgraph = resolveSubgraph('SUSHISWAP_SUBGRAPH', 'sushiswap/exchange');
  }
  if (dexConfig.ethereum?.pancakeswap_v3) {
    dexConfig.ethereum.pancakeswap_v3.subgraph = resolveSubgraph('PANCAKESWAP_V3_ETH', 'pancakeswap/exchange-v3-eth');
  }
  // BSC
  if (dexConfig.bsc?.pancakeswap_v2) {
    dexConfig.bsc.pancakeswap_v2.subgraph = resolveSubgraph('PANCAKESWAP_V2_BSC', 'pancakeswap/exchange-v2');
  }
  if (dexConfig.bsc?.pancakeswap_v3) {
    dexConfig.bsc.pancakeswap_v3.subgraph = resolveSubgraph('PANCAKESWAP_V3_BSC', 'pancakeswap/exchange-v3');
  }
  if (dexConfig.bsc?.biswap) {
    dexConfig.bsc.biswap.subgraph = resolveSubgraph('BISWAP_BSC', 'biswapcom/exchange5');
  }
  // Polygon
  if (dexConfig.polygon?.quickswap) {
    dexConfig.polygon.quickswap.subgraph = resolveSubgraph('QUICKSWAP_POLYGON', 'sameepsi/quickswap06');
  }
  if (dexConfig.polygon?.sushiswap) {
    dexConfig.polygon.sushiswap.subgraph = resolveSubgraph('SUSHISWAP_POLYGON', 'sushiswap/exchange-polygon');
  }
  if (dexConfig.polygon?.uniswap_v3) {
    dexConfig.polygon.uniswap_v3.subgraph = resolveSubgraph('UNISWAP_V3_POLYGON', 'ianlapham/uniswap-v3-polygon');
  }
  // Arbitrum
  if (dexConfig.arbitrum?.uniswap_v3) {
    dexConfig.arbitrum.uniswap_v3.subgraph = resolveSubgraph('UNISWAP_V3_ARBITRUM', 'ianlapham/uniswap-arbitrum-one');
  }
  if (dexConfig.arbitrum?.sushiswap) {
    dexConfig.arbitrum.sushiswap.subgraph = resolveSubgraph('SUSHISWAP_ARBITRUM', 'sushiswap/exchange-arbitrum-one');
  }
  if (dexConfig.arbitrum?.pancakeswap_v3) {
    dexConfig.arbitrum.pancakeswap_v3.subgraph = resolveSubgraph('PANCAKESWAP_V3_ARBITRUM', 'pancakeswap/exchange-v3');
  }
  // Solana
  if (dexConfig.solana?.raydium) {
    dexConfig.solana.raydium.restApi = process.env['RAYDIUM_V3_API'] || 'https://api.raydium.io/';
  }
  if (dexConfig.solana?.orca) {
    dexConfig.solana.orca.restApi = process.env['ORCA_API'] || 'https://api.orca.so/v1/';
  }
  return dexConfig;
}

interface Pool {
  id: string;
  token0: { id: string; symbol: string; decimals: number };
  token1: { id: string; symbol: string; decimals: number };
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  volumeUSD: string;
  feeTier?: number;
}

interface YieldOpportunity {
  id: string;
  chain: string;
  dex: string;
  pool: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  apy: number;
  tvl: number;
  volume24h: number;
  fee: number;
  riskScore: number;
}

export class RealDEXIntegrations {
  private logger: Logger;
  private chain: string;
  private dexes: any;
  private etherscanApiKey: string;
  

  constructor(chain: string) {
    this.chain = chain;
    this.logger = new Logger(`RealDEXIntegrations-${chain}`);
    this.dexes = injectEnvSubgraphs(JSON.parse(JSON.stringify(dexes)))[chain] || {};
    this.etherscanApiKey = process.env['ETHERSCAN_API_KEY'] || '';
  }

  async initialize(): Promise<void> {
    this.logger.info(`Initializing real DEX integrations for ${this.chain}`);
    
    const enabledDexes = Object.entries(this.dexes)
      .filter(([_, config]: [string, any]) => config.enabled)
      .map(([name, _]) => name);
    
    this.logger.info(`Found ${enabledDexes.length} enabled DEXes: ${enabledDexes.join(', ')}`);
    await this.testGraphConnectivity();
    this.logger.success(`Real DEX integrations initialized for ${this.chain}`);
  }

  private async testGraphConnectivity(): Promise<void> {
    try {
      // Find the first enabled DEX with a subgraph for this chain
      const enabledDexEntry = Object.entries(this.dexes).find(
        ([, config]: [string, any]) => config.enabled && config.subgraph
      );
      if (!enabledDexEntry) {
        this.logger.warn(`[DEBUG] No enabled DEX with a subgraph found for ${this.chain}, skipping connectivity test.`);
        return;
      }
      const [dexName, dexConfig] = enabledDexEntry;
      const testQuery = `{ pairs(first: 1) { id } }`;
      this.logger.info(`[DEBUG] Testing The Graph connectivity for ${dexName} at: ${(dexConfig as any).subgraph}`);
      const response = await axios.post(
        (dexConfig as any).subgraph,
        { query: testQuery },
        { timeout: 30000 }
      );
      if (response.data?.data?.pairs) {
        this.logger.info('The Graph connectivity test passed');
      } else {
        this.logger.warn(`The Graph connectivity test failed - using fallback data. Response: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      if (error.response) {
        this.logger.error(`The Graph connectivity test failed - HTTP ${error.response.status} at ${error.config?.url}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        this.logger.error(`The Graph connectivity test failed - No response received from ${error.config?.url}`);
      } else {
        this.logger.error(`The Graph connectivity test failed - Error: ${error.message}`);
      }
      this.logger.warn('The Graph connectivity test failed - using fallback data');
    }
  }

  async getPools(dexName: string): Promise<Pool[]> {
    // Use env var only. Default to real data (useMock = false)
    let useMock: boolean;
    if (typeof process.env['USE_MOCK_DEX_DATA'] !== 'undefined') {
      useMock = process.env['USE_MOCK_DEX_DATA'] === 'true';
      this.logger.info(`[Config] Using USE_MOCK_DEX_DATA env: ${useMock}`);
    } else {
      useMock = false;
      this.logger.info('[Config] No USE_MOCK_DEX_DATA env set. Defaulting to real DEX data.');
    }
    if (useMock) {
      return this.getMockPools(dexName);
    }
    // Raydium (Solana) custom REST integration
    if (this.chain === 'solana' && dexName === 'raydium') {
      const dex = this.dexes[dexName];
      if (!dex || !dex.enabled || !dex.restApi) {
        this.logger.warn(`Raydium not enabled or restApi missing`);
        return [];
      }
      this.logger.info(`[DEBUG] Fetching Raydium pools from: ${dex.restApi}pools/info/list`);
      try {
        // Use Raydium v3 API with required query params
        const url = dex.restApi.endsWith('/') ? `${dex.restApi}pools/info/list` : `${dex.restApi}/pools/info/list`;
        const params = {
          poolType: 'all',
          poolSortField: 'default',
          sortType: 'desc',
          pageSize: 1000,
          page: 1,
        };
        const response = await axios.get(url, { params });
        // Robustly extract pools array from possible structures
        let poolsArray: any[] | undefined = undefined;
        if (Array.isArray(response.data?.data)) {
          poolsArray = response.data.data;
        } else if (Array.isArray(response.data?.data?.data)) {
          poolsArray = response.data.data.data;
        }
        if (!poolsArray) {
          this.logger.warn('Raydium v3 REST API returned no data');
          return [];
        }
        // Map Raydium v3 REST data to Pool[]
        return poolsArray.map((pool: any) => ({
          id: pool.id,
          token0: {
            id: pool.mintA?.address || pool.baseMint,
            symbol: pool.mintA?.symbol || pool.baseSymbol,
            decimals: pool.mintA?.decimals || pool.baseDecimals
          },
          token1: {
            id: pool.mintB?.address || pool.quoteMint,
            symbol: pool.mintB?.symbol || pool.quoteSymbol,
            decimals: pool.mintB?.decimals || pool.quoteDecimals
          },
          reserve0: pool.mintAmountA?.toString() || pool.baseReserve,
          reserve1: pool.mintAmountB?.toString() || pool.quoteReserve,
          totalSupply: pool.lpAmount?.toString() || pool.lpSupply,
          volumeUSD: pool.day?.volumeQuote?.toString() || pool.volume24hUSD || '0',
        }));
      } catch (error: any) {
        this.logger.error('Error fetching Raydium v3 pools:', {
          url: dex.restApi + 'pools/info/list',
          params: {
            poolType: 'all',
            poolSortField: 'default',
            sortType: 'desc',
            pageSize: 1000,
            page: 1,
          },
          error: error?.response?.data || error.message,
          status: error?.response?.status,
        });
        return [];
      }
    }
    // Orca (Solana) custom REST integration
    if (this.chain === 'solana' && dexName === 'orca') {
      const dex = this.dexes[dexName];
      if (!dex || !dex.enabled || !dex.restApi) {
        this.logger.warn(`Orca not enabled or restApi missing`);
        return [];
      }
      this.logger.info(`[DEBUG] Fetching Orca pools from: ${dex.restApi}whirlpool/list`);
      try {
        // Use Orca v1 API for whirlpool list
        const url = dex.restApi.endsWith('/') ? `${dex.restApi}whirlpool/list` : `${dex.restApi}/whirlpool/list`;
        const response = await axios.get(url);
        // Robustly extract pools array from possible structures
        let poolsArray: any[] | undefined = undefined;
        if (Array.isArray(response.data)) {
          poolsArray = response.data;
        } else if (Array.isArray(response.data?.whirlpools)) {
          poolsArray = response.data.whirlpools;
        }
        if (!poolsArray) {
          this.logger.warn('Orca REST API returned no data');
          return [];
        }
        // Map Orca REST data to Pool[]
        return poolsArray.map((pool: any) => ({
          id: pool.address || pool.id,
          token0: {
            id: pool.tokenA?.mint || pool.tokenA?.address,
            symbol: pool.tokenA?.symbol,
            decimals: pool.tokenA?.decimals
          },
          token1: {
            id: pool.tokenB?.mint || pool.tokenB?.address,
            symbol: pool.tokenB?.symbol,
            decimals: pool.tokenB?.decimals
          },
          reserve0: pool.tokenA?.reserve?.toString() || '0',
          reserve1: pool.tokenB?.reserve?.toString() || '0',
          totalSupply: pool.liquidity?.toString() || '0',
          volumeUSD: pool.volume?.day?.toString() || '0',
        }));
      } catch (error: any) {
        this.logger.error('Error fetching Orca pools:', {
          url: dex.restApi + 'whirlpool/list',
          status: error?.response?.status,
        });
        return [];
      }
    }
    try {
      const dex = this.dexes[dexName];
      if (!dex || !dex.enabled) {
        this.logger.warn(`DEX ${dexName} not found or disabled`);
        return [];
      }

      if (!dex.subgraph) {
        this.logger.warn(`No subgraph configured for ${dexName}`);
        return this.getMockPools(dexName);
      }
      this.logger.info(`[DEBUG] Fetching ${dexName} pools from subgraph: ${dex.subgraph}`);

      const query = `
        {
          ${dex.version === '3' ? 'pools' : 'pairs'}(first: 100, orderBy: ${dex.version === '3' ? 'totalValueLockedUSD' : 'reserveUSD'}, orderDirection: desc) {
            id
            token0 { id symbol decimals }
            token1 { id symbol decimals }
            ${dex.version === '3' ? 'totalValueLockedToken0' : 'reserve0'}
            ${dex.version === '3' ? 'totalValueLockedToken1' : 'reserve1'}
            ${dex.version === '3' ? 'liquidity' : 'totalSupply'}
            volumeUSD
            ${dex.version === '3' ? 'feeTier' : ''}
          }
        }
      `;

      const response = await axios.post(dex.subgraph, { query }, { timeout: 30000 });
      
      if (response.data?.data?.pairs) {
        return response.data.data.pairs.map((pool: any) => ({
          id: pool.id,
          token0: pool.token0,
          token1: pool.token1,
          reserve0: pool.reserve0,
          reserve1: pool.reserve1,
          totalSupply: pool.totalSupply,
          volumeUSD: pool.volumeUSD,
          feeTier: pool.feeTier
        }));
      }

      return [];
    } catch (error) {
      this.logger.error(`Error getting pools for ${dexName}:`, error);
      return this.getMockPools(dexName);
    }
  }

  private getMockPools(dexName: string): Pool[] {
    return [
      {
        id: `mock-pool-1-${dexName}`,
        token0: { id: '0xA0b86a33E6441b8c4C8B8C4C8C4C8C4C8C4C8C4C', symbol: 'USDC', decimals: 6 },
        token1: { id: '0xB0b86a33E6441b8c4C8B8C4C8C4C8C4C8C4C8C4C', symbol: 'WETH', decimals: 18 },
        reserve0: '1000000',
        reserve1: '500',
        totalSupply: '1000000',
        volumeUSD: '50000'
      }
    ];
  }

  async getYieldOpportunities(): Promise<YieldOpportunity[]> {
    const opportunities: YieldOpportunity[] = [];
    
    for (const [dexName, dexConfig] of Object.entries(this.dexes)) {
      if (!(dexConfig as any).enabled) continue;
      
      try {
        const pools = await this.getPools(dexName);
        
        for (const pool of pools) {
          const tvl = parseFloat(pool.reserve0) + parseFloat(pool.reserve1);
          const volume24h = parseFloat(pool.volumeUSD);
          const dailyFees = volume24h * (dexConfig as any).fee;
          const apy = (dailyFees * 365 / tvl) * 100;
          const riskScore = this.calculateRiskScore(tvl, volume24h, dexName);
          
          opportunities.push({
            id: `${this.chain}-${dexName}-${pool.id}`,
            chain: this.chain,
            dex: dexName,
            pool: pool.id,
            token0: pool.token0.id,
            token1: pool.token1.id,
            token0Symbol: pool.token0.symbol,
            token1Symbol: pool.token1.symbol,
            apy: Math.min(apy, 1000),
            tvl,
            volume24h,
            fee: (dexConfig as any).fee,
            riskScore
          });
        }
      } catch (error) {
        this.logger.error(`Error getting opportunities for ${dexName}:`, error);
      }
    }
    
    return opportunities.sort((a, b) => b.apy - a.apy);
  }

  private calculateRiskScore(tvl: number, volume24h: number, dexName: string): number {
    let riskScore = 0.5;
    
    if (tvl < 100000) riskScore += 0.3;
    if (tvl < 10000) riskScore += 0.2;
    if (volume24h < 10000) riskScore += 0.2;
    if (volume24h < 1000) riskScore += 0.1;
    
    const establishedDexes = ['uniswap_v2', 'uniswap_v3', 'sushiswap', 'pancakeswap_v2'];
    if (!establishedDexes.includes(dexName)) {
      riskScore += 0.1;
    }
    
    return Math.min(riskScore, 1.0);
  }

  async getGasPrice(): Promise<string> {
    try {
      if (this.etherscanApiKey) {
        const response = await axios.get(
          `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${this.etherscanApiKey}`
        );
        
        if (response.data?.result?.SafeGasPrice) {
          return response.data.result.SafeGasPrice;
        }
      }
      
      return '20000000000'; // 20 gwei fallback
    } catch (error) {
      this.logger.error('Error getting gas price:', error);
      return '20000000000';
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info(`Shutting down real DEX integrations for ${this.chain}`);
    this.logger.success(`Real DEX integrations shutdown completed for ${this.chain}`);
  }
} 