/**
 * AWS S3 Service
 * Handles all AWS S3 operations
 */

const { 
  S3Client, 
  CreateBucketCommand, 
  HeadBucketCommand, 
  PutPublicAccessBlockCommand, 
  PutBucketEncryptionCommand, 
  PutBucketOwnershipControlsCommand, 
  ListBucketsCommand, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command, 
  DeleteObjectsCommand, 
  DeleteBucketCommand,
  ListObjectVersionsCommand,
  AbortMultipartUploadCommand,
  ListMultipartUploadsCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config/environment');

// Initialize S3 client
const s3Client = config.DEV_MODE ? null : new S3Client({
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
  region: config.AWS_REGION
});

// Test AWS connection on startup
const testAWSConnection = async () => {
  if (config.DEV_MODE || !s3Client) {
    console.log('🚧 DEV_MODE enabled - AWS S3 operations will be bypassed');
    return;
  }

  console.log(`Testing AWS connection with region: ${config.AWS_REGION}`);
  console.log(`Access Key ID: ${config.AWS_ACCESS_KEY_ID?.substring(0, 8)}...`);
  
  try {
    const command = new ListBucketsCommand({});
    const data = await s3Client.send(command);
    console.log('✅ AWS Connection Test Successful');
    console.log(`Found ${data.Buckets.length} existing buckets`);
  } catch (err) {
    console.error('❌ AWS Connection Test Failed:', err.name, err.message);
  }
};

// Create S3 bucket with proper configuration
const createUserBucket = async (bucketName) => {
  if (config.DEV_MODE) {
    console.log(`DEV_MODE: Skipping S3 bucket creation for bucket ${bucketName}`);
    return bucketName;
  }

  try {
    console.log(`Attempting to create bucket: ${bucketName} in region: ${config.AWS_REGION}`);
    
    const createParams = { Bucket: bucketName };
    if (config.AWS_REGION !== 'us-east-1') {
      createParams.CreateBucketConfiguration = { LocationConstraint: config.AWS_REGION };
      console.log(`Adding LocationConstraint: ${config.AWS_REGION}`);
    }

    console.log('Step 1: Creating bucket...');
    const createCommand = new CreateBucketCommand(createParams);
    await s3Client.send(createCommand);
    console.log('✅ Bucket created successfully');

    console.log('Step 2: Setting public access block...');
    const publicAccessCommand = new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true
      }
    });
    await s3Client.send(publicAccessCommand);
    console.log('✅ Public access block set');

    console.log('Step 3: Setting bucket encryption...');
    const encryptionCommand = new PutBucketEncryptionCommand({
      Bucket: bucketName,
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' }
          }
        ]
      }
    });
    await s3Client.send(encryptionCommand);
    console.log('✅ Bucket encryption set');

    console.log('Step 4: Setting ownership controls...');
    const ownershipCommand = new PutBucketOwnershipControlsCommand({
      Bucket: bucketName,
      OwnershipControls: {
        Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }]
      }
    });
    await s3Client.send(ownershipCommand);
    console.log('✅ Ownership controls set');

    console.log(`🎉 S3 bucket fully configured: ${bucketName}`);
    return bucketName;
  } catch (error) {
    console.error('❌ Error creating S3 bucket:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Region:', error.region);
    throw error;
  }
};

// Comprehensive S3 bucket deletion
const deleteS3BucketCompletely = async (bucketName) => {
  if (config.DEV_MODE) {
    console.log(`DEV_MODE: Skipping S3 bucket deletion for bucket ${bucketName}`);
    return;
  }

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
    
    if (error.name === 'BucketNotEmpty') {
      throw new Error(`Bucket ${bucketName} is not empty after cleanup attempts. Manual intervention may be required.`);
    }
    
    if (error.name === 'AccessDenied') {
      throw new Error(`Access denied when trying to delete bucket ${bucketName}. Check AWS permissions.`);
    }
    
    throw error;
  }
};

// Upload file to S3
const uploadFileToS3 = async (bucketName, key, buffer, storageClass = 'STANDARD') => {
  if (config.DEV_MODE) {
    console.log(`DEV_MODE: Simulating S3 upload for ${key}`);
    return `https://dev-mode-url/${key}`;
  }

  const uploadParams = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    StorageClass: storageClass,
    ServerSideEncryption: 'AES256'
  };

  const command = new PutObjectCommand(uploadParams);
  await s3Client.send(command);

  // Generate pre-signed URL for download
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
  return signedUrl;
};

// Delete file from S3
const deleteFileFromS3 = async (bucketName, key) => {
  if (config.DEV_MODE) {
    console.log(`DEV_MODE: Simulating S3 delete for ${key}`);
    return;
  }

  const deleteParams = {
    Bucket: bucketName,
    Key: key
  };

  const command = new DeleteObjectCommand(deleteParams);
  await s3Client.send(command);
};

// Check if bucket exists
const checkBucketExists = async (bucketName) => {
  if (config.DEV_MODE) {
    return true;
  }

  try {
    const headCommand = new HeadBucketCommand({ Bucket: bucketName });
    await s3Client.send(headCommand);
    return true;
  } catch (error) {
    if (error.name === 'NoSuchBucket' || error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

// Generate presigned URL for sharing (with custom expiry)
const generatePresignedShareUrl = async (bucketName, key, expiresInSeconds = 3600) => {
  if (config.DEV_MODE) {
    console.log(`DEV_MODE: Simulating presigned URL for ${key}, expires in ${expiresInSeconds}s`);
    return `https://dev-mode-share-url/${key}?expires=${Date.now() + (expiresInSeconds * 1000)}`;
  }

  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    // Generate presigned URL with custom expiry
    const signedUrl = await getSignedUrl(s3Client, getCommand, { 
      expiresIn: expiresInSeconds 
    });
    
    console.log(`✅ Generated presigned URL for ${key}, expires in ${expiresInSeconds}s`);
    return signedUrl;
  } catch (error) {
    console.error('❌ Error generating presigned URL:', error);
    throw error;
  }
};

// Get file metadata from S3
const getFileMetadata = async (bucketName, key) => {
  if (config.DEV_MODE) {
    return {
      ContentLength: 1024,
      ContentType: 'application/octet-stream',
      LastModified: new Date()
    };
  }

  try {
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    const metadata = await s3Client.send(headCommand);
    return metadata;
  } catch (error) {
    console.error('❌ Error getting file metadata:', error);
    throw error;
  }
};

module.exports = {
  s3Client,
  testAWSConnection,
  createUserBucket,
  deleteS3BucketCompletely,
  uploadFileToS3,
  deleteFileFromS3,
  checkBucketExists,
  generatePresignedShareUrl,
  getFileMetadata
};