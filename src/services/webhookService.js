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
