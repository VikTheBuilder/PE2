/**
 * Error Recovery Manager
 * Handles error classification, retry logic, and fallback data generation
 */

// Error types for classification
export const ERROR_TYPES = {
  NETWORK: 'network',
  API: 'api',
  VALIDATION: 'validation',
  RUNTIME: 'runtime'
};

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000,  // 8 seconds
  backoffMultiplier: 2
};

/**
 * Classifies errors into specific types for appropriate handling
 * @param {Error} error - The error to classify
 * @returns {string} - The error type
 */
export function classifyError(error) {
  // Network errors
  if (error.name === 'NetworkError' || 
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.code === 'NETWORK_ERROR') {
    return ERROR_TYPES.NETWORK;
  }

  // API errors (HTTP status codes)
  if (error.status >= 400 && error.status < 600) {
    return ERROR_TYPES.API;
  }

  // Validation errors
  if (error.name === 'ValidationError' ||
      error.message.includes('validation') ||
      error.message.includes('invalid data')) {
    return ERROR_TYPES.VALIDATION;
  }

  // Runtime errors (default)
  return ERROR_TYPES.RUNTIME;
}

/**
 * Determines if an error is recoverable through retry
 * @param {Error} error - The error to check
 * @param {number} attemptCount - Current attempt number
 * @param {Object} config - Retry configuration
 * @returns {boolean} - Whether retry should be attempted
 */
export function shouldRetry(error, attemptCount, config = DEFAULT_RETRY_CONFIG) {
  if (attemptCount >= config.maxRetries) {
    return false;
  }

  const errorType = classifyError(error);

  // Network errors are retryable
  if (errorType === ERROR_TYPES.NETWORK) {
    return true;
  }

  // Some API errors are retryable (5xx server errors)
  if (errorType === ERROR_TYPES.API && error.status >= 500) {
    return true;
  }

  // Validation and runtime errors are not retryable
  return false;
}

/**
 * Calculates retry delay using exponential backoff
 * @param {number} attemptCount - Current attempt number (0-based)
 * @param {Object} config - Retry configuration
 * @returns {number} - Delay in milliseconds
 */
export function getRetryDelay(attemptCount, config = DEFAULT_RETRY_CONFIG) {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attemptCount);
  return Math.min(delay, config.maxDelay);
}

/**
 * Executes a function with retry logic
 * @param {Function} fn - Function to execute
 * @param {Object} config - Retry configuration
 * @returns {Promise} - Promise that resolves with function result or rejects after max retries
 */
export async function executeWithRetry(fn, config = DEFAULT_RETRY_CONFIG) {
  let lastError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error, attempt, config)) {
        throw error;
      }
      
      if (attempt < config.maxRetries) {
        const delay = getRetryDelay(attempt, config);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Fallback data generators
export const fallbackDataGenerators = {
  /**
   * Generates fallback usage metrics data
   */
  usageMetrics: () => ({
    storage: {
      totalUsed: 0,
      totalCost: 0,
      classes: {}
    },
    requests: {
      uploads: { count: 0, cost: 0 },
      downloads: { count: 0, cost: 0 },
      totalCost: 0
    },
    transfer: {
      out: { amount: 0, cost: 0 },
      totalCost: 0
    },
    retrieval: {
      flexible_archive: { amount: 0, cost: 0 },
      deep_archive: { amount: 0, cost: 0 },
      totalCost: 0
    },
    pricing: {
      storage: {},
      requests: {},
      transfer: {},
      retrieval: {}
    }
  }),

  /**
   * Generates fallback current billing data
   */
  currentBilling: () => ({
    currentMonth: {
      total: 0,
      storage: 0,
      requests: 0,
      transfer: 0,
      retrieval: 0
    },
    projectedMonth: {
      total: 0,
      storage: 0,
      requests: 0,
      transfer: 0,
      retrieval: 0
    }
  }),

  /**
   * Generates fallback billing history data
   */
  billingHistory: () => ([]),

  /**
   * Generates fallback storage class data
   */
  storageClass: (className = 'standard') => ({
    fileCount: 0,
    totalSize: 0,
    estimatedCost: 0,
    used: 0,
    cost: 0,
    className
  }),

  /**
   * Generates fallback pricing data
   */
  pricing: () => ({
    storage: {
      standard: 0.023,
      intelligent_tiering: 0.0125,
      standard_ia: 0.0125,
      onezone_ia: 0.01,
      glacier_flexible: 0.004,
      glacier_deep: 0.00099
    },
    requests: {
      put: 0.0005,
      get: 0.0004
    },
    transfer: {
      out: 0.09
    },
    retrieval: {
      flexible_archive: 0.01,
      deep_archive: 0.02
    }
  })
};

/**
 * Generates fallback data for a specific data type
 * @param {string} dataType - Type of data to generate
 * @param {Object} options - Additional options for data generation
 * @returns {Object} - Fallback data
 */
export function generateFallbackData(dataType, options = {}) {
  const generator = fallbackDataGenerators[dataType];
  
  if (!generator) {
    console.warn(`No fallback generator found for data type: ${dataType}`);
    return {};
  }
  
  return generator(options);
}

/**
 * Error Recovery Manager class for handling complex error scenarios
 */
export class ErrorRecoveryManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.errorLog = [];
    this.circuitBreaker = {
      failures: 0,
      lastFailure: null,
      isOpen: false,
      threshold: 5,
      timeout: 30000 // 30 seconds
    };
  }

  /**
   * Handles an error and determines recovery action
   * @param {Error} error - The error to handle
   * @param {string} context - Context where error occurred
   * @returns {Object} - Recovery action object
   */
  handleError(error, context = 'unknown') {
    const errorType = classifyError(error);
    const timestamp = new Date().toISOString();
    
    // Log the error
    this.errorLog.push({
      error: error.message,
      type: errorType,
      context,
      timestamp
    });

    // Update circuit breaker
    this.updateCircuitBreaker(error);

    // Determine recovery action
    const recoveryAction = {
      type: errorType,
      recoverable: this.isRecoverable(error),
      shouldRetry: !this.circuitBreaker.isOpen && shouldRetry(error, 0, this.config),
      fallbackData: this.getFallbackForContext(context),
      userMessage: this.getUserMessage(error, errorType),
      retryDelay: getRetryDelay(0, this.config)
    };

    return recoveryAction;
  }

  /**
   * Updates circuit breaker state based on error
   * @param {Error} error - The error that occurred
   */
  updateCircuitBreaker(error) {
    const errorType = classifyError(error);
    
    if (errorType === ERROR_TYPES.NETWORK || errorType === ERROR_TYPES.API) {
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailure = Date.now();
      
      if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
        this.circuitBreaker.isOpen = true;
        setTimeout(() => {
          this.circuitBreaker.isOpen = false;
          this.circuitBreaker.failures = 0;
        }, this.circuitBreaker.timeout);
      }
    }
  }

  /**
   * Determines if an error is recoverable
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether the error is recoverable
   */
  isRecoverable(error) {
    const errorType = classifyError(error);
    return errorType === ERROR_TYPES.NETWORK || 
           (errorType === ERROR_TYPES.API && error.status >= 500);
  }

  /**
   * Gets appropriate fallback data for a given context
   * @param {string} context - The context where error occurred
   * @returns {Object} - Fallback data
   */
  getFallbackForContext(context) {
    const contextMap = {
      'usage-metrics': 'usageMetrics',
      'current-billing': 'currentBilling',
      'billing-history': 'billingHistory',
      'storage-class': 'storageClass',
      'pricing': 'pricing'
    };

    const dataType = contextMap[context] || 'usageMetrics';
    return generateFallbackData(dataType);
  }

  /**
   * Generates user-friendly error message
   * @param {Error} error - The error
   * @param {string} errorType - The classified error type
   * @returns {string} - User-friendly message
   */
  getUserMessage(error, errorType) {
    switch (errorType) {
      case ERROR_TYPES.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case ERROR_TYPES.API:
        if (error.status >= 500) {
          return 'Server is temporarily unavailable. Please try again in a few moments.';
        }
        return 'Unable to load billing data. Please try refreshing the page.';
      case ERROR_TYPES.VALIDATION:
        return 'Received invalid data from server. Showing available information.';
      case ERROR_TYPES.RUNTIME:
        return 'An unexpected error occurred. Please refresh the page.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  /**
   * Resets circuit breaker (for testing or manual recovery)
   */
  resetCircuitBreaker() {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.lastFailure = null;
  }

  /**
   * Gets error statistics
   * @returns {Object} - Error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const recentErrors = this.errorLog.filter(
      log => now - new Date(log.timestamp).getTime() < 300000 // 5 minutes
    );

    return {
      totalErrors: this.errorLog.length,
      recentErrors: recentErrors.length,
      circuitBreakerOpen: this.circuitBreaker.isOpen,
      errorsByType: this.errorLog.reduce((acc, log) => {
        acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Export singleton instance for global use
export const errorRecoveryManager = new ErrorRecoveryManager();