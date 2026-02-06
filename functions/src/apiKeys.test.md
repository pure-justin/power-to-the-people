# API Key Management - Testing & Usage Guide

## Overview

Complete API key management system with usage tracking and rate limiting for the Power to the People developer platform.

## Features

✅ **Secure Key Generation** - Cryptographically secure API keys with environment prefixes
✅ **Usage Tracking** - Per-minute, hour, day, and month tracking
✅ **Rate Limiting** - Configurable limits to prevent abuse
✅ **Scope-Based Permissions** - Granular access control
✅ **IP Whitelisting** - Optional IP restrictions
✅ **Key Rotation** - Generate new keys without losing configuration
✅ **Automatic Cleanup** - Expires old keys and cleans up logs

---

## Cloud Functions

### 1. `createApiKey` - Create a new API key

**Authentication:** Required (Firebase Auth)

**Input:**
```typescript
{
  name: string;                        // Human-readable name
  description?: string;                // Optional description
  scopes: ApiKeyScope[];              // Required permissions
  environment?: "development" | "production";  // Default: development
  expiresInDays?: number;             // Auto-expire after N days
  rateLimit?: Partial<RateLimit>;     // Override defaults
  allowedIps?: string[];              // IP whitelist
  allowedDomains?: string[];          // CORS whitelist
}
```

**Output:**
```typescript
{
  success: true;
  apiKeyId: string;                   // Document ID
  apiKey: string;                     // Plain-text key (ONLY TIME IT'S SHOWN!)
  keyPrefix: string;                  // "pk_test_abc123..." for display
  message: "Save this API key securely. It will not be shown again."
}
```

**Example:**
```javascript
const result = await createApiKey({
  name: "Production API Key",
  description: "Main API key for production website",
  scopes: [ApiKeyScope.READ_LEADS, ApiKeyScope.WRITE_LEADS],
  environment: "production",
  expiresInDays: 365,
  rateLimit: {
    requestsPerMinute: 100,
    requestsPerHour: 5000,
  },
  allowedDomains: ["https://powertothepeoplevpp.com"]
});

// IMPORTANT: Save result.apiKey immediately!
console.log("API Key:", result.apiKey);
// pk_live_abc123def456...
```

---

### 2. `validateApiKey` - Validate and authorize API key

**Authentication:** Not required (validates the API key itself)

**Input:**
```typescript
{
  apiKey: string;                     // The API key to validate
  requiredScope?: ApiKeyScope;        // Optional scope requirement
  endpoint?: string;                  // For logging purposes
}
```

**Output:**
```typescript
{
  valid: true;
  apiKeyId: string;
  userId: string;                     // Owner's user ID
  scopes: ApiKeyScope[];
  environment: "development" | "production";
  usageStats: UsageStats;
}
```

**Example:**
```javascript
try {
  const validation = await validateApiKey({
    apiKey: "pk_live_abc123...",
    requiredScope: ApiKeyScope.READ_LEADS,
    endpoint: "/api/leads"
  });

  console.log("Authorized:", validation.userId);
  console.log("Scopes:", validation.scopes);
} catch (error) {
  console.error("Invalid API key:", error.message);
}
```

---

### 3. `revokeApiKey` - Revoke an API key

**Authentication:** Required (must own the key)

**Input:**
```typescript
{
  apiKeyId: string;
  reason?: string;
}
```

**Output:**
```typescript
{
  success: true;
  apiKeyId: string;
  message: "API key revoked successfully"
}
```

**Example:**
```javascript
await revokeApiKey({
  apiKeyId: "key_abc123",
  reason: "Compromised key - rotating"
});
```

---

### 4. `rotateApiKey` - Generate a new key (keep same ID)

**Authentication:** Required (must own the key)

**Input:**
```typescript
{
  apiKeyId: string;
}
```

**Output:**
```typescript
{
  success: true;
  apiKeyId: string;
  apiKey: string;                     // NEW plain-text key
  keyPrefix: string;
  message: "Save this new API key securely. The old key is now invalid."
}
```

**Example:**
```javascript
const rotated = await rotateApiKey({
  apiKeyId: "key_abc123"
});

// IMPORTANT: Update your app with rotated.apiKey immediately!
console.log("New Key:", rotated.apiKey);
```

---

### 5. `updateApiKey` - Update key settings

**Authentication:** Required (must own the key)

**Input:**
```typescript
{
  apiKeyId: string;
  updates: {
    name?: string;
    description?: string;
    scopes?: ApiKeyScope[];
    status?: ApiKeyStatus;
    rateLimit?: RateLimit;
    allowedIps?: string[];
    allowedDomains?: string[];
    notes?: string;
    webhookUrl?: string;
    alertThreshold?: number;
  }
}
```

**Example:**
```javascript
await updateApiKey({
  apiKeyId: "key_abc123",
  updates: {
    name: "Updated Production Key",
    scopes: [ApiKeyScope.READ_LEADS, ApiKeyScope.READ_SOLAR],
    rateLimit: {
      requestsPerMinute: 200,
      requestsPerHour: 10000,
      requestsPerDay: 100000,
      requestsPerMonth: 1000000,
    },
    webhookUrl: "https://example.com/webhook/api-usage",
    alertThreshold: 80  // Alert at 80% of rate limit
  }
});
```

---

### 6. `getApiKeyUsage` - Get usage statistics and logs

**Authentication:** Required (must own the key)

**Input:**
```typescript
{
  apiKeyId: string;
  days?: number;                      // Get logs for last N days (default: 7)
}
```

**Output:**
```typescript
{
  success: true;
  apiKeyId: string;
  usageStats: {
    totalRequests: number;
    requestsThisMinute: number;
    requestsThisHour: number;
    requestsThisDay: number;
    requestsThisMonth: number;
    lastRequestAt: Timestamp;
    lastResetAt: Timestamp;
  };
  logs: ApiKeyUsageLog[];             // Detailed request logs
  logCount: number;
}
```

**Example:**
```javascript
const usage = await getApiKeyUsage({
  apiKeyId: "key_abc123",
  days: 30  // Last 30 days
});

console.log("Total Requests:", usage.usageStats.totalRequests);
console.log("Today:", usage.usageStats.requestsThisDay);
console.log("Recent Logs:", usage.logs.slice(0, 10));
```

---

### 7. `cleanupApiKeys` - Scheduled cleanup (runs daily)

**Type:** Scheduled function (runs at midnight CST)

**Actions:**
- Marks expired keys as `EXPIRED`
- Deletes usage logs older than 90 days

**No manual invocation needed** - runs automatically via Cloud Scheduler.

---

## API Key Scopes

```typescript
enum ApiKeyScope {
  READ_LEADS = "read_leads",          // Read lead data
  WRITE_LEADS = "write_leads",        // Create/update leads
  READ_SOLAR = "read_solar",          // Access solar API data
  WRITE_SOLAR = "write_solar",        // Trigger solar analysis
  READ_SMT = "read_smt",              // Access SMT data
  WRITE_SMT = "write_smt",            // Trigger SMT fetch
  ADMIN = "admin",                    // Full access (bypasses scope checks)
}
```

---

## Rate Limits

### Default Limits

**Development Keys:**
- 10 requests/minute
- 100 requests/hour
- 1,000 requests/day
- 10,000 requests/month

**Production Keys:**
- 60 requests/minute
- 1,000 requests/hour
- 10,000 requests/day
- 100,000 requests/month

### Custom Limits

Override defaults when creating a key:

```javascript
await createApiKey({
  name: "High-Volume API",
  environment: "production",
  rateLimit: {
    requestsPerMinute: 500,
    requestsPerHour: 20000,
    requestsPerDay: 200000,
    requestsPerMonth: 5000000,
  }
});
```

---

## Using API Keys in HTTP Functions

### Method 1: Manual Validation (onCall functions)

```typescript
import { validateApiKey, ApiKeyScope } from "./apiKeys";

export const myProtectedFunction = functions.https.onCall(async (data, context) => {
  // Validate the API key
  const validation = await validateApiKey({
    apiKey: data.apiKey,
    requiredScope: ApiKeyScope.READ_LEADS,
    endpoint: "myProtectedFunction"
  });

  // Now you can use validation.userId, validation.scopes, etc.
  const userId = validation.userId;

  // Your function logic here...
});
```

### Method 2: HTTP Middleware (onRequest functions)

```typescript
import { validateApiKeyFromRequest, ApiKeyScope } from "./apiKeys";

export const myHttpEndpoint = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    // Validate API key from Authorization header
    const apiKeyData = await validateApiKeyFromRequest(
      req,
      ApiKeyScope.READ_LEADS
    );

    // Authorized! Process the request
    res.json({
      success: true,
      data: {
        userId: apiKeyData.userId,
        // Your response data...
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});
```

### Client-Side Usage

```javascript
// Send API key in Authorization header
const response = await fetch("https://us-central1-PROJECT_ID.cloudfunctions.net/myHttpEndpoint", {
  method: "GET",
  headers: {
    "Authorization": "Bearer pk_live_abc123def456...",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
```

---

## Security Best Practices

### 1. **Store Keys Securely**
- Never commit API keys to Git
- Use environment variables (.env files)
- Rotate keys regularly (every 90-180 days)

### 2. **Use IP Whitelisting**
```javascript
await createApiKey({
  name: "Server-Only Key",
  allowedIps: ["203.0.113.42", "198.51.100.1"]
});
```

### 3. **Separate Dev/Prod Keys**
```javascript
// Development
const devKey = await createApiKey({
  environment: "development",
  scopes: [ApiKeyScope.READ_LEADS]
});

// Production
const prodKey = await createApiKey({
  environment: "production",
  scopes: [ApiKeyScope.READ_LEADS]
});
```

### 4. **Monitor Usage**
```javascript
// Set up webhook alerts
await updateApiKey({
  apiKeyId: "key_abc123",
  updates: {
    webhookUrl: "https://example.com/alerts",
    alertThreshold: 80  // Alert at 80% of limit
  }
});
```

### 5. **Use Minimal Scopes**
```javascript
// ❌ Don't give more access than needed
await createApiKey({
  scopes: [ApiKeyScope.ADMIN]  // Too broad!
});

// ✅ Use specific scopes
await createApiKey({
  scopes: [ApiKeyScope.READ_LEADS]  // Only what's needed
});
```

---

## Error Handling

All functions throw `functions.https.HttpsError` with specific codes:

| Code | Meaning |
|------|---------|
| `invalid-argument` | Missing/invalid parameters |
| `unauthenticated` | No authentication or invalid API key |
| `permission-denied` | Insufficient permissions or scope |
| `resource-exhausted` | Rate limit exceeded |
| `not-found` | API key not found |
| `internal` | Server error |

**Example:**
```javascript
try {
  const result = await validateApiKey({ apiKey: "invalid_key" });
} catch (error) {
  switch (error.code) {
    case "unauthenticated":
      console.error("Invalid API key");
      break;
    case "resource-exhausted":
      console.error("Rate limit exceeded");
      break;
    default:
      console.error("Error:", error.message);
  }
}
```

---

## Testing

### Test API Key Creation

```javascript
import { createApiKey, ApiKeyScope } from "./apiKeys";

const testKey = await createApiKey({
  name: "Test Key",
  scopes: [ApiKeyScope.READ_LEADS],
  environment: "development"
});

console.log("Created:", testKey.apiKey);
// pk_test_abc123...
```

### Test Rate Limiting

```javascript
// Create a key with low limits
const limitedKey = await createApiKey({
  name: "Rate Limit Test",
  scopes: [ApiKeyScope.READ_LEADS],
  rateLimit: {
    requestsPerMinute: 2,  // Only 2 per minute
    requestsPerHour: 10,
    requestsPerDay: 100,
    requestsPerMonth: 1000,
  }
});

// Make 3 rapid requests
for (let i = 0; i < 3; i++) {
  try {
    await validateApiKey({
      apiKey: limitedKey.apiKey,
      endpoint: "test"
    });
    console.log(`Request ${i + 1}: Success`);
  } catch (error) {
    console.log(`Request ${i + 1}: ${error.message}`);
  }
}

// Expected output:
// Request 1: Success
// Request 2: Success
// Request 3: Rate limit: requests per minute exceeded
```

### Test Scope Validation

```javascript
const readOnlyKey = await createApiKey({
  name: "Read-Only Key",
  scopes: [ApiKeyScope.READ_LEADS]  // No write access
});

// This should succeed
await validateApiKey({
  apiKey: readOnlyKey.apiKey,
  requiredScope: ApiKeyScope.READ_LEADS
});

// This should fail (permission-denied)
try {
  await validateApiKey({
    apiKey: readOnlyKey.apiKey,
    requiredScope: ApiKeyScope.WRITE_LEADS
  });
} catch (error) {
  console.log("Expected error:", error.message);
  // "API key does not have required scope: write_leads"
}
```

---

## Firestore Schema

### Collection: `apiKeys`

```typescript
{
  id: "key_abc123",
  key: "hashed_sha256...",           // Hashed API key (never plain-text)
  keyPrefix: "pk_live_abc123...",
  name: "Production API",
  description: "Main production key",
  userId: "user_xyz789",
  userName: "John Doe",
  status: "active",
  scopes: ["read_leads", "write_leads"],
  environment: "production",
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    requestsPerMonth: 100000
  },
  usageStats: {
    totalRequests: 42531,
    requestsThisMinute: 5,
    requestsThisHour: 234,
    requestsThisDay: 1203,
    requestsThisMonth: 42531,
    lastRequestAt: Timestamp,
    lastResetAt: Timestamp
  },
  allowedIps: ["203.0.113.42"],
  allowedDomains: ["https://example.com"],
  lastUsedAt: Timestamp,
  lastUsedIp: "203.0.113.42",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt: Timestamp,              // Optional
  rotatedAt: Timestamp,              // Optional
  revokedAt: null,
  revokedBy: null,
  revokedReason: null
}
```

### Collection: `apiKeyUsageLogs`

```typescript
{
  id: "log_abc123",
  apiKeyId: "key_abc123",
  endpoint: "/api/leads",
  method: "GET",
  statusCode: 200,
  responseTime: 234,                 // milliseconds
  requestSize: 512,                  // bytes
  responseSize: 2048,                // bytes
  ipAddress: "203.0.113.42",
  userAgent: "Mozilla/5.0...",
  timestamp: Timestamp,
  leadId: "lead_xyz789",             // Optional
  projectId: "proj_abc123",          // Optional
  userId: "user_xyz789"              // Optional
}
```

---

## Deployment

```bash
# Build
npm run build

# Deploy all functions
firebase deploy --only functions

# Deploy specific functions
firebase deploy --only functions:createApiKey,functions:validateApiKey
```

---

## Monitoring

Check Cloud Functions logs:
```bash
firebase functions:log --only createApiKey
firebase functions:log --only validateApiKey
```

Check scheduled cleanup:
```bash
firebase functions:log --only cleanupApiKeys
```

---

## Future Enhancements

- [ ] Webhook alerts for rate limit violations
- [ ] Usage analytics dashboard
- [ ] API key cost tracking
- [ ] Multi-factor authentication for sensitive operations
- [ ] API key groups/teams
- [ ] Request caching integration
- [ ] GraphQL support
