# Advanced Features - EthioConnect User Service

This document describes the advanced features implemented from EXTRACTED_PACKAGE.

## 🔒 Advanced OTP System

### Features
- **SHA-256 Hashed Storage**: OTPs are never stored in plain text
- **Rate Limiting**: 30-second cooldown between OTP requests
- **Attempt Limiting**: Maximum 5 verification attempts
- **Account Lockout**: 30-minute lockout after max attempts exceeded
- **Automatic Cleanup**: Expired/verified OTPs are automatically deleted

### Implementation

Location: `utils/advancedOtpUtil.js`

```javascript
const advancedOtpUtil = require('./utils/advancedOtpUtil');

// Generate and send OTP
const result = await advancedOtpUtil.generateAndSendOtp('+251912345678');
// Returns: { success, message, phone, expiresIn, otp (dev only) }

// Verify OTP
const verified = await advancedOtpUtil.verifyOtp('+251912345678', '123456');
// Returns: { success, message, phone }

// Cleanup (cron job)
await advancedOtpUtil.cleanupExpiredOtps();
```

### Configuration

```javascript
const advancedOtpUtil = createAdvancedOtpUtil({
  otpLength: 6,
  otpExpirationSeconds: 600, // 10 minutes
  maxAttempts: 5,
  lockoutSeconds: 1800, // 30 minutes
  rateLimitSeconds: 30
});
```

### Security Features

1. **SHA-256 Hashing**: OTPs are hashed before storage
2. **Rate Limiting**: Prevents OTP spam
3. **Attempt Tracking**: Counts failed verification attempts
4. **Progressive Lockout**: Locks account after too many failures
5. **Expiration**: OTPs expire after configured time

---

## 🔑 JWT Refresh Token System

### Features
- **Access Tokens**: Short-lived JWT tokens (1 day default)
- **Refresh Tokens**: Long-lived tokens (7 days default)
- **Token Rotation**: New refresh token issued on each use
- **Secure Storage**: Refresh tokens bcrypt-hashed in database
- **Token Revocation**: Logout from single or all devices
- **Automatic Cleanup**: Expired tokens auto-deleted

### Implementation

Location: `utils/advancedJwtUtils.js`
Model: `models/refreshToken.js`

```javascript
const jwtUtils = require('./utils/advancedJwtUtils');

// Generate token pair on login
const { accessToken, refreshToken } = await jwtUtils.generateTokenPair({
  userId: user.id,
  type: 'user'
});

// Refresh access token
const tokens = await jwtUtils.refreshAccessToken(refreshToken, userId);
// Returns: { accessToken, refreshToken }

// Logout (single device)
await jwtUtils.revokeRefreshToken(refreshToken, userId);

// Logout (all devices)
await jwtUtils.revokeAllRefreshTokens(userId);

// Cleanup expired tokens (cron job)
await jwtUtils.cleanupExpiredTokens();
```

### RefreshToken Model

```javascript
{
  id: UUID,
  userId: UUID,
  hashedToken: String (bcrypt),
  expiresAt: Date,
  revokedAt: Date (nullable),
  replacedByTokenId: UUID (nullable),
  metadata: JSON (nullable)
}
```

### Token Rotation Flow

```
1. Client sends refresh token
2. Server verifies and validates token
3. Server generates new access + refresh tokens
4. Server revokes old refresh token
5. Server links old token to new token (audit trail)
6. Client receives new tokens
```

### Security Best Practices

1. **Never log full tokens** in production
2. **Use HTTPS** for all token transmission
3. **Rotate tokens** on every use
4. **Set reasonable expiration** times
5. **Implement token revocation** for logout
6. **Clean up expired tokens** regularly
7. **Store only hashed** refresh tokens

---

## 🔧 Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-minimum-32-characters
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_TTL_DAYS=7

# OTP Configuration (built into code, can be customized)
# See utils/advancedOtpUtil.js createAdvancedOtpUtil() function
```

### Database Migration

Run database sync to create RefreshToken table:

```bash
npm run db:sync
```

---

## 📊 Usage Examples

### Complete Authentication Flow

```javascript
const authService = require('./services/authService');
const jwtUtils = require('./utils/advancedJwtUtils');

// 1. User registers/logs in
const { user } = await authService.loginUser(identifier, password);

// 2. Generate token pair
const { accessToken, refreshToken } = await jwtUtils.generateTokenPair({
  userId: user.id,
  type: 'user'
});

// 3. Send to client
res.json({
  success: true,
  data: { user },
  accessToken,
  refreshToken
});

// 4. Client stores both tokens
// accessToken: Used for API requests (short-lived)
// refreshToken: Used to get new access token (long-lived)
```

### Token Refresh Endpoint

```javascript
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user.id; // from middleware
    
    const tokens = await jwtUtils.refreshAccessToken(refreshToken, userId);
    
    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});
```

### Logout Endpoints

```javascript
// Logout from current device
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  await jwtUtils.revokeRefreshToken(refreshToken, req.user.id);
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Logout from all devices
router.post('/logout-all', async (req, res) => {
  await jwtUtils.revokeAllRefreshTokens(req.user.id);
  
  res.json({
    success: true,
    message: 'Logged out from all devices'
  });
});
```

### Advanced OTP Flow

```javascript
const advancedOtpUtil = require('./utils/advancedOtpUtil');

// Request OTP
router.post('/otp/request', async (req, res) => {
  try {
    const { phone } = req.body;
    const result = await advancedOtpUtil.generateAndSendOtp(phone);
    
    res.json(result);
  } catch (error) {
    // Handle rate limiting, lockout, etc.
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Verify OTP
router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const result = await advancedOtpUtil.verifyOtp(phone, otp);
    
    // OTP verified - create/login user
    let user = await User.findOne({ where: { phone } });
    // ... user creation logic
    
    const { accessToken, refreshToken } = await jwtUtils.generateTokenPair({
      userId: user.id
    });
    
    res.json({
      success: true,
      data: { user },
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
```

---

## 🔄 Scheduled Tasks

### Cleanup Cron Jobs

Add these to your cron scheduler:

```javascript
const cron = require('node-cron');
const jwtUtils = require('./utils/advancedJwtUtils');
const advancedOtpUtil = require('./utils/advancedOtpUtil');

// Clean up expired refresh tokens (daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
  console.log('Cleaning up expired refresh tokens...');
  await jwtUtils.cleanupExpiredTokens();
});

// Clean up expired OTPs (hourly)
cron.schedule('0 * * * *', async () => {
  console.log('Cleaning up expired OTPs...');
  await advancedOtpUtil.cleanupExpiredOtps();
});
```

---

## 📈 Monitoring

### Key Metrics to Track

1. **OTP Metrics**
   - OTP request rate
   - OTP verification success rate
   - Lockout incidents
   - Average attempts per verification

2. **Token Metrics**
   - Active refresh tokens per user
   - Token refresh rate
   - Token revocation rate
   - Expired token cleanup count

### Logging

All advanced utilities include logging:

```
[OTP] Code for +251912345678: 123456 (expires in 600s)
[OTP] Code verified for +251912345678
[JWT] Refresh token issued for user: user-uuid
[JWT] Refresh token rotated for user: user-uuid
[JWT] All refresh tokens revoked for user: user-uuid
[JWT] Cleaned up 15 expired refresh tokens
```

---

## 🚀 Benefits

### Advanced OTP System
- ✅ **Security**: SHA-256 hashing prevents OTP theft
- ✅ **User Experience**: Clear error messages with attempt counts
- ✅ **Protection**: Rate limiting prevents abuse
- ✅ **Scalability**: Automatic cleanup reduces database size

### JWT Refresh Token System
- ✅ **Security**: Token rotation limits exposure
- ✅ **Flexibility**: Multi-device support with selective revocation
- ✅ **Audit Trail**: Token replacement tracking
- ✅ **Performance**: Long-lived refresh tokens reduce auth calls

---

## 📝 Migration from Basic to Advanced

### OTP Migration

Replace basic OTP calls with advanced OTP:

```javascript
// Before (basic)
const { generateOTP, hashOTP, verifyOTP } = require('./utils/otpUtils');

// After (advanced)
const advancedOtpUtil = require('./utils/advancedOtpUtil');
```

### JWT Migration

Add refresh token support:

```javascript
// Before (access token only)
const token = generateToken(user.id);

// After (token pair)
const { accessToken, refreshToken } = await jwtUtils.generateTokenPair({
  userId: user.id
});
```

---

**All advanced features are production-ready and follow security best practices!** 🔒
