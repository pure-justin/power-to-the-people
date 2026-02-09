/**
 * Webhook API - Cloud Functions
 *
 * Dynamic webhook registration and delivery system.
 * Allows API key owners to register HTTPS endpoints for event notifications.
 * Events are signed with HMAC-SHA256 for verification.
 *
 * All endpoints require API key authentication with manage_webhooks scope.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { validateApiKeyFromRequest, ApiKeyScope } from "./apiKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WebhookRegistration {
  id: string;
  api_key_id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string;
  status: "active" | "paused" | "failed";
  failure_count: number;
  last_delivered_at: FirebaseFirestore.Timestamp | null;
  created_at: FirebaseFirestore.Timestamp;
  updated_at: FirebaseFirestore.Timestamp;
}

// ─── Event Types ─────────────────────────────────────────────────────────────

const WEBHOOK_EVENT_TYPES = [
  "project.created",
  "project.stage_changed",
  "project.completed",
  "task.created",
  "task.opened_for_bidding",
  "task.assigned",
  "task.completed",
  "bid.received",
  "bid.accepted",
  "bid.rejected",
  "listing.created",
  "listing.assigned",
  "listing.completed",
  "lead.created",
  "lead.qualified",
  "lead.sold",
  "referral.milestone_reached",
  "referral.payout_processed",
] as const;

// ─── CORS Helper ─────────────────────────────────────────────────────────────

function setCors(res: functions.Response): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function handleOptions(
  req: functions.https.Request,
  res: functions.Response,
): boolean {
  if (req.method === "OPTIONS") {
    setCors(res);
    res.status(204).send("");
    return true;
  }
  return false;
}

// ─── Error Handler Helper ────────────────────────────────────────────────────

function mapErrorStatus(error: any): number {
  if (error.code === "unauthenticated") return 401;
  if (error.code === "permission-denied") return 403;
  if (error.code === "resource-exhausted") return 429;
  return 500;
}

// ─── Path Parsing Helper ─────────────────────────────────────────────────────

/**
 * Extracts the route segments after /webhookApi (or the function name).
 * Cloud Functions v1 passes the full path including the function name prefix.
 * e.g. "/webhookApi/webhooks/abc123" -> ["webhooks", "abc123"]
 *      "/webhooks/abc123" -> ["webhooks", "abc123"]
 */
function getPathSegments(req: functions.https.Request): string[] {
  const path = req.path || "";
  const segments = path.split("/").filter((s) => s.length > 0);
  // Remove function name prefix if present
  if (segments[0] === "webhookApi") {
    segments.shift();
  }
  return segments;
}

// ─── Webhook API Handler ─────────────────────────────────────────────────────

/**
 * Unified HTTP handler for webhook management endpoints
 *
 * Routes:
 *   GET    /webhooks         - List registered webhooks
 *   POST   /webhooks         - Register new webhook
 *   PUT    /webhooks/:id     - Update webhook
 *   DELETE /webhooks/:id     - Delete webhook
 *   POST   /webhooks/test    - Send test event
 *
 * @function webhookApi
 * @type onRequest
 * @auth api_key
 * @scope manage_webhooks
 * @firestore webhooks, webhookLogs
 */
export const webhookApi = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    if (handleOptions(req, res)) return;
    setCors(res);

    try {
      const apiKey = await validateApiKeyFromRequest(
        req,
        ApiKeyScope.MANAGE_WEBHOOKS,
      );

      const segments = getPathSegments(req);
      const method = req.method;

      // Route: GET /webhooks
      if (method === "GET" && segments[0] === "webhooks" && !segments[1]) {
        await handleListWebhooks(req, res, apiKey);
        return;
      }

      // Route: POST /webhooks/test
      if (
        method === "POST" &&
        segments[0] === "webhooks" &&
        segments[1] === "test"
      ) {
        await handleTestWebhook(req, res, apiKey);
        return;
      }

      // Route: POST /webhooks
      if (method === "POST" && segments[0] === "webhooks" && !segments[1]) {
        await handleCreateWebhook(req, res, apiKey);
        return;
      }

      // Route: PUT /webhooks/:id
      if (method === "PUT" && segments[0] === "webhooks" && segments[1]) {
        await handleUpdateWebhook(req, res, apiKey, segments[1]);
        return;
      }

      // Route: DELETE /webhooks/:id
      if (method === "DELETE" && segments[0] === "webhooks" && segments[1]) {
        await handleDeleteWebhook(req, res, apiKey, segments[1]);
        return;
      }

      res.status(404).json({ error: "Not found" });
    } catch (error: any) {
      console.error("Webhook API error:", error);
      const status = mapErrorStatus(error);
      res.status(status).json({
        error: error.message || "Internal error",
      });
    }
  });

// ─── Route Handlers ──────────────────────────────────────────────────────────

/**
 * GET /webhooks - List webhooks for this API key owner
 */
async function handleListWebhooks(
  _req: functions.https.Request,
  res: functions.Response,
  apiKey: any,
): Promise<void> {
  const db = admin.firestore();
  const snapshot = await db
    .collection("webhooks")
    .where("user_id", "==", apiKey.userId)
    .get();

  const webhooks = snapshot.docs.map((doc) => {
    const data = doc.data() as WebhookRegistration;
    // Never expose the signing secret in list responses
    const { secret, ...safe } = data;
    return safe;
  });

  res.status(200).json({
    success: true,
    count: webhooks.length,
    data: webhooks,
  });
}

/**
 * POST /webhooks - Register a new webhook
 */
async function handleCreateWebhook(
  req: functions.https.Request,
  res: functions.Response,
  apiKey: any,
): Promise<void> {
  const { url, events } = req.body;

  // Validate URL
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      res.status(400).json({ error: "url must use HTTPS" });
      return;
    }
  } catch {
    res.status(400).json({ error: "url is not a valid URL" });
    return;
  }

  // Validate events
  if (!events || !Array.isArray(events) || events.length === 0) {
    res
      .status(400)
      .json({ error: "events array is required and must not be empty" });
    return;
  }

  const invalidEvents = events.filter(
    (e: string) => !(WEBHOOK_EVENT_TYPES as readonly string[]).includes(e),
  );
  if (invalidEvents.length > 0) {
    res.status(400).json({
      error: `Invalid event types: ${invalidEvents.join(", ")}`,
      valid_events: WEBHOOK_EVENT_TYPES,
    });
    return;
  }

  const db = admin.firestore();
  const webhookRef = db.collection("webhooks").doc();
  const secret = crypto.randomBytes(32).toString("hex");

  const webhook: WebhookRegistration = {
    id: webhookRef.id,
    api_key_id: apiKey.id,
    user_id: apiKey.userId,
    url,
    events,
    secret,
    status: "active",
    failure_count: 0,
    last_delivered_at: null,
    created_at: admin.firestore.Timestamp.now(),
    updated_at: admin.firestore.Timestamp.now(),
  };

  await webhookRef.set(webhook);

  console.log(
    `Created webhook ${webhookRef.id} for user ${apiKey.userId} -> ${url}`,
  );

  // Return the full webhook including secret (only shown at creation)
  res.status(201).json({
    success: true,
    data: webhook,
    message: "Save the secret securely. It will not be shown again.",
  });
}

/**
 * PUT /webhooks/:id - Update a webhook
 */
async function handleUpdateWebhook(
  req: functions.https.Request,
  res: functions.Response,
  apiKey: any,
  webhookId: string,
): Promise<void> {
  const db = admin.firestore();
  const webhookRef = db.collection("webhooks").doc(webhookId);
  const webhookDoc = await webhookRef.get();

  if (!webhookDoc.exists) {
    res.status(404).json({ error: "Webhook not found" });
    return;
  }

  const webhookData = webhookDoc.data() as WebhookRegistration;

  // Only owner can update
  if (webhookData.user_id !== apiKey.userId) {
    res.status(403).json({ error: "You do not own this webhook" });
    return;
  }

  const updates: Record<string, any> = {
    updated_at: admin.firestore.Timestamp.now(),
  };

  // URL update
  if (req.body.url !== undefined) {
    const url = req.body.url;
    if (typeof url !== "string") {
      res.status(400).json({ error: "url must be a string" });
      return;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") {
        res.status(400).json({ error: "url must use HTTPS" });
        return;
      }
    } catch {
      res.status(400).json({ error: "url is not a valid URL" });
      return;
    }
    updates.url = url;
  }

  // Events update
  if (req.body.events !== undefined) {
    const events = req.body.events;
    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: "events must be a non-empty array" });
      return;
    }
    const invalidEvents = events.filter(
      (e: string) => !(WEBHOOK_EVENT_TYPES as readonly string[]).includes(e),
    );
    if (invalidEvents.length > 0) {
      res.status(400).json({
        error: `Invalid event types: ${invalidEvents.join(", ")}`,
        valid_events: WEBHOOK_EVENT_TYPES,
      });
      return;
    }
    updates.events = events;
  }

  // Status update
  if (req.body.status !== undefined) {
    const status = req.body.status;
    if (!["active", "paused", "failed"].includes(status)) {
      res
        .status(400)
        .json({ error: "status must be active, paused, or failed" });
      return;
    }
    updates.status = status;
    // Reset failure count when reactivating
    if (status === "active") {
      updates.failure_count = 0;
    }
  }

  await webhookRef.update(updates);

  const updated = { ...webhookData, ...updates };
  const { secret, ...safe } = updated;

  res.status(200).json({
    success: true,
    data: safe,
  });
}

/**
 * DELETE /webhooks/:id - Delete a webhook
 */
async function handleDeleteWebhook(
  _req: functions.https.Request,
  res: functions.Response,
  apiKey: any,
  webhookId: string,
): Promise<void> {
  const db = admin.firestore();
  const webhookRef = db.collection("webhooks").doc(webhookId);
  const webhookDoc = await webhookRef.get();

  if (!webhookDoc.exists) {
    res.status(404).json({ error: "Webhook not found" });
    return;
  }

  const webhookData = webhookDoc.data() as WebhookRegistration;

  // Only owner can delete
  if (webhookData.user_id !== apiKey.userId) {
    res.status(403).json({ error: "You do not own this webhook" });
    return;
  }

  await webhookRef.delete();

  console.log(`Deleted webhook ${webhookId} for user ${apiKey.userId}`);

  res.status(200).json({
    success: true,
    message: "Webhook deleted",
  });
}

/**
 * POST /webhooks/test - Send a test event to a webhook
 */
async function handleTestWebhook(
  req: functions.https.Request,
  res: functions.Response,
  apiKey: any,
): Promise<void> {
  const { webhook_id, event_type } = req.body;

  if (!webhook_id) {
    res.status(400).json({ error: "webhook_id is required" });
    return;
  }

  const db = admin.firestore();
  const webhookDoc = await db.collection("webhooks").doc(webhook_id).get();

  if (!webhookDoc.exists) {
    res.status(404).json({ error: "Webhook not found" });
    return;
  }

  const webhookData = webhookDoc.data() as WebhookRegistration;

  // Only owner can test
  if (webhookData.user_id !== apiKey.userId) {
    res.status(403).json({ error: "You do not own this webhook" });
    return;
  }

  const testEventType = event_type || "test.ping";

  const payload = {
    event: testEventType,
    data: {
      message: "This is a test event from SolarOS webhook system.",
      webhook_id: webhook_id,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID(),
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhookData.secret)
    .update(payloadString)
    .digest("hex");

  try {
    await postToUrl(webhookData.url, payloadString, {
      "Content-Type": "application/json",
      "X-SolarOS-Signature": `sha256=${signature}`,
      "X-SolarOS-Event": testEventType,
    });

    res.status(200).json({
      success: true,
      message: "Test event delivered successfully",
      event_type: testEventType,
    });
  } catch (error: any) {
    res.status(200).json({
      success: false,
      message: `Test delivery failed: ${error.message}`,
      event_type: testEventType,
    });
  }
}

// ─── Webhook Delivery Helper ─────────────────────────────────────────────────

/**
 * Delivers a webhook event to all active subscribers for the given event type.
 * Exported for use by other modules (e.g. project triggers, marketplace events).
 *
 * @param eventType - The event type string (e.g. "project.created")
 * @param data - The event payload data
 */
export async function deliverWebhookEvent(
  eventType: string,
  data: Record<string, unknown>,
): Promise<void> {
  const db = admin.firestore();

  // Query for active webhooks subscribed to this event type
  const snapshot = await db
    .collection("webhooks")
    .where("status", "==", "active")
    .where("events", "array-contains", eventType)
    .get();

  if (snapshot.empty) {
    return;
  }

  const deliveryPromises = snapshot.docs.map(async (doc) => {
    const webhook = doc.data() as WebhookRegistration;

    const payload = {
      event: eventType,
      data,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(payloadString)
      .digest("hex");

    const headers = {
      "Content-Type": "application/json",
      "X-SolarOS-Signature": `sha256=${signature}`,
      "X-SolarOS-Event": eventType,
    };

    let success = false;
    let errorMessage: string | null = null;

    try {
      await postToUrl(webhook.url, payloadString, headers);
      success = true;
    } catch (error: any) {
      errorMessage = error.message || "Delivery failed";
      success = false;
    }

    // Update webhook record
    if (success) {
      await doc.ref.update({
        last_delivered_at: admin.firestore.Timestamp.now(),
        failure_count: 0,
        updated_at: admin.firestore.Timestamp.now(),
      });
    } else {
      const newFailureCount = webhook.failure_count + 1;
      const updateData: Record<string, any> = {
        failure_count: newFailureCount,
        updated_at: admin.firestore.Timestamp.now(),
      };
      if (newFailureCount >= 5) {
        updateData.status = "failed";
      }
      await doc.ref.update(updateData);
    }

    // Log delivery attempt
    const logRef = db.collection("webhookLogs").doc();
    await logRef.set({
      id: logRef.id,
      webhook_id: webhook.id,
      user_id: webhook.user_id,
      event_type: eventType,
      url: webhook.url,
      success,
      error: errorMessage,
      payload_size: payloadString.length,
      timestamp: admin.firestore.Timestamp.now(),
    });
  });

  // Execute all deliveries concurrently
  await Promise.allSettled(deliveryPromises);
}

// ─── HTTP POST Helper ────────────────────────────────────────────────────────

/**
 * POSTs a JSON payload to a URL using Node's built-in https module.
 * 10 second timeout per delivery.
 */
function postToUrl(
  targetUrl: string,
  body: string,
  headers: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === "https:";
    const transport = isHttps ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(body).toString(),
      },
      timeout: 10000,
    };

    const req = transport.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk: Buffer) => {
        responseBody += chunk.toString();
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(
            new Error(
              `HTTP ${res.statusCode}: ${responseBody.substring(0, 200)}`,
            ),
          );
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out after 10 seconds"));
    });

    req.on("error", (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}
