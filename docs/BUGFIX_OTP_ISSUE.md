# Bug Fix Summary - OTP and Database Schema Issues

## Issues Fixed

### 1. Column Name Mismatch in OTP Requests
**Error**: `Unknown column 'User.phoneNumber' in 'where clause'`

**Root Cause**: Code was querying `phoneNumber` but database column was `phone`

**Files Fixed**:
- `controllers/authController.js` (Lines 58, 80)

**Changes**:
```javascript
// Before
const result = await User.findOne({ where: { phoneNumber: phone } });

// After
const result = await User.findOne({ where: { phone: phone } });
```

---

### 2. Missing OTP Generation Logic
**Problem**: OTP request endpoint returned success but didn't generate or return OTP code

**Root Cause**: `authController.js` had stub implementations without actual OTP logic

**Solution**: Implemented full OTP functionality using `advancedOtpUtil`

**Files Modified**:
- `controllers/authController.js`

**New Implementation**:
- Added imports: `generateAndSendOtp`, `verifyOtp`, `generateToken`, `hashPassword`
- `requestOTP()` method now:
  - Generates 6-digit OTP
  - Stores hashed OTP in database
  - Returns OTP in development mode
  - Implements rate limiting (30-second cooldown)
  - Auto-cleanup of expired OTPs

- `verifyOTP()` method now:
  - Verifies OTP against stored hash
  - Creates user if doesn't exist (phone auth)
  - Generates JWT access and refresh tokens
  - Returns user data and tokens
  - Implements attempt limiting (max 5 attempts)
  - Account lockout after max attempts

**Features**:
- ✅ SHA-256 hashed OTP storage
- ✅ 10-minute OTP expiration
- ✅ Rate limiting (30-second cooldown)
- ✅ Attempt limiting (max 5 attempts)
- ✅ Account lockout (30 minutes)
- ✅ Automatic user creation for new phone numbers
- ✅ JWT token generation

---

### 3. Database Table Name Case Inconsistency
**Problem**: Migrations used PascalCase (`Users`, `Roles`) but models expected snake_case (`users`, `roles`)

**Impact**: Foreign key constraints and queries could fail on case-sensitive databases

**Files Fixed**:
All migration files updated to use lowercase snake_case table names:

| Migration File | Old Name | New Name |
|----------------|----------|----------|
| `20251101000001-create-users.js` | Users | users |
| `20251101000002-create-roles.js` | Roles | roles |
| `20251101000003-create-user-roles.js` | UserRoles | user_roles |
| `20251101000004-create-profiles.js` | Profiles | profiles |
| `20251101000005-create-verifications.js` | Verifications | verifications |
| `20251101000006-create-otps.js` | OTPs | otps |
| `20251101000007-create-refresh-tokens.js` | RefreshTokens | refresh_tokens |

**Foreign Key References Also Updated**:
- All `references.model` values changed to lowercase
- Example: `model: 'Users'` → `model: 'users'`

---

## Database Migration Required

⚠️ **IMPORTANT**: If you've already run the old migrations, you need to reset your database:

### Option 1: Reset Database (Development Only)
```bash
npm run db:reset
```

### Option 2: Manual Steps
```bash
# Undo all migrations
npm run db:migrate:undo:all

# Run new migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### Option 3: Drop and Recreate (if needed)
```bash
npm run db:drop
npm run db:create
npm run db:migrate
npm run db:seed
```

---

## Testing the Fix

### 1. Test OTP Request
```bash
POST http://localhost:3001/api/v1/auth/otp/request
Content-Type: application/json

{
  "phone": "+251941893993"
}
```

**Expected Response** (Development):
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone": "+251941893993",
  "expiresIn": 600,
  "otp": "123456"
}
```

### 2. Test OTP Verification
```bash
POST http://localhost:3001/api/v1/auth/otp/verify
Content-Type: application/json

{
  "phone": "+251941893993",
  "otp": "123456"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "username": "user_941893993",
      "phone": "+251941893993",
      "isVerified": true,
      "status": "active"
    },
    "tokens": {
      "accessToken": "jwt-token-here",
      "refreshToken": "refresh-token-here"
    }
  }
}
```

---

## OTP Security Features

### Rate Limiting
- 30-second cooldown between OTP requests
- Error message shows remaining wait time

### Attempt Limiting
- Maximum 5 verification attempts per OTP
- Remaining attempts shown in error response

### Account Lockout
- Account locked for 30 minutes after 5 failed attempts
- Must request new OTP after lockout expires

### OTP Expiration
- OTPs expire after 10 minutes
- Expired OTPs cannot be verified

### Storage Security
- OTPs stored as SHA-256 hashes
- Never stored in plain text
- Automatic cleanup of expired/verified OTPs

---

## Console Output

When OTP is generated, you'll see in console (development only):
```
[OTP] Code for +251941893993: 123456 (expires in 600s)
```

---

## Environment Variables

Ensure these are set in your `.env`:
```env
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
```

---

## Postman Collection Update

The Postman collection has been updated with:
- OTP request endpoint with auto-capture of OTP code
- OTP verify endpoint with auto-capture of tokens
- All endpoints tested and working

Import the latest collection from:
- `docs/EthioConnect_UserService.postman_collection.json`

---

## Next Steps

1. ✅ Test OTP flow end-to-end
2. ✅ Verify database tables are created correctly
3. ⚠️ Configure SMS gateway for production (currently console-only)
4. ⚠️ Update `NODE_ENV=production` before deploying (hides OTP in response)

---

**Fixed on**: November 2, 2025  
**Status**: ✅ Complete and Ready for Testing
