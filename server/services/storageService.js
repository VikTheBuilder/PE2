/**
 * Storage Service
 * Handles storage class optimization and cost calculations
 */

const config = require('../config/environment');

// Storage class cost calculations with tiered margins (per GB/month)
const getStorageClassCost = (storageClass, withMargin = true) => {
  const baseCosts = {
    'STANDARD': 0.023,
    'STANDARD_IA': 0.0125,
    'ONEZONE_IA': 0.01,
    'GLACIER_IR': 0.004,
    'GLACIER': 0.0036,
    'DEEP_ARCHIVE': 0.00099,
    'INTELLIGENT_TIERING': 0.0125  // Base cost similar to STANDARD_IA, AWS optimizes automatically
  };
  
  // Tiered margin system - higher margins on premium storage classes
  const margins = {
    'STANDARD': 25,        // Lightning Fast - 25% margin (premium convenience)
    'STANDARD_IA': 35,     // Smart Saver - 35% margin (smart optimization)
    'ONEZONE_IA': 40,      // Budget Smart - 40% margin (budget solution)
    'GLACIER_IR': 45,      // Archive Pro - 45% margin (professional archiving)
    'GLACIER': 50,         // Deep Freeze - 50% margin (specialized long-term)
    'DEEP_ARCHIVE': 60,    // Vault Keeper - 60% margin (premium vault service)
    'INTELLIGENT_TIERING': 30  // Intelligent Tiering - 30% margin (automated optimization)
  };
  
  const baseCost = baseCosts[storageClass] || baseCosts['STANDARD'];
  
  if (withMargin) {
    const margin = margins[storageClass] || config.SITE_MARGIN;
    return baseCost * (1 + margin / 100);
  }
  
  return baseCost;
};

// Get storage class recommendation based on file characteristics
const getStorageClassRecommendation = (fileType, fileSize, fileName = '') => {
  const sizeInMB = fileSize / (1024 * 1024);
  const fileExtension = fileName.toLowerCase().split('.').pop() || '';
  
  // Large files (>threshold MB) - recommend Smart Saver for cost optimization
  if (sizeInMB > config.RECOMMEND_STANDARD_IA_THRESHOLD_MB) {
    return {
      recommended: 'STANDARD_IA',
      awsName: 'STANDARD_IA',
      displayName: '💎 Smart Saver',
      reason: `Large file (${Math.round(sizeInMB)}MB) - Perfect for Smart Saver storage`,
      savings: 'Save 46% compared to Lightning Fast',
      explanation: 'Large files like this are perfect for Smart Saver storage. You get instant access when needed but pay much less for storage.'
    };
  }
  
  // Archive files - recommend Deep Freeze for long-term storage
  if (config.RECOMMEND_GLACIER_EXTENSIONS.some(ext => 
    fileExtension === ext.replace('.', '') || fileType.includes(ext.replace('.', '')))) {
    return {
      recommended: 'GLACIER',
      awsName: 'GLACIER',
      displayName: '🧊 Deep Freeze',
      reason: 'Archive file - Perfect for Deep Freeze storage',
      savings: 'Save 84% compared to Lightning Fast',
      explanation: 'Archive files like ZIP and RAR are ideal for Deep Freeze storage. Keep them safe at rock-bottom prices.'
    };
  }
  
  // Backup files - recommend Archive Pro
  if (config.RECOMMEND_GLACIER_IR_EXTENSIONS.some(ext => 
    fileExtension === ext.replace('.', '') || fileName.toLowerCase().includes(ext.replace('.', '')))) {
    return {
      recommended: 'GLACIER_IR',
      awsName: 'GLACIER_IR',
      displayName: '🏔️ Archive Pro',
      reason: 'Backup file - Ideal for Archive Pro storage',
      savings: 'Save 83% compared to Lightning Fast',
      explanation: 'Backup files are perfect for Archive Pro storage. Keep your important backups safe with instant access at ultra-low costs.'
    };
  }
  
  // Frequently accessed files - recommend Lightning Fast
  if (config.RECOMMEND_STANDARD_EXTENSIONS.some(ext => fileExtension === ext.replace('.', '')) ||
      fileType.startsWith('image/') || fileType.startsWith('video/') || fileType === 'application/pdf') {
    return {
      recommended: 'STANDARD',
      awsName: 'STANDARD',
      displayName: '⚡ Lightning Fast',
      reason: 'Active file - Perfect for Lightning Fast storage',
      savings: 'Optimized for instant access',
      explanation: 'Photos, videos, and documents you use regularly are perfect for Lightning Fast storage. No delays, always ready.'
    };
  }
  
  // Default to Lightning Fast for other files
  return {
    recommended: 'STANDARD',
    awsName: 'STANDARD',
    displayName: '⚡ Lightning Fast',
    reason: 'General purpose file - Lightning Fast storage recommended',
    savings: 'Best performance for everyday use',
    explanation: 'When in doubt, Lightning Fast storage ensures your files are always ready when you need them.'
  };
};

// Legacy function for backward compatibility
const getOptimalStorageClass = (fileType, fileSize, fileName = '') => {
  const recommendation = getStorageClassRecommendation(fileType, fileSize, fileName);
  return recommendation.recommended;
};

// Get pricing structure with user-friendly names and tiered margins
const getPricingStructure = () => {
  return {
    storage: {
      intelligent_tiering: {
        name: '🤖 Intelligent Tiering Storage',
        awsName: 'INTELLIGENT_TIERING',
        baseCost: 0.0125,
        price: getStorageClassCost('INTELLIGENT_TIERING'),
        margin: 30,
        description: 'Automatically optimizes costs based on access patterns',
        icon: '🤖',
        color: '#7C3AED',
        tagline: 'Set it and forget it - AWS optimizes for you'
      },
      lightning_fast: {
        name: '⚡ Lightning Fast Storage',
        awsName: 'STANDARD',
        baseCost: 0.023,
        price: getStorageClassCost('STANDARD'),
        margin: 25,
        description: 'Perfect for files you access daily',
        icon: '⚡',
        color: '#3B82F6',
        tagline: 'Instant access, always ready'
      },
      smart_saver: {
        name: '💎 Smart Saver Storage',
        awsName: 'STANDARD_IA',
        baseCost: 0.0125,
        price: getStorageClassCost('STANDARD_IA'),
        margin: 35,
        description: 'Great for large files, 46% base savings',
        icon: '💎',
        color: '#10B981',
        tagline: 'Smart optimization for big files'
      },
      budget_smart: {
        name: '🎯 Budget Smart Storage',
        awsName: 'ONEZONE_IA',
        baseCost: 0.01,
        price: getStorageClassCost('ONEZONE_IA'),
        margin: 40,
        description: 'Most affordable for non-critical files',
        icon: '🎯',
        color: '#F59E0B',
        tagline: 'Maximum savings, smart choice'
      },
      archive_pro: {
        name: '🏔️ Archive Pro Storage',
        awsName: 'GLACIER_IR',
        baseCost: 0.004,
        price: getStorageClassCost('GLACIER_IR'),
        margin: 45,
        description: 'Ultra-low cost with instant access',
        icon: '🏔️',
        color: '#8B5CF6',
        tagline: 'Professional archiving solution'
      },
      deep_freeze: {
        name: '🧊 Deep Freeze Storage',
        awsName: 'GLACIER',
        baseCost: 0.0036,
        price: getStorageClassCost('GLACIER'),
        margin: 50,
        description: 'Long-term storage, massive savings',
        icon: '🧊',
        color: '#EC4899',
        tagline: 'Lock it away, save big'
      },
      vault_keeper: {
        name: '🏛️ Vault Keeper Storage',
        awsName: 'DEEP_ARCHIVE',
        baseCost: 0.00099,
        price: getStorageClassCost('DEEP_ARCHIVE'),
        margin: 60,
        description: 'Ultimate long-term storage',
        icon: '🏛️',
        color: '#6B7280',
        tagline: 'Digital safety deposit box'
      }
    },
    requests: {
      uploads: {
        name: 'Uploads & Data Management',
        baseCost: 0.05,
        price: 0.05 * (1 + config.SITE_MARGIN / 100),
        unit: '1,000 requests'
      },
      downloads: {
        name: 'Downloads & Data Retrieval',
        baseCost: 0.004,
        price: 0.004 * (1 + config.SITE_MARGIN / 100),
        unit: '1,000 requests'
      }
    },
    transfer: {
      out: {
        name: 'Data Transfer Out',
        baseCost: 0.10,
        price: 0.10 * (1 + config.SITE_MARGIN / 100),
        freeAllowance: 10,
        description: 'First 10 GB free monthly'
      }
    },
    retrieval: {
      flexible_archive: {
        name: 'Flexible Archive Retrieval',
        baseCost: 0.04,
        price: 0.04 * (1 + config.SITE_MARGIN / 100)
      },
      deep_archive: {
        name: 'Deep Archive Retrieval',
        baseCost: 0.03,
        price: 0.03 * (1 + config.SITE_MARGIN / 100)
      }
    },
    margin: config.SITE_MARGIN
  };
};

// Get all available storage classes with user-friendly details and updated pricing
const getAvailableStorageClasses = () => {
  return [
    {
      name: 'INTELLIGENT_TIERING',
      awsName: 'INTELLIGENT_TIERING',
      displayName: '🤖 Intelligent Tiering',
      friendlyName: 'Intelligent Tiering Storage',
      baseCost: 0.0125,
      cost: getStorageClassCost('INTELLIGENT_TIERING'),
      margin: 30,
      description: '🤖 Intelligent Tiering - Automatically optimizes costs based on access patterns',
      detailedDescription: 'AWS automatically moves your files between storage tiers based on how often you access them. Save money without thinking about it - the system optimizes costs for you.',
      retrievalTime: 'Instant',
      minimumDuration: 'None',
      icon: '🤖',
      color: '#7C3AED',
      bestFor: ['All File Types', 'Automatic Optimization', 'Hands-off Management'],
      savings: 'Automatic cost optimization',
      tagline: 'Set it and forget it - AWS optimizes for you'
    },
    {
      name: 'STANDARD',
      awsName: 'STANDARD',
      displayName: '⚡ Lightning Fast',
      friendlyName: 'Lightning Fast Storage',
      baseCost: 0.023,
      cost: getStorageClassCost('STANDARD'),
      margin: 25,
      description: 'Perfect for files you access daily - photos, documents, and active projects',
      detailedDescription: 'Your go-to storage for everyday files. Access your photos, documents, and work files instantly whenever you need them. No waiting, no delays.',
      retrievalTime: 'Instant',
      minimumDuration: 'None',
      icon: '⚡',
      color: '#3B82F6',
      bestFor: ['Photos & Videos', 'Active Documents', 'Frequently Used Files'],
      savings: 'Premium instant access',
      tagline: 'Always ready when you need it'
    },
    {
      name: 'STANDARD_IA',
      awsName: 'STANDARD_IA',
      displayName: '💎 Smart Saver',
      friendlyName: 'Smart Saver Storage',
      baseCost: 0.0125,
      cost: getStorageClassCost('STANDARD_IA'),
      margin: 35,
      description: 'Great for large files you don\'t access often - save money with smart optimization',
      detailedDescription: 'Smart choice for large files like video projects, old photo albums, or completed work. Access instantly when needed, but pay less for storage.',
      retrievalTime: 'Instant',
      minimumDuration: '30 days',
      icon: '💎',
      color: '#10B981',
      bestFor: ['Large Videos', 'Photo Archives', 'Completed Projects'],
      savings: '46% base savings vs Lightning Fast',
      tagline: 'Smart optimization for big files'
    },
    {
      name: 'ONEZONE_IA',
      awsName: 'ONEZONE_IA',
      displayName: '🎯 Budget Smart',
      friendlyName: 'Budget Smart Storage',
      baseCost: 0.01,
      cost: getStorageClassCost('ONEZONE_IA'),
      margin: 40,
      description: 'Most affordable option for non-critical files with instant access',
      detailedDescription: 'Maximum savings for files that aren\'t mission-critical. Perfect for duplicates, test files, or anything you can recreate if needed.',
      retrievalTime: 'Instant',
      minimumDuration: '30 days',
      icon: '🎯',
      color: '#F59E0B',
      bestFor: ['Duplicate Files', 'Test Files', 'Non-Critical Data'],
      savings: '57% base savings vs Lightning Fast',
      tagline: 'Maximum savings, smart choice'
    },
    {
      name: 'GLACIER_IR',
      awsName: 'GLACIER_IR',
      displayName: '🏔️ Archive Pro',
      friendlyName: 'Archive Pro Storage',
      baseCost: 0.004,
      cost: getStorageClassCost('GLACIER_IR'),
      margin: 45,
      description: 'Ultra-low cost archive with instant access - perfect for important backups',
      detailedDescription: 'Professional archiving for important files you rarely need. Keep your data safe and accessible while paying minimal storage costs.',
      retrievalTime: 'Instant',
      minimumDuration: '90 days',
      icon: '🏔️',
      color: '#8B5CF6',
      bestFor: ['Important Backups', 'Legal Documents', 'Historical Data'],
      savings: '83% base savings vs Lightning Fast',
      tagline: 'Professional archiving solution'
    },
    {
      name: 'GLACIER',
      awsName: 'GLACIER',
      displayName: '🧊 Deep Freeze',
      friendlyName: 'Deep Freeze Storage',
      baseCost: 0.0036,
      cost: getStorageClassCost('GLACIER'),
      margin: 50,
      description: 'Long-term storage for files you rarely access - massive savings',
      detailedDescription: 'Lock away files for the long haul. Perfect for old backups, compliance data, or anything you want to keep "just in case" at rock-bottom prices.',
      retrievalTime: '1-5 minutes',
      minimumDuration: '90 days',
      icon: '🧊',
      color: '#EC4899',
      bestFor: ['Old Backups', 'Compliance Data', 'Long-term Archives'],
      savings: '84% base savings vs Lightning Fast',
      tagline: 'Lock it away, save big'
    },
    {
      name: 'DEEP_ARCHIVE',
      awsName: 'DEEP_ARCHIVE',
      displayName: '🏛️ Vault Keeper',
      friendlyName: 'Vault Keeper Storage',
      baseCost: 0.00099,
      cost: getStorageClassCost('DEEP_ARCHIVE'),
      margin: 60,
      description: 'Ultimate long-term storage - cheapest option for data you almost never need',
      detailedDescription: 'The digital equivalent of a safety deposit box. Store data for years at incredibly low costs. Perfect for regulatory compliance and "set it and forget it" backups.',
      retrievalTime: '12 hours',
      minimumDuration: '180 days',
      icon: '🏛️',
      color: '#6B7280',
      bestFor: ['Regulatory Compliance', 'Disaster Recovery', 'Permanent Archives'],
      savings: '96% base savings vs Lightning Fast',
      tagline: 'Digital safety deposit box'
    }
  ];
};

// Get storage statistics from files array
const getStorageStats = (files) => {
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
  const totalCost = files.reduce((sum, file) => sum + (file.estimatedMonthlyCost || 0), 0);
  
  // Storage class breakdown
  const storageClassBreakdown = files.reduce((acc, file) => {
    const storageClass = file.storageClass || 'STANDARD';
    if (!acc[storageClass]) {
      acc[storageClass] = {
        count: 0,
        totalSize: 0,
        totalCost: 0
      };
    }
    acc[storageClass].count++;

    acc[storageClass].totalSize += file.fileSize || 0;
    acc[storageClass].totalCost += file.estimatedMonthlyCost || 0;
    return acc;
  }, {});
  
  return {
    totalFiles,
    totalStorage: totalSize,
    usedStorage: totalSize,
    fileCount: totalFiles,
    totalMonthlyCost: totalCost,
    storageClassBreakdown
  };
};

// Get cost analysis from files array
const getCostAnalysis = (files) => {
  const stats = getStorageStats(files);
  
  // Calculate potential savings
  const recommendations = [];
  
  // Check for files that could be moved to cheaper storage classes
  files.forEach(file => {
    const currentClass = file.storageClass || 'STANDARD';
    const recommendation = getStorageClassRecommendation(file.fileType, file.fileSize, file.originalName);
    
    if (recommendation.recommended !== currentClass) {
      const currentCost = getStorageClassCost(currentClass) * (file.fileSize / (1024 * 1024 * 1024));
      const recommendedCost = getStorageClassCost(recommendation.recommended) * (file.fileSize / (1024 * 1024 * 1024));
      const savings = currentCost - recommendedCost;
      
      if (savings > 0.01) { // Only recommend if savings > $0.01/month
        recommendations.push({
          fileName: file.originalName,
          currentClass,
          recommendedClass: recommendation.recommended,
          monthlySavings: savings,
          reason: recommendation.reason
        });
      }
    }
  });
  
  return {
    ...stats,
    recommendations,
    potentialMonthlySavings: recommendations.reduce((sum, rec) => sum + rec.monthlySavings, 0)
  };
};

// Get user-friendly storage class information
const getStorageClassInfo = (awsStorageClass) => {
  const storageClasses = getAvailableStorageClasses();
  return storageClasses.find(sc => sc.awsName === awsStorageClass) || storageClasses[0];
};

// Convert AWS storage class name to user-friendly display name
const getDisplayName = (awsStorageClass) => {
  const info = getStorageClassInfo(awsStorageClass);
  return info.displayName;
};

// Get storage class by user-friendly name
const getStorageClassByDisplayName = (displayName) => {
  const storageClasses = getAvailableStorageClasses();
  return storageClasses.find(sc => sc.displayName === displayName);
};

module.exports = {
  getStorageClassCost,
  getStorageClassRecommendation,
  getOptimalStorageClass,
  getPricingStructure,
  getAvailableStorageClasses,
  getStorageStats,
  getCostAnalysis,
  getStorageClassInfo,
  getDisplayName,
  getStorageClassByDisplayName
};