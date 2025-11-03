# OTP Authentication System for Passengers - Complete Guide

## Overview

This document provides a comprehensive guide to the OTP (One-Time Password) authentication system for passenger registration and login with tokenization. This system can be used in other projects for secure phone-based authentication.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Models](#database-models)
3. [Core Components](#core-components)
4. [API Endpoints](#api-endpoints)
5. [Authentication Flow](#authentication-flow)
6. [Tokenization System](#tokenization-system)
7. [Implementation Examples](#implementation-examples)
8. [Configuration](#configuration)
9. [Security Features](#security-features)
10. [Error Handling](#error-handling)
11. [Implementation status (where to find the code)](#implementation-status-where-to-find-the-code)

## System Architecture

The OTP authentication system consists of several interconnected components:

- **Phone Authentication Controller**: Handles OTP requests and verification
- **Advanced OTP Utility**: Manages OTP generation, storage, and verification
- **Token Factory**: Creates standardized JWT tokens with claims
- **SMS Utility**: Sends OTP codes via SMS provider
- **Phone Utility**: Validates and normalizes Ethiopian phone numbers

## Database Models

### Passenger Model
```javascript
{
  id: INTEGER (Primary Key, Auto Increment),
  name: STRING (Nullable),
  phone: STRING (Required, Unique),
  password: STRING (Required, Hashed),
  email: STRING (Nullable, Unique),
  contractId: STRING (Nullable),
  wallet: DECIMAL(10,2) (Default: 0),
  rating: FLOAT (Default: 5.0),
  rewardPoints: INTEGER (Default: 0),
  emergencyContacts: TEXT (Nullable),
  otpRegistered: BOOLEAN (Default: false)
}
```

### OTP Model
```javascript
{
  id: INTEGER (Primary Key, Auto Increment),
  phone: STRING (Required),
  hashedSecret: STRING (Required),
  expiresAt: BIGINT (Required),
  attempts: INTEGER (Default: 0),
  status: STRING (Default: 'pending'), // 'pending', 'verified', 'expired', 'locked'
  referenceType: STRING (Required), // 'Passenger', 'Driver'
  referenceId: INTEGER (Required)
}
```

## Core Components

### 1. Phone Authentication Controller

#### Request OTP Function
```javascript
async function requestOtp(req, res) {
  // Validates phone number format
  // Creates or finds passenger by phone
  // Generates and sends OTP
  // Returns success response with expiration time
}
```

#### Verify OTP Function
```javascript
async function verifyOtp(req, res) {
  // Validates phone and OTP input
  // Finds or creates passenger
  // Verifies OTP using utility
  // Marks passenger as OTP registered
  // Issues access and refresh tokens
  // Returns tokens and passenger info
}
```

### 2. Advanced OTP Utility

#### Configuration Options
```javascript
const otpUtil = createAdvancedOtpUtil({
  token: process.env.GEEZSMS_TOKEN,
  otpLength: 6,
  otpExpirationSeconds: 300, // 5 minutes
  maxAttempts: 3,
  lockoutSeconds: 1800, // 30 minutes
});
```

#### Generate and Send OTP
```javascript
async function generateAndSendOtp({ referenceType, referenceId, phoneNumber }) {
  // Normalizes phone number to E.164 format
  // Checks for existing valid OTP (rate limiting)
  // Checks for locked accounts
  // Generates 6-digit numeric OTP
  // Stores hashed OTP in database
  // Sends SMS via provider
  // Returns success response
}
```

#### Verify OTP
```javascript
async function verifyOtp({ referenceType, referenceId, token, phoneNumber }) {
  // Normalizes phone number
  // Cleans up expired/verified OTPs
  // Finds pending OTP
  // Checks attempt limits and lockout
  // Verifies hashed token
  // Updates status and cleans up on success
}
```

### 3. Token Factory

#### Standard Claims Structure
```javascript
{
  iss: 'auth-service', // Issuer
  aud: 'booking-service', // Audience
  ver: 1, // Token version
  id: 'user_id',
  type: 'passenger',
  userType: 'passenger',
  roles: [],
  driverId: null, // For drivers only
  paymentPreference: null,
  carName: null
}
```

#### Profile Claims for Passengers
```javascript
{
  name: 'passenger_name',
  phone: '+2519XXXXXXXX',
  email: 'email@example.com',
  contractId: 'contract_id',
  wallet: '100.00',
  rating: 5.0,
  rewardPoints: 100,
  emergencyContacts: 'contact_info',
  otpRegistered: true
}
```

### 4. Phone Utility

#### Supported Formats
- `09XXXXXXXX` (Ethiopian local format)
- `07XXXXXXXX` (Ethiopian local format)
- `2519XXXXXXXX` (International without +)
- `2517XXXXXXXX` (International without +)
- `+2519XXXXXXXX` (E.164 format)
- `+2517XXXXXXXX` (E.164 format)

#### Functions
```javascript
function normalizePhone(input) {
  // Converts any valid format to E.164 (+251XXXXXXXXX)
}

function isValidPhone(input) {
  // Returns boolean for phone validation
}
```

## API Endpoints

### 1. Request OTP
```http
POST /auth/request-otp
Content-Type: application/json

{
  "phone": "09XXXXXXXX"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phoneNumber": "+2519XXXXXXXX",
  "expiresIn": 300
}
```

### 2. Verify OTP
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "phone": "09XXXXXXXX",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully. Account activated.",
  "passenger": {
    "id": 1,
    "phone": "+2519XXXXXXXX"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here"
}
```

### 3. Passenger Registration (Alias)
```http
POST /auth/passenger/register-phone
Content-Type: application/json

{
  "phone": "09XXXXXXXX"
}
```

### 4. Passenger OTP Verification with Redirect
```http
POST /auth/passenger/verify-otp
Content-Type: application/json

{
  "phone": "09XXXXXXXX",
  "otp": "123456"
}
```

## Authentication Flow

### Registration Flow
1. **Request OTP**: Client sends phone number
2. **Phone Validation**: System validates Ethiopian phone format
3. **Passenger Creation**: Creates passenger record if doesn't exist
4. **OTP Generation**: Generates 6-digit OTP with 5-minute expiry
5. **SMS Sending**: Sends OTP via SMS provider
6. **Response**: Returns success with expiration time

### Verification Flow
1. **Submit OTP**: Client sends phone and OTP code
2. **Validation**: Validates input format
3. **OTP Verification**: Checks OTP against stored hash
4. **Account Activation**: Marks passenger as OTP registered
5. **Token Generation**: Creates access and refresh tokens
6. **Response**: Returns tokens and passenger info

## Tokenization System

### Access Token Structure
```javascript
// Standard claims (always present)
{
  iss: "auth-service",
  aud: "booking-service", 
  ver: 1,
  id: "123",
  type: "passenger",
  userType: "passenger",
  roles: [],
  driverId: null,
  paymentPreference: null,
  carName: null,
  
  // Profile claims (when includeProfile: true)
  name: "John Doe",
  phone: "+2519XXXXXXXX",
  email: "john@example.com",
  wallet: "100.00",
  rating: 5.0,
  rewardPoints: 100,
  otpRegistered: true,
  
  // JWT standard claims
  iat: 1640995200,
  exp: 1641081600
}
```

### Token Generation Functions
```javascript
// Basic token
const accessToken = signAccessToken({ 
  user: passenger, 
  userType: 'passenger', 
  roles: [] 
});

// Token with profile data
const accessToken = signAccessTokenWithExtras({ 
  user: passenger, 
  userType: 'passenger', 
  roles: [], 
  includeProfile: true 
});

// Refresh token
const { token: refreshToken } = await issueRefreshToken({ 
  userType: 'passenger', 
  userId: passenger.id, 
  metadata: { otpRegistered: true } 
});
```

## Implementation Examples

### Basic OTP Request Implementation
```javascript
const { models } = require('./models');
const createAdvancedOtpUtil = require('./utils/createAdvancedOtpUtil');
const { isValidPhone, normalizePhone } = require('./utils/phone');

// Initialize OTP utility
const otpUtil = createAdvancedOtpUtil({
  token: process.env.GEEZSMS_TOKEN,
  otpLength: 6,
  otpExpirationSeconds: 300,
  maxAttempts: 3,
  lockoutSeconds: 1800,
});

async function requestOtpForPassenger(phoneNumber) {
  // Validate phone
  if (!isValidPhone(phoneNumber)) {
    throw new Error('Invalid phone number format');
  }
  
  const normalizedPhone = normalizePhone(phoneNumber);
  
  // Find or create passenger
  let passenger = await models.Passenger.findOne({ 
    where: { phone: normalizedPhone } 
  });
  
    const randomPassword = Math.random().toString(36).slice(2, 12) + '!A1';
    const hashed = await hashPassword(randomPassword);
    passenger = await models.Passenger.create({
      name: null,
      phone: normalizedPhone,
      email: null,
      emergencyContacts: null,
      password: hashed
    });
  }
  
  // Generate and send OTP
  const otpResponse = await otpUtil.generateAndSendOtp({
    referenceType: 'Passenger',
    referenceId: passenger.id,
    phoneNumber: normalizedPhone
  });
  
  return otpResponse;
}
```

### OTP Verification Implementation
```javascript
const { signAccessTokenWithExtras } = require('./utils/tokenFactory');
const { issueRefreshToken } = require('./utils/jwt');

async function verifyPassengerOtp(phoneNumber, otpCode) {
  const normalizedPhone = normalizePhone(phoneNumber);
  
  // Find passenger
  const passenger = await models.Passenger.findOne({ 
    where: { phone: normalizedPhone } 
  });
  
  if (!passenger) {
    throw new Error('Passenger not found');
  }
  
  // Verify OTP
  await otpUtil.verifyOtp({
    referenceType: 'Passenger',
    referenceId: passenger.id,
    token: otpCode,
    phoneNumber: normalizedPhone
  });
  
  // Mark as OTP registered
  passenger.otpRegistered = true;
  await passenger.save();
  
  // Generate tokens
  const accessToken = signAccessTokenWithExtras({ 
    user: passenger, 
    userType: 'passenger', 
    roles: [], 
    includeProfile: true 
  });
  
  const { token: refreshToken } = await issueRefreshToken({ 
    userType: 'passenger', 
    userId: passenger.id, 
    metadata: { otpRegistered: true } 
  });
  
  return {
    passenger: {
      id: passenger.id,
      phone: passenger.phone
    },
    accessToken,
    refreshToken
  };
}
```

## Configuration

### Environment Variables
```bash
# SMS Provider Configuration
GEEZSMS_TOKEN=your_sms_provider_token
GEEZSMS_BASE_URL=https://api.geezsms.com/api/v1
GEEZSMS_SENDER_ID=your_sender_id
GEEZSMS_SHORTCODE_ID=your_shortcode_id

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Token Claims
TOKEN_ISSUER=auth-service
TOKEN_AUDIENCE=booking-service

# Company Information
COMPANY_NAME=Your Company Name

# Environment
NODE_ENV=production
```

### OTP Configuration Options
```javascript
{
  token: 'SMS_PROVIDER_TOKEN',
  otpLength: 6, // Length of OTP code
  otpExpirationSeconds: 300, // 5 minutes
  maxAttempts: 3, // Max verification attempts
  lockoutSeconds: 1800, // 30 minutes lockout
  companyName: 'Your Company'
}
```

## Security Features

### 1. Rate Limiting
- **OTP Request**: 30-second cooldown between requests
- **API Endpoints**: 5 requests per minute per IP/phone combination

### 2. OTP Security
- **Hashed Storage**: OTPs stored as SHA-256 hashes
- **Expiration**: 5-minute expiry time
- **Attempt Limiting**: Maximum 3 verification attempts
- **Account Lockout**: 30-minute lockout after max attempts

### 3. Phone Validation
- **Format Validation**: Strict Ethiopian phone number formats
- **Normalization**: Consistent E.164 format storage
- **Regex Validation**: Server-side format checking

### 4. Token Security
- **JWT Standards**: Industry-standard JWT implementation
- **Refresh Tokens**: Secure refresh token rotation
- **Claims Validation**: Structured token claims
- **Expiration**: Configurable token expiry times

## Error Handling

### Common Error Responses

#### Invalid Phone Number
```json
{
  "success": false,
  "message": "Invalid phone number. Use 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX"
}
```

#### Rate Limiting
```json
{
  "success": false,
  "message": "Please wait 25 seconds before requesting another OTP"
}
```

#### Account Locked
```json
{
  "success": false,
  "message": "Too many attempts. Account locked for 30 minutes"
}
```

#### Invalid OTP
```json
{
  "success": false,
  "message": "Invalid OTP. Please check and try again."
}
```

#### Expired OTP
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new one."
}
```

### Error Status Codes
- `400`: Bad Request (invalid input, expired OTP, invalid OTP)
- `429`: Too Many Requests (rate limiting, account locked)
- `500`: Internal Server Error (system errors)

## Usage in Other Projects

### 1. Copy Required Files
```
utils/
├── createAdvancedOtpUtil.js
├── sendSingleSMSUtil.js
├── phone.js
├── tokenFactory.js
└── jwt.js

controllers/
└── phoneAuthController.js

models/
├── passenger.js
└── otp.js

routes/
└── phoneAuthRoutes.js
```

### 2. Install Dependencies
```bash
npm install axios crypto sequelize joi express-rate-limit
```

### 3. Configure Environment
Set up the required environment variables as listed in the configuration section.

### 4. Database Setup
Create the required database tables using the provided models.

### 5. Integration
Import and use the controllers and utilities in your Express.js application.

---

## Notes

- This system is specifically designed for Ethiopian phone numbers
- SMS provider integration uses GeezSMS API
- The system supports both Passenger and Driver reference types
- Tokens include comprehensive user profile information
- All phone numbers are normalized to E.164 format for consistency
- The system includes comprehensive error handling and security features

This documentation provides everything needed to implement or integrate the OTP authentication system in other projects.
