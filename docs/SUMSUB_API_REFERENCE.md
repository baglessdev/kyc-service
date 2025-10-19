# Sumsub API Reference

This document maps our implementation to official Sumsub API documentation.

## Official Documentation

- **Main API Docs**: https://docs.sumsub.com/reference/about-sumsub-api
- **Developer Hub**: https://developers.sumsub.com/

## Implemented Endpoints

### 1. Create Applicant

**Official Docs**: https://docs.sumsub.com/reference/create-applicant

**Implementation**: `SumsubService.createApplicant()` (src/modules/sumsub/sumsub.service.ts:17)

```
POST https://api.sumsub.com/resources/applicants?levelName={levelName}

Request Body:
{
  "externalUserId": "string",
  "email": "string" (optional),
  "phone": "string" (optional),
  "fixedInfo": {
    "firstName": "string",
    "lastName": "string",
    "dob": "YYYY-MM-DD",
    "country": "string",
    "nationality": "string"
  }
}

Response:
{
  "id": "string",              // Sumsub applicant ID
  "createdAt": "string",
  "externalUserId": "string",
  "inspectionId": "string",
  "info": { ... },
  "review": { ... }
}
```

**Key Notes**:
- `levelName` is a query parameter (e.g., "basic-kyc-level")
- `fixedInfo` contains data submitted by applicant (not auto-filled from docs)
- `info` contains data recognized from documents (used for cross-validation)
- Maximum 500 applicants per 24h in Sandbox mode

---

### 2. Generate Access Token

**Official Docs**: https://docs.sumsub.com/reference/generate-access-token

**Implementation**: `SumsubService.generateAccessToken()` (src/modules/sumsub/sumsub.service.ts:49)

```
POST https://api.sumsub.com/resources/accessTokens/sdk?userId={userId}&levelName={levelName}&ttlInSecs={ttl}

No Request Body

Response:
{
  "token": "string",    // Format: act-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  "userId": "string"
}
```

**Key Notes**:
- Token is valid for ONE applicant only
- Default TTL: 3600 seconds (1 hour)
- Token format: `act-{uuid}`
- Must be generated server-side
- Used to initialize WebSDK/MobileSDK

---

### 3. Get Applicant Status

**Official Docs**: https://docs.sumsub.com/reference/get-applicant-status

**Implementation**: `SumsubService.getApplicantStatus()` (src/modules/sumsub/sumsub.service.ts:77)

```
GET https://api.sumsub.com/resources/applicants/{applicantId}/status

Response:
{
  "id": "string",
  "externalUserId": "string",
  "review": {
    "reviewId": "string",
    "reviewStatus": "string",
    "reviewResult": {
      "reviewAnswer": "GREEN" | "RED",
      "rejectLabels": ["string"],
      "reviewRejectType": "FINAL" | "RETRY",
      "moderationComment": "string"
    }
  }
}
```

**Review Answers**:
- `GREEN`: Applicant verified successfully
- `RED`: Applicant rejected
  - `RETRY`: User can resubmit documents
  - `FINAL`: Permanent rejection (contact support)

---

### 4. Get Applicant Details

**Official Docs**: https://docs.sumsub.com/reference/get-applicant-data

**Implementation**: `SumsubService.getApplicant()` (src/modules/sumsub/sumsub.service.ts:99)

```
GET https://api.sumsub.com/resources/applicants/{applicantId}/one

Response: Full applicant object with all details
```

---

### 5. Reset Applicant

**Official Docs**: https://docs.sumsub.com/reference/reset-applicant

**Implementation**: `SumsubService.resetApplicant()` (src/modules/sumsub/sumsub.service.ts:117)

```
POST https://api.sumsub.com/resources/applicants/{applicantId}/reset
```

**Use Case**: Allows user to resubmit documents when `reviewRejectType = "RETRY"`

---

## Authentication

**Official Docs**: https://docs.sumsub.com/reference/authentication

**Implementation**: `SumsubAuthService` (src/modules/sumsub/sumsub-auth.service.ts:1)

### Request Signing

Every request must include these headers:

```
X-App-Token: {app_token}
X-App-Access-Ts: {unix_timestamp}
X-App-Access-Sig: {hmac_signature}
Content-Type: application/json
```

### Signature Generation

```typescript
// Pseudo-code
const data = timestamp + HTTP_METHOD + PATH + BODY;
const signature = HMAC_SHA256(SECRET_KEY, data);
```

**Example**:
```
Timestamp: 1634567890
Method: POST
Path: /resources/applicants?levelName=basic-kyc-level
Body: {"externalUserId":"user123"}

Data to sign: "1634567890POST/resources/applicants?levelName=basic-kyc-level{\"externalUserId\":\"user123\"}"
Signature: HMAC-SHA256(secretKey, data)
```

---

## Webhook Signature Verification

**Official Docs**: https://docs.sumsub.com/reference/webhooks

**Implementation**: `SumsubAuthService.verifyWebhookSignature()` (src/modules/sumsub/sumsub-auth.service.ts:59)

Webhooks include header:
```
X-Payload-Digest: {hmac_signature}
```

Verification:
```typescript
const expectedSignature = HMAC_SHA256(WEBHOOK_SECRET, payload);
return timingSafeEqual(receivedSignature, expectedSignature);
```

---

## Base URL

**Production/Sandbox**: `https://api.sumsub.com`

---

## Error Handling

Our implementation handles these Sumsub error codes:

| Status Code | Meaning | Action |
|-------------|---------|--------|
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Check credentials |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Applicant/resource doesn't exist |
| 429 | Rate Limit | Retry with backoff |
| 5xx | Server Error | Retry with backoff |

**Retry Strategy**:
- Max 3 retries
- Exponential backoff: 1s, 2s, 4s
- Only retry on 5xx and 429 errors

---

## Important Limits & Notes

1. **Sandbox Limits**: 500 applicants per 24 hours
2. **Token Scope**: One token per applicant (cannot reuse)
3. **API Versioning**: Incompatible changes are versioned (existing endpoints won't break)
4. **Header Case**: Header names are case-insensitive
5. **Deprecation Notice**: Old agreement format deprecated June 10, 2025

---

## Testing

**Sandbox Environment**: Same base URL with sandbox credentials
- Get credentials from Sumsub dashboard
- Configure in `.env` file

---

## References

- [Sumsub API Documentation](https://docs.sumsub.com/reference/about-sumsub-api)
- [Developer Hub](https://developers.sumsub.com/)
- [WebSDK Integration](https://docs.sumsub.com/docs/get-started-with-web-sdk)
- [Webhook Reference](https://docs.sumsub.com/reference/webhooks)
