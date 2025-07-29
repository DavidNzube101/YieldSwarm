import { Command } from 'commander';
import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  rpcUrlBackup?: string | undefined;
  explorer: string;
  enabled: boolean;
  testnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockTime: number;
  gasLimit: number;
  maxPriorityFeePerGas: string;
  maxFeePerGas: string;
}

export class ChainManager {
  private logger: Logger;
  private configPath: string;
  private chains: Map<string, ChainConfig>;

  constructor() {
    this.logger = new Logger('ChainManager');
    this.configPath = path.join(process.cwd(), '.chain-config.json');
    this.chains = new Map();
    this.initializeDefaultChains();
  }

  getCommands(): Command {
    const chain = new Command('chain');

    chain
      .command('list')
      .description('List all supported chains')
      .option('--enabled', 'Show only enabled chains')
      .option('--disabled', 'Show only disabled chains')
      .action(async (options) => {
        await this.listChains(options);
      });

    chain
      .command('enable')
      .description('Enable a specific chain')
      .argument('<chain>', 'Chain name (e.g., ethereum, bsc, polygon, arbitrum, solana)')
      .option('--testnet', 'Enable testnet instead of mainnet')
      .action(async (chainName, options) => {
        await this.enableChain(chainName, options);
      });

    chain
      .command('disable')
      .description('Disable a specific chain')
      .argument('<chain>', 'Chain name')
      .action(async (chainName) => {
        await this.disableChain(chainName);
      });

    chain
      .command('config')
      .description('Configure chain settings')
      .argument('<chain>', 'Chain name')
      .option('--rpc-url <url>', 'Set RPC URL')
      .option('--rpc-backup <url>', 'Set backup RPC URL')
      .option('--gas-limit <limit>', 'Set gas limit')
      .option('--max-fee <fee>', 'Set max fee per gas (in gwei)')
      .option('--max-priority-fee <fee>', 'Set max priority fee per gas (in gwei)')
      .action(async (chainName, options) => {
        await this.configureChain(chainName, options);
      });

    chain
      .command('test')
      .description('Test chain connectivity')
      .argument('<chain>', 'Chain name')
      .action(async (chainName) => {
        await this.testChain(chainName);
      });

    chain
      .command('reset')
      .description('Reset chain configuration to defaults')
      .option('--all', 'Reset all chains')
      .argument('[chain]', 'Specific chain to reset')
      .action(async (chainName, options) => {
        await this.resetChain(chainName, options);
      });

    return chain;
  }

  private initializeDefaultChains(): void {
    const defaultChains: ChainConfig[] = [
      {
        name: 'ethereum',
        chainId: 1,
        rpcUrl: this.getRpcUrl('ethereum'),
        rpcUrlBackup: process.env['ETHEREUM_RPC_URL_BACKUP'] || undefined,
        explorer: 'https://etherscan.io',
        enabled: true,
        testnet: false,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockTime: 12,
        gasLimit: 300000,
        maxPriorityFeePerGas: '2000000000', // 2 gwei
        maxFeePerGas: '50000000000' // 50 gwei
      },
      {
        name: 'bsc',
        chainId: 56,
        rpcUrl: this.getRpcUrl('bsc'),
        rpcUrlBackup: process.env['BSC_RPC_URL_BACKUP'] || 'https://bsc-dataseed2.binance.org/',
        explorer: 'https://bscscan.com',
        enabled: true,
        testnet: false,
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        blockTime: 3,
        gasLimit: 500000,
        maxPriorityFeePerGas: '1000000000', // 1 gwei
        maxFeePerGas: '10000000000' // 10 gwei
      },
      {
        name: 'polygon',
        chainId: 137,
        rpcUrl: this.getRpcUrl('polygon'),
        rpcUrlBackup: process.env['POLYGON_RPC_URL_BACKUP'] || 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
        explorer: 'https://polygonscan.com',
        enabled: true,
        testnet: false,
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        blockTime: 2,
        gasLimit: 500000,
        maxPriorityFeePerGas: '30000000000', // 30 gwei
        maxFeePerGas: '100000000000' // 100 gwei
      },
      {
        name: 'arbitrum',
        chainId: 42161,
        rpcUrl: this.getRpcUrl('arbitrum'),
        rpcUrlBackup: process.env['ARBITRUM_RPC_URL_BACKUP'] || 'https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
        explorer: 'https://arbiscan.io',
        enabled: true,
        testnet: false,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockTime: 1,
        gasLimit: 1000000,
        maxPriorityFeePerGas: '100000000', // 0.1 gwei
        maxFeePerGas: '1000000000' // 1 gwei
      },
      {
        name: 'solana',
        chainId: 101,
        rpcUrl: this.getRpcUrl('solana'),
        rpcUrlBackup: 'https://solana-api.projectserum.com',
        explorer: 'https://explorer.solana.com',
        enabled: true,
        testnet: false,
        nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
        blockTime: 0.4,
        gasLimit: 0, // Not applicable for Solana
        maxPriorityFeePerGas: '0', // Not applicable for Solana
        maxFeePerGas: '5000' // 5000 lamports
      }
    ];

    defaultChains.forEach(chain => {
      this.chains.set(chain.name, chain);
    });
  }

  private getRpcUrl(chainName: string): string {
    // Only use process.env as loaded from .env (not shell)
    const envVar = `${chainName.toUpperCase()}_RPC_URL`;
    const envUrl = process.env[envVar];
    if (!envUrl || envUrl.includes('YOUR_INFURA_PROJECT_ID') || envUrl.includes('YOUR_ALCHEMY_KEY') || envUrl.trim() === '') {
      this.logger.warn(`RPC URL for ${chainName} is missing or a placeholder in .env! Please set ${envVar} in your .env file.`);
      return '';
    }
    return envUrl;
  }

  private async listChains(options: any): Promise<void> {
    try {
      await this.loadConfig();

      console.log('\n🔗 Supported Chains:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      for (const [name, config] of this.chains) {
        if (options.enabled && !config.enabled) continue;
        if (options.disabled && config.enabled) continue;

        const status = config.enabled ? '✅' : '❌';
        const network = config.testnet ? 'TESTNET' : 'MAINNET';
        
        console.log(`\n${status} ${name.toUpperCase()} (${network})`);
        console.log(`  Chain ID: ${config.chainId}`);
        
        // Show RPC URL with indication if it's from env
        const envVar = `${name.toUpperCase()}_RPC_URL`;
        const isFromEnv = process.env[envVar] && process.env[envVar] !== `https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID`;
        const rpcIndicator = isFromEnv ? ' (from env)' : ' (default)';
        console.log(`  RPC: ${config.rpcUrl}${rpcIndicator}`);
        
        if (config.rpcUrlBackup) {
          console.log(`  Backup RPC: ${config.rpcUrlBackup}`);
        }
        
        console.log(`  Explorer: ${config.explorer}`);
        console.log(`  Native: ${config.nativeCurrency.symbol}`);
        console.log(`  Block Time: ${config.blockTime}s`);
        
        if (config.enabled) {
          console.log(`  Gas Limit: ${config.gasLimit.toLocaleString()}`);
          console.log(`  Max Fee: ${this.formatGasPrice(config.maxFeePerGas)}`);
        }
      }

    } catch (error) {
      this.logger.error('Failed to list chains:', error);
    }
  }

  private async enableChain(chainName: string, options: any): Promise<void> {
    try {
      await this.loadConfig();

      const chain = this.chains.get(chainName.toLowerCase());
      if (!chain) {
        this.logger.error(`Chain '${chainName}' not found. Available chains: ${Array.from(this.chains.keys()).join(', ')}`);
        return;
      }

      chain.enabled = true;
      chain.testnet = options.testnet || false;

      // Update RPC URL for testnet if needed
      if (options.testnet) {
        chain.rpcUrl = this.getTestnetRpcUrl(chainName);
        chain.chainId = this.getTestnetChainId(chainName);
      }

      await this.saveConfig();
      this.logger.success(`Chain '${chainName}' enabled successfully`);

    } catch (error) {
      this.logger.error(`Failed to enable chain '${chainName}':`, error);
    }
  }

  private async disableChain(chainName: string): Promise<void> {
    try {
      await this.loadConfig();

      const chain = this.chains.get(chainName.toLowerCase());
      if (!chain) {
        this.logger.error(`Chain '${chainName}' not found`);
        return;
      }

      chain.enabled = false;
      await this.saveConfig();
      this.logger.success(`Chain '${chainName}' disabled successfully`);

    } catch (error) {
      this.logger.error(`Failed to disable chain '${chainName}':`, error);
    }
  }

  private async configureChain(chainName: string, options: any): Promise<void> {
    try {
      await this.loadConfig();

      const chain = this.chains.get(chainName.toLowerCase());
      if (!chain) {
        this.logger.error(`Chain '${chainName}' not found`);
        return;
      }

      if (options.rpcUrl) {
        chain.rpcUrl = options.rpcUrl;
        this.logger.info(`Updated RPC URL for ${chainName}`);
      }

      if (options.rpcBackup) {
        chain.rpcUrlBackup = options.rpcBackup;
        this.logger.info(`Updated backup RPC URL for ${chainName}`);
      }

      if (options.gasLimit) {
        chain.gasLimit = parseInt(options.gasLimit);
        this.logger.info(`Updated gas limit for ${chainName}`);
      }

      if (options.maxFee) {
        chain.maxFeePerGas = this.parseGasPrice(options.maxFee);
        this.logger.info(`Updated max fee for ${chainName}`);
      }

      if (options.maxPriorityFee) {
        chain.maxPriorityFeePerGas = this.parseGasPrice(options.maxPriorityFee);
        this.logger.info(`Updated max priority fee for ${chainName}`);
      }

      await this.saveConfig();
      this.logger.success(`Chain '${chainName}' configured successfully`);

    } catch (error) {
      this.logger.error(`Failed to configure chain '${chainName}':`, error);
    }
  }

  private async testChain(chainName: string): Promise<void> {
    try {
      await this.loadConfig();

      const chain = this.chains.get(chainName.toLowerCase());
      if (!chain) {
        this.logger.error(`Chain '${chainName}' not found`);
        return;
      }

      if (!chain.enabled) {
        this.logger.error(`Chain '${chainName}' is disabled`);
        return;
      }

      console.log(`\n🧪 Testing ${chainName} connectivity...`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Solana-specific RPC test
      if (chain.name === 'solana') {
        try {
          const response = await fetch(chain.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getSlot',
              params: []
            })
          });
          const data = await response.json() as { result?: number };
          if (data && typeof data.result === 'number') {
            console.log(`✅ RPC Connection: Working`);
            console.log(`   Slot: ${data.result}`);
          } else {
            console.log(`❌ RPC Connection: Failed`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`❌ RPC Connection: Failed - ${errorMessage}`);
        }
      } else {
        // EVM chain RPC test
        try {
          const response = await fetch(chain.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_blockNumber',
              params: [],
              id: 1
            })
          });

          const data = await response.json() as any;
          if (data?.result) {
            console.log(`✅ RPC Connection: Working`);
            console.log(`   Block: ${parseInt(data.result, 16).toLocaleString()}`);
          } else {
            console.log(`❌ RPC Connection: Failed`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`❌ RPC Connection: Failed - ${errorMessage}`);
        }
      }

      // Test explorer
      try {
        const response = await fetch(chain.explorer);
        if (response.ok) {
          console.log(`✅ Explorer: Accessible`);
        } else {
          console.log(`❌ Explorer: Not accessible`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ Explorer: Not accessible - ${errorMessage}`);
      }

    } catch (error) {
      this.logger.error(`Failed to test chain '${chainName}':`, error);
    }
  }

  private async resetChain(chainName: string, options: any): Promise<void> {
    try {
      if (options.all) {
        this.initializeDefaultChains();
        await this.saveConfig();
        this.logger.success('All chains reset to defaults');
      } else if (chainName) {
        await this.loadConfig();
        const defaultChain = this.chains.get(chainName.toLowerCase());
        if (defaultChain) {
          defaultChain.enabled = true;
          defaultChain.testnet = false;
          await this.saveConfig();
          this.logger.success(`Chain '${chainName}' reset to defaults`);
        } else {
          this.logger.error(`Chain '${chainName}' not found`);
        }
      } else {
        this.logger.error('Please specify a chain name or use --all');
      }
    } catch (error) {
      this.logger.error('Failed to reset chains:', error);
    }
  }

  private getTestnetRpcUrl(chainName: string): string {
    const testnetUrls: Record<string, string> = {
      ethereum: 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID',
      bsc: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      polygon: 'https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
      arbitrum: 'https://goerli-rollup.arbitrum.io/rpc',
      solana: 'https://api.devnet.solana.com'
    };
    return testnetUrls[chainName] || '';
  }

  private getTestnetChainId(chainName: string): number {
    const testnetIds: Record<string, number> = {
      ethereum: 11155111, // Sepolia
      bsc: 97, // BSC Testnet
      polygon: 80001, // Mumbai
      arbitrum: 421613, // Arbitrum Goerli
      solana: 103 // Solana Devnet
    };
    return testnetIds[chainName] || 1;
  }

  private parseGasPrice(price: string): string {
    // Convert gwei to wei
    const gwei = parseFloat(price);
    return (gwei * 1000000000).toString();
  }

  private formatGasPrice(price: string): string {
    // Convert wei to gwei
    const wei = parseFloat(price);
    return `${(wei / 1000000000).toFixed(1)} gwei`;
  }

  private async loadConfig(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        Object.entries(config).forEach(([name, chainConfig]: [string, any]) => {
          this.chains.set(name, { ...this.chains.get(name), ...chainConfig });
        });
      }
    } catch (error) {
      this.logger.warn('Failed to load chain config, using defaults');
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const config: Record<string, any> = {};
      this.chains.forEach((chain, name) => {
        config[name] = chain;
      });
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      this.logger.error('Failed to save chain config:', error);
    }
  }
} 