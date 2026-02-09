"use strict";
/**
 * Config Sync — reads functions.config() and writes masked status to Firestore
 *
 * Admin-only onCall function that bridges Cloud Functions environment config
 * with the Firestore `config` collection so the admin UI can show integration status.
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
exports.syncConfigStatus = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const INTEGRATIONS = [
    {
        docId: "stripe",
        configNamespace: "stripe",
        requiredKeys: ["secret_key", "webhook_secret"],
    },
    {
        docId: "twilio",
        configNamespace: "twilio",
        requiredKeys: ["account_sid", "auth_token", "phone_number"],
    },
    {
        docId: "mercury",
        configNamespace: "mercury",
        requiredKeys: ["api_token"],
    },
    {
        docId: "nrel",
        configNamespace: "nrel",
        requiredKeys: ["api_key"],
    },
    {
        docId: "openei",
        configNamespace: "",
        requiredKeys: [],
        alwaysConnected: true,
    },
    {
        docId: "google_solar",
        configNamespace: "google",
        requiredKeys: ["solar_api_key"],
    },
];
/** Mask a credential value for safe display */
function maskValue(val) {
    if (!val)
        return "";
    if (val.length < 15)
        return "configured";
    return val.substring(0, 8) + "..." + val.substring(val.length - 3);
}
exports.syncConfigStatus = functions.https.onCall(async (_data, context) => {
    var _a;
    // Admin-only
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(context.auth.uid)
        .get();
    const role = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }
    const config = functions.config();
    const db = admin.firestore();
    const results = {};
    for (const integration of INTEGRATIONS) {
        const docRef = db.collection("config").doc(integration.docId);
        if (integration.alwaysConnected) {
            await docRef.set({
                status: "connected",
                lastSynced: admin.firestore.FieldValue.serverTimestamp(),
            });
            results[integration.docId] = { status: "connected", keys: 0 };
            continue;
        }
        const nsConfig = config[integration.configNamespace] || {};
        const docData = {
            lastSynced: admin.firestore.FieldValue.serverTimestamp(),
        };
        let presentCount = 0;
        for (const key of integration.requiredKeys) {
            const val = nsConfig[key];
            if (val) {
                docData[key] = maskValue(val);
                presentCount++;
            }
        }
        if (presentCount === integration.requiredKeys.length) {
            docData.status = "connected";
        }
        else if (presentCount > 0) {
            docData.status = "partial";
        }
        else {
            docData.status = "missing";
        }
        await docRef.set(docData);
        results[integration.docId] = {
            status: docData.status,
            keys: presentCount,
        };
    }
    return { success: true, integrations: results };
});
//# sourceMappingURL=configSync.js.map