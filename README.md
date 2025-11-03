# EthioConnect User Service

A comprehensive microservice for user management, authentication, profiles, roles, and verification - built for the EthioConnect platform.

## 📚 Documentation

- **[🚀 Quick Start](./docs/QUICKSTART_MYSQL.md)** - Get started in 5 minutes
- **[📁 Project Structure](./docs/PROJECT_STRUCTURE.md)** - Complete file organization
- **[🗄️ MySQL Setup Guide](./docs/MYSQL_SETUP.md)** - Complete MySQL setup with Sequelize CLI
- **[🔥 Advanced Features](./docs/ADVANCED_FEATURES.md)** - OTP & JWT Refresh Tokens
- **[📡 API Examples](./docs/API_EXAMPLES.md)** - Complete API reference

## ✨ Features

### Authentication & Security
- **Multiple Auth Methods**: Email/username + password, Phone + OTP
- **JWT Tokens**: Secure token-based authentication with configurable expiration
- **Password Security**: bcrypt hashing with salt rounds
- **Rate Limiting**: Protection against brute-force attacks
- **OTP System**: Ethiopian phone number validation with attempt limiting

### User Management
- **Comprehensive Profiles**: Personal info, matchmaking fields, professional details
- **Role-Based Access Control**: Flexible RBAC with multiple roles per user
- **User Search**: Efficient search by username, email, or phone
- **Status Management**: Active, inactive, suspended, pending states
- **Admin Dashboard**: User statistics and management tools

### Verification System
- **Document Verification**: KYC, professional licenses, certifications
- **Admin Moderation**: Approve/reject verification requests
- **Verification Levels**: None, KYC, Professional, Full
- **Multi-Type Support**: Doctor licenses, teacher certs, business licenses, etc.

### Profile Features
- **Matchmaking Fields**: Gender, age, religion, ethnicity, interests
- **Professional Info**: Profession, education, languages
- **Rating System**: Average rating and rating count
- **Multi-Language**: JSON-based language preferences

## 🏗️ Architecture

This project follows **standard MVC (Model-View-Controller)** architecture:

- **Models** (`models/`) - Flat structure, no subfolders
  - User, Role, UserRole, Profile, Verification, OTP
  - Pure data models with associations
  
- **Controllers** (`controllers/`) - All business logic
  - Auth, User, Profile, Role, Verification controllers
  - Complete separation from routes
  
- **Routes** (`routes/`) - Thin routing layer
  - No business logic, only validation and delegation
  - Clean API endpoint definitions

## 🛠️ Tech Stack

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Architecture**: MVC Pattern
- **Database**: **MySQL** with Sequelize ORM
- **Migrations**: Sequelize CLI
- **Authentication**: JWT + bcrypt + Refresh Tokens
- **OTP**: Advanced OTP system with SHA-256 hashing
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer (ready for integration)
- **Logging**: Morgan

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database and JWT secret
```

### 3. Setup Database (MySQL)
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE ethioconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Or use Sequelize CLI
npm run db:create

# Run migrations
npm run db:migrate

# Seed roles
npm run db:seed
```

### 4. Start Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 5. Verify
```bash
curl http://localhost:3001/health
```

**For detailed setup instructions, see [SETUP.md](./SETUP.md)**

## API Endpoints

### Health Check

```
GET /api/v1/health
```

### Authentication Endpoints

#### Register User
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "phoneNumber": "251912345678",
  "password": "securePassword123",
  "role": "user"
}
```

#### Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

// OR login with username
{
  "username": "johndoe",
  "password": "securePassword123"
}

// OR login with phone
{
  "phone": "0912345678",
  "password": "securePassword123"
}
```

#### Request OTP
```
POST /api/v1/auth/otp/request
Content-Type: application/json

{
  "phone": "0912345678"
}
```

#### Verify OTP
```
POST /api/v1/auth/otp/verify
Content-Type: application/json

{
  "phone": "0912345678",
  "otp": "123456"
}
```

#### Check Username Availability
```
GET /api/v1/auth/check-username/:username
```

#### Get Current User (Protected)
```
GET /api/v1/auth/me
Authorization: Bearer <token>
```

#### Update Account (Protected)
```
PUT /api/v1/auth/account
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "newusername",
  "email": "newemail@example.com"
}
```

### User Management Endpoints

#### Search Users (Public)
```
GET /api/v1/users/search?q=john&limit=10&offset=0
```

#### Get Recent Users (Public)
```
GET /api/v1/users/recent?limit=10
```

#### Get User Profile (Protected)
```
GET /api/v1/users/:userId
Authorization: Bearer <token>
```

#### Get Users by Role (Protected)
```
GET /api/v1/users/role/:role?limit=50&offset=0
Authorization: Bearer <token>
```

#### Update User Status (Admin Only)
```
PUT /api/v1/users/:userId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active" // active, inactive, suspended, pending
}
```

#### Get User Statistics (Admin Only)
```
GET /api/v1/users/admin/stats
Authorization: Bearer <token>
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## User Roles

Supported roles:
- `user` (default)
- `employer`
- `employee`
- `buyer`
- `seller`
- `connector`
- `reviewer`
- `admin`
- `service_provider`
- `customer`
- `renter`
- `tenant`
- `husband`
- `wife`

## Phone Number Format

For Ethiopian phone numbers, the service accepts:
- `09XXXXXXXX` (10 digits)
- `07XXXXXXXX` (10 digits)
- `9XXXXXXXX` (9 digits)
- `251XXXXXXXXX` (12 digits)
- `+251XXXXXXXXX` (with country code)

All phone numbers are normalized to the format: `251XXXXXXXXX`

## Response Format

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "token": "jwt-token-here"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Detailed error info"]
}
```

## Database Models

### User Model
- `id`: UUID (Primary Key)
- `username`: String (Unique)
- `email`: String (Unique, Optional)
- `password`: String (Hashed)
- `phoneNumber`: String (Optional)
- `role`: Enum
- `status`: Enum (active, inactive, suspended, pending)
- `location`: String (Optional)
- `isEmailVerified`: Boolean
- `otpRegistered`: Boolean
- `lastLogin`: Date
- `createdAt`: Date
- `updatedAt`: Date

### OTP Model
- `id`: UUID (Primary Key)
- `phone`: String
- `hashedSecret`: String
- `expiresAt`: BigInt (Timestamp)
- `attempts`: Integer
- `status`: Enum (pending, verified, expired, locked)
- `referenceType`: Enum (User, Tenant)
- `referenceId`: UUID
- `createdAt`: Date
- `updatedAt`: Date

## Security Considerations

1. **Change JWT Secret**: Update `JWT_SECRET` in production
2. **Database Security**: Use strong database credentials
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Consider adding rate limiting for production
5. **Input Validation**: Add request validation middleware
6. **SMS Gateway**: Configure proper SMS gateway for OTP in production

## Integration with Other Services

This microservice can be integrated with other services in your architecture:

1. **API Gateway**: Place behind an API gateway for routing
2. **Load Balancer**: Use multiple instances with a load balancer
3. **Service Mesh**: Integrate with service mesh for advanced features
4. **Message Queue**: Add event publishing for user actions

### Example Integration

```javascript
// In another service
const axios = require('axios');

const userAuthService = axios.create({
  baseURL: 'http://user-auth-service:3001/api/v1'
});

// Verify user token
async function verifyUser(token) {
  const response = await userAuthService.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.user;
}
```

## Deployment

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY user-auth-microservice.js ./
COPY .env ./

EXPOSE 3001

CMD ["node", "user-auth-microservice.js"]
```

Build and run:
```bash
docker build -t user-auth-microservice .
docker run -p 3001:3001 --env-file .env user-auth-microservice
```

### Docker Compose

```yaml
version: '3.8'

services:
  user-auth:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/bysell
    depends_on:
      - db
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=bysell
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Monitoring

Add health checks to monitor service status:

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "user-auth-microservice",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check network connectivity

### OTP Not Sending
- Verify SMS gateway configuration
- Check GEEZSMS_TOKEN is set
- Review logs for SMS errors

### Authentication Failures
- Verify JWT_SECRET matches across services
- Check token expiration settings
- Ensure user exists in database

## License

ISC

## Support

For issues and questions, please contact the BySell development team.
