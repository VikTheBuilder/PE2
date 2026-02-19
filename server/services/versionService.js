/**
 * Version Service
 * Handles file versioning business logic and optimization
 */

const { 
  getVersionHistory, 
  restoreVersion, 
  deleteVersion, 
  getVersionById,
  updateVersionMetadata,
  readFiles,
  writeFiles 
} = require('../models/File');
const { deleteFileFromS3, uploadFileToS3 } = require('./awsService');
const { getStorageClassCost } = require('./storageService');
const { trackBillingActivity } = require('./billingService');

// Version retention policies
const VERSION_RETENTION_POLICIES = {
  FREE: {
    maxVersions: 3,
    autoDeleteAfterDays: 30,
    allowedStorageClasses: ['STANDARD', 'STANDARD_IA']
  },
  PRO: {
    maxVersions: 10,
    autoDeleteAfterDays: 90,
    allowedStorageClasses: ['STANDARD', 'STANDARD_IA', 'ONEZONE_IA', 'GLACIER_IR']
  },
  BUSINESS: {
    maxVersions: -1, // Unlimited
    autoDeleteAfterDays: 365,
    allowedStorageClasses: ['STANDARD', 'STANDARD_IA', 'ONEZONE_IA', 'GLACIER_IR', 'GLACIER', 'DEEP_ARCHIVE']
  }
};

// Get version history with cost analysis
const getVersionHistoryWithCosts = async (userId, fileId) => {
  const history = await getVersionHistory(userId, fileId);
  
  // Calculate costs for each version
  history.versions = history.versions.map(version => ({
    ...version,
    monthlyCost: calculateVersionCost(version),
    storageClassInfo: getStorageClassInfo(version.storageClass)
  }));
  
  // Calculate total costs
  const totalMonthlyCost = history.versions.reduce((sum, v) => sum + v.monthlyCost, 0);
  const totalSize = history.versions.reduce((sum, v) => sum + v.fileSize, 0);
  
  return {
    ...history,
    totalMonthlyCost,
    totalSize,
    costBreakdown: calculateCostBreakdown(history.versions)
  };
};

// Calculate cost for a single version
const calculateVersionCost = (version) => {
  const fileSizeGB = version.fileSize / (1024 * 1024 * 1024);
  const costPerGB = getStorageClassCost(version.storageClass);
  return fileSizeGB * costPerGB;
};

// Get storage class info for display
const getStorageClassInfo = (storageClass) => {
  const storageClasses = {
    'STANDARD': { name: '⚡ Lightning Fast', color: '#3B82F6' },
    'STANDARD_IA': { name: '💎 Smart Saver', color: '#10B981' },
    'ONEZONE_IA': { name: '🎯 Budget Smart', color: '#F59E0B' },
    'GLACIER_IR': { name: '🏔️ Archive Pro', color: '#8B5CF6' },
    'GLACIER': { name: '🧊 Deep Freeze', color: '#EC4899' },
    'DEEP_ARCHIVE': { name: '🏛️ Vault Keeper', color: '#6B7280' }
  };
  return storageClasses[storageClass] || storageClasses['STANDARD'];
};

// Calculate cost breakdown by storage class
const calculateCostBreakdown = (versions) => {
  const breakdown = {};
  
  versions.forEach(version => {
    const storageClass = version.storageClass;
    if (!breakdown[storageClass]) {
      breakdown[storageClass] = {
        count: 0,
        totalSize: 0,
        totalCost: 0,
        info: getStorageClassInfo(storageClass)
      };
    }
    
    breakdown[storageClass].count++;
    breakdown[storageClass].totalSize += version.fileSize;
    breakdown[storageClass].totalCost += version.monthlyCost;
  });
  
  return breakdown;
};

// Optimize version storage (move old versions to cheaper storage)
const optimizeVersionStorage = async (userId, fileId, options = {}) => {
  const { 
    daysThreshold = 30,
    targetStorageClass = 'STANDARD_IA',
    skipActiveVersion = true 
  } = options;
  
  const files = await readFiles(userId);
  const fileIndex = files.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    throw new Error('File not found');
  }
  
  const file = files[fileIndex];
  const now = new Date();
  const optimizedVersions = [];
  
  for (const version of file.versions) {
    // Skip active version if requested
    if (skipActiveVersion && version.isActive) continue;
    
    // Check if version is old enough
    const versionDate = new Date(version.uploadDate);
    const daysDiff = (now - versionDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff >= daysThreshold && version.storageClass !== targetStorageClass) {
      // Move to cheaper storage class
      version.storageClass = targetStorageClass;
      optimizedVersions.push({
        versionId: version.versionId,
        versionNumber: version.versionNumber,
        oldStorageClass: version.storageClass,
        newStorageClass: targetStorageClass,
        savings: calculateVersionCost({ ...version, storageClass: version.storageClass }) - 
                calculateVersionCost({ ...version, storageClass: targetStorageClass })
      });
      
      // Track billing activity
      await trackBillingActivity(userId, 'storage_optimization', {
        fileId: fileId,
        versionId: version.versionId,
        oldStorageClass: version.storageClass,
        newStorageClass: targetStorageClass,
        fileSize: version.fileSize
      });
    }
  }
  
  if (optimizedVersions.length > 0) {
    files[fileIndex] = file;
    await writeFiles(userId, files);
  }
  
  return {
    optimizedCount: optimizedVersions.length,
    optimizedVersions,
    totalSavings: optimizedVersions.reduce((sum, v) => sum + v.savings, 0)
  };
};

// Clean up old versions based on retention policy
const cleanupOldVersions = async (userId, userTier = 'FREE') => {
  const policy = VERSION_RETENTION_POLICIES[userTier];
  const files = await readFiles(userId);
  const cleanupResults = [];
  
  for (const file of files) {
    if (!file.versions || file.versions.length <= 1) continue;
    
    const now = new Date();
    const versionsToDelete = [];
    
    // Sort versions by date (oldest first)
    const sortedVersions = [...file.versions].sort((a, b) => 
      new Date(a.uploadDate) - new Date(b.uploadDate)
    );
    
    // Apply retention policies
    for (let i = 0; i < sortedVersions.length; i++) {
      const version = sortedVersions[i];
      
      // Skip active version
      if (version.isActive) continue;
      
      // Check age-based deletion
      const versionDate = new Date(version.uploadDate);
      const daysDiff = (now - versionDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > policy.autoDeleteAfterDays) {
        versionsToDelete.push(version);
        continue;
      }
      
      // Check count-based deletion (keep only maxVersions)
      if (policy.maxVersions > 0) {
        const activeVersions = sortedVersions.filter(v => !versionsToDelete.includes(v));
        if (activeVersions.length > policy.maxVersions && !version.isActive) {
          versionsToDelete.push(version);
        }
      }
    }
    
    // Delete identified versions
    for (const versionToDelete of versionsToDelete) {
      try {
        await deleteVersion(userId, file.id, versionToDelete.versionId);
        
        // Delete from S3
        await deleteFileFromS3(file.awsBucketName || `user-${userId}`, versionToDelete.s3Key);
        
        cleanupResults.push({
          fileId: file.id,
          fileName: file.originalName,
          versionId: versionToDelete.versionId,
          versionNumber: versionToDelete.versionNumber,
          freedSpace: versionToDelete.fileSize,
          savedCost: calculateVersionCost(versionToDelete)
        });
      } catch (error) {
        console.error(`Failed to cleanup version ${versionToDelete.versionId}:`, error);
      }
    }
  }
  
  return {
    cleanedCount: cleanupResults.length,
    cleanedVersions: cleanupResults,
    totalFreedSpace: cleanupResults.reduce((sum, r) => sum + r.freedSpace, 0),
    totalSavedCost: cleanupResults.reduce((sum, r) => sum + r.savedCost, 0)
  };
};

// Get version statistics for a user
const getVersionStatistics = async (userId) => {
  const files = await readFiles(userId);
  
  let totalVersions = 0;
  let totalVersionSize = 0;
  let totalVersionCost = 0;
  const storageClassBreakdown = {};
  
  files.forEach(file => {
    if (file.versions) {
      totalVersions += file.versions.length;
      
      file.versions.forEach(version => {
        totalVersionSize += version.fileSize;
        totalVersionCost += calculateVersionCost(version);
        
        const storageClass = version.storageClass;
        if (!storageClassBreakdown[storageClass]) {
          storageClassBreakdown[storageClass] = {
            count: 0,
            size: 0,
            cost: 0
          };
        }
        
        storageClassBreakdown[storageClass].count++;
        storageClassBreakdown[storageClass].size += version.fileSize;
        storageClassBreakdown[storageClass].cost += calculateVersionCost(version);
      });
    }
  });
  
  return {
    totalFiles: files.length,
    totalVersions,
    averageVersionsPerFile: totalVersions / files.length,
    totalVersionSize,
    totalVersionCost,
    storageClassBreakdown
  };
};

module.exports = {
  getVersionHistoryWithCosts,
  calculateVersionCost,
  optimizeVersionStorage,
  cleanupOldVersions,
  getVersionStatistics,
  VERSION_RETENTION_POLICIES
};