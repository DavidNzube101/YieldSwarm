import { Command } from 'commander';
import { ethers } from 'ethers';
import { WalletConfigManager } from '../utils/WalletConfig';
import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

export class WalletManager {
  private logger: Logger;
  private configPath: string;

  constructor() {
    this.logger = new Logger('WalletManager');
    this.configPath = path.join(process.cwd(), '.wallet-config.json');
  }

  getCommands(): Command {
    const wallet = new Command('wallet');

    wallet
      .command('create')
      .description('Create a new wallet')
      .option('-o, --output <file>', 'Save wallet to file')
      .option('--show-private', 'Show private key in output')
      .action(async (options) => {
        await this.createWallet(options);
      });

    wallet
      .command('import')
      .description('Import existing wallet')
      .argument('<private-key>', 'Private key to import')
      .option('-o, --output <file>', 'Save wallet to file')
      .action(async (privateKey, options) => {
        await this.importWallet(privateKey, options);
      });

    wallet
      .command('list')
      .description('List configured wallets')
      .action(async () => {
        await this.listWallets();
      });

    wallet
      .command('balance')
      .description('Check wallet balances across chains')
      .option('-c, --chain <chain>', 'Specific chain to check')
      .option('-a, --address <address>', 'Wallet address to check')
      .action(async (options) => {
        await this.checkBalances(options);
      });

    wallet
      .command('backup')
      .description('Backup wallet configuration')
      .option('-o, --output <file>', 'Output file path')
      .action(async (options) => {
        await this.backupWallet(options);
      });

    wallet
      .command('restore')
      .description('Restore wallet from backup')
      .argument('<file>', 'Backup file path')
      .action(async (file) => {
        await this.restoreWallet(file);
      });

    return wallet;
  }

  private async createWallet(options: any): Promise<void> {
    try {
      this.logger.info('Creating new wallet...');

      // Generate new wallet
      const wallet = ethers.Wallet.createRandom();
      
      const walletInfo = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase,
        createdAt: new Date().toISOString()
      };

      // Display wallet info
      console.log('\n🎉 New wallet created successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Address: ${walletInfo.address}`);
      
      if (options.showPrivate) {
        console.log(`Private Key: ${walletInfo.privateKey}`);
        if (walletInfo.mnemonic) {
          console.log(`Mnemonic: ${walletInfo.mnemonic}`);
        }
      } else {
        console.log('Private Key: [Hidden - use --show-private to display]');
        if (walletInfo.mnemonic) {
          console.log('Mnemonic: [Hidden - use --show-private to display]');
        }
      }

      // Save to file if requested
      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, JSON.stringify(walletInfo, null, 2));
        this.logger.success(`Wallet saved to: ${outputPath}`);
      }

      // Save to default config
      await this.saveWalletConfig(walletInfo);

      // Security warning
      console.log('\n⚠️  SECURITY WARNING:');
      console.log('• Keep your private key and mnemonic secure');
      console.log('• Never share them with anyone');
      console.log('• Consider using a hardware wallet for large amounts');
      console.log('• This is a test wallet - add funds carefully');

    } catch (error) {
      this.logger.error('Failed to create wallet:', error);
    }
  }

  private async importWallet(privateKey: string, options: any): Promise<void> {
    try {
      this.logger.info('Importing wallet...');

      // Validate private key
      if (!privateKey.startsWith('0x')) {
        privateKey = `0x${privateKey}`;
      }

      const wallet = new ethers.Wallet(privateKey);
      
      const walletInfo = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        importedAt: new Date().toISOString()
      };

      console.log('\n✅ Wallet imported successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Address: ${walletInfo.address}`);

      // Save to file if requested
      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, JSON.stringify(walletInfo, null, 2));
        this.logger.success(`Wallet saved to: ${outputPath}`);
      }

      // Save to default config
      await this.saveWalletConfig(walletInfo);

    } catch (error) {
      this.logger.error('Failed to import wallet:', error);
    }
  }

  private async listWallets(): Promise<void> {
    try {
      const config = await this.loadWalletConfig();
      
      if (!config || Object.keys(config).length === 0) {
        console.log('\n📭 No wallets configured');
        console.log('Use "yieldswarm wallet create" to create a new wallet');
        return;
      }

      console.log('\n👛 Configured Wallets:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      Object.entries(config).forEach(([name, wallet]: [string, any]) => {
        console.log(`\n${name}:`);
        console.log(`  Address: ${wallet.address}`);
        console.log(`  Created: ${wallet.createdAt || wallet.importedAt || 'Unknown'}`);
      });

    } catch (error) {
      this.logger.error('Failed to list wallets:', error);
    }
  }

  private async checkBalances(options: any): Promise<void> {
    try {
      const walletManager = new WalletConfigManager();
      await walletManager.initialize();

      const chains = options.chain ? [options.chain] : ['ethereum', 'bsc', 'polygon', 'arbitrum'];
      const address = options.address || process.env['WALLET_ADDRESS'];

      if (!address) {
        this.logger.error('No wallet address specified. Use --address or set WALLET_ADDRESS env var');
        return;
      }

      console.log(`\n💰 Balance Check for ${address}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      for (const chain of chains) {
        try {
          const config = walletManager.getWalletConfig(chain);
          if (config) {
            const balance = await walletManager.getBalance(chain);
            console.log(`${chain.toUpperCase()}: ${balance} ETH`);
          } else {
            console.log(`${chain.toUpperCase()}: Not configured`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`${chain.toUpperCase()}: Error - ${errorMessage}`);
        }
      }

      walletManager.shutdown();

    } catch (error) {
      this.logger.error('Failed to check balances:', error);
    }
  }

  private async backupWallet(options: any): Promise<void> {
    try {
      const config = await this.loadWalletConfig();
      const outputPath = options.output || `wallet-backup-${Date.now()}.json`;

      fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
      this.logger.success(`Wallet backup saved to: ${outputPath}`);

    } catch (error) {
      this.logger.error('Failed to backup wallet:', error);
    }
  }

  private async restoreWallet(file: string): Promise<void> {
    try {
      const backupPath = path.resolve(file);
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

      await this.saveWalletConfig(backupData);
      this.logger.success(`Wallet restored from: ${backupPath}`);

    } catch (error) {
      this.logger.error('Failed to restore wallet:', error);
    }
  }

  private async saveWalletConfig(walletInfo: any): Promise<void> {
    try {
      const config = await this.loadWalletConfig();
      const walletName = `wallet_${Date.now()}`;
      
      config[walletName] = walletInfo;
      
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      this.logger.success('Wallet configuration saved');
    } catch (error) {
      this.logger.error('Failed to save wallet config:', error);
    }
  }

  private async loadWalletConfig(): Promise<any> {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
      return {};
    } catch (error) {
      return {};
    }
  }
} 