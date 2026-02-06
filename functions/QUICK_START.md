# Quick Start Guide - API Key Management System

Get up and running with the API key management system in 5 minutes.

## 🚀 Prerequisites

- Firebase project set up
- Cloud Functions deployed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Node.js 18+ installed

## 📦 Installation

### 1. Deploy Cloud Functions

```bash
cd /Users/admin/Projects/power-to-the-people/functions

# Install dependencies (if not already done)
npm install

# Build TypeScript
npm run build

# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions only
firebase deploy --only functions:createApiKey,functions:validateApiKey,functions:revokeApiKey
```

### 2. Set Up Firestore Security Rules

Copy the rules from `FIRESTORE_RULES.md` to your `firestore.rules` file:

```bash
# In project root
firebase deploy --only firestore:rules
```

### 3. Create Firestore Indexes

Firebase will prompt you to create indexes when you first query. Or create manually in Firebase Console:

**Index 1: apiKeyUsageLogs**
- Collection: `apiKeyUsageLogs`
- Fields:
  - `apiKeyId` (Ascending)
  - `timestamp` (Descending)

**Index 2: apiKeys**
- Collection: `apiKeys`
- Fields:
  - `userId` (Ascending)
  - `status` (Ascending)

## 🎯 Your First API Key

### Option A: Using Firebase Console (Easiest)

1. Go to Firebase Console → Functions
2. Find `createApiKey` function
3. Click "Test function"
4. Enter this JSON:
```json
{
  "data": {
    "name": "My First API Key",
    "scopes": ["read_leads", "write_leads"],
    "environment": "development"
  }
}
```
5. Click "Run function"
6. **SAVE THE API KEY** from the response (only shown once!)

### Option B: Using JavaScript (Recommended)

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

async function createMyFirstKey() {
  const functions = getFunctions();
  const createApiKey = httpsCallable(functions, 'createApiKey');

  try {
    const result = await createApiKey({
      name: "My First API Key",
      description: "Testing the API key system",
      scopes: ["read_leads", "write_leads"],
      environment: "development",
      expiresInDays: 365
    });

    console.log("🎉 API Key Created!");
    console.log("Save this key:", result.data.apiKey);
    console.log("Key ID:", result.data.apiKeyId);

    // IMPORTANT: Save this key securely!
    return result.data.apiKey;
  } catch (error) {
    console.error("Failed to create API key:", error);
  }
}

// Run it
const myApiKey = await createMyFirstKey();
```

### Option C: Using cURL

```bash
# Get Firebase ID token first
firebase login:ci

# Create API key
curl -X POST \
  https://us-central1-YOUR-PROJECT.cloudfunctions.net/createApiKey \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{
    "name": "Test Key",
    "scopes": ["read_leads"],
    "environment": "development"
  }'
```

## 🧪 Test Your API Key

### Test with the Secure Lead Webhook

```bash
# Replace with your actual API key
API_KEY="pk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
BASE_URL="https://us-central1-YOUR-PROJECT.cloudfunctions.net"

# Create a test lead
curl -X POST "${BASE_URL}/secureLeadWebhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "customerName": "John Doe",
    "email": "john@example.com",
    "phone": "555-0123",
    "address": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip": "78701"
  }'

# Expected response:
# {
#   "success": true,
#   "leadId": "abc123...",
#   "message": "Lead created successfully",
#   "usage": {
#     "requestsThisHour": 1,
#     "hourlyLimit": 100,
#     ...
#   }
# }
```

### Test Rate Limiting

```bash
# Send multiple requests quickly to test rate limiting
for i in {1..15}; do
  curl -X POST "${BASE_URL}/secureLeadWebhook" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"customerName":"Test '$i'", "email":"test'$i'@example.com", "phone":"555000'$i'", "address":"123 Main", "city":"Austin", "state":"TX", "zip":"78701"}'
  echo ""
done

# After 10 requests (development limit), you should see:
# {
#   "success": false,
#   "error": "Rate limit: requests per minute exceeded"
# }
```

## 📱 Frontend Integration

### 1. Install Client SDK

Copy `apiKeyService.ts` from `CLIENT_SDK_EXAMPLE.md` to your project:

```bash
# Create the service file
mkdir -p src/services
cp functions/CLIENT_SDK_EXAMPLE.md src/services/apiKeyService.ts
```

### 2. Create API Key Management Page

```typescript
// src/pages/ApiKeys.tsx
import React from 'react';
import { useApiKeys } from '../hooks/useApiKeys';
import { apiKeyService } from '../services/apiKeyService';

export function ApiKeysPage() {
  const { apiKeys, loading } = useApiKeys('active');
  const [showCreateForm, setShowCreateForm] = React.useState(false);

  const handleCreateKey = async () => {
    const result = await apiKeyService.createApiKey({
      name: "Quick Start Key",
      scopes: ["read_leads", "write_leads"],
      environment: "development",
      expiresInDays: 30
    });

    alert(`Save this key:\n\n${result.apiKey}`);
    setShowCreateForm(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>API Keys</h1>

      <button onClick={() => setShowCreateForm(true)}>
        Create New Key
      </button>

      {showCreateForm && (
        <div>
          <button onClick={handleCreateKey}>Create Development Key</button>
          <button onClick={() => setShowCreateForm(false)}>Cancel</button>
        </div>
      )}

      <div>
        {apiKeys.map(key => (
          <div key={key.id}>
            <h3>{key.name}</h3>
            <code>{key.keyPrefix}</code>
            <p>Requests: {key.usageStats.totalRequests}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🔐 Security Checklist

Before going to production:

- [ ] Deploy Firestore security rules
- [ ] Set up environment variables for sensitive data
- [ ] Use production API keys only in production
- [ ] Never commit API keys to Git
- [ ] Set appropriate rate limits
- [ ] Enable IP whitelisting for server-to-server integrations
- [ ] Set up monitoring and alerts
- [ ] Test all scopes and permissions
- [ ] Document API keys for your team
- [ ] Set expiration dates on keys

## 🐛 Troubleshooting

### "Permission denied" when creating API key

**Problem:** Firestore rules not deployed or user not authenticated.

**Solution:**
```bash
# Deploy rules
firebase deploy --only firestore:rules

# Check user is authenticated
const user = getAuth().currentUser;
console.log("User:", user);
```

### "Invalid API key format"

**Problem:** API key doesn't match expected format.

**Solution:**
- API keys must start with `pk_live_` or `pk_test_`
- Must be exactly 56 characters
- Check for trailing spaces or newlines

### "Rate limit exceeded"

**Problem:** Too many requests in short time.

**Solution:**
- Wait for rate limit window to reset
- Implement exponential backoff
- Request higher rate limits via `updateApiKey`

### "Missing required scope"

**Problem:** API key doesn't have permission for the endpoint.

**Solution:**
```javascript
await apiKeyService.updateApiKey(keyId, {
  scopes: ["read_leads", "write_leads", "write_solar"]
});
```

### Function deployment fails

**Problem:** TypeScript compilation errors or missing dependencies.

**Solution:**
```bash
cd functions
npm install
npm run build
# Check for errors
firebase deploy --only functions --debug
```

## 📊 Monitoring Usage

### View Usage in Firebase Console

1. Go to Firestore
2. Navigate to `apiKeyUsageLogs` collection
3. Filter by `apiKeyId`
4. Sort by `timestamp` descending

### Query Usage Programmatically

```javascript
const usage = await apiKeyService.getApiKeyUsage(apiKeyId, 7);

console.log("Total requests:", usage.usageStats.totalRequests);
console.log("Requests today:", usage.usageStats.requestsThisDay);
console.log("Recent logs:", usage.logs);
```

### Set Up Alerts

```javascript
await apiKeyService.updateApiKey(keyId, {
  alertThreshold: 80, // Alert at 80% of limit
  webhookUrl: "https://your-app.com/api/alerts"
});
```

## 🎓 Next Steps

1. **Read the full documentation:**
   - `API_KEY_SYSTEM.md` - Complete system documentation
   - `FIRESTORE_RULES.md` - Security rules and best practices
   - `CLIENT_SDK_EXAMPLE.md` - Frontend integration examples

2. **Customize rate limits:**
   ```javascript
   await apiKeyService.createApiKey({
     name: "High Volume Key",
     scopes: ["read_leads"],
     environment: "production",
     rateLimit: {
       requestsPerMinute: 120,
       requestsPerHour: 5000,
       requestsPerDay: 50000,
       requestsPerMonth: 1000000
     }
   });
   ```

3. **Set up automated cleanup:**
   - The `cleanupApiKeys` function runs daily at midnight
   - Marks expired keys as "expired"
   - Deletes logs older than 90 days
   - Already deployed if you ran `firebase deploy --only functions`

4. **Build admin dashboard:**
   - See `CLIENT_SDK_EXAMPLE.md` for React components
   - Monitor all API keys across your organization
   - Track usage patterns
   - Manage user permissions

5. **Integrate with existing endpoints:**
   - See `secureLeadWebhook.ts` for examples
   - Use `validateApiKeyFromRequest()` helper
   - Add API key auth to any HTTP function

## 💡 Tips & Best Practices

### Naming Convention
Use descriptive names that indicate purpose:
- ✅ "Production Lead Form - Website"
- ✅ "Partner Integration - ABC Company"
- ✅ "Development Testing - John"
- ❌ "Key 1"
- ❌ "Test"

### Scope Management
Start with minimal scopes, add more as needed:
```javascript
// Good: Start minimal
scopes: ["read_leads"]

// Good: Add specific scopes
scopes: ["read_leads", "write_leads"]

// Bad: Too permissive
scopes: ["admin"] // Only for trusted integrations
```

### Key Rotation Schedule
- Production keys: Rotate every 90 days
- Development keys: Rotate when compromised
- Integration keys: Rotate on employee departure

### Testing Strategy
1. Create test keys with `isTest: true`
2. Test in development environment first
3. Monitor usage for 24 hours before production
4. Set lower rate limits initially

## 🆘 Getting Help

- **Check logs:** Firebase Console → Functions → Logs
- **Test locally:** `firebase emulators:start`
- **Read source:** `functions/src/apiKeys.ts`
- **Review examples:** `functions/src/secureLeadWebhook.ts`

## ✅ Quick Verification

Run this checklist to verify everything is working:

```bash
# 1. Functions deployed?
firebase functions:list | grep -E "createApiKey|validateApiKey|revokeApiKey"

# 2. Rules deployed?
firebase firestore:rules | head -10

# 3. Can create API key? (test in browser console)
# See "Your First API Key" section above

# 4. Can use API key? (test with curl)
# See "Test Your API Key" section above

# 5. Rate limiting working? (test with loop)
# See "Test Rate Limiting" section above
```

If all tests pass: **🎉 You're ready to go!**

## 📚 Additional Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [API Design Best Practices](https://swagger.io/resources/articles/best-practices-in-api-design/)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies)

---

**Built for Power to the People**
Solar + Battery enrollment platform revolutionizing clean energy access.
