#!/usr/bin/env ts-node
import { Command } from 'commander';
import { SwarmCoordinator } from '../src/swarm/SwarmCoordinator';
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
  .name('yieldswarm-cli')
  .description('CLI to manage YieldSwarm agents and swarms')
  .version('1.0.0');

const agents = program.command('agents').description('Manage agents');
const swarms = program.command('swarms').description('Manage swarms');

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
  .option('-c, --config <json>', 'JSON configuration for the agent', '{}')
  .action(async (name, type, options) => {
    let config = {};
    try {
      config = JSON.parse(options.config);
    } catch (e) {
      console.error('Error: Invalid JSON for --config option. Please ensure it is a valid JSON string.');
      process.exit(1);
    }
    const agent = await coordinator.createAgent(name, type, config);
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


async function main() {
  try {
    await coordinator.initialize();
    await program.parseAsync(process.argv);
  } catch (err: any) {
    console.error(`Error: ${err.message || err}`);
    process.exit(1);
  } finally {
    await coordinator.shutdown();
    process.exit(0);
  }
}

main();