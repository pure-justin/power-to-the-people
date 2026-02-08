/**
 * API Key Service
 * Client-side wrapper for API Key management Cloud Functions + Firestore queries
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { db, collection, query, where, orderBy, getDocs } from "./firebase";
import { getAuth } from "firebase/auth";
import app from "./firebase";

const functions = getFunctions(app, "us-central1");

/**
 * Create a new API key
 * The full key is only returned once at creation time -- it cannot be retrieved again.
 * @param {Object} options - Key creation options
 * @param {string} options.name - Human-readable name for the key
 * @param {string} [options.description] - Optional description
 * @param {string[]} [options.scopes] - Permission scopes (e.g. ["read_solar", "read_equipment"])
 * @param {string} [options.environment] - "development" or "production"
 * @returns {Promise<Object>} { success, data: { key, prefix }, error }
 */
export async function createApiKey({ name, description, scopes, environment }) {
  try {
    const callable = httpsCallable(functions, "createApiKey");
    const result = await callable({ name, description, scopes, environment });
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error creating API key:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Revoke an API key permanently
 * @param {string} apiKeyId - The Firestore document ID of the API key
 * @returns {Promise<Object>} { success, data, error }
 */
export async function revokeApiKey(apiKeyId) {
  try {
    const callable = httpsCallable(functions, "revokeApiKey");
    const result = await callable({ apiKeyId });
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error revoking API key:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Rotate an API key (generates a new key value, same document ID)
 * @param {string} apiKeyId - The Firestore document ID of the API key
 * @returns {Promise<Object>} { success, data: { key, prefix }, error }
 */
export async function rotateApiKey(apiKeyId) {
  try {
    const callable = httpsCallable(functions, "rotateApiKey");
    const result = await callable({ apiKeyId });
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error rotating API key:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update API key settings (name, scopes, rate limit, etc.)
 * @param {string} apiKeyId - The Firestore document ID of the API key
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New name
 * @param {string[]} [updates.scopes] - New scopes
 * @param {number} [updates.rateLimit] - New rate limit (requests per minute)
 * @returns {Promise<Object>} { success, data, error }
 */
export async function updateApiKey(apiKeyId, updates) {
  try {
    const callable = httpsCallable(functions, "updateApiKey");
    const result = await callable({ apiKeyId, ...updates });
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error updating API key:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get usage statistics and recent logs for an API key
 * @param {string} apiKeyId - The Firestore document ID of the API key
 * @param {Object} [options] - Query options
 * @param {string} [options.period] - Time period: "day", "week", "month" (default "month")
 * @returns {Promise<Object>} { success, data: { usage, logs }, error }
 */
export async function getApiKeyUsage(apiKeyId, { period = "month" } = {}) {
  try {
    const callable = httpsCallable(functions, "getApiKeyUsage");
    const result = await callable({ apiKeyId, period });
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error getting API key usage:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * List all API keys for the current authenticated user
 * Queries Firestore apiKeys collection directly for active keys owned by the user.
 * @returns {Promise<Object>} { success, data: { keys }, error }
 */
export async function listApiKeys() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      return { success: false, data: null, error: "Not authenticated" };
    }

    const q = query(
      collection(db, "apiKeys"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(q);
    const keys = [];
    snapshot.forEach((docSnap) => {
      keys.push({
        id: docSnap.id,
        ...docSnap.data(),
      });
    });

    return { success: true, data: { keys } };
  } catch (error) {
    console.error("Error listing API keys:", error);
    return { success: false, data: null, error: error.message };
  }
}
