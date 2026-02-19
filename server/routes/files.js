/**
 * File Management Routes
 * Handles file upload, download, and management operations
 */

const express = require('express');
const multer = require('multer');
const { randomUUID } = require('crypto');

const config = require('../config/environment');
const { authenticateToken } = require('../middleware/auth');
const { readFiles, addFile, updateFile, deleteFile, deleteMultipleFiles, findFileById } = require('../models/File');
const { uploadFileToS3, deleteFileFromS3, checkBucketExists } = require('../services/awsService');
const { getStorageClassRecommendation, getOptimalStorageClass, getAvailableStorageClasses } = require('../services/storageService');
const { trackBillingActivity, calculateStorageCost, calculateRequestCost } = require('../services/billingService');

const router = express.Router();

// Multer configuration for file uploads
const allowedExact = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed'
]);

const isAllowedMime = (mime) => {
  return mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    allowedExact.has(mime);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (isAllowedMime(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Unsupported file type'));
  }
});

// Helper function to build folder path
const buildFolderPath = async (userId, parentFolderId) => {
  if (!parentFolderId) return '';

  try {
    const { getFolderPath } = require('../models/Folder');
    const folderPath = await getFolderPath(userId, parentFolderId);
    return folderPath.map(folder => folder.name).join('/') + '/';
  } catch (error) {
    console.error('Error building folder path:', error);
    return '';
  }
};

// Get user files and folders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { folderId } = req.query;
    const files = await readFiles(req.user.id);

    // Get folders as well
    const { readFolders } = require('../models/Folder');
    const folders = await readFolders(req.user.id);

    // Filter by folder if specified
    let filteredFiles = files;
    let filteredFolders = folders;

    if (folderId) {
      filteredFiles = files.filter(f => f.parentFolderId === folderId);
      filteredFolders = folders.filter(f => f.parentFolderId === folderId);
    } else {
      filteredFiles = files.filter(f => !f.parentFolderId);
      filteredFolders = folders.filter(f => !f.parentFolderId);
    }

    // Combine folders and files, with folders first
    const combinedItems = [...filteredFolders, ...filteredFiles];

    res.json(combinedItems);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype, size } = req.file;
    const { parentFolderId = null, storageClass, versionComment } = req.body;

    // Check if user's bucket exists
    const bucketExists = await checkBucketExists(req.user.awsBucketName);
    if (!bucketExists && !config.DEV_MODE) {
      return res.status(404).json({
        error: 'Your storage bucket was not found. Please contact support.'
      });
    }

    // Check if file with same name already exists (for versioning)
    const existingFiles = await readFiles(req.user.id);
    const existingFile = existingFiles.find(f =>
      f.originalName === originalname &&
      f.parentFolderId === parentFolderId
    );

    let fileName, s3Key, versionNumber = 1;

    if (existingFile) {
      // Creating new version of existing file
      versionNumber = existingFile.currentVersion + 1;
      fileName = `${Date.now()}-${originalname}`;

      // Build S3 key with version suffix
      const folderPath = await buildFolderPath(req.user.id, parentFolderId);
      s3Key = `uploads/${folderPath}${originalname.replace(/\.[^/.]+$/, '')}-v${versionNumber}${originalname.match(/\.[^/.]+$/)?.[0] || ''}`;
    } else {
      // Creating new file
      fileName = `${Date.now()}-${originalname}`;
      const folderPath = await buildFolderPath(req.user.id, parentFolderId);
      s3Key = `uploads/${folderPath}${fileName}`;
    }

    console.log(`📤 Starting file upload for user ${req.user.id}:`);
    console.log(`  - File: ${originalname}`);
    console.log(`  - Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Type: ${mimetype}`);

    // Determine storage class to use
    let selectedStorageClass;
    if (storageClass && ['STANDARD', 'STANDARD_IA', 'ONEZONE_IA', 'GLACIER_IR', 'GLACIER', 'DEEP_ARCHIVE'].includes(storageClass)) {
      selectedStorageClass = storageClass;
      console.log(`  - Storage class: ${selectedStorageClass} (user selected)`);
    } else if (config.SHOW_STORAGE_CLASS_OPTIONS) {
      selectedStorageClass = config.DEFAULT_STORAGE_CLASS;
      console.log(`  - Storage class: ${selectedStorageClass} (default)`);
    } else {
      selectedStorageClass = getOptimalStorageClass(mimetype, size, originalname);
      console.log(`  - Storage class: ${selectedStorageClass} (auto-optimized)`);
    }

    const estimatedMonthlyCost = calculateStorageCost(size, selectedStorageClass);
    console.log(`  - Estimated monthly cost: $${estimatedMonthlyCost.toFixed(4)}`);

    // Track upload request billing
    console.log(`💰 Tracking billing activity...`);
    await trackBillingActivity(req.user.id, 'request_upload', {
      fileName: originalname,
      fileSize: size,
      storageClass: selectedStorageClass,
      cost: calculateRequestCost('upload'),
      isNewVersion: !!existingFile
    });

    // Upload to S3
    console.log(`☁️  Uploading to S3:`);
    console.log(`  - Bucket: ${req.user.awsBucketName}`);
    console.log(`  - Key: ${s3Key}`);
    console.log(`  - Storage Class: ${selectedStorageClass}`);

    const signedUrl = await uploadFileToS3(req.user.awsBucketName, s3Key, buffer, selectedStorageClass);
    console.log(`✅ File uploaded successfully to S3`);

    // Create file record with version support
    const fileData = {
      id: existingFile ? existingFile.id : randomUUID(),
      userId: req.user.id,
      originalName: originalname,
      fileName: fileName,
      fileType: mimetype,
      fileSize: size,
      s3Key: s3Key,
      url: signedUrl,
      storageClass: selectedStorageClass,
      estimatedMonthlyCost: estimatedMonthlyCost,
      uploadDate: new Date().toISOString(),
      parentFolderId: parentFolderId,
      isStarred: existingFile ? existingFile.isStarred : false,
      comment: versionComment || (existingFile ? `Version ${versionNumber}` : 'Initial version'),
      checksum: null // Could be calculated from buffer if needed
    };

    console.log(`💾 Saving file record to database...`);
    const savedFile = await addFile(req.user.id, fileData);
    console.log(`✅ File record saved successfully with ID: ${savedFile.id}`);

    res.json({
      message: existingFile ?
        `New version (v${savedFile.currentVersion}) created successfully` :
        'File uploaded successfully',
      file: savedFile,
      isNewVersion: !!existingFile,
      versionInfo: existingFile ? {
        currentVersion: savedFile.currentVersion,
        totalVersions: savedFile.totalVersions,
        previousVersion: versionNumber - 1
      } : null
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

// Delete file
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await findFileById(req.user.id, fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from S3
    await deleteFileFromS3(req.user.awsBucketName, file.s3Key);

    // Delete from database
    await deleteFile(req.user.id, fileId);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Bulk delete files
router.delete('/bulk', authenticateToken, async (req, res) => {
  try {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'fileIds array is required' });
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const fileId of fileIds) {
      try {
        const file = await findFileById(req.user.id, fileId);

        if (!file) {
          results.push({ fileId, success: false, error: 'File not found' });
          failureCount++;
          continue;
        }

        // Delete from S3
        await deleteFileFromS3(req.user.awsBucketName, file.s3Key);

        // Delete from database
        await deleteFile(req.user.id, fileId);

        results.push({ fileId, success: true });
        successCount++;
      } catch (error) {
        console.error(`Error deleting file ${fileId}:`, error);
        results.push({ fileId, success: false, error: error.message });
        failureCount++;
      }
    }

    res.json({
      message: `Bulk delete completed: ${successCount} successful, ${failureCount} failed`,
      successCount,
      failureCount,
      results
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// Toggle star file
router.patch('/:fileId/star', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { isStarred } = req.body;

    const file = await findFileById(req.user.id, fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const updatedFile = await updateFile(req.user.id, fileId, {
      isStarred: !isStarred
    });

    res.json(updatedFile);
  } catch (error) {
    console.error('Toggle star error:', error);
    res.status(500).json({ error: 'Failed to update file star status' });
  }
});

// Get Storage Class Recommendations
router.post('/storage/recommendations', authenticateToken, (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName || !fileType || !fileSize) {
      return res.status(400).json({ error: 'fileName, fileType, and fileSize are required' });
    }

    // Get recommendation
    const recommendation = getStorageClassRecommendation(fileType, fileSize, fileName);

    // Get all available storage classes with costs
    const storageClasses = getAvailableStorageClasses();

    // Calculate estimated monthly costs for each storage class
    const fileSizeGB = fileSize / (1024 * 1024 * 1024);
    const storageClassesWithCosts = storageClasses.map(sc => ({
      ...sc,
      estimatedMonthlyCost: sc.cost * fileSizeGB,
      savingsVsStandard: Math.round(((0.023 - sc.cost) / 0.023) * 100)
    }));

    res.json({
      recommendation,
      storageClasses: storageClassesWithCosts,
      showOptions: config.SHOW_STORAGE_CLASS_OPTIONS,
      showRecommendations: config.SHOW_STORAGE_RECOMMENDATIONS,
      defaultStorageClass: config.DEFAULT_STORAGE_CLASS
    });

  } catch (error) {
    console.error('Storage recommendations error:', error);
    res.status(500).json({ error: 'Failed to get storage recommendations' });
  }
});

// Change storage class for existing file
router.put('/:fileId/storage-class', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { storageClass } = req.body;

    if (!storageClass) {
      return res.status(400).json({ error: 'storageClass is required' });
    }

    // Validate storage class
    const validStorageClasses = ['STANDARD', 'STANDARD_IA', 'ONEZONE_IA', 'GLACIER_IR', 'GLACIER', 'DEEP_ARCHIVE', 'INTELLIGENT_TIERING'];
    if (!validStorageClasses.includes(storageClass)) {
      return res.status(400).json({ error: 'Invalid storage class' });
    }

    // Find the file
    const file = await findFileById(req.user.id, fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    console.log(`🔄 Changing storage class for file ${file.originalName}:`);
    console.log(`  - From: ${file.storageClass}`);
    console.log(`  - To: ${storageClass}`);

    // Calculate new estimated monthly cost
    const { getStorageClassCost } = require('../services/storageService');
    const fileSizeGB = file.fileSize / (1024 * 1024 * 1024);
    const newEstimatedMonthlyCost = getStorageClassCost(storageClass) * fileSizeGB;

    // Update the file record
    const updatedFile = await updateFile(req.user.id, fileId, {
      storageClass: storageClass,
      estimatedMonthlyCost: newEstimatedMonthlyCost
    });

    // Track billing activity for storage class change
    await trackBillingActivity(req.user.id, 'storage_class_change', {
      fileName: file.originalName,
      fileSize: file.fileSize,
      fromStorageClass: file.storageClass,
      toStorageClass: storageClass,
      oldCost: file.estimatedMonthlyCost,
      newCost: newEstimatedMonthlyCost,
      costDifference: newEstimatedMonthlyCost - file.estimatedMonthlyCost
    });

    console.log(`✅ Storage class changed successfully`);
    console.log(`  - New estimated monthly cost: $${newEstimatedMonthlyCost.toFixed(4)}`);

    res.json({
      message: 'Storage class updated successfully',
      file: updatedFile,
      oldStorageClass: file.storageClass,
      newStorageClass: storageClass,
      costChange: newEstimatedMonthlyCost - file.estimatedMonthlyCost
    });

  } catch (error) {
    console.error('Change storage class error:', error);
    res.status(500).json({ error: 'Failed to change storage class' });
  }
});

// Bulk change storage class for multiple files
router.put('/bulk/storage-class', authenticateToken, async (req, res) => {
  try {
    const { fileIds, storageClass } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'fileIds array is required' });
    }

    if (!storageClass) {
      return res.status(400).json({ error: 'storageClass is required' });
    }

    // Validate storage class
    const validStorageClasses = ['STANDARD', 'STANDARD_IA', 'ONEZONE_IA', 'GLACIER_IR', 'GLACIER', 'DEEP_ARCHIVE', 'INTELLIGENT_TIERING'];
    if (!validStorageClasses.includes(storageClass)) {
      return res.status(400).json({ error: 'Invalid storage class' });
    }

    console.log(`🔄 Bulk changing storage class to ${storageClass} for ${fileIds.length} files`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let totalCostChange = 0;

    const { getStorageClassCost } = require('../services/storageService');

    for (const fileId of fileIds) {
      try {
        const file = await findFileById(req.user.id, fileId);

        if (!file) {
          results.push({ fileId, success: false, error: 'File not found' });
          failureCount++;
          continue;
        }

        // Skip if already using the target storage class
        if (file.storageClass === storageClass) {
          results.push({
            fileId,
            success: true,
            message: 'Already using target storage class',
            file: file
          });
          successCount++;
          continue;
        }

        // Calculate new estimated monthly cost
        const fileSizeGB = file.fileSize / (1024 * 1024 * 1024);
        const newEstimatedMonthlyCost = getStorageClassCost(storageClass) * fileSizeGB;
        const costChange = newEstimatedMonthlyCost - file.estimatedMonthlyCost;
        totalCostChange += costChange;

        // Update the file record
        const updatedFile = await updateFile(req.user.id, fileId, {
          storageClass: storageClass,
          estimatedMonthlyCost: newEstimatedMonthlyCost
        });

        // Track billing activity for storage class change
        await trackBillingActivity(req.user.id, 'storage_class_change', {
          fileName: file.originalName,
          fileSize: file.fileSize,
          fromStorageClass: file.storageClass,
          toStorageClass: storageClass,
          oldCost: file.estimatedMonthlyCost,
          newCost: newEstimatedMonthlyCost,
          costDifference: costChange,
          isBulkOperation: true
        });

        results.push({
          fileId,
          success: true,
          file: updatedFile,
          oldStorageClass: file.storageClass,
          newStorageClass: storageClass,
          costChange: costChange
        });
        successCount++;

      } catch (error) {
        console.error(`Error changing storage class for file ${fileId}:`, error);
        results.push({ fileId, success: false, error: error.message });
        failureCount++;
      }
    }

    console.log(`✅ Bulk storage class change completed: ${successCount} successful, ${failureCount} failed`);
    console.log(`💰 Total cost change: ${totalCostChange > 0 ? '+' : ''}${totalCostChange.toFixed(4)}/month`);

    res.json({
      message: `Bulk storage class change completed: ${successCount} successful, ${failureCount} failed`,
      successCount,
      failureCount,
      totalCostChange,
      storageClass,
      results
    });

  } catch (error) {
    console.error('Bulk storage class change error:', error);
    res.status(500).json({ error: 'Bulk storage class change failed' });
  }
});

module.exports = router;