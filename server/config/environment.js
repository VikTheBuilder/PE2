/**
 * Environment Configuration
 * Centralizes all environment variable handling and validation
 */

require('dotenv').config();

// Environment variables with defaults
const config = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  BASE_URL: process.env.BASE_URL,

  // AWS Configuration
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',

  // Development Mode
  DEV_MODE: process.env.DEV_MODE === 'true',

  // File Upload Settings
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES || `${25 * 1024 * 1024}`, 10),

  // Storage Class Configuration
  SHOW_STORAGE_CLASS_OPTIONS: process.env.SHOW_STORAGE_CLASS_OPTIONS === 'true',
  SHOW_STORAGE_RECOMMENDATIONS: process.env.SHOW_STORAGE_RECOMMENDATIONS === 'true',
  DEFAULT_STORAGE_CLASS: process.env.DEFAULT_STORAGE_CLASS || 'STANDARD',

  // Recommendation Thresholds
  RECOMMEND_STANDARD_IA_THRESHOLD_MB: parseInt(process.env.RECOMMEND_STANDARD_IA_THRESHOLD_MB || '100', 10),
  RECOMMEND_GLACIER_EXTENSIONS: (process.env.RECOMMEND_GLACIER_EXTENSIONS || '.zip,.rar,.tar,.gz,.7z,.bz2').split(','),
  RECOMMEND_GLACIER_IR_EXTENSIONS: (process.env.RECOMMEND_GLACIER_IR_EXTENSIONS || '.bak,.backup,.sql,.dump').split(','),
  RECOMMEND_STANDARD_EXTENSIONS: (process.env.RECOMMEND_STANDARD_EXTENSIONS || '.jpg,.jpeg,.png,.gif,.mp4,.avi,.pdf,.doc,.docx').split(','),

  // Billing Configuration
  SITE_MARGIN: parseFloat(process.env.SITE_MARGIN || '30'), // 30% markup by default

  // Paths
  LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH || './storage',

  // Unicorn Studio
  REACT_APP_UNICORN_PROJECT_ID: process.env.REACT_APP_UNICORN_PROJECT_ID
};

// Validation
const validateConfig = () => {
  const errors = [];

  if (!config.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  }

  if (!config.DEV_MODE && (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY)) {
    errors.push('AWS credentials are required when DEV_MODE is false');
  }

  if (errors.length > 0) {
    console.error('FATAL: Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
};

// Validate configuration on load
validateConfig();

// Log configuration (without sensitive data)
if (config.NODE_ENV === 'development') {
  console.log('🔧 Configuration loaded:');
  console.log(`  - Environment: ${config.NODE_ENV}`);
  console.log(`  - Port: ${config.PORT}`);
  console.log(`  - AWS Region: ${config.AWS_REGION}`);
  console.log(`  - Dev Mode: ${config.DEV_MODE}`);
  console.log(`  - Site Margin: ${config.SITE_MARGIN}%`);
}

module.exports = config;