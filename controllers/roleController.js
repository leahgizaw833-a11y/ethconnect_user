const { Role, UserRole, User } = require('../models');

class RoleController {
  /**
   * Get all roles
   */
  async getAllRoles(req, res) {
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
  }

  /**
   * Create a new role (admin only)
   */
  async createRole(req, res) {
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

  /**
   * Assign role to user (admin only)
   */
  async assignRole(req, res) {
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

  /**
   * Revoke role from user (admin only)
   */
  async revokeRole(req, res) {
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

  /**
   * Get user's roles
   */
  async getUserRoles(req, res) {
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
  }
}

module.exports = new RoleController();
