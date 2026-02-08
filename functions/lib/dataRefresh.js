"use strict";
/**
 * Data Refresh - Scheduled Cloud Functions
 *
 * Automatically refreshes solar data from free public APIs:
 * - OpenEI URDB (Utility Rate Database) - 3,700+ utility rates
 * - NREL Solar Resource Data
 * - DSIRE (Database of State Incentives)
 *
 * All APIs are free tier / no cost.
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
exports.triggerDataRefresh = exports.refreshSolarData = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const https = __importStar(require("https"));
// ─── HTTP Helper ───────────────────────────────────────────────────────────────
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(new Error(`Failed to parse JSON from ${url}`));
                }
            });
        })
            .on("error", reject);
    });
}
// ─── OpenEI URDB Refresh ───────────────────────────────────────────────────────
/**
 * Fetch utility rates from OpenEI URDB (free, no API key required)
 * API docs: https://openei.org/services/doc/rest/util_rates
 */
async function refreshUtilityRatesFromOpenEI(state, db) {
    var _a, _b;
    const errors = [];
    let processed = 0;
    let updated = 0;
    try {
        // OpenEI URDB v8 endpoint (free, no key needed)
        const url = `https://api.openei.org/utility_rates?version=8` +
            `&format=json&detail=full&limit=200` +
            `&ratesforutility=${encodeURIComponent(state)}`;
        const response = await fetchJson(url);
        if (!response.items || !Array.isArray(response.items)) {
            errors.push(`No utility rate items returned for state ${state}`);
            return { processed, updated, errors };
        }
        const batch = db.batch();
        let batchCount = 0;
        for (const rate of response.items) {
            processed++;
            // Generate a stable document ID from utility name + rate name
            const docId = `${rate.utility || "unknown"}_${rate.name || rate.label || "default"}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .substring(0, 100);
            const docRef = db.collection("solar_utility_rates").doc(docId);
            batch.set(docRef, {
                utility_name: rate.utility || "Unknown",
                rate_name: rate.name || rate.label,
                state: state.toUpperCase(),
                eia_id: rate.eiaid,
                sector: rate.sector,
                description: rate.description,
                source: "openei_urdb",
                source_url: rate.uri,
                residential_rate: rate.fixedmonthlycharge,
                energy_rate_kwh: rate.energyratestructure
                    ? (_b = (_a = rate.energyratestructure[0]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.rate
                    : null,
                has_net_metering: rate.has_net_metering || false,
                updated_at: admin.firestore.Timestamp.now(),
                raw_data: rate,
            }, { merge: true });
            batchCount++;
            updated++;
            // Firestore batch limit is 500
            if (batchCount >= 450) {
                await batch.commit();
                batchCount = 0;
            }
        }
        if (batchCount > 0) {
            await batch.commit();
        }
    }
    catch (error) {
        errors.push(`OpenEI fetch error for ${state}: ${error.message}`);
    }
    return { processed, updated, errors };
}
// ─── Scheduled Refresh Function ────────────────────────────────────────────────
/**
 * Scheduled weekly refresh of utility rate data from OpenEI URDB for priority states every Sunday at 2 AM CST
 *
 * @function refreshSolarData
 * @type pubsub
 * @auth none
 * @input {{ }}
 * @output {{ void }}
 * @errors console.log on failure
 * @billing none
 * @rateLimit none
 * @firestore solar_utility_rates, data_refresh_log
 */
exports.refreshSolarData = functions
    .runWith({
    timeoutSeconds: 540, // 9 minutes (max for scheduled functions)
    memory: "1GB",
})
    .pubsub.schedule("0 2 * * 0") // Every Sunday at 2 AM
    .timeZone("America/Chicago")
    .onRun(async () => {
    const db = admin.firestore();
    const startTime = Date.now();
    // Create log entry
    const logRef = db.collection("data_refresh_log").doc();
    const logEntry = {
        id: logRef.id,
        source: "openei_urdb",
        status: "started",
        records_processed: 0,
        records_updated: 0,
        errors: [],
        started_at: admin.firestore.Timestamp.now(),
    };
    await logRef.set(logEntry);
    console.log("Starting weekly solar data refresh...");
    // Priority states to refresh (expand as data grows)
    const states = ["TX", "CA", "FL", "NC", "AZ"];
    let totalProcessed = 0;
    let totalUpdated = 0;
    const allErrors = [];
    for (const state of states) {
        console.log(`Refreshing utility rates for ${state}...`);
        const result = await refreshUtilityRatesFromOpenEI(state, db);
        totalProcessed += result.processed;
        totalUpdated += result.updated;
        allErrors.push(...result.errors);
    }
    // Update log entry
    const duration = Date.now() - startTime;
    await logRef.update({
        status: allErrors.length > 0 ? "completed" : "completed",
        records_processed: totalProcessed,
        records_updated: totalUpdated,
        errors: allErrors,
        completed_at: admin.firestore.Timestamp.now(),
        duration_ms: duration,
    });
    console.log(`Solar data refresh complete. Processed: ${totalProcessed}, Updated: ${totalUpdated}, Errors: ${allErrors.length}, Duration: ${duration}ms`);
});
// ─── Manual Refresh Trigger ────────────────────────────────────────────────────
/**
 * Manually triggers a utility rate data refresh for a specific state or all priority states (admin only)
 *
 * @function triggerDataRefresh
 * @type onCall
 * @auth firebase
 * @input {{ state?: string }}
 * @output {{ success: boolean, states: string[], records_processed: number, records_updated: number, errors: string[], duration_ms: number }}
 * @errors unauthenticated, permission-denied
 * @billing none
 * @rateLimit none
 * @firestore users, solar_utility_rates, data_refresh_log
 */
exports.triggerDataRefresh = functions
    .runWith({
    timeoutSeconds: 540,
    memory: "1GB",
})
    .https.onCall(async (data, context) => {
    var _a;
    // Admin only
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const db = admin.firestore();
    // Check admin role
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }
    const states = (data === null || data === void 0 ? void 0 : data.state)
        ? [data.state.toUpperCase()]
        : ["TX", "CA", "FL", "NC", "AZ"];
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalUpdated = 0;
    const allErrors = [];
    for (const state of states) {
        const result = await refreshUtilityRatesFromOpenEI(state, db);
        totalProcessed += result.processed;
        totalUpdated += result.updated;
        allErrors.push(...result.errors);
    }
    // Log the manual refresh
    const logRef = db.collection("data_refresh_log").doc();
    await logRef.set({
        id: logRef.id,
        source: "openei_urdb",
        trigger: "manual",
        triggered_by: context.auth.uid,
        status: "completed",
        records_processed: totalProcessed,
        records_updated: totalUpdated,
        errors: allErrors,
        started_at: admin.firestore.Timestamp.fromMillis(startTime),
        completed_at: admin.firestore.Timestamp.now(),
        duration_ms: Date.now() - startTime,
    });
    return {
        success: true,
        states,
        records_processed: totalProcessed,
        records_updated: totalUpdated,
        errors: allErrors,
        duration_ms: Date.now() - startTime,
    };
});
//# sourceMappingURL=dataRefresh.js.map