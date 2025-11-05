/**
 * ETHIOCONNECT USER SERVICE
 * Complete microservice for user management, authentication, profiles, roles, and verification
 * 
 * Features:
 * - User registration & authentication (email/username/phone)
 * - OTP-based phone authentication
 * - JWT token management
 * - User profile management with matchmaking fields
 * - Role-based access control (RBAC)
 * - Document verification system
 * - Multi-language support
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');

// Import logger
const logger = require('./config/logger');

// Import models
const { sequelize } = require('./models');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Import routes
const routes = require('./routes');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  port: process.env.PORT || process.env.USER_SERVICE_PORT || 3001,
  environment: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'http://localhost:5173']
};

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();

// Security middleware
app.use(helmet()); // Set security HTTP headers
app.use(xss()); // Sanitize request data against XSS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging with Winston
app.use(morgan('combined', { stream: logger.stream }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      service: 'ethioconnect-user-service',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'ethioconnect-user-service',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api', routes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Global error handler', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(config.environment === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// DATABASE CONNECTION & SERVER START
// ============================================================================

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Optional DB sync controlled by env: DB_SYNC=alter|force|none (default: none)
    const dbSyncMode = (process.env.DB_SYNC || 'none').toLowerCase();
    if (dbSyncMode === 'alter') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized (alter)');
    } else if (dbSyncMode === 'force') {
      await sequelize.sync({ force: true });
      logger.info('Database synchronized (force)');
    } else {
      logger.info('Skipping automatic DB sync (DB_SYNC=none)');
    }

    // Start server only if not in LiteSpeed/OpenLiteSpeed environment
    // LiteSpeed handles the listening automatically
    const isLiteSpeed = typeof process.env.LSWS_EDITION !== 'undefined';
    
    if (!isLiteSpeed && require.main === module) {
      app.listen(config.port, () => {
        logger.info('═══════════════════════════════════════════════════');
        logger.info(`🚀 EthioConnect User Service`);
        logger.info(`📡 Server running on port ${config.port}`);
        logger.info(`🌍 Environment: ${config.environment}`);
        logger.info(`🔗 Health check: http://localhost:${config.port}/health`);
        logger.info('═══════════════════════════════════════════════════');
      });
    } else {
      logger.info('═══════════════════════════════════════════════════');
      logger.info(`🚀 EthioConnect User Service`);
      logger.info(`📡 Running in LiteSpeed/OpenLiteSpeed mode`);
      logger.info(`🌍 Environment: ${config.environment}`);
      logger.info('═══════════════════════════════════════════════════');
    }
  } catch (error) {
    logger.error('Unable to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
