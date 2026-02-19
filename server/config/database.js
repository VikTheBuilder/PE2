/**
 * Database Configuration
 * Handles data storage paths and initialization
 */

const path = require('path');
const fs = require('fs').promises;

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
const initializeDataDirectory = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('📁 Data directory initialized');
  } catch (error) {
    console.error('Failed to initialize data directory:', error);
    throw error;
  }
};

// Initialize user-specific storage
const initializeUserStorage = async (userId) => {
  const userDir = path.join(DATA_DIR, userId);
  const userFilesFile = path.join(userDir, 'files.json');
  const userBillingFile = path.join(userDir, 'billing.json');
  const userSharedFilesFile = path.join(userDir, 'sharedFiles.json');
  
  try {
    await fs.mkdir(userDir, { recursive: true });

    // Initialize user files
    try {
      await fs.access(userFilesFile);
    } catch {
      await fs.writeFile(userFilesFile, JSON.stringify([], null, 2));
    }

    // Initialize user billing
    try {
      await fs.access(userBillingFile);
    } catch {
      await fs.writeFile(userBillingFile, JSON.stringify([], null, 2));
    }

    // Initialize user shared files
    try {
      await fs.access(userSharedFilesFile);
    } catch {
      await fs.writeFile(userSharedFilesFile, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error(`Error initializing storage for user ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  DATA_DIR,
  USERS_FILE,
  initializeDataDirectory,
  initializeUserStorage
};