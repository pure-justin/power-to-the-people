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

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as twilio from "twilio";

// Initialize Twilio client
const twilioAccountSid =
  functions.config().twilio?.account_sid || process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken =
  functions.config().twilio?.auth_token || process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber =
  functions.config().twilio?.phone_number || process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

if (twilioAccountSid && twilioAuthToken) {
  twilioClient = twilio.default(twilioAccountSid, twilioAuthToken);
}

/**
 * SMS Templates
 */
const SMS_TEMPLATES = {
  // Customer notifications
  ENROLLMENT_CONFIRMATION: (name: string, projectId: string) =>
    `Hi ${name}! Thanks for enrolling in Power to the People. Your application ${projectId} is being reviewed. Track status: https://power-to-the-people-vpp.web.app/project/${projectId}`,

  ENROLLMENT_APPROVED: (name: string, savingsAmount: string) =>
    `Great news ${name}! Your solar application is approved. You'll save ~$${savingsAmount}/month. Your installer will contact you within 48 hours to schedule.`,

  ENROLLMENT_PENDING: (name: string, reason: string) =>
    `Hi ${name}, your solar application needs additional info: ${reason}. Please log in to your portal to update.`,

  INSTALLATION_SCHEDULED: (name: string, date: string, installer: string) =>
    `${name}, your solar installation is scheduled for ${date} with ${installer}. They'll contact you 24hrs before arrival.`,

  INSTALLATION_COMPLETE: (name: string, systemSize: string) =>
    `Congrats ${name}! Your ${systemSize}kW solar system is installed and generating power. Welcome to clean energy!`,

  REFERRAL_REWARD: (name: string, amount: string, friendName: string) =>
    `${name}, you earned $${amount}! ${friendName} enrolled using your referral code. Payment processing within 7 days.`,

  PAYMENT_REMINDER: (name: string, amount: string, dueDate: string) =>
    `Hi ${name}, reminder: $${amount} payment due ${dueDate}. Pay at: https://power-to-the-people-vpp.web.app/portal`,

  // Admin notifications
  NEW_LEAD_ADMIN: (leadName: string, city: string, systemSize: string) =>
    `🔥 New lead: ${leadName} in ${city} - ${systemSize}kW system`,

  HIGH_VALUE_LEAD: (leadName: string, value: string, score: string) =>
    `🎯 High-value lead: ${leadName} - $${value} estimated value (Score: ${score}/100)`,

  INSTALLATION_ISSUE: (projectId: string, issue: string) =>
    `⚠️ Installation issue - ${projectId}: ${issue}`,
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
export async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!twilioClient) {
    functions.logger.error(
      "Twilio client not initialized. Check environment variables.",
    );
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

    functions.logger.info(`SMS sent successfully to ${to}: ${result.sid}`);

    // Log to Firestore for tracking
    await admin.firestore().collection("smsLog").add({
      to: formattedPhone,
      message,
      sid: result.sid,
      status: result.status,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return true;
  } catch (error) {
    functions.logger.error("Error sending SMS:", error);

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
export const onProjectCreated = functions.firestore
  .document("projects/{projectId}")
  .onCreate(async (snap, context) => {
    const project = snap.data();
    const projectId = context.params.projectId;

    // Send customer confirmation
    if (project.phone) {
      const message = SMS_TEMPLATES.ENROLLMENT_CONFIRMATION(
        project.firstName || "there",
        projectId,
      );
      await sendSMS(project.phone, message);
    }

    // Send admin notification
    const adminPhone =
      functions.config().admin?.phone || process.env.ADMIN_PHONE;
    if (adminPhone && project.systemSize) {
      const message = SMS_TEMPLATES.NEW_LEAD_ADMIN(
        project.firstName + " " + project.lastName,
        project.city || "Unknown",
        project.systemSize.toString(),
      );
      await sendSMS(adminPhone, message);
    }

    // Check if high-value lead (>$40k system)
    if (project.systemCost && project.systemCost > 40000) {
      const message = SMS_TEMPLATES.HIGH_VALUE_LEAD(
        project.firstName + " " + project.lastName,
        project.systemCost.toLocaleString(),
        project.leadScore || "85",
      );
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
export const onProjectStatusUpdate = functions.firestore
  .document("projects/{projectId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only send if status changed
    if (before.status === after.status) {
      return;
    }

    const phone = after.phone;
    if (!phone) return;

    const name = after.firstName || "there";

    let message: string | null = null;

    switch (after.status) {
      case "approved":
        message = SMS_TEMPLATES.ENROLLMENT_APPROVED(
          name,
          after.monthlySavings?.toFixed(0) || "150",
        );
        break;

      case "pending_info":
        message = SMS_TEMPLATES.ENROLLMENT_PENDING(
          name,
          after.pendingReason || "additional information",
        );
        break;

      case "installation_scheduled":
        if (after.installationDate && after.installerName) {
          message = SMS_TEMPLATES.INSTALLATION_SCHEDULED(
            name,
            new Date(after.installationDate).toLocaleDateString(),
            after.installerName,
          );
        }
        break;

      case "installed":
        message = SMS_TEMPLATES.INSTALLATION_COMPLETE(
          name,
          after.systemSize?.toFixed(1) || "10",
        );
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
export const onReferralReward = functions.firestore
  .document("referrals/{referralId}")
  .onUpdate(async (change, context) => {
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
    if (!referrer?.phone) return;

    const message = SMS_TEMPLATES.REFERRAL_REWARD(
      referrer.firstName || "there",
      after.rewardAmount?.toFixed(0) || "500",
      after.referredName || "Your friend",
    );

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
export const sendCustomSMS = functions.https.onCall(async (data, context) => {
  // Verify admin auth
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to send SMS",
    );
  }

  // Check if user is admin
  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();

  const user = userDoc.data();
  if (user?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Must be admin to send SMS",
    );
  }

  const { phone, message } = data;

  if (!phone || !message) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Phone and message are required",
    );
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
export const sendBulkSMS = functions.https.onCall(async (data, context) => {
  // Verify admin auth
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to send bulk SMS",
    );
  }

  // Check if user is admin
  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();

  const user = userDoc.data();
  if (user?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Must be admin to send bulk SMS",
    );
  }

  const { recipients, message } = data;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Recipients array is required",
    );
  }

  if (recipients.length > 100) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Maximum 100 recipients per call",
    );
  }

  if (!message) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message is required",
    );
  }

  // Send SMS to all recipients
  const results = await Promise.allSettled(
    recipients.map((phone: string) => sendSMS(phone, message)),
  );

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
export const sendPaymentReminders = functions.pubsub
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

      if (
        !project.phone ||
        !project.nextPaymentAmount ||
        !project.nextPaymentDate
      ) {
        return;
      }

      const message = SMS_TEMPLATES.PAYMENT_REMINDER(
        project.firstName || "there",
        project.nextPaymentAmount.toFixed(2),
        new Date(project.nextPaymentDate).toLocaleDateString(),
      );

      const success = await sendSMS(project.phone, message);

      if (success) {
        // Mark reminder as sent
        await doc.ref.update({
          paymentReminderSent: true,
        });
      }
    });

    await Promise.all(reminderPromises);

    functions.logger.info(`Sent ${reminderPromises.length} payment reminders`);
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
export const getSmsStats = functions.https.onCall(async (data, context) => {
  // Verify admin auth
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to view SMS stats",
    );
  }

  // Check if user is admin
  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();

  const user = userDoc.data();
  if (user?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Must be admin to view SMS stats",
    );
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
export const twilioStatusCallback = functions.https.onRequest(
  async (req, res) => {
    // Validate Twilio signature
    const twilioSignature = req.headers["x-twilio-signature"] as string;
    if (!twilioSignature) {
      res.status(401).json({ error: "Missing Twilio signature" });
      return;
    }

    const twilioAuthTokenConfig = functions.config().twilio?.auth_token;
    if (twilioAuthTokenConfig) {
      const requestUrl = `https://${req.headers.host}${req.originalUrl}`;
      const isValid = twilio.validateRequest(
        twilioAuthTokenConfig,
        twilioSignature,
        requestUrl,
        req.body,
      );
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
  },
);
