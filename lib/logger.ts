// Structured logger for serverless functions
// This logger mirrors the functionality in server/utils/logger.ts but works in Next.js API routes

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogMetadata {
  timestamp?: string;
  userId?: string;
  path?: string;
  method?: string;
  ip?: string | string[];
  [key: string]: any;
}

class ServerlessLogger {
  private logLevel: LogLevel;

  constructor() {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    switch (level) {
      case 'ERROR':
        this.logLevel = LogLevel.ERROR;
        break;
      case 'WARN':
        this.logLevel = LogLevel.WARN;
        break;
      case 'INFO':
        this.logLevel = LogLevel.INFO;
        break;
      case 'DEBUG':
        this.logLevel = LogLevel.DEBUG;
        break;
      default:
        this.logLevel = LogLevel.INFO;
    }
    
    if (typeof window === 'undefined') { // Only log in server environment
      console.log(`🔧 [LOGGER] Log level set to: ${LogLevel[this.logLevel]} (serverless)`);
      console.log(`🔧 [LOGGER] Environment: ${process.env.NODE_ENV || 'development'}`);
    }
  }

  error(message: string, metadata?: LogMetadata): void {
    if (this.logLevel >= LogLevel.ERROR) {
      const logData = this.formatLog('ERROR', message, metadata);
      console.error(logData);
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    if (this.logLevel >= LogLevel.WARN) {
      const logData = this.formatLog('WARN', message, metadata);
      console.warn(logData);
    }
  }

  info(message: string, metadata?: LogMetadata): void {
    if (this.logLevel >= LogLevel.INFO) {
      const logData = this.formatLog('INFO', message, metadata);
      console.log(logData);
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      const logData = this.formatLog('DEBUG', message, metadata);
      console.log(logData);
    }
  }

  // Convenience methods for different categories
  server(message: string, metadata?: LogMetadata): void {
    this.info(`🚀 [SERVERLESS] ${message}`, metadata);
  }

  database(message: string, metadata?: LogMetadata): void {
    this.info(`🔗 [DATABASE] ${message}`, metadata);
  }

  email(message: string, metadata?: LogMetadata): void {
    this.info(`📧 [EMAIL] ${message}`, metadata);
  }

  scheduler(message: string, metadata?: LogMetadata): void {
    this.info(`⏰ [SCHEDULER] ${message}`, metadata);
  }

  controller(message: string, metadata?: LogMetadata): void {
    this.info(`🎮 [CONTROLLER] ${message}`, metadata);
  }

  memory(message: string, metadata?: LogMetadata): void {
    this.info(`📸 [MEMORY] ${message}`, metadata);
  }

  anniversary(message: string, metadata?: LogMetadata): void {
    this.info(`🎉 [ANNIVERSARY] ${message}`, metadata);
  }

  image(message: string, metadata?: LogMetadata): void {
    this.info(`🖼️ [IMAGE] ${message}`, metadata);
  }

  private formatLog(level: string, message: string, metadata?: LogMetadata): string {
    const timestamp = metadata?.timestamp || new Date().toISOString();
    const logParts = [
      `[${timestamp}]`,
      `[${level}]`,
      message
    ];

    // Add metadata if present
    if (metadata) {
      const filteredMetadata = { ...metadata };
      delete filteredMetadata.timestamp; // Remove timestamp since it's already in the log prefix
      
      if (Object.keys(filteredMetadata).length > 0) {
        logParts.push(JSON.stringify(filteredMetadata));
      }
    }

    return logParts.join(' ');
  }
}

// Create a singleton instance
export const logger = new ServerlessLogger();
export default logger;