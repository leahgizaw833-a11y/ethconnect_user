# Admin Setup Guide

## 🔐 **Default Admin Creation**

### **Quick Setup**

Run this command to create the default admin user:

```bash
node scripts/createDefaultAdmin.js
```

### **Default Credentials**

```
Email: admin@ethioconnect.com
Password: Admin@123456
```

⚠️ **IMPORTANT:** Change the default password immediately after first login!

---

## 🔧 **Custom Admin Configuration**

You can customize the default admin credentials using environment variables:

### **Environment Variables**

Add to your `.env` file:

```env
# Default Admin Configuration
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@ethioconnect.com
DEFAULT_ADMIN_PASSWORD=Admin@123456
DEFAULT_ADMIN_PHONE=+251911000000
```

Then run the script:

```bash
node scripts/createDefaultAdmin.js
```

---

## 👥 **Creating Additional Admins**

Once you have an admin account, you can create additional admins through the API.

### **Endpoint**

```
POST /api/auth/admin/create
```

### **Authentication Required**

You must be logged in as an admin to create new admins.

### **Request Example**

```bash
curl -X POST http://localhost:3001/api/auth/admin/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "username": "newadmin",
    "email": "newadmin@ethioconnect.com",
    "password": "SecurePassword123",
    "phone": "+251911000001"
  }'
```

### **Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Min 3 characters, max 120 |
| email | string | Yes | Valid email address |
| password | string | Yes | Min 6 characters |
| phone | string | No | Ethiopian phone format (+251...) |

### **Response**

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

## 📝 **Using Postman**

### **Step 1: Admin Login**

1. Open Postman
2. Import `EthioConnect_UserService.postman_collection.json`
3. Go to **Authentication** → **Admin Login**
4. Use default credentials:
   ```json
   {
     "email": "admin@ethioconnect.com",
     "password": "Admin@123456"
   }
   ```
5. Send request
6. Token will be automatically saved to `{{adminToken}}`

### **Step 2: Create New Admin**

1. Go to **Authentication** → **Create Admin**
2. The admin token is already set in the Authorization header
3. Update the request body:
   ```json
   {
     "username": "newadmin",
     "email": "newadmin@ethioconnect.com",
     "password": "SecurePassword123",
     "phone": "+251911000001"
   }
   ```
4. Send request
5. New admin is created!

---

## 🔄 **Admin Workflow**

```
┌─────────────────────────────────────────────────────────┐
│  1. Run createDefaultAdmin.js script                    │
│     → Creates first admin with default credentials      │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. Login as default admin                              │
│     POST /api/auth/admin/login                          │
│     → Get admin access token                            │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. Change default password (recommended)               │
│     → Update password through profile                   │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  4. Create additional admins                            │
│     POST /api/auth/admin/create                         │
│     → New admins can also create more admins            │
└─────────────────────────────────────────────────────────┘
```

---

## 🛡️ **Security Best Practices**

### **1. Change Default Password**
```bash
# After first login, update password
PUT /api/profiles/me
{
  "password": "NewSecurePassword123!"
}
```

### **2. Use Strong Passwords**
- Minimum 8 characters
- Include uppercase and lowercase
- Include numbers and special characters
- Don't use common words

### **3. Limit Admin Access**
- Only create admin accounts for trusted users
- Regularly review admin accounts
- Remove admin access when no longer needed

### **4. Monitor Admin Actions**
All admin actions are logged:
```bash
# Check logs
tail -f logs/combined.log | grep "admin"
```

---

## 🔍 **Troubleshooting**

### **Issue: Admin already exists**

```
⚠ Admin user already exists with email: admin@ethioconnect.com
```

**Solution:** The script will update the password. Just use the credentials to login.

---

### **Issue: Cannot create admin - Not authorized**

```json
{
  "success": false,
  "message": "Access denied. Admin role required."
}
```

**Solution:** 
1. Make sure you're logged in as an admin
2. Check that the admin token is in the Authorization header
3. Verify the token hasn't expired

---

### **Issue: Email already taken**

```json
{
  "success": false,
  "message": "Email is already taken"
}
```

**Solution:** Use a different email address for the new admin.

---

## 📊 **Admin Capabilities**

Admins can:
- ✅ Create other admin users
- ✅ View all users
- ✅ Search users
- ✅ Update user status (active/inactive/suspended)
- ✅ View user statistics
- ✅ Approve/reject verification requests
- ✅ Create roles
- ✅ View all verifications

---

## 🔐 **Admin Token Structure**

Admin tokens include:

```javascript
{
  id: "admin-uuid",
  username: "admin",
  email: "admin@ethioconnect.com",
  phone: "+251911000000",
  authProvider: "password",
  isVerified: true,
  status: "active",
  roles: ["admin"],  // ← Admin role
  profile: {
    fullName: "Admin User",
    profession: "Administrator",
    verificationStatus: "full"
  }
}
```

---

## 📝 **Script Details**

The `createDefaultAdmin.js` script:

1. ✅ Connects to database
2. ✅ Creates 'admin' role if it doesn't exist
3. ✅ Checks if admin user exists
4. ✅ Creates admin user or updates existing
5. ✅ Assigns admin role
6. ✅ Sets user as verified and active
7. ✅ Displays credentials

**Safe to run multiple times** - Won't create duplicates!

---

## 🚀 **Production Deployment**

### **Step 1: Set Environment Variables**

```env
DEFAULT_ADMIN_EMAIL=your-admin@company.com
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
DEFAULT_ADMIN_PHONE=+251911234567
```

### **Step 2: Run Script on Server**

```bash
# SSH to server
ssh user@your-server

# Navigate to project
cd /path/to/Ethioconnect_userService

# Run script
node scripts/createDefaultAdmin.js
```

### **Step 3: Verify**

```bash
# Test admin login
curl -X POST https://your-domain.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin@company.com",
    "password": "YourSecurePassword123!"
  }'
```

---

## ✅ **Checklist**

- [ ] Run `createDefaultAdmin.js` script
- [ ] Login with default credentials
- [ ] Change default password
- [ ] Create additional admin accounts (if needed)
- [ ] Test admin endpoints in Postman
- [ ] Review admin permissions
- [ ] Set up monitoring for admin actions
- [ ] Document admin credentials securely

---

## 📞 **Support**

For issues or questions:
1. Check logs: `logs/combined.log`
2. Review this guide
3. Check Postman collection examples
4. Contact system administrator

---

**Last Updated:** November 4, 2025  
**Version:** 1.0.0
