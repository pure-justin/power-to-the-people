# Client SDK Examples

Easy-to-use client SDK for interacting with the API key management system.

## Installation

No additional packages needed! Uses Firebase SDK which you already have installed.

## TypeScript SDK Wrapper

Create `src/services/apiKeyService.ts`:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Types
export interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  description?: string;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
  scopes: string[];
  environment: 'development' | 'production';
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
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface CreateApiKeyParams {
  name: string;
  description?: string;
  scopes: string[];
  environment?: 'development' | 'production';
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

export interface ApiKeyUsageLog {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  timestamp: Timestamp;
  errorMessage?: string;
}

class ApiKeyService {
  private functions = getFunctions();
  private db = getFirestore();

  /**
   * Create a new API key
   */
  async createApiKey(params: CreateApiKeyParams): Promise<{
    success: boolean;
    apiKeyId: string;
    apiKey: string; // IMPORTANT: Save this!
    keyPrefix: string;
    message: string;
  }> {
    const createApiKey = httpsCallable(this.functions, 'createApiKey');
    const result = await createApiKey(params);
    return result.data as any;
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(apiKeyId: string, reason?: string): Promise<void> {
    const revokeApiKey = httpsCallable(this.functions, 'revokeApiKey');
    await revokeApiKey({ apiKeyId, reason });
  }

  /**
   * Rotate an API key (generate new key)
   */
  async rotateApiKey(apiKeyId: string): Promise<{
    success: boolean;
    apiKeyId: string;
    apiKey: string; // IMPORTANT: Save this!
    keyPrefix: string;
    message: string;
  }> {
    const rotateApiKey = httpsCallable(this.functions, 'rotateApiKey');
    const result = await rotateApiKey({ apiKeyId });
    return result.data as any;
  }

  /**
   * Update API key settings
   */
  async updateApiKey(
    apiKeyId: string,
    updates: Partial<ApiKey>,
  ): Promise<void> {
    const updateApiKey = httpsCallable(this.functions, 'updateApiKey');
    await updateApiKey({ apiKeyId, updates });
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyUsage(
    apiKeyId: string,
    days: number = 7,
  ): Promise<{
    success: boolean;
    apiKeyId: string;
    usageStats: ApiKey['usageStats'];
    logs: ApiKeyUsageLog[];
    logCount: number;
  }> {
    const getApiKeyUsage = httpsCallable(this.functions, 'getApiKeyUsage');
    const result = await getApiKeyUsage({ apiKeyId, days });
    return result.data as any;
  }

  /**
   * Subscribe to user's API keys (real-time)
   */
  subscribeToApiKeys(
    callback: (keys: ApiKey[]) => void,
    statusFilter?: 'active' | 'suspended' | 'revoked' | 'expired',
  ): () => void {
    const user = getAuth().currentUser;
    if (!user) throw new Error('User not authenticated');

    let q = query(
      collection(this.db, 'apiKeys'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );

    if (statusFilter) {
      q = query(q, where('status', '==', statusFilter));
    }

    return onSnapshot(q, (snapshot) => {
      const keys = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ApiKey[];
      callback(keys);
    });
  }

  /**
   * Get all user's API keys (one-time fetch)
   */
  async getApiKeys(
    statusFilter?: 'active' | 'suspended' | 'revoked' | 'expired',
  ): Promise<ApiKey[]> {
    return new Promise((resolve, reject) => {
      const unsubscribe = this.subscribeToApiKeys((keys) => {
        unsubscribe();
        resolve(keys);
      }, statusFilter);
    });
  }

  /**
   * Validate API key format
   */
  isValidKeyFormat(key: string): boolean {
    return /^pk_(live|test)_[a-f0-9]{48}$/.test(key);
  }

  /**
   * Get usage percentage
   */
  getUsagePercentage(
    current: number,
    limit: number,
  ): { percentage: number; level: 'low' | 'medium' | 'high' | 'critical' } {
    const percentage = Math.round((current / limit) * 100);
    let level: 'low' | 'medium' | 'high' | 'critical';

    if (percentage < 50) level = 'low';
    else if (percentage < 75) level = 'medium';
    else if (percentage < 90) level = 'high';
    else level = 'critical';

    return { percentage, level };
  }

  /**
   * Format usage stats for display
   */
  formatUsageStats(stats: ApiKey['usageStats'], limits: ApiKey['rateLimit']) {
    return {
      minute: this.getUsagePercentage(
        stats.requestsThisMinute,
        limits.requestsPerMinute,
      ),
      hour: this.getUsagePercentage(
        stats.requestsThisHour,
        limits.requestsPerHour,
      ),
      day: this.getUsagePercentage(stats.requestsThisDay, limits.requestsPerDay),
      month: this.getUsagePercentage(
        stats.requestsThisMonth,
        limits.requestsPerMonth,
      ),
      total: stats.totalRequests,
    };
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();
```

## React Hooks

Create `src/hooks/useApiKeys.ts`:

```typescript
import { useState, useEffect } from 'react';
import { apiKeyService, ApiKey } from '../services/apiKeyService';

export function useApiKeys(statusFilter?: 'active' | 'suspended' | 'revoked' | 'expired') {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = apiKeyService.subscribeToApiKeys(
      (keys) => {
        setApiKeys(keys);
        setLoading(false);
      },
      statusFilter,
    );

    return () => {
      unsubscribe();
    };
  }, [statusFilter]);

  return { apiKeys, loading, error };
}

export function useApiKeyUsage(apiKeyId: string | null, days: number = 7) {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!apiKeyId) return;

    setLoading(true);
    setError(null);

    apiKeyService
      .getApiKeyUsage(apiKeyId, days)
      .then((data) => {
        setUsage(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [apiKeyId, days]);

  return { usage, loading, error };
}
```

## React Components

### API Key List Component

```typescript
import React from 'react';
import { useApiKeys } from '../hooks/useApiKeys';
import { apiKeyService } from '../services/apiKeyService';

export function ApiKeyList() {
  const { apiKeys, loading } = useApiKeys('active');
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  const handleRevoke = async (keyId: string, keyName: string) => {
    if (!confirm(`Revoke "${keyName}"? This cannot be undone.`)) return;

    try {
      await apiKeyService.revokeApiKey(keyId, 'Revoked by user');
      alert('API key revoked successfully');
    } catch (error) {
      alert(`Failed to revoke: ${error.message}`);
    }
  };

  const handleRotate = async (keyId: string, keyName: string) => {
    if (!confirm(`Generate new key for "${keyName}"? The old key will stop working.`)) return;

    try {
      const result = await apiKeyService.rotateApiKey(keyId);
      prompt('Save this new API key (shown only once):', result.apiKey);
    } catch (error) {
      alert(`Failed to rotate: ${error.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="api-key-list">
      <h2>API Keys</h2>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Key</th>
            <th>Environment</th>
            <th>Status</th>
            <th>Usage (Total)</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {apiKeys.map((key) => {
            const usage = apiKeyService.formatUsageStats(
              key.usageStats,
              key.rateLimit,
            );

            return (
              <tr key={key.id}>
                <td>
                  <strong>{key.name}</strong>
                  {key.description && (
                    <div className="text-sm text-gray-500">{key.description}</div>
                  )}
                </td>
                <td>
                  <code className="text-xs">{key.keyPrefix}</code>
                </td>
                <td>
                  <span className={`badge badge-${key.environment}`}>
                    {key.environment}
                  </span>
                </td>
                <td>
                  <span className={`status status-${key.status}`}>
                    {key.status}
                  </span>
                </td>
                <td>
                  {usage.total.toLocaleString()}
                  <div className="text-xs text-gray-500">
                    {usage.day.percentage}% of daily limit
                  </div>
                </td>
                <td>
                  {new Date(key.createdAt.toDate()).toLocaleDateString()}
                </td>
                <td className="actions">
                  <button
                    onClick={() => setSelectedKey(key.id)}
                    className="btn btn-sm btn-info"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleRotate(key.id, key.name)}
                    className="btn btn-sm btn-warning"
                  >
                    Rotate
                  </button>
                  <button
                    onClick={() => handleRevoke(key.id, key.name)}
                    className="btn btn-sm btn-danger"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedKey && (
        <ApiKeyDetails
          apiKeyId={selectedKey}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  );
}
```

### API Key Creation Form

```typescript
import React, { useState } from 'react';
import { apiKeyService } from '../services/apiKeyService';

export function CreateApiKeyForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    environment: 'development' as 'development' | 'production',
    scopes: [] as string[],
    expiresInDays: 365,
  });
  const [loading, setLoading] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const availableScopes = [
    { value: 'read_leads', label: 'Read Leads', description: 'View lead data' },
    { value: 'write_leads', label: 'Write Leads', description: 'Create/update leads' },
    { value: 'read_solar', label: 'Read Solar', description: 'View solar analysis' },
    { value: 'write_solar', label: 'Write Solar', description: 'Trigger solar analysis' },
    { value: 'read_smt', label: 'Read SMT', description: 'View SMT data' },
    { value: 'write_smt', label: 'Write SMT', description: 'Fetch SMT data' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.scopes.length === 0) {
      alert('Please select at least one scope');
      return;
    }

    setLoading(true);

    try {
      const result = await apiKeyService.createApiKey(formData);
      setNewApiKey(result.apiKey);
      setFormData({
        name: '',
        description: '',
        environment: 'development',
        scopes: [],
        expiresInDays: 365,
      });
      onSuccess?.();
    } catch (error) {
      alert(`Failed to create API key: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleScope = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  if (newApiKey) {
    return (
      <div className="alert alert-success">
        <h3>API Key Created!</h3>
        <p>Save this key securely. It will only be shown once:</p>
        <pre className="api-key-display">
          <code>{newApiKey}</code>
        </pre>
        <div className="actions">
          <button
            onClick={() => {
              navigator.clipboard.writeText(newApiKey);
              alert('Copied to clipboard!');
            }}
            className="btn btn-primary"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={() => setNewApiKey(null)}
            className="btn btn-secondary"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="create-api-key-form">
      <h2>Create API Key</h2>

      <div className="form-group">
        <label>Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="My API Key"
          required
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What will this key be used for?"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Environment *</label>
        <select
          value={formData.environment}
          onChange={(e) =>
            setFormData({
              ...formData,
              environment: e.target.value as 'development' | 'production',
            })
          }
        >
          <option value="development">Development</option>
          <option value="production">Production</option>
        </select>
      </div>

      <div className="form-group">
        <label>Scopes * (Select at least one)</label>
        <div className="scope-list">
          {availableScopes.map((scope) => (
            <label key={scope.value} className="scope-item">
              <input
                type="checkbox"
                checked={formData.scopes.includes(scope.value)}
                onChange={() => toggleScope(scope.value)}
              />
              <div>
                <strong>{scope.label}</strong>
                <div className="text-sm text-gray-500">{scope.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Expires in (days)</label>
        <input
          type="number"
          value={formData.expiresInDays}
          onChange={(e) =>
            setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })
          }
          min={1}
          max={3650}
        />
        <small className="text-gray-500">
          Key will automatically expire after this many days
        </small>
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? 'Creating...' : 'Create API Key'}
      </button>
    </form>
  );
}
```

### Usage Dashboard Component

```typescript
import React from 'react';
import { useApiKeyUsage } from '../hooks/useApiKeys';
import { apiKeyService } from '../services/apiKeyService';

export function ApiKeyUsageDashboard({ apiKeyId }: { apiKeyId: string }) {
  const [days, setDays] = React.useState(7);
  const { usage, loading } = useApiKeyUsage(apiKeyId, days);

  if (loading) return <div>Loading usage data...</div>;
  if (!usage) return <div>No usage data available</div>;

  const formatted = apiKeyService.formatUsageStats(
    usage.usageStats,
    usage.rateLimit,
  );

  return (
    <div className="usage-dashboard">
      <div className="usage-header">
        <h3>Usage Statistics</h3>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="usage-stats">
        <div className="stat-card">
          <h4>Minute</h4>
          <div className="stat-value">
            {usage.usageStats.requestsThisMinute} / {usage.rateLimit.requestsPerMinute}
          </div>
          <div className="stat-bar">
            <div
              className={`stat-fill stat-fill-${formatted.minute.level}`}
              style={{ width: `${formatted.minute.percentage}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <h4>Hour</h4>
          <div className="stat-value">
            {usage.usageStats.requestsThisHour} / {usage.rateLimit.requestsPerHour}
          </div>
          <div className="stat-bar">
            <div
              className={`stat-fill stat-fill-${formatted.hour.level}`}
              style={{ width: `${formatted.hour.percentage}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <h4>Day</h4>
          <div className="stat-value">
            {usage.usageStats.requestsThisDay} / {usage.rateLimit.requestsPerDay}
          </div>
          <div className="stat-bar">
            <div
              className={`stat-fill stat-fill-${formatted.day.level}`}
              style={{ width: `${formatted.day.percentage}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <h4>Month</h4>
          <div className="stat-value">
            {usage.usageStats.requestsThisMonth} / {usage.rateLimit.requestsPerMonth}
          </div>
          <div className="stat-bar">
            <div
              className={`stat-fill stat-fill-${formatted.month.level}`}
              style={{ width: `${formatted.month.percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="usage-logs">
        <h4>Recent Requests</h4>
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
            {usage.logs.slice(0, 10).map((log: any) => (
              <tr key={log.id}>
                <td>{new Date(log.timestamp.toDate()).toLocaleString()}</td>
                <td>{log.endpoint}</td>
                <td>{log.method}</td>
                <td>
                  <span className={`status-code status-${Math.floor(log.statusCode / 100)}`}>
                    {log.statusCode}
                  </span>
                </td>
                <td>{log.responseTime}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Node.js Client

For server-side integrations:

```javascript
// apiClient.js
const axios = require('axios');

class PowerToThePeopleClient {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://us-central1-YOUR-PROJECT.cloudfunctions.net';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createLead(leadData) {
    try {
      const response = await this.client.post('/secureLeadWebhook', leadData);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getLeads(status, limit = 10, offset = 0) {
    try {
      const response = await this.client.get('/secureLeadQuery', {
        params: { status, limit, offset },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async analyzeSolar(address, leadId = null) {
    try {
      const response = await this.client.post('/secureSolarWebhook', {
        address,
        leadId,
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        throw new Error('Invalid API key');
      } else if (status === 403) {
        throw new Error(`Permission denied: ${data.error}`);
      } else if (status === 429) {
        throw new Error(`Rate limit exceeded: ${data.error}`);
      } else {
        throw new Error(data.error || 'API request failed');
      }
    } else {
      throw error;
    }
  }
}

module.exports = PowerToThePeopleClient;

// Usage
const client = new PowerToThePeopleClient('pk_live_...');

// Create a lead
const lead = await client.createLead({
  customerName: 'John Doe',
  email: 'john@example.com',
  phone: '555-0123',
  address: '123 Main St',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
});

// Get leads
const leads = await client.getLeads('submitted', 20);

// Analyze solar potential
const solarData = await client.analyzeSolar('123 Main St, Austin, TX 78701');
```

## Complete Example App

See the full working example in `/examples/api-key-dashboard/` which includes:
- Complete React dashboard
- API key management UI
- Usage monitoring
- Real-time updates
- Rate limit alerts
- Error handling

Run the example:
```bash
cd examples/api-key-dashboard
npm install
npm start
```
