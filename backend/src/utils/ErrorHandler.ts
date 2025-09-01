import { Logger } from './Logger.js';

const logger = new Logger('ErrorHandler');

export enum ErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface SUMOError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  timestamp: number;
  context?: Record<string, any>;
}

export class ErrorHandler {
  private static errorHistory: SUMOError[] = [];
  private static readonly MAX_ERROR_HISTORY = 100;

  public static createError(
    type: ErrorType,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ): SUMOError {
    const error: SUMOError = {
      type,
      message,
      originalError,
      timestamp: Date.now(),
      context
    };

    // Add to error history
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_ERROR_HISTORY);
    }

    // Log the error
    logger.error(`[${type}] ${message}`, {
      originalError: originalError?.message,
      stack: originalError?.stack,
      context
    });

    return error;
  }

  public static handleConnectionError(error: Error, context?: Record<string, any>): SUMOError {
    return this.createError(
      ErrorType.CONNECTION_ERROR,
      `SUMO connection failed: ${error.message}`,
      error,
      context
    );
  }

  public static handleValidationError(message: string, context?: Record<string, any>): SUMOError {
    return this.createError(
      ErrorType.VALIDATION_ERROR,
      `Data validation failed: ${message}`,
      undefined,
      context
    );
  }

  public static handleProcessingError(error: Error, context?: Record<string, any>): SUMOError {
    return this.createError(
      ErrorType.PROCESSING_ERROR,
      `Data processing failed: ${error.message}`,
      error,
      context
    );
  }

  public static handleTimeoutError(operation: string, timeout: number): SUMOError {
    return this.createError(
      ErrorType.TIMEOUT_ERROR,
      `Operation '${operation}' timed out after ${timeout}ms`
    );
  }

  public static handleConfigurationError(message: string, context?: Record<string, any>): SUMOError {
    return this.createError(
      ErrorType.CONFIGURATION_ERROR,
      `Configuration error: ${message}`,
      undefined,
      context
    );
  }

  public static handleUnknownError(error: unknown, context?: Record<string, any>): SUMOError {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const originalError = error instanceof Error ? error : undefined;
    
    return this.createError(
      ErrorType.UNKNOWN_ERROR,
      message,
      originalError,
      context
    );
  }

  public static getErrorHistory(limit?: number): SUMOError[] {
    return limit ? this.errorHistory.slice(0, limit) : [...this.errorHistory];
  }

  public static getErrorsByType(type: ErrorType, limit?: number): SUMOError[] {
    const filtered = this.errorHistory.filter(error => error.type === type);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  public static getRecentErrors(minutes: number = 5): SUMOError[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.errorHistory.filter(error => error.timestamp > cutoff);
  }

  public static clearErrorHistory(): void {
    this.errorHistory = [];
    logger.info('Error history cleared');
  }

  public static getErrorSummary(): {
    total: number;
    byType: Record<ErrorType, number>;
    recent: number;
  } {
    const byType = {} as Record<ErrorType, number>;
    
    // Initialize all error types with 0
    Object.values(ErrorType).forEach(type => {
      byType[type] = 0;
    });

    // Count errors by type
    this.errorHistory.forEach(error => {
      byType[error.type]++;
    });

    const recentErrors = this.getRecentErrors(5);

    return {
      total: this.errorHistory.length,
      byType,
      recent: recentErrors.length
    };
  }

  public static isRecurringError(error: SUMOError, timeWindowMinutes: number = 5): boolean {
    const cutoff = Date.now() - (timeWindowMinutes * 60 * 1000);
    const similarErrors = this.errorHistory.filter(e => 
      e.type === error.type && 
      e.message === error.message && 
      e.timestamp > cutoff
    );

    return similarErrors.length > 3; // Consider it recurring if it happens more than 3 times
  }

  public static formatErrorForClient(error: SUMOError): {
    type: string;
    message: string;
    timestamp: number;
    isRecurring?: boolean;
  } {
    return {
      type: error.type,
      message: error.message,
      timestamp: error.timestamp,
      isRecurring: this.isRecurringError(error)
    };
  }
}