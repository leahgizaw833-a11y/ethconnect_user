# EthioConnect User Service - Postman API Testing Guide

## 📁 Files Included

1. **EthioConnect_UserService.postman_collection.json** - Complete API collection with all endpoints
2. **EthioConnect_UserService.postman_environment.json** - Environment variables for local testing

## 🚀 Quick Start

### Step 1: Import Files into Postman

1. Open Postman
2. Click **Import** button (top left)
3. Select both JSON files:
   - `EthioConnect_UserService.postman_collection.json`
   - `EthioConnect_UserService.postman_environment.json`
4. Click **Import**

### Step 2: Select Environment

1. In the top-right corner, select **"EthioConnect User Service - Local"** from the environment dropdown
2. The base URL will automatically be set to `http://localhost:3001`

### Step 3: Start Your Server

```bash
npm start
# or
npm run dev
```

### Step 4: Test the API

1. Start with the **Health Check** endpoint to verify the server is running
2. Use **Authentication > Register User** to create an account
3. The access token will be automatically saved to your environment
4. Test other endpoints using the saved token

## 📋 Collection Structure

### 1. Health Check
- **GET** `/health` - Check service status

### 2. Authentication
- **POST** `/api/v1/auth/register` - Register new user
- **POST** `/api/v1/auth/login` - Login with credentials
- **POST** `/api/v1/auth/otp/request` - Request OTP for phone
- **POST** `/api/v1/auth/otp/verify` - Verify OTP and login
- **GET** `/api/v1/auth/me` - Get current user info
- **GET** `/api/v1/auth/check-username/:username` - Check username availability

### 3. Users
- **GET** `/api/v1/users/search` - Search users
- **GET** `/api/v1/users/:userId` - Get user by ID
- **PUT** `/api/v1/users/:userId/status` - Update user status (Admin)
- **GET** `/api/v1/users/stats/summary` - Get user statistics (Admin)

### 4. Profiles
- **GET** `/api/v1/profiles/:userId` - Get profile by user ID
- **GET** `/api/v1/profiles` - Get current user profile
- **PUT** `/api/v1/profiles` - Update profile

### 5. Roles
- **GET** `/api/v1/roles` - Get all roles
- **POST** `/api/v1/roles` - Create role (Admin)
- **POST** `/api/v1/roles/assign` - Assign role to user (Admin)
- **DELETE** `/api/v1/roles/revoke` - Revoke role from user (Admin)
- **GET** `/api/v1/roles/user/:userId` - Get user's roles

### 6. Verifications
- **POST** `/api/v1/verifications` - Submit verification request
- **GET** `/api/v1/verifications` - Get my verifications
- **GET** `/api/v1/verifications/pending` - Get pending verifications (Admin)
- **PUT** `/api/v1/verifications/:verificationId` - Update verification status (Admin)
- **GET** `/api/v1/verifications/user/:userId` - Get user verifications (Admin)

## 🔐 Authentication

### Automatic Token Management

The collection includes test scripts that automatically:
- Save access tokens after successful login/register
- Store refresh tokens
- Capture OTP codes in development mode

### Manual Token Setup

If needed, you can manually set tokens:
1. Click the eye icon (👁️) in the top-right
2. Find `access_token` variable
3. Set the current value to your token

### Protected Endpoints

Most endpoints require authentication. Protected requests automatically use `{{access_token}}` from the environment.

## 📝 Environment Variables

The environment includes these variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `base_url` | API base URL | `http://localhost:3001` |
| `access_token` | JWT access token | Auto-filled after login |
| `refresh_token` | JWT refresh token | Auto-filled after login |
| `otp_code` | OTP code | Auto-filled in dev mode |

## 🧪 Testing Workflow

### Basic User Flow

1. **Health Check** - Verify server is running
2. **Register User** - Create account (token auto-saved)
3. **Get Current User (Me)** - Verify authentication
4. **Update Profile** - Add profile information
5. **Get Current User Profile** - View updated profile

### OTP Authentication Flow

1. **Request OTP** - Get OTP for phone number
2. **Verify OTP** - Login/register with OTP (token auto-saved)
3. **Get Current User (Me)** - Verify authentication

### Admin Operations Flow

1. **Login** as admin user
2. **Get All Roles** - View available roles
3. **Assign Role to User** - Grant permissions
4. **Get Pending Verifications** - Review verification requests
5. **Update Verification Status** - Approve/reject verifications

## 🎯 Example Requests

### Register a New User

```json
POST /api/v1/auth/register
{
  "username": "john_doe",
  "email": "john.doe@example.com",
  "phone": "+251911234567",
  "password": "SecurePass123!"
}
```

### Login

```json
POST /api/v1/auth/login
{
  "identifier": "john_doe",
  "password": "SecurePass123!"
}
```

### Update Profile

```json
PUT /api/v1/profiles
{
  "fullName": "John Doe",
  "bio": "Software developer passionate about Ethiopian tech",
  "profession": "Software Engineer",
  "languages": ["Amharic", "English", "Oromo"],
  "gender": "male",
  "age": 28
}
```

### Submit Verification

```json
POST /api/v1/verifications
{
  "type": "kyc",
  "documentUrl": "https://example.com/documents/id_card.pdf",
  "notes": "ID card verification for account"
}
```

## 🔧 Customization

### Change Base URL

For testing against different environments:

1. Click the eye icon (👁️)
2. Edit the `base_url` variable
3. Examples:
   - Production: `https://api.ethioconnect.com`
   - Staging: `https://staging-api.ethioconnect.com`
   - Local: `http://localhost:3001`

### Add Custom Variables

1. Click the eye icon (👁️)
2. Click **Edit** next to the environment name
3. Add new variables as needed

## 📚 Additional Resources

- [Project README](../README.md)
- [API Documentation](./API_DOCUMENTATION.md) (if available)
- [Postman Documentation](https://learning.postman.com/)

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Token expired" errors
- **Solution**: Re-login using the Login endpoint to get a new token

**Issue**: "CORS error"
- **Solution**: Ensure your server allows requests from Postman (check CORS settings)

**Issue**: "Connection refused"
- **Solution**: Verify server is running on the correct port (default: 3001)

**Issue**: Environment variables not working
- **Solution**: Ensure the environment is selected in the top-right dropdown

## 💡 Tips

1. **Use folders** to organize your tests by feature
2. **Test scripts** automatically save tokens - no need to copy/paste
3. **Collections can be run** using Postman Collection Runner for automated testing
4. **Variables** make it easy to switch between environments
5. **Save responses** as examples for documentation

## 🤝 Contributing

When adding new endpoints:
1. Add them to the appropriate folder in the collection
2. Include request validation examples
3. Add test scripts for token/variable management
4. Update this guide with new endpoint information

---

**Last Updated**: November 2025  
**Collection Version**: 1.0.0  
**API Version**: v1
