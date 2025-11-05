# Token Response Format - Integration Guide

## 📋 **Overview**

Authentication endpoints return **access tokens** in the response body for easier integration. **Refresh tokens** are only provided for OTP-based authentication.

---

## 🔄 **Updated Endpoints**

### **1. User Registration**
**Endpoint:** `POST /api/auth/register`

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "b945f3dc-1fc8-480f-a11f-f23a42797744",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+251912345678",
      "authProvider": "password",
      "isVerified": false,
      "status": "active",
      "createdAt": "2025-11-04T14:00:00.000Z",
      "updatedAt": "2025-11-04T14:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### **2. User Login**
**Endpoint:** `POST /api/auth/login`

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "b945f3dc-1fc8-480f-a11f-f23a42797744",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+251912345678",
      "authProvider": "password",
      "isVerified": true,
      "status": "active",
      "roles": ["employee", "doctor"],
      "lastLogin": "2025-11-04T14:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### **3. Admin Login**
**Endpoint:** `POST /api/auth/admin/login`

**Response:**
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "user": {
      "id": "admin-uuid",
      "username": "admin",
      "email": "admin@ethioconnect.com",
      "phone": "+251911000000",
      "authProvider": "password",
      "isVerified": true,
      "status": "active",
      "roles": ["admin"],
      "lastLogin": "2025-11-04T14:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### **4. OTP Verification** ⭐
**Endpoint:** `POST /api/auth/otp/verify`

**Note:** This is the only endpoint that returns both access and refresh tokens.

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "id": "b945f3dc-1fc8-480f-a11f-f23a42797744",
      "username": null,
      "email": null,
      "phone": "+251941893993",
      "authProvider": "phone",
      "isVerified": true,
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI5NDVmM2RjLTFmYzgtNDgwZi1hMTFmLWYyM2E0Mjc5Nzc0NCIsInVzZXJuYW1lIjpudWxsLCJlbWFpbCI6bnVsbCwicGhvbmUiOiIrMjUxOTQxODkzOTkzIiwiYXV0aFByb3ZpZGVyIjoicGhvbmUiLCJpYXQiOjE3NjIyNTcyNzgsImV4cCI6MTc2MjI1ODE3OH0._B77Zw2g84MG1bg_wWhjGH2WtNIik_VFIIQMqxao7jM",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI5NDVmM2RjLTFmYzgtNDgwZi1hMTFmLWYyM2E0Mjc5Nzc0NCIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzYyMjU3Mjc4LCJleHAiOjE3NjI4NjIwNzh9.vOb4SaC1-VkLX1qixh9KztRpeSFAxFoJDPTpG42xjqY"
  }
}
```

---

### **5. Login with OTP** ⭐
**Endpoint:** `POST /api/auth/otp/login`

**Note:** Requires existing authentication. Returns both access and refresh tokens.

**Request:**
```json
{
  "phone": "+251912345678"
}
```

**Headers:**
```
Authorization: Bearer <existing_access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "b945f3dc-1fc8-480f-a11f-f23a42797744",
      "username": null,
      "email": null,
      "phone": "+251912345678",
      "authProvider": "phone",
      "isVerified": true,
      "status": "active",
      "profile": {
        "fullName": "John Doe"
      }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🔑 **Token Structure**

### **Access Token Payload:**
```javascript
{
  // User Identity
  id: "user-uuid",
  username: "johndoe",
  email: "john@example.com",
  phone: "+251912345678",
  
  // Authentication
  authProvider: "password", // or "phone", "google", etc.
  isVerified: true,
  status: "active",
  
  // Roles
  roles: ["employee", "doctor"],
  
  // Profile
  profile: {
    fullName: "John Doe",
    profession: "Software Engineer",
    verificationStatus: "professional",
    photoUrl: "https://...",
    bio: "Experienced developer..."
  },
  
  // JWT Standard Claims
  iat: 1762257278,  // Issued at
  exp: 1762258178   // Expires at
}
```

### **Refresh Token Payload:**
```javascript
{
  id: "user-uuid",
  type: "refresh",
  iat: 1762257278,  // Issued at
  exp: 1762862078   // Expires at (7 days)
}
```

---

## 💻 **Integration Examples**

### **Example 1: Frontend Login Flow**

```javascript
// Login request
async function login(email, password) {
  try {
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (result.success) {
      // Store access token
      localStorage.setItem('accessToken', result.data.accessToken);
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(result.data.user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}
```

---

### **Example 2: React/Next.js Integration**

```javascript
import { useState } from 'react';
import axios from 'axios';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:4000/api/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        // Store access token
        localStorage.setItem('accessToken', response.data.data.accessToken);
        
        // Store user
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        // Redirect
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

### **Example 3: Mobile App (React Native)**

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

async function login(email, password) {
  try {
    const response = await axios.post('http://localhost:4000/api/auth/login', {
      email,
      password
    });

    if (response.data.success) {
      // Store access token
      await AsyncStorage.setItem('accessToken', response.data.data.accessToken);
      
      // Store user
      await AsyncStorage.setItem('user', JSON.stringify(response.data.data.user));
      
      return response.data.data.user;
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
```

---

### **Example 4: Admin Dashboard**

```javascript
async function adminLogin(email, password) {
  try {
    const response = await fetch('http://localhost:4000/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (result.success) {
      // Check if user has admin role
      if (result.data.user.roles.includes('admin')) {
        // Store admin token
        localStorage.setItem('adminToken', result.data.accessToken);
        localStorage.setItem('admin', JSON.stringify(result.data.user));
        
        // Redirect to admin dashboard
        window.location.href = '/admin/dashboard';
      } else {
        alert('Admin access required');
      }
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Admin login error:', error);
  }
}
```

---

## 🔄 **Using Tokens in Requests**

### **Example: Authenticated Request**

```javascript
// Get user profile
async function getUserProfile() {
  const accessToken = localStorage.getItem('accessToken');
  
  try {
    const response = await fetch('http://localhost:4000/api/profiles', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

### **Example: Axios Interceptor**

```javascript
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:4000/api'
});

// Request interceptor - Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired, refresh it (only for OTP users)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Check if user has refresh token (OTP authentication only)
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          // No refresh token, redirect to login
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post('http://localhost:4000/api/auth/refresh-token', {
          refreshToken
        });

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 📊 **Response Format Summary**

| Endpoint | Access Token | Refresh Token | User Data | Roles Included |
|----------|-------------|---------------|-----------|----------------|
| `/api/auth/register` | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| `/api/auth/login` | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| `/api/auth/admin/login` | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| `/api/auth/otp/verify` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| `/api/auth/otp/login` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| `/api/auth/refresh-token` | ✅ Yes | ❌ No | ❌ No | ❌ No |

---

## ✅ **Migration Checklist**

- [ ] Update login flow to extract access token from response body
- [ ] Store access token (no refresh token for normal auth)
- [ ] Store both access and refresh tokens for OTP authentication
- [ ] Update token refresh logic (only for OTP users)
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Test admin login flow
- [ ] Test OTP verification flow
- [ ] Implement token expiration handling
- [ ] Update API documentation
- [ ] Update mobile app if applicable

---

## 🔒 **Security Best Practices**

### **1. Store Tokens Securely**

```javascript
// ✅ GOOD - Use httpOnly cookies (backend)
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});

// ✅ GOOD - Use secure storage (mobile)
await SecureStore.setItemAsync('accessToken', token);

// ⚠️ OK - Use localStorage (web, with caution)
localStorage.setItem('accessToken', token);

// ❌ BAD - Never store in regular cookies or expose in URL
```

---

### **2. Handle Token Expiration**

```javascript
// Check token expiration before making requests
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// Refresh token if expired
if (isTokenExpired(accessToken)) {
  await refreshAccessToken();
}
```

---

### **3. Clear Tokens on Logout**

```javascript
function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  // Remove admin token if exists
  localStorage.removeItem('adminToken');
  localStorage.removeItem('admin');
  window.location.href = '/login';
}
```

---

## 📞 **Support**

For questions or issues:
- Check `AXIOS_INTEGRATION_GUIDE.md` for detailed integration examples
- Review `ADMIN_AUTH_INTEGRATION.md` for admin-specific integration
- Test with Postman collection: `EthioConnect_UserService.postman_collection.json`

---

**Version:** 1.0.0  
**Last Updated:** November 4, 2025  
**Breaking Changes:** ❌ None (Backward compatible)
