/**
 * File Model with Versioning Support
 * Handles file data operations including version management
 */

const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');
const { DATA_DIR } = require('../config/database');

// Read user files
const readFiles = async (userId) => {
  if (!userId) {
    console.error('readFiles called without userId');
    return [];
  }
  
  const userFilesFile = path.join(DATA_DIR, userId, 'files.json');
  try {
    const data = await fs.readFile(userFilesFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Write user files
const writeFiles = async (userId, files) => {
  const userFilesFile = path.join(DATA_DIR, userId, 'files.json');
  await fs.writeFile(userFilesFile, JSON.stringify(files, null, 2));
};

// Find file by ID
const findFileById = async (userId, fileId) => {
  const files = await readFiles(userId);
  return files.find(f => f.id === fileId);
};

// Add file with versioning support
const addFile = async (userId, fileData) => {
  const files = await readFiles(userId);
  
  // Check if file with same name already exists
  const existingFile = files.find(f => f.originalName === fileData.originalName && f.parentFolderId === fileData.parentFolderId);
  
  if (existingFile) {
    // Check if existing file has version structure
    if (!existingFile.versions || !existingFile.currentVersion) {
      // Convert legacy file to versioned file
      const legacyFileConverted = await convertLegacyFileToVersioned(userId, existingFile);
      // Now create new version
      return await createNewVersion(userId, legacyFileConverted.id, fileData);
    } else {
      // Create new version of existing versioned file
      return await createNewVersion(userId, existingFile.id, fileData);
    }
  } else {
    // Create new file with initial version
    const newFile = {
      ...fileData,
      currentVersion: 1,
      versions: [{
        versionId: randomUUID(),
        versionNumber: 1,
        s3Key: fileData.s3Key,
        fileSize: fileData.fileSize,
        storageClass: fileData.storageClass,
        uploadDate: fileData.uploadDate,
        uploadedBy: userId,
        comment: fileData.comment || 'Initial version',
        isActive: true,
        checksum: fileData.checksum || null,
        metadata: {}
      }],
      totalVersions: 1,
      versioningEnabled: true
    };
    
    files.unshift(newFile);
    await writeFiles(userId, files);
    return newFile;
  }
};

// Convert legacy file (without version structure) to versioned file
const convertLegacyFileToVersioned = async (userId, legacyFile) => {
  const files = await readFiles(userId);
  const fileIndex = files.findIndex(f => f.id === legacyFile.id);
  
  if (fileIndex === -1) {
    throw new Error('Legacy file not found');
  }
  
  // Convert legacy file to versioned structure
  const versionedFile = {
    ...legacyFile,
    currentVersion: 1,
    versions: [{
      versionId: randomUUID(),
      versionNumber: 1,
      s3Key: legacyFile.s3Key,
      fileSize: legacyFile.fileSize,
      storageClass: legacyFile.storageClass,
      uploadDate: legacyFile.uploadDate,
      uploadedBy: userId,
      comment: 'Initial version (converted from legacy)',
      isActive: true,
      checksum: null,
      metadata: {}
    }],
    totalVersions: 1,
    versioningEnabled: true
  };
  
  files[fileIndex] = versionedFile;
  await writeFiles(userId, files);
  return versionedFile;
};

// Create new version of existing file
const createNewVersion = async (userId, fileId, versionData) => {
  const files = await readFiles(userId);
  const fileIndex = files.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    throw new Error('File not found');
  }
  
  const file = files[fileIndex];
  const newVersionNumber = file.currentVersion + 1;
  
  // Mark all existing versions as inactive
  file.versions.forEach(v => v.isActive = false);
  
  // Create new version
  const newVersion = {
    versionId: randomUUID(),
    versionNumber: newVersionNumber,
    s3Key: versionData.s3Key,
    fileSize: versionData.fileSize,
    storageClass: versionData.storageClass,
    uploadDate: versionData.uploadDate,
    uploadedBy: userId,
    comment: versionData.comment || `Version ${newVersionNumber}`,
    isActive: true,
    checksum: versionData.checksum || null,
    metadata: versionData.metadata || {}
  };
  
  // Add new version
  file.versions.push(newVersion);
  file.currentVersion = newVersionNumber;
  file.totalVersions = file.versions.length;
  
  // Update file metadata with current version info
  file.fileSize = versionData.fileSize;
  file.storageClass = versionData.storageClass;
  file.uploadDate = versionData.uploadDate;
  file.s3Key = versionData.s3Key;
  file.url = versionData.url;
  
  files[fileIndex] = file;
  await writeFiles(userId, files);
  return file;
};

// Update file
const updateFile = async (userId, fileId, updateData) => {
  const files = await readFiles(userId);
  const fileIndex = files.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    throw new Error('File not found');
  }
  
  files[fileIndex] = { ...files[fileIndex], ...updateData };
  await writeFiles(userId, files);
  return files[fileIndex];
};

// Delete file
const deleteFile = async (userId, fileId) => {
  const files = await readFiles(userId);
  const updatedFiles = files.filter(f => f.id !== fileId);
  await writeFiles(userId, updatedFiles);
  return true;
};

// Delete multiple files
const deleteMultipleFiles = async (userId, fileIds) => {
  const files = await readFiles(userId);
  const results = [];
  
  for (const fileId of fileIds) {
    try {
      const fileExists = files.some(f => f.id === fileId);
      if (fileExists) {
        results.push({ id: fileId, success: true });
      } else {
        results.push({ id: fileId, success: false, error: 'File not found' });
      }
    } catch (error) {
      results.push({ id: fileId, success: false, error: error.message });
    }
  }
  
  // Remove all successful files
  const successfulIds = results.filter(r => r.success).map(r => r.id);
  const updatedFiles = files.filter(f => !successfulIds.includes(f.id));
  await writeFiles(userId, updatedFiles);
  
  return results;
};

// Get version history for a file
const getVersionHistory = async (userId, fileId) => {
  const file = await findFileById(userId, fileId);
  if (!file) {
    throw new Error('File not found');
  }
  
  return {
    fileId: file.id,
    originalName: file.originalName,
    currentVersion: file.currentVersion,
    totalVersions: file.totalVersions,
    versions: file.versions.sort((a, b) => b.versionNumber - a.versionNumber) // Latest first
  };
};

// Restore a specific version
const restoreVersion = async (userId, fileId, versionId) => {
  const files = await readFiles(userId);
  const fileIndex = files.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    throw new Error('File not found');
  }
  
  const file = files[fileIndex];
  const versionToRestore = file.versions.find(v => v.versionId === versionId);
  
  if (!versionToRestore) {
    throw new Error('Version not found');
  }
  
  // Mark all versions as inactive
  file.versions.forEach(v => v.isActive = false);
  
  // Mark selected version as active
  versionToRestore.isActive = true;
  
  // Update file metadata with restored version info
  file.fileSize = versionToRestore.fileSize;
  file.storageClass = versionToRestore.storageClass;
  file.s3Key = versionToRestore.s3Key;
  file.currentVersion = versionToRestore.versionNumber;
  
  files[fileIndex] = file;
  await writeFiles(userId, files);
  return file;
};

// Delete a specific version
const deleteVersion = async (userId, fileId, versionId) => {
  const files = await readFiles(userId);
  const fileIndex = files.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    throw new Error('File not found');
  }
  
  const file = files[fileIndex];
  const versionIndex = file.versions.findIndex(v => v.versionId === versionId);
  
  if (versionIndex === -1) {
    throw new Error('Version not found');
  }
  
  const versionToDelete = file.versions[versionIndex];
  
  // Cannot delete the only version or the active version
  if (file.versions.length === 1) {
    throw new Error('Cannot delete the only version of a file');
  }
  
  if (versionToDelete.isActive) {
    throw new Error('Cannot delete the active version. Restore another version first.');
  }
  
  // Remove the version
  file.versions.splice(versionIndex, 1);
  file.totalVersions = file.versions.length;
  
  files[fileIndex] = file;
  await writeFiles(userId, files);
  
  return {
    deletedVersion: versionToDelete,
    file: file
  };
};

// Get specific version details
const getVersionById = async (userId, fileId, versionId) => {
  const file = await findFileById(userId, fileId);
  if (!file) {
    throw new Error('File not found');
  }
  
  const version = file.versions.find(v => v.versionId === versionId);
  if (!version) {
    throw new Error('Version not found');
  }
  
  return {
    ...version,
    fileName: file.originalName,
    fileId: file.id
  };
};

// Update version metadata (comment, etc.)
const updateVersionMetadata = async (userId, fileId, versionId, metadata) => {
  const files = await readFiles(userId);
  const fileIndex = files.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    throw new Error('File not found');
  }
  
  const file = files[fileIndex];
  const version = file.versions.find(v => v.versionId === versionId);
  
  if (!version) {
    throw new Error('Version not found');
  }
  
  // Update version metadata
  if (metadata.comment !== undefined) version.comment = metadata.comment;
  if (metadata.metadata !== undefined) version.metadata = { ...version.metadata, ...metadata.metadata };
  
  files[fileIndex] = file;
  await writeFiles(userId, files);
  return version;
};

module.exports = {
  readFiles,
  writeFiles,
  findFileById,
  addFile,
  updateFile,
  deleteFile,
  deleteMultipleFiles,
  convertLegacyFileToVersioned,
  createNewVersion,
  getVersionHistory,
  restoreVersion,
  deleteVersion,
  getVersionById,
  updateVersionMetadata
};