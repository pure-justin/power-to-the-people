/**
 * Webhook Endpoints for Referral System
 * Allows external integrations (CRM, email platforms, etc.) to update referral status
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

const db = admin.firestore();

// Webhook secret for signature verification
const WEBHOOK_SECRET =
  functions.config().webhook?.secret || "development-secret-change-in-prod";

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload: any, signature: string): boolean {
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(JSON.stringify(payload));
  const computedSignature = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature),
  );
}

/**
 * Webhook endpoint for referral status updates
 * POST /webhooks/referral-status
 *
 * Payload:
 * {
 *   "projectId": "PTTP-xxx",
 *   "status": "installed",
 *   "timestamp": "2024-01-01T00:00:00Z"
 * }
 *
 * Headers:
 * - X-Webhook-Signature: HMAC-SHA256 signature of payload
 */
export const referralStatusWebhook = functions.https.onRequest(
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const signature = req.headers["x-webhook-signature"] as string;

    // Verify signature in production
    if (
      process.env.NODE_ENV === "production" &&
      !verifyWebhookSignature(req.body, signature)
    ) {
      console.error("Invalid webhook signature");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const { projectId, status, timestamp } = req.body;

    // Validate payload
    if (!projectId || !status) {
      res.status(400).json({ error: "projectId and status required" });
      return;
    }

    const validStatuses = [
      "signed_up",
      "qualified",
      "site_survey",
      "installed",
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    try {
      // Find referral tracking for this project
      const trackingQuery = await db
        .collection("referralTracking")
        .where("projectId", "==", projectId)
        .limit(1)
        .get();

      if (trackingQuery.empty) {
        res.status(404).json({ error: "Referral tracking not found" });
        return;
      }

      const trackingDoc = trackingQuery.docs[0];
      const trackingData = trackingDoc.data();

      // Update status
      const result = await updateReferralStatus(trackingDoc.id, status);

      // Log webhook event
      await db.collection("webhookLogs").add({
        type: "referral_status",
        projectId,
        status,
        timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp(),
        referrerId: trackingData.referrerId,
        success: true,
        result,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        success: true,
        projectId,
        status,
        earningsAdded: result.earningsAdded,
      });
    } catch (error: any) {
      console.error("Webhook error:", error);

      // Log failed webhook
      await db.collection("webhookLogs").add({
        type: "referral_status",
        projectId,
        status,
        timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp(),
        success: false,
        error: error.message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(500).json({ error: error.message });
    }
  },
);

/**
 * Webhook for bulk referral updates
 * POST /webhooks/referral-bulk-update
 *
 * Payload:
 * {
 *   "updates": [
 *     { "projectId": "PTTP-xxx", "status": "installed" },
 *     { "projectId": "PTTP-yyy", "status": "site_survey" }
 *   ]
 * }
 */
export const referralBulkUpdateWebhook = functions.https.onRequest(
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const signature = req.headers["x-webhook-signature"] as string;

    if (
      process.env.NODE_ENV === "production" &&
      !verifyWebhookSignature(req.body, signature)
    ) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ error: "updates array required" });
      return;
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ projectId: string; error: string }>,
    };

    for (const update of updates) {
      try {
        const { projectId, status } = update;

        const trackingQuery = await db
          .collection("referralTracking")
          .where("projectId", "==", projectId)
          .limit(1)
          .get();

        if (trackingQuery.empty) {
          results.failed++;
          results.errors.push({
            projectId,
            error: "Tracking not found",
          });
          continue;
        }

        const trackingDoc = trackingQuery.docs[0];
        await updateReferralStatus(trackingDoc.id, status);

        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          projectId: update.projectId,
          error: error.message,
        });
      }
    }

    // Log bulk update
    await db.collection("webhookLogs").add({
      type: "referral_bulk_update",
      totalUpdates: updates.length,
      successful: results.successful,
      failed: results.failed,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json(results);
  },
);

/**
 * Webhook to get referral stats for external dashboards
 * GET /webhooks/referral-stats?apiKey=xxx
 */
export const referralStatsWebhook = functions.https.onRequest(
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Simple API key authentication
    const apiKey = req.query.apiKey as string;
    const expectedKey =
      functions.config().webhook?.api_key || "development-key";

    if (apiKey !== expectedKey) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    try {
      const referralsSnapshot = await db.collection("referrals").get();

      let totalReferrers = 0;
      let totalReferrals = 0;
      let totalEarnings = 0;
      let totalPending = 0;
      let totalPaid = 0;

      referralsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalReferrers++;
        totalReferrals += data.totalReferrals || 0;
        totalEarnings += data.totalEarnings || 0;
        totalPending += data.pendingEarnings || 0;
        totalPaid += data.paidEarnings || 0;
      });

      const trackingSnapshot = await db.collection("referralTracking").get();

      const statusCounts: Record<string, number> = {
        signed_up: 0,
        qualified: 0,
        site_survey: 0,
        installed: 0,
      };

      trackingSnapshot.forEach((doc) => {
        const data = doc.data();
        if (statusCounts[data.status] !== undefined) {
          statusCounts[data.status]++;
        }
      });

      res.status(200).json({
        totalReferrers,
        totalReferrals,
        totalEarnings,
        pendingEarnings: totalPending,
        paidEarnings: totalPaid,
        statusCounts,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

/**
 * Helper: Update referral status
 */
async function updateReferralStatus(
  trackingId: string,
  newStatus: string,
): Promise<{ earningsAdded: number }> {
  const trackingRef = db.collection("referralTracking").doc(trackingId);
  const trackingSnap = await trackingRef.get();

  if (!trackingSnap.exists) {
    throw new Error("Referral tracking record not found");
  }

  const trackingData = trackingSnap.data()!;
  const milestones = trackingData.earningMilestones;
  let earningsToAdd = 0;

  const now = admin.firestore.Timestamp.now();

  if (newStatus === "qualified" && !milestones.qualified.completed) {
    milestones.qualified.completed = true;
    milestones.qualified.date = now;
    earningsToAdd += milestones.qualified.amount;
  } else if (newStatus === "site_survey" && !milestones.siteSurvey.completed) {
    milestones.siteSurvey.completed = true;
    milestones.siteSurvey.date = now;
    earningsToAdd += milestones.siteSurvey.amount;
  } else if (newStatus === "installed" && !milestones.installed.completed) {
    milestones.installed.completed = true;
    milestones.installed.date = now;
    earningsToAdd += milestones.installed.amount;
  }

  await trackingRef.update({
    status: newStatus,
    earningMilestones: milestones,
    earnings: admin.firestore.FieldValue.increment(earningsToAdd),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const referrerRef = db.collection("referrals").doc(trackingData.referrerId);

  const updates: any = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (newStatus === "qualified") {
    updates.qualifiedReferrals = admin.firestore.FieldValue.increment(1);
  } else if (newStatus === "installed") {
    updates.installedReferrals = admin.firestore.FieldValue.increment(1);
  }

  if (earningsToAdd > 0) {
    updates.totalEarnings = admin.firestore.FieldValue.increment(earningsToAdd);
    updates.pendingEarnings =
      admin.firestore.FieldValue.increment(earningsToAdd);
  }

  await referrerRef.update(updates);

  return { earningsAdded: earningsToAdd };
}
