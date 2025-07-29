# YieldSwarm Project Context

This document provides a comprehensive overview of the YieldSwarm project, its architecture, intended functionality, and the challenges encountered during development.

## Project Overview

**Project Name:** YieldSwarm

**Core Mission:** To build an intelligent multi-agent system that autonomously discovers, analyzes, and executes optimal yield farming strategies across multiple blockchain networks. It leverages JuliaOS's swarm intelligence and AI capabilities.

**Bounty Context:** The project is being built for a JuliaOS bounty, which emphasizes the use of JuliaOS for AI-powered agents, swarm orchestration, and multi-chain deployment.

## Architecture

YieldSwarm employs a hybrid architecture consisting of:

1.  **Julia Backend:**
    *   **Purpose:** Handles computationally intensive tasks such as portfolio optimization, agent/swarm simulation, and complex data analysis.
    *   **Components:**
        *   `julia_server.jl`: A TCP server that acts as the main entry point for the Julia backend, dispatching commands to various Julia modules.
        *   `src/julia/agents.jl`: Manages Julia-side agent logic, including mock discovery, analysis, and trading.
        *   `src/julia/swarms.jl`: Manages Julia-side swarm logic, including portfolio optimization.
        *   `src/julia/portfolio_optimizer.jl`: Implements portfolio optimization algorithms (currently a simplified Modern Portfolio Theory model).
        *   `src/julia/events.jl`: A custom event system for inter-Julia module communication and emitting events to the Node.js layer.
        *   `src/julia/storage.jl`: Handles persistence of agent and swarm data to JSON files (`data/agents.json`, `data/swarms.json`).
    *   **Communication:** Communicates with the Node.js backend via a custom TCP-based JSON-RPC bridge.

2.  **Node.js Backend:**
    *   **Purpose:** Orchestrates the multi-agent system, provides a REST API, serves the UI, and acts as a bridge between the UI/external services and the Julia backend.
    *   **Components:**
        *   `backend/api.ts`: The main entry point for the Node.js application. It sets up the Express.js server for the REST API, the Socket.IO server for WebSocket communication, and orchestrates the Node.js agents and swarms.
        *   `backend/CustomJuliaBridge.ts`: Implements the client-side of the TCP bridge to communicate with the Julia backend. It also forwards events received from Julia to a global Node.js `eventBus`.
        *   `backend/AgentOrchestrator.ts`, `backend/SwarmOrchestrator.ts`: Abstractions for managing Julia-side agents and swarms via the `CustomJuliaBridge`.
        *   `src/swarm/SwarmCoordinator.ts`: A singleton class that acts as the central coordinator for the entire multi-agent system. It initializes the Julia bridge, manages Node.js agent instances, and serves as the central event emitter for the Node.js application.
        *   `src/agents/DiscoveryAgent.ts`: Discovers yield opportunities from DEXes.
        *   `src/agents/AnalysisAgent.ts`: Analyzes discovered opportunities and performs portfolio optimization (delegating to Julia).
        *   `src/agents/RiskAgent.ts`: Assesses risk and generates alerts.
        *   `src/agents/ExecutionAgent.ts`: Simulates execution of trades and liquidity operations.
        *   `src/defi/RealDEXIntegrations.ts`: Integrates with real-world DEX data sources (The Graph subgraphs, REST APIs).
        *   `src/defi/YieldCalculator.ts`: Orchestrates portfolio optimization by sending data to the Julia backend.
        *   `src/events/EventBus.ts`: A global Node.js event emitter for internal communication within the Node.js application.
        *   `src/utils/JuliaOSMock.ts`: Contains mock implementations for JuliaOS SDK components, used by agents for their internal logic.
    *   **Communication:**
        *   **REST API:** For UI to backend communication (e.g., listing agents, starting swarms).
        *   **WebSockets (Socket.IO):** For real-time, bidirectional communication between the backend and the UI (e.g., pushing new opportunities, risk alerts).

3.  **Frontend UI (Dashboard):**
    *   **Purpose:** Provides a visual interface to monitor and interact with the YieldSwarm system.
    *   **Technology:** Vanilla HTML, CSS, and JavaScript.
    *   **Location:** `src/yieldswarm-ui/`
    *   **Communication:** Uses `fetch()` for REST API calls and `socket.io-client` for WebSocket communication.

## How It's Supposed to Work (Ideal Flow)

1.  **Start Julia Backend:** `julia backend/julia_server.jl` (in Terminal 1).
2.  **Start Node.js Backend/API/Agents:** `pnpm start:api` (in Terminal 2).
    *   `backend/api.ts` initializes `SwarmCoordinator`.
    *   `SwarmCoordinator` connects to the Julia backend.
    *   `backend/api.ts` automatically creates and starts instances of `DiscoveryAgent`, `AnalysisAgent`, and `RiskAgent` (Node.js side).
    *   These Node.js agents communicate with the Julia backend to create corresponding Julia-side agents.
    *   A default swarm is created and started (Julia-side).
    *   The API server starts, serving the UI and listening for WebSocket connections.
3.  **Access UI:** Open `http://localhost:3000/dashboard` in a browser.
    *   The UI connects to the backend via REST API (for initial data) and WebSockets (for real-time updates).
4.  **Agent Activity:**
    *   The `DiscoveryAgent` (Node.js) periodically fetches real-world DEX data (e.g., from Solana).
    *   Discovered opportunities are broadcasted internally via the `SwarmCoordinator` (Node.js).
    *   The `AnalysisAgent` (Node.js) receives these opportunities, processes them, and sends relevant data to the Julia backend for portfolio optimization.
    *   The Julia backend performs optimization and sends results back to the Node.js `SwarmCoordinator`.
    *   The `RiskAgent` (Node.js) monitors portfolio data and generates risk alerts, broadcasting them via the `SwarmCoordinator`.
    *   The `ExecutionAgent` (Node.js) receives execution requests (simulated) and logs them.
5.  **Real-time UI Updates:** The UI receives real-time updates from the `SwarmCoordinator` (via WebSockets) and displays new opportunities, updated portfolio allocations, and risk alerts.

## Current Problems / Challenges

1.  **Event Handling Discrepancy (`TypeError: eventBus.on is not a function`):**
    *   **Problem:** The `backend/api.ts` file is attempting to subscribe to events on `(coordinator as any).getAgentCommunication()`, but the object returned by `getAgentCommunication()` (which is an `AgentCommunication` instance) does not have an `on` method that `api.ts` expects. This indicates a fundamental misunderstanding of how events are propagated.
    *   **Root Cause:** My previous attempts to make `SwarmCoordinator` extend `EventEmitter` and directly subscribe to `this.bridge.on` were incorrect. `CustomJuliaBridge` emits events to the global `eventBus` (from `../src/events/EventBus`), not directly to `SwarmCoordinator`.
    *   **Proposed Solution:** `SwarmCoordinator` should subscribe to the *global* `eventBus` and then re-emit those events, acting as the central event hub for the Node.js application. `ApiClient` and agents will then use `SwarmCoordinator` for their messaging.

2.  **Agent Initialization/Communication Flow:**
    *   **Problem:** The Node.js agents (Discovery, Analysis, Risk) are not effectively communicating with each other, leading to the Julia backend waiting for opportunities that never arrive.
    *   **Root Cause:** Agents were either creating their own `ApiClient` instances (leading to isolated communication channels) or the `ApiClient` was incorrectly configured to use `AgentCommunication` directly, rather than the central `SwarmCoordinator`.
    *   **Proposed Solution:** Ensure all Node.js agents receive and use a single, shared `ApiClient` instance, which in turn wraps the central `SwarmCoordinator` for all internal messaging.

3.  **The Graph Subgraph Issues (Arbitrum/Ethereum Uniswap V2):**
    *   **Problem:** Connectivity tests for some subgraphs (e.g., Uniswap V2 on Ethereum, Uniswap V3 on Arbitrum) are failing with "endpoint has been removed" or timeout errors.
    *   **Root Cause:** The specific subgraph URLs or the queries used for them might be outdated or incorrect.
    *   **Current Status:** We've attempted to update the Uniswap V2 Ethereum URL and increased timeouts, but the issue persists. We've decided to temporarily focus on Solana (which works) and address this later.

## Next Steps (Current Focus)

Our immediate focus is to resolve the event handling and agent communication issues to get the core system running and visible in the UI. This involves:

*   **Making `SwarmCoordinator` the definitive central event emitter.**
*   **Ensuring all Node.js agents correctly use this central `SwarmCoordinator` for all internal messaging.**
*   **Correctly configuring `ApiClient` to wrap `SwarmCoordinator` for agent communication.**

Once these are resolved, the UI should populate with live data, and the system will be fully operational for demonstration.
