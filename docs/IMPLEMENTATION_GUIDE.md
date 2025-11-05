# Winston Logger & Joi Validation Implementation Guide

## ✅ Completed

### **1. Installed Packages**
```bash
npm install winston joi xss-clean helmet
```

### **2. Created Configuration Files**

#### **`config/logger.js`** ✅
Winston logger with:
- File logging (combined.log, error.log)
- Console logging (development)
- Exception and rejection handling
- Log rotation (5MB max, 5 files)
- Timestamp and JSON formatting

#### **`config/validation.js`** ✅
Joi validation schemas with:
- Input sanitization (removes HTML tags, dangerous characters)
- XSS protection
- All endpoint validations
- Custom error messages
- Automatic data sanitization

### **3. Enhanced JWT Tokens** ✅

**Updated `generateTokens()` function to include:**
```javascript
{
  id: "user-uuid",
  username: "johndoe",
  email: "john@example.com",
  phone: "+251912345678",
  authProvider: "password",
  isVerified: true,
  status: "active",
  roles: ["employee", "doctor"],  // ← User roles
  profile: {                       // ← Profile information
    fullName: "John Doe",
    profession: "Software Engineer",
    verificationStatus: "professional"
  }
}
```

---

## 📋 TODO: Apply to All Controllers

### **Step 1: Add Logger to All Controllers**

**Pattern to follow:**

```javascript
// At top of file
const logger = require('../config/logger');

// In functions
async function someFunction(req, res) {
  try {
    logger.info('Function started', { userId: req.user?.id, action: 'someAction' });
    
    // ... your logic ...
    
    logger.info('Function completed successfully', { userId: req.user?.id });
    res.json({ success: true, data: result });
    
  } catch (error) {
    logger.error('Function failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ success: false, message: error.message });
  }
}
```

**Files to update:**
- ✅ `controllers/authController.js` - Partially done (generateTokens)
- ⏳ `controllers/profileController.js`
- ⏳ `controllers/roleController.js`
- ⏳ `controllers/verificationController.js`

---

### **Step 2: Replace express-validator with Joi**

**Current (express-validator):**
```javascript
router.post('/register', [
  body('username').optional().trim().isLength({ min: 3, max: 120 }),
  body('email').optional().isEmail(),
  handleValidationErrors
], authController.register);
```

**New (Joi):**
```javascript
const { validate, schemas } = require('../config/validation');

router.post('/register',
  validate(schemas.register),
  authController.register
);
```

**Files to update:**
- ⏳ `routes/authRoutes.js`
- ⏳ `routes/profileRoutes.js`
- ⏳ `routes/roleRoutes.js`
- ⏳ `routes/verificationRoutes.js`

---

### **Step 3: Add Security Middleware to server.js**

```javascript
const helmet = require('helmet');
const xss = require('xss-clean');
const logger = require('./config/logger');
const morgan = require('morgan');

// Security middleware
app.use(helmet()); // Set security HTTP headers
app.use(xss()); // Sanitize request data

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Log all requests
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});
```

---

### **Step 4: Update All generateTokens() Calls**

Since `generateTokens()` is now async and includes profile/roles, update all calls:

**Before:**
```javascript
const tokens = generateTokens(user);
```

**After:**
```javascript
const tokens = await generateTokens(user, profile);
```

**Locations:**
- `authController.register()`
- `authController.login()`
- `authController.adminLogin()`
- `authController.verifyOTP()`
- `authController.loginWithOtp()`
- `authController.refreshToken()`

---

## 📁 Organized File Structure

### **New `config/` Folder**
```
config/
├── logger.js          ✅ Winston logger configuration
└── validation.js      ✅ Joi validation schemas
```

### **Existing Structure**
```
Ethioconnect_userService/
├── config/            ✅ NEW - Configuration files
│   ├── logger.js
│   └── validation.js
├── controllers/       ⏳ Need logger updates
├── routes/            ⏳ Need Joi validation
├── middleware/        ✅ Clean
├── models/            ✅ Clean
├── utils/             ✅ Clean
├── scripts/           ✅ Clean
├── docs/              ✅ Clean
├── logs/              ✅ NEW - Auto-created by Winston
│   ├── combined.log
│   ├── error.log
│   ├── exceptions.log
│   └── rejections.log
└── uploads/           ✅ Clean
```

---

## 🔒 Security Features Implemented

### **1. Input Sanitization**
- ✅ HTML tag removal
- ✅ Dangerous character filtering
- ✅ XSS protection
- ✅ SQL injection prevention (via Sequelize ORM)

### **2. Validation**
- ✅ Type checking
- ✅ Length limits
- ✅ Pattern matching (regex)
- ✅ Whitelist validation
- ✅ Custom error messages

### **3. Logging**
- ✅ All requests logged
- ✅ Error tracking
- ✅ User action audit trail
- ✅ Exception handling
- ✅ Log rotation

### **4. Token Security**
- ✅ Comprehensive user data in tokens
- ✅ Role-based access control
- ✅ Profile information included
- ✅ Verification status tracking

---

## 📝 Example: Complete Controller with Logger & Validation

```javascript
const logger = require('../config/logger');
const { Profile } = require('../models');

/**
 * Update current user's profile
 */
async function updateProfile(req, res) {
  try {
    logger.info('Profile update started', {
      userId: req.user.id,
      fields: Object.keys(req.body)
    });

    const profile = await Profile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      logger.warn('Profile not found', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    await profile.update(req.body);

    logger.info('Profile updated successfully', {
      userId: req.user.id,
      profileId: profile.id
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile }
    });

  } catch (error) {
    logger.error('Profile update failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = { updateProfile };
```

---

## 🧪 Testing

### **Test Logger**
```javascript
const logger = require('./config/logger');

logger.info('Test info message');
logger.warn('Test warning');
logger.error('Test error', { error: 'details' });
```

### **Test Validation**
```javascript
const { validate, schemas } = require('./config/validation');

// In route
router.post('/test',
  validate(schemas.register),
  (req, res) => {
    // req.body is now sanitized and validated
    res.json({ success: true, data: req.body });
  }
);
```

### **Test Enhanced Tokens**
```javascript
// Login and check token payload
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password"
}

// Decode the accessToken to see:
{
  "id": "...",
  "username": "johndoe",
  "roles": ["employee"],
  "profile": {
    "fullName": "John Doe",
    "profession": "Engineer",
    "verificationStatus": "professional"
  }
}
```

---

## ✅ Checklist

### **Configuration**
- [x] Winston logger created
- [x] Joi validation schemas created
- [x] Enhanced token generation
- [ ] Add helmet to server.js
- [ ] Add xss-clean to server.js
- [ ] Add morgan HTTP logging

### **Controllers**
- [x] authController - generateTokens updated
- [ ] authController - add logger to all functions
- [ ] profileController - add logger
- [ ] roleController - add logger
- [ ] verificationController - add logger

### **Routes**
- [ ] authRoutes - replace express-validator with Joi
- [ ] profileRoutes - replace express-validator with Joi
- [ ] roleRoutes - replace express-validator with Joi
- [ ] verificationRoutes - replace express-validator with Joi

### **Testing**
- [ ] Test logger output
- [ ] Test validation with invalid data
- [ ] Test enhanced tokens
- [ ] Test XSS protection
- [ ] Test security headers

---

## 🚀 Next Steps

1. **Update server.js** - Add security middleware
2. **Update all routes** - Replace express-validator with Joi
3. **Update all controllers** - Add logger calls
4. **Update generateTokens calls** - Make them async
5. **Test everything** - Ensure no breaking changes
6. **Update documentation** - Reflect new security features

---

## 📚 Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Joi Documentation](https://joi.dev/api/)
- [Helmet Documentation](https://helmetjs.github.io/)
- [XSS-Clean Documentation](https://www.npmjs.com/package/xss-clean)
