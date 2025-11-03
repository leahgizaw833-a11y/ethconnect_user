# EthioConnect User Service - Project Structure

Clean, production-ready MVC microservice with MySQL + Sequelize CLI.

## 📂 Directory Structure

```
Ethioconnect_userService/
├── config/
│   └── database.js              # MySQL configuration (dev, test, prod)
│
├── controllers/                 # Business logic (5 files)
│   ├── authController.js        # Authentication logic
│   ├── userController.js        # User management
│   ├── profileController.js     # Profile operations
│   ├── roleController.js        # Role management
│   └── verificationController.js # Document verification
│
├── docs/                        # Documentation (4 files)
│   ├── QUICKSTART_MYSQL.md      # 5-minute quick start
│   ├── MYSQL_SETUP.md           # Complete setup guide
│   ├── ADVANCED_FEATURES.md     # OTP & JWT features
│   └── API_EXAMPLES.md          # API reference
│
├── middleware/                  # Auth & validation (2 files)
│   ├── auth.js                  # JWT authentication
│   └── validation.js            # Request validation
│
├── migrations/                  # Database migrations (7 files)
│   ├── 20251101000001-create-users.js
│   ├── 20251101000002-create-roles.js
│   ├── 20251101000003-create-user-roles.js
│   ├── 20251101000004-create-profiles.js
│   ├── 20251101000005-create-verifications.js
│   ├── 20251101000006-create-otps.js
│   └── 20251101000007-create-refresh-tokens.js
│
├── models/                      # Data models (7 models + index)
│   ├── user.js                  # User model
│   ├── role.js                  # Role model
│   ├── userRole.js              # User-Role junction
│   ├── profile.js               # Profile model
│   ├── verification.js          # Verification model
│   ├── otp.js                   # OTP model
│   ├── refreshToken.js          # Refresh token model
│   └── index.js                 # Models initialization
│
├── routes/                      # API routes (5 files)
│   ├── authRoutes.js            # Auth endpoints
│   ├── userRoutes.js            # User endpoints
│   ├── profileRoutes.js         # Profile endpoints
│   ├── roleRoutes.js            # Role endpoints
│   └── verificationRoutes.js   # Verification endpoints
│
├── seeders/                     # Database seeders (1 file)
│   └── 20251101000001-seed-roles.js
│
├── utils/                       # Utilities (6 files)
│   ├── jwtUtils.js              # Basic JWT (with full user info)
│   ├── advancedJwtUtils.js      # Advanced JWT + refresh tokens
│   ├── otpUtils.js              # Basic OTP
│   ├── advancedOtpUtil.js       # Advanced OTP + security
│   ├── passwordUtils.js         # Password hashing
│   └── phoneUtils.js            # Phone number utilities
│
├── validators/                  # Validation rules (1 file)
│   └── authValidators.js        # Auth validation
│
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── .sequelizerc                 # Sequelize CLI configuration
├── package.json                 # Dependencies & scripts
├── README.md                    # Main README
└── server.js                    # Application entry point
```

## 📊 File Count

| Category | Count | Purpose |
|----------|-------|---------|
| **Models** | 7 | Data models (flat structure) |
| **Controllers** | 5 | Business logic |
| **Routes** | 5 | API endpoints |
| **Middleware** | 2 | Auth & validation |
| **Migrations** | 7 | Database schema |
| **Seeders** | 1 | Initial data |
| **Utils** | 6 | Helper functions |
| **Validators** | 1 | Input validation |
| **Docs** | 4 | Documentation |
| **Config** | 1 | Database config |

**Total: 39 core files** (clean & organized)

## 🗄️ Database Tables

1. **Users** - User accounts
2. **Roles** - Role definitions
3. **UserRoles** - User-role relationships
4. **Profiles** - User profiles
5. **Verifications** - Document verification
6. **OTPs** - OTP codes
7. **RefreshTokens** - JWT refresh tokens

## 🚀 Quick Commands

```bash
# Setup
npm install
npm run db:create
npm run db:migrate
npm run db:seed

# Development
npm run dev

# Database
npm run db:reset        # Reset everything
npm run db:migrate      # Run migrations
npm run db:seed         # Seed data
```

## ✨ Key Features

- ✅ Clean MVC architecture
- ✅ MySQL with Sequelize CLI
- ✅ JWT with full user information
- ✅ OTP registration with auto user creation
- ✅ Refresh token rotation
- ✅ Advanced security features
- ✅ Production ready

---

**Clean, minimal, production-ready!** 🎉
