/**
 * File Version Routes
 * Handles file versioning operations
 */

const express = require('express');
const { randomUUID } = require('crypto');

const { authenticateToken } = require('../middleware/auth');
const { 
  getVersionHistory, 
  restoreVersion, 
  deleteVersion, 
  getVersionById,
  updateVersionMetadata 
} = require('../models/File');
const { 
  getVersionHistoryWithCosts,
  optimizeVersionStorage,
  cleanupOldVersions,
  getVersionStatistics 
} = require('../services/versionService');
const { uploadFileToS3, deleteFileFromS3 } = require('../services/awsService');
const { trackBillingActivity } = require('../services/billingService');

const router = express.Router();

// Get version history for a file
router.get('/:fileId/versions', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { includeCosts = 'true' } = req.query;
    
    if (includeCosts === 'true') {
      const history = await getVersionHistoryWithCosts(req.user.id, fileId);
      res.json(history);
    } else {
      const history = await getVersionHistory(req.user.id, fileId);
      res.json(history);
    }
  } catch (error) {
    console.error('Get version history error:', error);
    res.status(404).json({ error: error.message });
  }
});

// Get specific version details
router.get('/:fileId/versions/:versionId', authenticateToken, async (req, res) => {
  try {
    const { fileId, versionId } = req.params;
    const version = await getVersionById(req.user.id, fileId, versionId);
    res.json(version);
  } catch (error) {
    console.error('Get version error:', error);
    res.status(404).json({ error: error.message });
  }
});

// Restore a specific version
router.put('/:fileId/versions/:versionId/restore', authenticateToken, async (req, res) => {
  try {
    const { fileId, versionId } = req.params;
    const restoredFile = await restoreVersion(req.user.id, fileId, versionId);
    
    // Track billing activity
    await trackBillingActivity(req.user.id, 'version_restore', {
      fileId: fileId,
      versionId: versionId,
      fileName: restoredFile.originalName
    });
    
    res.json({
      message: 'Version restored successfully',
      file: restoredFile
    });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete a specific version
router.delete('/:fileId/versions/:versionId', authenticateToken, async (req, res) => {
  try {
    const { fileId, versionId } = req.params;
    const result = await deleteVersion(req.user.id, fileId, versionId);
    
    // Delete from S3
    try {
      await deleteFileFromS3(req.user.awsBucketName, result.deletedVersion.s3Key);
    } catch (s3Error) {
      console.warn('Failed to delete version from S3:', s3Error);
      // Continue anyway - the database record is deleted
    }
    
    // Track billing activity
    await trackBillingActivity(req.user.id, 'version_delete', {
      fileId: fileId,
      versionId: versionId,
      fileName: result.file.originalName,
      freedSpace: result.deletedVersion.fileSize
    });
    
    res.json({
      message: 'Version deleted successfully',
      deletedVersion: result.deletedVersion,
      remainingVersions: result.file.totalVersions
    });
  } catch (error) {
    console.error('Delete version error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update version metadata (comment, etc.)
router.patch('/:fileId/versions/:versionId', authenticateToken, async (req, res) => {
  try {
    const { fileId, versionId } = req.params;
    const { comment, metadata } = req.body;
    
    const updatedVersion = await updateVersionMetadata(req.user.id, fileId, versionId, {
      comment,
      metadata
    });
    
    res.json({
      message: 'Version metadata updated successfully',
      version: updatedVersion
    });
  } catch (error) {
    console.error('Update version metadata error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Optimize version storage (move old versions to cheaper storage)
router.post('/:fileId/versions/optimize', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { 
      daysThreshold = 30, 
      targetStorageClass = 'STANDARD_IA',
      skipActiveVersion = true 
    } = req.body;
    
    const result = await optimizeVersionStorage(req.user.id, fileId, {
      daysThreshold,
      targetStorageClass,
      skipActiveVersion
    });
    
    res.json({
      message: `Optimized ${result.optimizedCount} versions`,
      ...result
    });
  } catch (error) {
    console.error('Optimize versions error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Bulk optimize all user's versions
router.post('/optimize-all', authenticateToken, async (req, res) => {
  try {
    const { 
      daysThreshold = 30, 
      targetStorageClass = 'STANDARD_IA' 
    } = req.body;
    
    // This would need to be implemented to optimize all files
    // For now, return a placeholder
    res.json({
      message: 'Bulk optimization feature coming soon',
      status: 'not_implemented'
    });
  } catch (error) {
    console.error('Bulk optimize error:', error);
    res.status(500).json({ error: 'Failed to optimize versions' });
  }
});

// Clean up old versions based on retention policy
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    const { userTier = 'FREE' } = req.body;
    
    const result = await cleanupOldVersions(req.user.id, userTier);
    
    res.json({
      message: `Cleaned up ${result.cleanedCount} old versions`,
      ...result
    });
  } catch (error) {
    console.error('Cleanup versions error:', error);
    res.status(500).json({ error: 'Failed to cleanup versions' });
  }
});

// Get version statistics for user
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const stats = await getVersionStatistics(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Get version statistics error:', error);
    res.status(500).json({ error: 'Failed to get version statistics' });
  }
});

// Download specific version
router.get('/:fileId/versions/:versionId/download', authenticateToken, async (req, res) => {
  try {
    const { fileId, versionId } = req.params;
    const version = await getVersionById(req.user.id, fileId, versionId);
    
    // Generate pre-signed URL for download
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const { s3Client } = require('../services/awsService');
    
    if (!s3Client) {
      return res.status(400).json({ error: 'S3 not configured' });
    }
    
    const getCommand = new GetObjectCommand({
      Bucket: req.user.awsBucketName,
      Key: version.s3Key
    });
    
    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    
    // Track billing activity
    await trackBillingActivity(req.user.id, 'version_download', {
      fileId: fileId,
      versionId: versionId,
      fileName: version.fileName
    });
    
    res.json({
      downloadUrl: signedUrl,
      fileName: version.fileName,
      fileSize: version.fileSize,
      versionNumber: version.versionNumber
    });
  } catch (error) {
    console.error('Download version error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;