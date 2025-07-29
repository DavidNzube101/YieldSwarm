import express from 'express';
import { SwarmCoordinator } from '../src/swarm/SwarmCoordinator';
import { Logger } from '../src/utils/Logger';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';

import { DiscoveryAgent } from '../src/agents/DiscoveryAgent';
import { AnalysisAgent } from '../src/agents/AnalysisAgent';
import { RiskAgent } from '../src/agents/RiskAgent';
import { ExecutionAgent } from '../src/agents/ExecutionAgent';
import { ApiClient } from '../src/utils/JuliaOSMock';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for simplicity
  },
});

const port = process.env['API_PORT'] || 3000;
const logger = new Logger('API');
const coordinator = SwarmCoordinator.getInstance();

let discoveryAgentInstance: DiscoveryAgent | undefined;
let analysisAgentInstance: AnalysisAgent | undefined;
let riskAgentInstance: RiskAgent | undefined;
let executionAgentInstance: ExecutionAgent | undefined;

let discoveryAgentJuliaId: string | undefined;
let analysisAgentJuliaId: string | undefined;
let riskAgentJuliaId: string | undefined;
let defaultSwarmJuliaId: string | undefined;

async function startAgentsAndSwarm() {
  try {
    logger.info('Creating Julia-side agents...');
    const discoveryAgentJulia = await coordinator.createAgent(
      'DefaultDiscoveryAgent',
      'Discovery',
      { chains: ['solana'] } // Default chains for discovery
    );
    if (!discoveryAgentJulia || !discoveryAgentJulia.id) {
      logger.error('Failed to create DefaultDiscoveryAgent. Exiting.');
      process.exit(1);
    }
    discoveryAgentJuliaId = discoveryAgentJulia.id;

    const analysisAgentJulia = await coordinator.createAgent(
      'DefaultAnalysisAgent',
      'Analysis',
      { tolerance: 0.8 }
    );
    if (!analysisAgentJulia || !analysisAgentJulia.id) {
      logger.error('Failed to create DefaultAnalysisAgent. Exiting.');
      process.exit(1);
    }
    analysisAgentJuliaId = analysisAgentJulia.id;

    const riskAgentJulia = await coordinator.createAgent(
      'DefaultRiskAgent',
      'Risk',
      {}
    );
    if (!riskAgentJulia || !riskAgentJulia.id) {
      logger.error('Failed to create DefaultRiskAgent. Exiting.');
      process.exit(1);
    }
    riskAgentJuliaId = riskAgentJulia.id;
    logger.success('Julia-side agents created.');

    logger.info('Instantiating and starting Node.js agent instances...');
    const apiClient = new ApiClient(coordinator.getAgentCommunication());
    discoveryAgentInstance = new DiscoveryAgent('solana', apiClient);
    analysisAgentInstance = new AnalysisAgent(apiClient);
    riskAgentInstance = new RiskAgent(apiClient);
    executionAgentInstance = new ExecutionAgent('solana', apiClient);

    await discoveryAgentInstance.start();
    await analysisAgentInstance.start();
    await riskAgentInstance.start();
    await executionAgentInstance.start();
    logger.success('Node.js agent instances started.');

    const existingSwarms = await coordinator.listSwarms();
    if (existingSwarms.length === 0) {
      logger.info('No existing swarms found, creating a default swarm...');
      const newSwarm = await coordinator.createSwarm(
        'DefaultYieldSwarm',
        { type: 'PortfolioOptimization', params: {} },
        { objective: 'maximize_yield' }
      );
      defaultSwarmJuliaId = newSwarm.id;
      logger.success(`Default swarm '${newSwarm.name}' created with ID: ${newSwarm.id}`);

      logger.info('Adding agents to the default swarm...');
      if (defaultSwarmJuliaId && discoveryAgentJuliaId && analysisAgentJuliaId && riskAgentJuliaId) {
        await coordinator.addAgentToSwarm(defaultSwarmJuliaId!, discoveryAgentJuliaId!);
        await coordinator.addAgentToSwarm(defaultSwarmJuliaId!, analysisAgentJuliaId!);
        await coordinator.addAgentToSwarm(defaultSwarmJuliaId!, riskAgentJuliaId!);
        logger.success('Agents added to default swarm.');
      } else {
        logger.error('Failed to add agents to swarm: missing IDs.');
        process.exit(1);
      }

      await coordinator.startSwarm(defaultSwarmJuliaId!);
      logger.success(`Default swarm ${defaultSwarmJuliaId} started.`);
    } else {
      defaultSwarmJuliaId = existingSwarms[0].id;
      logger.info(`Using existing swarm with ID: ${defaultSwarmJuliaId}`);
      const swarmStatus = await coordinator.getSwarm(defaultSwarmJuliaId!);
      if (swarmStatus.status !== 'running') {
        await coordinator.startSwarm(defaultSwarmJuliaId!);
        logger.success(`Existing swarm ${defaultSwarmJuliaId} started.`);
      }
    }
  } catch (error) {
    logger.error('Failed to start agents and swarm:', error);
    if (error instanceof Error) {
      logger.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

app.use(cors());
app.use(express.json());

// Serve the UI
app.use('/dashboard', express.static(path.join(__dirname, '../src/yieldswarm-ui')));

// WebSocket connection
io.on('connection', (socket: any) => {
  logger.info(`New client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Forward events from the coordinator to the UI
if (coordinator) {
  coordinator.on('new_opportunity', (data: any) => io.emit('new_opportunity', data));
  coordinator.on('portfolio_updated', (data: any) => io.emit('portfolio_updated', data));
  coordinator.on('risk_alert', (data: any) => io.emit('risk_alert', data));
  coordinator.on('agent_created', (data: any) => io.emit('agent_created', data));
  coordinator.on('agent_started', (data: any) => io.emit('agent_started', data));
  coordinator.on('agent_stopped', (data: any) => io.emit('agent_stopped', data));
  coordinator.on('swarm_created', (data: any) => io.emit('swarm_created', data));
  coordinator.on('swarm_started', (data: any) => io.emit('swarm_started', data));
  coordinator.on('swarm_stopped', (data: any) => io.emit('swarm_stopped', data));
}

// Agent Endpoints
app.get('/agents', async (_req, res) => {
  try {
    const agents = await coordinator.listAgents();
    res.json(agents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/agents', async (req, res) => {
  try {
    const { name, type, config } = req.body;
    const agent = await coordinator.createAgent(name, type, config);
    res.status(201).json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/agents/:id', async (req, res) => {
  try {
    const agent = await coordinator.getAgent(req.params.id);
    if (agent) {
      res.json(agent);
    } else {
      res.status(404).json({ error: 'Agent not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/agents/:id/start', async (req, res) => {
  try {
    const agent = await coordinator.startAgent(req.params.id);
    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/agents/:id/stop', async (req, res) => {
  try {
    const agent = await coordinator.stopAgent(req.params.id);
    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/agents/:id', async (req, res) => {
  try {
    const result = await coordinator.deleteAgent(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Swarm Endpoints
app.get('/swarms', async (_req, res) => {
  try {
    const swarms = await coordinator.listSwarms();
    res.json(swarms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/swarms', async (req, res) => {
  try {
    const { name, algorithm, config } = req.body;
    const swarm = await coordinator.createSwarm(name, algorithm, config);
    res.status(201).json(swarm);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/swarms/:id', async (req, res) => {
  try {
    const swarm = await coordinator.getSwarm(req.params.id);
    if (swarm) {
      res.json(swarm);
    } else {
      res.status(404).json({ error: 'Swarm not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/swarms/:id/start', async (req, res) => {
  try {
    const swarm = await coordinator.startSwarm(req.params.id);
    res.json(swarm);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/swarms/:id/stop', async (req, res) => {
  try {
    const swarm = await coordinator.stopSwarm(req.params.id);
    return res.json(swarm);
  } catch (error) {
    logger.error(`Error stopping swarm ${req.params.id}:`, error);
    return res.status(500).json({ error: 'Failed to stop swarm' });
  }
});

app.delete('/swarms/:id', async (req, res) => {
  try {
    const result = await coordinator.deleteSwarm(req.params.id);
    return res.json(result);
  } catch (error) {
    logger.error(`Error deleting swarm ${req.params.id}:`, error);
    return res.status(500).json({ error: 'Failed to delete swarm' });
  }
});

app.post('/swarms/:swarmId/add-agent/:agentId', async (req, res) => {
  try {
    const { swarmId, agentId } = req.params;
    const swarm = await coordinator.addAgentToSwarm(swarmId, agentId);
    return res.json(swarm);
  } catch (error) {
    logger.error(`Error adding agent ${req.params.agentId} to swarm ${req.params.swarmId}:`, error);
    return res.status(500).json({ error: 'Failed to add agent to swarm' });
  }
});

app.delete('/swarms/:swarmId/remove-agent/:agentId', async (req, res) => {
  try {
    const { swarmId, agentId } = req.params;
    const swarm = await coordinator.removeAgentFromSwarm(swarmId, agentId);
    return res.json(swarm);
  } catch (error) {
    logger.error(`Error removing agent ${req.params.agentId} from swarm ${req.params.swarmId}:`, error);
    return res.status(500).json({ error: 'Failed to remove agent from swarm' });
  }
});

// Start the server
httpServer.listen(port, () => {
  logger.info(`API server listening on port ${port}`);
  startAgentsAndSwarm();

  // Global error handling for agents and swarm
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception in API/Agents:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection in API/Agents at:', promise);
    logger.error('Reason:', reason);
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Shutting down API, agents, and swarm...');
    // Stop Node.js agent instances
    if (discoveryAgentInstance) await discoveryAgentInstance.shutdown();
    if (analysisAgentInstance) await analysisAgentInstance.shutdown();
    if (riskAgentInstance) await riskAgentInstance.shutdown();
    if (executionAgentInstance) await executionAgentInstance.shutdown();

    // Stop and delete default swarm (Julia-side)
    if (defaultSwarmJuliaId) {
      await coordinator.stopSwarm(defaultSwarmJuliaId);
      await coordinator.deleteSwarm(defaultSwarmJuliaId);
    }

    // Delete Julia-side agents
    if (discoveryAgentJuliaId) {
      await coordinator.deleteAgent(discoveryAgentJuliaId);
    }
    if (analysisAgentJuliaId) {
      await coordinator.deleteAgent(analysisAgentJuliaId);
    }
    if (riskAgentJuliaId) {
      await coordinator.deleteAgent(riskAgentJuliaId);
    }

    await coordinator.shutdown();
    process.exit(0);
  });
});

