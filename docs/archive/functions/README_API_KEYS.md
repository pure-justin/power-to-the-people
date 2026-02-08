# API Key Management System 🔑

**Complete, production-ready API key management with usage tracking, rate limiting, and comprehensive security.**

Built for the Power to the People solar enrollment platform.

---

## 🎯 What This System Does

- ✅ **Secure API Key Generation** - SHA-256 hashed storage
- ✅ **Usage Tracking** - Track every request with detailed logs
- ✅ **Rate Limiting** - Multi-tier limits (minute/hour/day/month)
- ✅ **Scope-Based Permissions** - Fine-grained access control
- ✅ **Automatic Expiration** - Set expiration dates on keys
- ✅ **Key Rotation** - Generate new keys without changing IDs
- ✅ **IP Whitelisting** - Restrict by IP address
- ✅ **Domain Whitelisting** - CORS control
- ✅ **Audit Logs** - Complete history of API usage
- ✅ **Scheduled Cleanup** - Automatic maintenance

---

## 📚 Documentation Index

| Document | Purpose | Start Here |
|----------|---------|------------|
| **[QUICK_START.md](QUICK_START.md)** | Get running in 5 minutes | ⭐ **New Users** |
| **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** | Step-by-step deployment | ⭐ **First Deploy** |
| **[API_KEY_SYSTEM.md](API_KEY_SYSTEM.md)** | Complete API reference | **Deep Dive** |
| **[FIRESTORE_RULES.md](FIRESTORE_RULES.md)** | Security rules & setup | **Security** |
| **[CLIENT_SDK_EXAMPLE.md](CLIENT_SDK_EXAMPLE.md)** | React/Node.js examples | **Integration** |
| **[API_KEY_SYSTEM_SUMMARY.md](API_KEY_SYSTEM_SUMMARY.md)** | System overview | **Overview** |

---

## 🚀 Quick Start (5 Minutes)

### 1. Deploy Functions
```bash
cd /Users/admin/Projects/power-to-the-people/functions
npm install
npm run build
firebase deploy --only functions
```

### 2. Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

### 3. Create Your First API Key
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createKey = httpsCallable(functions, 'createApiKey');

const result = await createKey({
  name: "My First Key",
  scopes: ["read_leads", "write_leads"],
  environment: "development"
});

console.log("API Key:", result.data.apiKey);
// SAVE THIS! It won't be shown again.
```

### 4. Use Your API Key
```bash
curl https://YOUR_PROJECT.cloudfunctions.net/secureLeadWebhook \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"customerName":"John Doe","email":"john@example.com","phone":"5551234567","address":"123 Main St","city":"Austin","state":"TX","zip":"78701"}'
```

**Done!** 🎉

See [QUICK_START.md](QUICK_START.md) for detailed guide.

---

## 📦 What's Included

### Cloud Functions (11 total)

#### Core API Key Management
1. **`createApiKey`** - Create new API keys
2. **`validateApiKey`** - Validate and authorize requests
3. **`revokeApiKey`** - Permanently disable keys
4. **`rotateApiKey`** - Generate new key, keep same ID
5. **`updateApiKey`** - Update key settings
6. **`getApiKeyUsage`** - Get usage stats and logs
7. **`cleanupApiKeys`** - Scheduled cleanup (daily)

#### Helper Functions
8. **`validateApiKeyFromRequest`** - HTTP middleware helper

#### Example Secure Endpoints
9. **`secureLeadWebhook`** - Protected lead creation
10. **`secureSolarWebhook`** - Protected solar analysis
11. **`secureLeadQuery`** - Protected lead queries

### Firestore Collections

#### `apiKeys`
Stores API key metadata:
- Hashed keys (SHA-256)
- Owner information
- Status tracking
- Rate limits
- Usage statistics
- Security settings

#### `apiKeyUsageLogs`
Detailed request logs:
- Endpoint and method
- Status codes
- Response times
- IP addresses
- Error messages
- Timestamps

### Documentation (8 files)
- Complete API reference
- Deployment guides
- Integration examples
- Security best practices
- Troubleshooting guides
- React components
- Node.js client library

---

## 🔐 Security Features

### Key Storage
- **Hashed with SHA-256** - Plain text keys never stored
- **Shown once** - Only at creation/rotation
- **Prefix display** - First 16 chars for identification

### Authentication
- **Bearer token** - Standard Authorization header
- **Format validation** - Ensures valid key structure
- **Automatic expiration** - Optional time-based expiry

### Authorization
- **Scope-based** - Fine-grained permissions
- **Resource ownership** - Users own their keys
- **Admin override** - For support scenarios

### Rate Limiting
- **Per-minute** - Prevent burst attacks
- **Per-hour** - Control sustained load
- **Per-day** - Daily quotas
- **Per-month** - Monthly billing limits

### Network Security
- **IP whitelisting** - Restrict by IP
- **Domain whitelisting** - CORS control
- **Request logging** - Complete audit trail

### Lifecycle Management
- **Expiration dates** - Auto-disable old keys
- **Manual revocation** - Instant disable
- **Key rotation** - Seamless updates
- **Status tracking** - Active/suspended/revoked/expired

---

## ⚡ Rate Limits

### Development Keys (`pk_test_...`)
- 10 requests/minute
- 100 requests/hour
- 1,000 requests/day
- 10,000 requests/month

### Production Keys (`pk_live_...`)
- 60 requests/minute
- 1,000 requests/hour
- 10,000 requests/day
- 100,000 requests/month

### Custom Limits
Can be configured per-key at creation or via updates.

---

## 🎯 Available Scopes

| Scope | Description | Use Case |
|-------|-------------|----------|
| `read_leads` | View lead data | Analytics dashboards |
| `write_leads` | Create/update leads | Form submissions |
| `read_solar` | View solar analysis | Public displays |
| `write_solar` | Trigger solar analysis | Partner integrations |
| `read_smt` | View SMT data | Usage monitoring |
| `write_smt` | Fetch SMT data | Data collection |
| `admin` | Full access | Internal tools only |

---

## 💻 Code Examples

### Create API Key
```javascript
const result = await apiKeyService.createApiKey({
  name: "Partner Integration",
  description: "For XYZ Company",
  scopes: ["read_leads", "write_leads"],
  environment: "production",
  expiresInDays: 365,
  allowedIps: ["203.0.113.0"],
  rateLimit: {
    requestsPerMinute: 120,
    requestsPerHour: 5000
  }
});

console.log("Save this key:", result.apiKey);
```

### Validate in Cloud Function
```typescript
import { validateApiKeyFromRequest, ApiKeyScope } from './apiKeys';

export const myEndpoint = functions.https.onRequest(async (req, res) => {
  try {
    const apiKeyData = await validateApiKeyFromRequest(
      req,
      ApiKeyScope.WRITE_LEADS
    );

    // Key is valid, proceed
    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});
```

### Make Authenticated Request
```javascript
const response = await fetch('https://YOUR_PROJECT.cloudfunctions.net/secureLeadWebhook', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerName: "John Doe",
    email: "john@example.com",
    phone: "5551234567",
    address: "123 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701"
  })
});

const data = await response.json();
```

### Monitor Usage
```javascript
const usage = await apiKeyService.getApiKeyUsage(apiKeyId, 30);

console.log("Total requests:", usage.usageStats.totalRequests);
console.log("Requests today:", usage.usageStats.requestsThisDay);
console.log("Recent logs:", usage.logs);
```

### Revoke Key
```javascript
await apiKeyService.revokeApiKey(apiKeyId, "Compromised key");
```

### Rotate Key
```javascript
const result = await apiKeyService.rotateApiKey(apiKeyId);
console.log("New key:", result.apiKey); // Save immediately!
```

---

## 🛠️ Common Operations

### Create Development Key
```javascript
const key = await createApiKey({
  name: "Dev Testing",
  scopes: ["read_leads"],
  environment: "development"
});
```

### Create Production Key
```javascript
const key = await createApiKey({
  name: "Production API",
  scopes: ["read_leads", "write_leads"],
  environment: "production",
  expiresInDays: 365
});
```

### Update Key Scopes
```javascript
await updateApiKey(keyId, {
  scopes: ["read_leads", "write_leads", "read_solar"]
});
```

### Suspend Key Temporarily
```javascript
await updateApiKey(keyId, {
  status: "suspended"
});
```

### Re-activate Key
```javascript
await updateApiKey(keyId, {
  status: "active"
});
```

### Set IP Whitelist
```javascript
await updateApiKey(keyId, {
  allowedIps: ["203.0.113.0", "203.0.113.1"]
});
```

---

## 📊 Monitoring & Analytics

### View Usage Dashboard
```javascript
const usage = await getApiKeyUsage(keyId, 7); // Last 7 days

// Check utilization
const hourlyUsage = (usage.usageStats.requestsThisHour / usage.rateLimit.requestsPerHour) * 100;
console.log(`Using ${hourlyUsage}% of hourly limit`);

// View recent requests
usage.logs.forEach(log => {
  console.log(`${log.endpoint} - ${log.statusCode} - ${log.responseTime}ms`);
});
```

### Set Up Alerts
```javascript
await updateApiKey(keyId, {
  alertThreshold: 80, // Alert at 80% of limit
  webhookUrl: "https://your-app.com/api/alerts"
});
```

### Query Usage Logs
```javascript
// In Firestore
const logs = await db
  .collection('apiKeyUsageLogs')
  .where('apiKeyId', '==', keyId)
  .where('statusCode', '>=', 400) // Errors only
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get();
```

---

## 🧪 Testing

### Test Locally
```bash
cd functions
npm run serve
```

Then connect emulator:
```javascript
import { connectFunctionsEmulator } from 'firebase/functions';

if (process.env.NODE_ENV === 'development') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

### Test Rate Limiting
```bash
# Send 15 requests (limit is 10/min in dev)
for i in {1..15}; do
  curl -H "Authorization: Bearer $API_KEY" \
    https://YOUR_PROJECT.cloudfunctions.net/secureLeadWebhook \
    -d '{"customerName":"Test","email":"test@example.com","phone":"5555551234","address":"123 Main","city":"Austin","state":"TX","zip":"78701"}'
done
```

### Verify Security
```bash
# Should fail (no API key)
curl https://YOUR_PROJECT.cloudfunctions.net/secureLeadWebhook

# Should fail (invalid API key)
curl -H "Authorization: Bearer invalid_key" \
  https://YOUR_PROJECT.cloudfunctions.net/secureLeadWebhook

# Should succeed (valid API key)
curl -H "Authorization: Bearer $VALID_API_KEY" \
  https://YOUR_PROJECT.cloudfunctions.net/secureLeadWebhook
```

---

## 🐛 Troubleshooting

### "Invalid API key"
- Check key format: `pk_live_...` or `pk_test_...` (56 chars total)
- Verify key hasn't been revoked
- Check for trailing spaces/newlines

### "Permission denied"
- Ensure key has required scope
- Check Firestore rules are deployed
- Verify user owns the key

### "Rate limit exceeded"
- Wait for rate limit window to reset
- Implement exponential backoff
- Request higher limits via `updateApiKey`

### Functions won't deploy
- Run `npm run build` to check for TypeScript errors
- Ensure `firebase login` is active
- Check Firebase project is selected

### Can't create API key
- Ensure user is authenticated
- Check Firestore rules allow user to write
- Verify all required fields provided

---

## 🚦 Deployment Status

### ✅ Implemented
- [x] Core API key functions
- [x] Usage tracking and logging
- [x] Rate limiting system
- [x] Security rules
- [x] Example secure endpoints
- [x] Complete documentation
- [x] React SDK and hooks
- [x] Node.js client library
- [x] Testing examples

### ⏳ Ready to Deploy
- [ ] Cloud Functions
- [ ] Firestore rules
- [ ] Firestore indexes
- [ ] Initial testing

### 🎯 Post-Deployment
- [ ] Admin dashboard
- [ ] Partner documentation
- [ ] Usage monitoring
- [ ] Automated alerts

---

## 📈 Metrics to Track

### Technical
- API key creation rate
- Request volume per key
- Rate limit hit rate
- Error rate by endpoint
- Average response time

### Business
- Active API keys
- Active integrations
- Partner adoption
- Usage growth
- Revenue per key

---

## 🎓 Best Practices

### Key Management
✅ **DO:**
- Create separate keys per integration
- Use descriptive names
- Set expiration dates
- Rotate keys every 90 days
- Revoke unused keys immediately

❌ **DON'T:**
- Hardcode keys in client code
- Share keys between environments
- Commit keys to Git
- Use production keys in development
- Give more permissions than needed

### Security
✅ **DO:**
- Use IP whitelisting for server-to-server
- Set appropriate scopes (least privilege)
- Monitor usage regularly
- Enable alerts for anomalies
- Conduct regular security audits

❌ **DON'T:**
- Log plain-text keys
- Share keys via email/Slack
- Skip rate limit testing
- Ignore security alerts
- Use admin scope unnecessarily

### Integration
✅ **DO:**
- Implement exponential backoff
- Handle all error codes
- Cache validation results (with TTL)
- Monitor your usage
- Test in development first

❌ **DON'T:**
- Ignore rate limit headers
- Retry immediately on 429
- Skip error handling
- Exceed rate limits
- Test in production

---

## 📞 Support & Resources

### Documentation
- **[QUICK_START.md](QUICK_START.md)** - Get started quickly
- **[API_KEY_SYSTEM.md](API_KEY_SYSTEM.md)** - Complete reference
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Deploy guide
- **[FIRESTORE_RULES.md](FIRESTORE_RULES.md)** - Security setup
- **[CLIENT_SDK_EXAMPLE.md](CLIENT_SDK_EXAMPLE.md)** - Integration guide

### Source Code
- `functions/src/apiKeys.ts` - Core implementation
- `functions/src/secureLeadWebhook.ts` - Example endpoints
- `functions/src/leads.ts` - Lead management
- `functions/src/smtConnector.ts` - SMT integration

### Getting Help
1. Check documentation files
2. Review code comments
3. Check Firebase Console logs
4. Test with curl/Postman
5. Review Firestore data

---

## 🎉 Success!

If you can:
- ✅ Create API keys
- ✅ Use keys to authenticate
- ✅ See usage being tracked
- ✅ Hit rate limits (and get blocked)
- ✅ Revoke and rotate keys

**Then you're production ready!** 🚀

---

## 📝 License

Built for Power to the People - Solar + Battery enrollment platform.

## 🤝 Contributing

This system follows existing patterns in the codebase:
- `smtConnector.ts` - Puppeteer integration pattern
- `leads.ts` - Firestore CRUD pattern
- TypeScript with Firebase Functions v1 API

---

**Questions?** Start with [QUICK_START.md](QUICK_START.md)

**Ready to deploy?** Follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

**Need API reference?** See [API_KEY_SYSTEM.md](API_KEY_SYSTEM.md)
