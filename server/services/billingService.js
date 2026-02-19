/**
 * Billing Service
 * Handles billing calculations and tracking
 */

const { randomUUID } = require('crypto');
const { addBillingActivity } = require('../models/Billing');

// Track billing activity
const trackBillingActivity = async (userId, activityType, details) => {
  try {
    const activity = {
      id: randomUUID(),
      userId: userId,
      type: activityType, // 'storage', 'request_upload', 'request_download', 'transfer_out', 'retrieval'
      timestamp: new Date().toISOString(),
      details: details,
      cost: details.cost || 0
    };

    await addBillingActivity(userId, activity);
    return activity;
  } catch (error) {
    console.error('Error tracking billing activity:', error);
    throw error;
  }
};

// Calculate storage costs with hardcoded pricing
const calculateStorageCost = (fileSize, storageClass) => {
  // Hardcoded pricing per GB/month with margins
  const pricing = {
    'STANDARD': 0.023 * 1.3,
    'STANDARD_IA': 0.0125 * 1.35,
    'ONEZONE_IA': 0.01 * 1.4,
    'GLACIER_IR': 0.004 * 1.45,
    'GLACIER': 0.0036 * 1.5,
    'DEEP_ARCHIVE': 0.00099 * 1.6
  };

  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  const pricePerGB = pricing[storageClass] || pricing['STANDARD'];

  return fileSizeGB * pricePerGB;
};

// Calculate request costs with hardcoded pricing
const calculateRequestCost = (requestType, requestCount = 1) => {
  const pricing = {
    'upload': 0.05 * 1.3, // per 1000 requests
    'download': 0.004 * 1.3 // per 1000 requests
  };

  const pricePerThousand = pricing[requestType] || 0;
  return (requestCount / 1000) * pricePerThousand;
};

// Calculate data transfer costs with hardcoded pricing
const calculateTransferCost = (transferSizeGB, freeAllowanceUsed = 0) => {
  const freeAllowance = 10; // 10 GB free per month
  const pricePerGB = 0.10 * 1.3; // $0.10 per GB with margin

  const remainingFreeAllowance = Math.max(0, freeAllowance - freeAllowanceUsed);
  const billableTransfer = Math.max(0, transferSizeGB - remainingFreeAllowance);

  return billableTransfer * pricePerGB;
};

// Get billing details for a user
const getBillingDetails = async (userId) => {
  try {
    const { readBilling } = require('../models/Billing');
    const billingData = await readBilling(userId);

    // Calculate current month totals
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const currentMonthActivities = billingData.filter(activity =>
      activity.timestamp.startsWith(currentMonth)
    );

    const totalCost = currentMonthActivities.reduce((sum, activity) => sum + (activity.cost || 0), 0);
    const totalRequests = currentMonthActivities.filter(activity =>
      activity.type.startsWith('request_')
    ).length;

    return {
      currentMonth: {
        totalCost,
        totalRequests,
        activities: currentMonthActivities.length
      },
      pricing: {
        storage: {
          lightning_fast: { price: 0.023 * 1.3 },
          smart_saver: { price: 0.0125 * 1.35 },
          budget_smart: { price: 0.01 * 1.4 },
          archive_pro: { price: 0.004 * 1.45 },
          deep_freeze: { price: 0.0036 * 1.5 },
          vault_keeper: { price: 0.00099 * 1.6 }
        },
        requests: {
          uploads: { price: 0.05 * 1.3 },
          downloads: { price: 0.004 * 1.3 }
        },
        transfer: {
          out: { price: 0.10 * 1.3, freeAllowance: 10 }
        }
      }
    };
  } catch (error) {
    console.error('Error getting billing details:', error);
    throw error;
  }
};

// Get billing history for a user
const getBillingHistory = async (userId) => {
  try {
    const { readBilling } = require('../models/Billing');
    const billingData = await readBilling(userId);

    // Group by month
    const monthlyData = billingData.reduce((acc, activity) => {
      const month = activity.timestamp.slice(0, 7); // YYYY-MM format
      if (!acc[month]) {
        acc[month] = {
          month,
          totalCost: 0,
          activities: [],
          requestCount: 0,
          storageActivities: 0
        };
      }

      acc[month].totalCost += activity.cost || 0;
      acc[month].activities.push(activity);

      if (activity.type.startsWith('request_')) {
        acc[month].requestCount++;
      } else if (activity.type === 'storage') {
        acc[month].storageActivities++;
      }

      return acc;
    }, {});

    // Convert to array and sort by month (newest first)
    return Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month));
  } catch (error) {
    console.error('Error getting billing history:', error);
    throw error;
  }
};

// Get current usage for a user
const getCurrentUsage = async (userId) => {
  try {
    const { readFiles } = require('../models/File');
    const files = await readFiles(userId);

    const totalStorage = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    const totalFiles = files.length;
    const estimatedMonthlyCost = files.reduce((sum, file) => sum + (file.estimatedMonthlyCost || 0), 0);

    // Storage class breakdown
    const storageClassUsage = files.reduce((acc, file) => {
      const storageClass = file.storageClass || 'STANDARD';
      if (!acc[storageClass]) {
        acc[storageClass] = {
          fileCount: 0,
          totalSize: 0,
          estimatedCost: 0
        };
      }

      acc[storageClass].fileCount++;
      acc[storageClass].totalSize += file.fileSize || 0;
      acc[storageClass].estimatedCost += file.estimatedMonthlyCost || 0;

      return acc;
    }, {});

    // Get pricing structure
    const pricingStructure = {
      storage: {
        lightning_fast: { price: 0.023 * 1.3 },
        smart_saver: { price: 0.0125 * 1.35 },
        budget_smart: { price: 0.01 * 1.4 },
        archive_pro: { price: 0.004 * 1.45 },
        deep_freeze: { price: 0.0036 * 1.5 },
        vault_keeper: { price: 0.00099 * 1.6 }
      },
      requests: {
        uploads: { price: 0.05 * 1.3 },
        downloads: { price: 0.004 * 1.3 }
      },
      transfer: {
        out: { price: 0.10 * 1.3, freeAllowance: 10 }
      }
    };

    return {
      totalStorage,
      totalFiles,
      estimatedMonthlyCost,
      storageClassUsage,
      lastUpdated: new Date().toISOString(),
      pricing: pricingStructure,
      // Add frontend-compatible structure
      storage: {
        totalUsed: totalStorage,
        totalCost: estimatedMonthlyCost,
        classes: storageClassUsage
      }
    };
  } catch (error) {
    console.error('Error getting current usage:', error);
    throw error;
  }
};

module.exports = {
  trackBillingActivity,
  calculateStorageCost,
  calculateRequestCost,
  calculateTransferCost,
  getBillingDetails,
  getBillingHistory,
  getCurrentUsage
};