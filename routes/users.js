const express = require('express');
const router = express.Router();
const { User, Profile, UserRole, Role } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10, offset = 0 } = req.query;

    const whereClause = q ? {
      [Op.or]: [
        { username: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } }
      ]
    } : {};

    const users = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['passwordHash'] },
      include: [{
        model: Profile,
        as: 'profile',
        attributes: ['fullName', 'photoUrl', 'profession']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        users: users.rows,
        total: users.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: Profile,
          as: 'profile'
        },
        {
          model: UserRole,
          as: 'userRoles',
          include: [{
            model: Role,
            as: 'role',
            attributes: ['id', 'name']
          }]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/users/:userId/status
 * @desc    Update user status (admin only)
 * @access  Private (Admin)
 */
router.put('/:userId/status', 
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value'
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.update({ status });

      res.json({
        success: true,
        message: 'User status updated',
        data: { user }
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/v1/users/stats/summary
 * @desc    Get user statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats/summary',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { status: 'active' } });
      const verifiedUsers = await User.count({ where: { isVerified: true } });
      const suspendedUsers = await User.count({ where: { status: 'suspended' } });

      res.json({
        success: true,
        data: {
          total: totalUsers,
          active: activeUsers,
          verified: verifiedUsers,
          suspended: suspendedUsers
        }
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;
