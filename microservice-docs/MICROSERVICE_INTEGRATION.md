# Microservice Integration Guide

## 🎯 Overview

The EthioConnect User Service is a standalone microservice that handles all user-related operations. This guide explains how to integrate it with other microservices in the EthioConnect ecosystem.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer              │
│                    (Port 80/443)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │               │              │
┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐ ┌────▼─────┐
│ User Service │ │ Service  │ │  Service    │ │ Service  │
│  (Port 3001) │ │    A     │ │     B       │ │    C     │
└──────┬───────┘ └────┬─────┘ └──────┬──────┘ └────┬─────┘
       │              │               │              │
       └──────────────┴───────────────┴──────────────┘
                       │
              ┌────────▼────────┐
              │  MySQL Database │
              │  (Shared/Separate)│
              └─────────────────┘
```

---

## 🔐 Authentication Flow

### **JWT Token-Based Authentication**

1. **User logs in** → User Service issues JWT tokens
2. **Other services** → Verify JWT tokens independently
3. **No session state** → Stateless authentication

### **Token Structure**

```javascript
// Access Token Payload
{
  "id": "user-uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "+251912345678",
  "authProvider": "password",
  "iat": 1699000000,
  "exp": 1699003600  // 1 hour expiration
}

// Refresh Token Payload
{
  "id": "user-uuid",
  "type": "refresh",
  "iat": 1699000000,
  "exp": 1699604800  // 7 days expiration
}
```

---

## 🔗 Integration Methods

### **Method 1: JWT Verification (Recommended)**

Other microservices verify JWT tokens independently without calling User Service.

**Advantages:**
- ✅ No network latency
- ✅ Reduced load on User Service
- ✅ Works offline
- ✅ Scalable

**Implementation:**

```javascript
// In other microservices
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
```

**Environment Variables (Share across services):**
```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d
```

---

### **Method 2: Service-to-Service API Calls**

Call User Service APIs to get user information.

**Use Cases:**
- Get full user profile
- Check user verification status
- Get user roles
- Admin operations

**Example:**

```javascript
// In Other Service - Get user profile
const axios = require('axios');

async function getUserProfile(userId) {
  try {
    const response = await axios.get(
      `http://user-service:3001/api/users/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Service-Name': 'your-service-name'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}
```

---

## 📡 Key API Endpoints for Integration

### **Public Endpoints (No Auth Required)**

```
POST /api/auth/register          - Register new user
POST /api/auth/login             - Login user
POST /api/auth/otp/request       - Request OTP
POST /api/auth/otp/verify        - Verify OTP
POST /api/auth/refresh-token     - Refresh access token
```

### **Protected Endpoints (Require JWT)**

```
GET  /api/auth/me                - Get current user
GET  /api/profiles               - Get user profile
PUT  /api/profiles               - Update profile
GET  /api/roles/user/:userId     - Get user roles
POST /api/verifications          - Submit verification
GET  /api/verifications          - Get user verifications
```

### **Admin Endpoints (Require Admin Role)**

```
POST /api/auth/admin/login       - Admin login
POST /api/auth/admin/create      - Create admin user
GET  /api/verifications/pending  - Get pending verifications
PUT  /api/verifications/:id      - Approve/reject verification
GET  /api/users                  - Get all users (admin)
PUT  /api/users/:id/status       - Update user status
```

---

## 🔄 Common Integration Patterns

### **Pattern 1: User Registration Flow**

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend  │────▶│ User Service │────▶│   Database   │
└─────────────┘     └──────────────┘     └──────────────┘
      │                     │
      │◀────────────────────┘
      │   JWT Tokens + User Data
      │
      │             ┌──────────────┐
      └────────────▶│ Your Service │
                    │ (with token) │
                    └──────────────┘
```

### **Pattern 2: Role-Based Access**

```javascript
// In Your Service - Check if user has required role
async function createResource(req, res) {
  // Token already verified by middleware
  const userId = req.user.id;
  
  // Get user roles from User Service
  const roles = await getUserRoles(userId);
  
  if (!roles.includes('required_role')) {
    return res.status(403).json({ 
      message: 'Insufficient permissions' 
    });
  }
  
  // Create resource...
}
```

### **Pattern 3: Verification Status Check**

```javascript
// In Your Service - Check if user is verified
async function performAction(req, res) {
  const userId = req.user.id;
  
  // Get user profile from User Service
  const profile = await getUserProfile(userId);
  
  if (profile.verificationStatus !== 'full') {
    return res.status(403).json({ 
      message: 'Full verification required for this action' 
    });
  }
  
  // Perform action...
}
```

---

## 🛠️ Service Configuration

### **Environment Variables**

```env
# Service Info
SERVICE_NAME=user-service
PORT=3001
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ethioconnect_users
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# OTP
OTP_EXPIRATION_SECONDS=300
OTP_MAX_ATTEMPTS=3

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# CORS (for microservices)
ALLOWED_ORIGINS=http://localhost:3000,http://service-a:3002,http://service-b:3003
```

### **Docker Compose Example**

```yaml
version: '3.8'

services:
  user-service:
    build: ./user-service
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mysql
    networks:
      - ethioconnect-network

  your-service:
    build: ./your-service
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - USER_SERVICE_URL=http://user-service:3001
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - ethioconnect-network

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=ethioconnect
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - ethioconnect-network

networks:
  ethioconnect-network:
    driver: bridge

volumes:
  mysql-data:
```

---

## 📊 Data Sharing

### **Shared Data via JWT Token**

```javascript
// Available in all services from JWT
{
  id: "user-uuid",
  username: "johndoe",
  email: "john@example.com",
  phone: "+251912345678",
  authProvider: "password"
}
```

### **Additional Data via API Calls**

```javascript
// Get from User Service when needed
{
  profile: {
    fullName: "John Doe",
    profession: "Software Engineer",
    verificationStatus: "full"
  },
  roles: ["employee", "doctor"],
  isVerified: true,
  status: "active"
}
```

---

## 🔒 Security Best Practices

### **1. Service-to-Service Authentication**

```javascript
// Add service authentication header
const SERVICE_SECRET = process.env.SERVICE_SECRET;

headers: {
  'Authorization': `Bearer ${userToken}`,
  'X-Service-Secret': SERVICE_SECRET,
  'X-Service-Name': 'your-service-name'
}
```

### **2. Rate Limiting**

```javascript
// In User Service - Protect against abuse
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);
```

### **3. Input Validation**

```javascript
// Validate all inputs in each service
const { body, validationResult } = require('express-validator');

router.post('/resources',
  [
    body('title').trim().isLength({ min: 5, max: 200 }),
    body('userId').isUUID(),
    // ... more validations
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request...
  }
);
```

---

## 📝 API Response Format

### **Standard Success Response**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
}
```

### **Standard Error Response**

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

---

## 🧪 Testing Integration

### **1. Unit Tests**

```javascript
// Test JWT verification
describe('JWT Verification', () => {
  it('should verify valid token', () => {
    const token = jwt.sign({ id: 'user-123' }, process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('user-123');
  });
});
```

### **2. Integration Tests**

```javascript
// Test service-to-service communication
describe('User Service Integration', () => {
  it('should get user profile from User Service', async () => {
    const profile = await getUserProfile('user-123');
    expect(profile).toHaveProperty('fullName');
    expect(profile).toHaveProperty('verificationStatus');
  });
});
```

---

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] JWT secrets shared across services
- [ ] Database migrations run
- [ ] CORS configured for service URLs
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Health check endpoints working
- [ ] Service discovery configured (if using)
- [ ] Load balancer configured
- [ ] SSL certificates installed

---

## 📞 Health Check Endpoint

```
GET /health

Response:
{
  "status": "healthy",
  "service": "user-service",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "connected"
}
```

---

## 🔄 Version Compatibility

| User Service | Compatible Services |
|--------------|-------------------|
| v1.0.0       | Any service using JWT authentication |

---

## 📚 Additional Resources

- [Workflow Documentation](./WORKFLOW_USER_PROFILE_ROLE_VERIFICATION.md)
- [Postman Collection](./EthioConnect_UserService.postman_collection.json)
- [API Documentation](./docs/API_EXAMPLES.md)

---

## 🆘 Troubleshooting

### **Issue: JWT verification fails in other services**
**Solution:** Ensure `JWT_SECRET` is identical across all services

### **Issue: CORS errors**
**Solution:** Add service URLs to `ALLOWED_ORIGINS` environment variable

### **Issue: Service-to-service calls timeout**
**Solution:** Check network configuration and service discovery

---

## ✅ Summary

The User Service is designed to be:
- ✅ **Stateless** - No session management
- ✅ **Scalable** - Can run multiple instances
- ✅ **Secure** - JWT-based authentication
- ✅ **Independent** - Standalone microservice
- ✅ **Documented** - Complete API documentation
- ✅ **Production-Ready** - Error handling, validation, logging

Ready for integration with other EthioConnect microservices!
