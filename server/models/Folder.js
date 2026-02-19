/**
 * Folder Model
 * Handles folder data operations
 */

const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, '../data');
const FOLDERS_FILE = path.join(DATA_DIR, 'folders.json');

// Initialize folders file if it doesn't exist
const initializeFoldersFile = async () => {
  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Check if folders file exists
    await fs.access(FOLDERS_FILE);
  } catch (error) {
    // Create folders file if it doesn't exist
    await fs.writeFile(FOLDERS_FILE, JSON.stringify([], null, 2));
    console.log('📁 Folders file initialized');
  }
};

// Read folders from file
const readFolders = async (userId) => {
  await initializeFoldersFile();
  const data = await fs.readFile(FOLDERS_FILE, 'utf8');
  const allFolders = JSON.parse(data);
  return allFolders.filter(folder => folder.userId === userId);
};

// Write folders to file
const writeFolders = async (allFolders) => {
  await fs.writeFile(FOLDERS_FILE, JSON.stringify(allFolders, null, 2));
};

// Add new folder
const addFolder = async (userId, folderData) => {
  const allFolders = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
  
  // Check if folder with same name already exists in the same parent
  const existingFolder = allFolders.find(f => 
    f.userId === userId && 
    f.name === folderData.name && 
    f.parentFolderId === folderData.parentFolderId
  );
  
  if (existingFolder) {
    throw new Error('A folder with this name already exists in this location');
  }
  
  const newFolder = {
    id: randomUUID(),
    userId: userId,
    name: folderData.name,
    parentFolderId: folderData.parentFolderId || null,
    createdDate: new Date().toISOString(),
    isFolder: true
  };
  
  allFolders.push(newFolder);
  await writeFolders(allFolders);
  
  return newFolder;
};

// Find folder by ID
const findFolderById = async (userId, folderId) => {
  const folders = await readFolders(userId);
  return folders.find(folder => folder.id === folderId);
};

// Delete folder
const deleteFolder = async (userId, folderId) => {
  const allFolders = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
  
  // Find the folder to delete
  const folderIndex = allFolders.findIndex(f => f.id === folderId && f.userId === userId);
  if (folderIndex === -1) {
    throw new Error('Folder not found');
  }
  
  // Check if folder has subfolders or files
  const hasSubfolders = allFolders.some(f => f.parentFolderId === folderId && f.userId === userId);
  if (hasSubfolders) {
    throw new Error('Cannot delete folder that contains subfolders. Please delete subfolders first.');
  }
  
  // Check if folder has files (this would need to be checked against files.json)
  const { readFiles } = require('./File');
  const files = await readFiles(userId);
  const hasFiles = files.some(f => f.parentFolderId === folderId);
  if (hasFiles) {
    throw new Error('Cannot delete folder that contains files. Please move or delete files first.');
  }
  
  // Remove the folder
  allFolders.splice(folderIndex, 1);
  await writeFolders(allFolders);
  
  return true;
};

// Update folder
const updateFolder = async (userId, folderId, updates) => {
  const allFolders = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
  
  const folderIndex = allFolders.findIndex(f => f.id === folderId && f.userId === userId);
  if (folderIndex === -1) {
    throw new Error('Folder not found');
  }
  
  // Check for name conflicts if name is being updated
  if (updates.name) {
    const existingFolder = allFolders.find(f => 
      f.userId === userId && 
      f.name === updates.name && 
      f.parentFolderId === allFolders[folderIndex].parentFolderId &&
      f.id !== folderId
    );
    
    if (existingFolder) {
      throw new Error('A folder with this name already exists in this location');
    }
  }
  
  // Update the folder
  allFolders[folderIndex] = { ...allFolders[folderIndex], ...updates };
  await writeFolders(allFolders);
  
  return allFolders[folderIndex];
};

// Get folder path (for breadcrumbs)
const getFolderPath = async (userId, folderId) => {
  if (!folderId) return [];
  
  const folders = await readFolders(userId);
  const path = [];
  let currentFolderId = folderId;
  
  while (currentFolderId) {
    const folder = folders.find(f => f.id === currentFolderId);
    if (!folder) break;
    
    path.unshift(folder);
    currentFolderId = folder.parentFolderId;
  }
  
  return path;
};

module.exports = {
  readFolders,
  addFolder,
  findFolderById,
  deleteFolder,
  updateFolder,
  getFolderPath
};