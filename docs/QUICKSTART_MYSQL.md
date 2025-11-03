# 🚀 Quick Start - MySQL Setup

## ⚡ 5-Minute Setup

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ethioconnect
JWT_SECRET=your-secret-key-minimum-32-chars
```

### 3️⃣ Setup MySQL Database
```bash
# Create database
mysql -u root -p
CREATE DATABASE ethioconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 4️⃣ Run Migrations & Seeds
```bash
npm run db:migrate
npm run db:seed
```

### 5️⃣ Start Server
```bash
npm run dev
```

### 6️⃣ Test
```bash
curl http://localhost:3001/health
```

---

## ✅ All Features Working

### OTP Registration
```bash
# 1. Request OTP
POST http://localhost:3001/api/v1/auth/otp/request
{"phone": "+251912345678"}

# 2. Verify OTP (creates user + profile automatically)
POST http://localhost:3001/api/v1/auth/otp/verify
{"phone": "+251912345678", "otp": "123456"}

# Response includes JWT with FULL user info:
# - userId, username, email, phone, isVerified, status, authProvider
```

### Login
```bash
POST http://localhost:3001/api/v1/auth/login
{"identifier": "username", "password": "password"}

# Returns JWT with complete user information
```

### Refresh Token
```bash
POST http://localhost:3001/api/v1/auth/refresh
{"refreshToken": "your_refresh_token"}

# Returns new access token + rotated refresh token
```

---

## 📦 What's Included

✅ MySQL database with Sequelize CLI  
✅ 7 database migrations (auto table creation)  
✅ 11 default roles seeded  
✅ JWT with **full user information**  
✅ OTP registration with **auto user creation**  
✅ Refresh token system with **rotation**  
✅ Advanced OTP security (rate limiting, lockout)  

---

## 🔧 Useful Commands

```bash
# Database
npm run db:migrate        # Run migrations
npm run db:seed          # Seed data
npm run db:reset         # Reset everything

# Server
npm run dev              # Development
npm start                # Production

# Troubleshooting
npm run db:migrate:undo  # Undo last migration
npm run db:seed:undo     # Undo seeds
```

---

## 📖 Full Documentation

See **[docs/MYSQL_SETUP.md](./docs/MYSQL_SETUP.md)** for complete guide.

---

**Ready to code!** 🎉
