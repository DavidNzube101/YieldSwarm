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
import { MessageType } from '../src/types';
import { RiskService } from './RiskService';

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
const riskService = RiskService.getInstance();

const discoveryAgents = new Map<string, DiscoveryAgent>();
let analysisAgent: AnalysisAgent | undefined;
let riskAgent: RiskAgent | undefined;
let executionAgentInstance: ExecutionAgent | undefined;

import { globalConfig } from '../src/config/globalConfig';

app.use(cors());
app.use(express.json());

// Serve the UI
app.use('/dashboard', express.static(path.join(__dirname, '../src/yieldswarm-ui')));

// Serve Socket.IO client locally
app.use('/socket.io', express.static(path.join(__dirname, '../socket.io/client-dist')));

// POST /config
// Description: Updates the global configuration, including data mode and active chains.
// Reconfigures and shuts down discovery agents based on active chains.
app.post('/config', async (req, res) => {
  try {
    const { dataMode, activeChains } = req.body;
    globalConfig.dataMode = dataMode;
    globalConfig.activeChains = activeChains;
    logger.info(`Updated global configuration: Data Mode = ${globalConfig.dataMode}, Active Chains = ${globalConfig.activeChains.join(', ')}`);

    // Reconfigure active discovery agents
    for (const [chain, agent] of discoveryAgents.entries()) {
      if (activeChains.includes(chain)) {
        logger.info(`Reconfiguring Discovery Agent for ${chain}...`);
        await agent.reconfigure(globalConfig);
      } else {
        // If a chain is no longer active, shut down its agent
        logger.info(`Shutting down Discovery Agent for inactive chain ${chain}...`);
        await agent.shutdown();
        discoveryAgents.delete(chain);
      }
    }

    return res.json({ success: true, message: 'Configuration applied and agents reconfigured' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// WebSocket connection
// Description: Handles WebSocket connections and disconnections, logging client activity.
io.on('connection', (socket: any) => {
  logger.info(`New client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Forward events from the coordinator to the UI
// Description: Listens for various events from the SwarmCoordinator and emits them to connected WebSocket clients.
if (coordinator) {
  // Only listen to SwarmCoordinator for Julia-based events (swarm_optimized -> portfolio_update)
  coordinator.on(MessageType.PORTFOLIO_UPDATE, (message: any) => {
    logger.info(`API: Forwarding PORTFOLIO_UPDATE from SwarmCoordinator to WebSocket clients`);
    io.emit(MessageType.PORTFOLIO_UPDATE, message.data);
  });
  
  // Agent lifecycle events
  coordinator.on('agent_created', (data: any) => io.emit('agent_created', data));
  coordinator.on('agent_started', (data: any) => io.emit('agent_started', data));
  coordinator.on('agent_stopped', (data: any) => io.emit('agent_stopped', data));
  coordinator.on('swarm_created', (data: any) => io.emit('swarm_created', data));
  coordinator.on('swarm_started', (data: any) => io.emit('swarm_started', data));
  coordinator.on('swarm_stopped', (data: any) => io.emit('swarm_stopped', data));

  // Listen to events from AgentCommunication (where agents broadcast their messages)
  const agentCommunication = coordinator.getAgentCommunication();
  if (agentCommunication) {
    agentCommunication.on(MessageType.YIELD_OPPORTUNITY, (message: any): void => {
      logger.info(`API: Forwarding YIELD_OPPORTUNITY from AgentCommunication to WebSocket clients`);
      io.emit(MessageType.YIELD_OPPORTUNITY, message.data);
    });
    agentCommunication.on(MessageType.PORTFOLIO_UPDATE, (message: any) => {
      logger.info(`API: Forwarding PORTFOLIO_UPDATE from AgentCommunication to WebSocket clients`);
      io.emit(MessageType.PORTFOLIO_UPDATE, message.data);
    });
    agentCommunication.on(MessageType.RISK_ALERT, (message: any) => {
      logger.info(`API: Forwarding RISK_ALERT from AgentCommunication to WebSocket clients`);
      io.emit(MessageType.RISK_ALERT, message.data);
    });
  }

  // Debug: Log all events being emitted to WebSocket clients
const originalEmit = io.emit;
io.emit = function(event, ...args) {
  logger.info(`DEBUG: Emitting WebSocket event '${event}' with data:`, JSON.stringify(args[0]));
  
  // Additional debug for portfolio_update specifically
  if (event === 'portfolio_update') {
    logger.info(`DEBUG: portfolio_update event details - Connected clients: ${io.sockets.sockets.size}`);
    logger.info(`DEBUG: portfolio_update data structure:`, JSON.stringify(args[0], null, 2));
  }
  
  return originalEmit.call(this, event, ...args);
};


}

// POST /mock-opportunities
// Description: Allows users to broadcast mock yield opportunities to the system.
app.post('/mock-opportunities', async (req, res) => {
  try {
    const opportunities = req.body; // Expecting an array of YieldOpportunity
    if (!Array.isArray(opportunities)) {
      return res.status(400).json({ error: 'Request body must be an array of yield opportunities.' });
    }

    logger.info(`Received ${opportunities.length} mock opportunities.`);

    for (const opp of opportunities) {
      // Assuming the mock opportunity directly matches the SwarmMessage data structure
      // In a real scenario, you might need to transform it.
      coordinator.broadcastMessage(MessageType.YIELD_OPPORTUNITY, opp, 'mock-data-source');
    }

    return res.json({ success: true, message: `Broadcasted ${opportunities.length} mock opportunities.` });
  } catch (error: any) {
    logger.error('Error processing mock opportunities:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /agents
// Description: Retrieves a list of all agents managed by the SwarmCoordinator.
app.get('/agents', async (_req, res) => {
  try {
    const agents = await coordinator.listAgents();
    return res.json(agents);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /agents
// Description: Creates a new agent (Discovery, Analysis, Risk, or Execution).
// For Discovery agents, it creates one for each active chain.
app.post('/agents', async (req, res) => {
  try {
    const { name, type, chain, config } = req.body;
    logger.info(`Received request to create agent: ${name}, type: ${type}, chain: ${chain}`);
    const agentCommunication = coordinator.getAgentCommunication();

    // For discovery agents, we might have specific logic, but the creation call is the same
    const juliaAgent = await coordinator.createAgent({ name, type, chain, config });

    if (type === 'discovery' && chain) {
      const discoveryAgent = new DiscoveryAgent(chain, agentCommunication, globalConfig);
      await discoveryAgent.start();
      discoveryAgents.set(chain, discoveryAgent);
    } else {
      let nodeAgentInstance: AnalysisAgent | RiskAgent | ExecutionAgent | undefined;
      switch (type) {
        case 'analysis':
          nodeAgentInstance = new AnalysisAgent(agentCommunication);
          analysisAgent = nodeAgentInstance;
          agentCommunication.registerHandler('analysis-agent', nodeAgentInstance.onMessage.bind(nodeAgentInstance));
          break;
        case 'risk':
          nodeAgentInstance = new RiskAgent(agentCommunication);
          riskAgent = nodeAgentInstance;
          agentCommunication.registerHandler('risk-agent', nodeAgentInstance.onMessage.bind(nodeAgentInstance));
          break;
        case 'execution':
           if (!chain) throw new Error('Execution agent requires a chain.');
          nodeAgentInstance = new ExecutionAgent(chain, agentCommunication, globalConfig);
          executionAgentInstance = nodeAgentInstance;
          agentCommunication.registerHandler('execution-agent', nodeAgentInstance.onMessage.bind(nodeAgentInstance));
          break;
      }
       if (nodeAgentInstance) {
        await nodeAgentInstance.start();
      }
    }

    return res.status(201).json(juliaAgent);
  } catch (error: any) {
    logger.error('Error creating agent:', error);
    if (error instanceof Error) {
      logger.error('Stack trace:', error.stack);
    }
    return res.status(500).json({ error: error.message });
  }
});

// GET /agents/:id
// Description: Retrieves a specific agent by its ID.
app.get('/agents/:id', async (req, res) => {
  try {
    const agent = await coordinator.getAgent(req.params.id);
    if (agent) {
      return res.json(agent);
    } else {
      return res.status(404).json({ error: 'Agent not found' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /agents/:id/start
// Description: Starts a specific agent by its ID.
app.post('/agents/:id/start', async (req, res) => {
  try {
    const agent = await coordinator.startAgent(req.params.id);
    return res.json(agent);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /agents/:id
// Description: Deletes a specific agent by its ID.
app.delete('/agents/:id', async (req, res) => {
  try {
    const result = await coordinator.deleteAgent(req.params.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /risk-alerts
// Description: Retrieves a list of all risk alerts.
app.get('/risk-alerts', async (_req, res) => {
  try {
    const alerts = riskService.getAlerts();
    return res.json(alerts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /swarms
// Description: Retrieves a list of all swarms managed by the SwarmCoordinator.
app.get('/swarms', async (_req, res) => {
  try {
    const swarms = await coordinator.listSwarms();
    return res.json(swarms);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /swarms
// Description: Creates a new swarm.
app.post('/swarms', async (req, res) => {
  try {
    const { name, algorithm, agents, config } = req.body;
    const swarm = await coordinator.createSwarm(name, algorithm, config);

    if (agents && agents.length > 0) {
      for (const agentId of agents) {
        await coordinator.addAgentToSwarm(swarm.id, agentId);
      }
    }
    return res.status(201).json(swarm);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /swarms/:id
// Description: Retrieves a specific swarm by its ID.
app.get('/swarms/:id', async (req, res) => {
  try {
    const swarm = await coordinator.getSwarm(req.params.id);
    if (swarm) {
      return res.json(swarm);
    } else {
      return res.status(404).json({ error: 'Swarm not found' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /swarms/:id/start
// Description: Starts a specific swarm by its ID.
app.post('/swarms/:id/start', async (req, res) => {
  try {
    const swarm = await coordinator.startSwarm(req.params.id);
    return res.json(swarm);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /swarms/:id/stop
// Description: Stops a specific swarm by its ID.
app.post('/swarms/:id/stop', async (req, res) => {
  try {
    const swarm = await coordinator.stopSwarm(req.params.id);
    return res.json(swarm);
  } catch (error) {
    logger.error(`Error stopping swarm ${req.params.id}:`, error);
    return res.status(500).json({ error: 'Failed to stop swarm' });
  }
});

// DELETE /swarms/:id
// Description: Deletes a specific swarm by its ID.
app.delete('/swarms/:id', async (req, res) => {
  try {
    const result = await coordinator.deleteSwarm(req.params.id);
    return res.json(result);
  } catch (error) {
    logger.error(`Error deleting swarm ${req.params.id}:`, error);
    return res.status(500).json({ error: 'Failed to delete swarm' });
  }
});

// POST /swarms/:swarmId/add-agent/:agentId
// Description: Adds an agent to a specific swarm.
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

// DELETE /swarms/:swarmId/remove-agent/:agentId
// Description: Removes an agent from a specific swarm.
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

// Algorithms Endpoint
app.get('/algorithms', async (_req, res) => {
  try {
    const algorithms = await coordinator.getAvailableAlgorithms();
    return res.json(algorithms);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Start the server
// Description: Initializes the API server and sets up global error handling and graceful shutdown procedures.
httpServer.listen(port, () => {
  logger.info(`API server listening on port ${port}`);

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
    for (const agent of discoveryAgents.values()) {
      await agent.shutdown();
    }
    if (analysisAgent) await analysisAgent.shutdown();
    if (riskAgent) await riskAgent.shutdown();
    if (executionAgentInstance) await executionAgentInstance.shutdown();

    await coordinator.shutdown();
    process.exit(0);
  });
});