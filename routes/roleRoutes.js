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
router.get('/', authenticateToken, roleController.getAllRoles.bind(roleController));

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
  roleController.createRole.bind(roleController)
);

/**
 * @route   POST /api/v1/roles/assign
 * @desc    Assign role to user (admin only)
 * @access  Private (Admin)
 */
router.post('/assign',
  authenticateToken,
  requireRole('admin'),
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('roleId').notEmpty().withMessage('Role ID is required'),
    handleValidationErrors
  ],
  roleController.assignRole.bind(roleController)
);

/**
 * @route   DELETE /api/v1/roles/revoke
 * @desc    Revoke role from user (admin only)
 * @access  Private (Admin)
 */
router.delete('/revoke',
  authenticateToken,
  requireRole('admin'),
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('roleId').notEmpty().withMessage('Role ID is required'),
    handleValidationErrors
  ],
  roleController.revokeRole.bind(roleController)
);

/**
 * @route   GET /api/v1/roles/user/:userId
 * @desc    Get user's roles
 * @access  Private
 */
router.get('/user/:userId', authenticateToken, roleController.getUserRoles.bind(roleController));

module.exports = router;
