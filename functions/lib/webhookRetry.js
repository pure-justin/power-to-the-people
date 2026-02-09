"use strict";
/**
 * Webhook Retry Cloud Function
 * Processes webhook retry requests from the admin dashboard.
 * Picks up pending retry entries from webhookLogs and re-sends them.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWebhook = exports.processWebhookRetries = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const db = admin.firestore();
/**
 * Scheduled function that processes pending webhook retries.
 * Runs every 5 minutes to pick up manually-queued retries.
 */
exports.processWebhookRetries = functions.pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
    const pendingRetries = await db
        .collection("webhookLogs")
        .where("status", "==", "pending")
        .where("source", "==", "manual_retry")
        .orderBy("timestamp", "asc")
        .limit(20)
        .get();
    if (pendingRetries.empty) {
        return null;
    }
    const results = { processed: 0, success: 0, failed: 0 };
    for (const doc of pendingRetries.docs) {
        const data = doc.data();
        results.processed++;
        try {
            const url = data.url || data.endpoint;
            if (!url) {
                await doc.ref.update({
                    status: "error",
                    error: "No URL provided for retry",
                    processedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                results.failed++;
                continue;
            }
            const response = await sendWebhookRequest(url, data.method || "POST", data.payload || {}, data.requestHeaders || {});
            await doc.ref.update({
                status: response.success ? "success" : "error",
                statusCode: response.statusCode,
                responseTime: response.duration,
                response: response.body
                    ? JSON.stringify(response.body).substring(0, 1000)
                    : null,
                error: response.error || null,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            if (response.success) {
                results.success++;
            }
            else {
                results.failed++;
            }
        }
        catch (err) {
            await doc.ref.update({
                status: "error",
                error: err.message || "Unknown error during retry",
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            results.failed++;
        }
    }
    console.log(`Webhook retries processed: ${results.processed} total, ${results.success} success, ${results.failed} failed`);
    return results;
});
/**
 * HTTP callable function to trigger an immediate webhook retry
 */
exports.retryWebhook = functions.https.onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to retry webhooks");
    }
    const { logId } = data;
    if (!logId) {
        throw new functions.https.HttpsError("invalid-argument", "logId is required");
    }
    const logDoc = await db.collection("webhookLogs").doc(logId).get();
    if (!logDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Webhook log not found");
    }
    const logData = logDoc.data();
    const url = logData.url || logData.endpoint;
    if (!url) {
        throw new functions.https.HttpsError("failed-precondition", "No URL in webhook log to retry");
    }
    const response = await sendWebhookRequest(url, logData.method || "POST", logData.payload || logData.body || {}, logData.requestHeaders || {});
    // Create a new log entry for this retry
    const retryLog = {
        eventType: logData.eventType || logData.event || "unknown",
        url,
        endpoint: logData.endpoint || url,
        payload: logData.payload || logData.body || {},
        requestHeaders: logData.requestHeaders || {},
        method: logData.method || "POST",
        status: response.success ? "success" : "error",
        statusCode: response.statusCode,
        responseTime: response.duration,
        response: response.body
            ? JSON.stringify(response.body).substring(0, 1000)
            : null,
        error: response.error || null,
        retryOf: logId,
        retryCount: (logData.retryCount || 0) + 1,
        source: "manual_retry_immediate",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        retriedBy: context.auth.uid,
    };
    const newDoc = await db.collection("webhookLogs").add(retryLog);
    return {
        success: response.success,
        retryLogId: newDoc.id,
        statusCode: response.statusCode,
        error: response.error,
    };
});
/**
 * Helper: Send an HTTP request to a webhook endpoint
 */
function sendWebhookRequest(url, method, payload, headers) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const body = JSON.stringify(payload);
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === "https:";
        const transport = isHttps ? https : http;
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: method.toUpperCase(),
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
                "User-Agent": "PowerToThePeople-Webhook-Retry/1.0",
                ...headers,
            },
            timeout: 30000,
        };
        const req = transport.request(options, (res) => {
            let responseBody = "";
            res.on("data", (chunk) => {
                responseBody += chunk;
            });
            res.on("end", () => {
                const duration = Date.now() - startTime;
                const statusCode = res.statusCode || 0;
                resolve({
                    success: statusCode >= 200 && statusCode < 300,
                    statusCode,
                    body: responseBody.substring(0, 2000),
                    error: statusCode >= 400
                        ? `HTTP ${statusCode}: ${responseBody.substring(0, 200)}`
                        : null,
                    duration,
                });
            });
        });
        req.on("error", (err) => {
            resolve({
                success: false,
                statusCode: 0,
                body: null,
                error: err.message,
                duration: Date.now() - startTime,
            });
        });
        req.on("timeout", () => {
            req.destroy();
            resolve({
                success: false,
                statusCode: 0,
                body: null,
                error: "Request timed out after 30s",
                duration: Date.now() - startTime,
            });
        });
        req.write(body);
        req.end();
    });
}
//# sourceMappingURL=webhookRetry.js.map