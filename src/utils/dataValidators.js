/**
 * Data validation utilities for billing API responses
 * Ensures all billing data is properly validated and sanitized before use
 */

/**
 * Default values for safe data structures
 */
const DEFAULT_STORAGE_CLASS = {
  fileCount: 0,
  totalSize: 0,
  estimatedCost: 0,
  used: 0,
  cost: 0
};

const DEFAULT_REQUEST_DATA = {
  uploads: { count: 0, cost: 0 },
  downloads: { count: 0, cost: 0 },
  totalCost: 0
};

const DEFAULT_TRANSFER_DATA = {
  out: { amount: 0, cost: 0 },
  totalCost: 0
};

const DEFAULT_RETRIEVAL_DATA = {
  flexible_archive: { amount: 0, cost: 0 },
  deep_archive: { amount: 0, cost: 0 },
  totalCost: 0
};

const DEFAULT_USAGE_METRICS = {
  storage: {
    totalUsed: 0,
    totalCost: 0,
    classes: {}
  },
  requests: DEFAULT_REQUEST_DATA,
  transfer: DEFAULT_TRANSFER_DATA,
  retrieval: DEFAULT_RETRIEVAL_DATA,
  pricing: {}
};

/**
 * Validates and ensures a number value is safe for calculations
 * @param {any} value - The value to validate
 * @param {number} defaultValue - Default value if validation fails
 * @returns {number} Safe number value
 */
function validateNumber(value, defaultValue = 0) {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return defaultValue;
}

/**
 * Validates and ensures an object exists with safe property access
 * @param {any} obj - The object to validate
 * @param {object} defaultObj - Default object if validation fails
 * @returns {object} Safe object
 */
function validateObject(obj, defaultObj = {}) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return obj;
  }
  return defaultObj;
}

/**
 * Sanitizes storage class data to ensure all required properties exist
 * @param {any} storageClasses - Raw storage classes data
 * @returns {object} Sanitized storage classes with safe properties
 */
function sanitizeStorageClasses(storageClasses) {
  const sanitized = {};
  
  if (!storageClasses || typeof storageClasses !== 'object') {
    return sanitized;
  }

  Object.keys(storageClasses).forEach(className => {
    const classData = validateObject(storageClasses[className], {});
    
    sanitized[className] = {
      fileCount: validateNumber(classData.fileCount || classData.file_count),
      totalSize: validateNumber(classData.totalSize || classData.total_size || classData.used),
      estimatedCost: validateNumber(classData.estimatedCost || classData.estimated_cost || classData.cost),
      // Keep original properties for backward compatibility
      used: validateNumber(classData.used || classData.totalSize || classData.total_size),
      cost: validateNumber(classData.cost || classData.estimatedCost || classData.estimated_cost)
    };
  });

  return sanitized;
}

/**
 * Validates usage response data from the billing API
 * @param {any} data - Raw usage response data
 * @returns {object} Validated usage data with safe defaults
 */
function validateUsageResponse(data) {
  const validatedData = validateObject(data, {});
  
  // Validate storage data
  const storage = validateObject(validatedData.storage, {});
  const validatedStorage = {
    totalUsed: validateNumber(storage.totalUsed || storage.total_used),
    totalCost: validateNumber(storage.totalCost || storage.total_cost),
    classes: sanitizeStorageClasses(storage.classes)
  };

  // Validate requests data
  const requests = validateObject(validatedData.requests, {});
  const validatedRequests = {
    uploads: {
      count: validateNumber(requests.uploads?.count),
      cost: validateNumber(requests.uploads?.cost)
    },
    downloads: {
      count: validateNumber(requests.downloads?.count),
      cost: validateNumber(requests.downloads?.cost)
    },
    totalCost: validateNumber(requests.totalCost || requests.total_cost)
  };

  // Validate transfer data
  const transfer = validateObject(validatedData.transfer, {});
  const validatedTransfer = {
    out: {
      amount: validateNumber(transfer.out?.amount),
      cost: validateNumber(transfer.out?.cost)
    },
    totalCost: validateNumber(transfer.totalCost || transfer.total_cost)
  };

  // Validate retrieval data
  const retrieval = validateObject(validatedData.retrieval, {});
  const validatedRetrieval = {
    flexible_archive: {
      amount: validateNumber(retrieval.flexible_archive?.amount),
      cost: validateNumber(retrieval.flexible_archive?.cost)
    },
    deep_archive: {
      amount: validateNumber(retrieval.deep_archive?.amount),
      cost: validateNumber(retrieval.deep_archive?.cost)
    },
    totalCost: validateNumber(retrieval.totalCost || retrieval.total_cost)
  };

  // Validate pricing data
  const pricing = validateObject(validatedData.pricing, {});

  return {
    storage: validatedStorage,
    requests: validatedRequests,
    transfer: validatedTransfer,
    retrieval: validatedRetrieval,
    pricing: pricing
  };
}

/**
 * Validates current billing response data
 * @param {any} data - Raw current billing response data
 * @returns {object} Validated current billing data with safe defaults
 */
function validateCurrentResponse(data) {
  const validatedData = validateObject(data, {});
  
  return {
    totalCost: validateNumber(validatedData.totalCost || validatedData.total_cost),
    storageCost: validateNumber(validatedData.storageCost || validatedData.storage_cost),
    requestsCost: validateNumber(validatedData.requestsCost || validatedData.requests_cost),
    transferCost: validateNumber(validatedData.transferCost || validatedData.transfer_cost),
    retrievalCost: validateNumber(validatedData.retrievalCost || validatedData.retrieval_cost),
    period: validatedData.period || 'current',
    currency: validatedData.currency || 'USD',
    lastUpdated: validatedData.lastUpdated || validatedData.last_updated || new Date().toISOString()
  };
}

/**
 * Validates billing history response data
 * @param {any} data - Raw billing history response data
 * @returns {array} Validated billing history array with safe defaults
 */
function validateHistoryResponse(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(item => {
    const validatedItem = validateObject(item, {});
    
    return {
      period: validatedItem.period || 'unknown',
      totalCost: validateNumber(validatedItem.totalCost || validatedItem.total_cost),
      storageCost: validateNumber(validatedItem.storageCost || validatedItem.storage_cost),
      requestsCost: validateNumber(validatedItem.requestsCost || validatedItem.requests_cost),
      transferCost: validateNumber(validatedItem.transferCost || validatedItem.transfer_cost),
      retrievalCost: validateNumber(validatedItem.retrievalCost || validatedItem.retrieval_cost),
      currency: validatedItem.currency || 'USD',
      date: validatedItem.date || validatedItem.created_at || new Date().toISOString(),
      breakdown: validateObject(validatedItem.breakdown, {})
    };
  });
}

/**
 * Validates any billing API response and provides appropriate fallbacks
 * @param {any} response - Raw API response
 * @param {string} responseType - Type of response ('usage', 'current', 'history')
 * @returns {object} Validated response data
 */
function validateBillingResponse(response, responseType = 'usage') {
  try {
    switch (responseType) {
      case 'usage':
        return validateUsageResponse(response);
      case 'current':
        return validateCurrentResponse(response);
      case 'history':
        return validateHistoryResponse(response);
      default:
        console.warn(`Unknown response type: ${responseType}`);
        return validateObject(response, {});
    }
  } catch (error) {
    console.error(`Error validating ${responseType} response:`, error);
    
    // Return appropriate default based on response type
    switch (responseType) {
      case 'usage':
        return DEFAULT_USAGE_METRICS;
      case 'current':
        return { totalCost: 0, currency: 'USD', period: 'current' };
      case 'history':
        return [];
      default:
        return {};
    }
  }
}

export {
  validateUsageResponse,
  validateCurrentResponse,
  validateHistoryResponse,
  sanitizeStorageClasses,
  validateBillingResponse,
  validateNumber,
  validateObject,
  DEFAULT_USAGE_METRICS,
  DEFAULT_STORAGE_CLASS,
  DEFAULT_REQUEST_DATA,
  DEFAULT_TRANSFER_DATA,
  DEFAULT_RETRIEVAL_DATA
};