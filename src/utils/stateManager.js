/**
 * State Management Utilities for DashboardBilling Component
 * Provides state validation, recovery mechanisms, and persistence
 */

import { 
  validateUsageResponse, 
  validateCurrentResponse, 
  validateHistoryResponse,
  DEFAULT_USAGE_METRICS 
} from './dataValidators';
import { errorRecoveryManager } from './errorRecovery';

// State validation schemas
const STATE_SCHEMAS = {
  usageMetrics: {
    required: ['storage', 'requests', 'transfer', 'retrieval'],
    storage: {
      required: ['totalUsed', 'totalCost', 'classes'],
      types: { totalUsed: 'number', totalCost: 'number', classes: 'object' }
    },
    requests: {
      required: ['uploads', 'downloads', 'totalCost'],
      types: { totalCost: 'number' }
    },
    transfer: {
      required: ['out', 'totalCost'],
      types: { totalCost: 'number' }
    },
    retrieval: {
      required: ['flexible_archive', 'deep_archive', 'totalCost'],
      types: { totalCost: 'number' }
    }
  },
  currentCosts: {
    required: ['totalCost', 'currency', 'period'],
    types: { totalCost: 'number', currency: 'string', period: 'string' }
  },
  billingHistory: {
    type: 'array',
    itemSchema: {
      required: ['period', 'totalCost', 'currency'],
      types: { totalCost: 'number', currency: 'string', period: 'string' }
    }
  }
};

// Error state schema
const ERROR_STATE_SCHEMA = {
  required: ['message', 'type', 'recoverable'],
  types: { 
    message: 'string', 
    type: 'string', 
    recoverable: 'boolean',
    retryCount: 'number'
  }
};

/**
 * Validates a value against a type requirement
 * @param {any} value - Value to validate
 * @param {string} expectedType - Expected type
 * @returns {boolean} - Whether value matches expected type
 */
function validateType(value, expectedType) {
  if (expectedType === 'array') {
    return Array.isArray(value);
  }
  if (expectedType === 'object') {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  return typeof value === expectedType;
}

/**
 * Validates an object against a schema
 * @param {any} obj - Object to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} - Validation result with isValid and errors
 */
function validateAgainstSchema(obj, schema) {
  const result = { isValid: true, errors: [] };

  if (!obj || typeof obj !== 'object') {
    result.isValid = false;
    result.errors.push('Object is null or not an object');
    return result;
  }

  // Check array type
  if (schema.type === 'array') {
    if (!Array.isArray(obj)) {
      result.isValid = false;
      result.errors.push('Expected array but got ' + typeof obj);
      return result;
    }

    // Validate array items if itemSchema is provided
    if (schema.itemSchema) {
      obj.forEach((item, index) => {
        const itemResult = validateAgainstSchema(item, schema.itemSchema);
        if (!itemResult.isValid) {
          result.isValid = false;
          result.errors.push(`Item ${index}: ${itemResult.errors.join(', ')}`);
        }
      });
    }
    return result;
  }

  // Check required properties
  if (schema.required) {
    schema.required.forEach(prop => {
      if (!(prop in obj)) {
        result.isValid = false;
        result.errors.push(`Missing required property: ${prop}`);
      }
    });
  }

  // Check property types
  if (schema.types) {
    Object.entries(schema.types).forEach(([prop, expectedType]) => {
      if (prop in obj && !validateType(obj[prop], expectedType)) {
        result.isValid = false;
        result.errors.push(`Property ${prop} should be ${expectedType} but got ${typeof obj[prop]}`);
      }
    });
  }

  // Check nested schemas
  Object.entries(schema).forEach(([key, nestedSchema]) => {
    if (key !== 'required' && key !== 'types' && key !== 'type' && key !== 'itemSchema') {
      if (key in obj && typeof nestedSchema === 'object') {
        const nestedResult = validateAgainstSchema(obj[key], nestedSchema);
        if (!nestedResult.isValid) {
          result.isValid = false;
          result.errors.push(`${key}: ${nestedResult.errors.join(', ')}`);
        }
      }
    }
  });

  return result;
}

/**
 * State Manager class for handling component state validation and recovery
 */
export class BillingStateManager {
  constructor() {
    this.storageKey = 'skycrate_billing_state';
    this.maxStorageAge = 24 * 60 * 60 * 1000; // 24 hours
    this.validationCache = new Map();
  }

  /**
   * Validates billing state before rendering
   * @param {Object} state - Current component state
   * @returns {Object} - Validation result with isValid, errors, and sanitizedState
   */
  validateState(state) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedState: state ? { ...state } : this.getDefaultState()
    };

    try {
      // Handle null or undefined state
      if (!state || typeof state !== 'object') {
        result.isValid = false;
        result.errors.push('State is null or not an object');
        result.sanitizedState = this.getDefaultState();
        return result;
      }

      // Validate usage metrics
      if (state.usageMetrics !== null && state.usageMetrics !== undefined) {
        const usageValidation = validateAgainstSchema(state.usageMetrics, STATE_SCHEMAS.usageMetrics);
        if (!usageValidation.isValid) {
          result.errors.push(`Usage metrics validation failed: ${usageValidation.errors.join(', ')}`);
          result.sanitizedState.usageMetrics = this.sanitizeUsageMetrics(state.usageMetrics);
          result.warnings.push('Usage metrics were sanitized due to validation errors');
        }
      }

      // Validate current costs
      if (state.currentCosts !== null && state.currentCosts !== undefined) {
        const currentValidation = validateAgainstSchema(state.currentCosts, STATE_SCHEMAS.currentCosts);
        if (!currentValidation.isValid) {
          result.errors.push(`Current costs validation failed: ${currentValidation.errors.join(', ')}`);
          result.sanitizedState.currentCosts = this.sanitizeCurrentCosts(state.currentCosts);
          result.warnings.push('Current costs were sanitized due to validation errors');
        }
      }

      // Validate billing history
      if (state.billingHistory) {
        const historyValidation = validateAgainstSchema(state.billingHistory, STATE_SCHEMAS.billingHistory);
        if (!historyValidation.isValid) {
          result.errors.push(`Billing history validation failed: ${historyValidation.errors.join(', ')}`);
          result.sanitizedState.billingHistory = this.sanitizeBillingHistory(state.billingHistory);
          result.warnings.push('Billing history was sanitized due to validation errors');
        }
      }

      // Validate error state
      if (state.error !== null && state.error !== undefined) {
        const errorValidation = validateAgainstSchema(state.error, ERROR_STATE_SCHEMA);
        if (!errorValidation.isValid) {
          result.errors.push(`Error state validation failed: ${errorValidation.errors.join(', ')}`);
          result.sanitizedState.error = this.sanitizeErrorState(state.error);
          result.warnings.push('Error state was sanitized due to validation errors');
        }
      }

      // Validate loading state
      if ('loading' in state && typeof state.loading !== 'boolean') {
        result.errors.push('Loading state must be boolean');
        result.sanitizedState.loading = Boolean(state.loading);
        result.warnings.push('Loading state was converted to boolean');
      }

      // Check for state consistency
      const consistencyCheck = this.checkStateConsistency(result.sanitizedState);
      if (!consistencyCheck.isConsistent) {
        result.warnings.push(...consistencyCheck.warnings);
        result.sanitizedState = { ...result.sanitizedState, ...consistencyCheck.fixes };
      }

      // Overall validation result
      result.isValid = result.errors.length === 0;

    } catch (error) {
      console.error('State validation error:', error);
      result.isValid = false;
      result.errors.push(`Validation process failed: ${error.message}`);
      result.sanitizedState = this.getDefaultState();
    }

    return result;
  }

  /**
   * Sanitizes usage metrics data
   * @param {any} usageMetrics - Raw usage metrics
   * @returns {Object} - Sanitized usage metrics
   */
  sanitizeUsageMetrics(usageMetrics) {
    try {
      return validateUsageResponse(usageMetrics);
    } catch (error) {
      console.error('Failed to sanitize usage metrics:', error);
      return DEFAULT_USAGE_METRICS;
    }
  }

  /**
   * Sanitizes current costs data
   * @param {any} currentCosts - Raw current costs
   * @returns {Object} - Sanitized current costs
   */
  sanitizeCurrentCosts(currentCosts) {
    try {
      return validateCurrentResponse(currentCosts);
    } catch (error) {
      console.error('Failed to sanitize current costs:', error);
      return { totalCost: 0, currency: 'USD', period: 'current' };
    }
  }

  /**
   * Sanitizes billing history data
   * @param {any} billingHistory - Raw billing history
   * @returns {Array} - Sanitized billing history
   */
  sanitizeBillingHistory(billingHistory) {
    try {
      return validateHistoryResponse(billingHistory);
    } catch (error) {
      console.error('Failed to sanitize billing history:', error);
      return [];
    }
  }

  /**
   * Sanitizes error state
   * @param {any} errorState - Raw error state
   * @returns {Object} - Sanitized error state
   */
  sanitizeErrorState(errorState) {
    if (!errorState || typeof errorState !== 'object') {
      return null;
    }

    return {
      message: typeof errorState.message === 'string' ? errorState.message : 'Unknown error',
      type: typeof errorState.type === 'string' ? errorState.type : 'runtime',
      recoverable: typeof errorState.recoverable === 'boolean' ? errorState.recoverable : false,
      retryCount: typeof errorState.retryCount === 'number' ? errorState.retryCount : 0,
      partialData: typeof errorState.partialData === 'boolean' ? errorState.partialData : false,
      canRetry: typeof errorState.canRetry === 'boolean' ? errorState.canRetry : false
    };
  }

  /**
   * Checks state consistency and provides fixes
   * @param {Object} state - State to check
   * @returns {Object} - Consistency check result
   */
  checkStateConsistency(state) {
    const result = {
      isConsistent: true,
      warnings: [],
      fixes: {}
    };

    // Check loading state consistency
    if (state.loading && state.error && !state.error.partialData) {
      result.isConsistent = false;
      result.warnings.push('Loading state inconsistent with error state');
      result.fixes.loading = false;
    }

    // Check data availability consistency
    if (!state.loading && !state.error && !state.usageMetrics) {
      result.isConsistent = false;
      result.warnings.push('No data available but no loading or error state');
      result.fixes.usageMetrics = DEFAULT_USAGE_METRICS;
    }

    // Check retry count consistency
    if (state.error && state.error.retryCount > 5) {
      result.warnings.push('Retry count is unusually high');
      result.fixes.error = { ...state.error, retryCount: 0 };
    }

    return result;
  }

  /**
   * Persists last known good state to localStorage
   * @param {Object} state - State to persist
   */
  persistLastGoodState(state) {
    try {
      const validation = this.validateState(state);
      if (!validation.isValid) {
        console.warn('Not persisting invalid state:', validation.errors);
        return;
      }

      const stateToStore = {
        timestamp: Date.now(),
        data: {
          usageMetrics: state.usageMetrics,
          currentCosts: state.currentCosts,
          billingHistory: state.billingHistory,
          pricingStructure: state.pricingStructure
        }
      };

      localStorage.setItem(this.storageKey, JSON.stringify(stateToStore));
      console.log('Last good state persisted successfully');
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  /**
   * Retrieves last known good state from localStorage
   * @returns {Object|null} - Last good state or null if not available/expired
   */
  getLastGoodState() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      const age = Date.now() - parsed.timestamp;

      if (age > this.maxStorageAge) {
        console.log('Stored state is too old, discarding');
        localStorage.removeItem(this.storageKey);
        return null;
      }

      // Validate stored state
      const validation = this.validateState(parsed.data);
      if (!validation.isValid) {
        console.warn('Stored state is invalid, discarding:', validation.errors);
        localStorage.removeItem(this.storageKey);
        return null;
      }

      console.log('Retrieved valid last good state');
      return validation.sanitizedState;
    } catch (error) {
      console.error('Failed to retrieve last good state:', error);
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  /**
   * Recovers state from corruption
   * @param {Object} corruptedState - The corrupted state
   * @param {string} context - Context of the corruption
   * @returns {Object} - Recovery result with recovered state and actions taken
   */
  recoverFromCorruption(corruptedState, context = 'unknown') {
    const recovery = {
      recoveredState: null,
      actionsToken: [],
      fallbackUsed: false
    };

    try {
      // First, try to sanitize the corrupted state
      const validation = this.validateState(corruptedState);
      if (validation.isValid || validation.warnings.length > 0) {
        recovery.recoveredState = validation.sanitizedState;
        recovery.actionsToken.push('State sanitized successfully');
        return recovery;
      }

      // Try to recover from last good state
      const lastGoodState = this.getLastGoodState();
      if (lastGoodState) {
        recovery.recoveredState = lastGoodState;
        recovery.actionsToken.push('Recovered from last good state');
        return recovery;
      }

      // Use fallback data as last resort
      recovery.recoveredState = this.getDefaultState();
      recovery.fallbackUsed = true;
      recovery.actionsToken.push('Used fallback default state');

      // Log the corruption for debugging
      errorRecoveryManager.handleError(
        new Error(`State corruption in ${context}`),
        'state-corruption'
      );

    } catch (error) {
      console.error('State recovery failed:', error);
      recovery.recoveredState = this.getDefaultState();
      recovery.fallbackUsed = true;
      recovery.actionsToken.push('Recovery failed, used emergency defaults');
    }

    return recovery;
  }

  /**
   * Gets default safe state
   * @returns {Object} - Default state object
   */
  getDefaultState() {
    return {
      usageMetrics: DEFAULT_USAGE_METRICS,
      currentCosts: { totalCost: 0, currency: 'USD', period: 'current' },
      billingHistory: [],
      pricingStructure: null,
      loading: false,
      error: null,
      lastValidData: null,
      retryCount: 0,
      showPricing: false
    };
  }

  /**
   * Enhances loading state with additional context
   * @param {boolean} isLoading - Current loading state
   * @param {string} operation - Operation being performed
   * @param {number} progress - Progress percentage (0-100)
   * @returns {Object} - Enhanced loading state
   */
  createLoadingState(isLoading, operation = 'loading', progress = 0) {
    return {
      isLoading,
      operation,
      progress: Math.max(0, Math.min(100, progress)),
      startTime: isLoading ? Date.now() : null
    };
  }

  /**
   * Enhances error state with recovery information
   * @param {Error|Object} error - Error object or error state
   * @param {string} context - Context where error occurred
   * @param {number} retryCount - Current retry count
   * @returns {Object} - Enhanced error state
   */
  createErrorState(error, context = 'unknown', retryCount = 0) {
    const recoveryAction = errorRecoveryManager.handleError(error, context);
    
    return {
      message: recoveryAction.userMessage,
      type: recoveryAction.type,
      recoverable: recoveryAction.recoverable,
      retryCount,
      canRetry: recoveryAction.shouldRetry && retryCount < 3,
      partialData: false,
      context,
      timestamp: Date.now(),
      fallbackAvailable: !!this.getLastGoodState()
    };
  }

  /**
   * Clears persisted state (for testing or reset)
   */
  clearPersistedState() {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('Persisted state cleared');
    } catch (error) {
      console.error('Failed to clear persisted state:', error);
    }
  }
}

// Export singleton instance
export const billingStateManager = new BillingStateManager();

// Export utility functions for direct use
export {
  validateAgainstSchema,
  validateType,
  STATE_SCHEMAS,
  ERROR_STATE_SCHEMA
};