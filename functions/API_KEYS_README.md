# API Key Management System

Complete API key management system for the Power to the People platform with usage tracking, rate limiting, and security features.

## Features

### 🔐 Security
- **Secure Key Generation**: Cryptographically secure random keys (48-char hex)
- **Hashed Storage**: Keys stored as SHA-256 hashes, never plain-text
- **IP Whitelisting**: Optional IP address restrictions
- **Domain Whitelisting**: CORS controls for allowed domains
- **Scope-Based Permissions**: Granular access control

### 📊 Usage Tracking
- **Real-time Monitoring**: Track requests per minute/hour/day/month
- **Detailed Logs**: Every request logged with metadata
- **Historical Analysis**: Query usage logs for any time period
- **Performance Metrics**: Response times, payload sizes

### ⚡ Rate Limiting
- **Multi-Level Limits**: Per-minute, hour, day, and month
- **Environment-Based**: Different limits for dev vs production
- **Automatic Reset**: Counters reset automatically
- **Custom Limits**: Override defaults per key

### 🔄 Key Lifecycle
- **Creation**: Generate new keys with custom settings
- **Rotation**: Generate new key while preserving settings
- **Revocation**: Permanently disable keys
- **Expiration**: Auto-expire keys after set period
- **Status Tracking**: Active, suspended, revoked, expired

## Cloud Functions

### 1. `createApiKey`
Creates a new API key with specified permissions and limits.

**Auth Required**: Yes (Firebase Auth)

**Input**:
```typescript
{
  name: string;                    // Display name
  description?: string;            // Optional description
  scopes: ApiKeyScope[];          // Permissions array
  environment?: "development" | "production";
  expiresInDays?: number;         // Auto-expire after N days
  rateLimit?: {                   // Override defaults
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    requestsPerMonth?: number;
  };
  allowedIps?: string[];          // IP whitelist
  allowedDomains?: string[];      // Domain whitelist
}
```

**Output**:
```typescript
{
  success: true;
  apiKeyId: string;               // Document ID
  apiKey: string;                 // Plain-text key (ONLY TIME SHOWN)
  keyPrefix: string;              // Display prefix
  message: "Save this API key securely..."
}
```

**Example Usage**:
```javascript
const result = await createApiKey({
  name: "Production API Key",
  description: "Main production access",
  scopes: ["read_leads", "write_leads"],
  environment: "production",
  expiresInDays: 365,
  allowedIps: ["203.0.113.0"]
});

// IMPORTANT: Save result.apiKey immediately!
// It will never be shown again.
```

### 2. `validateApiKey`
Validates an API key and checks permissions. Used internally by other functions.

**Auth Required**: No (validates the key itself)

**Input**:
```typescript
{
  apiKey: string;                 // The API key to validate
  requiredScope?: ApiKeyScope;    // Optional scope check
  endpoint?: string;              // For logging
}
```

**Output**:
```typescript
{
  valid: true;
  apiKeyId: string;
  userId: string;
  scopes: ApiKeyScope[];
  environment: string;
  usageStats: UsageStats;
}
```

### 3. `revokeApiKey`
Permanently disables an API key.

**Auth Required**: Yes (must own the key)

**Input**:
```typescript
{
  apiKeyId: string;
  reason?: string;
}
```

**Output**:
```typescript
{
  success: true;
  apiKeyId: string;
  message: "API key revoked successfully"
}
```

### 4. `rotateApiKey`
Generates a new key while keeping the same ID and settings.

**Auth Required**: Yes (must own the key)

**Input**:
```typescript
{
  apiKeyId: string;
}
```

**Output**:
```typescript
{
  success: true;
  apiKeyId: string;
  apiKey: string;                 // New plain-text key (ONLY TIME SHOWN)
  keyPrefix: string;
  message: "Save this new API key securely..."
}
```

### 5. `updateApiKey`
Updates API key settings (name, scopes, limits, etc.)

**Auth Required**: Yes (must own the key)

**Input**:
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

### 6. `getApiKeyUsage`
Retrieves usage statistics and logs for an API key.

**Auth Required**: Yes (must own the key)

**Input**:
```typescript
{
  apiKeyId: string;
  days?: number;                  // Default: 7
}
```

**Output**:
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
  };
  logs: ApiKeyUsageLog[];
  logCount: number;
}
```

### 7. `cleanupApiKeys` (Scheduled)
Runs daily at midnight (CST) to:
- Mark expired keys as `EXPIRED`
- Delete usage logs older than 90 days

**Schedule**: `0 0 * * *` (daily at midnight)

## API Key Scopes

```typescript
enum ApiKeyScope {
  READ_LEADS = "read_leads",       // Read lead data
  WRITE_LEADS = "write_leads",     // Create/update leads
  READ_SOLAR = "read_solar",       // Access solar API data
  WRITE_SOLAR = "write_solar",     // Trigger solar analysis
  READ_SMT = "read_smt",           // Access SMT data
  WRITE_SMT = "write_smt",         // Trigger SMT fetch
  ADMIN = "admin"                  // Full access (all scopes)
}
```

## Rate Limits

### Development Keys (`pk_test_...`)
- **Per Minute**: 10 requests
- **Per Hour**: 100 requests
- **Per Day**: 1,000 requests
- **Per Month**: 10,000 requests

### Production Keys (`pk_live_...`)
- **Per Minute**: 60 requests
- **Per Hour**: 1,000 requests
- **Per Day**: 10,000 requests
- **Per Month**: 100,000 requests

## Using API Keys in HTTP Functions

For HTTP functions that need API key authentication:

```typescript
import { validateApiKeyFromRequest } from "./apiKeys";

export const myProtectedFunction = functions
  .runWith({ memory: "256MB" })
  .https.onRequest(async (req, res) => {
    try {
      // Validate API key and check scope
      const apiKeyData = await validateApiKeyFromRequest(
        req,
        ApiKeyScope.READ_LEADS
      );

      // Key is valid, proceed with request
      res.json({
        success: true,
        userId: apiKeyData.userId
      });

    } catch (error) {
      // Invalid key or insufficient permissions
      res.status(401).json({
        error: error.message
      });
    }
  });
```

### HTTP Request Format

```bash
curl -X POST https://your-project.cloudfunctions.net/myProtectedFunction \
  -H "Authorization: Bearer pk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"data": "value"}'
```

## Database Schema

### Collection: `apiKeys`

```typescript
{
  id: string;                      // Document ID
  key: string;                     // SHA-256 hash
  keyPrefix: string;               // Display prefix
  name: string;
  description?: string;
  userId: string;                  // Owner
  userName?: string;
  organizationId?: string;
  status: ApiKeyStatus;
  scopes: ApiKeyScope[];
  environment: "development" | "production";
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    requestsPerMonth: number;
  };
  usageStats: {
    totalRequests: number;
    requestsThisMinute: number;
    requestsThisHour: number;
    requestsThisDay: number;
    requestsThisMonth: number;
    lastRequestAt?: Timestamp;
    lastResetAt: Timestamp;
  };
  allowedIps?: string[];
  allowedDomains?: string[];
  lastUsedAt?: Timestamp;
  lastUsedIp?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
  rotatedAt?: Timestamp;
  revokedAt?: Timestamp;
  revokedBy?: string;
  revokedReason?: string;
  isTest?: boolean;
  notes?: string;
  webhookUrl?: string;
  alertThreshold?: number;
}
```

### Collection: `apiKeyUsageLogs`

```typescript
{
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;            // ms
  requestSize: number;             // bytes
  responseSize: number;            // bytes
  ipAddress: string;
  userAgent?: string;
  errorMessage?: string;
  timestamp: Timestamp;
  leadId?: string;
  projectId?: string;
  userId?: string;
}
```

## Security Best Practices

### 1. Key Storage
- ✅ **DO**: Store keys in environment variables or secure key management systems
- ❌ **DON'T**: Hardcode keys in source code or commit to git

### 2. Key Rotation
- Rotate production keys every 90-180 days
- Rotate immediately if key is compromised
- Use `rotateApiKey()` to generate new key

### 3. Least Privilege
- Only grant necessary scopes
- Use separate keys for different services
- Prefer read-only keys when write access isn't needed

### 4. Monitoring
- Check usage logs regularly
- Set up webhooks for usage alerts
- Monitor for unusual patterns

### 5. IP Whitelisting
- Use IP restrictions for server-to-server APIs
- Keep whitelist updated
- Document IP ranges

## Error Handling

All functions throw `HttpsError` with these codes:

- `invalid-argument`: Missing or invalid parameters
- `unauthenticated`: Invalid or missing API key
- `permission-denied`: Insufficient permissions or key status issue
- `resource-exhausted`: Rate limit exceeded
- `not-found`: API key not found
- `internal`: Server error

Example error handling:

```typescript
try {
  const result = await createApiKey({...});
} catch (error) {
  if (error.code === 'resource-exhausted') {
    // Rate limit exceeded
  } else if (error.code === 'permission-denied') {
    // Access denied
  }
  console.error(error.message);
}
```

## Testing

### Test with Firebase Emulator

```bash
cd functions
npm run serve
```

Then call functions locally:
```javascript
// Frontend code
const functions = getFunctions();
connectFunctionsEmulator(functions, "localhost", 5001);

const createKey = httpsCallable(functions, 'createApiKey');
const result = await createKey({
  name: "Test Key",
  scopes: ["read_leads"],
  environment: "development"
});
```

### Test HTTP Endpoints

```bash
# Test protected endpoint
curl http://localhost:5001/YOUR_PROJECT/us-central1/yourFunction \
  -H "Authorization: Bearer pk_test_your_key_here" \
  -H "Content-Type: application/json"
```

## Deployment

```bash
cd functions
npm run build
npm run deploy
```

Or deploy specific function:
```bash
firebase deploy --only functions:createApiKey
```

## Monitoring

### View Logs
```bash
firebase functions:log
```

### Filter by function
```bash
firebase functions:log --only createApiKey
```

### Monitor in Firebase Console
- Functions → Usage
- Functions → Logs
- Firestore → apiKeys collection
- Firestore → apiKeyUsageLogs collection

## Future Enhancements

- [ ] OAuth 2.0 integration
- [ ] Webhook notifications for rate limit alerts
- [ ] Usage analytics dashboard
- [ ] Automatic key rotation
- [ ] Multi-organization support
- [ ] Cost tracking per API key
- [ ] GraphQL API support
