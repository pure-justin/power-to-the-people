"use strict";
/**
 * Cloud Functions Entry Point
 *
 * Exports all Firebase Cloud Functions for the Power to the People app.
 * Runtime: Node.js 22
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
exports.getSmsStats = exports.sendPaymentReminders = exports.sendBulkSMS = exports.sendCustomSMS = exports.onReferralReward = exports.onProjectStatusUpdate = exports.smsOnProjectCreated = exports.triggerDataRefresh = exports.refreshSolarData = exports.getSubscriptionStatus = exports.createBillingPortalSession = exports.createCheckoutSession = exports.stripeWebhook = exports.cancelSubscription = exports.updateSubscription = exports.createSubscription = exports.solarEstimate = exports.solarComplianceQuickCheck = exports.solarComplianceCheck = exports.solarPermits = exports.solarIncentives = exports.solarUtilities = exports.solarEquipment = exports.referralStatsWebhook = exports.referralBulkUpdateWebhook = exports.referralStatusWebhook = exports.processWeeklyPayouts = exports.getReferralStats = exports.updateReferralStatusHttp = exports.onProjectUpdated = exports.onProjectCreated = exports.secureLeadQuery = exports.secureSolarWebhook = exports.secureLeadWebhook = exports.validateApiKeyFromRequest = exports.cleanupApiKeys = exports.getApiKeyUsage = exports.updateApiKey = exports.rotateApiKey = exports.revokeApiKey = exports.validateApiKey = exports.createApiKey = exports.leadWebhook = exports.recalculateLeadScores = exports.assignLead = exports.addLeadNote = exports.updateLead = exports.createLead = exports.smtWebhook = exports.fetchSmtUsage = void 0;
exports.resolveCorrection = exports.addPermitCorrection = exports.getPermitsByProject = exports.getPermit = exports.updatePermitStatus = exports.submitPermit = exports.createPermit = exports.addSurveyPhoto = exports.reviewSurvey = exports.getSurveysByProject = exports.getSurvey = exports.submitSurvey = exports.updateSurvey = exports.createSurvey = exports.getAhjStats = exports.verifyAhj = exports.getPermitSop = exports.createPermitSop = exports.updateAhjRequirements = exports.findAhjForAddress = exports.searchAhj = exports.getAhj = exports.createAhj = exports.getTaskStats = exports.retryAiTask = exports.getTaskQueue = exports.completeHumanTask = exports.escalateToHuman = exports.processAiTask = exports.createAiTask = exports.getMarketplaceListings = exports.searchWorkers = exports.registerWorker = exports.rateWorker = exports.completeMarketplaceJob = exports.acceptBid = exports.submitBid = exports.createMarketplaceListing = exports.getProjectTimeline = exports.completeProjectTask = exports.assignProjectTask = exports.createProjectTask = exports.advanceProjectStage = exports.syncInvoiceStatus = exports.cancelMercuryInvoice = exports.listMercuryInvoices = exports.getMercuryInvoice = exports.createMercuryInvoice = exports.createMercuryCustomer = exports.twilioStatusCallback = void 0;
exports.getCreditListing = exports.searchCreditListings = exports.createCreditListing = exports.getInsurance = exports.activateInsurance = exports.quoteCreditInsurance = exports.assessCreditRisk = exports.addAuditCheck = exports.certifyAudit = exports.getAuditsByProject = exports.getAudit = exports.auditProjectCredits = exports.onFundingComplete = exports.onInstallComplete = exports.onPermitApproved = exports.onDesignApproved = exports.onSurveyApproved = exports.generateBankabilityPackage = exports.getFundingByProject = exports.requestMilestonePayment = exports.updateFundingStatus = exports.submitFunding = exports.checkDocumentReadiness = exports.createFundingPackage = exports.getInstallProgress = exports.signOffPhase = exports.requestPhotoReview = exports.getPhaseStatus = exports.getPhotosByProject = exports.uploadInstallPhoto = exports.getCustomerSchedule = exports.getUpcomingInstalls = exports.getInstallSchedule = exports.reschedule = exports.confirmSchedule = exports.proposeSchedule = exports.getAvailability = exports.setAvailability = exports.shouldOrderEagleview = exports.getEagleviewReport = exports.processEagleviewDelivery = exports.checkEagleviewStatus = exports.orderEagleviewReport = exports.calculateSystemSize = exports.approveDesign = exports.updateDesign = exports.getDesignsByProject = exports.getDesign = exports.generateDesign = exports.checkPermitStatuses = void 0;
exports.getDocumentStats = exports.saveDocumentTemplate = exports.voidDocument = exports.signDocument = exports.viewDocument = exports.sendDocument = exports.getDocumentsByProject = exports.getDocument = exports.generateDocument = exports.getCreditMarketStats = exports.getCreditTransactions = exports.completeCreditTransfer = exports.initiateCreditTransfer = exports.respondToOffer = exports.makeOffer = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Export SMT Connector functions
var smtConnector_1 = require("./smtConnector");
Object.defineProperty(exports, "fetchSmtUsage", { enumerable: true, get: function () { return smtConnector_1.fetchSmtUsage; } });
Object.defineProperty(exports, "smtWebhook", { enumerable: true, get: function () { return smtConnector_1.smtWebhook; } });
// Export Lead Management functions
var leads_1 = require("./leads");
Object.defineProperty(exports, "createLead", { enumerable: true, get: function () { return leads_1.createLead; } });
Object.defineProperty(exports, "updateLead", { enumerable: true, get: function () { return leads_1.updateLead; } });
Object.defineProperty(exports, "addLeadNote", { enumerable: true, get: function () { return leads_1.addLeadNote; } });
Object.defineProperty(exports, "assignLead", { enumerable: true, get: function () { return leads_1.assignLead; } });
Object.defineProperty(exports, "recalculateLeadScores", { enumerable: true, get: function () { return leads_1.recalculateLeadScores; } });
Object.defineProperty(exports, "leadWebhook", { enumerable: true, get: function () { return leads_1.leadWebhook; } });
// Export API Key Management functions
var apiKeys_1 = require("./apiKeys");
Object.defineProperty(exports, "createApiKey", { enumerable: true, get: function () { return apiKeys_1.createApiKey; } });
Object.defineProperty(exports, "validateApiKey", { enumerable: true, get: function () { return apiKeys_1.validateApiKey; } });
Object.defineProperty(exports, "revokeApiKey", { enumerable: true, get: function () { return apiKeys_1.revokeApiKey; } });
Object.defineProperty(exports, "rotateApiKey", { enumerable: true, get: function () { return apiKeys_1.rotateApiKey; } });
Object.defineProperty(exports, "updateApiKey", { enumerable: true, get: function () { return apiKeys_1.updateApiKey; } });
Object.defineProperty(exports, "getApiKeyUsage", { enumerable: true, get: function () { return apiKeys_1.getApiKeyUsage; } });
Object.defineProperty(exports, "cleanupApiKeys", { enumerable: true, get: function () { return apiKeys_1.cleanupApiKeys; } });
Object.defineProperty(exports, "validateApiKeyFromRequest", { enumerable: true, get: function () { return apiKeys_1.validateApiKeyFromRequest; } });
// Export Secure Webhook Examples (API key protected endpoints)
var secureLeadWebhook_1 = require("./secureLeadWebhook");
Object.defineProperty(exports, "secureLeadWebhook", { enumerable: true, get: function () { return secureLeadWebhook_1.secureLeadWebhook; } });
Object.defineProperty(exports, "secureSolarWebhook", { enumerable: true, get: function () { return secureLeadWebhook_1.secureSolarWebhook; } });
Object.defineProperty(exports, "secureLeadQuery", { enumerable: true, get: function () { return secureLeadWebhook_1.secureLeadQuery; } });
// Export Referral System functions
var referrals_1 = require("./referrals");
Object.defineProperty(exports, "onProjectCreated", { enumerable: true, get: function () { return referrals_1.onProjectCreated; } });
Object.defineProperty(exports, "onProjectUpdated", { enumerable: true, get: function () { return referrals_1.onProjectUpdated; } });
Object.defineProperty(exports, "updateReferralStatusHttp", { enumerable: true, get: function () { return referrals_1.updateReferralStatusHttp; } });
Object.defineProperty(exports, "getReferralStats", { enumerable: true, get: function () { return referrals_1.getReferralStats; } });
Object.defineProperty(exports, "processWeeklyPayouts", { enumerable: true, get: function () { return referrals_1.processWeeklyPayouts; } });
// Export Referral Webhooks
var referralWebhooks_1 = require("./referralWebhooks");
Object.defineProperty(exports, "referralStatusWebhook", { enumerable: true, get: function () { return referralWebhooks_1.referralStatusWebhook; } });
Object.defineProperty(exports, "referralBulkUpdateWebhook", { enumerable: true, get: function () { return referralWebhooks_1.referralBulkUpdateWebhook; } });
Object.defineProperty(exports, "referralStatsWebhook", { enumerable: true, get: function () { return referralWebhooks_1.referralStatsWebhook; } });
// Export Solar Data API functions
var solarDataApi_1 = require("./solarDataApi");
Object.defineProperty(exports, "solarEquipment", { enumerable: true, get: function () { return solarDataApi_1.solarEquipment; } });
Object.defineProperty(exports, "solarUtilities", { enumerable: true, get: function () { return solarDataApi_1.solarUtilities; } });
Object.defineProperty(exports, "solarIncentives", { enumerable: true, get: function () { return solarDataApi_1.solarIncentives; } });
Object.defineProperty(exports, "solarPermits", { enumerable: true, get: function () { return solarDataApi_1.solarPermits; } });
Object.defineProperty(exports, "solarComplianceCheck", { enumerable: true, get: function () { return solarDataApi_1.solarComplianceCheck; } });
Object.defineProperty(exports, "solarComplianceQuickCheck", { enumerable: true, get: function () { return solarDataApi_1.solarComplianceQuickCheck; } });
Object.defineProperty(exports, "solarEstimate", { enumerable: true, get: function () { return solarDataApi_1.solarEstimate; } });
// Export Payment functions
var payments_1 = require("./payments");
Object.defineProperty(exports, "createSubscription", { enumerable: true, get: function () { return payments_1.createSubscription; } });
Object.defineProperty(exports, "updateSubscription", { enumerable: true, get: function () { return payments_1.updateSubscription; } });
Object.defineProperty(exports, "cancelSubscription", { enumerable: true, get: function () { return payments_1.cancelSubscription; } });
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return payments_1.stripeWebhook; } });
Object.defineProperty(exports, "createCheckoutSession", { enumerable: true, get: function () { return payments_1.createCheckoutSession; } });
Object.defineProperty(exports, "createBillingPortalSession", { enumerable: true, get: function () { return payments_1.createBillingPortalSession; } });
Object.defineProperty(exports, "getSubscriptionStatus", { enumerable: true, get: function () { return payments_1.getSubscriptionStatus; } });
// Export Data Refresh functions
var dataRefresh_1 = require("./dataRefresh");
Object.defineProperty(exports, "refreshSolarData", { enumerable: true, get: function () { return dataRefresh_1.refreshSolarData; } });
Object.defineProperty(exports, "triggerDataRefresh", { enumerable: true, get: function () { return dataRefresh_1.triggerDataRefresh; } });
// Export SMS Notification functions
var smsNotifications_1 = require("./smsNotifications");
Object.defineProperty(exports, "smsOnProjectCreated", { enumerable: true, get: function () { return smsNotifications_1.onProjectCreated; } });
Object.defineProperty(exports, "onProjectStatusUpdate", { enumerable: true, get: function () { return smsNotifications_1.onProjectStatusUpdate; } });
Object.defineProperty(exports, "onReferralReward", { enumerable: true, get: function () { return smsNotifications_1.onReferralReward; } });
Object.defineProperty(exports, "sendCustomSMS", { enumerable: true, get: function () { return smsNotifications_1.sendCustomSMS; } });
Object.defineProperty(exports, "sendBulkSMS", { enumerable: true, get: function () { return smsNotifications_1.sendBulkSMS; } });
Object.defineProperty(exports, "sendPaymentReminders", { enumerable: true, get: function () { return smsNotifications_1.sendPaymentReminders; } });
Object.defineProperty(exports, "getSmsStats", { enumerable: true, get: function () { return smsNotifications_1.getSmsStats; } });
Object.defineProperty(exports, "twilioStatusCallback", { enumerable: true, get: function () { return smsNotifications_1.twilioStatusCallback; } });
// Export Mercury Invoice functions
var mercuryInvoice_1 = require("./mercuryInvoice");
Object.defineProperty(exports, "createMercuryCustomer", { enumerable: true, get: function () { return mercuryInvoice_1.createMercuryCustomer; } });
Object.defineProperty(exports, "createMercuryInvoice", { enumerable: true, get: function () { return mercuryInvoice_1.createMercuryInvoice; } });
Object.defineProperty(exports, "getMercuryInvoice", { enumerable: true, get: function () { return mercuryInvoice_1.getMercuryInvoice; } });
Object.defineProperty(exports, "listMercuryInvoices", { enumerable: true, get: function () { return mercuryInvoice_1.listMercuryInvoices; } });
Object.defineProperty(exports, "cancelMercuryInvoice", { enumerable: true, get: function () { return mercuryInvoice_1.cancelMercuryInvoice; } });
Object.defineProperty(exports, "syncInvoiceStatus", { enumerable: true, get: function () { return mercuryInvoice_1.syncInvoiceStatus; } });
// Export Project Pipeline functions
var projectPipeline_1 = require("./projectPipeline");
Object.defineProperty(exports, "advanceProjectStage", { enumerable: true, get: function () { return projectPipeline_1.advanceProjectStage; } });
Object.defineProperty(exports, "createProjectTask", { enumerable: true, get: function () { return projectPipeline_1.createProjectTask; } });
Object.defineProperty(exports, "assignProjectTask", { enumerable: true, get: function () { return projectPipeline_1.assignProjectTask; } });
Object.defineProperty(exports, "completeProjectTask", { enumerable: true, get: function () { return projectPipeline_1.completeProjectTask; } });
Object.defineProperty(exports, "getProjectTimeline", { enumerable: true, get: function () { return projectPipeline_1.getProjectTimeline; } });
// Export Marketplace functions
var marketplace_1 = require("./marketplace");
Object.defineProperty(exports, "createMarketplaceListing", { enumerable: true, get: function () { return marketplace_1.createMarketplaceListing; } });
Object.defineProperty(exports, "submitBid", { enumerable: true, get: function () { return marketplace_1.submitBid; } });
Object.defineProperty(exports, "acceptBid", { enumerable: true, get: function () { return marketplace_1.acceptBid; } });
Object.defineProperty(exports, "completeMarketplaceJob", { enumerable: true, get: function () { return marketplace_1.completeMarketplaceJob; } });
Object.defineProperty(exports, "rateWorker", { enumerable: true, get: function () { return marketplace_1.rateWorker; } });
Object.defineProperty(exports, "registerWorker", { enumerable: true, get: function () { return marketplace_1.registerWorker; } });
Object.defineProperty(exports, "searchWorkers", { enumerable: true, get: function () { return marketplace_1.searchWorkers; } });
Object.defineProperty(exports, "getMarketplaceListings", { enumerable: true, get: function () { return marketplace_1.getMarketplaceListings; } });
// Export AI Task Engine functions
var aiTaskEngine_1 = require("./aiTaskEngine");
Object.defineProperty(exports, "createAiTask", { enumerable: true, get: function () { return aiTaskEngine_1.createAiTask; } });
Object.defineProperty(exports, "processAiTask", { enumerable: true, get: function () { return aiTaskEngine_1.processAiTask; } });
Object.defineProperty(exports, "escalateToHuman", { enumerable: true, get: function () { return aiTaskEngine_1.escalateToHuman; } });
Object.defineProperty(exports, "completeHumanTask", { enumerable: true, get: function () { return aiTaskEngine_1.completeHumanTask; } });
Object.defineProperty(exports, "getTaskQueue", { enumerable: true, get: function () { return aiTaskEngine_1.getTaskQueue; } });
Object.defineProperty(exports, "retryAiTask", { enumerable: true, get: function () { return aiTaskEngine_1.retryAiTask; } });
Object.defineProperty(exports, "getTaskStats", { enumerable: true, get: function () { return aiTaskEngine_1.getTaskStats; } });
// Export AHJ Database & Permit Knowledge Base functions
var ahjDatabase_1 = require("./ahjDatabase");
Object.defineProperty(exports, "createAhj", { enumerable: true, get: function () { return ahjDatabase_1.createAhj; } });
Object.defineProperty(exports, "getAhj", { enumerable: true, get: function () { return ahjDatabase_1.getAhj; } });
Object.defineProperty(exports, "searchAhj", { enumerable: true, get: function () { return ahjDatabase_1.searchAhj; } });
Object.defineProperty(exports, "findAhjForAddress", { enumerable: true, get: function () { return ahjDatabase_1.findAhjForAddress; } });
Object.defineProperty(exports, "updateAhjRequirements", { enumerable: true, get: function () { return ahjDatabase_1.updateAhjRequirements; } });
Object.defineProperty(exports, "createPermitSop", { enumerable: true, get: function () { return ahjDatabase_1.createPermitSop; } });
Object.defineProperty(exports, "getPermitSop", { enumerable: true, get: function () { return ahjDatabase_1.getPermitSop; } });
Object.defineProperty(exports, "verifyAhj", { enumerable: true, get: function () { return ahjDatabase_1.verifyAhj; } });
Object.defineProperty(exports, "getAhjStats", { enumerable: true, get: function () { return ahjDatabase_1.getAhjStats; } });
// Export Site Survey functions
var surveyService_1 = require("./surveyService");
Object.defineProperty(exports, "createSurvey", { enumerable: true, get: function () { return surveyService_1.createSurvey; } });
Object.defineProperty(exports, "updateSurvey", { enumerable: true, get: function () { return surveyService_1.updateSurvey; } });
Object.defineProperty(exports, "submitSurvey", { enumerable: true, get: function () { return surveyService_1.submitSurvey; } });
Object.defineProperty(exports, "getSurvey", { enumerable: true, get: function () { return surveyService_1.getSurvey; } });
Object.defineProperty(exports, "getSurveysByProject", { enumerable: true, get: function () { return surveyService_1.getSurveysByProject; } });
Object.defineProperty(exports, "reviewSurvey", { enumerable: true, get: function () { return surveyService_1.reviewSurvey; } });
Object.defineProperty(exports, "addSurveyPhoto", { enumerable: true, get: function () { return surveyService_1.addSurveyPhoto; } });
// Export Permit Lifecycle functions
var permitService_1 = require("./permitService");
Object.defineProperty(exports, "createPermit", { enumerable: true, get: function () { return permitService_1.createPermit; } });
Object.defineProperty(exports, "submitPermit", { enumerable: true, get: function () { return permitService_1.submitPermit; } });
Object.defineProperty(exports, "updatePermitStatus", { enumerable: true, get: function () { return permitService_1.updatePermitStatus; } });
Object.defineProperty(exports, "getPermit", { enumerable: true, get: function () { return permitService_1.getPermit; } });
Object.defineProperty(exports, "getPermitsByProject", { enumerable: true, get: function () { return permitService_1.getPermitsByProject; } });
Object.defineProperty(exports, "addPermitCorrection", { enumerable: true, get: function () { return permitService_1.addPermitCorrection; } });
Object.defineProperty(exports, "resolveCorrection", { enumerable: true, get: function () { return permitService_1.resolveCorrection; } });
Object.defineProperty(exports, "checkPermitStatuses", { enumerable: true, get: function () { return permitService_1.checkPermitStatuses; } });
// Export CAD Design Engine functions
var cadService_1 = require("./cadService");
Object.defineProperty(exports, "generateDesign", { enumerable: true, get: function () { return cadService_1.generateDesign; } });
Object.defineProperty(exports, "getDesign", { enumerable: true, get: function () { return cadService_1.getDesign; } });
Object.defineProperty(exports, "getDesignsByProject", { enumerable: true, get: function () { return cadService_1.getDesignsByProject; } });
Object.defineProperty(exports, "updateDesign", { enumerable: true, get: function () { return cadService_1.updateDesign; } });
Object.defineProperty(exports, "approveDesign", { enumerable: true, get: function () { return cadService_1.approveDesign; } });
Object.defineProperty(exports, "calculateSystemSize", { enumerable: true, get: function () { return cadService_1.calculateSystemSize; } });
// Export EagleView Integration functions
var eagleviewService_1 = require("./eagleviewService");
Object.defineProperty(exports, "orderEagleviewReport", { enumerable: true, get: function () { return eagleviewService_1.orderEagleviewReport; } });
Object.defineProperty(exports, "checkEagleviewStatus", { enumerable: true, get: function () { return eagleviewService_1.checkEagleviewStatus; } });
Object.defineProperty(exports, "processEagleviewDelivery", { enumerable: true, get: function () { return eagleviewService_1.processEagleviewDelivery; } });
Object.defineProperty(exports, "getEagleviewReport", { enumerable: true, get: function () { return eagleviewService_1.getEagleviewReport; } });
Object.defineProperty(exports, "shouldOrderEagleview", { enumerable: true, get: function () { return eagleviewService_1.shouldOrderEagleview; } });
// Export Scheduling & Install Coordination functions
var schedulingService_1 = require("./schedulingService");
Object.defineProperty(exports, "setAvailability", { enumerable: true, get: function () { return schedulingService_1.setAvailability; } });
Object.defineProperty(exports, "getAvailability", { enumerable: true, get: function () { return schedulingService_1.getAvailability; } });
Object.defineProperty(exports, "proposeSchedule", { enumerable: true, get: function () { return schedulingService_1.proposeSchedule; } });
Object.defineProperty(exports, "confirmSchedule", { enumerable: true, get: function () { return schedulingService_1.confirmSchedule; } });
Object.defineProperty(exports, "reschedule", { enumerable: true, get: function () { return schedulingService_1.reschedule; } });
Object.defineProperty(exports, "getInstallSchedule", { enumerable: true, get: function () { return schedulingService_1.getInstallSchedule; } });
Object.defineProperty(exports, "getUpcomingInstalls", { enumerable: true, get: function () { return schedulingService_1.getUpcomingInstalls; } });
Object.defineProperty(exports, "getCustomerSchedule", { enumerable: true, get: function () { return schedulingService_1.getCustomerSchedule; } });
// Export Install Photo QC functions
var photoAnalysisService_1 = require("./photoAnalysisService");
Object.defineProperty(exports, "uploadInstallPhoto", { enumerable: true, get: function () { return photoAnalysisService_1.uploadInstallPhoto; } });
Object.defineProperty(exports, "getPhotosByProject", { enumerable: true, get: function () { return photoAnalysisService_1.getPhotosByProject; } });
Object.defineProperty(exports, "getPhaseStatus", { enumerable: true, get: function () { return photoAnalysisService_1.getPhaseStatus; } });
Object.defineProperty(exports, "requestPhotoReview", { enumerable: true, get: function () { return photoAnalysisService_1.requestPhotoReview; } });
Object.defineProperty(exports, "signOffPhase", { enumerable: true, get: function () { return photoAnalysisService_1.signOffPhase; } });
Object.defineProperty(exports, "getInstallProgress", { enumerable: true, get: function () { return photoAnalysisService_1.getInstallProgress; } });
// Export Funding & Bankability functions
var fundingService_1 = require("./fundingService");
Object.defineProperty(exports, "createFundingPackage", { enumerable: true, get: function () { return fundingService_1.createFundingPackage; } });
Object.defineProperty(exports, "checkDocumentReadiness", { enumerable: true, get: function () { return fundingService_1.checkDocumentReadiness; } });
Object.defineProperty(exports, "submitFunding", { enumerable: true, get: function () { return fundingService_1.submitFunding; } });
Object.defineProperty(exports, "updateFundingStatus", { enumerable: true, get: function () { return fundingService_1.updateFundingStatus; } });
Object.defineProperty(exports, "requestMilestonePayment", { enumerable: true, get: function () { return fundingService_1.requestMilestonePayment; } });
Object.defineProperty(exports, "getFundingByProject", { enumerable: true, get: function () { return fundingService_1.getFundingByProject; } });
Object.defineProperty(exports, "generateBankabilityPackage", { enumerable: true, get: function () { return fundingService_1.generateBankabilityPackage; } });
// Export Pipeline Orchestrator — auto-triggers between stages
// Survey ✓ → CAD → Permit → Schedule → Install → Funding → Credit
var pipelineOrchestrator_1 = require("./pipelineOrchestrator");
Object.defineProperty(exports, "onSurveyApproved", { enumerable: true, get: function () { return pipelineOrchestrator_1.onSurveyApproved; } });
Object.defineProperty(exports, "onDesignApproved", { enumerable: true, get: function () { return pipelineOrchestrator_1.onDesignApproved; } });
Object.defineProperty(exports, "onPermitApproved", { enumerable: true, get: function () { return pipelineOrchestrator_1.onPermitApproved; } });
Object.defineProperty(exports, "onInstallComplete", { enumerable: true, get: function () { return pipelineOrchestrator_1.onInstallComplete; } });
Object.defineProperty(exports, "onFundingComplete", { enumerable: true, get: function () { return pipelineOrchestrator_1.onFundingComplete; } });
// Export Tax Credit Marketplace functions
var taxCreditService_1 = require("./taxCreditService");
Object.defineProperty(exports, "auditProjectCredits", { enumerable: true, get: function () { return taxCreditService_1.auditProjectCredits; } });
Object.defineProperty(exports, "getAudit", { enumerable: true, get: function () { return taxCreditService_1.getAudit; } });
Object.defineProperty(exports, "getAuditsByProject", { enumerable: true, get: function () { return taxCreditService_1.getAuditsByProject; } });
Object.defineProperty(exports, "certifyAudit", { enumerable: true, get: function () { return taxCreditService_1.certifyAudit; } });
Object.defineProperty(exports, "addAuditCheck", { enumerable: true, get: function () { return taxCreditService_1.addAuditCheck; } });
Object.defineProperty(exports, "assessCreditRisk", { enumerable: true, get: function () { return taxCreditService_1.assessCreditRisk; } });
Object.defineProperty(exports, "quoteCreditInsurance", { enumerable: true, get: function () { return taxCreditService_1.quoteCreditInsurance; } });
Object.defineProperty(exports, "activateInsurance", { enumerable: true, get: function () { return taxCreditService_1.activateInsurance; } });
Object.defineProperty(exports, "getInsurance", { enumerable: true, get: function () { return taxCreditService_1.getInsurance; } });
Object.defineProperty(exports, "createCreditListing", { enumerable: true, get: function () { return taxCreditService_1.createCreditListing; } });
Object.defineProperty(exports, "searchCreditListings", { enumerable: true, get: function () { return taxCreditService_1.searchCreditListings; } });
Object.defineProperty(exports, "getCreditListing", { enumerable: true, get: function () { return taxCreditService_1.getCreditListing; } });
Object.defineProperty(exports, "makeOffer", { enumerable: true, get: function () { return taxCreditService_1.makeOffer; } });
Object.defineProperty(exports, "respondToOffer", { enumerable: true, get: function () { return taxCreditService_1.respondToOffer; } });
Object.defineProperty(exports, "initiateCreditTransfer", { enumerable: true, get: function () { return taxCreditService_1.initiateCreditTransfer; } });
Object.defineProperty(exports, "completeCreditTransfer", { enumerable: true, get: function () { return taxCreditService_1.completeCreditTransfer; } });
Object.defineProperty(exports, "getCreditTransactions", { enumerable: true, get: function () { return taxCreditService_1.getCreditTransactions; } });
Object.defineProperty(exports, "getCreditMarketStats", { enumerable: true, get: function () { return taxCreditService_1.getCreditMarketStats; } });
// Export Document Service functions (replaces PandaDoc — $0/month)
// HTML→PDF generation, ESIGN Act compliant e-signatures, full audit trail
var documentService_1 = require("./documentService");
Object.defineProperty(exports, "generateDocument", { enumerable: true, get: function () { return documentService_1.generateDocument; } });
Object.defineProperty(exports, "getDocument", { enumerable: true, get: function () { return documentService_1.getDocument; } });
Object.defineProperty(exports, "getDocumentsByProject", { enumerable: true, get: function () { return documentService_1.getDocumentsByProject; } });
Object.defineProperty(exports, "sendDocument", { enumerable: true, get: function () { return documentService_1.sendDocument; } });
Object.defineProperty(exports, "viewDocument", { enumerable: true, get: function () { return documentService_1.viewDocument; } });
Object.defineProperty(exports, "signDocument", { enumerable: true, get: function () { return documentService_1.signDocument; } });
Object.defineProperty(exports, "voidDocument", { enumerable: true, get: function () { return documentService_1.voidDocument; } });
Object.defineProperty(exports, "saveDocumentTemplate", { enumerable: true, get: function () { return documentService_1.saveDocumentTemplate; } });
Object.defineProperty(exports, "getDocumentStats", { enumerable: true, get: function () { return documentService_1.getDocumentStats; } });
//# sourceMappingURL=index.js.map