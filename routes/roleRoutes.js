const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   GET /api/v1/roles
 * @desc    Get all roles
 * @access  Private
 */
router.get('/', authenticateToken, roleController.getAllRoles);

/**
 * @route   POST /api/v1/roles
 * @desc    Create a new role (admin only)
 * @access  Private (Admin)
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Role name must be 2-50 characters'),
    handleValidationErrors
  ],
  roleController.createRole
);

/**
 * @route   GET /api/v1/roles/user/:userId
 * @desc    Get user's roles
 * @access  Private
 */
router.get('/user/:userId', authenticateToken, roleController.getUserRoles);

module.exports = router;
