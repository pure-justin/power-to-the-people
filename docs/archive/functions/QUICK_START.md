# Quick Start Guide - API Key Management

Get up and running in 5 minutes.

## 1. Deploy Functions (2 minutes)

```bash
cd functions
npm install
npm run build
npm run deploy
```

## 2. Configure Firestore Rules (30 seconds)

Add to `firestore.rules`:

```javascript
match /apiKeys/{keyId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow write: if request.auth != null && request.resource.data.userId == request.auth.uid;
}

match /apiKeyUsageLogs/{logId} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

Deploy:
```bash
firebase deploy --only firestore:rules
```

## 3. Create Your First API Key (Frontend)

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createKey = httpsCallable(functions, 'createApiKey');

// User must be authenticated
const result = await createKey({
  name: "My First Key",
  scopes: ["read_leads", "write_leads"],
  environment: "development"
});

console.log("API Key:", result.data.apiKey);
// Save this immediately! It won't be shown again.
```

## 4. Use Your API Key

### In Cloud Functions

```typescript
import { validateApiKeyFromRequest, ApiKeyScope } from "./apiKeys";

export const myProtectedFunction = functions
  .https.onRequest(async (req, res) => {
    try {
      const apiKeyData = await validateApiKeyFromRequest(
        req,
        ApiKeyScope.READ_LEADS
      );

      // Key is valid, proceed
      res.json({ success: true, userId: apiKeyData.userId });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  });
```

### HTTP Request

```bash
curl https://YOUR_PROJECT.cloudfunctions.net/myProtectedFunction \
  -H "Authorization: Bearer pk_test_YOUR_KEY_HERE"
```

## 5. Monitor Usage

```javascript
const getUsage = httpsCallable(functions, 'getApiKeyUsage');

const usage = await getUsage({
  apiKeyId: "your-key-id",
  days: 7
});

console.log("Total Requests:", usage.data.usageStats.totalRequests);
console.log("Recent Logs:", usage.data.logs);
```

## Common Operations

### Revoke a Key
```javascript
const revoke = httpsCallable(functions, 'revokeApiKey');
await revoke({ apiKeyId: "key-id", reason: "Compromised" });
```

### Rotate a Key
```javascript
const rotate = httpsCallable(functions, 'rotateApiKey');
const result = await rotate({ apiKeyId: "key-id" });
console.log("New Key:", result.data.apiKey);
```

### Update Settings
```javascript
const update = httpsCallable(functions, 'updateApiKey');
await update({
  apiKeyId: "key-id",
  updates: {
    name: "Updated Name",
    scopes: ["read_leads", "read_solar"]
  }
});
```

## Testing Locally

```bash
cd functions
npm run serve
```

Then in your frontend:
```javascript
import { connectFunctionsEmulator } from 'firebase/functions';

if (process.env.NODE_ENV === 'development') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## Available Scopes

- `read_leads` - Read lead data
- `write_leads` - Create/update leads
- `read_solar` - Access solar API data
- `write_solar` - Trigger solar analysis
- `read_smt` - Access SMT data
- `write_smt` - Trigger SMT fetch
- `admin` - Full access (use sparingly!)

## Rate Limits

**Development** (\`pk_test_...\`):
- 10/min, 100/hour, 1K/day, 10K/month

**Production** (\`pk_live_...\`):
- 60/min, 1K/hour, 10K/day, 100K/month

## Error Codes

- `invalid-argument` - Missing/invalid parameters
- `unauthenticated` - Invalid API key
- `permission-denied` - Insufficient permissions
- `resource-exhausted` - Rate limit exceeded
- `not-found` - Key doesn't exist

## Need Help?

1. **Full API Reference**: See \`API_KEYS_README.md\`
2. **Frontend Integration**: See \`FRONTEND_INTEGRATION.md\`
3. **Deployment Guide**: See \`DEPLOYMENT.md\`
4. **Test Script**: Run \`node test-api-keys.js\`

## Security Checklist

- ✅ Never expose production keys in frontend code
- ✅ Store keys in environment variables
- ✅ Use separate keys for dev/prod
- ✅ Rotate keys every 90 days
- ✅ Revoke compromised keys immediately
- ✅ Monitor usage logs regularly
- ✅ Use IP whitelisting for server-to-server APIs

---

**You're ready to go!** 🚀

Start by deploying the functions, then integrate with your frontend using the examples above.
