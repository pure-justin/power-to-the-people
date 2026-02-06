# API Key Management System

Complete API key management system with usage tracking, rate limiting, and security features for the Power to the People platform.

## Firestore Schema

### Collections

#### `apiKeys` Collection
Stores API key metadata and configuration.

```typescript
{
  // Identification
  id: string;                    // Document ID
  key: string;                   // Hashed API key (SHA-256)
  keyPrefix: string;             // Display prefix (e.g., "pk_live_12345678...")
  name: string;                  // Human-readable name
  description?: string;          // Optional description

  // Owner
  userId: string;                // Firebase Auth UID
  userName?: string;             // Display name
  organizationId?: string;       // Optional organization link

  // Status & Access
  status: "active" | "suspended" | "revoked" | "expired";
  scopes: string[];              // ["read_leads", "write_leads", etc.]
  environment: "development" | "production";

  // Rate Limiting
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

  // Security
  allowedIps?: string[];         // IP whitelist
  allowedDomains?: string[];     // CORS whitelist
  lastUsedAt?: Timestamp;
  lastUsedIp?: string;

  // Lifecycle
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;         // Auto-expire date
  rotatedAt?: Timestamp;
  revokedAt?: Timestamp;
  revokedBy?: string;
  revokedReason?: string;

  // Metadata
  isTest?: boolean;
  notes?: string;
  webhookUrl?: string;           // Alert webhook
  alertThreshold?: number;       // Usage alert threshold (%)
}
```

#### `apiKeyUsageLogs` Collection
Detailed usage logs for analytics and debugging.

```typescript
{
  id: string;                    // Document ID
  apiKeyId: string;              // Reference to apiKeys doc
  endpoint: string;              // Function/endpoint called
  method: string;                // HTTP method
  statusCode: number;            // Response code
  responseTime: number;          // Milliseconds
  requestSize: number;           // Bytes
  responseSize: number;          // Bytes
  ipAddress: string;
  userAgent?: string;
  errorMessage?: string;
  timestamp: Timestamp;

  // Context (optional)
  leadId?: string;
  projectId?: string;
  userId?: string;
}
```

### Indexes Required

Create these composite indexes in Firebase Console:

```
Collection: apiKeyUsageLogs
- apiKeyId (Ascending) + timestamp (Descending)

Collection: apiKeys
- userId (Ascending) + status (Ascending)
- status (Ascending) + expiresAt (Ascending)
```

## API Key Format

API keys follow this format:
```
pk_{environment}_{random48chars}

Examples:
pk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
pk_test_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7
```

- **pk_live_**: Production keys
- **pk_test_**: Development keys
- Keys are 56 characters total
- Stored as SHA-256 hash in database
- Plain-text key only shown once at creation/rotation

## Available Scopes

| Scope | Description |
|-------|-------------|
| `read_leads` | Read lead data |
| `write_leads` | Create/update leads |
| `read_solar` | Access solar analysis data |
| `write_solar` | Trigger solar API analysis |
| `read_smt` | Access Smart Meter Texas data |
| `write_smt` | Trigger SMT data fetch |
| `admin` | Full access to all resources |

## Cloud Functions

### User-Facing Functions (Callable)

#### `createApiKey`
Create a new API key.

```typescript
// Request
{
  name: string;
  description?: string;
  scopes: string[];                    // ["read_leads", "write_leads"]
  environment?: "development" | "production";
  expiresInDays?: number;
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    requestsPerMonth?: number;
  };
  allowedIps?: string[];
  allowedDomains?: string[];
}

// Response
{
  success: true;
  apiKeyId: string;
  apiKey: string;                      // SAVE THIS! Only shown once
  keyPrefix: string;
  message: string;
}
```

**Usage:**
```javascript
const result = await firebase.functions().httpsCallable('createApiKey')({
  name: "Partner API Key",
  description: "For XYZ Company integration",
  scopes: ["read_leads", "write_leads"],
  environment: "production",
  expiresInDays: 365
});

console.log("Save this key:", result.data.apiKey);
```

#### `validateApiKey`
Validate an API key and check permissions.

```typescript
// Request
{
  apiKey: string;
  requiredScope?: string;
  endpoint?: string;
}

// Response
{
  valid: true;
  apiKeyId: string;
  userId: string;
  scopes: string[];
  environment: string;
  usageStats: UsageStats;
}
```

#### `revokeApiKey`
Permanently revoke an API key.

```typescript
// Request
{
  apiKeyId: string;
  reason?: string;
}

// Response
{
  success: true;
  apiKeyId: string;
  message: string;
}
```

#### `rotateApiKey`
Generate a new key for an existing API key ID.

```typescript
// Request
{
  apiKeyId: string;
}

// Response
{
  success: true;
  apiKeyId: string;
  apiKey: string;                      // New key - SAVE THIS!
  keyPrefix: string;
  message: string;
}
```

#### `updateApiKey`
Update API key settings.

```typescript
// Request
{
  apiKeyId: string;
  updates: {
    name?: string;
    description?: string;
    scopes?: string[];
    status?: string;
    rateLimit?: RateLimit;
    allowedIps?: string[];
    allowedDomains?: string[];
    notes?: string;
    webhookUrl?: string;
    alertThreshold?: number;
  };
}

// Response
{
  success: true;
  apiKeyId: string;
}
```

#### `getApiKeyUsage`
Get usage statistics and logs.

```typescript
// Request
{
  apiKeyId: string;
  days?: number;                       // Last N days (default 7)
}

// Response
{
  success: true;
  apiKeyId: string;
  usageStats: UsageStats;
  logs: ApiKeyUsageLog[];
  logCount: number;
}
```

### Internal Functions

#### `validateApiKeyFromRequest`
Helper function for HTTP endpoints to validate API keys.

```typescript
import { validateApiKeyFromRequest, ApiKeyScope } from './apiKeys';

export const myApiEndpoint = functions.https.onRequest(async (req, res) => {
  try {
    // Validate API key with required scope
    const apiKeyData = await validateApiKeyFromRequest(
      req,
      ApiKeyScope.WRITE_LEADS
    );

    // API key is valid, proceed with logic
    const userId = apiKeyData.userId;

    // ... your logic here ...

    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});
```

#### `cleanupApiKeys`
Scheduled function (runs daily at midnight):
- Marks expired keys as `expired`
- Deletes usage logs older than 90 days

## Rate Limits

### Default Limits

#### Development Keys
- 10 requests/minute
- 100 requests/hour
- 1,000 requests/day
- 10,000 requests/month

#### Production Keys
- 60 requests/minute
- 1,000 requests/hour
- 10,000 requests/day
- 100,000 requests/month

### Custom Limits
You can override default limits when creating or updating keys:

```javascript
await createApiKey({
  name: "High Volume Partner",
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

## Security Features

### 1. Key Hashing
- API keys are hashed with SHA-256 before storage
- Plain-text keys never stored in database
- Keys only shown once at creation/rotation

### 2. IP Whitelisting
```javascript
await createApiKey({
  name: "Office API Key",
  scopes: ["admin"],
  allowedIps: ["203.0.113.0", "203.0.113.1"]
});
```

### 3. Domain Whitelisting (CORS)
```javascript
await createApiKey({
  name: "Web App Key",
  scopes: ["read_leads"],
  allowedDomains: ["https://example.com", "https://app.example.com"]
});
```

### 4. Automatic Expiration
```javascript
await createApiKey({
  name: "Temporary Key",
  scopes: ["read_leads"],
  expiresInDays: 30  // Auto-expire in 30 days
});
```

### 5. Scope-Based Permissions
Keys only work for specified scopes. Admin scope required for sensitive operations.

## Usage Examples

### Frontend (React)

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

// Create API key
const createKey = async () => {
  const functions = getFunctions();
  const createApiKey = httpsCallable(functions, 'createApiKey');

  const result = await createApiKey({
    name: "My API Key",
    scopes: ["read_leads", "write_leads"],
    environment: "production"
  });

  // IMPORTANT: Save this key immediately!
  const apiKey = result.data.apiKey;
  alert(`Save this key: ${apiKey}`);
};

// List user's API keys
const listKeys = async () => {
  const db = getFirestore();
  const user = getAuth().currentUser;

  const q = query(
    collection(db, 'apiKeys'),
    where('userId', '==', user.uid),
    where('status', '==', 'active')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

// Revoke key
const revokeKey = async (apiKeyId) => {
  const functions = getFunctions();
  const revokeApiKey = httpsCallable(functions, 'revokeApiKey');

  await revokeApiKey({
    apiKeyId,
    reason: "No longer needed"
  });
};

// View usage
const viewUsage = async (apiKeyId) => {
  const functions = getFunctions();
  const getApiKeyUsage = httpsCallable(functions, 'getApiKeyUsage');

  const result = await getApiKeyUsage({
    apiKeyId,
    days: 30
  });

  console.log("Total requests:", result.data.usageStats.totalRequests);
  console.log("Recent logs:", result.data.logs);
};
```

### External API Integration

```javascript
// Using the API key in external requests
const API_KEY = "pk_live_a1b2c3d4...";
const API_URL = "https://us-central1-YOUR-PROJECT.cloudfunctions.net";

// Call lead webhook with API key
const response = await fetch(`${API_URL}/leadWebhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
  body: JSON.stringify({
    customerName: "John Doe",
    email: "john@example.com",
    phone: "555-0123",
    address: "123 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701"
  })
});

const data = await response.json();
console.log("Lead created:", data.leadId);
```

### Admin Dashboard (React)

```typescript
import { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';

function ApiKeyDashboard() {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for user's API keys
  useEffect(() => {
    const db = getFirestore();
    const user = getAuth().currentUser;

    const q = query(
      collection(db, 'apiKeys'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const keys = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApiKeys(keys);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleCreateKey = async (formData) => {
    const functions = getFunctions();
    const createApiKey = httpsCallable(functions, 'createApiKey');

    const result = await createApiKey(formData);

    // Show the key to user (only time it's visible)
    alert(`Save this key immediately:\n\n${result.data.apiKey}`);
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;

    const functions = getFunctions();
    const revokeApiKey = httpsCallable(functions, 'revokeApiKey');

    await revokeApiKey({
      apiKeyId: keyId,
      reason: "User revoked from dashboard"
    });
  };

  const handleRotateKey = async (keyId) => {
    if (!confirm('Generate a new key? The old key will stop working.')) return;

    const functions = getFunctions();
    const rotateApiKey = httpsCallable(functions, 'rotateApiKey');

    const result = await rotateApiKey({ apiKeyId: keyId });
    alert(`New API key:\n\n${result.data.apiKey}`);
  };

  return (
    <div>
      <h1>API Keys</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Key Prefix</th>
              <th>Status</th>
              <th>Environment</th>
              <th>Requests</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map(key => (
              <tr key={key.id}>
                <td>{key.name}</td>
                <td><code>{key.keyPrefix}</code></td>
                <td>
                  <span className={`status-${key.status}`}>
                    {key.status}
                  </span>
                </td>
                <td>{key.environment}</td>
                <td>{key.usageStats.totalRequests.toLocaleString()}</td>
                <td>{new Date(key.createdAt.toDate()).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleRotateKey(key.id)}>
                    Rotate
                  </button>
                  <button onClick={() => handleRevokeKey(key.id)}>
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button onClick={() => handleCreateKey({
        name: "New API Key",
        scopes: ["read_leads"],
        environment: "development"
      })}>
        Create New Key
      </button>
    </div>
  );
}
```

## Best Practices

### 1. Key Management
- ✅ Create separate keys for each integration
- ✅ Use development keys for testing
- ✅ Rotate keys regularly (every 90 days)
- ✅ Revoke unused keys immediately
- ❌ Never hardcode keys in client-side code
- ❌ Never commit keys to Git

### 2. Security
- ✅ Use IP whitelisting for server-to-server integrations
- ✅ Set appropriate scopes (principle of least privilege)
- ✅ Set expiration dates for temporary integrations
- ✅ Monitor usage regularly for anomalies
- ❌ Don't share keys between environments
- ❌ Don't use production keys in development

### 3. Rate Limiting
- ✅ Set appropriate limits based on expected usage
- ✅ Implement exponential backoff in API clients
- ✅ Monitor usage to avoid hitting limits
- ✅ Request limit increases when needed

### 4. Error Handling
```javascript
try {
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (response.status === 401) {
    // Invalid or expired key
    console.error("API key invalid");
  } else if (response.status === 429) {
    // Rate limit exceeded
    console.error("Rate limit exceeded");
    // Implement exponential backoff
  } else if (response.status === 403) {
    // Permission denied
    console.error("Insufficient permissions");
  }
} catch (error) {
  console.error("API request failed:", error);
}
```

## Monitoring & Analytics

### View Usage Dashboard
Query Firestore for analytics:

```javascript
// Total requests per day (last 30 days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const logs = await db
  .collection('apiKeyUsageLogs')
  .where('apiKeyId', '==', keyId)
  .where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo))
  .get();

// Group by day
const dailyUsage = {};
logs.forEach(log => {
  const date = log.data().timestamp.toDate().toISOString().split('T')[0];
  dailyUsage[date] = (dailyUsage[date] || 0) + 1;
});

console.log("Daily usage:", dailyUsage);
```

### Set Up Alerts
```javascript
await updateApiKey({
  apiKeyId: keyId,
  updates: {
    alertThreshold: 80,  // Alert at 80% of rate limit
    webhookUrl: "https://your-app.com/api/alerts"
  }
});
```

## Troubleshooting

### "Invalid API key"
- Key is incorrect or has been revoked
- Check key format (should be `pk_live_` or `pk_test_`)
- Verify key in database

### "Rate limit exceeded"
- Too many requests in time window
- Implement exponential backoff
- Request higher rate limits

### "Insufficient permissions"
- API key doesn't have required scope
- Update key scopes or create new key with correct permissions

### "API key expired"
- Key has passed expiration date
- Rotate or create new key

## Deployment

1. Deploy Cloud Functions:
```bash
cd functions
npm install
firebase deploy --only functions
```

2. Create Firestore indexes (if prompted during deployment)

3. Set up scheduled cleanup:
```bash
firebase deploy --only functions:cleanupApiKeys
```

4. Test with a sample key:
```javascript
const result = await createApiKey({
  name: "Test Key",
  scopes: ["read_leads"],
  environment: "development",
  isTest: true
});
```

## Support

For issues or questions:
1. Check Firestore rules allow proper access
2. Verify Cloud Functions are deployed
3. Check Cloud Functions logs for errors
4. Ensure API key format is correct
5. Verify required scopes are set
