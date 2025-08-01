# YieldSwarm Project Context

## 1. Project Overview

YieldSwarm is a multi-chain DeFi yield optimizer designed to identify and leverage the best yield opportunities across various blockchain networks. It utilizes a unique architecture combining agent and swarm intelligence, built specifically for the JuliaOS bounty. The system integrates a high-performance Julia backend for complex simulations and optimization tasks, orchestrated by a Node.js application that also provides a REST API and a web-based user interface.

**Key Components:**
*   **Julia Backend:** Handles core logic, agent/swarm management, and portfolio optimization.
*   **Node.js Backend:** Acts as an orchestration layer, providing a REST API, managing agent communication, and bridging to the Julia backend.
*   **Web UI (Dashboard):** A visual interface for users to interact with the system, create and manage agents/swarms, and monitor live data.
*   **Agents:** Autonomous entities (Discovery, Analysis, Risk, Execution) that perform specific tasks within the DeFi ecosystem.
*   **Swarms:** Collections of agents that collaborate to achieve complex goals, such as portfolio optimization.

## 2. Architecture and Data Flow

The YieldSwarm architecture is distributed and event-driven, with clear responsibilities for each component:

### 2.1. Component Breakdown

*   **Julia Backend (`backend/julia_server.jl`):
    *   A TCP server listening on `127.0.0.1:8052`.
    *   Manages the lifecycle of agents and swarms (creation, starting, stopping, deletion).
    *   Performs heavy computational tasks, notably portfolio optimization using the HiGHS solver.
    *   Includes Julia modules for `Agents`, `Swarms`, `PortfolioOptimizer`, `Storage`, and `Events`.
    *   Communicates with the Node.js backend via a custom JSON-RPC over TCP protocol.
    *   Persists agent and swarm data to `data/agents.json` and `data/swarms.json`.

*   **Node.js Backend (`dist/backend/api.js` - compiled from `backend/api.ts`):
    *   An Express.js server providing a REST API on port `3000`.
    *   Hosts the web dashboard static files (`dist/src/yieldswarm-ui`).
    *   Manages WebSocket connections (`socket.io`) for real-time communication with the UI.
    *   **`SwarmCoordinator` (`src/swarm/SwarmCoordinator.ts`):** The central orchestrator.
        *   Manages communication between Node.js agents and the Julia backend via `CustomJuliaBridge`.
        *   Handles agent and swarm lifecycle operations (list, create, get, start, stop, delete).
        *   Broadcasts messages (e.g., `YIELD_OPPORTUNITY`, `PORTFOLIO_UPDATE`, `RISK_ALERT`) to connected WebSocket clients (UI) and other internal agents.
    *   **`AgentOrchestrator` (`backend/AgentOrchestrator.ts`):** Handles direct interactions with the Julia backend for agent-specific commands.
    *   **`CustomJuliaBridge` (`backend/CustomJuliaBridge.ts`):** A custom TCP client that translates Node.js commands into JSON-RPC requests for the Julia server and parses Julia's responses/events.
    *   **Node.js Agents (`src/agents/*.ts`):
        *   **`DiscoveryAgent`:** Identifies yield opportunities (currently mock data). Broadcasts `YIELD_OPPORTUNITY` messages.
        *   **`AnalysisAgent`:** Receives `YIELD_OPPORTUNITY` messages, performs portfolio optimization (via Julia), and broadcasts `PORTFOLIO_UPDATE` messages.
        *   **`RiskAgent`:** Receives `PORTFOLIO_UPDATE` messages, assesses risk, and broadcasts `RISK_ALERT` messages.
        *   `ExecutionAgent` (planned/placeholder): For executing trades.

*   **Web UI (Dashboard - `src/yieldswarm-ui/`):
    *   A single-page application (`index.html`, `app.js`, `style.css`).
    *   Communicates with the Node.js API via REST for initial data loading (agents, swarms, algorithms) and command execution (create, start, stop, delete).
    *   Receives real-time updates (yield opportunities, portfolio allocations, risk alerts) via WebSockets.
    *   Displays data in sections: "Agent Management", "Swarm Management", "Live Opportunity Feed", "Portfolio Allocation", "Risk Alerts", and "System Logs".

### 2.2. Workflow (User Perspective)

1.  Start Julia server (`julia julia_server.jl`).
2.  Start Node.js API server (`pnpm start:api`).
3.  Access the dashboard in a web browser (`http://localhost:3000/dashboard`).
4.  Create three agents: a Discovery Agent, an Analysis Agent, and a Risk Agent.
5.  Create a Swarm and add the Analysis Agent to it.
6.  Start all created agents and the swarm.
7.  Observe the "Live Opportunity Feed" populate as the Discovery Agent finds opportunities.
8.  Observe the "Portfolio Allocation" section update as the Analysis Agent optimizes the portfolio.
9.  Observe the "Risk Alerts" section populate as the Risk Agent identifies potential risks.

## 3. Current Problems and Solutions Implemented

We've encountered and addressed several critical issues during development:

### 3.1. Resolved Issues

*   **Julia `MethodError` on Agent Creation:**
    *   **Problem:** The Julia `create_agent` function expected four positional arguments (`name`, `type`, `chain`, `config`), but the Node.js backend was sending them as a single dictionary (named parameters). This resulted in `MethodError(Main.Agents.create_agent, ("DiscoveryBob", "discovery", Dict{String, Any}()))`.
    *   **Solution:**
        1.  Modified `backend/julia_server.jl` to change the `agents.create_agent` handler to accept positional arguments (`params[1]`, `params[2]`, `params[3]`, `params[4]`).
        2.  Modified `backend/AgentOrchestrator.ts` to explicitly construct an array of parameters (`[name, type, chain || null, config]`) before sending to the `CustomJuliaBridge`.

*   **UI Not Loading ("Cannot GET /dashboard"):
    *   **Problem:** The `pnpm start:api` script was using `ts-node` to run `backend/api.ts` directly. This bypassed the `dist` directory, and the UI static assets (`src/yieldswarm-ui`) were not being copied to `dist` during the `tsc` build.
    *   **Solution:**
        1.  Changed the `start:api` script in `package.json` to `node dist/backend/api.js`, ensuring the compiled JavaScript is run.
        2.  Updated the `build` script in `package.json` to `tsc && cp -r src/yieldswarm-ui dist/src/yieldswarm-ui`, which copies the UI assets to the correct `dist` subdirectory after TypeScript compilation.

*   **UI Not Populating (Live Feed, Portfolio, Risk Alerts):
    *   **Problem 1 (Portfolio Infeasibility):** The Julia optimizer (`HiGHS`) reported `Model status: Infeasible` because the `AnalysisAgent` was sending a `risk_tolerance` of `0.3`, while all mock opportunities had a `risk_score` of `0.6`.
    *   **Solution 1:** Increased `riskTolerance` in `src/agents/AnalysisAgent.ts` to `0.7` to accommodate the mock data.
    *   **Problem 2 (Incorrect WebSocket Event Names):** The frontend (`src/yieldswarm-ui/app.js`) was listening for `yield_opportunity` and `risk_alert` (lowercase), but the backend was broadcasting `YIELD_OPPORTUNITY` and `RISK_ALERT` (uppercase).
    *   **Solution 2:** Corrected the event names in `src/yieldswarm-ui/app.js` to match the uppercase names from the backend.
    *   **Problem 3 (Infinite Feedback Loop):** The `AnalysisAgent` would optimize, send a `PORTFOLIO_UPDATE` to the `RiskAgent`. The `RiskAgent` would then generate a `RISK_ALERT` (e.g., "High cross-chain concentration risk"). The `AnalysisAgent` was configured to re-optimize upon receiving *any* `RISK_ALERT`, leading to an immediate re-optimization, another `PORTFOLIO_UPDATE`, another `RISK_ALERT`, and so on, in a rapid, endless loop. This overloaded the server and caused WebSocket disconnections, preventing UI updates.
    *   **Solution 3:**
        1.  **Debouncing in `AnalysisAgent`:** Implemented a debouncing mechanism in `src/agents/AnalysisAgent.ts`. When `YIELD_OPPORTUNITY` messages arrive or `RISK_ALERT`s are received, the `AnalysisAgent` now schedules an optimization with a 5-second delay, and only if one isn't already pending. This breaks the immediate feedback loop.
        2.  **Correct Broadcast in `AnalysisAgent`:** Ensured `AnalysisAgent` uses `this.client.broadcastMessage` for `PORTFOLIO_UPDATE` messages, sending them to all listeners (including the UI), rather than directly to the `RiskAgent`.
        3.  **`RiskAgent` Ignores Own Alerts:** Modified `src/agents/RiskAgent.ts` to explicitly ignore `RISK_ALERT` messages in its `onMessage` handler, preventing it from reacting to alerts it just broadcast.

*   **Excessive Logging:**
    *   **Problem:** Debug logs from both Node.js and Julia were too verbose for normal operation.
    *   **Solution:**
        1.  Added a `start:api:debug` script in `package.json` (`LOG_LEVEL=debug node dist/backend/api.js`) for verbose Node.js logs.
        2.  Modified `backend/julia_server.jl` to respect a `JULIA_LOG_LEVEL=debug` environment variable for verbose Julia logs.

## 4. Future Plans

*   **CLI Enhancements:** Further development of the command-line interface.
*   **Julia Backend Development:** Implementing real optimization algorithms and inter-agent communication within Julia.
*   **Advanced SwarmCoordinator Orchestration:** Event-driven orchestration with robust error recovery.
*   **External Data Sources:** Integration with real-world DeFi data sources.
*   **Visual CLI (HTML/CSS):** Development of a more interactive and visually rich command-line interface.
