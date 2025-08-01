import { IAgentCommunication } from '../swarm/SwarmCoordinator';
import { Logger } from '../utils/Logger';
import { ExecutionRequest, ExecutionType, AgentStatus, SwarmMessage, MessageType, MessagePriority } from '../types';
import { RealDEXIntegrations } from '../defi/RealDEXIntegrations';

interface ExecutionResult {
  success: boolean;
  txHash?: string;
  gasUsed?: number;
  gasPrice?: string;
  executionTime: number;
  error?: string;
  details?: any;
}

export class ExecutionAgent {
  private client: IAgentCommunication;
  private chain: string;
  private logger: Logger;
  private dexIntegrations: RealDEXIntegrations;
  private status: AgentStatus = AgentStatus.INACTIVE;
  private isRunning: boolean = false;
  private pendingExecutions: Map<string, ExecutionRequest> = new Map();
  private executionQueue: ExecutionRequest[] = [];

  constructor(chain: string, client: IAgentCommunication, globalConfig: any) {
    this.client = client;
    this.chain = chain;
    this.logger = new Logger(`ExecutionAgent-${chain}`);
    this.dexIntegrations = new RealDEXIntegrations(chain, globalConfig);
  }

  async start(): Promise<void> {
    this.logger.info(`Starting Execution Agent for ${this.chain}`);
    this.status = AgentStatus.STARTING;
    this.isRunning = true;

    try {
      // Initialize DEX integrations
      await this.dexIntegrations.initialize();
      
      // Start execution processing
      this.startExecutionProcessing();
      
      this.status = AgentStatus.ACTIVE;
      this.logger.success(`Execution Agent for ${this.chain} started successfully`);
    } catch (error) {
      this.status = AgentStatus.ERROR;
      this.logger.error(`Failed to start Execution Agent for ${this.chain}:`, error);
      throw error;
    }
  }

  private startExecutionProcessing(): void {
    // Process execution queue every 10 seconds
    setInterval(async () => {
      if (this.isRunning && this.executionQueue.length > 0) {
        await this.processExecutionQueue();
      }
    }, 10000);
  }

  async executeRequest(request: ExecutionRequest): Promise<void> {
    this.logger.info(`Received execution request: ${request.type} on ${request.chain}`);

    try {
      // Validate request
      if (!this.validateExecutionRequest(request)) {
        this.logger.error(`Invalid execution request: ${request.id}`);
        return;
      }

      // Add to execution queue
      this.executionQueue.push(request);
      this.pendingExecutions.set(request.id, request);

      this.logger.debug(`Added execution request ${request.id} to queue. Queue size: ${this.executionQueue.length}`);
    } catch (error) {
      this.logger.error(`Error processing execution request ${request.id}:`, error);
    }
  }

  private validateExecutionRequest(request: ExecutionRequest): boolean {
    // Basic validation
    if (!request.id || !request.type || !request.chain || !request.dex) {
      return false;
    }

    if (request.chain !== this.chain) {
      this.logger.warn(`Execution request for wrong chain: ${request.chain}, expected: ${this.chain}`);
      return false;
    }

    if (!Object.values(ExecutionType).includes(request.type)) {
      return false;
    }

    return true;
  }

  private async processExecutionQueue(): Promise<void> {
    if (this.executionQueue.length === 0) return;

    this.logger.debug(`Processing execution queue with ${this.executionQueue.length} requests`);

    // Sort by priority (highest first)
    this.executionQueue.sort((a, b) => b.priority - a.priority);

    const request = this.executionQueue.shift();
    if (!request) return;

    try {
      await this.executeRequestInternal(request);
    } catch (error) {
      this.logger.error(`Error executing request ${request.id}:`, error);
      
      // Retry logic for failed executions
      if (this.shouldRetry(request)) {
        this.executionQueue.push(request);
        this.logger.info(`Re-queued failed execution request ${request.id} for retry`);
      } else {
        this.logger.error(`Execution request ${request.id} failed permanently`);
        this.pendingExecutions.delete(request.id);
      }
    }
  }

  private async executeRequestInternal(request: ExecutionRequest): Promise<void> {
    this.logger.info(`Executing ${request.type} on ${request.dex} for ${request.amount} ${request.token0Symbol}/${request.token1Symbol}`);

    try {
      let result: any;

      switch (request.type) {
        case ExecutionType.ADD_LIQUIDITY:
          result = await this.executeLiquidityProvision(request);
          break;
        case ExecutionType.REMOVE_LIQUIDITY:
          result = await this.executeLiquidityRemoval(request);
          break;
        case ExecutionType.SWAP:
          result = await this.executeSwap(request);
          break;
        case ExecutionType.BRIDGE:
          result = await this.executeBridge(request);
          break;
        default:
          throw new Error(`Unsupported execution type: ${request.type}`);
      }

      // Log successful execution
      this.logger.success(`Successfully executed ${request.type}: ${result.txHash}`);
      
      // Remove from pending executions
      this.pendingExecutions.delete(request.id);

      // Broadcast execution result
      await this.broadcastExecutionResult(request, result);

    } catch (error) {
      this.logger.error(`Execution failed for request ${request.id}:`, error);
      throw error;
    }
  }

  private async executeLiquidityProvision(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      this.logger.info(`Providing liquidity on ${request.dex} for ${request.amount} ${request.token0Symbol}/${request.token1Symbol}`);

      // Mock implementation - in real implementation, this would:
      // 1. Calculate optimal liquidity amounts
      // 2. Approve tokens
      // 3. Add liquidity
      // 4. Monitor position

      const result: ExecutionResult = {
        success: true,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: 200000,
        gasPrice: '20000000000',
        executionTime: Date.now() - request.timestamp,
        details: {
          type: 'liquidity_provision',
          dex: request.dex,
          pool: request.token0 + '/' + request.token1,
          amount: request.amount
        }
      };

      this.logger.success(`Liquidity provision executed successfully: ${result.txHash}`);
      return result;

    } catch (error) {
      this.logger.error('Liquidity provision failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - request.timestamp
      };
    }
  }

  private async executeLiquidityRemoval(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      this.logger.info(`Removing liquidity from ${request.dex} for ${request.amount} ${request.token0Symbol}/${request.token1Symbol}`);

      // Mock implementation
      const result: ExecutionResult = {
        success: true,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: 150000,
        gasPrice: '20000000000',
        executionTime: Date.now() - request.timestamp,
        details: {
          type: 'liquidity_removal',
          dex: request.dex,
          pool: request.token0 + '/' + request.token1,
          amount: request.amount
        }
      };

      this.logger.success(`Liquidity removal executed successfully: ${result.txHash}`);
      return result;

    } catch (error) {
      this.logger.error('Liquidity removal failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - request.timestamp
      };
    }
  }

  private async executeSwap(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      this.logger.info(`Executing swap on ${request.dex}: ${request.amount} ${request.token0Symbol} -> ${request.token1Symbol}`);

      // Mock implementation
      const result: ExecutionResult = {
        success: true,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: 150000,
        gasPrice: '20000000000',
        executionTime: Date.now() - request.timestamp,
        details: {
          type: 'swap',
          dex: request.dex,
          fromToken: request.token0,
          toToken: request.token1,
          amount: request.amount
        }
      };

      this.logger.success(`Swap executed successfully: ${result.txHash}`);
      return result;

    } catch (error) {
      this.logger.error('Swap failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - request.timestamp
      };
    }
  }

  private async executeBridge(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      this.logger.info(`Bridging ${request.amount} ${request.token0Symbol} from ${this.chain} to ${request.metadata['toChain']}`);

      // Mock implementation
      const result: ExecutionResult = {
        success: true,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: 300000,
        gasPrice: '20000000000',
        executionTime: Date.now() - request.timestamp,
        details: {
          type: 'bridge',
          fromChain: this.chain,
          toChain: request.metadata['toChain'],
          token: request.token0,
          amount: request.amount
        }
      };

      this.logger.success(`Bridge executed successfully: ${result.txHash}`);
      return result;

    } catch (error) {
      this.logger.error('Bridge failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - request.timestamp
      };
    }
  }

  private shouldRetry(request: ExecutionRequest): boolean {
    // Simple retry logic - in practice you'd track retry counts
    const retryCount = request.metadata['retryCount'] || 0;
    return retryCount < 3;
  }

  private async broadcastExecutionResult(request: ExecutionRequest, result: any): Promise<void> {
    const message: SwarmMessage = {
      id: `execution-result-${request.id}`,
      type: MessageType.EXECUTION_REQUEST,
      source: `${this.chain}-execution`,
      data: {
        requestId: request.id,
        success: true,
        txHash: result.txHash,
        gasUsed: result.gasUsed,
        executionTime: Date.now() - request.timestamp,
        metadata: result
      },
      timestamp: Date.now(),
      priority: MessagePriority.NORMAL
    };

    await this.client.emit(MessageType.EXECUTION_REQUEST, message);
  }

  async onMessage(message: SwarmMessage): Promise<void> {
    this.logger.debug(`Received message: ${message.type}`);

    switch (message.type) {
      case MessageType.EXECUTION_REQUEST:
        await this.executeRequest(message.data);
        break;
      default:
        this.logger.debug(`Unhandled message type: ${message.type}`);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info(`Shutting down Execution Agent for ${this.chain}`);
    this.isRunning = false;
    this.status = AgentStatus.INACTIVE;

    // Wait for pending executions to complete
    while (this.executionQueue.length > 0) {
      this.logger.info(`Waiting for ${this.executionQueue.length} pending executions to complete...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    await this.dexIntegrations.shutdown();
    this.logger.success(`Execution Agent for ${this.chain} shutdown completed`);
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getQueueSize(): number {
    return this.executionQueue.length;
  }

  getPendingExecutions(): number {
    return this.pendingExecutions.size;
  }

  getExecutionStats(): any {
    return {
      queueSize: this.executionQueue.length,
      pendingExecutions: this.pendingExecutions.size,
      chain: this.chain,
      status: this.status
    };
  }
}