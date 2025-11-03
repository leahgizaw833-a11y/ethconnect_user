const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { Role, UserRole, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   GET /api/v1/roles
 * @desc    Get all roles
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const roles = await Role.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { roles }
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get roles',
      error: error.message
    });
  }
});

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
  async (req, res) => {
    try {
      const { name } = req.body;

      // Check if role already exists
      const existingRole = await Role.findOne({ where: { name } });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role already exists'
        });
      }

      const role = await Role.create({ name });

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: { role }
      });
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: error.message
      });
    }
  }
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
  async (req, res) => {
    try {
      const { userId, roleId } = req.body;

      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if role exists
      const role = await Role.findByPk(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Check if user already has this role
      const existingUserRole = await UserRole.findOne({
        where: { userId, roleId }
      });
      if (existingUserRole) {
        return res.status(400).json({
          success: false,
          message: 'User already has this role'
        });
      }

      // Assign role
      const userRole = await UserRole.create({ userId, roleId });

      res.status(201).json({
        success: true,
        message: 'Role assigned successfully',
        data: { userRole }
      });
    } catch (error) {
      console.error('Assign role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign role',
        error: error.message
      });
    }
  }
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
  async (req, res) => {
    try {
      const { userId, roleId } = req.body;

      const userRole = await UserRole.findOne({
        where: { userId, roleId }
      });

      if (!userRole) {
        return res.status(404).json({
          success: false,
          message: 'User role assignment not found'
        });
      }

      await userRole.destroy();

      res.json({
        success: true,
        message: 'Role revoked successfully'
      });
    } catch (error) {
      console.error('Revoke role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke role',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/v1/roles/user/:userId
 * @desc    Get user's roles
 * @access  Private
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const userRoles = await UserRole.findAll({
      where: { userId },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name']
      }]
    });

    res.json({
      success: true,
      data: {
        userId,
        roles: userRoles.map(ur => ur.role)
      }
    });
  } catch (error) {
    console.error('Get user roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user roles',
      error: error.message
    });
  }
});

module.exports = router;
