/**
 * Unit tests for Error Recovery Manager
 */

import {
  classifyError,
  shouldRetry,
  getRetryDelay,
  executeWithRetry,
  generateFallbackData,
  fallbackDataGenerators,
  ErrorRecoveryManager,
  ERROR_TYPES
} from './errorRecovery.js';

describe('Error Classification', () => {
  test('classifies network errors correctly', () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    expect(classifyError(networkError)).toBe(ERROR_TYPES.NETWORK);

    const fetchError = new Error('Failed to fetch');
    expect(classifyError(fetchError)).toBe(ERROR_TYPES.NETWORK);

    const networkCodeError = new Error('Connection failed');
    networkCodeError.code = 'NETWORK_ERROR';
    expect(classifyError(networkCodeError)).toBe(ERROR_TYPES.NETWORK);
  });

  test('classifies API errors correctly', () => {
    const apiError = new Error('Server error');
    apiError.status = 500;
    expect(classifyError(apiError)).toBe(ERROR_TYPES.API);

    const clientError = new Error('Bad request');
    clientError.status = 400;
    expect(classifyError(clientError)).toBe(ERROR_TYPES.API);

    const notFoundError = new Error('Not found');
    notFoundError.status = 404;
    expect(classifyError(notFoundError)).toBe(ERROR_TYPES.API);
  });

  test('classifies validation errors correctly', () => {
    const validationError = new Error('Invalid data format');
    validationError.name = 'ValidationError';
    expect(classifyError(validationError)).toBe(ERROR_TYPES.VALIDATION);

    const dataError = new Error('validation failed');
    expect(classifyError(dataError)).toBe(ERROR_TYPES.VALIDATION);

    const invalidError = new Error('invalid data received');
    expect(classifyError(invalidError)).toBe(ERROR_TYPES.VALIDATION);
  });

  test('classifies runtime errors as default', () => {
    const runtimeError = new Error('Unexpected error');
    expect(classifyError(runtimeError)).toBe(ERROR_TYPES.RUNTIME);

    const typeError = new TypeError('Cannot read property');
    expect(classifyError(typeError)).toBe(ERROR_TYPES.RUNTIME);
  });
});

describe('Retry Logic', () => {
  test('should retry network errors', () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    
    expect(shouldRetry(networkError, 0)).toBe(true);
    expect(shouldRetry(networkError, 1)).toBe(true);
    expect(shouldRetry(networkError, 2)).toBe(true);
    expect(shouldRetry(networkError, 3)).toBe(false); // exceeds max retries
  });

  test('should retry 5xx API errors', () => {
    const serverError = new Error('Internal server error');
    serverError.status = 500;
    
    expect(shouldRetry(serverError, 0)).toBe(true);
    expect(shouldRetry(serverError, 2)).toBe(true);
    
    const badGateway = new Error('Bad gateway');
    badGateway.status = 502;
    expect(shouldRetry(badGateway, 1)).toBe(true);
  });

  test('should not retry 4xx API errors', () => {
    const clientError = new Error('Bad request');
    clientError.status = 400;
    expect(shouldRetry(clientError, 0)).toBe(false);

    const notFound = new Error('Not found');
    notFound.status = 404;
    expect(shouldRetry(notFound, 0)).toBe(false);
  });

  test('should not retry validation or runtime errors', () => {
    const validationError = new Error('Invalid data');
    validationError.name = 'ValidationError';
    expect(shouldRetry(validationError, 0)).toBe(false);

    const runtimeError = new Error('Unexpected error');
    expect(shouldRetry(runtimeError, 0)).toBe(false);
  });

  test('respects custom retry configuration', () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    
    const customConfig = { maxRetries: 1 };
    expect(shouldRetry(networkError, 0, customConfig)).toBe(true);
    expect(shouldRetry(networkError, 1, customConfig)).toBe(false);
  });
});

describe('Retry Delay Calculation', () => {
  test('calculates exponential backoff correctly', () => {
    expect(getRetryDelay(0)).toBe(1000);  // 1s
    expect(getRetryDelay(1)).toBe(2000);  // 2s
    expect(getRetryDelay(2)).toBe(4000);  // 4s
    expect(getRetryDelay(3)).toBe(8000);  // 8s (max)
    expect(getRetryDelay(4)).toBe(8000);  // still 8s (capped)
  });

  test('respects custom configuration', () => {
    const config = {
      baseDelay: 500,
      maxDelay: 3000,
      backoffMultiplier: 3
    };
    
    expect(getRetryDelay(0, config)).toBe(500);   // 500ms
    expect(getRetryDelay(1, config)).toBe(1500);  // 1.5s
    expect(getRetryDelay(2, config)).toBe(3000);  // 3s (capped)
    expect(getRetryDelay(3, config)).toBe(3000);  // still 3s
  });
});

describe('Execute with Retry', () => {
  test('succeeds on first attempt', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    
    const result = await executeWithRetry(mockFn);
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('retries on network error and eventually succeeds', async () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    
    const mockFn = jest.fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');
    
    // Use very short delays for testing
    const config = { maxRetries: 3, baseDelay: 1, maxDelay: 10, backoffMultiplier: 2 };
    
    const result = await executeWithRetry(mockFn, config);
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test('fails after max retries', async () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    
    const mockFn = jest.fn().mockRejectedValue(networkError);
    
    // Use very short delays and fewer retries for testing
    const config = { maxRetries: 1, baseDelay: 1, maxDelay: 10, backoffMultiplier: 2 };
    
    await expect(executeWithRetry(mockFn, config)).rejects.toThrow('fetch failed');
    expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });

  test('does not retry non-retryable errors', async () => {
    const validationError = new Error('Invalid data');
    validationError.name = 'ValidationError';
    
    const mockFn = jest.fn().mockRejectedValue(validationError);
    
    await expect(executeWithRetry(mockFn)).rejects.toThrow('Invalid data');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe('Fallback Data Generators', () => {
  test('generates valid usage metrics fallback', () => {
    const fallback = fallbackDataGenerators.usageMetrics();
    
    expect(fallback).toHaveProperty('storage');
    expect(fallback.storage).toHaveProperty('totalUsed', 0);
    expect(fallback.storage).toHaveProperty('totalCost', 0);
    expect(fallback.storage).toHaveProperty('classes', {});
    
    expect(fallback).toHaveProperty('requests');
    expect(fallback.requests.uploads).toEqual({ count: 0, cost: 0 });
    expect(fallback.requests.downloads).toEqual({ count: 0, cost: 0 });
    expect(fallback.requests).toHaveProperty('totalCost', 0);
    
    expect(fallback).toHaveProperty('transfer');
    expect(fallback.transfer.out).toEqual({ amount: 0, cost: 0 });
    expect(fallback.transfer).toHaveProperty('totalCost', 0);
    
    expect(fallback).toHaveProperty('retrieval');
    expect(fallback.retrieval.flexible_archive).toEqual({ amount: 0, cost: 0 });
    expect(fallback.retrieval.deep_archive).toEqual({ amount: 0, cost: 0 });
    expect(fallback.retrieval).toHaveProperty('totalCost', 0);
  });

  test('generates valid current billing fallback', () => {
    const fallback = fallbackDataGenerators.currentBilling();
    
    expect(fallback).toHaveProperty('currentMonth');
    expect(fallback.currentMonth).toEqual({
      total: 0,
      storage: 0,
      requests: 0,
      transfer: 0,
      retrieval: 0
    });
    
    expect(fallback).toHaveProperty('projectedMonth');
    expect(fallback.projectedMonth).toEqual({
      total: 0,
      storage: 0,
      requests: 0,
      transfer: 0,
      retrieval: 0
    });
  });

  test('generates valid storage class fallback', () => {
    const fallback = fallbackDataGenerators.storageClass('intelligent_tiering');
    
    expect(fallback).toEqual({
      fileCount: 0,
      totalSize: 0,
      estimatedCost: 0,
      used: 0,
      cost: 0,
      className: 'intelligent_tiering'
    });
  });

  test('generates valid pricing fallback', () => {
    const fallback = fallbackDataGenerators.pricing();
    
    expect(fallback).toHaveProperty('storage');
    expect(fallback.storage).toHaveProperty('standard');
    expect(fallback.storage).toHaveProperty('glacier_deep');
    
    expect(fallback).toHaveProperty('requests');
    expect(fallback.requests).toHaveProperty('put');
    expect(fallback.requests).toHaveProperty('get');
    
    expect(fallback).toHaveProperty('transfer');
    expect(fallback.transfer).toHaveProperty('out');
    
    expect(fallback).toHaveProperty('retrieval');
    expect(fallback.retrieval).toHaveProperty('flexible_archive');
    expect(fallback.retrieval).toHaveProperty('deep_archive');
  });

  test('generateFallbackData works with valid types', () => {
    const usageData = generateFallbackData('usageMetrics');
    expect(usageData).toHaveProperty('storage');
    
    const billingData = generateFallbackData('currentBilling');
    expect(billingData).toHaveProperty('currentMonth');
    
    const historyData = generateFallbackData('billingHistory');
    expect(Array.isArray(historyData)).toBe(true);
  });

  test('generateFallbackData handles invalid types', () => {
    console.warn = jest.fn();
    
    const result = generateFallbackData('invalidType');
    
    expect(result).toEqual({});
    expect(console.warn).toHaveBeenCalledWith(
      'No fallback generator found for data type: invalidType'
    );
  });
});

describe('ErrorRecoveryManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ErrorRecoveryManager();
    console.warn = jest.fn();
  });

  test('handles network errors correctly', () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    
    const recovery = manager.handleError(networkError, 'usage-metrics');
    
    expect(recovery.type).toBe(ERROR_TYPES.NETWORK);
    expect(recovery.recoverable).toBe(true);
    expect(recovery.shouldRetry).toBe(true);
    expect(recovery.fallbackData).toHaveProperty('storage');
    expect(recovery.userMessage).toContain('internet connection');
  });

  test('handles API errors correctly', () => {
    const apiError = new Error('Server error');
    apiError.status = 500;
    
    const recovery = manager.handleError(apiError, 'current-billing');
    
    expect(recovery.type).toBe(ERROR_TYPES.API);
    expect(recovery.recoverable).toBe(true);
    expect(recovery.shouldRetry).toBe(true);
    expect(recovery.fallbackData).toHaveProperty('currentMonth');
    expect(recovery.userMessage).toContain('temporarily unavailable');
  });

  test('handles validation errors correctly', () => {
    const validationError = new Error('Invalid data');
    validationError.name = 'ValidationError';
    
    const recovery = manager.handleError(validationError, 'billing-history');
    
    expect(recovery.type).toBe(ERROR_TYPES.VALIDATION);
    expect(recovery.recoverable).toBe(false);
    expect(recovery.shouldRetry).toBe(false);
    expect(Array.isArray(recovery.fallbackData)).toBe(true);
    expect(recovery.userMessage).toContain('invalid data');
  });

  test('circuit breaker opens after threshold failures', () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    
    // Trigger failures up to threshold
    for (let i = 0; i < 5; i++) {
      manager.handleError(networkError, 'usage-metrics');
    }
    
    expect(manager.circuitBreaker.isOpen).toBe(true);
    
    // Next error should not be retryable due to open circuit
    const recovery = manager.handleError(networkError, 'usage-metrics');
    expect(recovery.shouldRetry).toBe(false);
  });

  test('provides correct fallback data for different contexts', () => {
    const error = new Error('Test error');
    
    const usageRecovery = manager.handleError(error, 'usage-metrics');
    expect(usageRecovery.fallbackData).toHaveProperty('storage');
    
    const billingRecovery = manager.handleError(error, 'current-billing');
    expect(billingRecovery.fallbackData).toHaveProperty('currentMonth');
    
    const historyRecovery = manager.handleError(error, 'billing-history');
    expect(Array.isArray(historyRecovery.fallbackData)).toBe(true);
    
    const unknownRecovery = manager.handleError(error, 'unknown-context');
    expect(unknownRecovery.fallbackData).toHaveProperty('storage'); // defaults to usageMetrics
  });

  test('tracks error statistics correctly', () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    
    const apiError = new Error('Server error');
    apiError.status = 500;
    
    manager.handleError(networkError, 'test');
    manager.handleError(apiError, 'test');
    manager.handleError(networkError, 'test');
    
    const stats = manager.getErrorStats();
    
    expect(stats.totalErrors).toBe(3);
    expect(stats.errorsByType[ERROR_TYPES.NETWORK]).toBe(2);
    expect(stats.errorsByType[ERROR_TYPES.API]).toBe(1);
  });

  test('resets circuit breaker correctly', () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    
    // Trigger circuit breaker
    for (let i = 0; i < 5; i++) {
      manager.handleError(networkError, 'test');
    }
    
    expect(manager.circuitBreaker.isOpen).toBe(true);
    
    manager.resetCircuitBreaker();
    
    expect(manager.circuitBreaker.isOpen).toBe(false);
    expect(manager.circuitBreaker.failures).toBe(0);
    expect(manager.circuitBreaker.lastFailure).toBe(null);
  });

  test('generates appropriate user messages for different error types', () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    
    const serverError = new Error('Server error');
    serverError.status = 500;
    
    const clientError = new Error('Bad request');
    clientError.status = 400;
    
    const validationError = new Error('Invalid data');
    validationError.name = 'ValidationError';
    
    const runtimeError = new Error('Unexpected error');
    
    expect(manager.getUserMessage(networkError, ERROR_TYPES.NETWORK))
      .toContain('internet connection');
    expect(manager.getUserMessage(serverError, ERROR_TYPES.API))
      .toContain('temporarily unavailable');
    expect(manager.getUserMessage(clientError, ERROR_TYPES.API))
      .toContain('try refreshing');
    expect(manager.getUserMessage(validationError, ERROR_TYPES.VALIDATION))
      .toContain('invalid data');
    expect(manager.getUserMessage(runtimeError, ERROR_TYPES.RUNTIME))
      .toContain('unexpected error');
  });
});