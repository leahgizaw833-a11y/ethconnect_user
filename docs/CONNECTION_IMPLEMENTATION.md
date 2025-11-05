# Connection Management Implementation Guide

## Overview

This document describes the implementation of connection management in the User Service, following the architecture outlined in `CONNECTION_REMOVAL_SUMMARY.md`.

## What Was Implemented ✅

### 1. Database Layer

#### **Connection Model** (`models/connection.js`)
- Sequelize model for storing user connections
- Fields:
  - `id` - UUID primary key
  - `requesterId` - User who sent the request
  - `receiverId` - User who received the request
  - `status` - 'pending', 'accepted', or 'rejected'
  - `respondedAt` - Timestamp when responded
  - `createdAt`, `updatedAt` - Auto-managed timestamps

#### **Database Migration** (`migrations/20251104000001-create-connections.js`)
- Creates `connections` table
- Foreign keys to `users` table with CASCADE delete
- Indexes on `requesterId`, `receiverId`, `status`
- Unique constraint on `[requesterId, receiverId]` pair

### 2. Validation Layer

#### **Connection Validators** (`validators/connectionValidators.js`)
- Joi schemas for input validation:
  - `sendConnectionRequestSchema` - Validates receiverId
  - `respondToConnectionSchema` - Validates action (accept/reject)
  - `removeConnectionSchema` - Validates connection ID

#### **Validation Middleware** (`middleware/validation.js`)
- Added `validateRequest()` function for Joi validation
- Maintains existing `handleValidationErrors()` for express-validator

### 3. Controller Layer

#### **Connection Controller** (`controllers/connectionController.js`)

**Functions:**

1. **`sendConnectionRequest()`**
   - Validates receiver exists
   - Prevents duplicate requests
   - Creates connection in database
   - Triggers HTTP notification to Communication Service
   - Returns connection object

2. **`respondToConnection()`**
   - Validates authorization (only receiver can respond)
   - Updates connection status
   - Triggers notification if accepted
   - Returns updated connection

3. **`getConnections()`**
   - Returns all accepted connections
   - Includes connected user details
   - Sorted by connection date

4. **`getPendingRequests()`**
   - Returns pending requests received by user
   - Includes requester details

5. **`getSentRequests()`**
   - Returns pending requests sent by user
   - Includes receiver details

6. **`removeConnection()`**
   - Validates authorization
   - Deletes connection from database

**HTTP Notification Integration:**

```javascript
async function triggerNotification(type, payload) {
  await axios.post(
    `${COMMUNICATION_SERVICE_URL}/api/notifications/trigger`,
    { type, ...payload },
    { timeout: 5000 }
  );
}
```

- Non-blocking: Notification failures don't block connection operations
- Timeout: 5 seconds
- Logs errors but continues execution

### 4. Route Layer

#### **Connection Routes** (`routes/connectionRoutes.js`)

All routes require authentication (`authenticateToken` middleware).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/connections/request` | Send connection request |
| PUT | `/api/v1/connections/:id/respond` | Accept/reject request |
| GET | `/api/v1/connections` | Get accepted connections |
| GET | `/api/v1/connections/pending` | Get pending requests (received) |
| GET | `/api/v1/connections/sent` | Get sent requests |
| DELETE | `/api/v1/connections/:id` | Remove connection |

### 5. Configuration

#### **Environment Variables**
Added to `.env` and `.env.example`:
```bash
COMMUNICATION_SERVICE_URL=http://localhost:5000
```

### 6. Model Associations

Updated `models/index.js`:
```javascript
// User <-> Connection (Many-to-Many self-referential)
User.hasMany(Connection, { foreignKey: 'requesterId', as: 'sentConnections' });
User.hasMany(Connection, { foreignKey: 'receiverId', as: 'receivedConnections' });
Connection.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
Connection.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });
```

---

## API Usage Examples

### 1. Send Connection Request

```bash
POST /api/v1/connections/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "receiverId": "user-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection request sent successfully",
  "data": {
    "connection": {
      "id": "connection-uuid",
      "requesterId": "current-user-uuid",
      "receiverId": "target-user-uuid",
      "status": "pending",
      "createdAt": "2024-11-04T20:00:00.000Z"
    }
  }
}
```

### 2. Accept Connection Request

```bash
PUT /api/v1/connections/:id/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "accept"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection request accepted successfully",
  "data": {
    "connection": {
      "id": "connection-uuid",
      "status": "accepted",
      "respondedAt": "2024-11-04T20:05:00.000Z"
    }
  }
}
```

### 3. Get My Connections

```bash
GET /api/v1/connections
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "connection-uuid",
        "connectedAt": "2024-11-04T20:05:00.000Z",
        "user": {
          "id": "user-uuid",
          "username": "john_doe",
          "email": "john@example.com",
          "profile": {
            "fullName": "John Doe",
            "photoUrl": "https://..."
          }
        }
      }
    ],
    "count": 1
  }
}
```

### 4. Get Pending Requests

```bash
GET /api/v1/connections/pending
Authorization: Bearer <token>
```

### 5. Remove Connection

```bash
DELETE /api/v1/connections/:id
Authorization: Bearer <token>
```

---

## Communication Service Integration

### How It Works

1. **User Service** creates/updates connection in database
2. **User Service** makes HTTP POST to Communication Service:
   ```
   POST http://localhost:5000/api/notifications/trigger
   ```
3. **Communication Service** receives notification trigger
4. **Communication Service** sends real-time notification to users via Socket.IO
5. **Communication Service** falls back to FCM push if user offline

### Notification Payloads

#### Connection Request Notification
```json
{
  "type": "connection_request",
  "receiverId": "user-uuid",
  "connection": {
    "id": "connection-uuid",
    "status": "pending"
  },
  "requester": {
    "id": "requester-uuid",
    "username": "john_doe",
    "displayName": "John Doe",
    "photoURL": "https://..."
  }
}
```

#### Connection Accepted Notification
```json
{
  "type": "connection_accepted",
  "requesterId": "user-uuid",
  "connection": {
    "id": "connection-uuid",
    "status": "accepted"
  },
  "accepter": {
    "id": "accepter-uuid",
    "username": "jane_smith",
    "displayName": "Jane Smith",
    "photoURL": "https://..."
  }
}
```

---

## Database Setup

### Run Migration

```bash
npm run db:migrate
```

This will create the `connections` table with all necessary indexes and constraints.

### Rollback (if needed)

```bash
npm run db:migrate:undo
```

---

## Testing Checklist

- [ ] Send connection request to valid user
- [ ] Send connection request to non-existent user (should fail)
- [ ] Send connection request to self (should fail)
- [ ] Send duplicate connection request (should fail)
- [ ] Accept connection request
- [ ] Reject connection request
- [ ] Get list of connections
- [ ] Get pending requests
- [ ] Get sent requests
- [ ] Remove connection
- [ ] Verify notifications are sent to Communication Service
- [ ] Test with Communication Service offline (should still work)

---

## Communication Service Requirements

The Communication Service needs to implement:

### REST Endpoint

```javascript
POST /api/notifications/trigger

Body:
{
  "type": "connection_request" | "connection_accepted",
  "receiverId": "user-uuid",      // For connection_request
  "requesterId": "user-uuid",     // For connection_accepted
  "connection": { ... },
  "requester": { ... },           // For connection_request
  "accepter": { ... }             // For connection_accepted
}
```

This endpoint should:
1. Validate the payload
2. Emit Socket.IO event to the target user
3. Fall back to FCM push notification if user offline
4. Store notification in database
5. Return success/failure response

---

## Architecture Benefits

✅ **Clear Separation**: User relationships in User Service, notifications in Communication Service  
✅ **Simpler Integration**: HTTP REST calls instead of Socket.IO client  
✅ **Fault Tolerant**: Notification failures don't block connection operations  
✅ **Scalable**: Services can scale independently  
✅ **Maintainable**: Single source of truth for connection data  

---

## Next Steps

1. **Run the migration** to create the database table
2. **Update Communication Service** to add the `/api/notifications/trigger` endpoint
3. **Test the integration** between services
4. **Update API documentation** (Postman collection)
5. **Add to monitoring** and logging systems

---

## Files Created/Modified

### Created:
- `models/connection.js`
- `migrations/20251104000001-create-connections.js`
- `validators/connectionValidators.js`
- `controllers/connectionController.js`
- `routes/connectionRoutes.js`
- `docs/CONNECTION_IMPLEMENTATION.md`

### Modified:
- `models/index.js` - Added Connection model and associations
- `routes/index.js` - Added connection routes
- `middleware/validation.js` - Added Joi validation support
- `.env` - Added COMMUNICATION_SERVICE_URL
- `.env.example` - Added COMMUNICATION_SERVICE_URL

---

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Verify Communication Service is running
3. Check database connection
4. Review error messages in controller responses

Connection management is now fully implemented in the User Service! 🚀
