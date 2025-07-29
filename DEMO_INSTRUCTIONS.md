# YieldSwarm Demo Instructions

This guide will walk you through a demo of YieldSwarm's capabilities, focusing on finding, analyzing, and simulating actions on yield farming opportunities across Solana, Ethereum, and Arbitrum.

**Important Note:** The current `ExecutionAgent` uses **mock implementations** for on-chain actions (swaps, liquidity provision, bridging). This means the system will *simulate* these actions without performing real transactions on the blockchain.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (LTS version recommended)
*   **Julia** (v1.8 or higher recommended)
*   **pnpm** (Node.js package manager)

## Setup

1.  **Navigate to the project root:**
    ```bash
    cd /home/skipp/Documents/projects/MCDYOS
    ```

2.  **Install Node.js dependencies:**
    ```bash
    pnpm install
    ```

3.  **Build the TypeScript project:**
    ```bash
    pnpm build
    ```

## Demo Steps

### Step 1: Start the Julia Backend

The Julia backend is crucial for the system's core AI and optimization logic. You need to run this in a **separate terminal window** and keep it running throughout the demo.

```bash
cd /home/skipp/Documents/projects/MCDYOS
julia backend/julia_server.jl
```

You should see output similar to: `Julia backend listening on 127.0.0.1:8052`

### Step 2: Start the YieldSwarm Main Process & API Server

Open a **new terminal window** for the main YieldSwarm process. This process will initialize the `SwarmCoordinator`, automatically create and start the default agents and swarm, and start the API server. This process will remain active.

```bash
cd /home/skipp/Documents/projects/MCDYOS
pnpm start:api
```

You should see logs indicating successful initialization of the `SwarmCoordinator` and the API server listening on port 3000.

### Step 3: Access the YieldSwarm Dashboard

Open your web browser and navigate to:

[http://localhost:3000/dashboard](http://localhost:3000/dashboard)

You should see the YieldSwarm Dashboard, which will connect to the backend and start displaying real-time data.

### Step 4: Observe Agent Activity

Now, you can observe the system in action through the dashboard:

*   **Agent & Swarm Management**: The tables will show the status of the default agents and swarm. You can use the buttons to stop and start them.
*   **Live Opportunity Feed**: The table will update in real-time as the `DiscoveryAgent` finds new yield opportunities.
*   **Portfolio Allocation**: The pie chart and table will update as the `AnalysisAgent` and Julia backend optimize the portfolio.
*   **System Logs & Risk Alerts**: The log panel will show important status messages and any risk alerts from the `RiskAgent`.

### Step 5: Stop the Demo

To stop the YieldSwarm system and agents:

1.  In the terminal where `pnpm start:api` is running, press `Ctrl+C`. This will gracefully shut down the Node.js processes, including stopping and deleting the agents and swarm on the Julia side.
2.  In the Julia backend terminal, press `Ctrl+C` to stop the Julia server.

---

This concludes the demo. You've seen how YieldSwarm can discover, analyze, and simulate acting on yield farming opportunities across multiple chains using its multi-agent architecture and Julia backend, all visualized through a real-time dashboard.
