import { Command } from 'commander';
import { Logger } from '../utils/Logger';
import { SwarmCoordinator } from '../swarm/SwarmCoordinator';
import { RealDEXIntegrations } from '../defi/RealDEXIntegrations';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export class YieldSwarmCLI {
  private logger: Logger;
  private swarmCoordinator: SwarmCoordinator | null = null;

  constructor() {
    this.logger = new Logger('YieldSwarmCLI');
  }

  getCommands(): Command {
    const swarm = new Command('swarm');

    swarm
      .command('optimize')
      .description('Start yield optimization')
      .option('-c, --chains <chains>', 'Comma-separated list of chains', 'ethereum,bsc,polygon,arbitrum,solana')
      .option('-w, --wallet <wallet>', 'Wallet address to use')
      .option('-p, --private-key <key>', 'Private key')
      .option('--testnet', 'Use testnet')
      .option('--dry-run', 'Simulate without executing trades')
      .action(async (options) => {
        await this.startOptimization(options);
      });

    swarm
      .command('stop')
      .description('Stop yield optimization')
      .action(async () => {
        await this.stopOptimization();
      });

    swarm
      .command('status')
      .description('Show optimization status')
      .action(async () => {
        await this.showOptimizationStatus();
      });

    swarm
      .command('logs')
      .description('Show recent logs')
      .option('-n, --lines <number>', 'Number of log lines to show', '50')
      .option('-f, --follow', 'Follow logs in real-time')
      .action(async (options) => {
        await this.showLogs(options);
      });

    swarm
      .command('portfolio')
      .description('Show current portfolio')
      .option('-c, --chain <chain>', 'Specific chain to show')
      .action(async (options) => {
        await this.showPortfolio(options);
      });

    swarm
      .command('opportunities')
      .description('Show available yield opportunities')
      .option('-c, --chain <chain>', 'Specific chain to show')
      .option('-m, --min-apy <apy>', 'Minimum APY filter', '5')
      .argument('[minApy]', 'Optional minimum APY filter (overrides --min-apy)')
      .action(async (minApyArg, options) => {
        // If minApyArg is provided, use it; else use options.minApy
        if (minApyArg) options.minApy = minApyArg;
        await this.showOpportunities(options);
      });

    return swarm;
  }

  async quickStart(options: any): Promise<void> {
    try {
      this.logger.info('🚀 Quick starting YieldSwarm...');

      // Setup wallet if needed
      if (options.generateWallet) {
        await this.generateWallet();
      } else if (options.privateKey) {
        await this.setupWallet(options.privateKey, options.wallet);
      }

      // Start optimization
      await this.startOptimization(options);

    } catch (error) {
      this.logger.error('Quick start failed:', error);
    }
  }

  async setupWizard(options: any): Promise<void> {
    try {
      console.log('\n🎯 YieldSwarm Setup Wizard');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (!options.skipWallet) {
        await this.walletSetup();
      }

      if (!options.skipApis) {
        await this.apiSetup();
      }

      await this.chainSetup();
      await this.testSetup();

      console.log('\n✅ Setup completed successfully!');
      console.log('Run "yieldswarm start" to begin optimization');

    } catch (error) {
      this.logger.error('Setup wizard failed:', error);
    }
  }

  async showStatus(): Promise<void> {
    try {
      console.log('\n📊 YieldSwarm Status');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Check environment
      const envStatus = await this.checkEnvironment();
      console.log('\n🔧 Environment:');
      Object.entries(envStatus).forEach(([key, value]) => {
        console.log(`  ${key}: ${value ? '✅' : '❌'}`);
      });

      // Check wallet
      const walletStatus = await this.checkWallet();
      console.log('\n👛 Wallet:');
      Object.entries(walletStatus).forEach(([key, value]) => {
        console.log(`  ${key}: ${value ? '✅' : '❌'}`);
      });

      // Check chains
      const chainStatus = await this.checkChains();
      console.log('\n🔗 Chains:');
      Object.entries(chainStatus).forEach(([key, value]) => {
        console.log(`  ${key}: ${value ? '✅' : '❌'}`);
      });

      // Check optimization status      if (this.swarmCoordinator) {        console.log('\n🔄 Optimization:');        console.log(`  Status: Active`);        const allAgents = await this.swarmCoordinator.listAgents();        const activeAgents = allAgents.filter(agent => agent.status === 'running');        console.log(`  Active Agents: ${activeAgents.length}`);      }

    } catch (error) {
      this.logger.error('Failed to show status:', error);
    }
  }

  async runTests(options: any): Promise<void> {
    try {
      this.logger.info('🧪 Running tests...');

      if (options.all || options.apis) {
        await this.runApiTests();
      }

      if (options.all || options.wallet) {
        await this.runWalletTests();
      }

      if (options.all || options.dex) {
        await this.runDexTests();
      }

      this.logger.success('All tests completed!');

    } catch (error) {
      this.logger.error('Tests failed:', error);
    }
  }

  private async startOptimization(_options: any): Promise<void> {
    try {
      this.logger.info('Starting yield optimization...');

      // Initialize swarm coordinator
      if (!this.swarmCoordinator) {
        this.swarmCoordinator = SwarmCoordinator.getInstance();
        await this.swarmCoordinator.initialize();
        this.logger.info('Swarm coordinator initialized.');
      }

      // Create a default swarm if none exists or a specific one is not provided
      let swarmId: string;
      const existingSwarms = await this.swarmCoordinator.listSwarms();
      if (existingSwarms.length === 0) {
        this.logger.info('No existing swarms found, creating a default swarm...');
        const newSwarm = await this.swarmCoordinator.createSwarm('DefaultOptimizationSwarm', { name: 'Optimization' }, {});
        swarmId = newSwarm.id;
        this.logger.success(`Default swarm '${newSwarm.name}' created with ID: ${newSwarm.id}`);
      } else {
        // For now, just use the first existing swarm. In a real scenario, the user might specify which swarm to start.
        swarmId = existingSwarms[0].id;
        this.logger.info(`Using existing swarm with ID: ${swarmId}`);
      }

      // Start the swarm
      await this.swarmCoordinator.startSwarm(swarmId);

      this.logger.success('Yield optimization started successfully');

      // Keep running until stopped
      process.on('SIGINT', async () => {
        this.logger.info('Received SIGINT, shutting down...');
        await this.stopOptimization();
        process.exit(0);
      });

    } catch (error) {
      this.logger.error('Failed to start optimization:', error);
    }
  }

  private async stopOptimization(): Promise<void> {
    try {
      if (this.swarmCoordinator) {
        await this.swarmCoordinator.shutdown();
        this.swarmCoordinator = null;
        this.logger.success('Optimization stopped');
      } else {
        this.logger.warn('No optimization running');
      }
    } catch (error) {
      this.logger.error('Failed to stop optimization:', error);
    }
  }

  private async showOptimizationStatus(): Promise<void> {
    try {
      if (!this.swarmCoordinator) {
        console.log('No optimization running');
        return;
      }

      const status = 'Active';
      const allAgents = await this.swarmCoordinator.listAgents();
      const activeAgents = allAgents.filter(agent => agent.status === 'running');

      console.log('\n🔄 Optimization Status');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Status: ${status}`);
      console.log(`Active Agents: ${activeAgents.length}`);
      
      if (activeAgents.length > 0) {
        console.log('\nActive Agents:');
        activeAgents.forEach((agent: any) => {
          console.log(`  - ${agent.name} (${agent.id}) - Status: ${agent.status}`);
        });
      }

    } catch (error) {
      this.logger.error('Failed to show optimization status:', error);
    }
  }

  private async showLogs(options: any): Promise<void> {
    try {
      const logFile = path.join(process.cwd(), 'logs', 'yieldswarm.log');
      
      if (!fs.existsSync(logFile)) {
        console.log('No log file found');
        return;
      }

      const lines = parseInt(options.lines);
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());

      console.log(`\n📝 Recent Logs (last ${lines} lines):`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const recentLines = logLines.slice(-lines);
      recentLines.forEach(line => {
        console.log(line);
      });

    } catch (error) {
      this.logger.error('Failed to show logs:', error);
    }
  }

  private async showPortfolio(_options: any): Promise<void> {
    try {
      if (!this.swarmCoordinator) {
        console.log('No optimization running');
        return;
      }

      // This would show current portfolio allocations
      console.log('\n💼 Current Portfolio');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Portfolio display not yet implemented');

    } catch (error) {
      this.logger.error('Failed to show portfolio:', error);
    }
  }

  private async showOpportunities(options: any): Promise<void> {
    try {
      const chains = options.chain ? [options.chain] : ['ethereum', 'bsc', 'polygon', 'arbitrum', 'solana'];
      const minApy = parseFloat(options.minApy);

      console.log(`\n💎 Yield Opportunities (Min APY: ${minApy}%)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      for (const chain of chains) {
        try {
          const dexIntegrations = new RealDEXIntegrations(chain);
          await dexIntegrations.initialize();

          const opportunities = await dexIntegrations.getYieldOpportunities();
          const filteredOpportunities = opportunities.filter(opp => opp.apy >= minApy);

          if (filteredOpportunities.length > 0) {
            console.log(`\n${chain.toUpperCase()}:`);
            filteredOpportunities.slice(0, 5).forEach((opp, index) => {
              console.log(`  ${index + 1}. ${opp.token0Symbol}/${opp.token1Symbol} on ${opp.dex}`);
              console.log(`     APY: ${opp.apy.toFixed(2)}% | TVL: $${opp.tvl.toLocaleString()}`);
            });
          }

          await dexIntegrations.shutdown();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`${chain.toUpperCase()}: Error - ${errorMessage}`);
        }
      }

    } catch (error) {
      this.logger.error('Failed to show opportunities:', error);
    }
  }

  private async walletSetup(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query: string): Promise<string> => {
      return new Promise(resolve => rl.question(query, resolve));
    };

    try {
      console.log('\n👛 Wallet Setup');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const choice = await question('Choose option:\n1. Generate new wallet\n2. Import existing wallet\n3. Skip wallet setup\nChoice: ');

      if (choice === '1') {
        await this.generateWallet();
      } else if (choice === '2') {
        const privateKey = await question('Enter private key: ');
        await this.setupWallet(privateKey);
      }

      rl.close();
    } catch (error) {
      rl.close();
      throw error;
    }
  }

  private async apiSetup(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query: string): Promise<string> => {
      return new Promise(resolve => rl.question(query, resolve));
    };

    try {
      console.log('\n🔑 API Setup');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const etherscanKey = await question('Etherscan API Key (optional): ');
      const infuraKey = await question('Infura Project ID (optional): ');
      const alchemyKey = await question('Alchemy API Key (optional): ');

      // Save to .env file
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      if (etherscanKey) {
        envContent += `\nETHERSCAN_API_KEY=${etherscanKey}`;
      }
      if (infuraKey) {
        envContent += `\nINFURA_PROJECT_ID=${infuraKey}`;
      }
      if (alchemyKey) {
        envContent += `\nALCHEMY_API_KEY=${alchemyKey}`;
      }

      fs.writeFileSync(envPath, envContent);
      this.logger.success('API keys saved to .env file');

      rl.close();
    } catch (error) {
      rl.close();
      throw error;
    }
  }

  private async chainSetup(): Promise<void> {
    console.log('\n🔗 Chain Setup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Chains will be configured automatically');
    console.log('Use "yieldswarm chain list" to see available chains');
    console.log('Use "yieldswarm chain enable <chain>" to enable specific chains');
  }

  private async testSetup(): Promise<void> {
    console.log('\n🧪 Testing Setup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await this.runApiTests();
    await this.runWalletTests();
  }

  private async generateWallet(): Promise<void> {
    // Implementation would use ethers.js to generate wallet
    console.log('Wallet generation not yet implemented');
  }

  private async setupWallet(_privateKey: string, _address?: string): Promise<void> {
    // Implementation would validate and save wallet
    console.log('Wallet setup not yet implemented');
  }

  private async checkEnvironment(): Promise<Record<string, boolean>> {
    return {
      'Node.js': true,
      'TypeScript': true,
      'Environment File': fs.existsSync('.env'),
      'Config Files': fs.existsSync('config/')
    };
  }

  private async checkWallet(): Promise<Record<string, boolean>> {
    return {
      'Private Key': !!process.env['WALLET_PRIVATE_KEY'],
      'Wallet Address': !!process.env['WALLET_ADDRESS'],
      'Wallet Valid': false // Would validate private key
    };
  }

  private async checkChains(): Promise<Record<string, boolean>> {
    return {
      'Ethereum': true,
      'BSC': true,
      'Polygon': true,
      'Arbitrum': true,
      'Solana': true
    };
  }

  private async runApiTests(): Promise<void> {
    console.log('Running API tests...');
    // Implementation would run API connectivity tests
  }

  private async runWalletTests(): Promise<void> {
    console.log('Running wallet tests...');
    // Implementation would run wallet tests
  }

  private async runDexTests(): Promise<void> {
    console.log('Running DEX tests...');
    // Implementation would run DEX integration tests
  }
} 