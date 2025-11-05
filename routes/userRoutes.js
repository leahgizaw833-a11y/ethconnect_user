const express = require('express');
const authController = require('../controllers/authController'); // Ensure authController is correctly imported
const { authenticateToken } = require('../middleware/auth'); // Import authenticateToken middleware
const { requireRole } = require('../middleware/roles'); // Ensure requireRole is imported if used

const router = express.Router();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with userId and roleId (admin only)
 * @access  Private (Admin)
 */
router.get('/',
  authenticateToken,
  requireRole('admin'),
  authController.getAllUsers.bind(authController)
);

/**
 * @route   GET /api/v1/users/stats/summary
 * @desc    Get user statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats/summary',
  authenticateToken,
  requireRole('admin'),
  authController.getUserStats.bind(authController)
);

module.exports = router;
