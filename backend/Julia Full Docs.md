# API Reference

This reference documents the key APIs for JuliaOS, including Node.js, Julia, and Python interfaces.

## Node.js/TypeScript API

### Julia Bridge

The Julia Bridge provides a communication channel between Node.js and the Julia backend.

```typescript
import { JuliaBridge } from './packages/julia-bridge';

// Initialize
const juliaBridge = new JuliaBridge({
  host: 'localhost',
  port: 8052
});

// Connect
const connected = await juliaBridge.connect();

// Run a Julia command
const result = await juliaBridge.runJuliaCommand('agents.list_agents', {});
```

### Agent Manager

```typescript
import { AgentManager } from './packages/framework/agents';

// Initialize
const agentManager = new AgentManager(juliaBridge);

// Create an agent
const agent = await agentManager.createAgent({
  name: 'trading_agent',
  type: 'Trading',
  skills: ['price_analysis'],
  chains: ['Ethereum'],
  config: { risk_tolerance: 0.5 }
});

// Get agent status
const status = await agentManager.getAgentStatus(agent.id);

// Start agent
await agentManager.startAgent(agent.id);

// Stop agent
await agentManager.stopAgent(agent.id);

// Delete agent
await agentManager.deleteAgent(agent.id);
```

### Swarm Manager

```typescript
import { SwarmManager } from './packages/framework/swarms';

// Initialize
const swarmManager = new SwarmManager(juliaBridge);

// Create a swarm
const swarm = await swarmManager.createSwarm({
  name: 'trading_swarm',
  algorithm: 'PSO',
  objective: 'maximize_profit',
  config: { particles: 50 }
});

// Add agent to swarm
await swarmManager.addAgentToSwarm(swarm.id, agent.id);

// Start swarm
await swarmManager.startSwarm(swarm.id);

// Stop swarm
await swarmManager.stopSwarm(swarm.id);

// Delete swarm
await swarmManager.deleteSwarm(swarm.id);
```

### Wallet Manager

```typescript
import { WalletManager } from './packages/wallets';

// Initialize
const walletManager = new WalletManager();

// Connect
await walletManager.connect();

// Get address
const address = await walletManager.getAddress();

// Send transaction
const tx = await walletManager.sendTransaction({
  to: '0x...',
  value: ethers.parseEther('1.0')
});
```

## Python API

### JuliaOS Client

```python
from juliaos import JuliaOS

# Initialize
juliaos = JuliaOS(host='localhost', port=8052)

# Connect
await juliaos.connect()
```

### Agent API

```python
# Create an agent
agent = await juliaos.create_agent(
    name="trading_agent",
    specialization="trading",
    skills=["price_analysis"]
)

# Start the agent
await agent.start()

# Execute a task
result = await agent.execute_task("analyze_market", data=market_data)

# Stop the agent
await agent.stop()
```

### Swarm API

```python
# Create a swarm
swarm = await juliaos.create_swarm(
    algorithm="differential_evolution",
    population_size=50,
    dimensions=10,
    bounds=(-10, 10)
)

# Define an objective function
def sphere(x):
    return sum(xi**2 for xi in x)

# Run optimization
result = await swarm.optimize(
    objective=sphere,
    iterations=100,
    minimize=True
)
```

### Wallet API

```python
# Connect a wallet
wallet = await juliaos.connect_wallet(
    type="ethereum",
    private_key=os.environ.get("ETH_PRIVATE_KEY")
)

# Get balance
balance = await wallet.get_balance()

# Send transaction
tx = await wallet.send_transaction(
    to="0x...",
    amount="1.0",
    token="ETH"
)
```

## Julia API

Julia APIs are exposed via the command handler in the Julia backend:

```julia
# Example Julia code (not directly callable from outside)
function create_agent(name::String, agent_type::String, config::Dict)
    # Agent creation logic
end

function start_agent(agent_id::String)
    # Agent start logic
end

function create_swarm(name::String, algorithm::String, config::Dict)
    # Swarm creation logic
end

function start_swarm(swarm_id::String)
    # Swarm start logic
end
```

## Command Reference

These commands can be called via the Julia Bridge:

| Category | Command                     | Description         | Parameters                    |
| -------- | --------------------------- | ------------------- | ----------------------------- |
| Agents   | `agents.list_agents`        | List all agents     | None                          |
| Agents   | `agents.create_agent`       | Create a new agent  | `name`, `type`, `config`      |
| Agents   | `agents.get_agent`          | Get agent details   | `id`                          |
| Agents   | `agents.start_agent`        | Start an agent      | `id`                          |
| Agents   | `agents.stop_agent`         | Stop an agent       | `id`                          |
| Agents   | `agents.delete_agent`       | Delete an agent     | `id`                          |
| Swarms   | `swarms.list_swarms`        | List all swarms     | None                          |
| Swarms   | `swarms.create_swarm`       | Create a new swarm  | `name`, `algorithm`, `config` |
| Swarms   | `swarms.get_swarm`          | Get swarm details   | `id`                          |
| Swarms   | `swarms.start_swarm`        | Start a swarm       | `id`                          |
| Swarms   | `swarms.stop_swarm`         | Stop a swarm        | `id`                          |
| Swarms   | `swarms.delete_swarm`       | Delete a swarm      | `id`                          |
| Wallets  | `wallets.connect_wallet`    | Connect a wallet    | `address`, `chain`            |
| Wallets  | `wallets.disconnect_wallet` | Disconnect a wallet | `address`                     |
| Wallets  | `wallets.get_balance`       | Get wallet balance  | `address`                     |
| System   | `system.get_status`         | Get system status   | None                          |
| System   | `system.get_metrics`        | Get system metrics  | None                          |

## Event Reference

JuliaOS components emit various events that can be listened to:

| Category | Event                 | Description         | Data                      |
| -------- | --------------------- | ------------------- | ------------------------- |
| Agents   | `agent:created`       | Agent created       | `{ id, name, type }`      |
| Agents   | `agent:started`       | Agent started       | `{ id }`                  |
| Agents   | `agent:stopped`       | Agent stopped       | `{ id }`                  |
| Swarms   | `swarm:created`       | Swarm created       | `{ id, name, algorithm }` |
| Swarms   | `swarm:started`       | Swarm started       | `{ id }`                  |
| Swarms   | `swarm:stopped`       | Swarm stopped       | `{ id }`                  |
| Wallets  | `wallet:connected`    | Wallet connected    | `{ address, chain }`      |
| Wallets  | `wallet:disconnected` | Wallet disconnected | `{ address }`             |
| System   | `system:started`      | System started      | `{ timestamp }`           |
| System   | `system:stopped`      | System stopped      | `{ timestamp }`           |

# API Reference: Julia Backend Commands

This page lists the commands processed by the Julia backend server, typically invoked via the Node.js or Python bridge.

_(Note: This list is based on inferred functionality and previous documentation. The exact command names, parameters, and return values should be verified against the command handler logic in `/julia/julia_server.jl` and the relevant Julia modules in `/julia/src/`)_

## Command Format

Commands are typically sent as JSON objects with a `command` field (e.g., `"agents.create_agent"`) and a `payload` field containing parameters.

```json
{
  "command": "category.action",
  "payload": { "param1": "value1", "param2": 123 }
}
```

## Agent Commands

| Command                | Description                           | Payload Parameters                                | Example Payload                                                   | Return Value                  |
| ---------------------- | ------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------- |
| `agents.create_agent`  | Create a new agent                    | `name` (String), `type` (String), `config` (Dict) | `{"name": "MyAgent", "type": "Trading", "config": {"risk": 0.5}}` | Agent ID or Agent object      |
| `agents.list_agents`   | List all managed agents               | None                                              | `{}`                                                              | Array of Agent objects or IDs |
| `agents.get_agent`     | Retrieve details for a specific agent | `id` (String)                                     | `{"id": "agent-uuid-123"}`                                        | Agent object                  |
| `agents.start_agent`   | Start a specific agent                | `id` (String)                                     | `{"id": "agent-uuid-123"}`                                        | Status confirmation           |
| `agents.stop_agent`    | Stop a specific agent                 | `id` (String)                                     | `{"id": "agent-uuid-123"}`                                        | Status confirmation           |
| `agents.delete_agent`  | Delete a specific agent               | `id` (String)                                     | `{"id": "agent-uuid-123"}`                                        | Status confirmation           |
| `agents.update_config` | Update configuration for an agent     | `id` (String), `config` (Dict)                    | `{"id": "agent-uuid-123", "config": {"risk": 0.6}}`               | Status confirmation           |

## Swarm Commands

| Command               | Description                              | Payload Parameters                                   | Example Payload                                                                                | Return Value                  |
| --------------------- | ---------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------- |
| `swarms.create_swarm` | Create a new swarm                       | `name` (String), `algorithm` (Dict), `config` (Dict) | `{"name": "MySwarm", "algorithm": {"type":"PSO", "params":{...}}, "config": {"pairs": [...]}}` | Swarm ID or Swarm object      |
| `swarms.list_swarms`  | List all managed swarms                  | None                                                 | `{}`                                                                                           | Array of Swarm objects or IDs |
| `swarms.get_swarm`    | Retrieve details for a specific swarm    | `id` (String)                                        | `{"id": "swarm-uuid-456"}`                                                                     | Swarm object                  |
| `swarms.start_swarm`  | Start optimization/operation for a swarm | `id` (String)                                        | `{"id": "swarm-uuid-456"}`                                                                     | Status confirmation           |
| `swarms.stop_swarm`   | Stop a specific swarm                    | `id` (String)                                        | `{"id": "swarm-uuid-456"}`                                                                     | Status confirmation           |
| `swarms.delete_swarm` | Delete a specific swarm                  | `id` (String)                                        | `{"id": "swarm-uuid-456"}`                                                                     | Status confirmation           |
| `swarms.add_agent`    | Add an agent to a swarm                  | `swarm_id` (String), `agent_id` (String)             | `{"swarm_id": "swarm-456", "agent_id": "agent-123"}`                                           | Status confirmation           |
| `swarms.remove_agent` | Remove an agent from a swarm             | `swarm_id` (String), `agent_id` (String)             | `{"swarm_id": "swarm-456", "agent_id": "agent-123"}`                                           | Status confirmation           |

## Wallet Commands (Backend - Use with Caution)

| Command                   | Description                                             | Payload Parameters             | Example Payload           | Return Value |
| ------------------------- | ------------------------------------------------------- | ------------------------------ | ------------------------- | ------------ |
| `wallets.get_wallets`     | List backend-managed wallets                            | None                           | `{}`                      | Mock List    |
| `wallets.get_wallet_info` | Get info for a backend wallet                           | `wallet_id` (String)           | `{"wallet_id":"wallet1"}` | Mock Info    |
| `wallets.create_wallet`   | Create new backend wallet (**INSECURE if keys stored**) | `name` (String)                | `{"name":"AgentWallet"}`  | Mock Wallet  |
| `wallets.import_wallet`   | Import backend wallet (**INSECURE**)                    | `name`, `private_key`, `chain` | `{...}`                   | Mock Wallet  |
| `wallets.export_wallet`   | Export backend wallet key (**INSECURE**)                | `wallet_id`, `chain`           | `{...}`                   | Mock Key     |

## Bridge / Blockchain / DEX Commands

| Command                            | Description                     | Payload Parameters                                                                                            | Example Payload                          | Return Value              |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------- |
| `bridge.get_token_address`         | Resolve token symbol to address | `symbol` (String), `chain` (String)                                                                           | `{"symbol":"WETH", "chain":"ethereum"}`  | Address Dict or Error     |
| `blockchain.get_balance`           | Get native/token balance        | `address`, `chain`, `token_address` (opt)                                                                     | `{"address":"0x...", "chain":"base"}`    | Balance Dict or Error     |
| `dex.get_swap_quote`               | Get quote for a DEX swap        | `token_in`, `token_out`, `amount_in_wei`, `dex_name`, `chain`                                                 | `{...}`                                  | Quote Dict or Error       |
| `bridge.execute_trade`             | **Prepare** unsigned swap TX    | `dex`, `chain`, `trade_params` (Dict: `token_in`, `token_out`, `amount_in_wei`, `slippage`, `wallet_address`) | `{...}`                                  | Unsigned TX Dict or Error |
| `bridge.submit_signed_transaction` | Submit client-signed TX         | `chain`, `request_id`, `signed_tx_hex`                                                                        | `{...}`                                  | Submission Result Dict    |
| `bridge.get_transaction_status`    | Check submitted TX status       | `chain`, `tx_hash`                                                                                            | `{"chain":"polygon", "tx_hash":"0x..."}` | Status Dict or Error      |
| `bridges.[protocol].transfer`      | Initiate cross-chain transfer   | Varies by protocol                                                                                            | `{...}`                                  | Transfer ID/Tx Hash       |
| `bridges.[protocol].getStatus`     | Check cross-chain status        | `transferId`                                                                                                  | `{...}`                                  | Status string             |

## System Commands

| Command              | Description               | Payload Parameters | Example Payload | Return Value   |
| -------------------- | ------------------------- | ------------------ | --------------- | -------------- |
| `system.get_status`  | Get overall system status | None               | `{}`            | Status object  |
| `system.get_metrics` | Get performance metrics   | None               | `{}`            | Metrics object |
| `system.ping`        | Basic health check        | None               | `{}`            | `"pong"`       |

# API Reference: CLI Commands

This page details the commands available through the interactive CLI (`node scripts/interactive.cjs`).

_(Note: This is based on inferred functionality from READMEs and code snippets. Actual commands and parameters might vary slightly. Refer to the CLI source code in `/packages/cli/src` for definitive details.)_

## Main Menu Structure

The CLI presents a menu-driven interface. Key top-level options typically include:

* `👤 Agent Management`
* `🐝 Swarm Management`
* `💼 Wallet Management`
* `🔗 Cross-Chain Operations`
* `📊 Market Data`
* `⚙️ System Configuration`

## Agent Management Commands

Accessed via `👤 Agent Management` menu:

* **Create Agent**: Prompts for agent name, type, and JSON configuration.
  * _Backend Call_: `agents.create_agent`
* **List Agents**: Displays a list of existing agents.
  * _Backend Call_: `agents.list_agents`
* **View Agent Status**: Shows details and status for a specific agent ID.
  * _Backend Call_: `agents.get_agent` (or similar)
* **Start Agent**: Starts a specific agent ID.
  * _Backend Call_: `agents.start_agent`
* **Stop Agent**: Stops a specific agent ID.
  * _Backend Call_: `agents.stop_agent`
* **Delete Agent**: Deletes a specific agent ID.
  * _Backend Call_: `agents.delete_agent`

## Swarm Management Commands

Accessed via `🐝 Swarm Management` menu:

* **Create Swarm**: Prompts for swarm name, algorithm, and JSON configuration.
  * _Backend Call_: `swarms.create_swarm`
* **List Swarms**: Displays a list of existing swarms.
  * _Backend Call_: `swarms.list_swarms`
* **View Swarm Status**: Shows details and status for a specific swarm ID.
  * _Backend Call_: `swarms.get_swarm` (or similar)
* **Start Swarm**: Starts a specific swarm ID.
  * _Backend Call_: `swarms.start_swarm`
* **Stop Swarm**: Stops a specific swarm ID.
  * _Backend Call_: `swarms.stop_swarm`
* **Delete Swarm**: Deletes a specific swarm ID.
  * _Backend Call_: `swarms.delete_swarm`
* **Add Agent to Swarm**: Associates an agent ID with a swarm ID.
  * _Backend Call_: `swarms.add_agent` (or similar)
* **Remove Agent from Swarm**: Disassociates an agent ID from a swarm ID.
  * _Backend Call_: `swarms.remove_agent` (or similar)

## Wallet Management Commands

Accessed via `💼 Wallet Management` menu:

* **Connect Wallet**: Prompts to select wallet type and guides through connection (usually via browser extension).
* **Disconnect Wallet**: Disconnects the currently connected wallet.
* **View Wallet Balance**: Shows the balance of the connected wallet.
* **Send Transaction**: Prompts for recipient, amount, token, and chain, then initiates the transaction (requires confirmation in wallet).

## Cross-Chain Operations Commands

Accessed via `🔗 Cross-Chain Operations` menu:

* **Initiate Cross-Chain Transfer**: Guides through selecting source/target chains, token, amount, and recipient address.
  * _Backend Call_: Varies depending on the selected bridge (e.g., `bridges.relay.transfer`, `bridges.wormhole.transfer`).
* **Check Transfer Status**: Prompts for a transaction ID to check the status of an ongoing cross-chain transfer.
  * _Backend Call_: Varies (e.g., `bridges.relay.getStatus`, `bridges.wormhole.getStatus`).

## Market Data Commands

Accessed via `📊 Market Data` menu:

* **View Price Data**: Prompts for a token pair to view current market price (likely fetched via backend integration like Chainlink).
  * _Backend Call_: `marketdata.get_price` (or similar).

## System Configuration Commands

Accessed via `⚙️ System Configuration` menu:

* **View System Status**: Shows the connection status to the backend and potentially other system health indicators.
  * _Backend Call_: `system.get_status`.
* **View System Metrics**: Displays performance metrics from the backend.
  * _Backend Call_: `system.get_metrics`.

# API Reference: Node.js API

This page details the programmatic API for Node.js/TypeScript users, primarily focusing on the `@juliaos/framework`, `@juliaos/bridges`, and `@juliaos/wallets` packages.

_(Note: Assumes hypothetical package names like `@juliaos/framework`. Replace with actual package names and refer to source code for definitive signatures and types.)_

## Julia Bridge (`@juliaos/julia-bridge` - Assumed)

Provides the core communication channel.

```typescript
import { JuliaBridge } from '@juliaos/julia-bridge';

// Initialize
const juliaBridge = new JuliaBridge({ host: 'localhost', port: 8052 });

// Connect
await juliaBridge.connect();

// Run Command
async runJuliaCommand(command: string, payload: any): Promise<any>;
// Example:
// const agents = await juliaBridge.runJuliaCommand('agents.list_agents', {});
```

## Framework API (`@juliaos/framework` - Assumed)

### `AgentManager`

```typescript
import { AgentManager } from '@juliaos/framework/agents'; // Path might vary
const agentManager = new AgentManager(juliaBridge);

// --- Methods --- 

// Creates an agent via the backend.
// config: { name: string; type: string; config: Record<string, any>; capabilities?: string[]; networks?: string[]; ... }
async createAgent(config: AgentConfig): Promise<AgentInfo>;

// Lists agents known to the backend.
async listAgents(): Promise<AgentInfo[]>;

// Gets status details for a specific agent.
async getAgentStatus(agentId: string): Promise<AgentStatus>;

// Starts the agent's main loop on the backend.
async startAgent(agentId: string): Promise<void>;

// Stops the agent's main loop.
async stopAgent(agentId: string): Promise<void>;

// Deletes the agent from the backend.
async deleteAgent(agentId: string): Promise<void>;
```

_(Types like `AgentConfig`, `AgentInfo`, `AgentStatus` would be defined within the package)_

### `SwarmManager`

```typescript
import { SwarmManager } from '@juliaos/framework/swarms'; // Path might vary
const swarmManager = new SwarmManager(juliaBridge);

// --- Methods --- 

// Creates a swarm.
// config: { name: string; algorithm: { type: string; params: any }; config: Record<string, any>; ... }
async createSwarm(config: SwarmConfig): Promise<SwarmInfo>;

// Lists swarms.
async listSwarms(): Promise<SwarmInfo[]>;

// Gets status for a specific swarm.
async getSwarmStatus(swarmId: string): Promise<SwarmStatus>;

// Starts the swarm's operation/optimization loop.
async startSwarm(swarmId: string): Promise<void>;

// Stops the swarm's loop.
async stopSwarm(swarmId: string): Promise<void>;

// Deletes the swarm.
async deleteSwarm(swarmId: string): Promise<void>;

// Adds a registered agent to a swarm.
async addAgentToSwarm(swarmId: string, agentId: string): Promise<void>;

// Removes an agent from a swarm.
async removeAgentFromSwarm(swarmId: string, agentId: string): Promise<void>;
```

_(Types like `SwarmConfig`, `SwarmInfo`, `SwarmStatus` would be defined within the package)_

## Bridges API (`@juliaos/bridges` - Assumed)

### `RelayBridge`

```typescript
import { RelayBridge } from '@juliaos/bridges/relay';
const relayBridge = new RelayBridge(/* options */);

// Methods
async transfer(params: RelayTransferParams): Promise<{ transactionId: string }>;
async getStatus(transactionId: string): Promise<string>; 
```

_(Type `RelayTransferParams` likely includes fromChain, toChain, token, amount, fromAddress, toAddress)_

### `WormholeBridge`

```typescript
import { WormholeBridge } from '@juliaos/bridges/wormhole';
const wormholeBridge = new WormholeBridge(/* options */);

// Methods
async transfer(params: WormholeTransferParams): Promise<{ transactionId: string; sequence: string }>;
async getVAA(transactionId: string, sequence: string, sourceChain: string): Promise<Uint8Array>; // VAA is typically bytes
async completeTransfer(vaaBytes: Uint8Array, targetChainSigner: ethers.Signer): Promise<ethers.ContractReceipt>; 
async getStatus(vaaBytes: Uint8Array): Promise<string>; // e.g., 'pending', 'completed', 'redeemed'
```

_(Type `WormholeTransferParams` similar to Relay. Requires signer for completion.)_

## Wallets API (`@juliaos/wallets`)

Provides a unified interface for interacting with user browser wallets.

### `WalletManager`

```typescript
import { WalletManager, WalletError } from '@juliaos/wallets';
import { ethers } from 'ethers'; // Example dependency for types

const walletManager = new WalletManager();

// --- Methods --- 

// Connects to user's browser wallet (Metamask, Phantom, etc.)
async connect(walletType?: 'metamask' | 'phantom' | 'rabby'): Promise<void>;

// Disconnects the wallet connection.
async disconnect(): Promise<void>;

// Gets the connected account address.
async getAddress(): Promise<string>;

// Gets the connected chain ID.
async getChainId(): Promise<number>;

// Gets native or ERC20 token balance.
async getBalance(tokenAddress?: string): Promise<string>; // Returns formatted string

// Sends a standard EVM transaction request, returns response.
async sendTransaction(tx: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionResponse>;

// Signs a message.
async signMessage(message: string | ethers.utils.Bytes): Promise<string>; // Returns signature hex

// Prompts user to switch network in wallet.
async switchNetwork(chainId: number): Promise<void>;

// --- Events --- 

walletManager.on('connect', (details: { address: string; chainId: number }) => { /* ... */ });
walletManager.on('disconnect', () => { /* ... */ });
walletManager.on('chainChanged', (chainId: number) => { /* ... */ });
walletManager.on('accountsChanged', (accounts: string[]) => { /* ... */ });
```

_(Refer to the actual source code in `/packages/wallets/src` for precise method signatures, event payloads, and exported types/interfaces)_

# API Reference: Python API

This page details the programmatic API provided by the JuliaOS Python wrapper (`pip install juliaos`).

_(Note: This is based on the wrapper's README. Exact method signatures, parameters, and return types should be confirmed by inspecting the wrapper's source code in `/packages/python-wrapper/juliaos/` and potentially using type hints or `help()`)_

## `JuliaOS` Client

The main entry point for interacting with the JuliaOS backend.

```python
from juliaos import JuliaOS
import asyncio

async def main():
    # Using async context manager (recommended)
    async with JuliaOS(host='localhost', port=8052) as client:
        print("Connected to JuliaOS backend!")

        # Use other methods...
        agents = await client.list_agents()
        print(f"Found {len(agents)} agents.")
    # Connection is automatically closed when exiting the context

# Or using manual connection management
async def alternative():
    client = JuliaOS(host='localhost', port=8052)
    await client.connect()
    print("Connected to JuliaOS backend!")

    # Use other methods...
    agents = await client.list_agents()
    print(f"Found {len(agents)} agents.")

    await client.disconnect()

# asyncio.run(main())
```

**Key Methods:**

* `__init__(host: str = 'localhost', port: int = 8052, api_key: Optional[str] = None, auto_connect: bool = False)`: Initializes the client.
* `connect()`: Establishes connection to the backend.
* `disconnect()`: Closes the connection.
* `__aenter__()`, `__aexit__()`: Async context manager support for cleaner code.
* `create_agent(name: str, agent_type: str, config: dict) -> Agent`: Creates a new agent.
* `list_agents() -> List[AgentInfo]`: Lists existing agents.
* `get_agent(agent_id: str) -> Agent`: Retrieves an agent instance by ID.
* `create_swarm(algorithm: str | dict, config: dict, **kwargs) -> Swarm`: Creates a new swarm (algorithm can be string type or dict with type/params).
* `list_swarms() -> List[SwarmInfo]`: Lists existing swarms.
* `get_swarm(swarm_id: str) -> Swarm`: Retrieves a swarm instance by ID.
* `connect_wallet(type: str, **kwargs) -> Wallet`: Connects a wallet (details depend on type - likely limited in Python).
* `get_chain(chain_name: str) -> Chain`: Gets an interface for chain operations.
* `get_dex(dex_name: str) -> DEX`: Gets an interface for DEX operations.

## `Agent` Class

Represents a single agent instance.

```python
# Assuming 'agent' is an instance obtained from client.get_agent() or client.create_agent()

await agent.start()
status = await agent.get_status()
result = await agent.execute_task("specific_task_name", data={...})
await agent.stop()
```

**Key Methods:**

* `start()`: Starts the agent's operation.
* `stop()`: Stops the agent.
* `get_status() -> dict`: Retrieves the current status and state.
* `execute_task(task_name: str, data: dict) -> dict`: Sends a task to the agent.
* `update_config(config: dict)`: Updates the agent's configuration.
* `add_skill(...)`, `remove_skill(...)`: Manage agent skills (if implemented).

## `Swarm` Class

Represents a swarm instance.

```python
# Assuming 'swarm' is an instance obtained from client.get_swarm() or client.create_swarm()

await swarm.start()
status = await swarm.get_status()
await swarm.add_agent(agent_id)

# For optimization swarms:
def objective_func(x):
    return sum(xi**2 for xi in x)

opt_result = await swarm.optimize(
    objective=objective_func,
    iterations=100,
    minimize=True
)
print(opt_result.best_solution, opt_result.best_fitness)

await swarm.stop()
```

**Key Methods:**

* `start()`: Starts the swarm's operation/optimization.
* `stop()`: Stops the swarm.
* `get_status() -> dict`: Retrieves swarm status.
* `add_agent(agent_id: str)`: Adds an agent to the swarm.
* `remove_agent(agent_id: str)`: Removes an agent.
* `optimize(objective: Callable, iterations: int, minimize: bool = True, **kwargs) -> OptimizationResult`: Runs the swarm optimization algorithm.

## Swarm Algorithms

The Python wrapper provides direct access to various swarm optimization algorithms:

```python
from juliaos import JuliaOS
from juliaos.swarms import (
    DifferentialEvolution, ParticleSwarmOptimization,
    GreyWolfOptimizer, AntColonyOptimization,
    GeneticAlgorithm, WhaleOptimizationAlgorithm,
    HybridDEPSO
)

async def main():
    async with JuliaOS() as juliaos:
        # Create algorithm instance
        de = DifferentialEvolution(juliaos.bridge)

        # Define objective function
        def sphere(x):
            return sum(xi**2 for xi in x)

        # Define bounds
        bounds = [(-5.0, 5.0), (-5.0, 5.0)]

        # Run optimization
        result = await de.optimize(
            objective_function=sphere,
            bounds=bounds,
            config={
                "population_size": 30,
                "max_generations": 100
            }
        )

        print(f"Best fitness: {result['best_fitness']}")
        print(f"Best position: {result['best_position']}")
```

## NumPy Integration

The Python wrapper provides seamless integration with NumPy for scientific computing and optimization:

```python
import numpy as np
from juliaos import JuliaOS
from juliaos.swarms import DifferentialEvolution

# Define objective function using NumPy
def rastrigin(x: np.ndarray) -> float:
    return 10 * len(x) + np.sum(x**2 - 10 * np.cos(2 * np.pi * x))

async def main():
    async with JuliaOS() as juliaos:
        # Create algorithm instance
        de = DifferentialEvolution(juliaos.bridge)

        # Define bounds as NumPy array
        bounds = np.array([[-5.12, 5.12]] * 5)  # 5-dimensional problem

        # Run optimization
        result = await de.optimize(
            objective_function=rastrigin,
            bounds=bounds,
            config={
                "population_size": 30,
                "max_generations": 100
            }
        )

        # Access result with NumPy arrays
        best_position = result['best_position_np']  # NumPy array
        best_fitness = result['best_fitness']

        print(f"Best position: {best_position}")
        print(f"Best fitness: {best_fitness}")
```

**NumPy Utilities:**

* `numpy_objective_wrapper(func: Callable) -> Callable`: Wraps a NumPy-based objective function.
* `numpy_bounds_converter(bounds: Union[List[Tuple[float, float]], np.ndarray]) -> List[Tuple[float, float]]`: Converts NumPy-style bounds.
* `numpy_result_converter(result: Dict[str, Any]) -> Dict[str, Any]`: Converts results to include NumPy arrays.

## `Wallet` Class

Represents a connected wallet (likely limited functionality compared to JS WalletManager).

```python
# Assuming 'wallet' is an instance from client.connect_wallet()

balance = await wallet.get_balance()
tx_receipt = await wallet.send_transaction(to='0x...', amount='0.1', token='ETH')
signature = await wallet.sign_message("Hello JuliaOS")
```

**Key Methods (Likely):**

* `get_balance(token: str = None) -> str`: Gets native or token balance.
* `send_transaction(to: str, amount: str, token: str = None, **kwargs) -> TransactionReceipt`: Sends transaction (requires backend key management or external signer integration).
* `sign_message(message: str) -> str`: Signs message (requires backend key management or external signer integration).

## LangChain Integration

Provides tools and wrappers for LangChain.

* **`JuliaOSAgentAdapter`**: Adapts a JuliaOS `Agent` for use as a LangChain agent.
* **Tools** (e.g., `SwarmOptimizationTool`, `BlockchainQueryTool`): Allow LangChain agents to use JuliaOS capabilities.
* **Memory** (e.g., `JuliaOSConversationBufferMemory`): Use JuliaOS storage for LangChain memory.
* **Chains** (e.g., `SwarmOptimizationChain`): Pre-built chains using JuliaOS components.
* **Retrievers** (e.g., `JuliaOSVectorStoreRetriever`): Use JuliaOS storage for retrieval.

See LangChain Integration Guide (or dedicated page) for details.


# API Reference

This section provides detailed API references for the different ways to interact with JuliaOS.

## Sections

* CLI Commands: Reference for the interactive CLI commands.
* Julia Backend Commands: Commands processed by the Julia backend (callable via the bridge).
* Node.js/TS API: Programmatic API for Node.js/TypeScript users (Framework, Bridges, Wallets).
* Python API: Programmatic API for Python users (Python Wrapper).
