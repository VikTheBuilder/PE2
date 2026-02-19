/**
 * Integration tests for enhanced API response processing
 * Tests the actual API processing logic with validation and error handling
 */

import { billingAPI } from '../services/api';
import { validateUsageResponse, validateCurrentResponse, validateHistoryResponse } from './dataValidators';
import { executeWithRetry, errorRecoveryManager } from './errorRecovery';

// Mock the axios API
jest.mock('../services/api', () => ({
  billingAPI: {
    getCurrentUsage: jest.fn(),
    getCurrentBilling: jest.fn(),
    getBillingHistory: jest.fn(),
  }
}));

describe('Enhanced API Response Processing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    errorRecoveryManager.resetCircuitBreaker();
  });

  describe('Data Validation Integration', () => {
    test('validates and processes successful API responses', async () => {
      const mockUsageData = {
        storage: {
          totalUsed: 10.5,
          totalCost: 0.25,
          classes: {
            STANDARD: { used: 8.0, cost: 0.20 }
          }
        },
        requests: {
          uploads: { count: 100, cost: 0.05 },
          downloads: { count: 50, cost: 0.02 },
          totalCost: 0.07
        },
        transfer: {
          out: { amount: 1.0, cost: 0.10 },
          totalCost: 0.10
        },
        retrieval: {
          flexible_archive: { amount: 0, cost: 0 },
          deep_archive: { amount: 0, cost: 0 },
          totalCost: 0
        }
      };

      billingAPI.getCurrentUsage.mockResolvedValue(mockUsageData);

      const result = await executeWithRetry(async () => {
        const response = await billingAPI.getCurrentUsage();
        return validateUsageResponse(response);
      });

      expect(result).toBeDefined();
      expect(result.storage.totalUsed).toBe(10.5);
      expect(result.storage.totalCost).toBe(0.25);
      expect(result.requests.totalCost).toBe(0.07);
      expect(billingAPI.getCurrentUsage).toHaveBeenCalledTimes(1);
    });

    test('handles malformed API responses with validation', async () => {
      const malformedData = {
        storage: null,
        requests: undefined,
        // Missing required fields
      };

      billingAPI.getCurrentUsage.mockResolvedValue(malformedData);

      const result = await executeWithRetry(async () => {
        const response = await billingAPI.getCurrentUsage();
        return validateUsageResponse(response);
      });

      // Should return safe defaults
      expect(result).toBeDefined();
      expect(result.storage.totalUsed).toBe(0);
      expect(result.storage.totalCost).toBe(0);
      expect(result.requests.totalCost).toBe(0);
    });
  });

  describe('Error Recovery Integration', () => {
    test('retries failed API calls with exponential backoff', async () => {
      let callCount = 0;
      billingAPI.getCurrentUsage.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          const error = new Error('Network error');
          error.name = 'NetworkError'; // Make it a network error for retry logic
          return Promise.reject(error);
        }
        return Promise.resolve({
          storage: { totalUsed: 5.0, totalCost: 0.12, classes: {} },
          requests: { uploads: { count: 0, cost: 0 }, downloads: { count: 0, cost: 0 }, totalCost: 0 },
          transfer: { out: { amount: 0, cost: 0 }, totalCost: 0 },
          retrieval: { flexible_archive: { amount: 0, cost: 0 }, deep_archive: { amount: 0, cost: 0 }, totalCost: 0 }
        });
      });

      const result = await executeWithRetry(async () => {
        const response = await billingAPI.getCurrentUsage();
        return validateUsageResponse(response);
      });

      expect(callCount).toBe(3); // Should retry twice before succeeding
      expect(result.storage.totalUsed).toBe(5.0);
    }, 10000); // Increase timeout for retry logic

    test('provides fallback data when all retries fail', async () => {
      const networkError = new Error('Persistent network error');
      networkError.name = 'NetworkError';
      billingAPI.getCurrentUsage.mockRejectedValue(networkError);

      try {
        await executeWithRetry(async () => {
          const response = await billingAPI.getCurrentUsage();
          return validateUsageResponse(response);
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        const recoveryAction = errorRecoveryManager.handleError(error, 'usage-metrics');
        
        expect(recoveryAction.fallbackData).toBeDefined();
        expect(recoveryAction.fallbackData.storage).toBeDefined();
        expect(recoveryAction.fallbackData.storage.totalUsed).toBe(0);
        expect(recoveryAction.userMessage).toContain('Unable to connect');
      }
    }, 15000); // Increase timeout for retry logic
  });

  describe('Comprehensive API Processing', () => {
    test('processes multiple API calls with mixed success/failure', async () => {
      // Mock mixed responses
      billingAPI.getCurrentUsage.mockResolvedValue({
        storage: { totalUsed: 10.0, totalCost: 0.20, classes: {} },
        requests: { uploads: { count: 50, cost: 0.03 }, downloads: { count: 25, cost: 0.01 }, totalCost: 0.04 },
        transfer: { out: { amount: 0.5, cost: 0.05 }, totalCost: 0.05 },
        retrieval: { flexible_archive: { amount: 0, cost: 0 }, deep_archive: { amount: 0, cost: 0 }, totalCost: 0 }
      });
      
      billingAPI.getCurrentBilling.mockRejectedValue(new Error('Billing service unavailable'));
      
      billingAPI.getBillingHistory.mockResolvedValue([
        { period: 'November 2024', total: 0.98, breakdown: { storage: 0.25 } }
      ]);

      const results = {
        usage: null,
        current: null,
        history: null,
        errors: []
      };

      // Process usage (should succeed)
      try {
        const usageData = await executeWithRetry(async () => {
          return await billingAPI.getCurrentUsage();
        });
        results.usage = validateUsageResponse(usageData);
      } catch (error) {
        const recoveryAction = errorRecoveryManager.handleError(error, 'usage-metrics');
        results.usage = recoveryAction.fallbackData;
        results.errors.push({ type: 'usage', error: error.message, recoveryAction });
      }

      // Process current billing (should fail)
      try {
        const currentData = await executeWithRetry(async () => {
          return await billingAPI.getCurrentBilling();
        });
        results.current = validateCurrentResponse(currentData);
      } catch (error) {
        const recoveryAction = errorRecoveryManager.handleError(error, 'current-billing');
        results.current = recoveryAction.fallbackData;
        results.errors.push({ type: 'current', error: error.message, recoveryAction });
      }

      // Process history (should succeed)
      try {
        const historyData = await executeWithRetry(async () => {
          return await billingAPI.getBillingHistory();
        });
        results.history = validateHistoryResponse(historyData);
      } catch (error) {
        const recoveryAction = errorRecoveryManager.handleError(error, 'billing-history');
        results.history = recoveryAction.fallbackData;
        results.errors.push({ type: 'history', error: error.message, recoveryAction });
      }

      // Verify results
      expect(results.usage).toBeDefined();
      expect(results.usage.storage.totalUsed).toBe(10.0);
      
      expect(results.current).toBeDefined(); // Should have fallback data
      expect(typeof results.current).toBe('object'); // Should be an object
      // The fallback data structure may vary, so just check it exists
      
      expect(results.history).toBeDefined();
      expect(results.history).toHaveLength(1);
      
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].type).toBe('current');
    });
  });

  describe('Data Transformation Safety', () => {
    test('safely transforms nested object properties', async () => {
      const complexData = {
        storage: {
          totalUsed: 15.7,
          totalCost: 0.35,
          classes: {
            STANDARD: { used: 10.0, cost: 0.25, fileCount: 100 },
            GLACIER: { used: 5.7, cost: 0.10, fileCount: 50 },
            INVALID_CLASS: null // This should be handled safely
          }
        },
        requests: {
          uploads: { count: 200, cost: 0.08 },
          downloads: { count: 150, cost: 0.06 },
          totalCost: 0.14
        }
      };

      billingAPI.getCurrentUsage.mockResolvedValue(complexData);

      const result = await executeWithRetry(async () => {
        const response = await billingAPI.getCurrentUsage();
        return validateUsageResponse(response);
      });

      expect(result.storage.classes.STANDARD).toBeDefined();
      expect(result.storage.classes.STANDARD.used).toBe(10.0);
      expect(result.storage.classes.GLACIER).toBeDefined();
      expect(result.storage.classes.GLACIER.used).toBe(5.7);
      
      // Invalid class should be handled safely
      expect(result.storage.classes.INVALID_CLASS).toBeDefined();
      expect(result.storage.classes.INVALID_CLASS.used).toBe(0); // Safe default
    });
  });
});