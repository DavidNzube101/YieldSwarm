// Force load .env file and ignore shell env
import * as fs from 'fs';
import * as dotenv from 'dotenv';
const envFile = fs.existsSync('.env') ? '.env' : undefined;
if (envFile) {
  dotenv.config({ path: envFile, override: true });
}
// After this, only use process.env as loaded from .env, not from shell

import { Command } from 'commander';
import { WalletManager } from './WalletManager';
import { ChainManager } from './ChainManager';
import { YieldSwarmCLI } from './YieldSwarmCLI';
import { Logger } from '../utils/Logger';
import { SwarmCoordinator } from '../swarm/SwarmCoordinator';
import * as readline from 'readline';


const program = new Command();
const coordinator = SwarmCoordinator.getInstance();

// Helper for confirmation prompts
async function confirm(query: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query + ' (y/N): ', ans => {
      rl.close();
      resolve(ans.toLowerCase() === 'y');
    });
  });
}

program
  .name('yieldswarm')
  .description('Multi-Chain DeFi Yield Optimizer Swarm CLI')
  .version('1.0.0');

const logger = new Logger('CLI');

// Wallet management commands
const walletManager = new WalletManager();
program.addCommand(walletManager.getCommands());

// Chain management commands
const chainManager = new ChainManager();
program.addCommand(chainManager.getCommands());

// Main YieldSwarm operations (swarm command and its subcommands)
const swarmCLI = new YieldSwarmCLI();
program.addCommand(swarmCLI.getCommands());

// Top-level Agents commands
const agents = program.command('agents').description('Manage agents');

agents
  .command('list')
  .description('List all agents')
  .action(async () => {
    const agents = await coordinator.listAgents();
    if (agents.length === 0) {
      console.log('No agents found.');
      return;
    }
    console.log('Agents:');
    agents.forEach(agent => {
      console.log(`  ID: ${agent.id}`);
      console.log(`  Name: ${agent.name}`);
      console.log(`  Type: ${agent.type}`);
      console.log(`  Status: ${agent.status}`);
      console.log(`  Config: ${JSON.stringify(agent.config)}`);
      console.log('---');
    });
  });

agents
  .command('get')
  .description('Get details of a specific agent')
  .argument('<id>', 'ID of the agent to retrieve')
  .action(async (id) => {
    const agent = await coordinator.getAgent(id);
    if (agent) {
      console.log('Agent:', agent);
    } else {
      console.log(`Agent with ID ${id} not found.`);
    }
  });

agents
  .command('create')
  .description('Create a new agent')
  .argument('<name>', 'Name of the agent')
  .argument('<type>', 'Type of the agent')
  .option('--chain <chain>', 'Target chain for the agent')
  .option('-c, --config <json>', 'JSON configuration for the agent', '{}')
  .action(async (name, type, options) => {
    let config = {};
    try {
      config = JSON.parse(options.config);
    } catch (e) {
      console.error('Error: Invalid JSON for --config option. Please ensure it is a valid JSON string.');
      process.exit(1);
    }
    const agent = await coordinator.createAgent({ name, type, chain: options.chain, config });
    console.log(`Created agent: ${agent.name} (ID: ${agent.id})`);
  });

agents
  .command('start')
  .description('Start an agent')
  .argument('<id>', 'ID of the agent to start')
  .action(async (id) => {
    await coordinator.startAgent(id);
    console.log(`Agent ${id} started successfully.`);
  });

agents
  .command('stop')
  .description('Stop an agent')
  .argument('<id>', 'ID of the agent to stop')
  .action(async (id) => {
    await coordinator.stopAgent(id);
    console.log(`Agent ${id} stopped successfully.`);
  });

agents
  .command('delete')
  .description('Delete an agent')
  .argument('<id>', 'ID of the agent to delete')
  .action(async (id) => {
    const isConfirmed = await confirm(`Are you sure you want to delete agent ${id}?`);
    if (isConfirmed) {
      await coordinator.deleteAgent(id);
      console.log(`Agent ${id} deleted successfully.`);
    } else {
      console.log('Agent deletion cancelled.');
    }
  });

// Top-level Swarms commands
const swarms = program.command('swarms').description('Manage swarms');

swarms
  .command('list')
  .description('List all swarms')
  .action(async () => {
    const swarms = await coordinator.listSwarms();
    if (swarms.length === 0) {
      console.log('No swarms found.');
      return;
    }
    console.log('Swarms:');
    swarms.forEach(swarm => {
      console.log(`  ID: ${swarm.id}`);
      console.log(`  Name: ${swarm.name}`);
      console.log(`  Algorithm: ${JSON.stringify(swarm.algorithm)}`);
      console.log(`  Status: ${swarm.status}`);
      console.log(`  Agents: ${swarm.agents.map((a: any) => a.name).join(', ')}`);
      console.log(`  Config: ${JSON.stringify(swarm.config)}`);
      console.log('---');
    });
  });

swarms
  .command('get')
  .description('Get details of a specific swarm')
  .argument('<id>', 'ID of the swarm to retrieve')
  .action(async (id) => {
    const swarm = await coordinator.getSwarm(id);
    if (swarm) {
      console.log('Swarm:', swarm);
    } else {
      console.log(`Swarm with ID ${id} not found.`);
    }
  });

swarms
  .command('create')
  .description('Create a new swarm')
  .argument('<name>', 'Name of the swarm')
  .option('-a, --algorithm <json>', 'JSON for the algorithm', '{}')
  .option('-c, --config <json>', 'JSON configuration for the swarm', '{}')
  .action(async (name, options) => {
    let algorithm = {};
    let config = {};
    try {
      algorithm = JSON.parse(options.algorithm);
    } catch (e) {
      console.error('Error: Invalid JSON for --algorithm option. Please ensure it is a valid JSON string.');
      process.exit(1);
    }
    try {
      config = JSON.parse(options.config);
    } catch (e) {
      console.error('Error: Invalid JSON for --config option. Please ensure it is a valid JSON string.');
      process.exit(1);
    }
    const swarm = await coordinator.createSwarm(name, algorithm, config);
    console.log(`Created swarm: ${swarm.name} (ID: ${swarm.id})`);
  });

swarms
  .command('start')
  .description('Start a swarm')
  .argument('<id>', 'ID of the swarm to start')
  .action(async (id) => {
    await coordinator.startSwarm(id);
    console.log(`Swarm ${id} started successfully.`);
  });

swarms
  .command('stop')
  .description('Stop a swarm')
  .argument('<id>', 'ID of the swarm to stop')
  .action(async (id) => {
    await coordinator.stopSwarm(id);
    console.log(`Swarm ${id} stopped successfully.`);
  });

swarms
  .command('delete')
  .description('Delete a swarm')
  .argument('<id>', 'ID of the swarm to delete')
  .action(async (id) => {
    const isConfirmed = await confirm(`Are you sure you want to delete swarm ${id}?`);
    if (isConfirmed) {
      await coordinator.deleteSwarm(id);
      console.log(`Swarm ${id} deleted successfully.`);
    } else {
      console.log('Swarm deletion cancelled.');
    }
  });

swarms
  .command('add-agent')
  .description('Add an agent to a swarm')
  .argument('<swarm_id>', 'ID of the swarm')
  .argument('<agent_id>', 'ID of the agent')
  .action(async (swarmId, agentId) => {
    await coordinator.addAgentToSwarm(swarmId, agentId);
    console.log(`Added agent ${agentId} to swarm ${swarmId}`);
  });

swarms
  .command('remove-agent')
  .description('Remove an agent from a swarm')
  .argument('<swarm_id>', 'ID of the swarm')
  .argument('<agent_id>', 'ID of the agent')
  .action(async (swarmId, agentId) => {
    await coordinator.removeAgentFromSwarm(swarmId, agentId);
    console.log(`Removed agent ${agentId} from swarm ${swarmId}`);
  });

program
  .command('alerts')
  .description('Show recent risk alerts')
  .action(async () => {
    const alerts = coordinator.getRecentAlerts();
    if (alerts.length === 0) {
      console.log('No recent alerts.');
      return;
    }
    console.log('Recent Alerts:');
    alerts.forEach(alert => {
      console.log(`  ID: ${alert.id}`);
      console.log(`  Type: ${alert.type}`);
      console.log(`  Source: ${alert.source}`);
      console.log(`  Timestamp: ${new Date(alert.timestamp).toLocaleString()}`);
      console.log(`  Data: ${JSON.stringify(alert.data)}`);
      console.log('---');
    });
  });

// Quick start command
program
  .command('start')
  .description('Quick start YieldSwarm with default settings')
  .option('-c, --chains <chains>', 'Comma-separated list of chains (e.g., ethereum,bsc,polygon)', 'ethereum,bsc,polygon,arbitrum,solana')
  .option('-w, --wallet <wallet>', 'Wallet address to use')
  .option('-p, --private-key <key>', 'Private key (or use --generate-wallet)')
  .option('--generate-wallet', 'Generate a new wallet')
  .option('--testnet', 'Use testnet instead of mainnet')
  .action(async (options) => {
    const cli = new YieldSwarmCLI();
    await cli.quickStart(options);
  });

// Setup command
program
  .command('setup')
  .description('Interactive setup wizard')
  .option('--skip-wallet', 'Skip wallet setup')
  .option('--skip-apis', 'Skip API key setup')
  .action(async (options) => {
    const cli = new YieldSwarmCLI();
    await cli.setupWizard(options);
  });

// Status command
program
  .command('status')
  .description('Show system status and configuration')
  .action(async () => {
    const cli = new YieldSwarmCLI();
    await cli.showStatus();
  });

// Test commands
program
  .command('test')
  .description('Run various tests')
  .option('--apis', 'Test API connectivity')
  .option('--wallet', 'Test wallet configuration')
  .option('--dex', 'Test DEX integrations')
  .option('--all', 'Run all tests')
  .action(async (options) => {
    const cli = new YieldSwarmCLI();
    await cli.runTests(options);
  });

// Help command
program
  .command('help')
  .description('Show detailed help')
  .action(() => {
    console.log(`
🎯 YieldSwarm CLI - Multi-Chain DeFi Yield Optimizer

Quick Start:
  yieldswarm start                    # Start with default settings
  yieldswarm setup                    # Interactive setup wizard
  yieldswarm wallet create            # Create new wallet
  yieldswarm chain list               # List supported chains
  yieldswarm swarm optimize           # Start yield optimization

Wallet Management:
  yieldswarm wallet create            # Generate new wallet
  yieldswarm wallet import <key>      # Import existing wallet
  yieldswarm wallet balance           # Check balances across chains
  yieldswarm wallet list              # List configured wallets

Chain Management:
  yieldswarm chain list               # List supported chains
  yieldswarm chain enable <chain>     # Enable specific chain
  yieldswarm chain disable <chain>    # Disable specific chain
  yieldswarm chain config <chain>     # Configure chain settings

YieldSwarm Operations:
  yieldswarm swarm optimize           # Start yield optimization
  yieldswarm swarm stop               # Stop optimization
  yieldswarm swarm status             # Show optimization status
  yieldswarm swarm logs               # Show recent logs

Testing:
  yieldswarm test --all               # Run all tests
  yieldswarm test --apis              # Test API connectivity
  yieldswarm test --wallet            # Test wallet configuration
  yieldswarm swarm test --dex               # Test DEX integrations

For more information, visit: https://github.com/yieldswarm/docs
    `);
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (err: any) {
  if (err.code === 'commander.help' || err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
    // Help or version was displayed, exit normally
    process.exit(0);
  } else {
    logger.error('CLI Error:', err);
    process.exit(1);
  }
} 