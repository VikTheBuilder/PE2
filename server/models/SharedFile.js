/**
 * Shared File Model
 * Handles shared file data operations
 */

const fs = require('fs').promises;
const path = require('path');
const { DATA_DIR } = require('../config/database');

// Read user shared files
const readSharedFiles = async (userId) => {
  if (!userId) {
    console.error('readSharedFiles called without userId');
    return [];
  }
  
  const userSharedFilesFile = path.join(DATA_DIR, userId, 'sharedFiles.json');
  try {
    const data = await fs.readFile(userSharedFilesFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Write user shared files
const writeSharedFiles = async (userId, sharedFiles) => {
  const userSharedFilesFile = path.join(DATA_DIR, userId, 'sharedFiles.json');
  await fs.writeFile(userSharedFilesFile, JSON.stringify(sharedFiles, null, 2));
};

// Add shared file
const addSharedFile = async (userId, sharedFileData) => {
  const sharedFiles = await readSharedFiles(userId);
  
  // Check if file is already shared, update if so
  const existingIndex = sharedFiles.findIndex(sf => sf.fileId === sharedFileData.fileId);
  if (existingIndex >= 0) {
    // Update existing share with new token and expiry
    sharedFiles[existingIndex] = { ...sharedFiles[existingIndex], ...sharedFileData };
  } else {
    sharedFiles.unshift(sharedFileData); // Add to beginning
  }
  
  await writeSharedFiles(userId, sharedFiles);
  return sharedFileData;
};

// Update shared file
const updateSharedFile = async (userId, fileId, updateData) => {
  const sharedFiles = await readSharedFiles(userId);
  const sharedFileIndex = sharedFiles.findIndex(sf => sf.fileId === fileId);
  
  if (sharedFileIndex === -1) {
    throw new Error('Shared file not found');
  }
  
  sharedFiles[sharedFileIndex] = { ...sharedFiles[sharedFileIndex], ...updateData };
  await writeSharedFiles(userId, sharedFiles);
  return sharedFiles[sharedFileIndex];
};

// Remove shared file
const removeSharedFile = async (userId, fileId) => {
  const sharedFiles = await readSharedFiles(userId);
  const updatedSharedFiles = sharedFiles.filter(sf => sf.fileId !== fileId);
  await writeSharedFiles(userId, updatedSharedFiles);
  return true;
};

// Clean expired shared files for a user
const cleanExpiredSharedFiles = async (userId) => {
  const sharedFiles = await readSharedFiles(userId);
  const now = Date.now();
  const expired = sharedFiles.filter(sf => sf.expiryTimestamp && now > sf.expiryTimestamp);
  
  if (expired.length > 0) {
    const updatedSharedFiles = sharedFiles.filter(sf => !expired.some(e => e.id === sf.id));
    await writeSharedFiles(userId, updatedSharedFiles);
  }
  
  return expired.length;
};

module.exports = {
  readSharedFiles,
  writeSharedFiles,
  addSharedFile,
  updateSharedFile,
  removeSharedFile,
  cleanExpiredSharedFiles
};