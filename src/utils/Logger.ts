export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level}] [${this.context}] ${message}`;
    
    if (data) {
      if (data instanceof Error) {
        return `${baseMessage} ${data.stack}`;
      } else if (typeof data === 'object' && data !== null) {
        return `${baseMessage} ${JSON.stringify(data, null, 2)}`;
      } else {
        return `${baseMessage} ${data}`;
      }
    }
    
    return baseMessage;
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('INFO', message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', message, data));
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage('ERROR', message, data));
  }

  debug(message: string, data?: any): void {
    if (process.env['LOG_LEVEL'] === 'debug') {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  success(message: string, data?: any): void {
    console.log(this.formatMessage('SUCCESS', message, data));
  }
} 