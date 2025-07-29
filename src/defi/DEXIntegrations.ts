import { Logger } from '../utils/Logger';
import axios from 'axios';
import dexes from '../config/dexes';

function injectEnvSubgraphs(dexConfig: any) {
  const endpoint = process.env['THEGRAPH_ENDPOINT'] || 'https://api.thegraph.com/subgraphs/name/';
  // Helper to support both full URLs and subgraph paths
  function resolveSubgraph(envVar: string, fallback: string) {
    const val = process.env[envVar] || fallback;
    return val.startsWith('http') ? val : endpoint + val;
  }
  // Ethereum
  if (dexConfig.ethereum?.uniswap_v2) {
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
    dexConfig.solana.raydium.restApi = process.env['RAYDIUM_REST_API'] || 'https://api-v3.raydium.io/';
  }
  return dexConfig;
}

interface Pool {
  id: string;
  token0: {
    id: string;
    symbol: string;
    decimals: number;
  };
  token1: {
    id: string;
    symbol: string;
    decimals: number;
  };
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

interface SwapResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: number;
  gasPrice?: string;
}

interface BridgeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  bridgeFee?: number;
}

export class DEXIntegrations {
  private logger: Logger;
  private chain: string;
  private dexes: any;
  private etherscanApiKey: string;

  constructor(chain: string) {
    this.chain = chain;
    this.logger = new Logger(`DEXIntegrations-${chain}`);
    this.dexes = injectEnvSubgraphs(JSON.parse(JSON.stringify(dexes)))[chain] || {};
    this.etherscanApiKey = process.env['ETHERSCAN_API_KEY'] || '';
  }

  async initialize(): Promise<void> {
    this.logger.info(`Initializing DEX integrations for ${this.chain}`);
    
    // Validate configuration
    const enabledDexes = Object.entries(this.dexes)
      .filter(([_, config]: [string, any]) => config.enabled)
      .map(([name, _]) => name);
    
    this.logger.info(`Found ${enabledDexes.length} enabled DEXes: ${enabledDexes.join(', ')}`);
    
    // Test connectivity to The Graph
    await this.testGraphConnectivity();
    
    this.logger.success(`DEX integrations initialized for ${this.chain}`);
  }

  private async testGraphConnectivity(): Promise<void> {
    try {
      // Test with Uniswap V2 subgraph
      const testQuery = `
        {
          pairs(first: 1) {
            id
            token0Price
            token1Price
          }
        }
      `;
      
      const response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
        { query: testQuery },
        { timeout: 10000 }
      );
      
      if (response.data?.data?.pairs) {
        this.logger.info('The Graph connectivity test passed');
      } else {
        this.logger.warn('The Graph connectivity test failed - using fallback data');
      }
    } catch (error) {
      this.logger.warn('The Graph connectivity test failed - using fallback data');
    }
  }

  async getPools(dexName: string): Promise<Pool[]> {
    // Raydium (Solana) custom REST integration
    if (this.chain === 'solana' && dexName === 'raydium') {
      const dex = this.dexes[dexName];
      if (!dex || !dex.enabled || !dex.restApi) {
        this.logger.warn(`Raydium not enabled or restApi missing`);
        return [];
      }
      try {
        const response = await axios.get(dex.restApi + 'pairs');
        const data = response.data?.data;
        if (!Array.isArray(data)) {
          this.logger.warn('Raydium REST API returned no data');
          return [];
        }
        // Map Raydium REST data to Pool[]
        return data.map((pair: any) => ({
          id: pair.id,
          token0: {
            id: pair.baseMint,
            symbol: pair.baseSymbol,
            decimals: pair.baseDecimals
          },
          token1: {
            id: pair.quoteMint,
            symbol: pair.quoteSymbol,
            decimals: pair.quoteDecimals
          },
          reserve0: pair.baseReserve,
          reserve1: pair.quoteReserve,
          totalSupply: pair.lpSupply,
          volumeUSD: pair.volume24hUSD || '0',
        }));
      } catch (error) {
        this.logger.error('Error fetching Raydium pools:', error);
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

      const query = `
        {
          pairs(first: 100, orderBy: reserveUSD, orderDirection: desc) {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
            reserve0
            reserve1
            totalSupply
            volumeUSD
            ${dex.version === '3' ? 'feeTier' : ''}
          }
        }
      `;

      const response = await axios.post(dex.subgraph, { query }, { timeout: 15000 });
      
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
    // Fallback mock data when The Graph is unavailable
    const mockPools: Pool[] = [
      {
        id: `mock-pool-1-${dexName}`,
        token0: { id: '0xA0b86a33E6441b8c4C8B8C4C8C4C8C4C8C4C8C4C', symbol: 'USDC', decimals: 6 },
        token1: { id: '0xB0b86a33E6441b8c4C8B8C4C8C4C8C4C8C4C8C4C', symbol: 'WETH', decimals: 18 },
        reserve0: '1000000',
        reserve1: '500',
        totalSupply: '1000000',
        volumeUSD: '50000'
      },
      {
        id: `mock-pool-2-${dexName}`,
        token0: { id: '0xC0b86a33E6441b8c4C8B8C4C8C4C8C4C8C4C8C4C', symbol: 'USDT', decimals: 6 },
        token1: { id: '0xD0b86a33E6441b8c4C8B8C4C8C4C8C4C8C4C8C4C', symbol: 'WETH', decimals: 18 },
        reserve0: '2000000',
        reserve1: '1000',
        totalSupply: '2000000',
        volumeUSD: '75000'
      }
    ];

    return mockPools;
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
          
          // Calculate APY based on volume and fees
          const dailyVolume = volume24h;
          const dailyFees = dailyVolume * (dexConfig as any).fee;
          const apy = (dailyFees * 365 / tvl) * 100;
          
          // Calculate risk score (simplified)
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
            apy: Math.min(apy, 1000), // Cap at 1000% APY
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
    
    // Sort by APY descending
    return opportunities.sort((a, b) => b.apy - a.apy);
  }

  private calculateRiskScore(tvl: number, volume24h: number, dexName: string): number {
    // Risk factors: low TVL, low volume, new DEX
    let riskScore = 0.5; // Base risk
    
    if (tvl < 100000) riskScore += 0.3; // Low TVL
    if (tvl < 10000) riskScore += 0.2; // Very low TVL
    
    if (volume24h < 10000) riskScore += 0.2; // Low volume
    if (volume24h < 1000) riskScore += 0.1; // Very low volume
    
    // DEX-specific risk adjustments
    const establishedDexes = ['uniswap_v2', 'uniswap_v3', 'sushiswap', 'pancakeswap_v2'];
    if (!establishedDexes.includes(dexName)) {
      riskScore += 0.1; // Newer/less established DEX
    }
    
    return Math.min(riskScore, 1.0); // Cap at 1.0
  }

  async getTokenPrice(tokenAddress: string): Promise<number> {
    try {
      // Use Etherscan API to get token price
      const response = await axios.get(
        `https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${this.etherscanApiKey}`
      );
      
      if (response.data?.result?.ethusd) {
        return parseFloat(response.data.result.ethusd);
      }
      
      return 0;
    } catch (error) {
      this.logger.error(`Error getting token price for ${tokenAddress}:`, error);
      return 0;
    }
  }

  async swap(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippage: number;
    dex: string;
  }): Promise<SwapResult> {
    try {
      this.logger.info(`Executing swap on ${params.dex}: ${params.amountIn} ${params.tokenIn} -> ${params.tokenOut}`);
      
      // In a real implementation, this would:
      // 1. Get quote from DEX
      // 2. Build transaction
      // 3. Sign and send transaction
      // 4. Wait for confirmation
      
      // For now, return mock success
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: 150000,
        gasPrice: '20000000000' // 20 gwei
      };
    } catch (error) {
      this.logger.error(`Swap failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async addLiquidity(params: {
    token0: string;
    token1: string;
    amount0: string;
    amount1: string;
    dex: string;
  }): Promise<SwapResult> {
    try {
      this.logger.info(`Adding liquidity on ${params.dex}: ${params.amount0} ${params.token0} + ${params.amount1} ${params.token1}`);
      
      // Mock implementation
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: 200000,
        gasPrice: '20000000000'
      };
    } catch (error) {
      this.logger.error(`Add liquidity failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async bridge(params: {
    fromChain: string;
    toChain: string;
    token: string;
    amount: string;
    recipient: string;
  }): Promise<BridgeResult> {
    try {
      this.logger.info(`Bridging ${params.amount} ${params.token} from ${params.fromChain} to ${params.toChain}`);
      
      // In a real implementation, this would integrate with:
      // - Multichain
      // - Stargate
      // - Hop Protocol
      // - LayerZero
      
      // Mock implementation
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        bridgeFee: 0.001 // 0.1% bridge fee
      };
    } catch (error) {
      this.logger.error(`Bridge failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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
      
      // Fallback gas price
      return '20000000000'; // 20 gwei
    } catch (error) {
      this.logger.error('Error getting gas price:', error);
      return '20000000000'; // 20 gwei fallback
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info(`Shutting down DEX integrations for ${this.chain}`);
    this.logger.success(`DEX integrations shutdown completed for ${this.chain}`);
  }
} 