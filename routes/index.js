const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const profileRoutes = require('./profileRoutes');
const roleRoutes = require('./roleRoutes');
const verificationRoutes = require('./verificationRoutes');
// const connectionRoutes = require('./connectionRoutes'); // COMMENTED: Not needed yet

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profiles', profileRoutes);
router.use('/roles', roleRoutes);
router.use('/verifications', verificationRoutes);
// router.use('/connections', connectionRoutes); // COMMENTED: Not needed yet

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    service: 'EthioConnect User Service',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      profiles: '/api/profiles',
      roles: '/api/roles',
      verifications: '/api/verifications'
      // connections: '/api/connections' // COMMENTED: Not needed yet
    },
    documentation: {
      microservice: '/microservice-docs/',
      postman: '/EthioConnect_UserService.postman_collection.json'
    }
  });
});

module.exports = router;
