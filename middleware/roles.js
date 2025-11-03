/**
 * Middleware to check if the authenticated user has the required role.
 * @param {string} role - The required role (e.g., 'admin').
 */
function requireRole(role) {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Support both `role` string and an array of roles on the user object
      const userRole = user.role || user.roles || null;
      const hasRole = Array.isArray(userRole) ? userRole.includes(role) : userRole === role;

      if (!hasRole) {
        return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
      }

      next();
    } catch (err) {
      console.error('Role check error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };
}

module.exports = { requireRole };
