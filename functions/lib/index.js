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
exports.validateApiKeyFromRequest = exports.cleanupApiKeys = exports.getApiKeyUsage = exports.updateApiKey = exports.rotateApiKey = exports.revokeApiKey = exports.validateApiKey = exports.createApiKey = exports.leadWebhook = exports.recalculateLeadScores = exports.assignLead = exports.addLeadNote = exports.updateLead = exports.createLead = exports.smtWebhook = exports.fetchSmtUsage = void 0;
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
//# sourceMappingURL=index.js.map