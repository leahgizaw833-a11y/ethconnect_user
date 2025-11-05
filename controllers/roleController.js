const { Role, UserRole } = require('../models');
const { Sequelize } = require('sequelize');
const logger = require('../config/logger');

/**
 * Get all roles (excludes admin role for non-admin users)
 */
async function getAllRoles(req, res) {
  try {
    logger.info('Get all roles request', { userId: req.user?.id });

    // Check if user is admin
    const isAdmin = req.user?.roles?.includes('admin');

    // Build query - exclude admin role for non-admin users
    const whereClause = isAdmin ? {} : {
      name: {
        [Sequelize.Op.ne]: 'admin'
      }
    };

    const roles = await Role.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    logger.info('Roles retrieved successfully', { 
      count: roles.length,
      isAdmin: isAdmin
    });

    res.json({
      success: true,
      data: { roles }
    });
  } catch (error) {
    logger.error('Get roles error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get roles',
      error: error.message
    });
  }
}

/**
 * Create a new role (admin only)
 */
async function createRole(req, res) {
  try {
    const { name } = req.body;

    logger.info('Create role request', { name, adminId: req.user.id });

    // Check if role already exists
    const existingRole = await Role.findOne({ where: { name } });
    if (existingRole) {
      logger.warn('Role already exists', { name });
      return res.status(400).json({
        success: false,
        message: 'Role already exists'
      });
    }

    const role = await Role.create({ name });

    logger.info('Role created successfully', { roleId: role.id, name });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role }
    });
  } catch (error) {
    logger.error('Create role error', {
      error: error.message,
      stack: error.stack,
      adminId: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message
    });
  }
}

/**
 * Get user's roles
 */
async function getUserRoles(req, res) {
  try {
    const { userId } = req.params;

    logger.info('Get user roles request', { userId, requesterId: req.user?.id });

    const userRoles = await UserRole.findAll({
      where: { userId },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name']
      }]
    });

    logger.info('User roles retrieved successfully', {
      userId,
      roleCount: userRoles.length
    });

    res.json({
      success: true,
      data: {
        userId,
        roles: userRoles.map(ur => ur.role)
      }
    });
  } catch (error) {
    logger.error('Get user roles error', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get user roles',
      error: error.message
    });
  }
}

module.exports = {
  getAllRoles,
  createRole,
  getUserRoles
};
