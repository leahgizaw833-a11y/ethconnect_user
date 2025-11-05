# API Changes Summary

## ✅ Completed Changes

### 1. **Removed Duplicate OTP Endpoints**

**Removed Routes:**
- ❌ `POST /api/auth/request-otp` (alias removed)
- ❌ `POST /api/auth/verify-otp` (alias removed)
- ❌ `POST /api/auth/otp/resend` (removed)
- ❌ `POST /api/auth/phone-login` (removed)
- ❌ `POST /api/auth/token-login` (removed)

**Active OTP Routes:**
- ✅ `POST /api/auth/otp/request` - Request OTP
- ✅ `POST /api/auth/otp/verify` - Verify OTP
- ✅ `POST /api/auth/otp/login` - Login with OTP

### 2. **User Registration with Role**

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "+251912345678",
  "password": "SecurePass123",
  "role": "employee"  // NEW: employer, employee, doctor, user
}
```

### 3. **Removed User Discovery Endpoints**

**Removed Routes:**
- ❌ `GET /api/users/search` - Search users
- ❌ `GET /api/users/:userId` - Get user by ID

### 4. **Removed Public Profile Access**

**Removed Routes:**
- ❌ `GET /api/profiles/:userId` - Get profile by user ID

**Active Profile Routes:**
- ✅ `GET /api/profiles` - Get current user's profile (authenticated)
- ✅ `PUT /api/profiles` - Update current user's profile

### 5. **Document Upload with Multer**

**Endpoint:** `POST /api/verifications`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `document` (file) - Document file upload
- `type` (text) - Verification type: kyc, doctor_license, teacher_cert, business_license, employer_cert, other
- `notes` (text, optional) - Additional notes

**File Upload Specs:**
- Max size: 10MB
- Allowed types: jpg, jpeg, png, pdf, doc, docx
- Upload directory: `uploads/verifications/`

**Example (Postman):**
```
Form Data:
- document: [Select File]
- type: kyc
- notes: ID card verification request
```

### 6. **Default Admin Creation**

**Script:** `scripts/createDefaultAdmin.js`

**Run Once:**
```bash
node scripts/createDefaultAdmin.js
```

**Environment Variables (optional):**
```env
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@ethioconnect.com
DEFAULT_ADMIN_PASSWORD=Admin@123456
DEFAULT_ADMIN_PHONE=+251911000000
```

**Default Credentials:**
- Username: `admin`
- Email: `admin@ethioconnect.com`
- Password: `Admin@123456`
- Phone: `+251911000000`

⚠️ **Change password after first login!**

### 7. **Admin Can Create Other Admins**

**New Endpoint:** `POST /api/roles/create-admin`

**Access:** Admin only

**Request Body:**
```json
{
  "username": "newadmin",
  "email": "newadmin@ethioconnect.com",
  "password": "SecureAdmin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin user created successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "newadmin",
      "email": "newadmin@ethioconnect.com",
      "status": "active",
      "phoneVerified": true,
      "emailVerified": true
    }
  }
}
```

## 📊 API Endpoint Count

**Before:** 31 endpoints  
**After:** 22 endpoints  
**Removed:** 9 duplicate/unnecessary endpoints

## 📁 Updated Files

### Routes
- ✅ `routes/authRoutes.js` - Removed duplicate OTP routes, added role field
- ✅ `routes/userRoutes.js` - Removed search and getUserById
- ✅ `routes/profileRoutes.js` - Removed public profile access
- ✅ `routes/roleRoutes.js` - Added create-admin endpoint
- ✅ `routes/verificationRoutes.js` - Added multer file upload

### Controllers
- ✅ `controllers/roleController.js` - Added createAdmin method

### Scripts
- ✅ `scripts/createDefaultAdmin.js` - NEW: Create default admin

### Other
- ✅ `uploads/verifications/` - NEW: Directory for uploaded documents
- ✅ `EthioConnect_UserService.postman_collection.json` - Updated collection

## 🔧 Required Dependencies

Ensure these are installed:
```bash
npm install multer bcryptjs
```

## 📋 Postman Collection Structure

### **User Folder** (13 endpoints)
1. **Authentication** (4)
   - Register User
   - Login
   - Refresh Token
   - Get Current User

2. **OTP Authentication** (3)
   - Request OTP
   - Verify OTP
   - Login with OTP

3. **Profile Management** (2)
   - Get Current User Profile
   - Update Profile

4. **Roles** (2)
   - Get All Roles
   - Get User Roles

5. **Verification** (2)
   - Submit Verification Request (with file upload)
   - Get My Verifications

### **Admin Folder** (9 endpoints)
1. **User Management** (2)
   - Update User Status
   - Get User Statistics

2. **Role Management** (4)
   - Create Role
   - Create Admin User
   - Assign Role
   - Revoke Role

3. **Verification Management** (3)
   - Get Pending Verifications
   - Update Verification Status
   - Get User Verifications

## 🚀 Next Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create default admin:**
   ```bash
   node scripts/createDefaultAdmin.js
   ```

3. **Start server:**
   ```bash
   npm start
   ```

4. **Import Postman collection:**
   - Import `EthioConnect_UserService.postman_collection.json`
   - Set `baseUrl` variable to your server URL
   - Login as admin to get access token

5. **Test endpoints:**
   - Register a new user with role
   - Upload verification document
   - Create additional admin users

## ⚠️ Important Notes

- The default admin script should only be run once during initial setup
- Change default admin password immediately after first login
- File uploads are stored locally in `uploads/verifications/`
- Consider implementing cloud storage (S3, etc.) for production
- All admin endpoints require valid admin role and authentication token
