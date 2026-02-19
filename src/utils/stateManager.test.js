/**
 * Unit tests for State Manager utilities
 */

import { 
  BillingStateManager, 
  billingStateManager, 
  validateAgainstSchema, 
  validateType,
  STATE_SCHEMAS 
} from './stateManager';
import { DEFAULT_USAGE_METRICS } from './dataValidators';

describe('State Manager Utilities', () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new BillingStateManager();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('validateType', () => {
    test('should validate basic types correctly', () => {
      expect(validateType('hello', 'string')).toBe(true);
      expect(validateType(123, 'number')).toBe(true);
      expect(validateType(true, 'boolean')).toBe(true);
      expect(validateType({}, 'object')).toBe(true);
      expect(validateType([], 'array')).toBe(true);
    });

    test('should reject incorrect types', () => {
      expect(validateType('hello', 'number')).toBe(false);
      expect(validateType(123, 'string')).toBe(false);
      expect(validateType([], 'object')).toBe(false);
      expect(validateType({}, 'array')).toBe(false);
    });
  });

  describe('validateAgainstSchema', () => {
    test('should validate object with required properties', () => {
      const schema = {
        required: ['name', 'age'],
        types: { name: 'string', age: 'number' }
      };

      const validObj = { name: 'John', age: 30 };
      const result = validateAgainstSchema(validObj, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required properties', () => {
      const schema = {
        required: ['name', 'age'],
        types: { name: 'string', age: 'number' }
      };

      const invalidObj = { name: 'John' }; // missing age
      const result = validateAgainstSchema(invalidObj, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required property: age');
    });

    test('should detect incorrect types', () => {
      const schema = {
        required: ['name', 'age'],
        types: { name: 'string', age: 'number' }
      };

      const invalidObj = { name: 'John', age: '30' }; // age should be number
      const result = validateAgainstSchema(invalidObj, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Property age should be number but got string');
    });

    test('should validate arrays', () => {
      const schema = {
        type: 'array',
        itemSchema: {
          required: ['id'],
          types: { id: 'number' }
        }
      };

      const validArray = [{ id: 1 }, { id: 2 }];
      const result = validateAgainstSchema(validArray, schema);
      
      expect(result.isValid).toBe(true);
    });

    test('should detect invalid array items', () => {
      const schema = {
        type: 'array',
        itemSchema: {
          required: ['id'],
          types: { id: 'number' }
        }
      };

      const invalidArray = [{ id: 1 }, { id: 'invalid' }];
      const result = validateAgainstSchema(invalidArray, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Item 1:');
    });
  });

  describe('BillingStateManager', () => {
    describe('validateState', () => {
      test('should validate valid state', () => {
        const validState = {
          usageMetrics: DEFAULT_USAGE_METRICS,
          currentCosts: { totalCost: 100, currency: 'USD', period: 'current' },
          billingHistory: [],
          loading: false,
          error: null
        };

        const result = stateManager.validateState(validState);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should detect invalid usage metrics', () => {
        const invalidState = {
          usageMetrics: { invalid: 'data' },
          currentCosts: null,
          billingHistory: [],
          loading: false,
          error: null
        };

        const result = stateManager.validateState(invalidState);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Usage metrics validation failed');
        expect(result.sanitizedState.usageMetrics).toEqual(DEFAULT_USAGE_METRICS);
      });

      test('should detect invalid loading state', () => {
        const invalidState = {
          usageMetrics: null,
          currentCosts: null,
          billingHistory: [],
          loading: 'invalid',
          error: null
        };

        const result = stateManager.validateState(invalidState);
        expect(result.sanitizedState.loading).toBe(true);
        expect(result.warnings).toContain('Loading state was converted to boolean');
      });

      test('should detect state inconsistencies', () => {
        const inconsistentState = {
          usageMetrics: null,
          currentCosts: null,
          billingHistory: [],
          loading: true,
          error: { message: 'Error', type: 'api', recoverable: false, partialData: false }
        };

        const result = stateManager.validateState(inconsistentState);
        expect(result.warnings).toContain('Loading state inconsistent with error state');
        expect(result.sanitizedState.loading).toBe(false);
      });
    });

    describe('persistLastGoodState and getLastGoodState', () => {
      test('should persist and retrieve valid state', () => {
        const goodState = {
          usageMetrics: DEFAULT_USAGE_METRICS,
          currentCosts: { totalCost: 100, currency: 'USD', period: 'current' },
          billingHistory: [],
          pricingStructure: null,
          loading: false,
          error: null
        };

        stateManager.persistLastGoodState(goodState);
        const retrieved = stateManager.getLastGoodState();

        expect(retrieved.usageMetrics).toEqual(goodState.usageMetrics);
        expect(retrieved.currentCosts).toEqual(goodState.currentCosts);
        expect(retrieved.billingHistory).toEqual(goodState.billingHistory);
        expect(retrieved.pricingStructure).toEqual(goodState.pricingStructure);
      });

      test('should not persist invalid state', () => {
        const invalidState = {
          usageMetrics: 'invalid',
          currentCosts: null,
          billingHistory: [],
          pricingStructure: null
        };

        stateManager.persistLastGoodState(invalidState);
        const retrieved = stateManager.getLastGoodState();

        expect(retrieved).toBeNull();
      });

      test('should return null for expired state', () => {
        const goodState = {
          usageMetrics: DEFAULT_USAGE_METRICS,
          currentCosts: { totalCost: 100, currency: 'USD', period: 'current' },
          billingHistory: [],
          pricingStructure: null
        };

        // Manually set expired timestamp
        const expiredData = {
          timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
          data: goodState
        };
        localStorage.setItem(stateManager.storageKey, JSON.stringify(expiredData));

        const retrieved = stateManager.getLastGoodState();
        expect(retrieved).toBeNull();
      });
    });

    describe('recoverFromCorruption', () => {
      test('should recover by sanitizing corrupted state', () => {
        const corruptedState = {
          usageMetrics: { storage: { totalUsed: 'invalid' } },
          currentCosts: null,
          billingHistory: [],
          loading: false,
          error: null
        };

        const recovery = stateManager.recoverFromCorruption(corruptedState);
        
        expect(recovery.recoveredState).toBeDefined();
        expect(recovery.actionsToken).toContain('State sanitized successfully');
        expect(recovery.fallbackUsed).toBe(false);
      });

      test('should recover from last good state when sanitization fails', () => {
        // First persist a good state
        const goodState = {
          usageMetrics: DEFAULT_USAGE_METRICS,
          currentCosts: { totalCost: 100, currency: 'USD', period: 'current' },
          billingHistory: [],
          pricingStructure: null,
          loading: false,
          error: null
        };
        stateManager.persistLastGoodState(goodState);

        // Then try to recover from severely corrupted state
        const corruptedState = null;

        const recovery = stateManager.recoverFromCorruption(corruptedState);
        
        // Should recover from last good state since it was persisted
        expect(recovery.recoveredState.usageMetrics).toEqual(goodState.usageMetrics);
        expect(recovery.recoveredState.currentCosts).toEqual(goodState.currentCosts);
        expect(recovery.recoveredState.billingHistory).toEqual(goodState.billingHistory);
        expect(recovery.recoveredState.pricingStructure).toEqual(goodState.pricingStructure);
        expect(recovery.actionsToken).toContain('Recovered from last good state');
      });

      test('should use fallback when no recovery options available', () => {
        const corruptedState = null;

        const recovery = stateManager.recoverFromCorruption(corruptedState);
        
        expect(recovery.recoveredState).toEqual(stateManager.getDefaultState());
        expect(recovery.fallbackUsed).toBe(true);
        expect(recovery.actionsToken).toContain('Used fallback default state');
      });
    });

    describe('sanitization methods', () => {
      test('should sanitize usage metrics', () => {
        const invalidUsage = { invalid: 'data' };
        const sanitized = stateManager.sanitizeUsageMetrics(invalidUsage);
        
        expect(sanitized).toEqual(DEFAULT_USAGE_METRICS);
      });

      test('should sanitize current costs', () => {
        const invalidCosts = { invalid: 'data' };
        const sanitized = stateManager.sanitizeCurrentCosts(invalidCosts);
        
        expect(sanitized.totalCost).toBe(0);
        expect(sanitized.currency).toBe('USD');
        expect(sanitized.period).toBe('current');
        expect(sanitized).toHaveProperty('lastUpdated');
      });

      test('should sanitize billing history', () => {
        const invalidHistory = 'not an array';
        const sanitized = stateManager.sanitizeBillingHistory(invalidHistory);
        
        expect(sanitized).toEqual([]);
      });

      test('should sanitize error state', () => {
        const invalidError = { message: 123, type: null };
        const sanitized = stateManager.sanitizeErrorState(invalidError);
        
        expect(sanitized.message).toBe('Unknown error');
        expect(sanitized.type).toBe('runtime');
        expect(sanitized.recoverable).toBe(false);
      });
    });

    describe('enhanced state creation', () => {
      test('should create enhanced loading state', () => {
        const loadingState = stateManager.createLoadingState(true, 'fetching data', 50);
        
        expect(loadingState.isLoading).toBe(true);
        expect(loadingState.operation).toBe('fetching data');
        expect(loadingState.progress).toBe(50);
        expect(loadingState.startTime).toBeDefined();
      });

      test('should create enhanced error state', () => {
        const error = new Error('Test error');
        const errorState = stateManager.createErrorState(error, 'test-context', 1);
        
        expect(errorState.message).toBeDefined();
        expect(errorState.type).toBeDefined();
        expect(errorState.retryCount).toBe(1);
        expect(errorState.context).toBe('test-context');
        expect(errorState.timestamp).toBeDefined();
      });
    });

    describe('checkStateConsistency', () => {
      test('should detect loading/error inconsistency', () => {
        const inconsistentState = {
          loading: true,
          error: { message: 'Error', type: 'api', recoverable: false, partialData: false }
        };

        const result = stateManager.checkStateConsistency(inconsistentState);
        
        expect(result.isConsistent).toBe(false);
        expect(result.warnings).toContain('Loading state inconsistent with error state');
        expect(result.fixes.loading).toBe(false);
      });

      test('should detect missing data inconsistency', () => {
        const inconsistentState = {
          loading: false,
          error: null,
          usageMetrics: null
        };

        const result = stateManager.checkStateConsistency(inconsistentState);
        
        expect(result.isConsistent).toBe(false);
        expect(result.warnings).toContain('No data available but no loading or error state');
        expect(result.fixes.usageMetrics).toEqual(DEFAULT_USAGE_METRICS);
      });

      test('should detect high retry count', () => {
        const inconsistentState = {
          error: { retryCount: 10 }
        };

        const result = stateManager.checkStateConsistency(inconsistentState);
        
        expect(result.warnings).toContain('Retry count is unusually high');
        expect(result.fixes.error.retryCount).toBe(0);
      });
    });

    describe('utility methods', () => {
      test('should get default state', () => {
        const defaultState = stateManager.getDefaultState();
        
        expect(defaultState.usageMetrics).toEqual(DEFAULT_USAGE_METRICS);
        expect(defaultState.currentCosts).toEqual({ totalCost: 0, currency: 'USD', period: 'current' });
        expect(defaultState.billingHistory).toEqual([]);
        expect(defaultState.loading).toBe(false);
        expect(defaultState.error).toBeNull();
      });

      test('should clear persisted state', () => {
        // First persist some state
        const goodState = {
          usageMetrics: DEFAULT_USAGE_METRICS,
          currentCosts: { totalCost: 100, currency: 'USD', period: 'current' },
          billingHistory: [],
          pricingStructure: null,
          loading: false,
          error: null
        };
        stateManager.persistLastGoodState(goodState);

        // Verify it's there
        expect(stateManager.getLastGoodState()).not.toBeNull();

        // Clear it
        stateManager.clearPersistedState();

        // Verify it's gone
        expect(stateManager.getLastGoodState()).toBeNull();
      });
    });
  });

  describe('singleton instance', () => {
    test('should export singleton instance', () => {
      expect(billingStateManager).toBeInstanceOf(BillingStateManager);
    });

    test('should maintain state across calls', () => {
      const goodState = {
        usageMetrics: DEFAULT_USAGE_METRICS,
        currentCosts: { totalCost: 100, currency: 'USD', period: 'current' },
        billingHistory: [],
        pricingStructure: null,
        loading: false,
        error: null
      };

      billingStateManager.persistLastGoodState(goodState);
      const retrieved = billingStateManager.getLastGoodState();

      expect(retrieved.usageMetrics).toEqual(goodState.usageMetrics);
      expect(retrieved.currentCosts).toEqual(goodState.currentCosts);
      expect(retrieved.billingHistory).toEqual(goodState.billingHistory);
      expect(retrieved.pricingStructure).toEqual(goodState.pricingStructure);
    });
  });
});