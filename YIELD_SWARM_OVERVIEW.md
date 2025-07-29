# YieldSwarm: Project Overview, Status, and Recovery Plan

## 1. Project Mission

YieldSwarm is an intelligent multi-agent system designed to autonomously discover, analyze, and execute optimal yield farming strategies across multiple blockchain networks. It leverages a Julia backend for high-performance computation and a Node.js backend for orchestration and API services.

## 2. System Architecture (Intended)

The system consists of three main parts:

*   **Julia Backend (`backend/julia_server.jl`):** The computational core. It's a TCP server that manages Julia-side agents and swarms, performs portfolio optimization, and handles complex calculations. It communicates via a custom JSON-RPC protocol.
*   **Node.js Backend (`backend/api.ts`):** The orchestration layer. It's an Express.js server that provides a REST API for management, serves the UI, and runs the Node.js agent instances (`DiscoveryAgent`, `AnalysisAgent`, `RiskAgent`). It acts as the bridge between the UI and the Julia backend.
*   **Frontend UI (`src/yieldswarm-ui/`):** A vanilla HTML/CSS/JS dashboard for visualizing data and interacting with the system in real-time.

### Ideal Data Flow:

1.  The **Julia Backend** is started.
2.  The **Node.js Backend** is started (`pnpm start:api`).
3.  The Node.js backend initializes the `SwarmCoordinator`, which connects to the Julia backend.
4.  The Node.js backend instantiates and starts the Node.js agents (`DiscoveryAgent`, `AnalysisAgent`, `RiskAgent`).
5.  The `DiscoveryAgent` (Node.js) fetches real-world data from DEXes (e.g., Solana's Raydium).
6.  It **broadcasts** these opportunities to other Node.js agents.
7.  The `AnalysisAgent` (Node.js) receives these opportunities.
8.  It sends the opportunities to the **Julia Backend** for portfolio optimization.
9.  The Julia backend runs its optimization algorithms and returns the results.
10. The `AnalysisAgent` receives the optimized portfolio and broadcasts it.
11. The `RiskAgent` monitors the portfolio and broadcasts alerts.
12. The **Frontend UI** connects to the Node.js backend via REST (for initial data) and WebSockets (for live updates) and displays all this activity in real-time.

## 3. Current Problems & Root Cause Analysis

The system is currently failing to execute the ideal data flow. The UI is blank because the backend agents are not running and communicating correctly.

**Primary Issue: Broken Inter-Agent Communication & Orchestration**

*   **Problem:** The `DiscoveryAgent` finds opportunities, but the `AnalysisAgent` never receives them. The Julia backend remains idle because it never gets any data to analyze.
*   **Root Cause:** The Node.js agents (`DiscoveryAgent`, `AnalysisAgent`, etc.) are not communicating with each other. My previous attempts to fix this created a tangled mess of incorrect dependencies and event handling. The core mistake was creating separate communication channels for each agent instead of a single, central hub. The logic to start the agents was also in the wrong place (`src/index.ts` instead of `backend/api.ts`), leading to the "dormant terminal" issue.

**Secondary Issue: Unreliable Subgraph Endpoints**

*   **Problem:** The system fails to fetch data from Ethereum and Arbitrum.
*   **Root Cause:** The public The Graph API endpoints used for some DEXes (like Uniswap V2 on Ethereum) are deprecated or unreliable, causing connection errors and timeouts.

## 4. The New Strategy: A Clear and Robust Fix

To fix this, we will consolidate the backend logic and implement a proper, centralized event-driven architecture.

**Step 1: Centralize Orchestration in `backend/api.ts`**
The `pnpm start:api` command will be the **single command** to launch the entire backend. The `backend/api.ts` file will be responsible for:
*   Starting the Express API server.
*   Starting the WebSocket server.
*   Initializing the `SwarmCoordinator`.
*   **Creating and starting the Node.js instances of `DiscoveryAgent`, `AnalysisAgent`, and `RiskAgent`.**

**Step 2: Fix Inter-Agent Communication with a Central Event Hub**
*   The `SwarmCoordinator` will be the single, authoritative event emitter for the entire Node.js application.
*   When the `DiscoveryAgent` finds an opportunity, it will not "broadcast" it directly. Instead, it will call a method on the `SwarmCoordinator` (e.g., `coordinator.publishOpportunity(opportunity)`).
*   The `SwarmCoordinator` will then `emit` a `new_opportunity` event.
*   The `AnalysisAgent` will listen for this `new_opportunity` event *directly on the `SwarmCoordinator` instance*.
*   This ensures a clean, decoupled, and reliable flow of information between agents.

**Step 3: Implement the Plan**
I will now execute the necessary code modifications to implement this new strategy. This will involve refactoring `backend/api.ts`, `src/swarm/SwarmCoordinator.ts`, and the individual agent files (`src/agents/*.ts`).

**Step 4: Test and Verify**
Once the refactoring is complete and the project is rebuilt, running `pnpm start:api` should launch the fully functional system. The UI at `http://localhost:3000/dashboard` will then display the live data from the running agents, as originally intended.
