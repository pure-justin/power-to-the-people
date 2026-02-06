"use strict";
/**
 * Cloud Functions Entry Point
 *
 * Exports all Firebase Cloud Functions for the Power to the People app.
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
exports.twilioStatusCallback = exports.getSmsStats = exports.sendPaymentReminders = exports.sendBulkSMS = exports.sendCustomSMS = exports.onReferralReward = exports.onProjectStatusUpdate = exports.smsOnProjectCreated = exports.referralStatsWebhook = exports.referralBulkUpdateWebhook = exports.referralStatusWebhook = exports.processWeeklyPayouts = exports.getReferralStats = exports.updateReferralStatusHttp = exports.onProjectUpdated = exports.onProjectCreated = exports.secureLeadQuery = exports.secureSolarWebhook = exports.secureLeadWebhook = exports.validateApiKeyFromRequest = exports.cleanupApiKeys = exports.getApiKeyUsage = exports.updateApiKey = exports.rotateApiKey = exports.revokeApiKey = exports.validateApiKey = exports.createApiKey = exports.leadWebhook = exports.recalculateLeadScores = exports.assignLead = exports.addLeadNote = exports.updateLead = exports.createLead = exports.smtWebhook = exports.fetchSmtUsage = void 0;
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
//# sourceMappingURL=index.js.map