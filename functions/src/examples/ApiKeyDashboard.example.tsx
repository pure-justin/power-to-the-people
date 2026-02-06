/**
 * API Key Dashboard - Example React Component
 *
 * This is a reference implementation showing how to build
 * a complete API key management UI.
 *
 * Copy this to your React app's components folder.
 */

import React, { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

// TypeScript interfaces
interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  description?: string;
  status: "active" | "suspended" | "revoked" | "expired";
  scopes: string[];
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
  };
  createdAt: { seconds: number };
  lastUsedAt?: { seconds: number };
}

export function ApiKeyDashboard() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);

  const functions = getFunctions();

  // Load API keys from Firestore
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      // You'll need to create a Cloud Function to list user's API keys
      // For now, we'll use Firestore directly
      const { getFirestore, collection, query, where, getDocs } =
        await import("firebase/firestore");
      const { getAuth } = await import("firebase/auth");

      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Not authenticated");
      }

      const q = query(
        collection(db, "apiKeys"),
        where("userId", "==", user.uid),
      );

      const snapshot = await getDocs(q);
      const keys = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ApiKey[];

      setApiKeys(keys);
    } catch (error) {
      console.error("Failed to load API keys:", error);
      alert("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (keyData: any) => {
    try {
      const createApiKey = httpsCallable(functions, "createApiKey");
      const result = await createApiKey(keyData);

      // Show the API key in a modal (only time it's shown!)
      const apiKey = (result.data as any).apiKey;
      const confirmed = window.confirm(
        `⚠️ SAVE THIS API KEY IMMEDIATELY ⚠️\n\n${apiKey}\n\nIt will NEVER be shown again!\n\nClick OK after you've saved it.`,
      );

      if (confirmed) {
        setShowCreateModal(false);
        loadApiKeys();
      }
    } catch (error: any) {
      console.error("Failed to create API key:", error);
      alert(`Failed to create API key: ${error.message}`);
    }
  };

  const handleRotateKey = async (apiKeyId: string) => {
    const confirmed = window.confirm(
      "This will generate a new API key and invalidate the old one.\n\nAny apps using the old key will stop working!\n\nContinue?",
    );

    if (!confirmed) return;

    try {
      const rotateApiKey = httpsCallable(functions, "rotateApiKey");
      const result = await rotateApiKey({ apiKeyId });

      const newKey = (result.data as any).apiKey;
      alert(
        `⚠️ NEW API KEY ⚠️\n\n${newKey}\n\nUpdate your apps immediately!\n\nThe old key is now invalid.`,
      );

      loadApiKeys();
    } catch (error: any) {
      console.error("Failed to rotate key:", error);
      alert(`Failed to rotate key: ${error.message}`);
    }
  };

  const handleRevokeKey = async (apiKeyId: string) => {
    const reason = window.prompt("Reason for revoking this key?");
    if (!reason) return;

    try {
      const revokeApiKey = httpsCallable(functions, "revokeApiKey");
      await revokeApiKey({ apiKeyId, reason });

      alert("API key revoked successfully");
      loadApiKeys();
    } catch (error: any) {
      console.error("Failed to revoke key:", error);
      alert(`Failed to revoke key: ${error.message}`);
    }
  };

  const viewUsage = async (apiKeyId: string) => {
    try {
      const getApiKeyUsage = httpsCallable(functions, "getApiKeyUsage");
      const result = await getApiKeyUsage({ apiKeyId, days: 30 });

      setSelectedKey(apiKeys.find((k) => k.id === apiKeyId) || null);
      // You would show this in a modal with charts
      console.log("Usage data:", result.data);
    } catch (error: any) {
      console.error("Failed to get usage:", error);
      alert(`Failed to get usage: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading API keys...</div>;
  }

  return (
    <div className="api-key-dashboard">
      <div className="header">
        <h1>API Keys</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          Create New API Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="empty-state">
          <p>No API keys yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="api-keys-grid">
          {apiKeys.map((key) => (
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              onRotate={() => handleRotateKey(key.id)}
              onRevoke={() => handleRevokeKey(key.id)}
              onViewUsage={() => viewUsage(key.id)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateApiKeyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateKey}
        />
      )}
    </div>
  );
}

// API Key Card Component
function ApiKeyCard({ apiKey, onRotate, onRevoke, onViewUsage }: any) {
  const usagePercent = Math.round(
    (apiKey.usageStats.requestsThisMonth / apiKey.rateLimit.requestsPerMonth) *
      100,
  );

  const statusColors = {
    active: "#10b981",
    suspended: "#f59e0b",
    revoked: "#ef4444",
    expired: "#6b7280",
  };

  return (
    <div className="api-key-card">
      <div className="card-header">
        <div>
          <h3>{apiKey.name}</h3>
          <code className="key-prefix">{apiKey.keyPrefix}</code>
        </div>
        <span
          className="status-badge"
          style={{ backgroundColor: statusColors[apiKey.status] }}
        >
          {apiKey.status}
        </span>
      </div>

      {apiKey.description && (
        <p className="description">{apiKey.description}</p>
      )}

      <div className="key-info">
        <div className="info-row">
          <span className="label">Environment:</span>
          <span className="value">
            {apiKey.environment === "production"
              ? "🔴 Production"
              : "🟡 Development"}
          </span>
        </div>

        <div className="info-row">
          <span className="label">Scopes:</span>
          <span className="value">{apiKey.scopes.join(", ")}</span>
        </div>

        <div className="info-row">
          <span className="label">Created:</span>
          <span className="value">
            {new Date(apiKey.createdAt.seconds * 1000).toLocaleDateString()}
          </span>
        </div>

        {apiKey.lastUsedAt && (
          <div className="info-row">
            <span className="label">Last used:</span>
            <span className="value">
              {new Date(apiKey.lastUsedAt.seconds * 1000).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="usage-stats">
        <h4>Usage This Month</h4>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(usagePercent, 100)}%`,
              backgroundColor: usagePercent > 90 ? "#ef4444" : "#10b981",
            }}
          />
        </div>
        <p className="usage-text">
          {apiKey.usageStats.requestsThisMonth.toLocaleString()} /{" "}
          {apiKey.rateLimit.requestsPerMonth.toLocaleString()} requests (
          {usagePercent}%)
        </p>
      </div>

      <div className="card-actions">
        <button onClick={onViewUsage} className="btn-secondary">
          View Usage
        </button>
        {apiKey.status === "active" && (
          <>
            <button onClick={onRotate} className="btn-secondary">
              Rotate Key
            </button>
            <button onClick={onRevoke} className="btn-danger">
              Revoke
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Create API Key Modal
function CreateApiKeyModal({ onClose, onCreate }: any) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    environment: "development" as "development" | "production",
    scopes: [] as string[],
    expiresInDays: 0,
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      requestsPerMonth: 10000,
    },
  });

  const availableScopes = [
    { value: "read_leads", label: "Read Leads" },
    { value: "write_leads", label: "Write Leads" },
    { value: "read_solar", label: "Read Solar Data" },
    { value: "write_solar", label: "Write Solar Data" },
    { value: "read_smt", label: "Read SMT Data" },
    { value: "write_smt", label: "Write SMT Data" },
    { value: "admin", label: "Admin (Full Access)" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.scopes.length === 0) {
      alert("Please enter a name and select at least one scope");
      return;
    }

    onCreate({
      ...formData,
      expiresInDays: formData.expiresInDays || undefined,
    });
  };

  const toggleScope = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create New API Key</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Production API Key"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Main API key for production website"
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
                  environment: e.target.value as "development" | "production",
                })
              }
            >
              <option value="development">Development</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div className="form-group">
            <label>Scopes * (select at least one)</label>
            <div className="checkbox-group">
              {availableScopes.map((scope) => (
                <label key={scope.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.scopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                  />
                  {scope.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Expires In (days) - 0 = never</label>
            <input
              type="number"
              value={formData.expiresInDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expiresInDays: parseInt(e.target.value),
                })
              }
              min="0"
              max="3650"
            />
          </div>

          <div className="form-group">
            <label>Rate Limits</label>
            <div className="rate-limit-grid">
              <div>
                <label>Per Minute</label>
                <input
                  type="number"
                  value={formData.rateLimit.requestsPerMinute}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rateLimit: {
                        ...formData.rateLimit,
                        requestsPerMinute: parseInt(e.target.value),
                      },
                    })
                  }
                  min="1"
                />
              </div>
              <div>
                <label>Per Hour</label>
                <input
                  type="number"
                  value={formData.rateLimit.requestsPerHour}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rateLimit: {
                        ...formData.rateLimit,
                        requestsPerHour: parseInt(e.target.value),
                      },
                    })
                  }
                  min="1"
                />
              </div>
              <div>
                <label>Per Day</label>
                <input
                  type="number"
                  value={formData.rateLimit.requestsPerDay}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rateLimit: {
                        ...formData.rateLimit,
                        requestsPerDay: parseInt(e.target.value),
                      },
                    })
                  }
                  min="1"
                />
              </div>
              <div>
                <label>Per Month</label>
                <input
                  type="number"
                  value={formData.rateLimit.requestsPerMonth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rateLimit: {
                        ...formData.rateLimit,
                        requestsPerMonth: parseInt(e.target.value),
                      },
                    })
                  }
                  min="1"
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create API Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Minimal CSS (add to your styles)
const styles = `
.api-key-dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.api-keys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.api-key-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  background: white;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.key-prefix {
  font-family: monospace;
  font-size: 0.875rem;
  color: #6b7280;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
}

.usage-stats {
  margin: 1rem 0;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
}

.rate-limit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger {
  background: #ef4444;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
`;
