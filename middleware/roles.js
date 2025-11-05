const { UserRole, Role } = require('../models');

/**
 * Middleware to check if the authenticated user has the required role.
 * @param {string} role - The required role (e.g., 'admin').
 */
function requireRole(role) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Fetch user roles from database
      const userRoles = await UserRole.findAll({
        where: { userId: user.id },
        include: [{
          model: Role,
          as: 'role',
          attributes: ['name']
        }]
      });

      const roleNames = userRoles.map(ur => ur.role.name);
      
      if (!roleNames.includes(role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Insufficient permissions' 
        });
      }

      // Attach roles to req.user for future use
      req.user.roles = roleNames;
      next();
    } catch (err) {
      console.error('Role check error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };
}

module.exports = { requireRole };
