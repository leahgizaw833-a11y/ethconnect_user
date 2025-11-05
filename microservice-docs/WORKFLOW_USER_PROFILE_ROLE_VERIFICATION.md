# User Profile, Role & Verification Workflow

## 📋 Complete System Workflow

This document explains the complete workflow for user registration, profile management, role assignment, and verification in the EthioConnect User Service.

---

## 🔄 **Workflow Overview**

```
Registration → Profile Creation → Verification Submission → Admin Approval → Role Assignment → Full Access
```

---

## 1️⃣ **User Registration**

### **Step 1: User Registers**

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "+251912345678",
  "password": "SecurePass123",
  "role": "employee"  // Optional: employer, employee, doctor, user
}
```

**What Happens:**
1. ✅ User account created
2. ✅ Password hashed and stored
3. ✅ Profile automatically created (empty)
4. ✅ If role provided, basic role assigned
5. ✅ User status: `active`
6. ✅ Verification status: `false` (not verified)

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+251912345678",
      "isVerified": false,
      "status": "active"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Database State:**
```
users table:
  - id: uuid
  - username: johndoe
  - email: john@example.com
  - phone: +251912345678
  - passwordHash: hashed_password
  - isVerified: false
  - status: active

profiles table:
  - id: uuid
  - userId: uuid (FK)
  - fullName: null
  - verificationStatus: unverified

user_roles table (if role provided):
  - userId: uuid
  - roleId: employee_role_id
```

---

## 2️⃣ **Profile Management**

### **Step 2: User Updates Profile**

**Endpoint:** `PUT /api/profiles`

**Request:**
```json
{
  "fullName": "Dr. John Doe",
  "bio": "Medical practitioner specializing in cardiology",
  "profession": "Cardiologist",
  "languages": ["en", "am"],
  "gender": "male",
  "age": 35,
  "religion": "Christian",
  "ethnicity": "Ethiopian",
  "education": "MD - Medical Doctor",
  "interests": ["medicine", "research", "teaching"]
}
```

**What Happens:**
1. ✅ Profile updated with user information
2. ✅ Profile still shows `verificationStatus: unverified`
3. ✅ User can update profile anytime

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profile": {
      "id": "uuid",
      "userId": "uuid",
      "fullName": "Dr. John Doe",
      "bio": "Medical practitioner specializing in cardiology",
      "profession": "Cardiologist",
      "verificationStatus": "unverified"
    }
  }
}
```

**Database State:**
```
profiles table:
  - id: uuid
  - userId: uuid
  - fullName: Dr. John Doe
  - bio: Medical practitioner...
  - profession: Cardiologist
  - verificationStatus: unverified
  - languages: ["en", "am"]
  - gender: male
  - age: 35
  - education: MD - Medical Doctor
```

---

## 3️⃣ **Verification Submission**

### **Step 3: User Submits Verification Document**

**Endpoint:** `POST /api/verifications`

**Request (multipart/form-data):**
```
document: [doctor_license.pdf]  // File upload
type: doctor_license            // Verification type
notes: Medical license for Dr. John Doe
```

**Verification Types:**
- `kyc` - Identity verification (no role assigned)
- `doctor_license` - Medical license (assigns `doctor` role)
- `teacher_cert` - Teaching certificate (assigns `teacher` role)
- `business_license` - Business license (assigns `employer` role)
- `employer_cert` - Employer certificate (assigns `employer` role)
- `other` - Other documents (no role assigned)

**What Happens:**
1. ✅ File uploaded to `/uploads/verifications/`
2. ✅ Verification record created with status `pending`
3. ✅ Document URL stored in database
4. ✅ Admin notified (pending verification)

**Response:**
```json
{
  "success": true,
  "message": "Verification request submitted successfully",
  "data": {
    "verification": {
      "id": "uuid",
      "userId": "uuid",
      "type": "doctor_license",
      "documentUrl": "/uploads/verifications/1234567890-doctor_license.pdf",
      "notes": "Medical license for Dr. John Doe",
      "status": "pending",
      "createdAt": "2025-11-04T10:00:00.000Z"
    }
  }
}
```

**Database State:**
```
verifications table:
  - id: uuid
  - userId: uuid
  - type: doctor_license
  - documentUrl: /uploads/verifications/...
  - notes: Medical license for Dr. John Doe
  - status: pending
  - verifiedBy: null
  - verifiedAt: null
```

---

## 4️⃣ **Admin Review Process**

### **Step 4: Admin Views Pending Verifications**

**Endpoint:** `GET /api/verifications/pending`

**Response:**
```json
{
  "success": true,
  "data": {
    "verifications": [
      {
        "id": "uuid",
        "userId": "uuid",
        "type": "doctor_license",
        "documentUrl": "/uploads/verifications/1234567890-doctor_license.pdf",
        "notes": "Medical license for Dr. John Doe",
        "status": "pending",
        "user": {
          "username": "johndoe",
          "email": "john@example.com",
          "profile": {
            "fullName": "Dr. John Doe",
            "profession": "Cardiologist"
          }
        },
        "createdAt": "2025-11-04T10:00:00.000Z"
      }
    ]
  }
}
```

**What Admin Sees:**
- ✅ User information
- ✅ Verification type
- ✅ Uploaded document
- ✅ User's profile details
- ✅ Submission date

---

### **Step 5: Admin Approves/Rejects Verification**

**Endpoint:** `PUT /api/verifications/:verificationId`

**Request (Approve):**
```json
{
  "status": "approved",
  "notes": "Medical license verified successfully. Valid until 2028."
}
```

**Request (Reject):**
```json
{
  "status": "rejected",
  "notes": "Document is not clear. Please resubmit with better quality."
}
```

---

## 5️⃣ **Automatic Role Assignment (On Approval)**

### **What Happens When Admin Approves:**

**If verification type is `doctor_license`:**

1. ✅ Verification status updated to `approved`
2. ✅ Profile `verificationStatus` updated to `professional`
3. ✅ System checks if `doctor` role exists
   - If not, creates `doctor` role
4. ✅ System checks if user already has `doctor` role
   - If not, assigns `doctor` role to user
5. ✅ User now has professional verification + doctor role

**Response:**
```json
{
  "success": true,
  "message": "Verification approved successfully",
  "data": {
    "verification": {
      "id": "uuid",
      "userId": "uuid",
      "type": "doctor_license",
      "status": "approved",
      "verifiedBy": "admin_user_id",
      "verifiedAt": "2025-11-04T11:00:00.000Z",
      "notes": "Medical license verified successfully. Valid until 2028."
    }
  }
}
```

**Database State After Approval:**
```
verifications table:
  - id: uuid
  - userId: uuid
  - type: doctor_license
  - status: approved ✅
  - verifiedBy: admin_user_id ✅
  - verifiedAt: 2025-11-04T11:00:00.000Z ✅

profiles table:
  - userId: uuid
  - fullName: Dr. John Doe
  - profession: Cardiologist
  - verificationStatus: professional ✅

roles table (auto-created if needed):
  - id: uuid
  - name: doctor ✅

user_roles table (auto-assigned):
  - userId: uuid
  - roleId: doctor_role_id ✅
```

---

## 6️⃣ **User Gets Full Access**

### **Step 6: User Logs In with New Role**

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+251912345678",
      "isVerified": true,
      "status": "active",
      "roles": ["employee", "doctor"]  // ✅ Now has doctor role
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**User Can Now:**
- ✅ Access doctor-specific features
- ✅ Post medical services
- ✅ Respond to medical consultations
- ✅ Have verified badge on profile
- ✅ Access professional features

---

## 📊 **Role Assignment Matrix**

| Verification Type | Assigned Role | Profile Status | Use Case |
|------------------|---------------|----------------|----------|
| `kyc` | None | `kyc` | Identity verification only |
| `doctor_license` | `doctor` | `professional` | Medical practitioners |
| `teacher_cert` | `teacher` | `professional` | Teachers, educators |
| `business_license` | `employer` | `professional` | Business owners |
| `employer_cert` | `employer` | `professional` | Company employers |
| `other` | None | `kyc` | General documents |

---

## 🔐 **Multi-Role Support**

Users can have multiple roles by submitting multiple verifications:

### **Example: User with Multiple Roles**

**Scenario:** User is both a doctor and an employer

**Step 1:** Submit doctor license
```
POST /api/verifications
type: doctor_license
→ Gets "doctor" role
```

**Step 2:** Submit business license
```
POST /api/verifications
type: business_license
→ Gets "employer" role
```

**Result:**
```json
{
  "user": {
    "username": "johndoe",
    "roles": ["employee", "doctor", "employer"]
  }
}
```

**User Can Now:**
- ✅ Provide medical services (doctor role)
- ✅ Post job openings (employer role)
- ✅ Apply for jobs (employee role)

---

## 🔄 **Complete Workflow Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION                             │
│  POST /api/auth/register                                        │
│  → User created                                                 │
│  → Profile created (empty)                                      │
│  → Basic role assigned (optional)                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PROFILE UPDATE                                 │
│  PUT /api/profiles                                              │
│  → User fills profile information                               │
│  → verificationStatus: unverified                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              VERIFICATION SUBMISSION                             │
│  POST /api/verifications                                        │
│  → User uploads document                                        │
│  → Type: doctor_license, teacher_cert, etc.                    │
│  → Status: pending                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ADMIN REVIEW                                   │
│  GET /api/verifications/pending                                 │
│  → Admin views pending verifications                            │
│  → Admin reviews documents                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              ADMIN APPROVAL/REJECTION                            │
│  PUT /api/verifications/:id                                     │
│  → status: approved OR rejected                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ (if approved)
┌─────────────────────────────────────────────────────────────────┐
│            AUTOMATIC ROLE ASSIGNMENT                             │
│  System automatically:                                          │
│  1. Updates profile.verificationStatus → professional           │
│  2. Creates role if doesn't exist                               │
│  3. Assigns role to user                                        │
│  4. User gets role-based permissions                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  USER HAS FULL ACCESS                            │
│  POST /api/auth/login                                           │
│  → User logs in                                                 │
│  → Response includes roles: ["employee", "doctor"]              │
│  → User can access role-specific features                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **Key Points**

### **For Users:**
1. ✅ Register and create profile first
2. ✅ Submit verification documents for professional roles
3. ✅ Wait for admin approval
4. ✅ Roles automatically assigned on approval
5. ✅ Can have multiple roles via multiple verifications

### **For Admins:**
1. ✅ Review pending verifications
2. ✅ Approve or reject with notes
3. ✅ System automatically assigns roles
4. ✅ No manual role assignment needed

### **System Behavior:**
1. ✅ Roles assigned ONLY through verification approval
2. ✅ Admins cannot manually assign/revoke roles
3. ✅ Each verification type maps to specific role
4. ✅ Users can have multiple roles
5. ✅ Verification status tracked in profile

---

## 🔍 **Verification Status Levels**

| Status | Description | Profile Status |
|--------|-------------|----------------|
| `unverified` | No verification submitted | `unverified` |
| `pending` | Verification submitted, awaiting review | `unverified` |
| `kyc` | Identity verified | `kyc` |
| `professional` | Professional document verified | `professional` |
| `full` | Both KYC + Professional verified | `full` |

---

## 📝 **Example: Complete User Journey**

### **Day 1: Registration**
```bash
# User registers
POST /api/auth/register
{
  "username": "dr_sarah",
  "email": "sarah@example.com",
  "password": "SecurePass123"
}
# Result: User created, profile created, no roles yet
```

### **Day 1: Profile Update**
```bash
# User updates profile
PUT /api/profiles
{
  "fullName": "Dr. Sarah Johnson",
  "profession": "Pediatrician",
  "education": "MD - Pediatrics"
}
# Result: Profile updated, verificationStatus: unverified
```

### **Day 2: Submit Verification**
```bash
# User submits doctor license
POST /api/verifications
document: doctor_license.pdf
type: doctor_license
notes: "Medical license - Pediatrics"
# Result: Verification pending, waiting for admin
```

### **Day 3: Admin Approves**
```bash
# Admin approves verification
PUT /api/verifications/abc123
{
  "status": "approved",
  "notes": "License verified"
}
# Result: 
# - Verification approved
# - Profile verificationStatus → professional
# - "doctor" role automatically assigned
```

### **Day 3: User Logs In**
```bash
# User logs in
POST /api/auth/login
{
  "email": "sarah@example.com",
  "password": "SecurePass123"
}
# Response includes:
{
  "user": {
    "username": "dr_sarah",
    "roles": ["doctor"]  ✅
  }
}
# User now has full doctor access!
```

---

## 🚀 **API Endpoints Summary**

### **User Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get roles
- `PUT /api/profiles` - Update profile
- `POST /api/verifications` - Submit verification
- `GET /api/verifications` - Check verification status

### **Admin Endpoints:**
- `GET /api/verifications/pending` - View pending verifications
- `PUT /api/verifications/:id` - Approve/reject verification
- `GET /api/verifications/user/:userId` - View user's verifications

### **Role Endpoints:**
- `GET /api/roles` - Get all roles
- `GET /api/roles/user/:userId` - Get user's roles

---

## ✅ **Workflow Complete!**

This workflow ensures:
- ✅ Secure verification process
- ✅ Automatic role assignment
- ✅ Admin oversight
- ✅ Multi-role support
- ✅ Clear audit trail
