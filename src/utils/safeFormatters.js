/**
 * Safe formatting utilities for handling null/undefined values gracefully
 * Prevents runtime errors when formatting potentially missing data
 */

/**
 * Safely formats storage size in GB with proper null/undefined handling
 * @param {number|null|undefined} sizeInGB - Size in gigabytes
 * @returns {string} Formatted storage size string
 */
export const formatStorageSize = (sizeInGB) => {
  // Handle null, undefined, or non-numeric values
  if (sizeInGB == null || typeof sizeInGB !== 'number' || isNaN(sizeInGB)) {
    return '0.00 GB';
  }

  // Handle negative values
  if (sizeInGB < 0) {
    return '0.00 GB';
  }

  // Format based on size magnitude
  if (sizeInGB >= 1024) {
    const sizeInTB = sizeInGB / 1024;
    return `${sizeInTB.toFixed(2)} TB`;
  } else if (sizeInGB >= 1) {
    return `${sizeInGB.toFixed(2)} GB`;
  } else if (sizeInGB >= 0.001) {
    const sizeInMB = sizeInGB * 1024;
    return `${sizeInMB.toFixed(2)} MB`;
  } else if (sizeInGB > 0) {
    const sizeInKB = sizeInGB * 1024 * 1024;
    return `${sizeInKB.toFixed(2)} KB`;
  } else {
    return '0.00 GB';
  }
};

/**
 * Safely formats currency amounts with proper null/undefined handling
 * @param {number|null|undefined} amount - Currency amount
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = '$') => {
  // Handle null, undefined, or non-numeric values
  if (amount == null || typeof amount !== 'number' || isNaN(amount)) {
    return `${currency}0.00`;
  }

  // Handle negative values (show as $0.00 for billing context)
  if (amount < 0) {
    return `${currency}0.00`;
  }

  // Format with 2 decimal places
  return `${currency}${amount.toFixed(2)}`;
};

/**
 * Safely formats numeric values with proper null/undefined handling
 * @param {number|null|undefined} value - Numeric value to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 0) => {
  // Handle null, undefined, or non-numeric values
  if (value == null || typeof value !== 'number' || isNaN(value)) {
    return '0';
  }

  // Handle negative values
  if (value < 0) {
    return '0';
  }

  // Ensure decimals is a valid number
  const safeDecimals = Math.max(0, Math.floor(decimals || 0));

  // Format with specified decimal places
  if (safeDecimals > 0) {
    return value.toFixed(safeDecimals);
  } else {
    return Math.floor(value).toString();
  }
};

/**
 * Safely formats percentage values with proper null/undefined handling
 * @param {number|null|undefined} value - Percentage value (0-100)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value) => {
  // Handle null, undefined, or non-numeric values
  if (value == null || typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }

  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  
  return `${clampedValue.toFixed(1)}%`;
};

// Default export with all formatters
export default {
  formatStorageSize,
  formatCurrency,
  formatNumber,
  formatPercentage
};