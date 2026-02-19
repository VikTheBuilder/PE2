/**
 * Authentication Routes
 * Handles user registration, login, and account management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const config = require('../config/environment');
const { initializeUserStorage, DATA_DIR } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { createUser, findUserByEmail, deleteUser } = require('../models/User');
const { createUserBucket, deleteS3BucketCompletely } = require('../services/awsService');

const router = express.Router();

// Register User
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique bucket name
    const bucketName = config.DEV_MODE
      ? `dev-bucket-${randomUUID()}`
      : `skycrate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create S3 bucket
    try {
      await createUserBucket(bucketName);
    } catch (error) {
      console.error('Failed to create S3 bucket:', error);
      return res.status(500).json({
        error: 'Failed to create storage bucket',
        details: `${error.code}: ${error.message}`
      });
    }

    // Create user
    const newUser = {
      id: randomUUID(),
      email,
      password: hashedPassword,
      username,
      awsBucketName: bucketName,
      createdAt: new Date().toISOString()
    };

    await createUser(newUser);

    // Initialize user-specific storage
    try {
      await initializeUserStorage(newUser.id);
      console.log(`✅ Initialized storage for new user: ${newUser.id}`);
    } catch (initError) {
      console.error('Failed to initialize user storage:', initError);
    }

    // Generate JWT token
    const token = jwt.sign({ userId: newUser.id }, config.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        bucketName: newUser.awsBucketName
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        bucketName: user.awsBucketName
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Delete Account and S3 Bucket
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bucketName = req.user.awsBucketName;
    console.log(`⚠️  Deleting account for user: ${userId} (bucket: ${bucketName})`);

    // 1. Delete entire user directory
    try {
      const userDir = path.join(DATA_DIR, userId);
      await fs.rm(userDir, { recursive: true, force: true });
      console.log(`🗑️  Deleted user directory: ${userDir}`);
    } catch (dirError) {
      console.log(`No user directory to delete for ${userId} or error:`, dirError.message);
    }

    // 2. Remove user from users.json
    await deleteUser(userId);
    console.log(`🗑️  Deleted user from users.json: ${userId}`);

    // 3. Delete S3 bucket
    if (!config.DEV_MODE) {
      try {
        console.log(`🔍 Starting S3 bucket cleanup for: ${bucketName}`);
        await deleteS3BucketCompletely(bucketName);
        console.log(`✅ Successfully deleted S3 bucket: ${bucketName}`);
      } catch (err) {
        console.error('❌ Critical error deleting S3 bucket:', {
          error: err.name,
          message: err.message,
          bucket: bucketName,
          userId: userId
        });
        throw err;
      }
    } else {
      console.log(`DEV_MODE: Skipping S3 bucket deletion for user ${userId}`);
    }

    res.json({ 
      message: 'Account and bucket deleted successfully.',
      details: {
        userId: userId,
        bucketName: bucketName,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Delete account error:', {
      userId: req.user?.id,
      bucketName: req.user?.awsBucketName,
      error: err.name,
      message: err.message,
      stack: err.stack
    });
    
    // Provide more specific error messages to the user
    let errorMessage = 'Failed to delete account.';
    
    if (err.message && err.message.includes('Bucket')) {
      errorMessage = 'Failed to delete storage bucket. Please contact support.';
    } else if (err.name === 'AccessDenied') {
      errorMessage = 'Access denied. Please contact support.';
    } else if (err.name === 'NetworkingError') {
      errorMessage = 'Network error. Please try again later.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: config.NODE_ENV === 'development' ? {
        errorName: err.name,
        errorMessage: err.message
      } : undefined
    });
  }
});

module.exports = router;