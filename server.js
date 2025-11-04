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

// Import models
const { sequelize } = require('./models');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const roleRoutes = require('./routes/roleRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

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
app.use(helmet());
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

// Logging middleware
if (config.environment === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

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

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/verifications', verificationRoutes);

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
  console.error('Error:', err);
  
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
    console.log('✓ Database connection established successfully');

    // Optional DB sync controlled by env: DB_SYNC=alter|force|none (default: none)
    const dbSyncMode = (process.env.DB_SYNC || 'none').toLowerCase();
    if (dbSyncMode === 'alter') {
      await sequelize.sync({ alter: true });
      console.log('✓ Database synchronized (alter)');
    } else if (dbSyncMode === 'force') {
      await sequelize.sync({ force: true });
      console.log('✓ Database synchronized (force)');
    } else {
      console.log('↷ Skipping automatic DB sync (DB_SYNC=none)');
    }

    // Start server
    app.listen(config.port, () => {
      console.log('═══════════════════════════════════════════════════');
      console.log(`🚀 EthioConnect User Service`);
      console.log(`📡 Server running on port ${config.port}`);
      console.log(`🌍 Environment: ${config.environment}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/health`);
      console.log('═══════════════════════════════════════════════════');
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
