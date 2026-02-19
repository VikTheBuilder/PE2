/**
 * Storage Routes
 * Handles storage analytics and statistics
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { readFiles } = require('../models/File');
const { getStorageStats, getCostAnalysis } = require('../services/storageService');

const router = express.Router();

// Get storage statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const files = await readFiles(req.user.id);
    const stats = getStorageStats(files);
    
    res.json(stats);
  } catch (error) {
    console.error('Get storage stats error:', error);
    res.status(500).json({ error: 'Failed to get storage statistics' });
  }
});

// Get cost analysis
router.get('/cost-analysis', authenticateToken, async (req, res) => {
  try {
    const files = await readFiles(req.user.id);
    const analysis = getCostAnalysis(files);
    
    res.json(analysis);
  } catch (error) {
    console.error('Get cost analysis error:', error);
    res.status(500).json({ error: 'Failed to get cost analysis' });
  }
});

module.exports = router;