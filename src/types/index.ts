// Chain and Network Types
export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  nativeToken: string;
  decimals: number;
  explorer: string;
  dexes: string[];
  bridges: string[];
  gasToken: string;
}

export interface DEXConfig {
  name: string;
  chain: string;
  factory: string;
  router: string;
  quoter?: string;
  api: string;
  version: string;
  feeTiers: number[];
}

// Yield Opportunity Types
export interface Pool {
  id: string;
  address?: string; // Add optional address field
  token0: {
    id: string;
    symbol: string;
    decimals: number;
  };
  token1: {
    id: string;
    symbol: string;
    decimals: number;
  };
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  volumeUSD: string;
  feeTier?: number;
  token0Symbol?: string; // Add for backward compatibility
  token1Symbol?: string; // Add for backward compatibility
}

export interface YieldOpportunity {
  id: string;
  chain: string;
  dex: string;
  pool: string;
  poolAddress?: string; // Add optional pool address
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  apy: number;
  tvl: number;
  volume24h: number;
  fee: number;
  riskScore: number;
}

export interface PortfolioAllocation {
  opportunityId: string;
  allocation: number; // Percentage (0-1)
  expectedYield: number;
  riskScore: number;
  chain: string;
}

// Agent Types
export interface Agent {
  id: string;
  type: AgentType;
  chain?: string;
  status: AgentStatus;
  lastHeartbeat: number;
  metadata: Record<string, any>;
}

export enum AgentType {
  DISCOVERY = 'discovery',
  ANALYSIS = 'analysis',
  EXECUTION = 'execution',
  RISK_MANAGEMENT = 'risk_management'
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  STARTING = 'starting'
}

// Swarm Communication Types
export interface SwarmMessage {
  id: string;
  type: MessageType;
  source: string;
  target?: string;
  data: any;
  timestamp: number;
  priority: MessagePriority;
}

export enum MessageType {
  YIELD_OPPORTUNITY = 'yield_opportunity',
  PORTFOLIO_UPDATE = 'portfolio_update',
  RISK_ALERT = 'risk_alert',
  EXECUTION_REQUEST = 'execution_request',
  HEARTBEAT = 'heartbeat',
  SHUTDOWN = 'shutdown',
  AGENT_CREATED = 'agent_created',
  AGENT_STARTED = 'agent_started',
  AGENT_STOPPED = 'agent_stopped',
  SWARM_CREATED = 'swarm_created',
  SWARM_STARTED = 'swarm_started',
  SWARM_STOPPED = 'swarm_stopped',
}

export enum MessagePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

// Risk Management Types
export interface RiskMetrics {
  totalRisk: number;
  impermanentLossRisk: number;
  smartContractRisk: number;
  liquidityRisk: number;
  volatilityRisk: number;
  correlationRisk: number;
}

export interface RiskAlert {
  id: string;
  type: RiskAlertType;
  severity: RiskSeverity;
  message: string;
  affectedOpportunities: string[];
  timestamp: number;
  recommendations: string[];
}

export enum RiskAlertType {
  HIGH_IMPERMANENT_LOSS = 'high_impermanent_loss',
  LOW_LIQUIDITY = 'low_liquidity',
  SMART_CONTRACT_RISK = 'smart_contract_risk',
  HIGH_VOLATILITY = 'high_volatility',
  CROSS_CHAIN_RISK = 'cross_chain_risk'
}

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Execution Types
export interface ExecutionRequest {
  id: string;
  type: ExecutionType;
  chain: string;
  dex: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  amount: string;
  slippage: number;
  gasPrice?: string;
  priority: MessagePriority;
  metadata: Record<string, any>;
  timestamp: number;
}

export enum ExecutionType {
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  SWAP = 'swap',
  BRIDGE = 'bridge'
}

// Configuration Types
export interface AppConfig {
  chains: Record<string, ChainConfig>;
  dexes: Record<string, DEXConfig>;
  riskTolerance: number; // 0-1
  maxAllocationPerOpportunity: number; // 0-1
  minApyThreshold: number;
  maxRiskScore: number;
  rebalancingInterval: number; // seconds
  heartbeatInterval: number; // seconds
}

// Utility Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
} 