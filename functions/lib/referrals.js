"use strict";
/**
 * Cloud Functions for Referral System
 * Handles automated referral tracking, status updates, and reward calculations
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
exports.processWeeklyPayouts = exports.getReferralStats = exports.updateReferralStatusHttp = exports.onProjectUpdated = exports.onProjectCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Automatically marks referral as qualified when a new project with a referral code meets qualification criteria
 *
 * @function onProjectCreated
 * @type trigger
 * @auth none
 * @input {{ projectId: string }}
 * @output {{ null }}
 * @errors console.error on failure
 * @billing none
 * @rateLimit none
 * @firestore projects, referralTracking, referrals
 */
exports.onProjectCreated = functions.firestore
    .document("projects/{projectId}")
    .onCreate(async (snap, context) => {
    const projectData = snap.data();
    const projectId = context.params.projectId;
    console.log(`Processing new project: ${projectId}`);
    // Check if this project has a referral code
    if (!projectData.referralCode) {
        console.log("No referral code on project");
        return null;
    }
    try {
        // Find the referral tracking record
        const trackingQuery = await db
            .collection("referralTracking")
            .where("projectId", "==", projectId)
            .limit(1)
            .get();
        if (trackingQuery.empty) {
            console.log("No tracking record found for project");
            return null;
        }
        const trackingDoc = trackingQuery.docs[0];
        const trackingData = trackingDoc.data();
        // Check if project qualifies (based on your criteria)
        const qualifies = projectData.qualified === true ||
            (projectData.homeownership === "own" &&
                projectData.creditScore >= 650 &&
                projectData.esiid);
        if (qualifies && trackingData.status === "signed_up") {
            console.log(`Project ${projectId} qualifies - updating referral status`);
            // Update referral to "qualified" status
            await updateReferralStatus(trackingDoc.id, "qualified");
        }
        return null;
    }
    catch (error) {
        console.error("Error processing project referral:", error);
        return null;
    }
});
/**
 * Updates referral milestone status and sends notifications when a project status progresses through the pipeline
 *
 * @function onProjectUpdated
 * @type trigger
 * @auth none
 * @input {{ projectId: string }}
 * @output {{ null }}
 * @errors console.error on failure
 * @billing none
 * @rateLimit none
 * @firestore projects, referralTracking, referrals, pendingNotifications
 */
exports.onProjectUpdated = functions.firestore
    .document("projects/{projectId}")
    .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const projectId = context.params.projectId;
    // Check if status changed
    if (beforeData.status === afterData.status) {
        return null;
    }
    console.log(`Project ${projectId} status changed: ${beforeData.status} -> ${afterData.status}`);
    // Map project status to referral status
    const statusMap = {
        site_survey_scheduled: "site_survey",
        installed: "installed",
        active: "installed", // Also count "active" as installed
    };
    const newReferralStatus = statusMap[afterData.status];
    if (!newReferralStatus) {
        return null;
    }
    try {
        // Find referral tracking for this project
        const trackingQuery = await db
            .collection("referralTracking")
            .where("projectId", "==", projectId)
            .limit(1)
            .get();
        if (trackingQuery.empty) {
            console.log("No referral tracking found");
            return null;
        }
        const trackingDoc = trackingQuery.docs[0];
        const trackingData = trackingDoc.data();
        // Only update if new status is "further along" than current
        const statusOrder = [
            "signed_up",
            "qualified",
            "site_survey",
            "installed",
        ];
        const currentIndex = statusOrder.indexOf(trackingData.status);
        const newIndex = statusOrder.indexOf(newReferralStatus);
        if (newIndex > currentIndex) {
            console.log(`Updating referral status to: ${newReferralStatus}`);
            await updateReferralStatus(trackingDoc.id, newReferralStatus);
            // Send notification to referrer
            await sendReferralMilestoneNotification(trackingData.referrerId, newReferralStatus, trackingData);
        }
        return null;
    }
    catch (error) {
        console.error("Error updating referral status:", error);
        return null;
    }
});
/**
 * Allows admins to manually update a referral tracking record's status and recalculate earnings
 *
 * @function updateReferralStatusHttp
 * @type onCall
 * @auth firebase
 * @input {{ trackingId: string, newStatus: "signed_up" | "qualified" | "site_survey" | "installed" }}
 * @output {{ success: boolean, earningsAdded: number }}
 * @errors unauthenticated, permission-denied, invalid-argument, internal
 * @billing none
 * @rateLimit none
 * @firestore users, referralTracking, referrals
 */
exports.updateReferralStatusHttp = functions.https.onCall(async (data, context) => {
    var _a;
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    // Check admin role
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be admin");
    }
    const { trackingId, newStatus } = data;
    if (!trackingId || !newStatus) {
        throw new functions.https.HttpsError("invalid-argument", "trackingId and newStatus required");
    }
    try {
        const result = await updateReferralStatus(trackingId, newStatus);
        return { success: true, ...result };
    }
    catch (error) {
        console.error("Error updating referral:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Returns aggregate referral program statistics including referrer counts, earnings, and status breakdowns
 *
 * @function getReferralStats
 * @type onCall
 * @auth firebase
 * @input {{ }}
 * @output {{ totalReferrers: number, totalReferrals: number, totalEarnings: number, totalPaid: number, pendingPayouts: number, statusCounts: Record<string, number> }}
 * @errors unauthenticated, permission-denied, internal
 * @billing none
 * @rateLimit none
 * @firestore users, referrals, referralTracking
 */
exports.getReferralStats = functions.https.onCall(async (data, context) => {
    var _a;
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    // Check admin role
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be admin");
    }
    try {
        // Get all referral records
        const referralsSnapshot = await db.collection("referrals").get();
        let totalReferrers = 0;
        let totalReferrals = 0;
        let totalEarnings = 0;
        let totalPaid = 0;
        referralsSnapshot.forEach((doc) => {
            const data = doc.data();
            totalReferrers++;
            totalReferrals += data.totalReferrals || 0;
            totalEarnings += data.totalEarnings || 0;
            totalPaid += data.paidEarnings || 0;
        });
        // Get tracking stats
        const trackingSnapshot = await db.collection("referralTracking").get();
        const statusCounts = {
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
        return {
            totalReferrers,
            totalReferrals,
            totalEarnings,
            totalPaid,
            pendingPayouts: totalEarnings - totalPaid,
            statusCounts,
        };
    }
    catch (error) {
        console.error("Error getting referral stats:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Processes pending referral payouts every Monday at 9 AM CST for referrers with earnings >= $100
 *
 * @function processWeeklyPayouts
 * @type pubsub
 * @auth none
 * @input {{ }}
 * @output {{ null }}
 * @errors console.error on failure
 * @billing none
 * @rateLimit none
 * @firestore referrals, payouts, pendingNotifications
 */
exports.processWeeklyPayouts = functions.pubsub
    .schedule("0 9 * * 1")
    .timeZone("America/Chicago")
    .onRun(async (context) => {
    console.log("Running weekly payout processing...");
    try {
        // Find referrers with pending earnings >= $100 (minimum payout)
        const referralsSnapshot = await db
            .collection("referrals")
            .where("pendingEarnings", ">=", 100)
            .get();
        let payoutsCreated = 0;
        for (const doc of referralsSnapshot.docs) {
            const referralData = doc.data();
            const userId = doc.id;
            // Create payout record
            await db.collection("payouts").add({
                userId,
                amount: referralData.pendingEarnings,
                status: "pending",
                method: "direct_deposit",
                requestedAt: admin.firestore.FieldValue.serverTimestamp(),
                processedAt: null,
            });
            // Move to paid earnings
            await doc.ref.update({
                paidEarnings: admin.firestore.FieldValue.increment(referralData.pendingEarnings),
                pendingEarnings: 0,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            payoutsCreated++;
            // Send payout notification
            await sendPayoutNotification(userId, referralData.pendingEarnings);
        }
        console.log(`Created ${payoutsCreated} payouts`);
        return null;
    }
    catch (error) {
        console.error("Error processing payouts:", error);
        return null;
    }
});
/**
 * Helper: Update referral status and calculate earnings
 */
async function updateReferralStatus(trackingId, newStatus) {
    const trackingRef = db.collection("referralTracking").doc(trackingId);
    const trackingSnap = await trackingRef.get();
    if (!trackingSnap.exists) {
        throw new Error("Referral tracking record not found");
    }
    const trackingData = trackingSnap.data();
    const milestones = trackingData.earningMilestones;
    let earningsToAdd = 0;
    // Update milestone completion
    const now = admin.firestore.Timestamp.now();
    if (newStatus === "qualified" && !milestones.qualified.completed) {
        milestones.qualified.completed = true;
        milestones.qualified.date = now;
        earningsToAdd += milestones.qualified.amount;
    }
    else if (newStatus === "site_survey" && !milestones.siteSurvey.completed) {
        milestones.siteSurvey.completed = true;
        milestones.siteSurvey.date = now;
        earningsToAdd += milestones.siteSurvey.amount;
    }
    else if (newStatus === "installed" && !milestones.installed.completed) {
        milestones.installed.completed = true;
        milestones.installed.date = now;
        earningsToAdd += milestones.installed.amount;
    }
    // Update tracking record
    await trackingRef.update({
        status: newStatus,
        earningMilestones: milestones,
        earnings: admin.firestore.FieldValue.increment(earningsToAdd),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update referrer's earnings and counts
    const referrerRef = db.collection("referrals").doc(trackingData.referrerId);
    const updates = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (newStatus === "qualified") {
        updates.qualifiedReferrals = admin.firestore.FieldValue.increment(1);
    }
    else if (newStatus === "installed") {
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
/**
 * Helper: Send notification when referral reaches milestone
 */
async function sendReferralMilestoneNotification(referrerId, milestone, referralData) {
    const milestoneMessages = {
        qualified: {
            title: "Referral Qualified! 🎉",
            body: `${referralData.referredName} just qualified. You're on your way to earning rewards!`,
        },
        site_survey: {
            title: "You Earned $50! 💵",
            body: `${referralData.referredName}'s site survey is scheduled. $50 added to your account!`,
        },
        installed: {
            title: "You Earned $450! 🚀",
            body: `${referralData.referredName}'s system is installed. $450 added to your account!`,
        },
    };
    const notification = milestoneMessages[milestone];
    if (!notification) {
        return;
    }
    // Queue notification for sending
    await db.collection("pendingNotifications").add({
        userId: referrerId,
        type: "referral_milestone",
        milestone,
        referralData: {
            referredName: referralData.referredName,
            referredEmail: referralData.referredEmail,
        },
        title: notification.title,
        body: notification.body,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Helper: Send payout notification
 */
async function sendPayoutNotification(userId, amount) {
    await db.collection("pendingNotifications").add({
        userId,
        type: "payout_processed",
        amount,
        title: "Payout Processed! 💰",
        body: `Your referral earnings of $${amount.toFixed(2)} have been processed and will arrive in 3-5 business days.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
//# sourceMappingURL=referrals.js.map