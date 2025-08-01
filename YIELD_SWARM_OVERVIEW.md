# YieldSwarm: Project Overview, Current Status, and Next Steps

## 1. Project Mission

YieldSwarm is an intelligent multi-agent system designed to autonomously discover, analyze, and execute optimal yield farming strategies across multiple blockchain networks. It leverages a Julia backend for high-performance computation and a Node.js backend for orchestration and API services.

## 2. System Architecture

To start the application, you will need to run the Julia backend first, and then the Node.js backend.

1.  **Terminal 1 (Julia Backend):**
    ```bash
    julia backend/julia_server.jl
    ```
2.  **Terminal 2 (Node.js Backend):**
    ```bash
    pnpm start:api
    ```
3.  **Terminal 3 (Access UI):**
    Open your web browser and navigate to `http://localhost:3000/dashboard`.

The system consists of three main parts:

*   **Julia Backend (`backend/julia_server.jl`):** The computational core. It's a TCP server that manages Julia-side agents and swarms, performs portfolio optimization, and handles complex calculations. It communicates via a custom JSON-RPC protocol.
*   **Node.js Backend (`backend/api.ts`):** The orchestration layer. It's an Express.js server that provides a REST API for management, serves the UI, and acts as the bridge between the UI and the Julia backend.
*   **Frontend UI (`src/yieldswarm-ui/`):** A vanilla HTML/CSS/JS dashboard for visualizing data and interacting with the system in real-time.

### Ideal Data Flow:

1.  The **Julia Backend** is started.
2.  The **Node.js Backend** is started (`pnpm start:api`).
3.  The Node.js backend initializes the `SwarmCoordinator`, which connects to the Julia backend.
4.  Agents (Discovery, Analysis, Risk, Execution) are created and started **via the UI**.
5.  The `DiscoveryAgent` fetches (or mocks) real-world data from DEXes.
6.  It broadcasts these opportunities via the `SwarmCoordinator`.
7.  The `AnalysisAgent` receives these opportunities.
8.  It sends the opportunities to the **Julia Backend** for portfolio optimization.
9.  The Julia backend runs its optimization algorithms and returns the results.
10. The `AnalysisAgent` receives the optimized portfolio and broadcasts it.
11. The `RiskAgent` monitors the portfolio and broadcasts alerts.
12. The **Frontend UI** connects to the Node.js backend via REST (for initial data) and WebSockets (for live updates) and displays all this activity in real-time.

## 3. Accomplishments So Far

We have made significant progress in establishing the core architecture and addressing critical communication issues:

*   **Centralized Backend Startup:** The `backend/api.ts` is now the single entry point for launching the Node.js backend, handling server setup and WebSocket connections.
*   **Decoupled Agent/Swarm Lifecycle:** The automatic creation and starting of agents and swarms on backend startup has been removed. Their lifecycle (create, start, stop, delete) is now fully managed by the UI.
*   **Enhanced Agent/Swarm Management Endpoints:** The backend now correctly handles API requests from the UI for creating, starting, stopping, and deleting agents and swarms.
*   **Centralized `globalConfig`:** A `globalConfig` object has been introduced (`src/config/globalConfig.ts`) to manage application-wide settings like data mode (mock/real) and active chains. This object is now imported and used consistently across relevant backend components.
*   **Mock Data Integration:** The `RealDEXIntegrations` now correctly uses the `globalConfig.dataMode` to switch between real and mock data. The mock data generation has been enhanced to produce a more diverse set of opportunities.
*   **Improved Swarm Creation:** The UI's "Optimization Algorithm" dropdown has been corrected to reflect the Julia backend's supported "PortfolioOptimization" algorithm.
*   **Robust Error Logging:** Enhanced error logging has been added to critical backend routes to aid in debugging.
*   **UI Overhaul (Frontend):** A new, modern, and slick UI has been implemented with comprehensive features for:
    *   Agent and Swarm management (create, start, stop, delete).
    *   Global configuration (data mode toggle, active chain selection).
    *   Live opportunity feed, portfolio allocation, and risk alerts display.
    *   System logs.
    *   Theme toggling.
*   **Successful Builds:** The project consistently builds without TypeScript errors after numerous refactorings.

## 4. Current Struggles and Root Cause Analysis

Despite significant progress, we are facing a persistent issue with data visualization in the UI:

*   **Live Opportunity Feed Not Populating:**
    *   **Problem:** Even when a Discovery Agent is created and started in mock data mode, and backend logs confirm opportunities are being broadcasted by the `DiscoveryAgent` and re-emitted by the `SwarmCoordinator`, the "Live Opportunity Feed" in the UI remains empty.
    *   **Root Cause (Identified):** The WebSocket event name mismatch between the backend and frontend. The backend was emitting `'new_opportunity'`, but the frontend's `app.js` was listening for `'new_opportunity'`. This has been identified and a fix is being applied.
    *   **Current Status:** A fix has been implemented in `backend/api.ts` to emit the correct event name (`'yield_opportunity'`). We are awaiting confirmation from the user that this resolves the UI population issue.

## 5. Yet To Do / Next Steps

1.  **Verify UI Data Population:** Confirm that the fix for the WebSocket event name mismatch resolves the issue of the "Live Opportunity Feed" not populating. This is the immediate priority.
2.  **Implement Backend Configuration Action:** The `/config` endpoint currently only logs the received configuration. We need to implement the logic to actually apply these changes (e.g., dynamically re-initialize Discovery Agents with new chains or data modes without restarting the entire backend).
3.  **Implement Risk Alerts Backend:** The `/risk-alerts` endpoint currently returns an empty array. We need to implement the logic to fetch and return actual risk alerts.
4.  **Refine Agent/Swarm Creation Logic:**
    *   Ensure that when a Discovery Agent is created, it automatically uses the `globalConfig.activeChains` for its scanning.
    *   Further refine the `handleCreateSwarm` logic to correctly pass algorithm parameters to the Julia backend.
5.  **Implement Agent/Swarm Start/Stop/Delete Logic:** While the UI buttons are there, we need to ensure the backend correctly handles these requests for both Node.js and Julia-side agents/swarms.
6.  **Integrate Real-time Logs:** Implement the `log_message` WebSocket event to stream backend logs to the UI's "System Logs" panel.
7.  **Portfolio Optimization Data Flow:** Once opportunities are flowing, ensure the Analysis Agent correctly processes them, sends them to Julia, receives optimized portfolios, and broadcasts them to the UI.
8.  **Comprehensive Testing:** Conduct thorough end-to-end testing of all features.
9.  **Error Handling and User Feedback:** Enhance error handling and provide more informative feedback to the user in the UI.
10. **Further Julia Backend Development:** Real portfolio optimization, inter-agent communication within Julia.
11. **Advanced SwarmCoordinator Orchestration:** Event-driven orchestration, error recovery.
12. **Integration with External Data Sources:** Beyond basic DEX data.
13. **Visual CLI (HTML/CSS):** (Longer-term goal, already partially addressed by the new UI).