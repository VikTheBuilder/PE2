/**
 * Folder Management Routes
 * Handles folder creation, deletion, and management operations
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
  readFolders, 
  addFolder, 
  findFolderById, 
  deleteFolder, 
  updateFolder, 
  getFolderPath 
} = require('../models/Folder');

const router = express.Router();

// Get user folders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { parentFolderId } = req.query;
    const folders = await readFolders(req.user.id);
    
    // Filter by parent folder if specified
    let filteredFolders = folders;
    if (parentFolderId) {
      filteredFolders = folders.filter(f => f.parentFolderId === parentFolderId);
    } else {
      filteredFolders = folders.filter(f => !f.parentFolderId);
    }
    
    res.json(filteredFolders);
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create folder
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { folderName, parentFolderId = null } = req.body;
    
    if (!folderName || folderName.trim().length === 0) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    // Validate folder name (no special characters that could cause issues)
    const validNameRegex = /^[a-zA-Z0-9\s\-_\.()]+$/;
    if (!validNameRegex.test(folderName.trim())) {
      return res.status(400).json({ 
        error: 'Folder name contains invalid characters. Use only letters, numbers, spaces, hyphens, underscores, dots, and parentheses.' 
      });
    }
    
    // Check if parent folder exists (if specified)
    if (parentFolderId) {
      const parentFolder = await findFolderById(req.user.id, parentFolderId);
      if (!parentFolder) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
    }
    
    console.log(`📁 Creating folder for user ${req.user.id}:`);
    console.log(`  - Name: ${folderName.trim()}`);
    console.log(`  - Parent: ${parentFolderId || 'root'}`);
    
    const folderData = {
      name: folderName.trim(),
      parentFolderId: parentFolderId
    };
    
    const newFolder = await addFolder(req.user.id, folderData);
    console.log(`✅ Folder created successfully with ID: ${newFolder.id}`);
    console.log(`📁 Folder details:`, newFolder);
    
    res.json({
      message: 'Folder created successfully',
      folder: newFolder
    });
    
  } catch (error) {
    console.error('Create folder error:', error);
    if (error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create folder' });
    }
  }
});

// Get folder details
router.get('/:folderId', authenticateToken, async (req, res) => {
  try {
    const { folderId } = req.params;
    const folder = await findFolderById(req.user.id, folderId);
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Get folder path for breadcrumbs
    const folderPath = await getFolderPath(req.user.id, folderId);
    
    res.json({
      folder,
      path: folderPath
    });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ error: 'Failed to fetch folder' });
  }
});

// Update folder (rename)
router.put('/:folderId', authenticateToken, async (req, res) => {
  try {
    const { folderId } = req.params;
    const { folderName } = req.body;
    
    if (!folderName || folderName.trim().length === 0) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    // Validate folder name
    const validNameRegex = /^[a-zA-Z0-9\s\-_\.()]+$/;
    if (!validNameRegex.test(folderName.trim())) {
      return res.status(400).json({ 
        error: 'Folder name contains invalid characters. Use only letters, numbers, spaces, hyphens, underscores, dots, and parentheses.' 
      });
    }
    
    const folder = await findFolderById(req.user.id, folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    console.log(`📝 Renaming folder ${folder.name} to ${folderName.trim()}`);
    
    const updatedFolder = await updateFolder(req.user.id, folderId, {
      name: folderName.trim()
    });
    
    console.log(`✅ Folder renamed successfully`);
    
    res.json({
      message: 'Folder renamed successfully',
      folder: updatedFolder
    });
    
  } catch (error) {
    console.error('Update folder error:', error);
    if (error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update folder' });
    }
  }
});

// Delete folder
router.delete('/:folderId', authenticateToken, async (req, res) => {
  try {
    const { folderId } = req.params;
    
    const folder = await findFolderById(req.user.id, folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    console.log(`🗑️ Deleting folder: ${folder.name}`);
    
    await deleteFolder(req.user.id, folderId);
    
    console.log(`✅ Folder deleted successfully`);
    
    res.json({ 
      message: 'Folder deleted successfully',
      deletedFolder: folder
    });
    
  } catch (error) {
    console.error('Delete folder error:', error);
    if (error.message.includes('contains')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  }
});

// Get folder path (breadcrumbs)
router.get('/:folderId/path', authenticateToken, async (req, res) => {
  try {
    const { folderId } = req.params;
    const folderPath = await getFolderPath(req.user.id, folderId);
    
    res.json({
      path: folderPath
    });
  } catch (error) {
    console.error('Get folder path error:', error);
    res.status(500).json({ error: 'Failed to get folder path' });
  }
});

module.exports = router;