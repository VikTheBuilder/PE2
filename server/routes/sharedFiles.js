/**
 * Shared Files Routes
 * Handles file sharing operations with proper URL generation
 */

const express = require('express');
const { randomUUID } = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { readFiles } = require('../models/File');
const { 
  readSharedFiles, 
  addSharedFile, 
  updateSharedFile, 
  removeSharedFile, 
  cleanExpiredSharedFiles 
} = require('../models/SharedFile');
const { generatePresignedShareUrl } = require('../services/awsService');

const router = express.Router();

// Test endpoint (no auth required)
router.get('/test', (req, res) => {
  console.log('🧪 Shared files test endpoint hit');
  res.json({ message: 'Shared files route is working!', timestamp: new Date().toISOString() });
});

// Get shared file info (for regenerating expired URLs)
router.get('/:fileId/info', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Verify file belongs to user
    const files = await readFiles(req.user.id);
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if file is shared
    const sharedFiles = await readSharedFiles(req.user.id);
    const sharedFile = sharedFiles.find(sf => sf.fileId === fileId);
    
    if (!sharedFile) {
      return res.status(404).json({ error: 'File is not shared' });
    }
    
    // Check if URL has expired
    const isExpired = sharedFile.expiryTimestamp && Date.now() > sharedFile.expiryTimestamp;
    
    res.json({
      ...file,
      isShared: true,
      sharedAt: sharedFile.sharedAt,
      expiryTimestamp: sharedFile.expiryTimestamp,
      shareUrl: isExpired ? null : sharedFile.shareUrl,
      isExpired: isExpired
    });
    
  } catch (error) {
    console.error('❌ Get shared file info error:', error);
    res.status(500).json({ error: 'Failed to get shared file info' });
  }
});

// Get shared files for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log(`📋 Getting shared files for user: ${req.user.id}`);
    const sharedFilesData = await readSharedFiles(req.user.id);
    const files = await readFiles(req.user.id);
    
    // Filter out expired shared files and map to file data
    const userShared = sharedFilesData.filter(sf =>
      (!sf.expiryTimestamp || Date.now() < sf.expiryTimestamp)
    );
    
    const userSharedFiles = userShared.map(sf => {
      const file = files.find(f => f.id === sf.fileId);
      if (!file) return null;
      
      return {
        ...file,
        isShared: true,
        sharedAt: sf.sharedAt,
        expiryTimestamp: sf.expiryTimestamp,
        shareUrl: sf.shareUrl,
        shareToken: sf.shareToken
      };
    }).filter(Boolean);
    
    console.log(`✅ Found ${userSharedFiles.length} shared files`);
    res.json(userSharedFiles);
  } catch (error) {
    console.error('❌ Get shared files error:', error);
    res.status(500).json({ error: 'Failed to fetch shared files' });
  }
});

// Add shared file for user (generate AWS presigned URL)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { fileId, expirySeconds } = req.body;
    console.log(`🔗 Creating AWS presigned share URL for user ${req.user.id}:`);
    console.log(`  - File ID: ${fileId}`);
    console.log(`  - Expiry: ${expirySeconds ? `${expirySeconds}s` : '3600s (1 hour default)'}`);
    
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }
    
    // Verify file belongs to user
    const files = await readFiles(req.user.id);
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Use expiry seconds or default to 1 hour
    const urlExpirySeconds = expirySeconds || 3600;
    
    // Generate AWS S3 presigned URL
    const presignedUrl = await generatePresignedShareUrl(
      req.user.awsBucketName, 
      file.s3Key, 
      urlExpirySeconds
    );
    
    // Calculate expiry timestamp for our records
    const expiryTimestamp = Date.now() + (urlExpirySeconds * 1000);
    
    const sharedFileData = {
      id: randomUUID(),
      fileId: fileId,
      userId: req.user.id,
      sharedAt: new Date().toISOString(),
      expiryTimestamp: expiryTimestamp,
      shareUrl: presignedUrl,
      expirySeconds: urlExpirySeconds
    };
    
    await addSharedFile(req.user.id, sharedFileData);
    console.log(`✅ AWS presigned URL generated successfully`);
    console.log(`🔗 Presigned URL expires in: ${urlExpirySeconds}s`);
    
    // Return the file with shared info
    const sharedFile = {
      ...file,
      isShared: true,
      sharedAt: sharedFileData.sharedAt,
      expiryTimestamp: sharedFileData.expiryTimestamp,
      shareUrl: sharedFileData.shareUrl
    };
    
    res.json(sharedFile);
  } catch (error) {
    console.error('❌ Add shared file error:', error);
    res.status(500).json({ error: 'Failed to generate share URL' });
  }
});

// Update shared file URL
router.patch('/:fileId/url', authenticateToken, async (req, res) => {
  try {
    const { shareUrl } = req.body;
    const { fileId } = req.params;
    
    console.log(`🔄 Updating share URL for file ${fileId}: ${shareUrl}`);
    
    if (!shareUrl) {
      return res.status(400).json({ error: 'shareUrl is required' });
    }
    
    // Verify shared file exists and belongs to user
    const sharedFiles = await readSharedFiles(req.user.id);
    const sharedFile = sharedFiles.find(sf => sf.fileId === fileId);
    
    if (!sharedFile) {
      return res.status(404).json({ error: 'Shared file not found' });
    }
    
    // Update the shared file
    const updatedSharedFile = await updateSharedFile(req.user.id, fileId, {
      shareUrl: shareUrl
    });
    
    // Get the actual file data
    const files = await readFiles(req.user.id);
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Return the file with updated shared info
    const responseFile = {
      ...file,
      isShared: true,
      sharedAt: updatedSharedFile.sharedAt,
      expiryTimestamp: updatedSharedFile.expiryTimestamp,
      shareUrl: updatedSharedFile.shareUrl,
      shareToken: updatedSharedFile.shareToken
    };
    
    console.log(`✅ Share URL updated successfully`);
    res.json(responseFile);
  } catch (error) {
    console.error('❌ Update shared file URL error:', error);
    res.status(500).json({ error: 'Failed to update shared file URL' });
  }
});

// Remove shared file
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log(`🗑️ Removing shared file: ${fileId}`);
    
    // Verify shared file exists and belongs to user
    const sharedFiles = await readSharedFiles(req.user.id);
    const sharedFile = sharedFiles.find(sf => sf.fileId === fileId);
    
    if (!sharedFile) {
      return res.status(404).json({ error: 'Shared file not found' });
    }
    
    await removeSharedFile(req.user.id, fileId);
    console.log(`✅ Shared file removed successfully`);
    
    res.json({ message: 'Shared file removed successfully' });
  } catch (error) {
    console.error('❌ Remove shared file error:', error);
    res.status(500).json({ error: 'Failed to remove shared file' });
  }
});

// Clear expired shared files
router.delete('/expired', authenticateToken, async (req, res) => {
  try {
    const cleanedCount = await cleanExpiredSharedFiles(req.user.id);
    res.json({ 
      message: `Cleaned ${cleanedCount} expired shared files`,
      cleanedCount: cleanedCount
    });
  } catch (error) {
    console.error('Clear expired shared files error:', error);
    res.status(500).json({ error: 'Failed to clear expired shared files' });
  }
});

module.exports = router;