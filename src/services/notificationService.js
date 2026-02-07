/**
 * Notification Service
 * Manages in-app notifications alongside SMS
 * Provides real-time notification state via Firestore listeners
 */

import {
  db,
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from "./firebase";
import { onSnapshot as firestoreOnSnapshot } from "firebase/firestore";

/**
 * Notification types and their display config
 */
export const NOTIFICATION_TYPES = {
  enrollment_confirmation: {
    icon: "check-circle",
    color: "#10b981",
    title: "Enrollment Confirmed",
  },
  status_update: {
    icon: "info",
    color: "#3b82f6",
    title: "Status Update",
  },
  application_approved: {
    icon: "badge-check",
    color: "#10b981",
    title: "Application Approved",
  },
  installation_scheduled: {
    icon: "calendar",
    color: "#8b5cf6",
    title: "Installation Scheduled",
  },
  installation_complete: {
    icon: "sun",
    color: "#f59e0b",
    title: "Installation Complete",
  },
  referral_reward: {
    icon: "gift",
    color: "#ec4899",
    title: "Referral Reward",
  },
  payment_reminder: {
    icon: "dollar-sign",
    color: "#ef4444",
    title: "Payment Reminder",
  },
  info: {
    icon: "info",
    color: "#6b7280",
    title: "Info",
  },
};

/**
 * Create an in-app notification for a user/project
 * @param {Object} params
 * @param {string} params.projectId - Associated project ID
 * @param {string} params.userId - User ID (optional)
 * @param {string} params.type - Notification type from NOTIFICATION_TYPES
 * @param {string} params.title - Short title
 * @param {string} params.message - Full message text
 * @param {string} params.link - Optional link to navigate to
 * @returns {Promise<string>} Notification document ID
 */
export async function createNotification({
  projectId,
  userId,
  type = "info",
  title,
  message,
  link,
}) {
  if (!db) throw new Error("Firestore not initialized");

  const notificationData = {
    projectId: projectId || null,
    userId: userId || null,
    type,
    title: title || NOTIFICATION_TYPES[type]?.title || "Notification",
    message,
    link: link || null,
    read: false,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, "notifications"),
    notificationData,
  );
  return docRef.id;
}

/**
 * Get notifications for a project
 * @param {string} projectId
 * @param {number} maxResults
 * @returns {Promise<Array>}
 */
export async function getNotifications(projectId, maxResults = 50) {
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "notifications"),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
  }));
}

/**
 * Get notifications for a user
 * @param {string} userId
 * @param {number} maxResults
 * @returns {Promise<Array>}
 */
export async function getUserNotifications(userId, maxResults = 50) {
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
  }));
}

/**
 * Mark a notification as read
 * @param {string} notificationId
 */
export async function markAsRead(notificationId) {
  if (!db) throw new Error("Firestore not initialized");

  const notifRef = doc(db, "notifications", notificationId);
  await updateDoc(notifRef, {
    read: true,
    readAt: serverTimestamp(),
  });
}

/**
 * Mark all notifications as read for a project
 * @param {string} projectId
 */
export async function markAllAsRead(projectId) {
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "notifications"),
    where("projectId", "==", projectId),
    where("read", "==", false),
  );

  const snapshot = await getDocs(q);
  const updates = snapshot.docs.map((d) =>
    updateDoc(d.ref, { read: true, readAt: serverTimestamp() }),
  );
  await Promise.all(updates);
}

/**
 * Subscribe to real-time notifications for a project
 * @param {string} projectId
 * @param {function} callback - Called with array of notifications on each change
 * @returns {function} Unsubscribe function
 */
export function subscribeToNotifications(projectId, callback) {
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "notifications"),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
    limit(20),
  );

  return firestoreOnSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));
    callback(notifications);
  });
}

/**
 * Subscribe to real-time notifications for a user
 * @param {string} userId
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function subscribeToUserNotifications(userId, callback) {
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(20),
  );

  return firestoreOnSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));
    callback(notifications);
  });
}

/**
 * Get unread notification count for a project
 * @param {string} projectId
 * @returns {Promise<number>}
 */
export async function getUnreadCount(projectId) {
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "notifications"),
    where("projectId", "==", projectId),
    where("read", "==", false),
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}
