# Admin Endpoints Summary

## ✅ Multi-Role Support & Admin Authentication

### **Overview**
Users can now have multiple roles assigned to them. The system includes dedicated admin authentication endpoints that verify admin role before granting access.

---

## 🔐 **Admin Authentication Endpoints**

### **1. Admin Login**
**Endpoint:** `POST /api/auth/admin/login`

**Description:** Login specifically for admin users. Verifies that the user has the admin role before allowing access.

**Request:**
```json
{
  "email": "admin@ethioconnect.com",
  "password": "Admin@123456"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@ethioconnect.com",
      "phone": "+251911000000",
      "authProvider": "password",
      "isVerified": true,
      "status": "active",
      "lastLogin": "2025-11-04T10:21:00.000Z",
      "roles": ["admin"]
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Error Responses:**
- `401` - Invalid email or password
- `403` - Access denied. Admin privileges required.
- `403` - Account inactive or suspended

**Features:**
- ✅ Verifies user has admin role
- ✅ Returns roles array in user data
- ✅ Updates last login timestamp
- ✅ Generates JWT tokens

---

### **2. Create Admin User**
**Endpoint:** `POST /api/auth/admin/create`

**Access:** Admin only (requires authentication + admin role)

**Description:** Create a new admin user. Only existing admins can create new admins.

**Request:**
```json
{
  "username": "newadmin",
  "email": "newadmin@ethioconnect.com",
  "password": "SecureAdmin123",
  "phone": "+251911000001"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Admin user created successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "newadmin",
      "email": "newadmin@ethioconnect.com",
      "phone": "+251911000001",
      "authProvider": "password",
      "isVerified": true,
      "status": "active",
      "roles": ["admin"]
    }
  }
}
```

**Required Fields:**
- `username` (string, 3-120 chars)
- `email` (valid email)
- `password` (string, min 6 chars)

**Optional Fields:**
- `phone` (E.164 format)

**Error Responses:**
- `400` - Username/Email/Phone already taken
- `400` - Missing required fields
- `401` - Unauthorized (no token)
- `403` - Forbidden (not admin)

**Features:**
- ✅ Auto-creates admin role if doesn't exist
- ✅ Sets user as verified and active
- ✅ Creates associated profile
- ✅ Assigns admin role automatically

---

## 👥 **Multi-Role Support**

### **How It Works**

Users can have multiple roles assigned through the `user_roles` junction table:

```
User (id: 1)
  ├── UserRole (userId: 1, roleId: 1) → Role (admin)
  ├── UserRole (userId: 1, roleId: 2) → Role (employer)
  └── UserRole (userId: 1, roleId: 3) → Role (doctor)
```

### **Login Response with Roles**

Both regular login and admin login now return user roles:

**Regular Login:** `POST /api/auth/login`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "roles": ["employee", "doctor"]  // ← Multiple roles
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### **Assigning Multiple Roles**

Use the role management endpoints to assign additional roles:

**Assign Role:** `POST /api/roles/assign`
```json
{
  "userId": "user-uuid",
  "roleId": "role-uuid"
}
```

**Example Workflow:**
1. User registers with role "employee"
2. Admin assigns "doctor" role
3. User now has both "employee" and "doctor" roles
4. User can access features for both roles

---

## 🔄 **Updated Endpoints**

### **Regular Login** (`POST /api/auth/login`)
- ✅ Now returns `roles` array in user data
- ✅ Supports users with multiple roles

### **Admin Login** (`POST /api/auth/admin/login`)
- ✅ New endpoint specifically for admin access
- ✅ Verifies admin role before allowing login
- ✅ Returns roles array

### **Create Admin** (`POST /api/auth/admin/create`)
- ✅ Moved from roleController to authController
- ✅ Now at `/api/auth/admin/create` (was `/api/roles/create-admin`)
- ✅ Requires admin authentication

---

## 📍 **Route Changes**

### **authRoutes.js**

```javascript
// Admin routes
router.post('/admin/login', authController.adminLogin);
router.post('/admin/create', authenticateToken, requireRole('admin'), authController.createAdmin);
```

### **roleRoutes.js**
- ❌ Removed `/create-admin` endpoint (moved to authRoutes)

---

## 🎯 **Use Cases**

### **1. Admin Dashboard Access**
```javascript
// Frontend: Check if user has admin role
if (user.roles.includes('admin')) {
  // Show admin dashboard
  redirectTo('/admin/dashboard');
}
```

### **2. Multi-Role User**
```javascript
// User can be both employer and employee
const user = {
  username: "johndoe",
  roles: ["employer", "employee"]
};

// Can post jobs (employer) and apply for jobs (employee)
if (user.roles.includes('employer')) {
  showPostJobButton();
}
if (user.roles.includes('employee')) {
  showApplyButton();
}
```

### **3. Professional Verification**
```javascript
// Doctor with multiple roles
const doctor = {
  username: "dr_smith",
  roles: ["doctor", "user"]
};

// Can access medical features and general features
```

---

## 🔐 **Security Features**

1. **Admin Login Verification**
   - Checks password
   - Verifies admin role exists
   - Checks account status
   - Updates last login

2. **Create Admin Protection**
   - Requires authentication
   - Requires admin role
   - Validates all inputs
   - Prevents duplicate users

3. **Multi-Role Authorization**
   - Each role can be checked independently
   - Middleware supports role-based access
   - Roles returned in all login responses

---

## 📊 **Database Schema**

```sql
-- Users can have multiple roles
user_roles
├── id (PK)
├── userId (FK → users.id)
├── roleId (FK → roles.id)
└── UNIQUE INDEX (userId, roleId)

-- Example data
user_roles:
  { userId: "user-1", roleId: "admin-role" }
  { userId: "user-1", roleId: "doctor-role" }
  { userId: "user-1", roleId: "employer-role" }
```

---

## 🧪 **Testing**

### **Test Admin Login**
```bash
POST http://localhost:3001/api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@ethioconnect.com",
  "password": "Admin@123456"
}
```

### **Test Create Admin**
```bash
POST http://localhost:3001/api/auth/admin/create
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "username": "admin2",
  "email": "admin2@ethioconnect.com",
  "password": "SecureAdmin123"
}
```

### **Test Multi-Role Login**
```bash
# 1. Login as user
POST http://localhost:3001/api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Response should include roles array:
{
  "data": {
    "user": {
      "roles": ["employee", "doctor"]
    }
  }
}
```

---

## 📝 **Postman Collection Updates**

### **New Folder Structure**

```
User
├── Authentication (4 endpoints)
├── Admin Authentication (2 endpoints) ← NEW
│   ├── Admin Login
│   └── Create Admin User
├── OTP Authentication (3 endpoints)
├── Profile Management (2 endpoints)
├── Roles (2 endpoints)
└── Verification (2 endpoints)

Admin
├── User Management (2 endpoints)
├── Role Management (3 endpoints) ← Updated (removed duplicate)
└── Verification Management (3 endpoints)
```

**Total Endpoints:** 23 (was 22, added 2 admin auth, removed 1 duplicate)

---

## ✅ **Summary**

- ✅ Users can have multiple roles
- ✅ Dedicated admin login endpoint
- ✅ Create admin moved to authController
- ✅ All login responses include roles array
- ✅ Admin role verification on admin login
- ✅ Postman collection updated
- ✅ Full multi-role support implemented

**Key Benefits:**
- Better separation of admin and user authentication
- Support for users with multiple roles
- Clearer API structure
- Enhanced security for admin operations
