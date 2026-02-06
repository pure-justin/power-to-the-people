# API Key Management - Quick Reference

## 🚀 Quick Start

### 1. Create an API Key
```javascript
const { getFunctions, httpsCallable } = require('firebase/functions');
const functions = getFunctions();
const createApiKey = httpsCallable(functions, 'createApiKey');

const result = await createApiKey({
  name: "My API Key",
  scopes: ["read_leads"],
  environment: "development"
});

// SAVE THIS IMMEDIATELY!
console.log("API Key:", result.data.apiKey);
// pk_test_abc123def456...
```

### 2. Use the API Key
```bash
curl -X GET \
  https://REGION-PROJECT_ID.cloudfunctions.net/getLeadsApi \
  -H "Authorization: Bearer pk_test_abc123..."
```

### 3. Check Usage
```javascript
const getApiKeyUsage = httpsCallable(functions, 'getApiKeyUsage');
const usage = await getApiKeyUsage({ apiKeyId: "key_123" });

console.log("Requests today:", usage.data.usageStats.requestsThisDay);
```

---

## 📋 Function Reference

| Function | Type | Auth Required | Purpose |
|----------|------|---------------|---------|
| `createApiKey` | Callable | ✅ Yes | Generate new API key |
| `validateApiKey` | Callable | ❌ No | Validate API key |
| `revokeApiKey` | Callable | ✅ Yes | Revoke API key |
| `rotateApiKey` | Callable | ✅ Yes | Rotate API key |
| `updateApiKey` | Callable | ✅ Yes | Update key settings |
| `getApiKeyUsage` | Callable | ✅ Yes | Get usage stats |
| `cleanupApiKeys` | Scheduled | - | Daily cleanup |

---

## 🔑 API Key Scopes

```typescript
// Read-only access
scopes: ["read_leads", "read_solar", "read_smt"]

// Write access
scopes: ["write_leads", "write_solar", "write_smt"]

// Full access
scopes: ["admin"]

// Mixed access
scopes: ["read_leads", "write_leads", "read_solar"]
```

---

## 🚦 Rate Limits

### Development (pk_test_...)
- 10/min | 100/hour | 1K/day | 10K/month

### Production (pk_live_...)
- 60/min | 1K/hour | 10K/day | 100K/month

### Custom
```javascript
rateLimit: {
  requestsPerMinute: 100,
  requestsPerHour: 5000,
  requestsPerDay: 50000,
  requestsPerMonth: 1000000
}
```

---

## 🔒 HTTP Authentication

### Option 1: Middleware (onRequest)
```typescript
import { validateApiKeyFromRequest, ApiKeyScope } from "./apiKeys";

export const myApi = functions.https.onRequest(async (req, res) => {
  try {
    const apiKey = await validateApiKeyFromRequest(req, ApiKeyScope.READ_LEADS);
    // Authorized!
    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});
```

### Option 2: Manual (onCall)
```typescript
export const myApi = functions.https.onCall(async (data, context) => {
  const validation = await validateApiKey({
    apiKey: data.apiKey,
    requiredScope: ApiKeyScope.READ_LEADS
  });
  // Use validation.userId, validation.scopes, etc.
});
```

---

## 🧪 Testing

### CLI Tool
```bash
# Create test key
node test-api-keys.js create

# Validate it
node test-api-keys.js validate

# Get usage
node test-api-keys.js usage

# Revoke it
node test-api-keys.js revoke

# List all keys
node test-api-keys.js list

# Clean up
node test-api-keys.js cleanup
```

### Local Emulator
```bash
firebase emulators:start

# Test in another terminal
curl http://localhost:5001/PROJECT_ID/REGION/myApi \
  -H "Authorization: Bearer pk_test_..."
```

---

## 📊 Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `invalid-argument` | 400 | Missing/invalid parameters |
| `unauthenticated` | 401 | Invalid/missing API key |
| `permission-denied` | 403 | Insufficient permissions |
| `resource-exhausted` | 429 | Rate limit exceeded |
| `not-found` | 404 | API key not found |
| `internal` | 500 | Server error |

---

## 🔄 Common Operations

### Create Production Key
```javascript
await createApiKey({
  name: "Production API",
  environment: "production",
  scopes: ["read_leads", "write_leads"],
  expiresInDays: 365,
  allowedDomains: ["https://example.com"]
});
```

### Rotate Compromised Key
```javascript
const result = await rotateApiKey({ apiKeyId: "key_123" });
console.log("New key:", result.data.apiKey); // Save immediately!
```

### Update Rate Limits
```javascript
await updateApiKey({
  apiKeyId: "key_123",
  updates: {
    rateLimit: {
      requestsPerMinute: 200,
      requestsPerHour: 10000,
      requestsPerDay: 100000,
      requestsPerMonth: 1000000
    }
  }
});
```

### Revoke Key
```javascript
await revokeApiKey({
  apiKeyId: "key_123",
  reason: "Security breach - rotating credentials"
});
```

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `functions/src/apiKeys.ts` | Main implementation |
| `functions/src/apiKeys.test.md` | Testing guide |
| `functions/src/examples/apiKeyIntegration.example.ts` | Integration examples |
| `functions/src/examples/ApiKeyDashboard.example.txt` | React UI |
| `functions/test-api-keys.js` | CLI test tool |
| `functions/README.md` | Full documentation |

---

## 🐛 Troubleshooting

### "Invalid API key"
- Check format: `pk_test_...` or `pk_live_...`
- Verify key hasn't been revoked
- Ensure key exists in Firestore

### "Permission denied"
- Check required scope matches key scopes
- Verify user owns the key (for updates)
- Check Firestore security rules

### "Rate limit exceeded"
- Check current usage: `getApiKeyUsage()`
- Increase limits: `updateApiKey()`
- Wait for reset period
- Implement exponential backoff

### "Function not found"
- Run: `npm run build`
- Deploy: `firebase deploy --only functions`
- Check function name spelling

---

## 📞 Support

**Documentation:**
- 📖 Full Guide: `functions/src/apiKeys.test.md`
- 📝 README: `functions/README.md`
- 💻 Examples: `functions/src/examples/`

**Logs:**
```bash
firebase functions:log --only createApiKey
```

**Test:**
```bash
node test-api-keys.js list
```

---

## ✨ Key Features

✅ Cryptographically secure key generation
✅ SHA-256 hashed storage (never plain-text)
✅ 4-tier rate limiting (min/hour/day/month)
✅ 7 scope-based permissions + admin
✅ IP whitelisting
✅ Key rotation with zero downtime
✅ Complete usage tracking & logs
✅ Automatic cleanup & expiration
✅ HTTP middleware for easy integration

---

**Last Updated:** 2026-02-06
**Version:** 1.0.0
