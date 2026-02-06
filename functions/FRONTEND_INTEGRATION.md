# Frontend Integration Guide

How to integrate API key management into your React/Vite frontend.

## Setup

### 1. Install Firebase SDK

```bash
npm install firebase
```

### 2. Initialize Firebase (if not already done)

```javascript
// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const auth = getAuth(app);

export { app, functions, auth };
```

## API Key Management Service

Create a service to handle all API key operations:

```javascript
// src/services/apiKeyService.js
import { functions, auth } from './firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Create a new API key
 */
export async function createApiKey(config) {
  const createKeyFn = httpsCallable(functions, 'createApiKey');

  try {
    const result = await createKeyFn({
      name: config.name,
      description: config.description,
      scopes: config.scopes,
      environment: config.environment || 'development',
      expiresInDays: config.expiresInDays,
      rateLimit: config.rateLimit,
      allowedIps: config.allowedIps,
      allowedDomains: config.allowedDomains
    });

    return result.data;
  } catch (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }
}

/**
 * Validate an API key
 */
export async function validateApiKey(apiKey, requiredScope = null) {
  const validateFn = httpsCallable(functions, 'validateApiKey');

  try {
    const result = await validateFn({
      apiKey,
      requiredScope,
      endpoint: window.location.pathname
    });

    return result.data;
  } catch (error) {
    throw new Error(`Invalid API key: ${error.message}`);
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(apiKeyId, reason) {
  const revokeFn = httpsCallable(functions, 'revokeApiKey');

  try {
    const result = await revokeFn({
      apiKeyId,
      reason
    });

    return result.data;
  } catch (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`);
  }
}

/**
 * Rotate an API key
 */
export async function rotateApiKey(apiKeyId) {
  const rotateFn = httpsCallable(functions, 'rotateApiKey');

  try {
    const result = await rotateFn({ apiKeyId });
    return result.data;
  } catch (error) {
    throw new Error(`Failed to rotate API key: ${error.message}`);
  }
}

/**
 * Update API key settings
 */
export async function updateApiKey(apiKeyId, updates) {
  const updateFn = httpsCallable(functions, 'updateApiKey');

  try {
    const result = await updateFn({
      apiKeyId,
      updates
    });

    return result.data;
  } catch (error) {
    throw new Error(`Failed to update API key: ${error.message}`);
  }
}

/**
 * Get API key usage statistics
 */
export async function getApiKeyUsage(apiKeyId, days = 7) {
  const getUsageFn = httpsCallable(functions, 'getApiKeyUsage');

  try {
    const result = await getUsageFn({
      apiKeyId,
      days
    });

    return result.data;
  } catch (error) {
    throw new Error(`Failed to get usage: ${error.message}`);
  }
}

/**
 * Get user's API keys from Firestore
 */
export async function getUserApiKeys() {
  const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
  const db = getFirestore();

  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const q = query(
    collection(db, 'apiKeys'),
    where('userId', '==', user.uid),
    where('status', '!=', 'revoked')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

## React Components

### API Key Creation Form

```javascript
// src/components/ApiKeyCreator.jsx
import { useState } from 'react';
import { createApiKey } from '../services/apiKeyService';

const AVAILABLE_SCOPES = [
  { value: 'read_leads', label: 'Read Leads' },
  { value: 'write_leads', label: 'Write Leads' },
  { value: 'read_solar', label: 'Read Solar Data' },
  { value: 'write_solar', label: 'Write Solar Data' },
  { value: 'read_smt', label: 'Read SMT Data' },
  { value: 'write_smt', label: 'Write SMT Data' },
  { value: 'admin', label: 'Admin (Full Access)' }
];

export default function ApiKeyCreator() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState('development');
  const [scopes, setScopes] = useState(['read_leads']);
  const [expiresInDays, setExpiresInDays] = useState(365);
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createApiKey({
        name,
        description,
        environment,
        scopes,
        expiresInDays: expiresInDays || undefined
      });

      setCreatedKey(result);
      // Reset form
      setName('');
      setDescription('');
      setScopes(['read_leads']);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(createdKey.apiKey);
    alert('API key copied to clipboard!');
  };

  return (
    <div className="api-key-creator">
      <h2>Create New API Key</h2>

      {createdKey && (
        <div className="success-message">
          <h3>✅ API Key Created!</h3>
          <p><strong>IMPORTANT:</strong> Save this key now. It will not be shown again.</p>

          <div className="key-display">
            <code>{createdKey.apiKey}</code>
            <button onClick={copyToClipboard}>Copy</button>
          </div>

          <button onClick={() => setCreatedKey(null)}>Create Another</button>
        </div>
      )}

      {!createdKey && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production API Key"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Used for..."
            />
          </div>

          <div className="form-group">
            <label>Environment *</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
            >
              <option value="development">Development</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div className="form-group">
            <label>Scopes *</label>
            <div className="checkbox-group">
              {AVAILABLE_SCOPES.map(scope => (
                <label key={scope.value}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setScopes([...scopes, scope.value]);
                      } else {
                        setScopes(scopes.filter(s => s !== scope.value));
                      }
                    }}
                  />
                  {scope.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Expires In (days)</label>
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value) || '')}
              placeholder="365"
            />
            <small>Leave empty for no expiration</small>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create API Key'}
          </button>
        </form>
      )}
    </div>
  );
}
```

### API Key List

```javascript
// src/components/ApiKeyList.jsx
import { useState, useEffect } from 'react';
import { getUserApiKeys, revokeApiKey, getApiKeyUsage } from '../services/apiKeyService';

export default function ApiKeyList() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const apiKeys = await getUserApiKeys();
      setKeys(apiKeys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (apiKeyId, name) => {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await revokeApiKey(apiKeyId, 'Revoked by user');
      await loadKeys();
    } catch (error) {
      alert('Failed to revoke key: ' + error.message);
    }
  };

  const viewUsage = async (apiKeyId) => {
    try {
      const usageData = await getApiKeyUsage(apiKeyId, 30);
      setUsage(usageData);
      setSelectedKey(apiKeyId);
    } catch (error) {
      alert('Failed to load usage: ' + error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="api-key-list">
      <h2>Your API Keys</h2>

      {keys.length === 0 ? (
        <p>No API keys yet. Create one to get started.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Environment</th>
              <th>Scopes</th>
              <th>Status</th>
              <th>Requests</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(key => (
              <tr key={key.id}>
                <td>{key.name}</td>
                <td><code>{key.keyPrefix}</code></td>
                <td>
                  <span className={`env-badge ${key.environment}`}>
                    {key.environment}
                  </span>
                </td>
                <td>{key.scopes.join(', ')}</td>
                <td>
                  <span className={`status-badge ${key.status}`}>
                    {key.status}
                  </span>
                </td>
                <td>{key.usageStats?.totalRequests || 0}</td>
                <td>
                  {new Date(key.createdAt.seconds * 1000).toLocaleDateString()}
                </td>
                <td>
                  <button onClick={() => viewUsage(key.id)}>
                    View Usage
                  </button>
                  <button
                    onClick={() => handleRevoke(key.id, key.name)}
                    className="danger"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Usage Modal */}
      {selectedKey && usage && (
        <div className="usage-modal">
          <div className="modal-content">
            <h3>Usage Statistics</h3>

            <div className="usage-stats">
              <div className="stat">
                <span>Total Requests</span>
                <strong>{usage.usageStats.totalRequests}</strong>
              </div>
              <div className="stat">
                <span>This Month</span>
                <strong>{usage.usageStats.requestsThisMonth}</strong>
              </div>
              <div className="stat">
                <span>This Day</span>
                <strong>{usage.usageStats.requestsThisDay}</strong>
              </div>
            </div>

            <h4>Recent Activity</h4>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Endpoint</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Response Time</th>
                </tr>
              </thead>
              <tbody>
                {usage.logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      {new Date(log.timestamp.seconds * 1000).toLocaleString()}
                    </td>
                    <td>{log.endpoint}</td>
                    <td>{log.method}</td>
                    <td>{log.statusCode}</td>
                    <td>{log.responseTime}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={() => setSelectedKey(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### API Key Dashboard

```javascript
// src/pages/ApiKeyDashboard.jsx
import ApiKeyCreator from '../components/ApiKeyCreator';
import ApiKeyList from '../components/ApiKeyList';

export default function ApiKeyDashboard() {
  return (
    <div className="api-key-dashboard">
      <h1>API Key Management</h1>

      <div className="dashboard-grid">
        <div className="section">
          <ApiKeyCreator />
        </div>

        <div className="section">
          <ApiKeyList />
        </div>
      </div>
    </div>
  );
}
```

## Making API Requests with Keys

### Client-side (not recommended for sensitive operations)

```javascript
// Only for read-only operations
async function fetchLeadsWithApiKey(apiKey) {
  const response = await fetch(
    'https://your-project.cloudfunctions.net/yourProtectedFunction',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.json();
}
```

### Server-side (recommended)

Store API keys in environment variables on your server:

```bash
# .env (server)
FIREBASE_API_KEY=pk_live_abc123...
```

```javascript
// server.js (Node.js)
const apiKey = process.env.FIREBASE_API_KEY;

async function makeProtectedRequest(data) {
  const response = await fetch(
    'https://your-project.cloudfunctions.net/protectedFunction',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );

  return response.json();
}
```

## Error Handling

```javascript
try {
  const result = await createApiKey({ ... });
} catch (error) {
  switch (error.code) {
    case 'unauthenticated':
      // User not logged in
      router.push('/login');
      break;

    case 'resource-exhausted':
      // Rate limit exceeded
      alert('Rate limit exceeded. Please try again later.');
      break;

    case 'permission-denied':
      // Insufficient permissions
      alert('You do not have permission to perform this action.');
      break;

    default:
      alert('An error occurred: ' + error.message);
  }
}
```

## Security Best Practices

1. **Never expose production keys in frontend code**
2. **Use environment-specific keys** (dev vs prod)
3. **Implement key rotation** every 90 days
4. **Monitor usage regularly** for suspicious activity
5. **Revoke compromised keys immediately**
6. **Use IP whitelisting** for server-to-server APIs
7. **Store keys securely** (environment variables, secret managers)

## Testing with Emulator

```javascript
// src/services/firebase.js
import { connectFunctionsEmulator } from 'firebase/functions';

if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

Then start the emulator:

```bash
cd functions
npm run serve
```
