# KYC Service

A dedicated backend service for handling Know Your Customer (KYC) verification processes using Sumsub integration.

## Overview

This service provides a complete KYC verification solution that integrates with Sumsub to verify user identities. It manages the entire verification lifecycle from initiation through completion, including document verification, liveness checks, and AML screening.

## User Flow

### High-Level KYC Verification Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Journey                                 │
└─────────────────────────────────────────────────────────────────────┘

1. User Initiates KYC
   │
   ├─> Your Frontend calls: POST /api/v1/verifications/initiate
   │   Body: { userId, email, firstName, lastName, dob, country }
   │
   └─> KYC Service Response:
       {
         verificationId: "ver_abc123",
         accessToken: "sdk_token_xyz",
         expiresAt: "2025-10-19T12:00:00Z"
       }

2. User Completes Verification
   │
   ├─> Your Frontend launches Sumsub WebSDK with accessToken
   │
   ├─> User uploads documents:
   │   • Government-issued ID (Passport, Driver's License, National ID)
   │   • Selfie with liveness detection
   │   • Proof of address (if required)
   │
   └─> User submits for review

3. Sumsub Reviews Documents
   │
   ├─> Automated verification (AI + rules engine)
   │
   ├─> Manual review (if needed)
   │
   └─> Decision made: GREEN ✅ | RED ❌

4. KYC Service Receives Webhook
   │
   ├─> Sumsub sends webhook: POST /api/v1/webhooks/sumsub
   │
   ├─> KYC Service processes result:
   │   • GREEN → User verified ✅
   │   • RED (RETRY) → User can resubmit documents 🔄
   │   • RED (FINAL) → User rejected ❌ (1-2% of cases)
   │
   └─> Database updated with verification status

5. Your Frontend Polls or Receives Event
   │
   ├─> Poll: GET /api/v1/verifications/{verificationId}
   │
   └─> Response:
       {
         status: "approved" | "rejected" | "resubmit_required",
         reviewResult: { ... }
       }

6. Your Application Takes Action
   │
   ├─> Approved: Enable full platform access
   ├─> Rejected: Block user / request support
   └─> Resubmit Required: Notify user to fix issues
```

### Detailed Sequence Diagram

```
┌──────────┐         ┌──────────┐         ┌─────────────┐         ┌────────────┐
│   User   │         │ Frontend │         │ KYC Service │         │   Sumsub   │
└────┬─────┘         └────┬─────┘         └──────┬──────┘         └─────┬──────┘
     │                    │                       │                      │
     │ 1. Click "Verify" │                       │                      │
     ├──────────────────>│                       │                      │
     │                    │                       │                      │
     │                    │ 2. POST /verifications/initiate              │
     │                    ├──────────────────────>│                      │
     │                    │                       │                      │
     │                    │                       │ 3. Create applicant  │
     │                    │                       ├────────────────────> │
     │                    │                       │                      │
     │                    │                       │ 4. Applicant created │
     │                    │                       │<──────────────────── │
     │                    │                       │                      │
     │                    │                       │ 5. Generate token    │
     │                    │                       ├────────────────────> │
     │                    │                       │                      │
     │                    │ 6. Return token       │ 6. Return token      │
     │                    │<──────────────────────│<──────────────────── │
     │                    │                       │                      │
     │ 7. Launch WebSDK   │                       │                      │
     │<───────────────────│                       │                      │
     │                    │                       │                      │
     │ 8. Upload documents                        │                      │
     ├───────────────────────────────────────────────────────────────────>│
     │                                            │                      │
     │ 9. Selfie + Liveness                       │                      │
     ├───────────────────────────────────────────────────────────────────>│
     │                                            │                      │
     │ 10. Submit                                 │                      │
     ├───────────────────────────────────────────────────────────────────>│
     │                                            │                      │
     │                                            │  11. Review process  │
     │                                            │       (AI/Manual)    │
     │                                            │                      │
     │                                            │ 12. Webhook: Result  │
     │                                            │<──────────────────── │
     │                                            │                      │
     │                    │ 13. Poll status       │                      │
     │                    ├──────────────────────>│                      │
     │                    │                       │                      │
     │                    │ 14. Status: approved  │                      │
     │ 15. Verified! ✅   │<──────────────────────│                      │
     │<───────────────────│                       │                      │
     │                    │                       │                      │
```

## Verification Status Flow

```
┌─────────────┐
│  INITIATED  │ ← User starts KYC
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   PENDING   │ ← User uploading documents
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  IN_REVIEW  │ ← Sumsub reviewing
└──────┬──────┘
       │
       ├────────────┬────────────┐
       │            │            │
       ▼            ▼            ▼
┌───────────┐  ┌──────────┐  ┌──────────────────────┐
│ APPROVED  │  │ REJECTED │  │ RESUBMIT_REQUIRED    │
│  (GREEN)  │  │  (FINAL) │  │     (RETRY)          │
└───────────┘  └──────────┘  └──────────┬───────────┘
                                        │
                                        │ User fixes issues
                                        │
                                        ▼
                                  ┌─────────────┐
                                  │   PENDING   │
                                  └─────────────┘
```

## Technology Stack

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **KYC Provider**: Sumsub
- **Validation**: class-validator, class-transformer
- **HTTP Client**: Axios

## Project Structure

```
kyc-service/
├── src/
│   ├── config/               # Configuration files
│   │   ├── app.config.ts     # Application config
│   │   └── database.config.ts # MongoDB config
│   │
│   ├── common/               # Shared utilities
│   │   └── utils/
│   │       └── logger.ts     # Logging utility
│   │
│   ├── modules/              # Feature modules (to be implemented)
│   │   ├── verification/     # Verification management
│   │   ├── webhook/          # Webhook handlers
│   │   └── sumsub/           # Sumsub integration
│   │
│   ├── app.module.ts         # Root module
│   └── main.ts               # Application entry point
│
├── .env                      # Environment variables
├── .env.example              # Environment template
└── package.json              # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 7+
- Sumsub account (sandbox for testing)

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure environment variables:
```env
# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/kyc_db

# Sumsub credentials (get from Sumsub dashboard)
SUMSUB_APP_TOKEN=your_app_token
SUMSUB_SECRET_KEY=your_secret_key
SUMSUB_BASE_URL=https://api.sumsub.com
SUMSUB_WEBHOOK_SECRET=your_webhook_secret
```

### Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

The service will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Documentation

### Verification Endpoints

#### Initiate KYC Verification
```http
POST /api/v1/verifications/initiate
Content-Type: application/json

{
  "userId": "user_12345",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "country": "USA"
}

Response:
{
  "verificationId": "ver_abc123",
  "applicantId": "sumsub_applicant_id",
  "accessToken": "sdk_access_token",
  "expiresAt": "2025-10-19T12:00:00Z"
}
```

#### Get Verification Status
```http
GET /api/v1/verifications/{verificationId}

Response:
{
  "verificationId": "ver_abc123",
  "status": "approved",
  "createdAt": "2025-10-19T10:00:00Z",
  "reviewResult": {
    "decision": "GREEN"
  }
}
```

#### Get User Verification History
```http
GET /api/v1/verifications/user/{userId}

Response:
{
  "verifications": [
    {
      "verificationId": "ver_abc123",
      "status": "approved",
      "createdAt": "2025-10-19T10:00:00Z"
    }
  ]
}
```

## Sumsub Integration

This service integrates with Sumsub for identity verification. You'll need:

1. **Sumsub Account**: Sign up at [Sumsub](https://sumsub.com)
2. **API Credentials**: Get from Sumsub dashboard
3. **Verification Levels**: Configure in Sumsub dashboard (e.g., basic-kyc-level)
4. **Webhook URL**: Configure to point to your service

### Webhook Configuration

In Sumsub dashboard, configure webhook URL:
```
https://your-domain.com/api/v1/webhooks/sumsub
```

## Development Roadmap

- [x] Phase 1: Foundation & Infrastructure
  - [x] Project setup with NestJS
  - [x] MongoDB configuration
  - [x] Environment configuration
  - [x] Global validation pipes

- [x] Phase 2: Domain Models & Schemas
  - [x] Create enums (VerificationStatus, DocumentType, ReviewAnswer, RejectType)
  - [x] Applicant schema with indexes
  - [x] Verification schema with embedded documents
  - [x] Webhook event schema for audit

- [ ] Phase 3: Sumsub Integration
  - [ ] Authentication & signature generation
  - [ ] Create applicant API
  - [ ] Generate access token API
  - [ ] Get applicant status API

- [ ] Phase 4: Core Verification Service
  - [ ] Repositories (Applicant, Verification)
  - [ ] Verification service logic
  - [ ] State management

- [ ] Phase 5: API Endpoints
  - [ ] Verification controller
  - [ ] Request validation
  - [ ] Error handling

- [ ] Phase 6: Webhook Handler
  - [ ] Webhook controller
  - [ ] Signature verification
  - [ ] Status update logic

- [ ] Phase 7: Testing & Documentation
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] API documentation (Swagger)

## License

UNLICENSED
