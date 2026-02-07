"use strict";
/**
 * SMS Notification Service
 *
 * Sends SMS notifications via Twilio for:
 * - New enrollments/leads
 * - Application status updates
 * - Referral rewards
 * - Installation scheduling
 * - Payment reminders
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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectSmsHistory = exports.handleIncomingSms = exports.updateSmsPreferences = exports.twilioStatusCallback = exports.getSmsStats = exports.sendPaymentReminders = exports.sendBulkSMS = exports.sendCustomSMS = exports.onReferralReward = exports.onProjectStatusUpdate = exports.onProjectCreated = void 0;
exports.sendSMS = sendSMS;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const twilio = __importStar(require("twilio"));
// Initialize Twilio client
const twilioAccountSid = ((_a = functions.config().twilio) === null || _a === void 0 ? void 0 : _a.account_sid) || process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = ((_b = functions.config().twilio) === null || _b === void 0 ? void 0 : _b.auth_token) || process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = ((_c = functions.config().twilio) === null || _c === void 0 ? void 0 : _c.phone_number) || process.env.TWILIO_PHONE_NUMBER;
let twilioClient = null;
if (twilioAccountSid && twilioAuthToken) {
    twilioClient = twilio.default(twilioAccountSid, twilioAuthToken);
}
/**
 * SMS Templates
 */
const SMS_TEMPLATES = {
    // Customer notifications
    ENROLLMENT_CONFIRMATION: (name, projectId) => `Hi ${name}! Thanks for enrolling in Power to the People. Your application ${projectId} is being reviewed. Track status: https://power-to-the-people-vpp.web.app/project/${projectId}`,
    ENROLLMENT_APPROVED: (name, savingsAmount) => `Great news ${name}! Your solar application is approved. You'll save ~$${savingsAmount}/month. Your installer will contact you within 48 hours to schedule.`,
    ENROLLMENT_PENDING: (name, reason) => `Hi ${name}, your solar application needs additional info: ${reason}. Please log in to your portal to update.`,
    INSTALLATION_SCHEDULED: (name, date, installer) => `${name}, your solar installation is scheduled for ${date} with ${installer}. They'll contact you 24hrs before arrival.`,
    INSTALLATION_COMPLETE: (name, systemSize) => `Congrats ${name}! Your ${systemSize}kW solar system is installed and generating power. Welcome to clean energy!`,
    REFERRAL_REWARD: (name, amount, friendName) => `${name}, you earned $${amount}! ${friendName} enrolled using your referral code. Payment processing within 7 days.`,
    PAYMENT_REMINDER: (name, amount, dueDate) => `Hi ${name}, reminder: $${amount} payment due ${dueDate}. Pay at: https://power-to-the-people-vpp.web.app/portal`,
    // Admin notifications
    NEW_LEAD_ADMIN: (leadName, city, systemSize) => `🔥 New lead: ${leadName} in ${city} - ${systemSize}kW system`,
    HIGH_VALUE_LEAD: (leadName, value, score) => `🎯 High-value lead: ${leadName} - $${value} estimated value (Score: ${score}/100)`,
    INSTALLATION_ISSUE: (projectId, issue) => `⚠️ Installation issue - ${projectId}: ${issue}`,
};
/**
 * Send SMS via Twilio
 */
async function sendSMS(to, message) {
    if (!twilioClient) {
        console.error("Twilio client not initialized. Check environment variables.");
        return false;
    }
    try {
        // Format phone number (ensure it starts with +1 for US)
        const formattedPhone = to.startsWith("+")
            ? to
            : `+1${to.replace(/\D/g, "")}`;
        const result = await twilioClient.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: formattedPhone,
        });
        console.log(`SMS sent successfully to ${to}: ${result.sid}`);
        // Log to Firestore for tracking
        await admin.firestore().collection("smsLog").add({
            to: formattedPhone,
            message,
            sid: result.sid,
            status: result.status,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
    }
    catch (error) {
        console.error("Error sending SMS:", error);
        // Log error to Firestore
        await admin
            .firestore()
            .collection("smsLog")
            .add({
            to,
            message,
            error: error instanceof Error ? error.message : String(error),
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return false;
    }
}
/**
 * Firestore Trigger: New Project Created
 * Sends SMS to customer and admin team
 */
exports.onProjectCreated = functions.firestore
    .document("projects/{projectId}")
    .onCreate(async (snap, context) => {
    var _a, _b, _c, _d, _e;
    const project = snap.data();
    const projectId = context.params.projectId;
    // Support both flat and nested data structures
    const phone = project.phone || ((_a = project.customer) === null || _a === void 0 ? void 0 : _a.phone);
    const firstName = project.firstName || ((_b = project.customer) === null || _b === void 0 ? void 0 : _b.firstName) || "there";
    const lastName = project.lastName || ((_c = project.customer) === null || _c === void 0 ? void 0 : _c.lastName) || "";
    const city = project.city || ((_d = project.address) === null || _d === void 0 ? void 0 : _d.city) || "Unknown";
    const smsOptIn = project.smsOptIn !== false; // Default to true for backward compat
    // Send customer confirmation (only if opted in)
    if (phone && smsOptIn) {
        const message = SMS_TEMPLATES.ENROLLMENT_CONFIRMATION(firstName, projectId);
        await sendSMS(phone, message);
    }
    // Send admin notification
    const adminPhone = ((_e = functions.config().admin) === null || _e === void 0 ? void 0 : _e.phone) || process.env.ADMIN_PHONE;
    if (adminPhone && project.systemSize) {
        const message = SMS_TEMPLATES.NEW_LEAD_ADMIN(firstName + " " + lastName, city, project.systemSize.toString());
        await sendSMS(adminPhone, message);
    }
    // Check if high-value lead (>$40k system)
    if (project.systemCost && project.systemCost > 40000) {
        const message = SMS_TEMPLATES.HIGH_VALUE_LEAD(firstName + " " + lastName, project.systemCost.toLocaleString(), project.leadScore || "85");
        if (adminPhone) {
            await sendSMS(adminPhone, message);
        }
    }
});
/**
 * Firestore Trigger: Project Status Updated
 * Sends SMS when status changes to approved, pending, or installed
 */
exports.onProjectStatusUpdate = functions.firestore
    .document("projects/{projectId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d;
    const before = change.before.data();
    const after = change.after.data();
    // Only send if status changed
    if (before.status === after.status) {
        return;
    }
    const phone = after.phone || ((_a = after.customer) === null || _a === void 0 ? void 0 : _a.phone);
    if (!phone)
        return;
    // Check SMS opt-in
    if (after.smsOptIn === false)
        return;
    const name = after.firstName || ((_b = after.customer) === null || _b === void 0 ? void 0 : _b.firstName) || "there";
    let message = null;
    switch (after.status) {
        case "approved":
            message = SMS_TEMPLATES.ENROLLMENT_APPROVED(name, ((_c = after.monthlySavings) === null || _c === void 0 ? void 0 : _c.toFixed(0)) || "150");
            break;
        case "pending_info":
            message = SMS_TEMPLATES.ENROLLMENT_PENDING(name, after.pendingReason || "additional information");
            break;
        case "installation_scheduled":
            if (after.installationDate && after.installerName) {
                message = SMS_TEMPLATES.INSTALLATION_SCHEDULED(name, new Date(after.installationDate).toLocaleDateString(), after.installerName);
            }
            break;
        case "installed":
            message = SMS_TEMPLATES.INSTALLATION_COMPLETE(name, ((_d = after.systemSize) === null || _d === void 0 ? void 0 : _d.toFixed(1)) || "10");
            break;
    }
    if (message) {
        await sendSMS(phone, message);
    }
});
/**
 * Firestore Trigger: Referral Reward Earned
 * Sends SMS when a referral earns a reward
 */
exports.onReferralReward = functions.firestore
    .document("referrals/{referralId}")
    .onUpdate(async (change, context) => {
    var _a;
    const before = change.before.data();
    const after = change.after.data();
    // Only send if reward was just earned
    if (before.rewardEarned || !after.rewardEarned) {
        return;
    }
    // Get referrer details
    const referrerDoc = await admin
        .firestore()
        .collection("users")
        .doc(after.referrerId)
        .get();
    const referrer = referrerDoc.data();
    if (!(referrer === null || referrer === void 0 ? void 0 : referrer.phone))
        return;
    const message = SMS_TEMPLATES.REFERRAL_REWARD(referrer.firstName || "there", ((_a = after.rewardAmount) === null || _a === void 0 ? void 0 : _a.toFixed(0)) || "500", after.referredName || "Your friend");
    await sendSMS(referrer.phone, message);
});
/**
 * HTTP Callable: Send Custom SMS
 * Allows admin to send custom SMS messages
 */
exports.sendCustomSMS = functions.https.onCall(async (data, context) => {
    // Verify admin auth
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to send SMS");
    }
    // Check if user is admin
    const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(context.auth.uid)
        .get();
    const user = userDoc.data();
    if ((user === null || user === void 0 ? void 0 : user.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be admin to send SMS");
    }
    const { phone, message } = data;
    if (!phone || !message) {
        throw new functions.https.HttpsError("invalid-argument", "Phone and message are required");
    }
    const success = await sendSMS(phone, message);
    return { success };
});
/**
 * HTTP Callable: Send Bulk SMS
 * Sends SMS to multiple recipients (max 100 per call)
 */
exports.sendBulkSMS = functions.https.onCall(async (data, context) => {
    // Verify admin auth
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to send bulk SMS");
    }
    // Check if user is admin
    const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(context.auth.uid)
        .get();
    const user = userDoc.data();
    if ((user === null || user === void 0 ? void 0 : user.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be admin to send bulk SMS");
    }
    const { recipients, message } = data;
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "Recipients array is required");
    }
    if (recipients.length > 100) {
        throw new functions.https.HttpsError("invalid-argument", "Maximum 100 recipients per call");
    }
    if (!message) {
        throw new functions.https.HttpsError("invalid-argument", "Message is required");
    }
    // Send SMS to all recipients
    const results = await Promise.allSettled(recipients.map((phone) => sendSMS(phone, message)));
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - successful;
    return {
        total: recipients.length,
        successful,
        failed,
    };
});
/**
 * Scheduled Function: Send Payment Reminders
 * Runs daily at 9 AM to check for upcoming payments
 */
exports.sendPaymentReminders = functions.pubsub
    .schedule("0 9 * * *")
    .timeZone("America/Chicago")
    .onRun(async (context) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    // Query projects with payments due in 1-3 days
    const projectsSnapshot = await admin
        .firestore()
        .collection("projects")
        .where("nextPaymentDate", ">=", tomorrow)
        .where("nextPaymentDate", "<=", threeDaysFromNow)
        .where("paymentReminderSent", "==", false)
        .get();
    const reminderPromises = projectsSnapshot.docs.map(async (doc) => {
        const project = doc.data();
        if (!project.phone ||
            !project.nextPaymentAmount ||
            !project.nextPaymentDate) {
            return;
        }
        const message = SMS_TEMPLATES.PAYMENT_REMINDER(project.firstName || "there", project.nextPaymentAmount.toFixed(2), new Date(project.nextPaymentDate).toLocaleDateString());
        const success = await sendSMS(project.phone, message);
        if (success) {
            // Mark reminder as sent
            await doc.ref.update({
                paymentReminderSent: true,
            });
        }
    });
    await Promise.all(reminderPromises);
    console.log(`Sent ${reminderPromises.length} payment reminders`);
});
/**
 * HTTP Endpoint: Get SMS Stats
 * Returns SMS usage statistics
 */
exports.getSmsStats = functions.https.onCall(async (data, context) => {
    // Verify admin auth
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to view SMS stats");
    }
    // Check if user is admin
    const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(context.auth.uid)
        .get();
    const user = userDoc.data();
    if ((user === null || user === void 0 ? void 0 : user.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be admin to view SMS stats");
    }
    // Get SMS logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const logsSnapshot = await admin
        .firestore()
        .collection("smsLog")
        .where("sentAt", ">=", thirtyDaysAgo)
        .get();
    const total = logsSnapshot.size;
    const failed = logsSnapshot.docs.filter((doc) => doc.data().error).length;
    const successful = total - failed;
    // Calculate cost (assuming $0.0075 per SMS)
    const estimatedCost = total * 0.0075;
    return {
        total,
        successful,
        failed,
        estimatedCost: estimatedCost.toFixed(2),
        period: "Last 30 days",
    };
});
/**
 * HTTP Endpoint: Webhook for Twilio Status Callbacks
 * Receives delivery status updates from Twilio
 */
exports.twilioStatusCallback = functions.https.onRequest(async (req, res) => {
    const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = req.body;
    if (!MessageSid) {
        res.status(400).send("Missing MessageSid");
        return;
    }
    // Update SMS log with delivery status
    const logsSnapshot = await admin
        .firestore()
        .collection("smsLog")
        .where("sid", "==", MessageSid)
        .get();
    if (!logsSnapshot.empty) {
        const logDoc = logsSnapshot.docs[0];
        await logDoc.ref.update({
            deliveryStatus: MessageStatus,
            errorCode: ErrorCode || null,
            errorMessage: ErrorMessage || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    res.status(200).send("OK");
});
/**
 * HTTP Callable: Update SMS Preferences
 * Allows customers to opt-in or opt-out of SMS notifications
 */
exports.updateSmsPreferences = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to update preferences");
    }
    const { projectId, smsOptIn } = data;
    if (!projectId || typeof smsOptIn !== "boolean") {
        throw new functions.https.HttpsError("invalid-argument", "projectId and smsOptIn (boolean) are required");
    }
    // Update project SMS preference
    const projectRef = admin.firestore().collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Project not found");
    }
    await projectRef.update({
        smsOptIn,
        smsPreferencesUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // If opting out, send confirmation SMS
    const project = projectDoc.data();
    const phone = (project === null || project === void 0 ? void 0 : project.phone) || ((_a = project === null || project === void 0 ? void 0 : project.customer) === null || _a === void 0 ? void 0 : _a.phone);
    if (!smsOptIn && phone) {
        await sendSMS(phone, "You've been unsubscribed from Power to the People SMS notifications. Reply START to re-subscribe.");
    }
    return { success: true, smsOptIn };
});
/**
 * HTTP Endpoint: Handle Incoming SMS (Twilio webhook)
 * Processes STOP/START keywords for opt-out/opt-in
 */
exports.handleIncomingSms = functions.https.onRequest(async (req, res) => {
    const { From, Body } = req.body;
    if (!From || !Body) {
        res.status(400).send("Missing From or Body");
        return;
    }
    const normalizedBody = Body.trim().toUpperCase();
    const formattedPhone = From.startsWith("+")
        ? From
        : `+1${From.replace(/\D/g, "")}`;
    // Handle STOP/UNSUBSCRIBE
    if (["STOP", "UNSUBSCRIBE", "CANCEL", "QUIT"].includes(normalizedBody)) {
        // Find projects with this phone number and opt them out
        const projectsSnapshot = await admin
            .firestore()
            .collection("projects")
            .where("customer.phone", "==", formattedPhone)
            .get();
        // Also check flat phone field
        const flatSnapshot = await admin
            .firestore()
            .collection("projects")
            .where("phone", "==", formattedPhone)
            .get();
        const allDocs = [...projectsSnapshot.docs, ...flatSnapshot.docs];
        const updatePromises = allDocs.map((doc) => doc.ref.update({
            smsOptIn: false,
            smsPreferencesUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }));
        await Promise.all(updatePromises);
        // Log the opt-out
        await admin.firestore().collection("smsLog").add({
            from: formattedPhone,
            action: "opt_out",
            keyword: normalizedBody,
            projectsUpdated: allDocs.length,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    // Handle START/SUBSCRIBE
    if (["START", "SUBSCRIBE", "YES"].includes(normalizedBody)) {
        const projectsSnapshot = await admin
            .firestore()
            .collection("projects")
            .where("customer.phone", "==", formattedPhone)
            .get();
        const flatSnapshot = await admin
            .firestore()
            .collection("projects")
            .where("phone", "==", formattedPhone)
            .get();
        const allDocs = [...projectsSnapshot.docs, ...flatSnapshot.docs];
        const updatePromises = allDocs.map((doc) => doc.ref.update({
            smsOptIn: true,
            smsPreferencesUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }));
        await Promise.all(updatePromises);
        await admin.firestore().collection("smsLog").add({
            from: formattedPhone,
            action: "opt_in",
            keyword: normalizedBody,
            projectsUpdated: allDocs.length,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    // Respond with TwiML (empty response - Twilio handles STOP/START natively too)
    res.set("Content-Type", "text/xml");
    res.send("<Response></Response>");
});
/**
 * HTTP Callable: Get SMS History for a Project
 * Returns SMS log entries for a specific project's phone number
 */
exports.getProjectSmsHistory = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to view SMS history");
    }
    const { projectId } = data;
    if (!projectId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId is required");
    }
    // Get the project to find the phone number
    const projectDoc = await admin
        .firestore()
        .collection("projects")
        .doc(projectId)
        .get();
    if (!projectDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Project not found");
    }
    const project = projectDoc.data();
    const phone = (project === null || project === void 0 ? void 0 : project.phone) || ((_a = project === null || project === void 0 ? void 0 : project.customer) === null || _a === void 0 ? void 0 : _a.phone);
    if (!phone) {
        return { messages: [], smsOptIn: (project === null || project === void 0 ? void 0 : project.smsOptIn) !== false };
    }
    // Format phone for matching
    const formattedPhone = phone.startsWith("+")
        ? phone
        : `+1${phone.replace(/\D/g, "")}`;
    // Get SMS log entries for this phone
    const logsSnapshot = await admin
        .firestore()
        .collection("smsLog")
        .where("to", "==", formattedPhone)
        .orderBy("sentAt", "desc")
        .limit(50)
        .get();
    const messages = logsSnapshot.docs.map((doc) => {
        var _a, _b, _c;
        return ({
            id: doc.id,
            ...doc.data(),
            sentAt: ((_c = (_b = (_a = doc.data().sentAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || null,
        });
    });
    return {
        messages,
        smsOptIn: (project === null || project === void 0 ? void 0 : project.smsOptIn) !== false,
    };
});
//# sourceMappingURL=smsNotifications.js.map