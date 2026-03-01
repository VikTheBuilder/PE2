#!/usr/bin/env node

/**
 * Manual S3 Bucket Cleanup Utility
 * 
 * This script can be used to manually clean up S3 buckets that failed to delete
 * during the account deletion process.
 * 
 * Usage: node cleanup-bucket.js <bucket-name>
 */

const { S3Client, ListObjectsV2Command, DeleteObjectsCommand, DeleteBucketCommand, ListObjectVersionsCommand, AbortMultipartUploadCommand, ListMultipartUploadsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION || 'us-east-1'
});

const deleteS3BucketCompletely = async (bucketName) => {
  console.log(`🔍 Starting comprehensive S3 bucket cleanup for: ${bucketName}`);

  try {
    // Step 1: Abort all incomplete multipart uploads
    console.log('🧹 Step 1: Aborting incomplete multipart uploads...');
    let multipartUploads;
    do {
      const listMultipartCommand = new ListMultipartUploadsCommand({
        Bucket: bucketName,
        MaxUploads: 1000
      });
      
      multipartUploads = await s3Client.send(listMultipartCommand);
      
      if (multipartUploads.Uploads && multipartUploads.Uploads.length > 0) {
        console.log(`Found ${multipartUploads.Uploads.length} incomplete multipart uploads`);
        
        for (const upload of multipartUploads.Uploads) {
          try {
            await s3Client.send(new AbortMultipartUploadCommand({
              Bucket: bucketName,
              Key: upload.Key,
              UploadId: upload.UploadId
            }));
            console.log(`✅ Aborted multipart upload for: ${upload.Key}`);
          } catch (abortError) {
            console.warn(`⚠️ Failed to abort multipart upload for ${upload.Key}:`, abortError.message);
          }
        }
      }
    } while (multipartUploads.IsTruncated);

    // Step 2: Delete all object versions (including delete markers)
    console.log('🧹 Step 2: Deleting all object versions...');
    let totalObjectsDeleted = 0;
    let continuationToken;
    
    do {
      const listVersionsCommand = new ListObjectVersionsCommand({
        Bucket: bucketName,
        MaxKeys: 1000,
        KeyMarker: continuationToken
      });
      
      const versionsList = await s3Client.send(listVersionsCommand);
      const objectsToDelete = [];
      
      // Add all versions
      if (versionsList.Versions) {
        versionsList.Versions.forEach(version => {
          objectsToDelete.push({
            Key: version.Key,
            VersionId: version.VersionId
          });
        });
      }
      
      // Add all delete markers
      if (versionsList.DeleteMarkers) {
        versionsList.DeleteMarkers.forEach(marker => {
          objectsToDelete.push({
            Key: marker.Key,
            VersionId: marker.VersionId
          });
        });
      }
      
      if (objectsToDelete.length > 0) {
        console.log(`🗑️ Deleting ${objectsToDelete.length} object versions...`);
        
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objectsToDelete,
            Quiet: false
          }
        });
        
        const deleteResult = await s3Client.send(deleteCommand);
        const deletedCount = deleteResult.Deleted ? deleteResult.Deleted.length : 0;
        totalObjectsDeleted += deletedCount;
        
        console.log(`✅ Successfully deleted ${deletedCount} object versions`);
        
        if (deleteResult.Errors && deleteResult.Errors.length > 0) {
          console.error(`❌ Failed to delete ${deleteResult.Errors.length} objects:`, deleteResult.Errors);
        }
      }
      
      continuationToken = versionsList.NextKeyMarker;
    } while (continuationToken);

    // Step 3: Final check - delete any remaining objects using ListObjectsV2
    console.log('🧹 Step 3: Final cleanup of any remaining objects...');
    let objectsContinuationToken;
    
    do {
      const listObjectsCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1000,
        ContinuationToken: objectsContinuationToken
      });
      
      const objectsList = await s3Client.send(listObjectsCommand);
      
      if (objectsList.Contents && objectsList.Contents.length > 0) {
        console.log(`🗑️ Found ${objectsList.Contents.length} remaining objects to delete`);
        
        const objectsToDelete = objectsList.Contents.map(obj => ({ Key: obj.Key }));
        
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objectsToDelete,
            Quiet: false
          }
        });
        
        const deleteResult = await s3Client.send(deleteCommand);
        const deletedCount = deleteResult.Deleted ? deleteResult.Deleted.length : 0;
        totalObjectsDeleted += deletedCount;
        
        console.log(`✅ Successfully deleted ${deletedCount} remaining objects`);
        
        if (deleteResult.Errors && deleteResult.Errors.length > 0) {
          console.error(`❌ Failed to delete ${deleteResult.Errors.length} objects:`, deleteResult.Errors);
        }
      }
      
      objectsContinuationToken = objectsList.NextContinuationToken;
    } while (objectsContinuationToken);

    console.log(`📊 Total objects deleted: ${totalObjectsDeleted}`);

    // Step 4: Final verification - ensure bucket is empty
    console.log('🔍 Step 4: Verifying bucket is empty...');
    const finalCheck = await s3Client.send(new ListObjectsV2Command({ 
      Bucket: bucketName, 
      MaxKeys: 1 
    }));
    
    if (finalCheck.Contents && finalCheck.Contents.length > 0) {
      throw new Error(`Bucket still contains ${finalCheck.Contents.length} objects after cleanup`);
    }

    // Step 5: Delete the bucket
    console.log('🪣 Step 5: Deleting the bucket...');
    await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
    
    console.log(`🎉 Successfully deleted bucket ${bucketName} and all its contents`);
    
  } catch (error) {
    console.error(`❌ Error during bucket deletion for ${bucketName}:`, {
      name: error.name,
      message: error.message,
      code: error.Code || error.code,
      statusCode: error.$metadata?.httpStatusCode
    });
    
    if (error.name === 'NoSuchBucket') {
      console.log(`ℹ️ Bucket ${bucketName} doesn't exist (already deleted or never created)`);
      return;
    }
    
    throw error;
  }
};

// Main execution
const main = async () => {
  const bucketName = process.argv[2];
  
  if (!bucketName) {
    console.error('❌ Usage: node cleanup-bucket.js <bucket-name>');
    console.error('Example: node cleanup-bucket.js vaultify-1234567890-abc123');
    process.exit(1);
  }
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not found. Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set in your .env file.');
    process.exit(1);
  }
  
  console.log(`🚀 Starting manual cleanup for bucket: ${bucketName}`);
  console.log(`📍 AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  
  try {
    await deleteS3BucketCompletely(bucketName);
    console.log('✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { deleteS3BucketCompletely };