const express = require('express');
const authController = require('../controllers/authController'); // Ensure authController is correctly imported
const { authenticateToken } = require('../middleware/auth'); // Import authenticateToken middleware
const { requireRole } = require('../middleware/roles'); // Ensure requireRole is imported if used

const router = express.Router();

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users
 * @access  Public
 */
router.get('/search', authController.searchUsers.bind(authController));

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:userId', authenticateToken, authController.getUserById.bind(authController));

/**
 * @route   PUT /api/v1/users/:userId/status
 * @desc    Update user status (admin only)
 * @access  Private (Admin)
 */
router.put('/:userId/status',
  authenticateToken,
  requireRole('admin'),
  authController.updateUserStatus.bind(authController)
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
