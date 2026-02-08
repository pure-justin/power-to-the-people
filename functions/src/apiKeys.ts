/**
 * API Key Management - Cloud Functions
 *
 * Handles API key creation, validation, rotation, and usage tracking.
 * Provides secure API access for partner integrations and external services.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

/**
 * API key status enum - tracks lifecycle
 */
export enum ApiKeyStatus {
  ACTIVE = "active", // Key is valid and can be used
  SUSPENDED = "suspended", // Temporarily disabled
  REVOKED = "revoked", // Permanently disabled
  EXPIRED = "expired", // Past expiration date
}

/**
 * API key scope - defines what the key can access
 */
export enum ApiKeyScope {
  READ_LEADS = "read_leads", // Read lead data
  WRITE_LEADS = "write_leads", // Create/update leads
  READ_SOLAR = "read_solar", // Access solar API data
  WRITE_SOLAR = "write_solar", // Trigger solar analysis
  READ_SMT = "read_smt", // Access SMT data
  WRITE_SMT = "write_smt", // Trigger SMT fetch
  READ_EQUIPMENT = "read_equipment", // Access equipment database
  READ_UTILITIES = "read_utilities", // Access utility rate data
  READ_INCENTIVES = "read_incentives", // Access incentive programs
  READ_PERMITS = "read_permits", // Access permit requirements
  READ_COMPLIANCE = "read_compliance", // Run compliance checks
  ADMIN = "admin", // Full access
}

/**
 * Rate limit configuration
 */
export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  requestsPerMonth: number;
}

/**
 * Usage statistics
 */
export interface UsageStats {
  totalRequests: number;
  requestsThisMinute: number;
  requestsThisHour: number;
  requestsThisDay: number;
  requestsThisMonth: number;
  lastRequestAt?: admin.firestore.Timestamp;
  lastResetAt: admin.firestore.Timestamp;
}

/**
 * API key usage log entry
 */
export interface ApiKeyUsageLog {
  id: string;
  apiKeyId: string;
  endpoint: string; // Which function/endpoint was called
  method: string; // GET, POST, etc.
  statusCode: number; // HTTP response code
  responseTime: number; // Milliseconds
  requestSize: number; // Bytes
  responseSize: number; // Bytes
  ipAddress: string;
  userAgent?: string;
  errorMessage?: string;
  timestamp: admin.firestore.Timestamp;
  // Request metadata
  leadId?: string; // If related to a specific lead
  projectId?: string; // If related to a specific project
  userId?: string; // If user-authenticated request
}

/**
 * Complete API key schema
 */
export interface ApiKey {
  // Identification
  id: string; // Document ID (short, readable)
  key: string; // The actual API key (hashed in DB)
  keyPrefix: string; // First 8 chars for display (e.g., "pk_live_12345678...")
  name: string; // Human-readable name
  description?: string;

  // Owner
  userId: string; // Owner's Firebase user ID
  userName?: string; // Display name
  organizationId?: string; // If part of an organization

  // Status & Access
  status: ApiKeyStatus;
  scopes: ApiKeyScope[]; // What this key can do
  environment: "development" | "production"; // Separate keys for dev/prod

  // Rate Limiting
  rateLimit: RateLimit;
  usageStats: UsageStats;

  // Security
  allowedIps?: string[]; // IP whitelist (optional)
  allowedDomains?: string[]; // CORS whitelist (optional)
  lastUsedAt?: admin.firestore.Timestamp;
  lastUsedIp?: string;

  // Lifecycle
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  expiresAt?: admin.firestore.Timestamp; // Optional expiration
  rotatedAt?: admin.firestore.Timestamp; // Last rotation
  revokedAt?: admin.firestore.Timestamp;
  revokedBy?: string; // User ID who revoked
  revokedReason?: string;

  // Metadata
  isTest?: boolean; // Test key, don't count in billing
  notes?: string; // Internal notes
  webhookUrl?: string; // Optional webhook for usage alerts
  alertThreshold?: number; // Alert when usage hits X% of limit
}

/**
 * Input data for creating a new API key
 */
export interface CreateApiKeyInput {
  name: string;
  description?: string;
  scopes: ApiKeyScope[];
  environment?: "development" | "production";
  expiresInDays?: number; // Auto-expire after N days
  rateLimit?: Partial<RateLimit>; // Override default limits
  allowedIps?: string[];
  allowedDomains?: string[];
}

/**
 * Default rate limits by environment
 */
const DEFAULT_RATE_LIMITS: Record<string, RateLimit> = {
  development: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 1000,
    requestsPerMonth: 10000,
  },
  production: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    requestsPerMonth: 100000,
  },
};

/**
 * Generate a secure API key
 * Format: pk_{env}_{random32chars}
 */
function generateApiKey(environment: string): string {
  const randomBytes = crypto.randomBytes(24).toString("hex"); // 48 chars
  const prefix = environment === "production" ? "pk_live" : "pk_test";
  return `${prefix}_${randomBytes}`;
}

/**
 * Hash API key for secure storage
 */
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Get key prefix for display (first 12 chars)
 */
function getKeyPrefix(key: string): string {
  return key.substring(0, 16) + "...";
}

/**
 * Validate API key format
 */
function isValidApiKeyFormat(key: string): boolean {
  return /^pk_(live|test)_[a-f0-9]{48}$/.test(key);
}

/**
 * Check if usage is within rate limits
 */
function checkRateLimit(
  usage: UsageStats,
  limits: RateLimit,
): { allowed: boolean; reason?: string } {
  if (usage.requestsThisMinute >= limits.requestsPerMinute) {
    return {
      allowed: false,
      reason: "Rate limit: requests per minute exceeded",
    };
  }
  if (usage.requestsThisHour >= limits.requestsPerHour) {
    return { allowed: false, reason: "Rate limit: requests per hour exceeded" };
  }
  if (usage.requestsThisDay >= limits.requestsPerDay) {
    return { allowed: false, reason: "Rate limit: requests per day exceeded" };
  }
  if (usage.requestsThisMonth >= limits.requestsPerMonth) {
    return {
      allowed: false,
      reason: "Rate limit: requests per month exceeded",
    };
  }
  return { allowed: true };
}

/**
 * Reset usage counters based on time period
 */
function getResetUsageStats(
  current: UsageStats,
  limits: RateLimit,
): Partial<UsageStats> {
  const now = new Date();
  const lastReset = current.lastResetAt.toDate();
  const updates: Partial<UsageStats> = {};

  // Reset per-minute counter (every minute)
  if (now.getTime() - lastReset.getTime() > 60000) {
    updates.requestsThisMinute = 0;
  }

  // Reset per-hour counter (every hour)
  if (now.getHours() !== lastReset.getHours()) {
    updates.requestsThisHour = 0;
  }

  // Reset per-day counter (every day)
  if (now.getDate() !== lastReset.getDate()) {
    updates.requestsThisDay = 0;
  }

  // Reset per-month counter (every month)
  if (now.getMonth() !== lastReset.getMonth()) {
    updates.requestsThisMonth = 0;
  }

  if (Object.keys(updates).length > 0) {
    updates.lastResetAt = admin.firestore.Timestamp.now();
  }

  return updates;
}

/**
 * Creates a new API key with specified scopes and rate limits
 *
 * @function createApiKey
 * @type onCall
 * @auth firebase
 * @input {{ name: string, description?: string, scopes: ApiKeyScope[], environment?: "development" | "production", expiresInDays?: number, rateLimit?: Partial<RateLimit>, allowedIps?: string[], allowedDomains?: string[] }}
 * @output {{ success: boolean, apiKeyId: string, apiKey: string, keyPrefix: string, message: string }}
 * @errors unauthenticated, invalid-argument, internal
 * @billing none
 * @rateLimit none
 * @firestore apiKeys
 */
export const createApiKey = functions
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
  })
  .https.onCall(async (data: CreateApiKeyInput, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to create API keys",
      );
    }

    // Validate required fields
    if (!data.name || !data.scopes || data.scopes.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Name and at least one scope are required",
      );
    }

    try {
      const db = admin.firestore();
      const apiKeyRef = db.collection("apiKeys").doc();

      const environment = data.environment || "development";
      const apiKey = generateApiKey(environment);
      const hashedKey = hashApiKey(apiKey);

      // Calculate expiration if provided
      let expiresAt: admin.firestore.Timestamp | undefined;
      if (data.expiresInDays) {
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + data.expiresInDays);
        expiresAt = admin.firestore.Timestamp.fromDate(expireDate);
      }

      // Get rate limits
      const rateLimit = {
        ...DEFAULT_RATE_LIMITS[environment],
        ...data.rateLimit,
      };

      const newApiKey: ApiKey = {
        id: apiKeyRef.id,
        key: hashedKey, // Store hashed version
        keyPrefix: getKeyPrefix(apiKey),
        name: data.name,
        description: data.description,
        userId: context.auth.uid,
        userName:
          context.auth.token.name || context.auth.token.email || "Unknown",
        status: ApiKeyStatus.ACTIVE,
        scopes: data.scopes,
        environment,
        rateLimit,
        usageStats: {
          totalRequests: 0,
          requestsThisMinute: 0,
          requestsThisHour: 0,
          requestsThisDay: 0,
          requestsThisMonth: 0,
          lastResetAt: admin.firestore.Timestamp.now(),
        },
        allowedIps: data.allowedIps,
        allowedDomains: data.allowedDomains,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        expiresAt,
      };

      // Save to Firestore
      await apiKeyRef.set(newApiKey);

      console.log(
        `Created API key ${apiKeyRef.id} (${data.name}) for user ${context.auth.uid}`,
      );

      // Return the plain-text key (only time it's ever shown)
      return {
        success: true,
        apiKeyId: apiKeyRef.id,
        apiKey, // IMPORTANT: This is the only time the plain-text key is returned
        keyPrefix: newApiKey.keyPrefix,
        message: "Save this API key securely. It will not be shown again.",
      };
    } catch (error: any) {
      console.error("Create API key error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create API key",
      );
    }
  });

/**
 * Validates an API key, checks scopes and rate limits, and increments usage counters
 *
 * @function validateApiKey
 * @type onCall
 * @auth firebase
 * @input {{ apiKey: string, requiredScope?: ApiKeyScope, endpoint?: string }}
 * @output {{ valid: boolean, apiKeyId: string, userId: string, scopes: ApiKeyScope[], environment: string, usageStats: UsageStats }}
 * @errors invalid-argument, unauthenticated, permission-denied, resource-exhausted
 * @billing none
 * @rateLimit api_key
 * @firestore apiKeys, apiKeyUsageLogs
 */
export const validateApiKey = functions
  .runWith({
    timeoutSeconds: 10,
    memory: "256MB",
  })
  .https.onCall(
    async (
      data: {
        apiKey: string;
        requiredScope?: ApiKeyScope;
        endpoint?: string;
      },
      context,
    ) => {
      const { apiKey, requiredScope, endpoint } = data;

      if (!apiKey) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "API key is required",
        );
      }

      // Validate format
      if (!isValidApiKeyFormat(apiKey)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid API key format",
        );
      }

      try {
        const db = admin.firestore();
        const hashedKey = hashApiKey(apiKey);

        // Find key in database
        const apiKeysSnapshot = await db
          .collection("apiKeys")
          .where("key", "==", hashedKey)
          .limit(1)
          .get();

        if (apiKeysSnapshot.empty) {
          throw new functions.https.HttpsError(
            "unauthenticated",
            "Invalid API key",
          );
        }

        const apiKeyDoc = apiKeysSnapshot.docs[0];
        const apiKeyData = apiKeyDoc.data() as ApiKey;

        // Check status
        if (apiKeyData.status !== ApiKeyStatus.ACTIVE) {
          throw new functions.https.HttpsError(
            "permission-denied",
            `API key is ${apiKeyData.status}`,
          );
        }

        // Check expiration
        if (
          apiKeyData.expiresAt &&
          apiKeyData.expiresAt.toMillis() < Date.now()
        ) {
          // Auto-update status to expired
          await apiKeyDoc.ref.update({ status: ApiKeyStatus.EXPIRED });
          throw new functions.https.HttpsError(
            "permission-denied",
            "API key has expired",
          );
        }

        // Check scope
        if (
          requiredScope &&
          !apiKeyData.scopes.includes(requiredScope) &&
          !apiKeyData.scopes.includes(ApiKeyScope.ADMIN)
        ) {
          throw new functions.https.HttpsError(
            "permission-denied",
            `API key does not have required scope: ${requiredScope}`,
          );
        }

        // Check rate limits
        const resetStats = getResetUsageStats(
          apiKeyData.usageStats,
          apiKeyData.rateLimit,
        );
        const currentStats = { ...apiKeyData.usageStats, ...resetStats };
        const rateLimitCheck = checkRateLimit(
          currentStats,
          apiKeyData.rateLimit,
        );

        if (!rateLimitCheck.allowed) {
          throw new functions.https.HttpsError(
            "resource-exhausted",
            rateLimitCheck.reason || "Rate limit exceeded",
          );
        }

        // Update usage stats
        const usageUpdate: Partial<UsageStats> = {
          totalRequests: admin.firestore.FieldValue.increment(1) as any,
          requestsThisMinute: admin.firestore.FieldValue.increment(1) as any,
          requestsThisHour: admin.firestore.FieldValue.increment(1) as any,
          requestsThisDay: admin.firestore.FieldValue.increment(1) as any,
          requestsThisMonth: admin.firestore.FieldValue.increment(1) as any,
          lastRequestAt: admin.firestore.Timestamp.now(),
          ...resetStats,
        };

        // Update last used info
        await apiKeyDoc.ref.update({
          "usageStats.totalRequests": usageUpdate.totalRequests,
          "usageStats.requestsThisMinute": usageUpdate.requestsThisMinute,
          "usageStats.requestsThisHour": usageUpdate.requestsThisHour,
          "usageStats.requestsThisDay": usageUpdate.requestsThisDay,
          "usageStats.requestsThisMonth": usageUpdate.requestsThisMonth,
          "usageStats.lastRequestAt": usageUpdate.lastRequestAt,
          lastUsedAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        // Log the usage (async, don't wait)
        logApiKeyUsage({
          apiKeyId: apiKeyDoc.id,
          endpoint: endpoint || "unknown",
          method: "CALL",
          statusCode: 200,
          responseTime: 0,
          requestSize: 0,
          responseSize: 0,
          ipAddress: context.rawRequest?.ip || "unknown",
          userAgent: context.rawRequest?.headers["user-agent"],
          timestamp: admin.firestore.Timestamp.now(),
        }).catch((err) => console.error("Failed to log usage:", err));

        return {
          valid: true,
          apiKeyId: apiKeyDoc.id,
          userId: apiKeyData.userId,
          scopes: apiKeyData.scopes,
          environment: apiKeyData.environment,
          usageStats: currentStats,
        };
      } catch (error: any) {
        console.error("Validate API key error:", error);
        throw error;
      }
    },
  );

/**
 * Permanently revokes an API key, preventing any further use
 *
 * @function revokeApiKey
 * @type onCall
 * @auth firebase
 * @input {{ apiKeyId: string, reason?: string }}
 * @output {{ success: boolean, apiKeyId: string, message: string }}
 * @errors unauthenticated, invalid-argument, not-found, permission-denied, internal
 * @billing none
 * @rateLimit none
 * @firestore apiKeys
 */
export const revokeApiKey = functions
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
  })
  .https.onCall(
    async (
      data: {
        apiKeyId: string;
        reason?: string;
      },
      context,
    ) => {
      // Require authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Must be authenticated to revoke API keys",
        );
      }

      const { apiKeyId, reason } = data;

      if (!apiKeyId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "API key ID is required",
        );
      }

      try {
        const db = admin.firestore();
        const apiKeyRef = db.collection("apiKeys").doc(apiKeyId);

        // Check if key exists and user owns it
        const apiKeyDoc = await apiKeyRef.get();
        if (!apiKeyDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "API key not found",
          );
        }

        const apiKeyData = apiKeyDoc.data() as ApiKey;
        if (apiKeyData.userId !== context.auth.uid) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "You do not own this API key",
          );
        }

        // Revoke the key
        await apiKeyRef.update({
          status: ApiKeyStatus.REVOKED,
          revokedAt: admin.firestore.Timestamp.now(),
          revokedBy: context.auth.uid,
          revokedReason: reason || "Manual revocation",
          updatedAt: admin.firestore.Timestamp.now(),
        });

        console.log(
          `Revoked API key ${apiKeyId} by user ${context.auth.uid}: ${reason}`,
        );

        return {
          success: true,
          apiKeyId,
          message: "API key revoked successfully",
        };
      } catch (error: any) {
        console.error("Revoke API key error:", error);
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to revoke API key",
        );
      }
    },
  );

/**
 * Rotates an API key by generating a new secret while preserving the key ID and settings
 *
 * @function rotateApiKey
 * @type onCall
 * @auth firebase
 * @input {{ apiKeyId: string }}
 * @output {{ success: boolean, apiKeyId: string, apiKey: string, keyPrefix: string, message: string }}
 * @errors unauthenticated, invalid-argument, not-found, permission-denied, internal
 * @billing none
 * @rateLimit none
 * @firestore apiKeys
 */
export const rotateApiKey = functions
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
  })
  .https.onCall(
    async (
      data: {
        apiKeyId: string;
      },
      context,
    ) => {
      // Require authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Must be authenticated to rotate API keys",
        );
      }

      const { apiKeyId } = data;

      if (!apiKeyId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "API key ID is required",
        );
      }

      try {
        const db = admin.firestore();
        const apiKeyRef = db.collection("apiKeys").doc(apiKeyId);

        // Check if key exists and user owns it
        const apiKeyDoc = await apiKeyRef.get();
        if (!apiKeyDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "API key not found",
          );
        }

        const apiKeyData = apiKeyDoc.data() as ApiKey;
        if (apiKeyData.userId !== context.auth.uid) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "You do not own this API key",
          );
        }

        // Generate new key
        const newApiKey = generateApiKey(apiKeyData.environment);
        const hashedKey = hashApiKey(newApiKey);

        // Update the key
        await apiKeyRef.update({
          key: hashedKey,
          keyPrefix: getKeyPrefix(newApiKey),
          rotatedAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        console.log(`Rotated API key ${apiKeyId} for user ${context.auth.uid}`);

        // Return the new plain-text key (only time it's shown)
        return {
          success: true,
          apiKeyId,
          apiKey: newApiKey, // IMPORTANT: Save this immediately
          keyPrefix: getKeyPrefix(newApiKey),
          message:
            "Save this new API key securely. The old key is now invalid.",
        };
      } catch (error: any) {
        console.error("Rotate API key error:", error);
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to rotate API key",
        );
      }
    },
  );

/**
 * Updates mutable settings on an existing API key (name, scopes, rate limits, etc.)
 *
 * @function updateApiKey
 * @type onCall
 * @auth firebase
 * @input {{ apiKeyId: string, updates: Partial<ApiKey> }}
 * @output {{ success: boolean, apiKeyId: string }}
 * @errors unauthenticated, invalid-argument, not-found, permission-denied, internal
 * @billing none
 * @rateLimit none
 * @firestore apiKeys
 */
export const updateApiKey = functions
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
  })
  .https.onCall(
    async (
      data: {
        apiKeyId: string;
        updates: Partial<ApiKey>;
      },
      context,
    ) => {
      // Require authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Must be authenticated to update API keys",
        );
      }

      const { apiKeyId, updates } = data;

      if (!apiKeyId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "API key ID is required",
        );
      }

      try {
        const db = admin.firestore();
        const apiKeyRef = db.collection("apiKeys").doc(apiKeyId);

        // Check if key exists and user owns it
        const apiKeyDoc = await apiKeyRef.get();
        if (!apiKeyDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "API key not found",
          );
        }

        const apiKeyData = apiKeyDoc.data() as ApiKey;
        if (apiKeyData.userId !== context.auth.uid) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "You do not own this API key",
          );
        }

        // Prepare allowed updates
        const allowedUpdates: any = {
          updatedAt: admin.firestore.Timestamp.now(),
        };

        // Only allow safe fields to be updated
        if (updates.name) allowedUpdates.name = updates.name;
        if (updates.description !== undefined)
          allowedUpdates.description = updates.description;
        if (updates.scopes) allowedUpdates.scopes = updates.scopes;
        if (updates.status) allowedUpdates.status = updates.status;
        if (updates.rateLimit) allowedUpdates.rateLimit = updates.rateLimit;
        if (updates.allowedIps !== undefined)
          allowedUpdates.allowedIps = updates.allowedIps;
        if (updates.allowedDomains !== undefined)
          allowedUpdates.allowedDomains = updates.allowedDomains;
        if (updates.notes !== undefined) allowedUpdates.notes = updates.notes;
        if (updates.webhookUrl !== undefined)
          allowedUpdates.webhookUrl = updates.webhookUrl;
        if (updates.alertThreshold !== undefined)
          allowedUpdates.alertThreshold = updates.alertThreshold;

        await apiKeyRef.update(allowedUpdates);

        console.log(`Updated API key ${apiKeyId} by user ${context.auth.uid}`);

        return {
          success: true,
          apiKeyId,
        };
      } catch (error: any) {
        console.error("Update API key error:", error);
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to update API key",
        );
      }
    },
  );

/**
 * Retrieves usage statistics and recent request logs for an API key
 *
 * @function getApiKeyUsage
 * @type onCall
 * @auth firebase
 * @input {{ apiKeyId: string, days?: number }}
 * @output {{ success: boolean, apiKeyId: string, usageStats: UsageStats, logs: ApiKeyUsageLog[], logCount: number }}
 * @errors unauthenticated, invalid-argument, not-found, permission-denied, internal
 * @billing none
 * @rateLimit none
 * @firestore apiKeys, apiKeyUsageLogs
 */
export const getApiKeyUsage = functions
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
  })
  .https.onCall(
    async (
      data: {
        apiKeyId: string;
        days?: number; // Get logs for last N days (default 7)
      },
      context,
    ) => {
      // Require authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Must be authenticated to view API key usage",
        );
      }

      const { apiKeyId, days = 7 } = data;

      if (!apiKeyId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "API key ID is required",
        );
      }

      try {
        const db = admin.firestore();
        const apiKeyRef = db.collection("apiKeys").doc(apiKeyId);

        // Check if key exists and user owns it
        const apiKeyDoc = await apiKeyRef.get();
        if (!apiKeyDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "API key not found",
          );
        }

        const apiKeyData = apiKeyDoc.data() as ApiKey;
        if (apiKeyData.userId !== context.auth.uid) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "You do not own this API key",
          );
        }

        // Get usage logs
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const logsSnapshot = await db
          .collection("apiKeyUsageLogs")
          .where("apiKeyId", "==", apiKeyId)
          .where(
            "timestamp",
            ">=",
            admin.firestore.Timestamp.fromDate(cutoffDate),
          )
          .orderBy("timestamp", "desc")
          .limit(1000)
          .get();

        const logs = logsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ApiKeyUsageLog[];

        return {
          success: true,
          apiKeyId,
          usageStats: apiKeyData.usageStats,
          logs,
          logCount: logs.length,
        };
      } catch (error: any) {
        console.error("Get API key usage error:", error);
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to get API key usage",
        );
      }
    },
  );

/**
 * Helper function: Log API key usage
 * Called internally by other functions
 */
async function logApiKeyUsage(log: Omit<ApiKeyUsageLog, "id">): Promise<void> {
  try {
    const db = admin.firestore();
    const logRef = db.collection("apiKeyUsageLogs").doc();

    await logRef.set({
      id: logRef.id,
      ...log,
    });
  } catch (error) {
    console.error("Log API key usage error:", error);
    // Don't throw - logging should never break the main flow
  }
}

/**
 * Extracts and validates an API key from an HTTP request's Authorization header
 *
 * @function validateApiKeyFromRequest
 * @type helper
 * @auth api_key
 * @input {{ req: functions.https.Request, requiredScope?: ApiKeyScope }}
 * @output {ApiKey}
 * @errors unauthenticated, permission-denied, resource-exhausted
 * @billing none
 * @rateLimit api_key
 * @firestore apiKeys, apiKeyUsageLogs
 */
export async function validateApiKeyFromRequest(
  req: functions.https.Request,
  requiredScope?: ApiKeyScope,
): Promise<ApiKey> {
  // Get API key from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Missing or invalid Authorization header",
    );
  }

  const apiKey = authHeader.replace("Bearer ", "");

  // Validate format
  if (!isValidApiKeyFormat(apiKey)) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Invalid API key format",
    );
  }

  const db = admin.firestore();
  const hashedKey = hashApiKey(apiKey);

  // Find key in database
  const apiKeysSnapshot = await db
    .collection("apiKeys")
    .where("key", "==", hashedKey)
    .limit(1)
    .get();

  if (apiKeysSnapshot.empty) {
    throw new functions.https.HttpsError("unauthenticated", "Invalid API key");
  }

  const apiKeyDoc = apiKeysSnapshot.docs[0];
  const apiKeyData = apiKeyDoc.data() as ApiKey;

  // Check status
  if (apiKeyData.status !== ApiKeyStatus.ACTIVE) {
    throw new functions.https.HttpsError(
      "permission-denied",
      `API key is ${apiKeyData.status}`,
    );
  }

  // Check expiration
  if (apiKeyData.expiresAt && apiKeyData.expiresAt.toMillis() < Date.now()) {
    await apiKeyDoc.ref.update({ status: ApiKeyStatus.EXPIRED });
    throw new functions.https.HttpsError(
      "permission-denied",
      "API key has expired",
    );
  }

  // Check scope
  if (
    requiredScope &&
    !apiKeyData.scopes.includes(requiredScope) &&
    !apiKeyData.scopes.includes(ApiKeyScope.ADMIN)
  ) {
    throw new functions.https.HttpsError(
      "permission-denied",
      `API key does not have required scope: ${requiredScope}`,
    );
  }

  // Check IP whitelist
  if (apiKeyData.allowedIps && apiKeyData.allowedIps.length > 0) {
    const requestIp = req.ip;
    if (!apiKeyData.allowedIps.includes(requestIp)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "IP address not allowed",
      );
    }
  }

  // Check rate limits
  const resetStats = getResetUsageStats(
    apiKeyData.usageStats,
    apiKeyData.rateLimit,
  );
  const currentStats = { ...apiKeyData.usageStats, ...resetStats };
  const rateLimitCheck = checkRateLimit(currentStats, apiKeyData.rateLimit);

  if (!rateLimitCheck.allowed) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      rateLimitCheck.reason || "Rate limit exceeded",
    );
  }

  // Update usage stats
  await apiKeyDoc.ref.update({
    "usageStats.totalRequests": admin.firestore.FieldValue.increment(1),
    "usageStats.requestsThisMinute": admin.firestore.FieldValue.increment(1),
    "usageStats.requestsThisHour": admin.firestore.FieldValue.increment(1),
    "usageStats.requestsThisDay": admin.firestore.FieldValue.increment(1),
    "usageStats.requestsThisMonth": admin.firestore.FieldValue.increment(1),
    "usageStats.lastRequestAt": admin.firestore.Timestamp.now(),
    lastUsedAt: admin.firestore.Timestamp.now(),
    lastUsedIp: req.ip,
    updatedAt: admin.firestore.Timestamp.now(),
    ...resetStats,
  });

  // Log usage (async, don't wait)
  logApiKeyUsage({
    apiKeyId: apiKeyDoc.id,
    endpoint: req.path || "unknown",
    method: req.method,
    statusCode: 200,
    responseTime: 0,
    requestSize: JSON.stringify(req.body).length,
    responseSize: 0,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    timestamp: admin.firestore.Timestamp.now(),
  }).catch((err) => console.error("Failed to log usage:", err));

  return apiKeyData;
}

/**
 * Marks expired API keys and deletes usage logs older than 90 days
 *
 * @function cleanupApiKeys
 * @type pubsub
 * @auth none
 * @input {}
 * @output {void}
 * @errors internal
 * @billing none
 * @rateLimit none
 * @firestore apiKeys, apiKeyUsageLogs
 */
export const cleanupApiKeys = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "512MB",
  })
  .pubsub.schedule("0 0 * * *")
  .timeZone("America/Chicago")
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      // Mark expired keys
      const expiredSnapshot = await db
        .collection("apiKeys")
        .where("expiresAt", "<=", now)
        .where("status", "==", ApiKeyStatus.ACTIVE)
        .get();

      const expireBatch = db.batch();
      expiredSnapshot.docs.forEach((doc) => {
        expireBatch.update(doc.ref, {
          status: ApiKeyStatus.EXPIRED,
          updatedAt: now,
        });
      });

      if (expiredSnapshot.size > 0) {
        await expireBatch.commit();
        console.log(`Marked ${expiredSnapshot.size} API keys as expired`);
      }

      // Delete logs older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

      const oldLogsSnapshot = await db
        .collection("apiKeyUsageLogs")
        .where("timestamp", "<=", cutoffTimestamp)
        .limit(500)
        .get();

      if (oldLogsSnapshot.size > 0) {
        const deleteBatch = db.batch();
        oldLogsSnapshot.docs.forEach((doc) => {
          deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
        console.log(`Deleted ${oldLogsSnapshot.size} old usage logs`);
      }

      console.log("API key cleanup completed");
    } catch (error) {
      console.error("Cleanup API keys error:", error);
    }
  });
