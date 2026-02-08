/**
 * Cloud Functions Entry Point
 *
 * Exports all Firebase Cloud Functions for the Power to the People app.
 * Runtime: Node.js 22
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

// Export Solar Data API functions
export {
  solarEquipment,
  solarUtilities,
  solarIncentives,
  solarPermits,
  solarComplianceCheck,
  solarComplianceQuickCheck,
  solarEstimate,
} from "./solarDataApi";

// Export Payment functions
export {
  createSubscription,
  updateSubscription,
  cancelSubscription,
  stripeWebhook,
  createCheckoutSession,
  createBillingPortalSession,
  getSubscriptionStatus,
} from "./payments";

// Export Data Refresh functions
export { refreshSolarData, triggerDataRefresh } from "./dataRefresh";

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

// Export Mercury Invoice functions
export {
  createMercuryCustomer,
  createMercuryInvoice,
  getMercuryInvoice,
  listMercuryInvoices,
  cancelMercuryInvoice,
  syncInvoiceStatus,
} from "./mercuryInvoice";

// Export Project Pipeline functions
export {
  advanceProjectStage,
  createProjectTask,
  assignProjectTask,
  completeProjectTask,
  getProjectTimeline,
} from "./projectPipeline";

// Export Marketplace functions
export {
  createMarketplaceListing,
  submitBid,
  acceptBid,
  completeMarketplaceJob,
  rateWorker,
  registerWorker,
  searchWorkers,
  getMarketplaceListings,
} from "./marketplace";

// Export AI Task Engine functions
export {
  createAiTask,
  processAiTask,
  escalateToHuman,
  completeHumanTask,
  getTaskQueue,
  retryAiTask,
  getTaskStats,
} from "./aiTaskEngine";

// Export AHJ Database & Permit Knowledge Base functions
export {
  createAhj,
  getAhj,
  searchAhj,
  findAhjForAddress,
  updateAhjRequirements,
  createPermitSop,
  getPermitSop,
  verifyAhj,
  getAhjStats,
} from "./ahjDatabase";

// Export Site Survey functions
export {
  createSurvey,
  updateSurvey,
  submitSurvey,
  getSurvey,
  getSurveysByProject,
  reviewSurvey,
  addSurveyPhoto,
} from "./surveyService";

// Export Permit Lifecycle functions
export {
  createPermit,
  submitPermit,
  updatePermitStatus,
  getPermit,
  getPermitsByProject,
  addPermitCorrection,
  resolveCorrection,
  checkPermitStatuses,
} from "./permitService";

// Export CAD Design Engine functions
export {
  generateDesign,
  getDesign,
  getDesignsByProject,
  updateDesign,
  approveDesign,
  calculateSystemSize,
} from "./cadService";

// Export EagleView Integration functions
export {
  orderEagleviewReport,
  checkEagleviewStatus,
  processEagleviewDelivery,
  getEagleviewReport,
  shouldOrderEagleview,
} from "./eagleviewService";

// Export Scheduling & Install Coordination functions
export {
  setAvailability,
  getAvailability,
  proposeSchedule,
  confirmSchedule,
  reschedule,
  getInstallSchedule,
  getUpcomingInstalls,
  getCustomerSchedule,
} from "./schedulingService";

// Export Install Photo QC functions
export {
  uploadInstallPhoto,
  getPhotosByProject,
  getPhaseStatus,
  requestPhotoReview,
  signOffPhase,
  getInstallProgress,
} from "./photoAnalysisService";

// Export Funding & Bankability functions
export {
  createFundingPackage,
  checkDocumentReadiness,
  submitFunding,
  updateFundingStatus,
  requestMilestonePayment,
  getFundingByProject,
  generateBankabilityPackage,
} from "./fundingService";

// Export Pipeline Orchestrator — auto-triggers between stages
// Survey ✓ → CAD → Permit → Schedule → Install → Funding → Credit
export {
  onSurveyApproved,
  onDesignApproved,
  onPermitApproved,
  onInstallComplete,
  onFundingComplete,
} from "./pipelineOrchestrator";

// Export Tax Credit Marketplace functions
export {
  auditProjectCredits,
  getAudit,
  getAuditsByProject,
  certifyAudit,
  addAuditCheck,
  assessCreditRisk,
  quoteCreditInsurance,
  activateInsurance,
  getInsurance,
  createCreditListing,
  searchCreditListings,
  getCreditListing,
  makeOffer,
  respondToOffer,
  initiateCreditTransfer,
  completeCreditTransfer,
  getCreditTransactions,
  getCreditMarketStats,
} from "./taxCreditService";

// Export Document Service functions (replaces PandaDoc — $0/month)
// HTML→PDF generation, ESIGN Act compliant e-signatures, full audit trail
export {
  generateDocument,
  getDocument,
  getDocumentsByProject,
  sendDocument,
  viewDocument,
  signDocument,
  voidDocument,
  saveDocumentTemplate,
  getDocumentStats,
} from "./documentService";
