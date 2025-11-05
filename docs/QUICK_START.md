# Connection Management - Quick Start

## 🚀 Setup (3 Steps)

### 1. Run Database Migration
```bash
npm run db:migrate
```

### 2. Verify Environment Variable
Check that `.env` contains:
```bash
COMMUNICATION_SERVICE_URL=http://localhost:5000
```

### 3. Restart Server
```bash
npm run dev
```

## ✅ What's Ready

### 6 API Endpoints
- `POST /api/v1/connections/request` - Send request
- `PUT /api/v1/connections/:id/respond` - Accept/reject
- `GET /api/v1/connections` - Get connections
- `GET /api/v1/connections/pending` - Get pending
- `GET /api/v1/connections/sent` - Get sent
- `DELETE /api/v1/connections/:id` - Remove

### Database
- `connections` table with proper indexes
- Foreign keys to `users` table
- Unique constraint prevents duplicates

### Integration
- HTTP REST calls to Communication Service
- Non-blocking notification triggers
- Fault-tolerant (works even if Communication Service is down)

## 📝 Quick Test

```bash
# 1. Send connection request
curl -X POST http://localhost:4000/api/v1/connections/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverId": "USER_UUID"}'

# 2. Get pending requests
curl http://localhost:4000/api/v1/connections/pending \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Accept request
curl -X PUT http://localhost:4000/api/v1/connections/CONNECTION_ID/respond \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "accept"}'
```

## ⚠️ Communication Service TODO

The Communication Service needs to implement:

```javascript
POST /api/notifications/trigger
```

This endpoint receives notification triggers from User Service and sends them to users via Socket.IO.

See `CONNECTION_IMPLEMENTATION.md` for full details.

## 📚 Documentation

- `CONNECTION_REMOVAL_SUMMARY.md` - Architecture overview
- `CONNECTION_IMPLEMENTATION.md` - Full implementation guide
- `QUICK_START.md` - This file

---

**Status:** ✅ Ready to use (after running migration)
