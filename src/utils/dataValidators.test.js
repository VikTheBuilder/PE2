/**
 * Unit tests for data validation utilities
 * Tests various malformed data scenarios and edge cases
 */

import {
  validateUsageResponse,
  validateCurrentResponse,
  validateHistoryResponse,
  sanitizeStorageClasses,
  validateBillingResponse,
  validateNumber,
  validateObject,
  DEFAULT_USAGE_METRICS,
  DEFAULT_STORAGE_CLASS
} from './dataValidators.js';

describe('validateNumber', () => {
  test('should return valid numbers unchanged', () => {
    expect(validateNumber(42)).toBe(42);
    expect(validateNumber(0)).toBe(0);
    expect(validateNumber(-5.5)).toBe(-5.5);
    expect(validateNumber(3.14159)).toBe(3.14159);
  });

  test('should return default for invalid values', () => {
    expect(validateNumber(null)).toBe(0);
    expect(validateNumber(undefined)).toBe(0);
    expect(validateNumber('string')).toBe(0);
    expect(validateNumber(NaN)).toBe(0);
    expect(validateNumber(Infinity)).toBe(0);
    expect(validateNumber(-Infinity)).toBe(0);
    expect(validateNumber({})).toBe(0);
    expect(validateNumber([])).toBe(0);
  });

  test('should use custom default value', () => {
    expect(validateNumber(null, 100)).toBe(100);
    expect(validateNumber(undefined, -1)).toBe(-1);
    expect(validateNumber('invalid', 42)).toBe(42);
  });
});

describe('validateObject', () => {
  test('should return valid objects unchanged', () => {
    const obj = { a: 1, b: 'test' };
    expect(validateObject(obj)).toBe(obj);
    expect(validateObject({})).toEqual({});
  });

  test('should return default for invalid values', () => {
    expect(validateObject(null)).toEqual({});
    expect(validateObject(undefined)).toEqual({});
    expect(validateObject('string')).toEqual({});
    expect(validateObject(42)).toEqual({});
    expect(validateObject([])).toEqual({});
    expect(validateObject(true)).toEqual({});
  });

  test('should use custom default object', () => {
    const defaultObj = { default: true };
    expect(validateObject(null, defaultObj)).toBe(defaultObj);
    expect(validateObject(undefined, defaultObj)).toBe(defaultObj);
  });
});

describe('sanitizeStorageClasses', () => {
  test('should handle valid storage class data', () => {
    const input = {
      standard: {
        fileCount: 10,
        totalSize: 5.5,
        estimatedCost: 0.12
      },
      glacier: {
        file_count: 5,
        total_size: 100,
        estimated_cost: 2.5
      }
    };

    const result = sanitizeStorageClasses(input);
    
    expect(result.standard).toEqual({
      fileCount: 10,
      totalSize: 5.5,
      estimatedCost: 0.12,
      used: 5.5,
      cost: 0.12
    });

    expect(result.glacier).toEqual({
      fileCount: 5,
      totalSize: 100,
      estimatedCost: 2.5,
      used: 100,
      cost: 2.5
    });
  });

  test('should handle malformed storage class data', () => {
    const input = {
      standard: {
        fileCount: 'invalid',
        totalSize: null,
        estimatedCost: undefined
      },
      glacier: null,
      archive: 'not an object'
    };

    const result = sanitizeStorageClasses(input);
    
    expect(result.standard).toEqual({
      fileCount: 0,
      totalSize: 0,
      estimatedCost: 0,
      used: 0,
      cost: 0
    });

    expect(result.glacier).toEqual({
      fileCount: 0,
      totalSize: 0,
      estimatedCost: 0,
      used: 0,
      cost: 0
    });

    expect(result.archive).toEqual({
      fileCount: 0,
      totalSize: 0,
      estimatedCost: 0,
      used: 0,
      cost: 0
    });
  });

  test('should handle null/undefined input', () => {
    expect(sanitizeStorageClasses(null)).toEqual({});
    expect(sanitizeStorageClasses(undefined)).toEqual({});
    expect(sanitizeStorageClasses('not an object')).toEqual({});
    expect(sanitizeStorageClasses(42)).toEqual({});
  });

  test('should handle mixed property names', () => {
    const input = {
      mixed: {
        used: 10,
        cost: 5,
        file_count: 3
      }
    };

    const result = sanitizeStorageClasses(input);
    
    expect(result.mixed).toEqual({
      fileCount: 3,
      totalSize: 10,
      estimatedCost: 5,
      used: 10,
      cost: 5
    });
  });
});

describe('validateUsageResponse', () => {
  test('should handle valid usage response', () => {
    const input = {
      storage: {
        totalUsed: 100.5,
        totalCost: 2.5,
        classes: {
          standard: { fileCount: 10, totalSize: 50, estimatedCost: 1.2 }
        }
      },
      requests: {
        uploads: { count: 100, cost: 0.5 },
        downloads: { count: 50, cost: 0.25 },
        totalCost: 0.75
      },
      transfer: {
        out: { amount: 10, cost: 0.9 },
        totalCost: 0.9
      },
      retrieval: {
        flexible_archive: { amount: 5, cost: 0.1 },
        deep_archive: { amount: 2, cost: 0.05 },
        totalCost: 0.15
      },
      pricing: { region: 'us-east-1' }
    };

    const result = validateUsageResponse(input);
    
    expect(result.storage.totalUsed).toBe(100.5);
    expect(result.storage.totalCost).toBe(2.5);
    expect(result.requests.uploads.count).toBe(100);
    expect(result.transfer.out.amount).toBe(10);
    expect(result.retrieval.flexible_archive.cost).toBe(0.1);
    expect(result.pricing.region).toBe('us-east-1');
  });

  test('should handle completely malformed usage response', () => {
    const malformedInputs = [
      null,
      undefined,
      'string',
      42,
      [],
      { completely: 'wrong' }
    ];

    malformedInputs.forEach(input => {
      const result = validateUsageResponse(input);
      
      expect(result.storage.totalUsed).toBe(0);
      expect(result.storage.totalCost).toBe(0);
      expect(result.storage.classes).toEqual({});
      expect(result.requests.uploads.count).toBe(0);
      expect(result.requests.totalCost).toBe(0);
      expect(result.transfer.totalCost).toBe(0);
      expect(result.retrieval.totalCost).toBe(0);
    });
  });

  test('should handle partial usage response data', () => {
    const input = {
      storage: {
        totalUsed: 'invalid',
        classes: null
      },
      requests: {
        uploads: { count: 10 }, // missing cost
        downloads: null
      }
      // missing transfer and retrieval
    };

    const result = validateUsageResponse(input);
    
    expect(result.storage.totalUsed).toBe(0);
    expect(result.storage.classes).toEqual({});
    expect(result.requests.uploads.count).toBe(10);
    expect(result.requests.uploads.cost).toBe(0);
    expect(result.requests.downloads.count).toBe(0);
    expect(result.transfer.out.amount).toBe(0);
    expect(result.retrieval.flexible_archive.amount).toBe(0);
  });

  test('should handle snake_case property names', () => {
    const input = {
      storage: {
        total_used: 50,
        total_cost: 1.5
      },
      requests: {
        total_cost: 0.5
      },
      transfer: {
        total_cost: 0.3
      },
      retrieval: {
        total_cost: 0.1
      }
    };

    const result = validateUsageResponse(input);
    
    expect(result.storage.totalUsed).toBe(50);
    expect(result.storage.totalCost).toBe(1.5);
    expect(result.requests.totalCost).toBe(0.5);
    expect(result.transfer.totalCost).toBe(0.3);
    expect(result.retrieval.totalCost).toBe(0.1);
  });
});

describe('validateCurrentResponse', () => {
  test('should handle valid current response', () => {
    const input = {
      totalCost: 10.5,
      storageCost: 5.0,
      requestsCost: 2.0,
      transferCost: 2.5,
      retrievalCost: 1.0,
      period: 'monthly',
      currency: 'USD',
      lastUpdated: '2023-01-01T00:00:00Z'
    };

    const result = validateCurrentResponse(input);
    
    expect(result.totalCost).toBe(10.5);
    expect(result.storageCost).toBe(5.0);
    expect(result.period).toBe('monthly');
    expect(result.currency).toBe('USD');
    expect(result.lastUpdated).toBe('2023-01-01T00:00:00Z');
  });

  test('should handle malformed current response', () => {
    const malformedInputs = [null, undefined, 'string', 42, []];

    malformedInputs.forEach(input => {
      const result = validateCurrentResponse(input);
      
      expect(result.totalCost).toBe(0);
      expect(result.storageCost).toBe(0);
      expect(result.period).toBe('current');
      expect(result.currency).toBe('USD');
      expect(typeof result.lastUpdated).toBe('string');
    });
  });

  test('should handle snake_case property names', () => {
    const input = {
      total_cost: 15.5,
      storage_cost: 8.0,
      requests_cost: 3.0,
      transfer_cost: 3.5,
      retrieval_cost: 1.0,
      last_updated: '2023-02-01T00:00:00Z'
    };

    const result = validateCurrentResponse(input);
    
    expect(result.totalCost).toBe(15.5);
    expect(result.storageCost).toBe(8.0);
    expect(result.lastUpdated).toBe('2023-02-01T00:00:00Z');
  });
});

describe('validateHistoryResponse', () => {
  test('should handle valid history response', () => {
    const input = [
      {
        period: '2023-01',
        totalCost: 10.0,
        storageCost: 5.0,
        currency: 'USD',
        date: '2023-01-31T23:59:59Z'
      },
      {
        period: '2023-02',
        total_cost: 12.0,
        storage_cost: 6.0,
        currency: 'USD',
        created_at: '2023-02-28T23:59:59Z'
      }
    ];

    const result = validateHistoryResponse(input);
    
    expect(result).toHaveLength(2);
    expect(result[0].totalCost).toBe(10.0);
    expect(result[0].period).toBe('2023-01');
    expect(result[1].totalCost).toBe(12.0);
    expect(result[1].date).toBe('2023-02-28T23:59:59Z');
  });

  test('should handle non-array input', () => {
    const malformedInputs = [null, undefined, 'string', 42, {}];

    malformedInputs.forEach(input => {
      const result = validateHistoryResponse(input);
      expect(result).toEqual([]);
    });
  });

  test('should handle array with malformed items', () => {
    const input = [
      null,
      'string',
      42,
      {
        period: 'valid',
        totalCost: 'invalid',
        storageCost: null
      },
      {}
    ];

    const result = validateHistoryResponse(input);
    
    expect(result).toHaveLength(5);
    expect(result[0].period).toBe('unknown');
    expect(result[0].totalCost).toBe(0);
    expect(result[3].period).toBe('valid');
    expect(result[3].totalCost).toBe(0);
    expect(result[3].storageCost).toBe(0);
  });
});

describe('validateBillingResponse', () => {
  test('should route to correct validator based on type', () => {
    const usageData = { storage: { totalUsed: 100 } };
    const currentData = { totalCost: 50 };
    const historyData = [{ period: '2023-01' }];

    const usageResult = validateBillingResponse(usageData, 'usage');
    const currentResult = validateBillingResponse(currentData, 'current');
    const historyResult = validateBillingResponse(historyData, 'history');

    expect(usageResult.storage.totalUsed).toBe(100);
    expect(currentResult.totalCost).toBe(50);
    expect(historyResult).toHaveLength(1);
  });

  test('should handle unknown response types', () => {
    const data = { test: 'data' };
    const result = validateBillingResponse(data, 'unknown');
    
    expect(result.test).toBe('data');
  });

  test('should handle validation errors gracefully', () => {
    // Simulate error by passing invalid data that might cause exceptions
    const result = validateBillingResponse(null, 'usage');
    
    expect(result.storage.totalUsed).toBe(0);
    expect(result.storage.totalCost).toBe(0);
  });
});

describe('Edge cases and error scenarios', () => {
  test('should handle deeply nested null values', () => {
    const input = {
      storage: {
        classes: {
          standard: {
            nested: {
              deep: {
                value: null
              }
            }
          }
        }
      }
    };

    const result = validateUsageResponse(input);
    expect(result.storage.classes.standard.fileCount).toBe(0);
  });

  test('should handle circular references safely', () => {
    const circular = { a: 1 };
    circular.self = circular;

    // Should not throw an error
    expect(() => validateObject(circular)).not.toThrow();
  });

  test('should handle very large numbers', () => {
    const largeNumber = Number.MAX_SAFE_INTEGER;
    expect(validateNumber(largeNumber)).toBe(largeNumber);
    
    const tooLarge = Number.MAX_SAFE_INTEGER + 1;
    expect(validateNumber(tooLarge)).toBe(tooLarge); // Still valid, just not safe
  });

  test('should handle empty arrays and objects', () => {
    expect(validateHistoryResponse([])).toEqual([]);
    expect(validateUsageResponse({})).toBeDefined();
    expect(sanitizeStorageClasses({})).toEqual({});
  });
});