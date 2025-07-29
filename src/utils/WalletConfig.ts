import { ethers } from 'ethers';
import { Logger } from './Logger';

export interface WalletConfig {
  address: string;
  privateKey: string;
  provider: ethers.providers.JsonRpcProvider;
  signer: ethers.Wallet;
}

export class WalletConfigManager {
  private logger: Logger;
  private walletConfigs: Map<string, WalletConfig> = new Map();

  constructor() {
    this.logger = new Logger('WalletConfigManager');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing wallet configurations...');

    const chains = ['ethereum', 'bsc', 'polygon', 'arbitrum'];
    
    for (const chain of chains) {
      try {
        await this.setupWalletForChain(chain);
      } catch (error) {
        this.logger.error(`Failed to setup wallet for ${chain}:`, error);
      }
    }

    this.logger.success('Wallet configurations initialized');
  }

  private async setupWalletForChain(chain: string): Promise<void> {
    const privateKey = process.env['WALLET_PRIVATE_KEY'];
    const walletAddress = process.env['WALLET_ADDRESS'];

    if (!privateKey) {
      this.logger.warn(`No private key configured for ${chain} - wallet disabled`);
      return;
    }

    if (!walletAddress) {
      this.logger.warn(`No wallet address configured for ${chain} - wallet disabled`);
      return;
    }

    // Validate private key
    try {
      const wallet = new ethers.Wallet(privateKey);
      if (wallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error('Private key does not match wallet address');
      }
    } catch (error) {
      this.logger.error(`Invalid private key for ${chain}:`, error);
      return;
    }

    // Get RPC URL for chain
    const rpcUrl = this.getRpcUrlForChain(chain);
    if (!rpcUrl) {
      this.logger.warn(`No RPC URL configured for ${chain} - wallet disabled`);
      return;
    }

    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(privateKey, provider);

      // Test connection
      const balance = await provider.getBalance(walletAddress);
      await this.validateNetwork(provider);

      this.walletConfigs.set(chain, {
        address: walletAddress,
        privateKey,
        provider,
        signer
      });

      this.logger.info(`Wallet configured for ${chain}: ${walletAddress} (${ethers.utils.formatEther(balance)} ETH)`);
    } catch (error) {
      this.logger.error(`Failed to setup wallet for ${chain}:`, error);
    }
  }

  private getRpcUrlForChain(chain: string): string | null {
    const rpcUrls: Record<string, string> = {
      ethereum: process.env['ETHEREUM_RPC_URL'] || '',
      bsc: process.env['BSC_RPC_URL'] || '',
      polygon: process.env['POLYGON_RPC_URL'] || '',
      arbitrum: process.env['ARBITRUM_RPC_URL'] || ''
    };

    return rpcUrls[chain] || null;
  }

  private async validateNetwork(provider: ethers.providers.Provider): Promise<void> {
    try {
      // Get network info (but don't use it for now)
      await provider.getNetwork();
      this.logger.debug('Network validation passed');
    } catch (error) {
      throw new Error(`Network validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getWalletConfig(chain: string): WalletConfig | null {
    return this.walletConfigs.get(chain) || null;
  }

  getAllWalletConfigs(): Map<string, WalletConfig> {
    return new Map(this.walletConfigs);
  }

  async getBalance(chain: string): Promise<string> {
    const config = this.getWalletConfig(chain);
    if (!config) {
      throw new Error(`No wallet configured for ${chain}`);
    }

    const balance = await config.provider.getBalance(config.address);
    return ethers.utils.formatEther(balance);
  }

  async getTokenBalance(chain: string, tokenAddress: string): Promise<string> {
    const config = this.getWalletConfig(chain);
    if (!config) {
      throw new Error(`No wallet configured for ${chain}`);
    }

    // ERC20 token balance check
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
      config.provider
    );

    const [balance, decimals] = await Promise.all([
      tokenContract['balanceOf'](config.address),
      tokenContract['decimals']()
    ]);

    return ethers.utils.formatUnits(balance, decimals);
  }

  async signTransaction(chain: string, transaction: ethers.providers.TransactionRequest): Promise<string> {
    const config = this.getWalletConfig(chain);
    if (!config) {
      throw new Error(`No wallet configured for ${chain}`);
    }

    const signedTx = await config.signer.signTransaction(transaction);
    return signedTx;
  }

  async sendTransaction(chain: string, transaction: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionResponse> {
    const config = this.getWalletConfig(chain);
    if (!config) {
      throw new Error(`No wallet configured for ${chain}`);
    }

    return await config.signer.sendTransaction(transaction);
  }

  async estimateGas(chain: string, transaction: ethers.providers.TransactionRequest): Promise<ethers.BigNumber> {
    const config = this.getWalletConfig(chain);
    if (!config) {
      throw new Error(`No wallet configured for ${chain}`);
    }

    return await config.provider.estimateGas(transaction);
  }

  async getGasPrice(chain: string): Promise<ethers.BigNumber> {
    const config = this.getWalletConfig(chain);
    if (!config) {
      throw new Error(`No wallet configured for ${chain}`);
    }

    return await config.provider.getGasPrice();
  }

  async waitForTransaction(chain: string, txHash: string): Promise<ethers.providers.TransactionReceipt> {
    const config = this.getWalletConfig(chain);
    if (!config) {
      throw new Error(`No wallet configured for ${chain}`);
    }

    return await config.provider.waitForTransaction(txHash);
  }

  shutdown(): void {
    this.logger.info('Shutting down wallet configurations...');
    this.walletConfigs.clear();
    this.logger.success('Wallet configurations shutdown completed');
  }
} 