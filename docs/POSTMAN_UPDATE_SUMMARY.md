# Postman Collection Update Summary

## Version Update
- **Previous Version:** 1.0.0
- **New Version:** 1.1.0
- **Updated:** November 4, 2025

## What Was Added ✅

### New Folder: "👥 USER - Connections"

Added 7 new endpoints for connection management:

#### 1. **Send Connection Request**
- **Method:** POST
- **Endpoint:** `/api/connections/request`
- **Auth:** Required (Bearer Token)
- **Body:**
  ```json
  {
    "receiverId": "{{receiverId}}"
  }
  ```
- **Auto-saves:** `connectionId` to collection variables on success

#### 2. **Accept Connection Request**
- **Method:** PUT
- **Endpoint:** `/api/connections/{{connectionId}}/respond`
- **Auth:** Required (Bearer Token)
- **Body:**
  ```json
  {
    "action": "accept"
  }
  ```

#### 3. **Reject Connection Request**
- **Method:** PUT
- **Endpoint:** `/api/connections/{{connectionId}}/respond`
- **Auth:** Required (Bearer Token)
- **Body:**
  ```json
  {
    "action": "reject"
  }
  ```

#### 4. **Get My Connections**
- **Method:** GET
- **Endpoint:** `/api/connections`
- **Auth:** Required (Bearer Token)
- **Returns:** All accepted connections

#### 5. **Get Pending Requests (Received)**
- **Method:** GET
- **Endpoint:** `/api/connections/pending`
- **Auth:** Required (Bearer Token)
- **Returns:** Pending requests you received

#### 6. **Get Sent Requests**
- **Method:** GET
- **Endpoint:** `/api/connections/sent`
- **Auth:** Required (Bearer Token)
- **Returns:** Pending requests you sent

#### 7. **Remove Connection**
- **Method:** DELETE
- **Endpoint:** `/api/connections/{{connectionId}}`
- **Auth:** Required (Bearer Token)
- **Action:** Unfriend/remove connection

### New Collection Variables

Added 2 new variables:
- `connectionId` - Auto-populated when sending connection request
- `receiverId` - Manually set to target user's ID

## How to Use

### 1. Import Updated Collection
- Import `EthioConnect_UserService.postman_collection.json` into Postman
- Or update existing collection

### 2. Set Variables
Before testing connections:
1. Login to get `accessToken` (auto-saved)
2. Set `receiverId` to a valid user UUID you want to connect with

### 3. Test Flow

**Typical workflow:**

1. **User A sends request to User B:**
   ```
   POST /api/connections/request
   Body: { "receiverId": "user-b-uuid" }
   ```
   → Saves `connectionId` automatically

2. **User B views pending requests:**
   ```
   GET /api/connections/pending
   ```
   → See request from User A

3. **User B accepts the request:**
   ```
   PUT /api/connections/{connectionId}/respond
   Body: { "action": "accept" }
   ```

4. **Both users view connections:**
   ```
   GET /api/connections
   ```
   → See each other in connections list

5. **Either user can remove connection:**
   ```
   DELETE /api/connections/{connectionId}
   ```

## Collection Structure

```
EthioConnect User Service - Complete (v1.1.0)
├── 🏥 Health & Info
├── 👤 USER - Authentication
├── 👤 USER - OTP Authentication
├── 👤 USER - Profile Management
├── 👤 USER - Roles
├── 👤 USER - Verifications
├── 👥 USER - Connections ⭐ NEW
├── 🔐 ADMIN - Authentication
├── 🔐 ADMIN - User Management
├── 🔐 ADMIN - Role Management
└── 🔐 ADMIN - Verification Management
```

## Testing Tips

### Quick Test Setup

1. **Create two test users:**
   - Use "Register" endpoint twice with different emails
   - Save both tokens

2. **Send connection request:**
   - Login as User A
   - Set `receiverId` to User B's ID
   - Run "Send Connection Request"

3. **Accept request:**
   - Login as User B (update `accessToken`)
   - Run "Get Pending Requests" to see request
   - Copy `connectionId` from response
   - Run "Accept Connection Request"

4. **Verify connection:**
   - Run "Get My Connections" for both users
   - Both should see each other

### Common Variables

Make sure these are set:
- ✅ `baseUrl` - http://localhost:4000 (or your port)
- ✅ `accessToken` - Auto-saved on login
- ✅ `receiverId` - Set manually to target user
- ✅ `connectionId` - Auto-saved on request sent

## Response Examples

### Send Connection Request (Success)
```json
{
  "success": true,
  "message": "Connection request sent successfully",
  "data": {
    "connection": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "requesterId": "current-user-id",
      "receiverId": "target-user-id",
      "status": "pending",
      "createdAt": "2024-11-04T20:00:00.000Z"
    }
  }
}
```

### Get My Connections (Success)
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "connection-id",
        "connectedAt": "2024-11-04T20:05:00.000Z",
        "user": {
          "id": "user-id",
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

## Notes

- All endpoints require authentication
- Connection requests are one-directional until accepted
- Duplicate requests are prevented
- Both users can remove a connection
- Notifications are sent via Communication Service (if configured)

## Related Documentation

- `CONNECTION_IMPLEMENTATION.md` - Full implementation details
- `CONNECTION_REMOVAL_SUMMARY.md` - Architecture overview
- `QUICK_START.md` - Quick setup guide

---

**Collection File:** `EthioConnect_UserService.postman_collection.json`  
**Version:** 1.1.0  
**Updated:** November 4, 2025
