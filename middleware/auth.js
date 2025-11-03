const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ success: false, message: 'Unauthorized: Token missing' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized: Token missing' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
    }

    // Support tokens that use either `id` or `userId` or `sub`
    const userId = decoded.id || decoded.userId || decoded.sub;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token payload' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });

    req.user = user; // attach full user model for downstream handlers
    next();
  } catch (error) {
    console.error('authenticateToken error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['passwordHash'] }
      });
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Just continue without user
    next();
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { UserRole, Role } = require('../models');
      
      // Get user's roles
      const userRoles = await UserRole.findAll({
        where: { userId: req.user.id },
        include: [{
          model: Role,
          as: 'role',
          attributes: ['name']
        }]
      });

      const userRoleNames = userRoles.map(ur => ur.role.name);

      // Check if user has any of the required roles
      const hasRole = roles.some(role => userRoleNames.includes(role));

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      req.userRoles = userRoleNames;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error',
        error: error.message
      });
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole
};
