/**
 * Webhook Service
 * Wraps HTTP API endpoints for webhook registration, management,
 * and test delivery.
 */

import { getAuth } from "firebase/auth";

const API_BASE =
  "https://us-central1-power-to-the-people-vpp.cloudfunctions.net/webhookApi";

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function getAuthHeaders() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ─── Generic Fetch Wrapper ────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const headers = await getAuthHeaders();
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

// ─── Webhook CRUD ─────────────────────────────────────────────────────────────

export async function getWebhooks() {
  return apiFetch("");
}

export async function createWebhook(data) {
  return apiFetch("", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWebhook(id, data) {
  return apiFetch(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteWebhook(id) {
  return apiFetch(`/${id}`, {
    method: "DELETE",
  });
}

// ─── Test Delivery ────────────────────────────────────────────────────────────

export async function testWebhook(data) {
  return apiFetch("/test", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
