# MySQL Setup Guide - EthioConnect User Service

Complete guide for setting up the project with MySQL database.

## 📋 Prerequisites

- Node.js v16+ installed
- MySQL 5.7+ or MySQL 8.0+ installed and running
- npm or yarn package manager

---

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `mysql2` - MySQL driver for Node.js
- `sequelize` - ORM
- `sequelize-cli` - Database migrations tool
- All other project dependencies

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ethioconnect
DB_NAME_TEST=ethioconnect_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRE=24h
REFRESH_TOKEN_TTL_DAYS=7

# Application
APP_NAME=EthioConnect
COMPANY_NAME=EthioConnect
```

### 3. Create MySQL Database

**Option A: Using MySQL Command Line**
```bash
mysql -u root -p
```

```sql
CREATE DATABASE ethioconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE ethioconnect_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

**Option B: Using Sequelize CLI**
```bash
npm run db:create
```

### 4. Run Migrations

Create all database tables:

```bash
npm run db:migrate
```

This creates:
- ✅ Users table
- ✅ Roles table
- ✅ UserRoles table (junction)
- ✅ Profiles table
- ✅ Verifications table
- ✅ OTPs table
- ✅ RefreshTokens table

### 5. Seed Default Data

Insert default roles:

```bash
npm run db:seed
```

Default roles created:
- user
- admin
- employer
- employee
- doctor
- teacher
- landlord
- tenant
- buyer
- seller
- service_provider

### 6. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 7. Test the Setup

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ethioconnect-user-service",
  "timestamp": "2025-11-01T...",
  "database": "connected"
}
```

---

## 📊 Database Schema

### Users Table
```sql
- id (VARCHAR(36), PRIMARY KEY)
- username (VARCHAR(120), UNIQUE)
- email (VARCHAR(255), UNIQUE, NULLABLE)
- phone (VARCHAR(20), UNIQUE, NULLABLE) 
- passwordHash (VARCHAR(255))
- authProvider (ENUM: password, google, apple, phone)
- isVerified (BOOLEAN)
- status (ENUM: active, inactive, suspended, pending)
- lastLogin (DATETIME, NULLABLE)
- createdAt, updatedAt
```

### Profiles Table
```sql
- id (VARCHAR(36), PRIMARY KEY)
- userId (VARCHAR(36), UNIQUE, FOREIGN KEY → Users.id)
- fullName (VARCHAR(160))
- bio (TEXT)
- profession (VARCHAR(120))
- languages (JSON)
- photoUrl (VARCHAR(500))
- gender (ENUM: male, female, other)
- age (INT)
- religion, ethnicity, education
- interests (JSON)
- ratingAvg (DECIMAL(3,2))
- ratingCount (INT)
- verificationStatus (ENUM: none, kyc, professional, full)
- createdAt, updatedAt
```

### OTPs Table
```sql
- id (VARCHAR(36), PRIMARY KEY)
- phone (VARCHAR(20))
- hashedSecret (VARCHAR(255)) -- SHA-256 or bcrypt hashed
- expiresAt (BIGINT) -- Timestamp in milliseconds
- attempts (INT)
- status (ENUM: pending, verified, expired, locked)
- createdAt, updatedAt
```

### RefreshTokens Table
```sql
- id (VARCHAR(36), PRIMARY KEY)
- userId (VARCHAR(36), FOREIGN KEY → Users.id)
- hashedToken (VARCHAR(255)) -- bcrypt hashed
- expiresAt (DATETIME)
- revokedAt (DATETIME, NULLABLE)
- replacedByTokenId (VARCHAR(36), NULLABLE)
- metadata (JSON, NULLABLE)
- createdAt, updatedAt
```

---

## 🔧 Database Commands

### Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Undo all migrations
npm run db:migrate:undo:all

# Reset database (undo all, migrate, seed)
npm run db:reset
```

### Seeders

```bash
# Run all seeders
npm run db:seed

# Undo all seeders
npm run db:seed:undo
```

### Database Management

```bash
# Create database
npm run db:create

# Drop database
npm run db:drop
```

---

## 🔐 Important Features

### 1. OTP Registration with Full User Info in Token

**Request OTP:**
```bash
POST /api/v1/auth/otp/request
{
  "phone": "+251912345678"
}
```

**Verify OTP & Register:**
```bash
POST /api/v1/auth/otp/verify
{
  "phone": "+251912345678",
  "otp": "123456"
}
```

**Response includes JWT with FULL user information:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "user_912345678",
      "phone": "+251912345678",
      "isVerified": true,
      "status": "active",
      "authProvider": "phone"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "..." // if using advanced JWT
}
```

**Token payload contains:**
```json
{
  "userId": "uuid",
  "username": "user_912345678",
  "email": null,
  "phone": "+251912345678",
  "isVerified": true,
  "status": "active",
  "authProvider": "phone",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### 2. Login with Full User Info in Token

```bash
POST /api/v1/auth/login
{
  "identifier": "username_or_email_or_phone",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* full user object */ }
  },
  "token": "jwt_with_full_user_info",
  "refreshToken": "refresh_token_here"
}
```

### 3. Refresh Token Flow

```bash
POST /api/v1/auth/refresh
{
  "refreshToken": "your_refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "new_access_token_with_full_user_info",
  "refreshToken": "new_refresh_token_rotated"
}
```

---

## 🧪 Testing the Setup

### 1. Register with OTP

```bash
# Request OTP
curl -X POST http://localhost:3001/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "+251912345678"}'

# Check console for OTP (in development mode)
# Verify OTP
curl -X POST http://localhost:3001/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+251912345678", "otp": "123456"}'
```

### 2. Register with Email/Password

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456",
    "fullName": "Test User"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "Test123456"
  }'
```

### 4. Access Protected Route

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔍 Troubleshooting

### Database Connection Error

**Error:** `ER_ACCESS_DENIED_ERROR`
- Check MySQL credentials in `.env`
- Verify MySQL is running: `mysql -u root -p`

**Error:** `Unknown database 'ethioconnect'`
- Create database: `npm run db:create`
- Or manually: `CREATE DATABASE ethioconnect;`

### Migration Errors

**Error:** `Table already exists`
- Reset database: `npm run db:reset`
- Or drop tables manually and re-migrate

**Error:** `No migrations found`
- Check `migrations/` folder exists
- Verify `.sequelizerc` configuration

### JWT Token Issues

**Token doesn't contain user info**
- Check `utils/jwtUtils.js` implementation
- Verify token generation uses user object, not just ID
- Decode token at jwt.io to inspect payload

---

## 📝 Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | development | No |
| `PORT` | Server port | 3001 | No |
| `DB_HOST` | MySQL host | localhost | Yes |
| `DB_PORT` | MySQL port | 3306 | No |
| `DB_USER` | MySQL username | root | Yes |
| `DB_PASSWORD` | MySQL password | - | Yes |
| `DB_NAME` | Database name | ethioconnect | Yes |
| `JWT_SECRET` | JWT secret key | - | Yes |
| `JWT_EXPIRE` | Token expiration | 24h | No |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token TTL | 7 | No |

---

## ✅ Verification Checklist

- [ ] MySQL installed and running
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Database created
- [ ] Migrations run successfully
- [ ] Seeders run successfully
- [ ] Server starts without errors
- [ ] Health endpoint returns success
- [ ] OTP registration works
- [ ] Login works
- [ ] JWT token contains full user info
- [ ] Refresh token rotation works

---

**Setup Complete!** 🎉

Your EthioConnect User Service is now running with MySQL, full OTP registration, and JWT tokens containing complete user information.
