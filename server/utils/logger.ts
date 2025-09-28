// Logger utility with configurable log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
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
    
    console.log(`🔧 [LOGGER] Log level set to: ${LogLevel[this.logLevel]}`);
    console.log(`🔧 [LOGGER] Environment: ${process.env.NODE_ENV || 'development'}`);
  }

  error(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.log(message, ...args);
    }
  }

  // Convenience methods for different categories
  server(message: string, ...args: unknown[]): void {
    this.info(`🚀 [SERVER] ${message}`, ...args);
  }

  database(message: string, ...args: unknown[]): void {
    this.info(`🔗 [DATABASE] ${message}`, ...args);
  }

  email(message: string, ...args: unknown[]): void {
    this.info(`📧 [EMAIL] ${message}`, ...args);
  }

  scheduler(message: string, ...args: unknown[]): void {
    this.info(`⏰ [SCHEDULER] ${message}`, ...args);
  }

  controller(message: string, ...args: unknown[]): void {
    this.info(`🎮 [CONTROLLER] ${message}`, ...args);
  }
}

export const logger = new Logger();
export default logger;