/**
 * API Key Integration Examples
 *
 * This file demonstrates how to integrate API key authentication
 * into your Cloud Functions and client applications.
 */

import * as functions from "firebase-functions/v1";
import { validateApiKeyFromRequest, ApiKeyScope } from "../apiKeys";

/**
 * Example 1: Protected HTTP Endpoint with API Key
 *
 * Usage:
 * curl -X GET \
 *   https://us-central1-PROJECT_ID.cloudfunctions.net/getLeadsApi \
 *   -H "Authorization: Bearer pk_live_abc123..."
 */
export const getLeadsApi = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    // Validate API key and check for read_leads scope
    const apiKeyData = await validateApiKeyFromRequest(
      req,
      ApiKeyScope.READ_LEADS,
    );

    // API key is valid! Proceed with business logic
    console.log(`Request from user ${apiKeyData.userId}`);

    // Example: Get leads from Firestore
    const admin = require("firebase-admin");
    const db = admin.firestore();

    const leadsSnapshot = await db
      .collection("leads")
      .where("userId", "==", apiKeyData.userId)
      .limit(100)
      .get();

    const leads = leadsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      count: leads.length,
      data: leads,
      usage: {
        requestsThisHour: apiKeyData.usageStats.requestsThisHour,
        requestsThisDay: apiKeyData.usageStats.requestsThisDay,
        requestsThisMonth: apiKeyData.usageStats.requestsThisMonth,
      },
    });
  } catch (error: any) {
    // Handle authentication errors
    if (error.code === "unauthenticated") {
      res.status(401).json({
        success: false,
        error: "Invalid or missing API key",
      });
      return;
    }

    if (error.code === "permission-denied") {
      res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (error.code === "resource-exhausted") {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded. Please try again later.",
      });
      return;
    }

    // Internal server error
    console.error("Get leads API error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Example 2: Create Lead API with Write Permissions
 *
 * Usage:
 * curl -X POST \
 *   https://us-central1-PROJECT_ID.cloudfunctions.net/createLeadApi \
 *   -H "Authorization: Bearer pk_live_abc123..." \
 *   -H "Content-Type: application/json" \
 *   -d '{"name": "John Doe", "email": "john@example.com"}'
 */
export const createLeadApi = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Validate API key and check for write_leads scope
    const apiKeyData = await validateApiKeyFromRequest(
      req,
      ApiKeyScope.WRITE_LEADS,
    );

    // Validate request body
    const { name, email, phone, address, estimatedUsage } = req.body;

    if (!name || !email) {
      res.status(400).json({
        success: false,
        error: "Name and email are required",
      });
      return;
    }

    // Create lead in Firestore
    const admin = require("firebase-admin");
    const db = admin.firestore();

    const leadRef = db.collection("leads").doc();
    const newLead = {
      id: leadRef.id,
      name,
      email,
      phone: phone || null,
      address: address || null,
      estimatedUsage: estimatedUsage || null,
      userId: apiKeyData.userId,
      status: "new",
      source: "api",
      apiKeyId: apiKeyData.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await leadRef.set(newLead);

    res.status(201).json({
      success: true,
      leadId: leadRef.id,
      data: newLead,
    });
  } catch (error: any) {
    // Error handling (same as above)
    if (error.code === "unauthenticated") {
      res.status(401).json({ success: false, error: "Invalid API key" });
      return;
    }

    if (error.code === "permission-denied") {
      res.status(403).json({ success: false, error: error.message });
      return;
    }

    if (error.code === "resource-exhausted") {
      res.status(429).json({ success: false, error: "Rate limit exceeded" });
      return;
    }

    console.error("Create lead API error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * Example 3: Admin-Only Endpoint
 *
 * Only allows API keys with ADMIN scope
 */
export const adminStatsApi = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    // Require ADMIN scope
    const apiKeyData = await validateApiKeyFromRequest(req, ApiKeyScope.ADMIN);

    // Admin-only business logic
    const admin = require("firebase-admin");
    const db = admin.firestore();

    // Get all-time stats
    const leadsSnapshot = await db.collection("leads").get();
    const apiKeysSnapshot = await db.collection("apiKeys").get();

    const stats = {
      totalLeads: leadsSnapshot.size,
      totalApiKeys: apiKeysSnapshot.size,
      activeApiKeys: apiKeysSnapshot.docs.filter(
        (doc: any) => doc.data().status === "active",
      ).length,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    if (error.code === "permission-denied") {
      res.status(403).json({
        success: false,
        error: "Admin access required",
      });
      return;
    }

    console.error("Admin stats error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * Example 4: Client-Side Integration (JavaScript)
 *
 * Use this in your frontend or Node.js app
 */

/*
// Store API key securely (environment variable)
const API_KEY = process.env.POWER_TO_THE_PEOPLE_API_KEY;
const API_BASE_URL = "https://us-central1-PROJECT_ID.cloudfunctions.net";

// Helper function to make authenticated API calls
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

// Example: Get leads
async function getLeads() {
  const result = await apiCall("/getLeadsApi");
  console.log("Leads:", result.data);
  console.log("Usage:", result.usage);
  return result.data;
}

// Example: Create lead
async function createLead(leadData) {
  const result = await apiCall("/createLeadApi", {
    method: "POST",
    body: JSON.stringify(leadData),
  });
  console.log("Created lead:", result.leadId);
  return result.data;
}

// Example: Handle rate limits
async function makeRequestWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes("Rate limit exceeded")) {
        console.log(`Rate limited. Retry ${i + 1}/${maxRetries} in 60s...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

// Usage
makeRequestWithRetry(() => getLeads())
  .then(leads => console.log("Success:", leads))
  .catch(error => console.error("Failed:", error));
*/

/**
 * Example 5: React Hook for API Key Management
 */

/*
import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export function useApiKeys() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const functions = getFunctions();

  const createKey = useCallback(async (keyData) => {
    setLoading(true);
    setError(null);

    try {
      const createApiKey = httpsCallable(functions, 'createApiKey');
      const result = await createApiKey(keyData);

      // IMPORTANT: User must save this API key NOW
      alert(`Save this key: ${result.data.apiKey}\n\nIt will never be shown again!`);

      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [functions]);

  const rotateKey = useCallback(async (apiKeyId) => {
    setLoading(true);
    setError(null);

    try {
      const rotateApiKey = httpsCallable(functions, 'rotateApiKey');
      const result = await rotateApiKey({ apiKeyId });

      alert(`New key: ${result.data.apiKey}\n\nUpdate your apps immediately!`);

      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [functions]);

  const revokeKey = useCallback(async (apiKeyId, reason) => {
    setLoading(true);
    setError(null);

    try {
      const revokeApiKey = httpsCallable(functions, 'revokeApiKey');
      await revokeApiKey({ apiKeyId, reason });

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [functions]);

  const getUsage = useCallback(async (apiKeyId, days = 7) => {
    setLoading(true);
    setError(null);

    try {
      const getApiKeyUsage = httpsCallable(functions, 'getApiKeyUsage');
      const result = await getApiKeyUsage({ apiKeyId, days });

      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [functions]);

  return {
    loading,
    error,
    createKey,
    rotateKey,
    revokeKey,
    getUsage,
  };
}

// Usage in component:
function ApiKeyManager() {
  const { createKey, loading } = useApiKeys();

  const handleCreateKey = async () => {
    const newKey = await createKey({
      name: "My API Key",
      scopes: ["read_leads", "write_leads"],
      environment: "production",
    });

    console.log("Created:", newKey.keyPrefix);
  };

  return (
    <button onClick={handleCreateKey} disabled={loading}>
      {loading ? "Creating..." : "Create API Key"}
    </button>
  );
}
*/

/**
 * Example 6: Python Integration
 */

/*
import requests
import os
from typing import Optional, Dict, Any

class PowerToThePeopleClient:
    """Python client for Power to the People API"""

    def __init__(self, api_key: str, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url or "https://us-central1-PROJECT_ID.cloudfunctions.net"
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })

    def get_leads(self) -> Dict[str, Any]:
        """Get all leads"""
        response = self.session.get(f"{self.base_url}/getLeadsApi")
        response.raise_for_status()
        return response.json()

    def create_lead(self, name: str, email: str, **kwargs) -> Dict[str, Any]:
        """Create a new lead"""
        data = {
            "name": name,
            "email": email,
            **kwargs
        }
        response = self.session.post(
            f"{self.base_url}/createLeadApi",
            json=data
        )
        response.raise_for_status()
        return response.json()

# Usage
client = PowerToThePeopleClient(os.getenv("POWER_API_KEY"))

# Get leads
leads_result = client.get_leads()
print(f"Found {leads_result['count']} leads")

# Create lead
new_lead = client.create_lead(
    name="Jane Doe",
    email="jane@example.com",
    phone="555-1234",
    estimatedUsage=12000
)
print(f"Created lead: {new_lead['leadId']}")
*/
