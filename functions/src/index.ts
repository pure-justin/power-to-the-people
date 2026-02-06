/**
 * Cloud Functions Entry Point
 *
 * Exports all Firebase Cloud Functions for the Power to the People app.
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export SMT Connector functions
export { fetchSmtUsage, smtWebhook } from "./smtConnector";

// Export Lead Management functions
export {
  createLead,
  updateLead,
  addLeadNote,
  assignLead,
  recalculateLeadScores,
  leadWebhook,
} from "./leads";

// Export API Key Management functions
export {
  createApiKey,
  validateApiKey,
  revokeApiKey,
  rotateApiKey,
  updateApiKey,
  getApiKeyUsage,
  cleanupApiKeys,
  validateApiKeyFromRequest,
} from "./apiKeys";

// Export Secure Webhook Examples (API key protected endpoints)
export {
  secureLeadWebhook,
  secureSolarWebhook,
  secureLeadQuery,
} from "./secureLeadWebhook";

// Export Referral System functions
export {
  onProjectCreated,
  onProjectUpdated,
  updateReferralStatusHttp,
  getReferralStats,
  processWeeklyPayouts,
} from "./referrals";

// Export Referral Webhooks
export {
  referralStatusWebhook,
  referralBulkUpdateWebhook,
  referralStatsWebhook,
} from "./referralWebhooks";

// Export SMS Notification functions
export {
  onProjectCreated as smsOnProjectCreated,
  onProjectStatusUpdate,
  onReferralReward,
  sendCustomSMS,
  sendBulkSMS,
  sendPaymentReminders,
  getSmsStats,
  twilioStatusCallback,
} from "./smsNotifications";
