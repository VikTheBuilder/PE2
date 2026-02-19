#!/usr/bin/env node

/**
 * Migration Script: Convert Legacy Files to Versioned Format
 * 
 * This script converts existing files to the new versioning format
 * 
 * Usage: node migrate-to-versioning.js
 */

const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');
require('dotenv').config();

const DATA_DIR = path.join(__dirname, 'data');

const migrateUserFiles = async (userId) => {
  const userFilesFile = path.join(DATA_DIR, userId, 'files.json');
  
  try {
    const data = await fs.readFile(userFilesFile, 'utf8');
    const files = JSON.parse(data);
    
    let migratedCount = 0;
    
    const migratedFiles = files.map(file => {
      // Check if file already has version structure
      if (file.versions && file.currentVersion) {
        return file; // Already versioned
      }
      
      // Convert legacy file to versioned format
      migratedCount++;
      return {
        ...file,
        currentVersion: 1,
        versions: [{
          versionId: randomUUID(),
          versionNumber: 1,
          s3Key: file.s3Key,
          fileSize: file.fileSize,
          storageClass: file.storageClass || 'STANDARD',
          uploadDate: file.uploadDate,
          uploadedBy: userId,
          comment: 'Initial version (migrated from legacy)',
          isActive: true,
          checksum: null,
          metadata: {}
        }],
        totalVersions: 1,
        versioningEnabled: true
      };
    });
    
    if (migratedCount > 0) {
      await fs.writeFile(userFilesFile, JSON.stringify(migratedFiles, null, 2));
      console.log(`✅ Migrated ${migratedCount} files for user ${userId}`);
    } else {
      console.log(`ℹ️  No files to migrate for user ${userId}`);
    }
    
    return migratedCount;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`ℹ️  No files found for user ${userId}`);
      return 0;
    }
    console.error(`❌ Error migrating files for user ${userId}:`, error);
    return 0;
  }
};

const main = async () => {
  console.log('🚀 Starting file versioning migration...');
  
  try {
    // Get all user directories
    const userDirs = await fs.readdir(DATA_DIR);
    let totalMigrated = 0;
    
    for (const userId of userDirs) {
      const userPath = path.join(DATA_DIR, userId);
      const stat = await fs.stat(userPath);
      
      if (stat.isDirectory()) {
        const migratedCount = await migrateUserFiles(userId);
        totalMigrated += migratedCount;
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Total files migrated: ${totalMigrated}`);
    console.log(`👥 Users processed: ${userDirs.length}`);
    
    if (totalMigrated > 0) {
      console.log('\n✅ All existing files now support versioning!');
      console.log('🔄 Restart your server to use the new versioning system.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { migrateUserFiles };