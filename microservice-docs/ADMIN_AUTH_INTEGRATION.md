# Admin Authentication Integration Guide

Complete guide for integrating admin authentication from User Service into your microservice.

---

## 🔐 **Admin Authentication Overview**

### **What You Need**

1. Admin JWT token from User Service
2. JWT secret (same as User Service)
3. Token verification middleware
4. Role checking logic

---

## 🚀 **Quick Setup**

### **Step 1: Environment Variables**

Add to your `.env`:

```env
# User Service Configuration
USER_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL_PRODUCTION=https://ethiouser.zewdbingo.com

# JWT Configuration (MUST match User Service)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
```

---

### **Step 2: Create Admin Verification Middleware**

**File:** `middleware/verifyAdmin.js`

```javascript
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Middleware to verify admin JWT tokens
 * Checks if user has admin role
 */
function verifyAdmin(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with same secret as User Service
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user has admin role
    if (!decoded.roles || !decoded.roles.includes('admin')) {
      logger.warn('Non-admin access attempt', {
        userId: decoded.id,
        roles: decoded.roles
      });
      
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Attach admin data to request
    req.admin = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      phone: decoded.phone,
      roles: decoded.roles,
      profile: decoded.profile || null
    };

    logger.info('Admin authenticated', { adminId: req.admin.id });
    next();

  } catch (error) {
    logger.error('Admin token verification failed', { error: error.message });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

module.exports = verifyAdmin;
```

---

### **Step 3: Use in Your Routes**

```javascript
const express = require('express');
const router = express.Router();
const verifyAdmin = require('../middleware/verifyAdmin');

// Admin-only endpoint
router.get('/admin/dashboard', verifyAdmin, async (req, res) => {
  try {
    // Access admin data from req.admin
    const adminId = req.admin.id;
    const adminName = req.admin.username;
    
    // Your admin logic here
    const stats = await getDashboardStats();
    
    res.json({
      success: true,
      data: {
        admin: {
          id: adminId,
          name: adminName
        },
        stats: stats
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
```

---

## 📊 **Admin Token Structure**

### **Complete Admin Token Payload**

```javascript
{
  // User Identity
  id: "admin-uuid",
  username: "admin",
  email: "admin@ethioconnect.com",
  phone: "+251911000000",
  
  // Authentication
  authProvider: "password",
  isVerified: true,
  status: "active",
  
  // Roles (IMPORTANT)
  roles: ["admin"],  // ← Check this for admin access
  
  // Profile Information
  profile: {
    fullName: "Admin User",
    profession: "Administrator",
    verificationStatus: "full",
    photoUrl: "https://...",
    bio: "System Administrator"
  }
}
```

---

## 🔑 **Admin Data Population Methods**

### **Method 1: Use Token Data (Recommended)**

All admin data is in the token - no API calls needed!

```javascript
router.post('/admin/action', verifyAdmin, async (req, res) => {
  try {
    // Get admin data from token
    const adminId = req.admin.id;
    const adminName = req.admin.username;
    const adminEmail = req.admin.email;
    const adminPhone = req.admin.phone;
    const adminFullName = req.admin.profile?.fullName;
    
    // Store admin action with full context
    const action = await AdminAction.create({
      actionType: req.body.actionType,
      performedBy: adminId,
      performedByName: adminFullName || adminName,
      performedByEmail: adminEmail,
      performedByPhone: adminPhone,
      timestamp: new Date(),
      details: req.body.details
    });
    
    res.json({
      success: true,
      data: { action }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

**Benefits:**
- ⚡ Instant - no API calls
- ✅ Always available
- ✅ Consistent data
- ✅ Reduced load

---

### **Method 2: Fetch from User Service (When Needed)**

Only fetch when you need data not in the token.

**File:** `services/adminService.js`

```javascript
const axios = require('axios');
const logger = require('../config/logger');

const userServiceClient = axios.create({
  baseURL: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  timeout: 10000
});

class AdminService {
  /**
   * Get full admin profile
   * Use only when token data is not enough
   */
  async getAdminProfile(adminId, adminToken) {
    try {
      const response = await userServiceClient.get(`/api/users/${adminId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      return response.data.data.user;

    } catch (error) {
      logger.error('Failed to fetch admin profile', {
        adminId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get all admins
   * Useful for admin management pages
   */
  async getAllAdmins(adminToken) {
    try {
      const response = await userServiceClient.get('/api/users/search?query=', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const users = response.data.data.users;
      
      // Filter admins only
      const admins = users.filter(user => 
        user.Roles && user.Roles.some(role => role.name === 'admin')
      );

      return admins;

    } catch (error) {
      logger.error('Failed to fetch admins', { error: error.message });
      return [];
    }
  }
}

module.exports = new AdminService();
```

**Usage:**

```javascript
const adminService = require('../services/adminService');

router.get('/admin/list', verifyAdmin, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    
    // Fetch all admins from User Service
    const admins = await adminService.getAllAdmins(token);
    
    res.json({
      success: true,
      data: { admins }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

---

## 📝 **Common Use Cases**

### **Use Case 1: Admin Dashboard**

```javascript
router.get('/admin/dashboard', verifyAdmin, async (req, res) => {
  try {
    // Admin data from token
    const admin = {
      id: req.admin.id,
      name: req.admin.profile?.fullName || req.admin.username,
      email: req.admin.email,
      photo: req.admin.profile?.photoUrl
    };
    
    // Fetch dashboard stats
    const stats = {
      totalUsers: await User.count(),
      totalResources: await Resource.count(),
      pendingApprovals: await Approval.count({ where: { status: 'pending' } })
    };
    
    res.json({
      success: true,
      data: {
        admin: admin,
        stats: stats
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

---

### **Use Case 2: Admin Action Logging**

```javascript
router.post('/admin/approve/:resourceId', verifyAdmin, async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.resourceId);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    // Update resource
    await resource.update({
      status: 'approved',
      approvedBy: req.admin.id,
      approvedByName: req.admin.profile?.fullName || req.admin.username,
      approvedAt: new Date()
    });
    
    // Log admin action
    await AdminLog.create({
      adminId: req.admin.id,
      adminName: req.admin.profile?.fullName || req.admin.username,
      adminEmail: req.admin.email,
      action: 'APPROVE_RESOURCE',
      resourceId: resource.id,
      resourceType: 'Resource',
      timestamp: new Date(),
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      message: 'Resource approved',
      data: { resource }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

---

### **Use Case 3: Admin User Management**

```javascript
router.patch('/admin/users/:userId/status', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const user = await User.findByPk(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user status
    await user.update({ status });
    
    // Log action with admin data
    await AdminLog.create({
      adminId: req.admin.id,
      adminName: req.admin.profile?.fullName || req.admin.username,
      action: 'UPDATE_USER_STATUS',
      targetUserId: user.id,
      targetUserName: user.username,
      oldStatus: user.status,
      newStatus: status,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'User status updated',
      data: { user }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

---

### **Use Case 4: Admin Reports**

```javascript
router.get('/admin/reports/activity', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get admin activity logs
    const logs = await AdminLog.findAll({
      where: {
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['timestamp', 'DESC']]
    });
    
    // Group by admin
    const activityByAdmin = logs.reduce((acc, log) => {
      if (!acc[log.adminId]) {
        acc[log.adminId] = {
          adminId: log.adminId,
          adminName: log.adminName,
          actions: []
        };
      }
      acc[log.adminId].actions.push(log);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        generatedBy: req.admin.profile?.fullName || req.admin.username,
        generatedAt: new Date(),
        period: { startDate, endDate },
        activity: Object.values(activityByAdmin)
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

---

## 🔒 **Security Best Practices**

### **1. Always Verify Admin Role**

```javascript
// ✅ GOOD - Use middleware
router.post('/admin/action', verifyAdmin, handler);

// ❌ BAD - Manual check without middleware
router.post('/admin/action', (req, res) => {
  // Missing token verification
});
```

---

### **2. Log All Admin Actions**

```javascript
// Always log admin actions
await AdminLog.create({
  adminId: req.admin.id,
  adminName: req.admin.profile?.fullName || req.admin.username,
  action: 'ACTION_TYPE',
  timestamp: new Date(),
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});
```

---

### **3. Validate Admin Permissions**

```javascript
// Check specific permissions if needed
function requireSuperAdmin(req, res, next) {
  if (!req.admin.roles.includes('super_admin')) {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required'
    });
  }
  next();
}

router.delete('/admin/users/:userId', verifyAdmin, requireSuperAdmin, handler);
```

---

### **4. Rate Limit Admin Endpoints**

```javascript
const rateLimit = require('express-rate-limit');

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many admin requests'
});

router.use('/admin', adminLimiter);
```

---

## 🧪 **Testing Admin Integration**

### **Test with Postman**

1. **Get Admin Token:**
   ```
   POST http://localhost:3001/api/auth/admin/login
   Body: {
     "email": "admin@ethioconnect.com",
     "password": "Admin@123456"
   }
   ```

2. **Use Token in Your Service:**
   ```
   GET http://localhost:YOUR_PORT/admin/dashboard
   Headers: {
     "Authorization": "Bearer YOUR_ADMIN_TOKEN"
   }
   ```

---

### **Test Admin Verification**

```javascript
// Test file: tests/admin.test.js
const jwt = require('jsonwebtoken');

describe('Admin Authentication', () => {
  it('should verify admin token', () => {
    const adminToken = jwt.sign({
      id: 'admin-id',
      username: 'admin',
      email: 'admin@test.com',
      roles: ['admin']
    }, process.env.JWT_SECRET);

    // Test your endpoint with this token
  });

  it('should reject non-admin token', () => {
    const userToken = jwt.sign({
      id: 'user-id',
      username: 'user',
      email: 'user@test.com',
      roles: ['employee']
    }, process.env.JWT_SECRET);

    // Should return 403
  });
});
```

---

## 📊 **Admin Data Schema**

### **Recommended Database Schema**

```javascript
// Admin Action Log Model
const AdminLog = sequelize.define('AdminLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  adminName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  adminEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  targetUserId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  targetUserName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resourceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  resourceType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});
```

---

## ✅ **Quick Checklist**

- [ ] Add JWT_SECRET to .env (same as User Service)
- [ ] Create verifyAdmin middleware
- [ ] Protect admin routes with middleware
- [ ] Store admin data with actions
- [ ] Log all admin actions
- [ ] Test with admin token from User Service
- [ ] Implement rate limiting
- [ ] Add error handling
- [ ] Create admin activity logs
- [ ] Test token expiration handling

---

## 🎯 **Summary**

**Admin Token Contains:**
- ✅ Admin ID, username, email, phone
- ✅ Roles array (includes 'admin')
- ✅ Profile data (fullName, photo, etc.)

**Best Practices:**
- ✅ Use token data (no API calls needed)
- ✅ Verify admin role in middleware
- ✅ Log all admin actions
- ✅ Store admin context with data

**Performance:**
- ⚡ 0 API calls for admin verification
- ⚡ All admin data in token
- ⚡ Fast and efficient

---

**Last Updated:** November 4, 2025  
**Version:** 1.0.0
