import { Logger } from '../utils/Logger';
import { SwarmMessage, MessageType, MessagePriority } from '../types';

type MessageHandler = (message: SwarmMessage) => Promise<void>;

import { EventEmitter } from 'events';

export class AgentCommunication {
  private handlers: Map<string, MessageHandler> = new Map();
  private messageQueue: SwarmMessage[] = [];
  private isProcessing: boolean = false;
  private logger: Logger;
  private eventEmitter: EventEmitter;

  constructor() {
    this.logger = new Logger('AgentCommunication');
    this.eventEmitter = new EventEmitter();
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.eventEmitter.on(event, listener);
    return this;
  }

  registerHandler(agentId: string, handler: MessageHandler): void {
    this.handlers.set(agentId, handler);
    this.logger.info(`Registered message handler for agent: ${agentId}`);
  }

  unregisterHandler(agentId: string): void {
    this.handlers.delete(agentId);
    this.logger.info(`Unregistered message handler for agent: ${agentId}`);
  }

  async sendMessage(message: SwarmMessage): Promise<void> {
    this.logger.debug(`Sending message: ${message.type} to ${message.target || 'broadcast'}`);
    
    // Add message to queue
    this.messageQueue.push(message);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processMessageQueue();
    }
  }

  async broadcast(message: SwarmMessage): Promise<void> {
    this.logger.debug(`Broadcasting message: ${message.type}`);
    this.eventEmitter.emit(message.type, message.data);
    await this.sendMessage(message);
  }

  async broadcastMessage(type: MessageType, data: any, source: string, priority: MessagePriority = MessagePriority.NORMAL): Promise<void> {
    const message: SwarmMessage = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      source,
      data,
      timestamp: Date.now(),
      priority
    };

    await this.sendMessage(message);
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Sort messages by priority (highest first)
      this.messageQueue.sort((a, b) => b.priority - a.priority);

      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          await this.routeMessage(message);
        }
      }
    } catch (error) {
      this.logger.error('Error processing message queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async routeMessage(message: SwarmMessage): Promise<void> {
    try {
      if (message.target) {
        // Direct message to specific agent
        const handler = this.handlers.get(message.target);
        if (handler) {
          await handler(message);
        } else {
          this.logger.warn(`No handler found for target agent: ${message.target}`);
        }
      } else {
        // Broadcast message to all agents
        for (const [agentId, handler] of this.handlers) {
          try {
            await handler(message);
          } catch (error) {
            this.logger.error(`Error handling message in agent ${agentId}:`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error routing message:', error);
    }
  }

  async sendToAgent(agentId: string, type: MessageType, data: any, source: string, priority: MessagePriority = MessagePriority.NORMAL): Promise<void> {
    const message: SwarmMessage = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      source,
      target: agentId,
      data,
      timestamp: Date.now(),
      priority
    };

    await this.sendMessage(message);
    this.eventEmitter.emit(type, message);
  }

  getRegisteredAgents(): string[] {
    return Array.from(this.handlers.keys());
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  clearQueue(): void {
    this.messageQueue = [];
    this.logger.info('Message queue cleared');
  }
} 