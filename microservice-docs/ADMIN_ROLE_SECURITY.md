# Admin Role Security - Implementation Guide

## 🔒 **Security Overview**

The admin role has special protections to prevent unauthorized access and privilege escalation.

---

## 🚫 **Restrictions**

### **1. No Public Registration with Admin Role**

Users **cannot** register with the admin role through the public registration endpoint.

**Blocked Request:**
```bash
POST /api/auth/register
{
  "username": "hacker",
  "email": "hacker@example.com",
  "password": "password123",
  "role": "admin"  // ❌ BLOCKED
}
```

**Response:**
```json
{
  "success": false,
  "message": "Cannot register with admin role. Admin accounts must be created by existing admins."
}
```

---

### **2. Admin Role Hidden from Public Role Listings**

Non-admin users cannot see the admin role when fetching all roles.

**Request (Non-Admin User):**
```bash
GET /api/roles
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roles": [
      { "id": 1, "name": "employee" },
      { "id": 2, "name": "employer" },
      { "id": 3, "name": "doctor" },
      { "id": 4, "name": "user" }
      // ❌ admin role NOT included
    ]
  }
}
```

**Request (Admin User):**
```bash
GET /api/roles
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roles": [
      { "id": 1, "name": "admin" },      // ✅ Visible to admins
      { "id": 2, "name": "employee" },
      { "id": 3, "name": "employer" },
      { "id": 4, "name": "doctor" },
      { "id": 5, "name": "user" }
    ]
  }
}
```

---

## ✅ **Allowed Operations**

### **1. Admin Creation by Existing Admins**

Only existing admins can create new admin accounts.

**Endpoint:** `POST /api/auth/admin/create`

**Request:**
```bash
POST /api/auth/admin/create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "newadmin",
  "email": "newadmin@ethioconnect.com",
  "password": "SecurePassword123",
  "phone": "+251911000001"
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
      "phone": "+251911000001",
      "isVerified": true,
      "status": "active",
      "roles": ["admin"]
    }
  }
}
```

---

### **2. Default Admin Creation via Script**

Create the first admin using the setup script.

**Command:**
```bash
node scripts/createDefaultAdmin.js
```

**Default Credentials:**
```
Email: admin@ethioconnect.com
Password: Admin@123456
```

**Environment Variables (Optional):**
```env
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@ethioconnect.com
DEFAULT_ADMIN_PASSWORD=YourSecurePassword
DEFAULT_ADMIN_PHONE=+251911000000
```

---

## 🔐 **Valid Registration Roles**

Users can register with these roles:

| Role | Description | Use Case |
|------|-------------|----------|
| `employee` | Job seeker | Looking for employment |
| `employer` | Job provider | Posting job opportunities |
| `doctor` | Medical professional | Healthcare services |
| `user` | General user | Basic platform access |

**Example Registration:**
```bash
POST /api/auth/register
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "role": "employee"  // ✅ ALLOWED
}
```

---

## 🛡️ **Security Features**

### **1. Validation Layer**
```javascript
// Route validation
body('role')
  .optional()
  .isIn(['employer', 'employee', 'doctor', 'user'])
  .withMessage('Invalid role. Valid roles: employer, employee, doctor, user')
```

### **2. Controller Layer**
```javascript
// Prevent admin role registration
if (role === 'admin') {
  logger.warn('Attempted admin registration blocked', {
    username: username,
    email: email
  });
  return res.status(403).json({ 
    success: false, 
    message: 'Cannot register with admin role.' 
  });
}
```

### **3. Role Listing Filter**
```javascript
// Exclude admin role for non-admin users
const isAdmin = req.user?.roles?.includes('admin');
const whereClause = isAdmin ? {} : {
  name: { [Sequelize.Op.ne]: 'admin' }
};
```

---

## 📊 **Admin Workflow**

```
┌─────────────────────────────────────────────────────────┐
│  1. Initial Setup                                       │
│     Run: node scripts/createDefaultAdmin.js             │
│     → Creates first admin                               │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. Admin Login                                         │
│     POST /api/auth/admin/login                          │
│     → Get admin access token                            │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. Create Additional Admins (Optional)                 │
│     POST /api/auth/admin/create                         │
│     → New admin can also create more admins             │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 **Testing**

### **Test 1: Attempt Admin Registration (Should Fail)**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hacker",
    "email": "hacker@test.com",
    "password": "password123",
    "role": "admin"
  }'

# Expected: 403 Forbidden
```

### **Test 2: Get Roles as Non-Admin (Admin Hidden)**
```bash
curl -X GET http://localhost:4000/api/roles \
  -H "Authorization: Bearer <user_token>"

# Expected: Admin role NOT in list
```

### **Test 3: Get Roles as Admin (Admin Visible)**
```bash
curl -X GET http://localhost:4000/api/roles \
  -H "Authorization: Bearer <admin_token>"

# Expected: Admin role IN list
```

### **Test 4: Create Admin (Should Succeed)**
```bash
curl -X POST http://localhost:4000/api/auth/admin/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "username": "newadmin",
    "email": "newadmin@test.com",
    "password": "Admin@123456",
    "phone": "+251911000001"
  }'

# Expected: 201 Created
```

---

## 🚨 **Security Logs**

All admin-related actions are logged:

```javascript
// Blocked admin registration attempt
logger.warn('Attempted admin registration blocked', {
  username: username,
  email: email
});

// Admin creation
logger.info('Admin user created successfully', {
  adminId: adminUser.id,
  username: adminUser.username,
  createdBy: req.user.id
});

// Admin login
logger.info('Admin login successful', {
  adminId: user.id,
  username: user.username,
  email: user.email
});
```

**Check logs:**
```bash
# View all admin-related logs
tail -f logs/combined.log | grep -i admin

# View security warnings
tail -f logs/combined.log | grep -i "blocked"
```

---

## ✅ **Security Checklist**

- [x] Admin role blocked from public registration
- [x] Admin role hidden from non-admin users
- [x] Admin creation requires existing admin authentication
- [x] Default admin creation script available
- [x] All admin actions logged
- [x] Validation at route and controller levels
- [x] Clear error messages for blocked attempts

---

## 📞 **Support**

For admin-related issues:
- Check `ADMIN_SETUP_GUIDE.md` for admin creation
- Review `ADMIN_AUTH_INTEGRATION.md` for integration
- Check logs in `logs/combined.log`

---

**Version:** 1.0.0  
**Last Updated:** November 4, 2025  
**Security Level:** ✅ High
