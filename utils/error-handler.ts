/**
 * Centralized error handling utilities for HomeHeroes application
 * Provides user-friendly error messages with resolution suggestions
 */

export type ErrorCategory = 
  | 'network'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'server'
  | 'rate_limit'
  | 'unknown';

export interface AppError {
  category: ErrorCategory;
  message: string;
  suggestion: string;
  // Safe metadata only - never store full error objects
  errorCode?: string;
  statusCode?: number;
  timestamp: string;
}

/**
 * Categorizes and formats errors into user-friendly messages
 * SECURITY: Never exposes sensitive error details to users
 */
export function handleError(error: any): AppError {
  const timestamp = new Date().toISOString();
  const errorCode = error?.code || error?.name;
  const statusCode = error?.status || error?.statusCode;

  // Rate limiting (check first to handle specially)
  if (statusCode === 429 || error?.message?.includes('rate limit')) {
    return {
      category: 'rate_limit',
      message: 'Too many requests',
      suggestion: 'Please wait a moment and try again',
      errorCode,
      statusCode: 429,
      timestamp,
    };
  }

  // Network errors
  if (error?.message?.includes('fetch') || 
      error?.message?.includes('network') ||
      error?.message?.includes('timeout') ||
      errorCode === 'NETWORK_ERROR' ||
      errorCode === 'ECONNREFUSED') {
    return {
      category: 'network',
      message: 'Connection problem',
      suggestion: 'Check your internet connection and try again',
      errorCode,
      statusCode,
      timestamp,
    };
  }

  // Authentication errors - use generic message to prevent user enumeration
  if (error?.message?.includes('Invalid login credentials') ||
      error?.message?.includes('Email not confirmed') ||
      error?.message?.includes('User not found') ||
      statusCode === 401) {
    return {
      category: 'authentication',
      message: 'Authentication failed',
      suggestion: 'Please check your credentials and try again',
      errorCode,
      statusCode: 401,
      timestamp,
    };
  }

  // Authorization errors
  if (statusCode === 403 || 
      error?.message?.includes('permission') ||
      error?.message?.includes('unauthorized')) {
    return {
      category: 'authorization',
      message: "You don't have permission",
      suggestion: "You don't have permission to perform this action",
      errorCode,
      statusCode: 403,
      timestamp,
    };
  }

  // Not found errors
  if (statusCode === 404 || 
      error?.message?.includes('not found')) {
    return {
      category: 'not_found',
      message: 'Information not found',
      suggestion: 'The requested information could not be found',
      errorCode,
      statusCode: 404,
      timestamp,
    };
  }

  // Conflict errors
  if (statusCode === 409 || 
      error?.message?.includes('conflict') ||
      error?.message?.includes('already exists')) {
    return {
      category: 'conflict',
      message: 'Data conflict',
      suggestion: 'This action conflicts with current data. Please refresh and try again',
      errorCode,
      statusCode: 409,
      timestamp,
    };
  }

  // Validation errors - NEVER expose raw validation messages
  if (error?.message?.includes('validation') ||
      error?.message?.includes('required') ||
      error?.message?.includes('invalid') ||
      statusCode === 400) {
    return {
      category: 'validation',
      message: 'Invalid information',
      // Generic message - never expose backend validation details
      suggestion: 'Please check your input and try again',
      errorCode,
      statusCode: 400,
      timestamp,
    };
  }

  // Server errors
  if (statusCode >= 500 || 
      error?.message?.includes('server') ||
      error?.message?.includes('internal')) {
    return {
      category: 'server',
      message: 'Service temporarily unavailable',
      suggestion: 'Please try again later',
      errorCode,
      statusCode,
      timestamp,
    };
  }

  // Unknown errors - provide minimal information
  return {
    category: 'unknown',
    message: 'Something went wrong',
    suggestion: 'An unexpected error occurred. Please try again',
    errorCode,
    statusCode,
    timestamp,
  };
}

/**
 * Retry logic for transient errors with exponential backoff
 * Only retries network and server errors, not auth/validation/rate-limit errors
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const appError = handleError(error);
      
      // Never retry these error types
      const nonRetryableCategories: ErrorCategory[] = [
        'authentication',
        'authorization',
        'validation',
        'conflict',
        'rate_limit',
        'not_found',
      ];
      
      if (nonRetryableCategories.includes(appError.category)) {
        throw error;
      }
      
      // Only retry network and server errors
      if (appError.category !== 'network' && appError.category !== 'server') {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt < maxRetries - 1) {
        // Exponential backoff with jitter to prevent thundering herd
        const exponentialDelay = delayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 200; // 0-200ms random jitter
        await new Promise(resolve => setTimeout(resolve, exponentialDelay + jitter));
      }
    }
  }
  
  throw lastError;
}

/**
 * Log errors in development, send to monitoring in production
 * SECURITY: Only logs safe metadata, never sensitive error details
 */
export function logError(error: AppError, context?: string): void {
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    // Development: Log more details for debugging
    console.error(`[${error.category}] ${context || 'Error'}:`, {
      message: error.message,
      suggestion: error.suggestion,
      errorCode: error.errorCode,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
    });
  } else {
    // Production: Minimal console logging
    console.error(`[${error.category}] ${context || 'Error'} - ${error.errorCode || 'UNKNOWN'}`);
    
    // TODO: Send to secure error monitoring service (e.g., Sentry)
    // sendToMonitoring({
    //   category: error.category,
    //   errorCode: error.errorCode,
    //   statusCode: error.statusCode,
    //   context,
    //   timestamp: error.timestamp,
    //   // Include user context if available (but never PII)
    //   userId: getCurrentUserId(),
    //   userType: getCurrentUserType(),
    // });
  }
}

/**
 * Sanitize error for safe display to users
 * Ensures no sensitive information leaks through error messages
 */
export function sanitizeErrorForDisplay(error: AppError): { message: string; suggestion: string } {
  return {
    message: error.message,
    suggestion: error.suggestion,
  };
}
