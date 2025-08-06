import { Logger } from '../src/utils/Logger';
import * as net from 'net';
import { v4 as uuidv4 } from 'uuid';
import eventBus from '../src/events/EventBus';

export class CustomJuliaBridge {
  private host: string;
  private port: number;
  private client: net.Socket | null = null;
  private responses: Map<string, (data: any) => void> = new Map();
  private logger: Logger;

  constructor({ host = '127.0.0.1', port = 8052 } = {}) {
    this.host = host;
    this.port = port;
    this.logger = new Logger('CustomJuliaBridge');
  }

  /**
   * Establishes a connection to the Julia TCP server.
   * @param retries The number of times to retry the connection if it fails.
   * @param delay The delay in milliseconds between retries.
   */
  public async connect(retries: number = 5, delay: number = 1000): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        return await new Promise((resolve, reject) => {
          this.client = net.createConnection({ host: this.host, port: this.port }, () => {
            resolve();
          });

          this.client.on('data', (data) => {
            const responses = data.toString().split('\n').filter(s => s);
            responses.forEach(responseStr => {
              const response = JSON.parse(responseStr);
              // Check if it's a command response or an event
              if (response.id) {
                // It's a command response
                if (this.responses.has(response.id)) {
                  const callback = this.responses.get(response.id)!;
                  callback(response);
                  this.responses.delete(response.id);
                }
              } else if (response.event) {
                // It's an event from Julia
                eventBus.emit(response.event, response.data);
              }
            });
          });

          this.client.on('end', () => {
            
          });

          this.client.on('error', (err: NodeJS.ErrnoException) => {
            // Only reject if it's the last retry or a fatal error
            if (i === retries - 1 || err.code !== 'ECONNREFUSED') {
              console.error('[CustomJuliaBridge] Connection error:', err);
              reject(err);
            } else {
              console.warn(`[CustomJuliaBridge] Connection attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`);
            }
          });
        });
      } catch (error) {
        if (i === retries - 1) throw error; // Re-throw if last retry
        await new Promise(res => setTimeout(res, delay)); // Wait before retrying
      }
    }
  }


  public async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(() => resolve());
      }
    });
  }

  public runCommand(command: string, params: any = {}, timeout: number = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new Error('Not connected to Julia server.'));
      }

      const id = uuidv4();
      const request = {
        jsonrpc: '2.0',
        command: command,
        params: params,
        id: id,
      };

      this.logger.info(`Sending request:`, request);

      const timer = setTimeout(() => {
        this.responses.delete(id);
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      this.responses.set(id, (response) => {
        clearTimeout(timer);
        if (response.error) {
          reject(new Error(`Julia Error: ${response.error.message}`));
        } else {
          resolve(response.result);
        }
      });

      this.client.write(JSON.stringify(request) + '\n');
    });
  }
}