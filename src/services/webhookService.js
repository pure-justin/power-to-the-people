/**
 * Webhook Service
 * Client-side service for querying webhook delivery logs from Firestore
 */

import {
  collection,
  query,
  getDocs,
  orderBy,
  where,
  limit,
  startAfter,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Get webhook logs with optional filters
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status (success, error, pending)
 * @param {string} options.eventType - Filter by event type
 * @param {number} options.pageSize - Number of results per page (default 50)
 * @param {Object} options.lastDoc - Last document for pagination
 * @returns {Promise<{logs: Array, lastDoc: Object, hasMore: boolean}>}
 */
export async function getWebhookLogs({
  status,
  eventType,
  pageSize = 50,
  lastDoc,
} = {}) {
  if (!db) throw new Error("Firestore not initialized");

  const logsRef = collection(db, "webhookLogs");
  const constraints = [orderBy("timestamp", "desc"), limit(pageSize + 1)];

  if (status) {
    constraints.unshift(where("status", "==", status));
  }

  if (eventType) {
    constraints.unshift(where("eventType", "==", eventType));
  }

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(logsRef, ...constraints);
  const snapshot = await getDocs(q);

  const logs = [];
  let lastVisible = null;
  let count = 0;

  snapshot.forEach((doc) => {
    count++;
    if (count <= pageSize) {
      logs.push({ id: doc.id, ...doc.data(), _doc: doc });
      lastVisible = doc;
    }
  });

  return {
    logs,
    lastDoc: lastVisible,
    hasMore: count > pageSize,
  };
}

/**
 * Get webhook delivery statistics
 * @returns {Promise<Object>} Stats object with counts and rates
 */
export async function getWebhookStats() {
  if (!db) throw new Error("Firestore not initialized");

  const logsRef = collection(db, "webhookLogs");

  // Get all logs (up to 1000 for stats)
  const q = query(logsRef, orderBy("timestamp", "desc"), limit(1000));
  const snapshot = await getDocs(q);

  const logs = [];
  snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() }));

  const total = logs.length;
  const successful = logs.filter(
    (l) => l.status === "success" || l.statusCode === 200,
  ).length;
  const failed = logs.filter(
    (l) => l.status === "error" || (l.statusCode && l.statusCode >= 400),
  ).length;
  const pending = logs.filter(
    (l) => l.status === "pending" || l.status === "processing",
  ).length;

  // Group by event type
  const byEventType = {};
  logs.forEach((l) => {
    const type = l.eventType || l.event || "unknown";
    if (!byEventType[type]) {
      byEventType[type] = { total: 0, success: 0, failed: 0 };
    }
    byEventType[type].total++;
    if (l.status === "success" || l.statusCode === 200) {
      byEventType[type].success++;
    } else if (l.status === "error" || (l.statusCode && l.statusCode >= 400)) {
      byEventType[type].failed++;
    }
  });

  // Calculate average response time
  const responseTimes = logs
    .filter((l) => l.responseTime || l.duration)
    .map((l) => l.responseTime || l.duration);
  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length,
        )
      : 0;

  // Recent activity (last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last24h = logs.filter((l) => {
    const ts = l.timestamp?.toDate?.() || new Date(l.timestamp);
    return ts >= oneDayAgo;
  });

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last7d = logs.filter((l) => {
    const ts = l.timestamp?.toDate?.() || new Date(l.timestamp);
    return ts >= sevenDaysAgo;
  });

  return {
    total,
    successful,
    failed,
    pending,
    successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : "0.0",
    byEventType,
    avgResponseTime,
    last24h: last24h.length,
    last7d: last7d.length,
  };
}

/**
 * Get distinct event types from webhook logs
 * @returns {Promise<string[]>} Array of event type strings
 */
export async function getWebhookEventTypes() {
  if (!db) throw new Error("Firestore not initialized");

  const logsRef = collection(db, "webhookLogs");
  const q = query(logsRef, orderBy("timestamp", "desc"), limit(500));
  const snapshot = await getDocs(q);

  const types = new Set();
  snapshot.forEach((doc) => {
    const data = doc.data();
    const type = data.eventType || data.event;
    if (type) types.add(type);
  });

  return Array.from(types).sort();
}

/**
 * Get delivery timeline data (hourly buckets for the last N hours)
 * @param {number} hours - Number of hours to look back (default 72)
 * @returns {Promise<Array<{hour: string, success: number, failed: number, pending: number}>>}
 */
export async function getWebhookTimeline(hours = 72) {
  if (!db) throw new Error("Firestore not initialized");

  const logsRef = collection(db, "webhookLogs");
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const q = query(
    logsRef,
    where("timestamp", ">=", cutoff),
    orderBy("timestamp", "desc"),
    limit(2000),
  );
  const snapshot = await getDocs(q);

  const buckets = {};

  // Initialize all hourly buckets
  for (let i = 0; i < hours; i++) {
    const d = new Date(Date.now() - i * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`;
    buckets[key] = { hour: key, success: 0, failed: 0, pending: 0, total: 0 };
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const ts = data.timestamp?.toDate?.() || new Date(data.timestamp);
    const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")} ${String(ts.getHours()).padStart(2, "0")}:00`;

    if (!buckets[key]) return;
    buckets[key].total++;

    if (data.status === "success" || data.statusCode === 200) {
      buckets[key].success++;
    } else if (
      data.status === "error" ||
      (data.statusCode && data.statusCode >= 400)
    ) {
      buckets[key].failed++;
    } else {
      buckets[key].pending++;
    }
  });

  return Object.values(buckets).sort((a, b) => a.hour.localeCompare(b.hour));
}

/**
 * Get endpoint health summary (unique endpoints with success/failure stats)
 * @returns {Promise<Array<{endpoint: string, total: number, success: number, failed: number, successRate: string, avgResponseTime: number, lastDelivery: Date, status: string}>>}
 */
export async function getWebhookEndpointHealth() {
  if (!db) throw new Error("Firestore not initialized");

  const logsRef = collection(db, "webhookLogs");
  const q = query(logsRef, orderBy("timestamp", "desc"), limit(1000));
  const snapshot = await getDocs(q);

  const endpoints = {};

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const endpoint = data.url || data.endpoint || data.type || "unknown";

    if (!endpoints[endpoint]) {
      endpoints[endpoint] = {
        endpoint,
        total: 0,
        success: 0,
        failed: 0,
        responseTimes: [],
        lastDelivery: null,
        lastStatus: null,
        recentFailures: 0,
      };
    }

    const ep = endpoints[endpoint];
    ep.total++;

    const ts = data.timestamp?.toDate?.() || new Date(data.timestamp);
    if (!ep.lastDelivery || ts > ep.lastDelivery) {
      ep.lastDelivery = ts;
      ep.lastStatus =
        data.status || (data.statusCode === 200 ? "success" : "error");
    }

    if (data.status === "success" || data.statusCode === 200) {
      ep.success++;
    } else if (
      data.status === "error" ||
      (data.statusCode && data.statusCode >= 400)
    ) {
      ep.failed++;
      // Count failures in last 24h
      if (ts > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        ep.recentFailures++;
      }
    }

    if (data.responseTime || data.duration) {
      ep.responseTimes.push(data.responseTime || data.duration);
    }
  });

  return Object.values(endpoints)
    .map((ep) => ({
      endpoint: ep.endpoint,
      total: ep.total,
      success: ep.success,
      failed: ep.failed,
      successRate:
        ep.total > 0 ? ((ep.success / ep.total) * 100).toFixed(1) : "0.0",
      avgResponseTime:
        ep.responseTimes.length > 0
          ? Math.round(
              ep.responseTimes.reduce((s, t) => s + t, 0) /
                ep.responseTimes.length,
            )
          : 0,
      lastDelivery: ep.lastDelivery,
      lastStatus: ep.lastStatus,
      recentFailures: ep.recentFailures,
      status:
        ep.recentFailures > 5
          ? "degraded"
          : ep.recentFailures > 0
            ? "warning"
            : "healthy",
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Retry a failed webhook delivery by creating a new log entry with retry status
 * @param {Object} originalLog - The original failed log entry
 * @returns {Promise<string>} New log document ID
 */
export async function retryWebhookDelivery(originalLog) {
  if (!db) throw new Error("Firestore not initialized");

  const logsRef = collection(db, "webhookLogs");
  const retryLog = {
    eventType: originalLog.eventType || originalLog.event || "unknown",
    url: originalLog.url || originalLog.endpoint || "",
    endpoint: originalLog.endpoint || originalLog.url || "",
    payload: originalLog.payload || originalLog.data || originalLog.body || {},
    requestHeaders: originalLog.requestHeaders || {},
    method: originalLog.method || "POST",
    status: "pending",
    retryOf: originalLog.id,
    retryCount: (originalLog.retryCount || 0) + 1,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
    source: "manual_retry",
  };

  const docRef = await addDoc(logsRef, retryLog);

  // Mark original as retried
  if (originalLog.id) {
    try {
      const origRef = doc(db, "webhookLogs", originalLog.id);
      await updateDoc(origRef, {
        retriedAt: serverTimestamp(),
        retriedBy: "admin_dashboard",
      });
    } catch {
      // Original may not exist or be read-only
    }
  }

  return docRef.id;
}

/**
 * Get failure analysis - categorizes errors and identifies patterns
 * @returns {Promise<Object>} Failure analysis data
 */
export async function getWebhookFailureAnalysis() {
  if (!db) throw new Error("Firestore not initialized");

  const logsRef = collection(db, "webhookLogs");
  const q = query(
    logsRef,
    where("status", "==", "error"),
    orderBy("timestamp", "desc"),
    limit(500),
  );

  let snapshot;
  try {
    snapshot = await getDocs(q);
  } catch {
    // Composite index may not exist, fall back to broader query
    const fallbackQ = query(logsRef, orderBy("timestamp", "desc"), limit(1000));
    snapshot = await getDocs(fallbackQ);
  }

  const errors = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (
      data.status === "error" ||
      (data.statusCode && data.statusCode >= 400)
    ) {
      errors.push({ id: docSnap.id, ...data });
    }
  });

  // Categorize errors
  const categories = {};
  const errorMessages = {};

  errors.forEach((err) => {
    const code = err.statusCode || 0;
    let category;
    if (code >= 500) category = "Server Error (5xx)";
    else if (code === 429) category = "Rate Limited (429)";
    else if (code === 404) category = "Not Found (404)";
    else if (code === 401 || code === 403) category = "Auth Error (401/403)";
    else if (code >= 400) category = "Client Error (4xx)";
    else if (err.error?.includes("timeout") || err.error?.includes("ETIMEDOUT"))
      category = "Timeout";
    else if (
      err.error?.includes("ECONNREFUSED") ||
      err.error?.includes("ENOTFOUND")
    )
      category = "Connection Refused";
    else category = "Other";

    if (!categories[category]) categories[category] = 0;
    categories[category]++;

    const msg = err.error || `HTTP ${code}`;
    if (!errorMessages[msg]) errorMessages[msg] = 0;
    errorMessages[msg]++;
  });

  // Find most affected endpoints
  const affectedEndpoints = {};
  errors.forEach((err) => {
    const ep = err.url || err.endpoint || "unknown";
    if (!affectedEndpoints[ep]) affectedEndpoints[ep] = 0;
    affectedEndpoints[ep]++;
  });

  return {
    totalFailures: errors.length,
    categories: Object.entries(categories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    topErrors: Object.entries(errorMessages)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    affectedEndpoints: Object.entries(affectedEndpoints)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    recentFailures: errors.slice(0, 5).map((e) => ({
      id: e.id,
      eventType: e.eventType || e.event,
      error: e.error,
      statusCode: e.statusCode,
      timestamp: e.timestamp,
      url: e.url || e.endpoint,
    })),
  };
}

/**
 * Export webhook logs as CSV string
 * @param {Array} logs - Array of webhook log objects
 * @returns {string} CSV formatted string
 */
export function exportLogsAsCsv(logs) {
  const headers = [
    "ID",
    "Event Type",
    "Status",
    "Status Code",
    "URL/Endpoint",
    "Response Time (ms)",
    "Error",
    "Retry Count",
    "Timestamp",
  ];

  const rows = logs.map((log) => [
    log.id || "",
    log.eventType || log.event || "",
    log.status || "",
    log.statusCode || "",
    log.url || log.endpoint || "",
    log.responseTime || log.duration || "",
    (log.error || "").replace(/"/g, '""'),
    log.retryCount || 0,
    log.timestamp?.toDate?.()
      ? log.timestamp.toDate().toISOString()
      : log.timestamp || "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
}

/**
 * Export webhook logs as JSON string
 * @param {Array} logs - Array of webhook log objects
 * @returns {string} JSON formatted string
 */
export function exportLogsAsJson(logs) {
  const cleaned = logs.map((log) => {
    const { _doc, ...rest } = log;
    return {
      ...rest,
      timestamp: rest.timestamp?.toDate?.()
        ? rest.timestamp.toDate().toISOString()
        : rest.timestamp,
    };
  });
  return JSON.stringify(cleaned, null, 2);
}
