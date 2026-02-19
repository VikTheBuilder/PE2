#!/usr/bin/env node

/**
 * List S3 Buckets Utility
 * 
 * This script lists all S3 buckets in your AWS account
 * 
 * Usage: node list-buckets.js
 */

const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION || 'us-east-1'
});

const listBuckets = async () => {
  try {
    console.log('🔍 Listing all S3 buckets...');
    console.log(`📍 AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    
    const command = new ListBucketsCommand({});
    const data = await s3Client.send(command);
    
    if (!data.Buckets || data.Buckets.length === 0) {
      console.log('✅ No buckets found in your AWS account');
      return;
    }
    
    console.log(`\n📊 Found ${data.Buckets.length} bucket(s):\n`);
    
    data.Buckets.forEach((bucket, index) => {
      console.log(`${index + 1}. ${bucket.Name}`);
      console.log(`   Created: ${bucket.CreationDate}`);
      console.log('');
    });
    
    console.log('🧹 To delete a bucket, run:');
    console.log('npm run cleanup-bucket <bucket-name>');
    console.log('\nExample:');
    data.Buckets.forEach(bucket => {
      console.log(`npm run cleanup-bucket ${bucket.Name}`);
    });
    
  } catch (error) {
    console.error('❌ Error listing buckets:', {
      name: error.name,
      message: error.message,
      code: error.Code || error.code
    });
    
    if (error.name === 'AccessDenied') {
      console.error('💡 Make sure your AWS credentials have S3 permissions');
    }
  }
};

// Main execution
const main = async () => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not found. Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set in your .env file.');
    process.exit(1);
  }
  
  await listBuckets();
};

if (require.main === module) {
  main();
}

module.exports = { listBuckets };