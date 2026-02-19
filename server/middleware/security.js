/**
 * Security Middleware
 * Handles CORS, rate limiting, and other security measures
 */

const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config/environment');

// CORS Configuration
const setupCORS = () => {
  const parsedOrigins = (config.CLIENT_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  
  const devFallbackOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const allowedOrigins = parsedOrigins.length
    ? parsedOrigins
    : (config.NODE_ENV !== 'production' ? devFallbackOrigins : []);

  return cors({
    origin: (origin, callback) => {
      // Allow non-browser or same-origin requests
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  });
};

// Rate Limiting Configuration
const setupRateLimit = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests from this IP, please try again later.'
    }
  });
};

// Security Headers
const setupHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.amazonaws.com"]
      }
    }
  });
};

module.exports = {
  setupCORS,
  setupRateLimit,
  setupHelmet
};