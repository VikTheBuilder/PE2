/**
 * Vaultify Server Application
 * Main server file with modular architecture
 */

'use strict';

const express = require('express');
const config = require('./config/environment');
const { initializeDataDirectory } = require('./config/database');
const { setupHelmet, setupCORS, setupRateLimit } = require('./middleware/security');
const { testAWSConnection } = require('./services/awsService');

// Import routes
console.log('📦 Loading routes...');
const authRoutes = require('./routes/auth');
console.log('✅ Auth routes loaded');
const filesRoutes = require('./routes/files');
console.log('✅ Files routes loaded');
const sharedFilesRoutes = require('./routes/sharedFiles');
console.log('✅ Shared files routes loaded');
const storageRoutes = require('./routes/storage');
console.log('✅ Storage routes loaded');
const billingRoutes = require('./routes/billing');
console.log('✅ Billing routes loaded');
const versionRoutes = require('./routes/versions');
console.log('✅ Version routes loaded');
const folderRoutes = require('./routes/folders');
console.log('✅ Folder routes loaded');
const computeRoutes = require('./routes/compute');
console.log('✅ Compute routes loaded');

const app = express();

// Initialize application
const initializeApp = async () => {
  try {
    // Initialize data directory
    await initializeDataDirectory();

    // Test AWS connection
    await testAWSConnection();

    console.log('🚀 Application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
};

// Security middleware
app.use(setupHelmet());
app.use(setupCORS());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for API routes
app.use('/api/', setupRateLimit());

// Request logging middleware
const SENSITIVE_FIELDS = ['password', 'secret', 'token', 'apikey', 'authorization', 'newpassword', 'confirmpassword'];
app.use('/api', (req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitized = { ...req.body };
    for (const key of Object.keys(sanitized)) {
      if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
        sanitized[key] = '********';
      }
    }
    console.log(`📝 Body:`, JSON.stringify(sanitized, null, 2));
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: '1.0.0'
  });
});

// API Routes
console.log('🔗 Registering API routes...');
app.use('/api/auth', authRoutes);
console.log('✅ /api/auth registered');
app.use('/api/files', filesRoutes);
console.log('✅ /api/files registered');
app.use('/api/shared-files', sharedFilesRoutes);
console.log('✅ /api/shared-files registered');
app.use('/api/storage', storageRoutes);
console.log('✅ /api/storage registered');
app.use('/api/billing', billingRoutes);
console.log('✅ /api/billing registered');
app.use('/api/versions', versionRoutes);
console.log('✅ /api/versions registered');
app.use('/api/folders', folderRoutes);
console.log('✅ /api/folders registered');
app.use('/api/compute', computeRoutes);
console.log('✅ /api/compute registered');

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: config.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const startServer = async () => {
  await initializeApp();

  app.listen(config.PORT, () => {
    console.log(`🌟 Vaultify server running on port ${config.PORT}`);
    console.log(`📍 Environment: ${config.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${config.PORT}/api/health`);
  });
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;