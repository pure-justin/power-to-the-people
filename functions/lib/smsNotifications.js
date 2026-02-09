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
exports.twilioStatusCallback = exports.getSmsStats = exports.sendPaymentReminders = exports.sendBulkSMS = exports.sendCustomSMS = exports.onReferralReward = exports.onProjectStatusUpdate = exports.onProjectCreated = void 0;
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
 * Sends an SMS message via Twilio and logs the result to Firestore
 *
 * @function sendSMS
 * @type helper
 * @auth none
 * @input {{ to: string, message: string }}
 * @output {{ boolean }}
 * @errors Twilio API errors
 * @billing sms
 * @rateLimit none
 * @firestore smsLog
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
 * Sends enrollment confirmation SMS to customer and new lead alert to admin on project creation
 *
 * @function onProjectCreated
 * @type trigger
 * @auth none
 * @input {{ projectId: string }}
 * @output {{ void }}
 * @errors Twilio API errors
 * @billing sms
 * @rateLimit none
 * @firestore projects, smsLog
 */
exports.onProjectCreated = functions.firestore
    .document("projects/{projectId}")
    .onCreate(async (snap, context) => {
    var _a;
    const project = snap.data();
    const projectId = context.params.projectId;
    // Send customer confirmation
    if (project.phone) {
        const message = SMS_TEMPLATES.ENROLLMENT_CONFIRMATION(project.firstName || "there", projectId);
        await sendSMS(project.phone, message);
    }
    // Send admin notification
    const adminPhone = ((_a = functions.config().admin) === null || _a === void 0 ? void 0 : _a.phone) || process.env.ADMIN_PHONE;
    if (adminPhone && project.systemSize) {
        const message = SMS_TEMPLATES.NEW_LEAD_ADMIN(project.firstName + " " + project.lastName, project.city || "Unknown", project.systemSize.toString());
        await sendSMS(adminPhone, message);
    }
    // Check if high-value lead (>$40k system)
    if (project.systemCost && project.systemCost > 40000) {
        const message = SMS_TEMPLATES.HIGH_VALUE_LEAD(project.firstName + " " + project.lastName, project.systemCost.toLocaleString(), project.leadScore || "85");
        await sendSMS(adminPhone, message);
    }
});
/**
 * Sends status update SMS to customer when project status changes (approved, pending_info, installation_scheduled, installed)
 *
 * @function onProjectStatusUpdate
 * @type trigger
 * @auth none
 * @input {{ projectId: string }}
 * @output {{ void }}
 * @errors Twilio API errors
 * @billing sms
 * @rateLimit none
 * @firestore projects, smsLog
 */
exports.onProjectStatusUpdate = functions.firestore
    .document("projects/{projectId}")
    .onUpdate(async (change, context) => {
    var _a, _b;
    const before = change.before.data();
    const after = change.after.data();
    // Only send if status changed
    if (before.status === after.status) {
        return;
    }
    const phone = after.phone;
    if (!phone)
        return;
    const name = after.firstName || "there";
    let message = null;
    switch (after.status) {
        case "approved":
            message = SMS_TEMPLATES.ENROLLMENT_APPROVED(name, ((_a = after.monthlySavings) === null || _a === void 0 ? void 0 : _a.toFixed(0)) || "150");
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
            message = SMS_TEMPLATES.INSTALLATION_COMPLETE(name, ((_b = after.systemSize) === null || _b === void 0 ? void 0 : _b.toFixed(1)) || "10");
            break;
    }
    if (message) {
        await sendSMS(phone, message);
    }
});
/**
 * Sends reward notification SMS to the referrer when a referral earns a reward
 *
 * @function onReferralReward
 * @type trigger
 * @auth none
 * @input {{ referralId: string }}
 * @output {{ void }}
 * @errors Twilio API errors
 * @billing sms
 * @rateLimit none
 * @firestore referrals, users, smsLog
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
 * Allows admins to send a custom SMS message to a single phone number
 *
 * @function sendCustomSMS
 * @type onCall
 * @auth firebase
 * @input {{ phone: string, message: string }}
 * @output {{ success: boolean }}
 * @errors unauthenticated, permission-denied, invalid-argument
 * @billing sms
 * @rateLimit none
 * @firestore users, smsLog
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
 * Sends the same SMS message to multiple recipients in bulk (max 100 per call)
 *
 * @function sendBulkSMS
 * @type onCall
 * @auth firebase
 * @input {{ recipients: string[], message: string }}
 * @output {{ total: number, successful: number, failed: number }}
 * @errors unauthenticated, permission-denied, invalid-argument
 * @billing sms
 * @rateLimit none
 * @firestore users, smsLog
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
 * Sends payment reminder SMS daily at 9 AM CST for payments due within 1-3 days
 *
 * @function sendPaymentReminders
 * @type pubsub
 * @auth none
 * @input {{ }}
 * @output {{ void }}
 * @errors Twilio API errors
 * @billing sms
 * @rateLimit none
 * @firestore projects, smsLog
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
 * Returns SMS usage statistics for the last 30 days including success/failure counts and estimated cost
 *
 * @function getSmsStats
 * @type onCall
 * @auth firebase
 * @input {{ }}
 * @output {{ total: number, successful: number, failed: number, estimatedCost: string, period: string }}
 * @errors unauthenticated, permission-denied
 * @billing none
 * @rateLimit none
 * @firestore users, smsLog
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
 * Receives Twilio delivery status callbacks and updates SMS log records with delivery status
 *
 * @function twilioStatusCallback
 * @type onRequest
 * @method POST
 * @auth none
 * @input {{ MessageSid: string, MessageStatus: string, To: string, ErrorCode?: string, ErrorMessage?: string }}
 * @output {{ string }}
 * @errors 400
 * @billing none
 * @rateLimit none
 * @firestore smsLog
 */
exports.twilioStatusCallback = functions.https.onRequest(async (req, res) => {
    var _a;
    // Validate Twilio signature
    const twilioSignature = req.headers["x-twilio-signature"];
    if (!twilioSignature) {
        res.status(401).json({ error: "Missing Twilio signature" });
        return;
    }
    const twilioAuthTokenConfig = (_a = functions.config().twilio) === null || _a === void 0 ? void 0 : _a.auth_token;
    if (twilioAuthTokenConfig) {
        const requestUrl = `https://${req.headers.host}${req.originalUrl}`;
        const isValid = twilio.validateRequest(twilioAuthTokenConfig, twilioSignature, requestUrl, req.body);
        if (!isValid) {
            res.status(403).json({ error: "Invalid Twilio signature" });
            return;
        }
    }
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
//# sourceMappingURL=smsNotifications.js.map