# API Examples - EthioConnect User Service

Complete API examples with curl and JavaScript/Node.js

## Table of Contents
- [Authentication](#authentication)
- [User Management](#user-management)
- [Profile Management](#profile-management)
- [Role Management](#role-management)
- [Verification](#verification)

---

## Authentication

### Register New User

**cURL:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "0912345678",
    "password": "SecurePass123",
    "fullName": "John Doe"
  }'
```

**JavaScript (axios):**
```javascript
const axios = require('axios');

const registerUser = async () => {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/auth/register', {
      username: 'johndoe',
      email: 'john@example.com',
      phone: '0912345678',
      password: 'SecurePass123',
      fullName: 'John Doe'
    });
    
    console.log('User registered:', response.data);
    console.log('Token:', response.data.token);
    return response.data.token;
  } catch (error) {
    console.error('Registration failed:', error.response?.data);
  }
};
```

### Login

**cURL:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "johndoe",
    "password": "SecurePass123"
  }'
```

**JavaScript:**
```javascript
const login = async (identifier, password) => {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
      identifier,
      password
    });
    
    const token = response.data.token;
    // Store token for future requests
    localStorage.setItem('authToken', token);
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data);
  }
};
```

### Request OTP

**cURL:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0912345678"
  }'
```

**JavaScript:**
```javascript
const requestOTP = async (phone) => {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/auth/otp/request', {
      phone
    });
    
    console.log('OTP sent:', response.data);
    // In development, OTP is returned in response
    if (response.data.otp) {
      console.log('OTP Code:', response.data.otp);
    }
    return response.data;
  } catch (error) {
    console.error('OTP request failed:', error.response?.data);
  }
};
```

### Verify OTP

**cURL:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0912345678",
    "otp": "123456"
  }'
```

**JavaScript:**
```javascript
const verifyOTP = async (phone, otp) => {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/auth/otp/verify', {
      phone,
      otp
    });
    
    const token = response.data.token;
    localStorage.setItem('authToken', token);
    return response.data;
  } catch (error) {
    console.error('OTP verification failed:', error.response?.data);
  }
};
```

### Get Current User

**cURL:**
```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**JavaScript:**
```javascript
const getCurrentUser = async () => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.get('http://localhost:3001/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.data.user;
  } catch (error) {
    console.error('Failed to get user:', error.response?.data);
  }
};
```

### Check Username Availability

**cURL:**
```bash
curl http://localhost:3001/api/v1/auth/check-username/johndoe
```

**JavaScript:**
```javascript
const checkUsername = async (username) => {
  try {
    const response = await axios.get(
      `http://localhost:3001/api/v1/auth/check-username/${username}`
    );
    
    return response.data.data.available;
  } catch (error) {
    console.error('Failed to check username:', error.response?.data);
  }
};
```

---

## User Management

### Search Users

**cURL:**
```bash
curl "http://localhost:3001/api/v1/users/search?q=john&limit=10&offset=0"
```

**JavaScript:**
```javascript
const searchUsers = async (query, limit = 10, offset = 0) => {
  try {
    const response = await axios.get('http://localhost:3001/api/v1/users/search', {
      params: { q: query, limit, offset }
    });
    
    return response.data.data.users;
  } catch (error) {
    console.error('Search failed:', error.response?.data);
  }
};
```

### Get User by ID

**cURL:**
```bash
curl http://localhost:3001/api/v1/users/USER_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript:**
```javascript
const getUserById = async (userId) => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.get(`http://localhost:3001/api/v1/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.data.data.user;
  } catch (error) {
    console.error('Failed to get user:', error.response?.data);
  }
};
```

### Update User Status (Admin Only)

**cURL:**
```bash
curl -X PUT http://localhost:3001/api/v1/users/USER_ID/status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suspended"
  }'
```

**JavaScript:**
```javascript
const updateUserStatus = async (userId, status) => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.put(
      `http://localhost:3001/api/v1/users/${userId}/status`,
      { status },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to update status:', error.response?.data);
  }
};
```

### Get User Statistics (Admin Only)

**cURL:**
```bash
curl http://localhost:3001/api/v1/users/stats/summary \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**JavaScript:**
```javascript
const getUserStats = async () => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.get('http://localhost:3001/api/v1/users/stats/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Failed to get stats:', error.response?.data);
  }
};
```

---

## Profile Management

### Get Profile by User ID

**cURL:**
```bash
curl http://localhost:3001/api/v1/profiles/USER_ID
```

**JavaScript:**
```javascript
const getProfile = async (userId) => {
  try {
    const response = await axios.get(`http://localhost:3001/api/v1/profiles/${userId}`);
    return response.data.data.profile;
  } catch (error) {
    console.error('Failed to get profile:', error.response?.data);
  }
};
```

### Update Profile

**cURL:**
```bash
curl -X PUT http://localhost:3001/api/v1/profiles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "bio": "Software developer passionate about technology",
    "profession": "Software Developer",
    "languages": ["en", "am"],
    "gender": "male",
    "age": 28,
    "religion": "Christian",
    "ethnicity": "Ethiopian",
    "education": "Bachelor in Computer Science",
    "interests": ["technology", "music", "sports"]
  }'
```

**JavaScript:**
```javascript
const updateProfile = async (profileData) => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.put(
      'http://localhost:3001/api/v1/profiles',
      profileData,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    return response.data.data.profile;
  } catch (error) {
    console.error('Failed to update profile:', error.response?.data);
  }
};

// Example usage
updateProfile({
  fullName: 'John Doe',
  bio: 'Software developer',
  profession: 'Developer',
  languages: ['en', 'am'],
  interests: ['tech', 'music']
});
```

### Get Current User's Profile

**cURL:**
```bash
curl http://localhost:3001/api/v1/profiles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript:**
```javascript
const getMyProfile = async () => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.get('http://localhost:3001/api/v1/profiles', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.data.data.profile;
  } catch (error) {
    console.error('Failed to get profile:', error.response?.data);
  }
};
```

---

## Role Management

### Get All Roles

**cURL:**
```bash
curl http://localhost:3001/api/v1/roles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript:**
```javascript
const getAllRoles = async () => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.get('http://localhost:3001/api/v1/roles', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.data.data.roles;
  } catch (error) {
    console.error('Failed to get roles:', error.response?.data);
  }
};
```

### Assign Role to User (Admin Only)

**cURL:**
```bash
curl -X POST http://localhost:3001/api/v1/roles/assign \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "roleId": "role-uuid-here"
  }'
```

**JavaScript:**
```javascript
const assignRole = async (userId, roleId) => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.post(
      'http://localhost:3001/api/v1/roles/assign',
      { userId, roleId },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to assign role:', error.response?.data);
  }
};
```

### Revoke Role from User (Admin Only)

**cURL:**
```bash
curl -X DELETE http://localhost:3001/api/v1/roles/revoke \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "roleId": "role-uuid-here"
  }'
```

**JavaScript:**
```javascript
const revokeRole = async (userId, roleId) => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.delete('http://localhost:3001/api/v1/roles/revoke', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { userId, roleId }
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to revoke role:', error.response?.data);
  }
};
```

### Get User's Roles

**cURL:**
```bash
curl http://localhost:3001/api/v1/roles/user/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript:**
```javascript
const getUserRoles = async (userId) => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.get(`http://localhost:3001/api/v1/roles/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.data.data.roles;
  } catch (error) {
    console.error('Failed to get user roles:', error.response?.data);
  }
};
```

---

## Verification

### Submit Verification Request

**cURL:**
```bash
curl -X POST http://localhost:3001/api/v1/verifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "doctor_license",
    "documentUrl": "https://example.com/uploads/license.pdf",
    "notes": "Medical license issued by Ethiopian Ministry of Health"
  }'
```

**JavaScript:**
```javascript
const submitVerification = async (type, documentUrl, notes) => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.post(
      'http://localhost:3001/api/v1/verifications',
      { type, documentUrl, notes },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    return response.data.data.verification;
  } catch (error) {
    console.error('Failed to submit verification:', error.response?.data);
  }
};

// Example: Submit doctor license verification
submitVerification(
  'doctor_license',
  'https://example.com/uploads/license.pdf',
  'Medical license issued in 2020'
);
```

### Get My Verifications

**cURL:**
```bash
curl http://localhost:3001/api/v1/verifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript:**
```javascript
const getMyVerifications = async () => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.get('http://localhost:3001/api/v1/verifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.data.data.verifications;
  } catch (error) {
    console.error('Failed to get verifications:', error.response?.data);
  }
};
```

### Get Pending Verifications (Admin Only)

**cURL:**
```bash
curl http://localhost:3001/api/v1/verifications/pending \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**JavaScript:**
```javascript
const getPendingVerifications = async () => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.get('http://localhost:3001/api/v1/verifications/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.data.data.verifications;
  } catch (error) {
    console.error('Failed to get pending verifications:', error.response?.data);
  }
};
```

### Approve/Reject Verification (Admin Only)

**cURL - Approve:**
```bash
curl -X PUT http://localhost:3001/api/v1/verifications/VERIFICATION_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "notes": "Document verified and approved"
  }'
```

**cURL - Reject:**
```bash
curl -X PUT http://localhost:3001/api/v1/verifications/VERIFICATION_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "notes": "Document is not clear, please resubmit"
  }'
```

**JavaScript:**
```javascript
const updateVerification = async (verificationId, status, notes) => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.put(
      `http://localhost:3001/api/v1/verifications/${verificationId}`,
      { status, notes },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to update verification:', error.response?.data);
  }
};

// Approve
updateVerification('verification-id', 'approved', 'Verified successfully');

// Reject
updateVerification('verification-id', 'rejected', 'Document unclear');
```

---

## Complete Example: User Registration Flow

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

// Complete user registration and profile setup
async function completeUserSetup() {
  try {
    // 1. Register user
    console.log('1. Registering user...');
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
      username: 'janedoe',
      email: 'jane@example.com',
      phone: '0923456789',
      password: 'SecurePass123',
      fullName: 'Jane Doe'
    });
    
    const token = registerResponse.data.token;
    const userId = registerResponse.data.data.user.id;
    console.log('✓ User registered, token:', token);
    
    // 2. Update profile
    console.log('\n2. Updating profile...');
    await axios.put(`${API_BASE}/profiles`, {
      bio: 'Medical professional specializing in cardiology',
      profession: 'Doctor',
      languages: ['en', 'am', 'or'],
      gender: 'female',
      age: 32,
      education: 'MD in Cardiology',
      interests: ['medicine', 'research', 'teaching']
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✓ Profile updated');
    
    // 3. Submit verification
    console.log('\n3. Submitting doctor license verification...');
    await axios.post(`${API_BASE}/verifications`, {
      type: 'doctor_license',
      documentUrl: 'https://example.com/uploads/jane-license.pdf',
      notes: 'Medical license from Addis Ababa University'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✓ Verification submitted');
    
    // 4. Get updated user data
    console.log('\n4. Fetching complete user data...');
    const userData = await axios.get(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('\n✅ Setup complete!');
    console.log('User:', userData.data.data.user);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

completeUserSetup();
```

---

## Error Handling

All API errors follow this format:

```javascript
{
  "success": false,
  "message": "Error description",
  "errors": [/* detailed errors if validation failed */]
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
