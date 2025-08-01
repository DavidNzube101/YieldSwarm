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
