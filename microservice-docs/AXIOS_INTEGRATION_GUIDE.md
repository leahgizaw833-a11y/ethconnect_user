# Axios Integration Guide - Service to Service Communication

Complete guide for integrating other microservices with the EthioConnect User Service using Axios.

---

## 📋 **Table of Contents**

1. [Setup & Configuration](#setup--configuration)
2. [Token Handling](#token-handling)
3. [Data Population Methods](#data-population-methods)
4. [API Integration Examples](#api-integration-examples)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## 🚀 **Setup & Configuration**

### **1. Install Dependencies**

```bash
npm install axios dotenv
```

### **2. Environment Variables**

Create `.env` file in your service:

```env
# User Service Configuration
USER_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL_PRODUCTION=https://ethiouser.zewdbingo.com

# JWT Configuration (must match User Service)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Service Authentication (optional)
SERVICE_SECRET=your-service-to-service-secret
SERVICE_NAME=your-service-name
```

### **3. Create Axios Instance**

**File:** `config/userServiceClient.js`

```javascript
const axios = require('axios');
const logger = require('./logger'); // Your logger

// Create axios instance for User Service
const userServiceClient = axios.create({
  baseURL: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Service-Name': process.env.SERVICE_NAME || 'unknown-service'
  }
});

// Request interceptor - Add authentication
userServiceClient.interceptors.request.use(
  (config) => {
    logger.info('User Service request', {
      method: config.method,
      url: config.url
    });
    return config;
  },
  (error) => {
    logger.error('User Service request error', { error: error.message });
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
userServiceClient.interceptors.response.use(
  (response) => {
    logger.info('User Service response', {
      status: response.status,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    logger.error('User Service response error', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

module.exports = userServiceClient;
```

---

## 🔐 **Token Handling**

### **Method 1: Verify User Tokens (Recommended)**

When a user makes a request to your service with their JWT token, verify it and extract user data.

**File:** `middleware/verifyUserToken.js`

```javascript
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Middleware to verify JWT tokens from User Service
 * Extracts user data from token without calling User Service
 */
function verifyUserToken(req, res, next) {
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

    // Token payload contains all user data
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      phone: decoded.phone,
      authProvider: decoded.authProvider,
      roles: decoded.roles || [],
      profile: decoded.profile || null,
      isVerified: decoded.isVerified,
      status: decoded.status
    };

    logger.info('User authenticated', { userId: req.user.id });
    next();

  } catch (error) {
    logger.error('Token verification failed', { error: error.message });
    
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

module.exports = verifyUserToken;
```

**Usage in your routes:**

```javascript
const express = require('express');
const router = express.Router();
const verifyUserToken = require('../middleware/verifyUserToken');

// Protected route - user data available in req.user
router.post('/create-resource', verifyUserToken, async (req, res) => {
  try {
    // Access user data from token
    const userId = req.user.id;
    const userName = req.user.username;
    const userRoles = req.user.roles;
    const userProfile = req.user.profile;

    // Create resource with user data
    const resource = await Resource.create({
      userId: userId,
      createdBy: userName,
      // ... other fields
    });

    res.json({
      success: true,
      data: { resource }
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

## 📊 **Data Population Methods**

### **Method 1: Use Token Data (Fastest - No API Calls)**

The JWT token contains user data, roles, and profile information. Use this for most operations.

```javascript
// User data is already in the token
const userId = req.user.id;
const userName = req.user.username;
const userEmail = req.user.email;
const userPhone = req.user.phone;
const userRoles = req.user.roles; // ['employee', 'doctor']
const fullName = req.user.profile?.fullName;
const profession = req.user.profile?.profession;
const verificationStatus = req.user.profile?.verificationStatus;
const photoUrl = req.user.profile?.photoUrl;
const bio = req.user.profile?.bio;

// No API call needed!
```

**Benefits:**
- ✅ No network latency
- ✅ No API calls to User Service
- ✅ Faster response times
- ✅ Reduced load on User Service

**When to use:**
- Creating resources with user reference
- Displaying user info
- Role-based access control
- Most common operations

---

### **Method 2: Fetch Full User Profile (When Needed)**

When you need complete, up-to-date user information not in the token.

**File:** `services/userService.js`

```javascript
const userServiceClient = require('../config/userServiceClient');
const logger = require('../config/logger');

class UserService {
  /**
   * Get full user profile by ID
   * @param {string} userId - User UUID
   * @param {string} authToken - User's JWT token
   */
  async getUserProfile(userId, authToken) {
    try {
      const response = await userServiceClient.get(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      return response.data.data.user;

    } catch (error) {
      logger.error('Failed to fetch user profile', {
        userId,
        error: error.message
      });
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Get user with profile and roles
   * @param {string} userId - User UUID
   * @param {string} authToken - User's JWT token
   */
  async getUserWithDetails(userId, authToken) {
    try {
      const response = await userServiceClient.get(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const user = response.data.data.user;

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        profile: user.Profile,
        roles: user.Roles,
        isVerified: user.isVerified,
        status: user.status
      };

    } catch (error) {
      logger.error('Failed to fetch user details', {
        userId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get multiple users by IDs (batch)
   * @param {string[]} userIds - Array of user UUIDs
   * @param {string} authToken - Admin or service token
   */
  async getUsersByIds(userIds, authToken) {
    try {
      // Call User Service with user IDs
      const promises = userIds.map(id => 
        this.getUserProfile(id, authToken).catch(() => null)
      );

      const users = await Promise.all(promises);
      return users.filter(user => user !== null);

    } catch (error) {
      logger.error('Failed to fetch multiple users', {
        count: userIds.length,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check if user has specific role
   * @param {string} userId - User UUID
   * @param {string} roleName - Role name to check
   * @param {string} authToken - User's JWT token
   */
  async userHasRole(userId, roleName, authToken) {
    try {
      const response = await userServiceClient.get(`/api/roles/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const roles = response.data.data.roles;
      return roles.some(role => role.name === roleName);

    } catch (error) {
      logger.error('Failed to check user role', {
        userId,
        roleName,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get user verification status
   * @param {string} userId - User UUID
   * @param {string} authToken - User's JWT token
   */
  async getUserVerificationStatus(userId, authToken) {
    try {
      const response = await userServiceClient.get(`/api/verifications/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const verifications = response.data.data.verifications;
      
      return {
        hasKYC: verifications.some(v => v.type === 'kyc' && v.status === 'approved'),
        hasProfessional: verifications.some(v => 
          ['doctor_license', 'teacher_cert', 'business_license', 'employer_cert'].includes(v.type) 
          && v.status === 'approved'
        ),
        verifications: verifications
      };

    } catch (error) {
      logger.error('Failed to get verification status', {
        userId,
        error: error.message
      });
      return null;
    }
  }
}

module.exports = new UserService();
```

**Usage:**

```javascript
const userService = require('../services/userService');

// In your controller
async function createResource(req, res) {
  try {
    const userId = req.user.id;
    const authToken = req.headers.authorization.split(' ')[1];

    // Option 1: Use token data (fast)
    const userName = req.user.username;
    const userRoles = req.user.roles;

    // Option 2: Fetch full profile (when needed)
    const fullProfile = await userService.getUserProfile(userId, authToken);

    // Option 3: Check specific role
    const isDoctor = await userService.userHasRole(userId, 'doctor', authToken);

    // Create resource
    const resource = await Resource.create({
      userId: userId,
      userName: userName,
      requiresDoctor: isDoctor,
      // ... other fields
    });

    res.json({ success: true, data: { resource } });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
```

---

### **Method 3: Populate Data After Query (Efficient Batch)**

When you have multiple resources and need to populate user data.

```javascript
const userService = require('../services/userService');

/**
 * Get resources with user data populated
 */
async function getResourcesWithUsers(req, res) {
  try {
    const authToken = req.headers.authorization.split(' ')[1];

    // 1. Get resources from your database
    const resources = await Resource.findAll({
      limit: 20,
      order: [['createdAt', 'DESC']]
    });

    // 2. Extract unique user IDs
    const userIds = [...new Set(resources.map(r => r.userId))];

    // 3. Fetch all users in batch
    const users = await userService.getUsersByIds(userIds, authToken);

    // 4. Create user map for quick lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // 5. Populate resources with user data
    const populatedResources = resources.map(resource => ({
      ...resource.toJSON(),
      user: userMap[resource.userId] || {
        id: resource.userId,
        username: 'Unknown User'
      }
    }));

    res.json({
      success: true,
      data: { resources: populatedResources }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
```

---

## 🔌 **API Integration Examples**

### **Example 1: Job Service Integration**

```javascript
const express = require('express');
const router = express.Router();
const verifyUserToken = require('../middleware/verifyUserToken');
const userService = require('../services/userService');

/**
 * Create job posting
 * Only employers can create jobs
 */
router.post('/jobs', verifyUserToken, async (req, res) => {
  try {
    // Check if user is employer (from token)
    if (!req.user.roles.includes('employer')) {
      return res.status(403).json({
        success: false,
        message: 'Only employers can post jobs'
      });
    }

    // Check verification status
    if (req.user.profile?.verificationStatus !== 'professional') {
      return res.status(403).json({
        success: false,
        message: 'Professional verification required to post jobs'
      });
    }

    // Create job with user data from token
    const job = await Job.create({
      title: req.body.title,
      description: req.body.description,
      employerId: req.user.id,
      employerName: req.user.profile?.fullName || req.user.username,
      companyName: req.body.companyName,
      // ... other fields
    });

    res.status(201).json({
      success: true,
      data: { job }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get job with employer details
 */
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Option 1: Return with basic employer info (if stored)
    const jobData = {
      ...job.toJSON(),
      employer: {
        id: job.employerId,
        name: job.employerName
      }
    };

    // Option 2: Fetch full employer profile (if needed)
    if (req.query.includeEmployer === 'true' && req.headers.authorization) {
      const authToken = req.headers.authorization.split(' ')[1];
      const employer = await userService.getUserProfile(job.employerId, authToken);
      jobData.employer = employer;
    }

    res.json({
      success: true,
      data: { job: jobData }
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

### **Example 2: Chat/Messaging Service Integration**

```javascript
const express = require('express');
const router = express.Router();
const verifyUserToken = require('../middleware/verifyUserToken');

/**
 * Send message
 */
router.post('/messages', verifyUserToken, async (req, res) => {
  try {
    const { recipientId, content } = req.body;

    // Create message with sender data from token
    const message = await Message.create({
      senderId: req.user.id,
      senderName: req.user.profile?.fullName || req.user.username,
      senderPhone: req.user.phone,
      senderAvatar: req.user.profile?.photoUrl,
      recipientId: recipientId,
      content: content,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      data: { message }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get conversation with user details
 */
router.get('/conversations/:conversationId', verifyUserToken, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { conversationId: req.params.conversationId },
      order: [['timestamp', 'ASC']]
    });

    // Messages already have sender info stored
    // No need to fetch from User Service

    res.json({
      success: true,
      data: { messages }
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

### **Example 3: Payment Service Integration**

```javascript
const express = require('express');
const router = express.Router();
const verifyUserToken = require('../middleware/verifyUserToken');
const userService = require('../services/userService');

/**
 * Process payment
 * Requires full verification
 */
router.post('/payments', verifyUserToken, async (req, res) => {
  try {
    // Check verification status from token
    if (req.user.profile?.verificationStatus !== 'full') {
      return res.status(403).json({
        success: false,
        message: 'Full verification required for payments'
      });
    }

    // Get detailed verification status if needed
    const authToken = req.headers.authorization.split(' ')[1];
    const verificationStatus = await userService.getUserVerificationStatus(
      req.user.id,
      authToken
    );

    if (!verificationStatus.hasKYC) {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required'
      });
    }

    // Process payment
    const payment = await Payment.create({
      userId: req.user.id,
      userName: req.user.profile?.fullName || req.user.username,
      userEmail: req.user.email,
      amount: req.body.amount,
      currency: req.body.currency,
      // ... other fields
    });

    res.status(201).json({
      success: true,
      data: { payment }
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

## ⚠️ **Error Handling**

### **Comprehensive Error Handler**

```javascript
const logger = require('../config/logger');

/**
 * Handle User Service errors
 */
function handleUserServiceError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    context: context
  };

  logger.error('User Service error', errorInfo);

  // Return appropriate error response
  if (error.response) {
    // User Service returned an error
    return {
      success: false,
      message: error.response.data?.message || 'User Service error',
      statusCode: error.response.status
    };
  } else if (error.request) {
    // Request made but no response
    return {
      success: false,
      message: 'User Service unavailable',
      statusCode: 503
    };
  } else {
    // Something else happened
    return {
      success: false,
      message: 'Internal error',
      statusCode: 500
    };
  }
}

module.exports = { handleUserServiceError };
```

**Usage:**

```javascript
const { handleUserServiceError } = require('../utils/errorHandler');

async function someFunction(req, res) {
  try {
    const user = await userService.getUserProfile(userId, authToken);
    // ... rest of logic
  } catch (error) {
    const errorResponse = handleUserServiceError(error, {
      function: 'someFunction',
      userId: userId
    });
    
    return res.status(errorResponse.statusCode).json(errorResponse);
  }
}
```

---

## ✅ **Best Practices**

### **1. Use Token Data First**
```javascript
// ✅ GOOD - Use data from token
const userId = req.user.id;
const userRoles = req.user.roles;

// ❌ BAD - Unnecessary API call
const user = await userService.getUserProfile(req.user.id, token);
const userRoles = user.roles;
```

### **2. Cache User Data When Appropriate**
```javascript
const NodeCache = require('node-cache');
const userCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function getUserWithCache(userId, authToken) {
  // Check cache first
  const cached = userCache.get(userId);
  if (cached) return cached;

  // Fetch from User Service
  const user = await userService.getUserProfile(userId, authToken);
  
  // Store in cache
  userCache.set(userId, user);
  
  return user;
}
```

### **3. Batch Requests**
```javascript
// ✅ GOOD - Single batch request
const users = await userService.getUsersByIds(userIds, authToken);

// ❌ BAD - Multiple individual requests
for (const userId of userIds) {
  const user = await userService.getUserProfile(userId, authToken);
}
```

### **4. Handle Token Expiration**
```javascript
async function makeRequestWithRetry(requestFn, authToken) {
  try {
    return await requestFn(authToken);
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired - refresh it
      const newToken = await refreshAuthToken();
      return await requestFn(newToken);
    }
    throw error;
  }
}
```

### **5. Store Essential User Data**
```javascript
// Store user data with your resources to avoid lookups
const resource = await Resource.create({
  userId: req.user.id,
  userName: req.user.username,
  userEmail: req.user.email,
  userAvatar: req.user.profile?.photoUrl,
  // ... other fields
});

// Now you can display resources without calling User Service
```

---

## 📊 **Performance Comparison**

| Method | Speed | API Calls | Use Case |
|--------|-------|-----------|----------|
| Token Data | ⚡ Instant | 0 | Most operations |
| Single User Fetch | 🔄 ~50ms | 1 | Detailed profile needed |
| Batch Fetch | 🔄 ~100ms | 1 | Multiple users |
| Individual Fetches | 🐌 ~50ms × N | N | ❌ Avoid this |

---

## 🎯 **Summary**

**Recommended Approach:**
1. ✅ Use token data for 90% of operations
2. ✅ Fetch from User Service only when needed
3. ✅ Store essential user data with your resources
4. ✅ Use batch requests for multiple users
5. ✅ Implement caching for frequently accessed data
6. ✅ Handle errors gracefully

**This approach provides:**
- Fast response times
- Reduced load on User Service
- Better user experience
- Scalable architecture

---

**Last Updated:** November 4, 2025  
**Version:** 1.0.0
