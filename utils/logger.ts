/**
 * Centralized logging utility for HomeHeroes application
 * Provides structured, colorful terminal output for easier debugging
 */

type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

interface LogContext {
  operation?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  [key: string]: any;
}

class Logger {
  private isDev: boolean;
  private enableColors: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV !== 'production';
    this.enableColors = true;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.getTimestamp();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    let formatted = `${prefix} ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      formatted += `\n  Context: ${JSON.stringify(context, null, 2)}`;
    }
    
    return formatted;
  }

  private getColorCode(level: LogLevel): string {
    if (!this.enableColors) return '';
    
    const colors = {
      debug: '\x1b[36m',    // Cyan
      info: '\x1b[34m',     // Blue
      success: '\x1b[32m',  // Green
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
    };
    
    return colors[level] || '';
  }

  private resetColor(): string {
    return this.enableColors ? '\x1b[0m' : '';
  }

  debug(message: string, context?: LogContext): void {
    if (!this.isDev) return;
    
    const color = this.getColorCode('debug');
    const reset = this.resetColor();
    console.log(`${color}${this.formatMessage('debug', message, context)}${reset}`);
  }

  info(message: string, context?: LogContext): void {
    const color = this.getColorCode('info');
    const reset = this.resetColor();
    console.log(`${color}${this.formatMessage('info', message, context)}${reset}`);
  }

  success(message: string, context?: LogContext): void {
    const color = this.getColorCode('success');
    const reset = this.resetColor();
    console.log(`${color}${this.formatMessage('success', message, context)}${reset}`);
  }

  warn(message: string, context?: LogContext): void {
    const color = this.getColorCode('warn');
    const reset = this.resetColor();
    console.warn(`${color}${this.formatMessage('warn', message, context)}${reset}`);
  }

  error(message: string, error?: any, context?: LogContext): void {
    const color = this.getColorCode('error');
    const reset = this.resetColor();
    
    const errorContext = {
      ...context,
      errorMessage: error?.message,
      errorCode: error?.code,
      statusCode: error?.status || error?.statusCode,
    };
    
    console.error(`${color}${this.formatMessage('error', message, errorContext)}${reset}`);
    
    // Log stack trace in development
    if (this.isDev && error?.stack) {
      console.error(`${color}Stack trace:\n${error.stack}${reset}`);
    }
  }

  // Specialized logging methods for common operations
  
  supabaseQuery(operation: string, table: string, filters?: any): void {
    this.debug(`Supabase Query: ${operation}`, {
      operation,
      table,
      filters: filters ? JSON.stringify(filters) : 'none',
    });
  }

  supabaseResult(operation: string, success: boolean, data?: any, error?: any): void {
    if (success) {
      this.success(`Supabase ${operation} succeeded`, {
        operation,
        recordCount: Array.isArray(data) ? data.length : (data ? 1 : 0),
      });
    } else {
      this.error(`Supabase ${operation} failed`, error, {
        operation,
      });
    }
  }

  authOperation(operation: string, email?: string): void {
    this.info(`Auth: ${operation}`, {
      operation,
      email: email ? `${email.substring(0, 3)}***` : undefined,
    });
  }

  authResult(operation: string, success: boolean, error?: any): void {
    if (success) {
      this.success(`Auth ${operation} succeeded`);
    } else {
      this.error(`Auth ${operation} failed`, error, { operation });
    }
  }

  apiRequest(method: string, endpoint: string, data?: any): void {
    this.debug(`API Request: ${method} ${endpoint}`, {
      method,
      endpoint,
      hasData: !!data,
    });
  }

  apiResponse(method: string, endpoint: string, status: number, duration?: number): void {
    const level = status >= 200 && status < 300 ? 'success' : 'error';
    const message = `API Response: ${method} ${endpoint} - ${status}`;
    
    if (level === 'success') {
      this.success(message, { method, endpoint, status, duration });
    } else {
      this.error(message, undefined, { method, endpoint, status, duration });
    }
  }

  networkStatus(isOnline: boolean): void {
    if (isOnline) {
      this.success('Network: Online');
    } else {
      this.warn('Network: Offline');
    }
  }

  offlineQueue(action: string, queueSize: number): void {
    this.info(`Offline Queue: ${action}`, {
      action,
      queueSize,
    });
  }

  performance(operation: string, duration: number, threshold: number = 1000): void {
    if (duration > threshold) {
      this.warn(`Performance: ${operation} took ${duration}ms`, {
        operation,
        duration,
        threshold,
      });
    } else {
      this.debug(`Performance: ${operation} took ${duration}ms`, {
        operation,
        duration,
      });
    }
  }

  stateChange(store: string, action: string, data?: any): void {
    this.debug(`State: ${store}.${action}`, {
      store,
      action,
      data: data ? JSON.stringify(data).substring(0, 100) : undefined,
    });
  }

  // Group related logs together
  group(label: string): void {
    if (this.isDev) {
      console.group(`\n📦 ${label}`);
    }
  }

  groupEnd(): void {
    if (this.isDev) {
      console.groupEnd();
    }
  }

  // Table output for structured data
  table(data: any[]): void {
    if (this.isDev && data.length > 0) {
      console.table(data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { LogContext };
