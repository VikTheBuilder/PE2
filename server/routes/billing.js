/**
 * Billing Routes
 * Handles billing and usage tracking
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getBillingDetails, getBillingHistory, getCurrentUsage } = require('../services/billingService');

const router = express.Router();

// Test endpoint (no auth required)
router.get('/test', (req, res) => {
  console.log('🧪 Billing test endpoint hit');
  res.json({ message: 'Billing route is working!', timestamp: new Date().toISOString() });
});

// Get billing details
router.get('/details', authenticateToken, async (req, res) => {
  try {
    console.log(`💰 Getting billing details for user: ${req.user.id}`);
    const billingDetails = await getBillingDetails(req.user.id);
    console.log(`✅ Billing details retrieved successfully`);
    res.json(billingDetails);
  } catch (error) {
    console.error('❌ Get billing details error:', error);
    res.status(500).json({ error: 'Failed to get billing details' });
  }
});

// Get current billing data (what frontend expects as /billing/current)
router.get('/current', authenticateToken, async (req, res) => {
  try {
    console.log(`💰 Getting current billing data for user: ${req.user.id}`);
    const billingDetails = await getBillingDetails(req.user.id);
    res.json(billingDetails);
  } catch (error) {
    console.error('❌ Get current billing error:', error);
    res.status(500).json({ error: 'Failed to get current billing data' });
  }
});

// Get billing history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    console.log(`📊 Getting billing history for user: ${req.user.id}`);
    const history = await getBillingHistory(req.user.id);
    console.log(`✅ Billing history retrieved successfully`);
    res.json(history);
  } catch (error) {
    console.error('❌ Get billing history error:', error);
    res.status(500).json({ error: 'Failed to get billing history' });
  }
});

// Get current usage (with proper structure for frontend)
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    console.log(`📊 Getting current usage for user: ${req.user.id}`);
    const usage = await getCurrentUsage(req.user.id);
    
    // Get billing activity to calculate request counts
    const { readBilling } = require('../models/Billing');
    const billingData = await readBilling(req.user.id);
    
    // Calculate request counts from billing data
    const uploadRequests = billingData.filter(activity => activity.type === 'request_upload').length;
    const downloadRequests = billingData.filter(activity => activity.type === 'request_download').length;
    const requestCosts = billingData
      .filter(activity => activity.type.startsWith('request_'))
      .reduce((sum, activity) => sum + (activity.cost || 0), 0);
    
    // Transform to match frontend expectations
    const transformedUsage = {
      storage: {
        totalUsed: usage.totalStorage,
        totalCost: usage.estimatedMonthlyCost,
        classes: usage.storageClassUsage || {}
      },
      requests: {
        uploads: {
          count: uploadRequests,
          cost: requestCosts * 0.6 // Approximate split
        },
        downloads: {
          count: downloadRequests,
          cost: requestCosts * 0.4 // Approximate split
        },
        totalCost: requestCosts
      },
      transfer: {
        out: {
          amount: 0,
          cost: 0
        },
        totalCost: 0
      },
      retrieval: {
        flexible_archive: {
          amount: 0,
          cost: 0
        },
        deep_archive: {
          amount: 0,
          cost: 0
        },
        totalCost: 0
      },
      pricing: usage.pricing || {}
    };
    
    console.log(`✅ Current usage retrieved and transformed successfully`);
    res.json(transformedUsage);
  } catch (error) {
    console.error('❌ Get current usage error:', error);
    res.status(500).json({ error: 'Failed to get current usage' });
  }
});

module.exports = router;