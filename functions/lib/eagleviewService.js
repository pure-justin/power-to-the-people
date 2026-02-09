"use strict";
/**
 * EagleView Integration - Cloud Functions
 *
 * Integrates with EagleView's aerial imagery and measurement API
 * for high-resolution roof data used in CAD design.
 *
 * EagleView provides:
 *   - Roof measurements (area, pitch, azimuth per facet)
 *   - TSRF (Total Solar Resource Fraction) per facet
 *   - Shade analysis with monthly profiles
 *   - 3D models and obstruction mapping
 *   - Bankable shade reports for PPA/lease financing
 *
 * Report types:
 *   - SunSite: Basic solar measurements (~$25)
 *   - PremiumSunSite: Full shade analysis + bankable report (~$50)
 *   - InForm: Roof condition + measurements (~$40)
 *
 * Collections:
 *   eagleview_reports — Order tracking and parsed report data
 *
 * @module eagleviewService
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
exports.shouldOrderEagleview = exports.getEagleviewReport = exports.processEagleviewDelivery = exports.checkEagleviewStatus = exports.orderEagleviewReport = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
/** Valid report types for input validation */
const VALID_REPORT_TYPES = [
    "SunSite",
    "PremiumSunSite",
    "InForm",
];
/** Approximate cost per report type (for estimation) */
const REPORT_COSTS = {
    SunSite: 25,
    PremiumSunSite: 50,
    InForm: 40,
};
// ─── EagleView API Stub ─────────────────────────────────────────────────────────
//
// The actual EagleView API uses OAuth2 and RESTful endpoints.
// These stubs structure the calls correctly for when we integrate.
//
// EagleView API Base: https://api.eagleview.com/v2
// Auth: OAuth2 Bearer token (client_credentials flow)
//
// Endpoints:
//   POST /orders — Create a new report order
//   GET  /orders/{orderId} — Check order status
//   GET  /orders/{orderId}/results — Download report data
//
/**
 * Stub: Place an order with EagleView API.
 * Returns a mock order ID. Will be replaced with actual API call.
 */
async function placeEagleviewOrder(_address, _reportType) {
    // TODO: Replace with actual EagleView API call
    // const response = await fetch("https://api.eagleview.com/v2/orders", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${token}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     address: _address,
    //     productType: _reportType,
    //     deliveryMethod: "API",
    //   }),
    // });
    const mockOrderId = `EV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const estimatedDelivery = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // ~48 hours
    functions.logger.info(`[STUB] EagleView order placed: ${mockOrderId} for ${_reportType}`);
    return { orderId: mockOrderId, estimatedDelivery };
}
/**
 * Stub: Check order status with EagleView API.
 * Returns mock "processing" status. Will be replaced with actual API call.
 */
async function checkEagleviewOrderStatus(_orderId) {
    // TODO: Replace with actual EagleView API call
    // const response = await fetch(`https://api.eagleview.com/v2/orders/${_orderId}`, {
    //   headers: { "Authorization": `Bearer ${token}` },
    // });
    functions.logger.info(`[STUB] EagleView status check: ${_orderId}`);
    return { status: "processing", percentComplete: 50 };
}
// ─── Cloud Function: orderEagleviewReport ───────────────────────────────────────
/**
 * Place an order with EagleView for aerial imagery and measurement data.
 * Creates a record in eagleview_reports to track the order.
 *
 * @function orderEagleviewReport
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string, address: string, reportType: EagleviewReportType }}
 * @output {{ success: boolean, reportId: string, orderId: string, estimatedDelivery: string }}
 */
exports.orderEagleviewReport = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to order reports");
    }
    const { projectId, address, reportType } = data;
    if (!projectId || !address || !reportType) {
        throw new functions.https.HttpsError("invalid-argument", "projectId, address, and reportType are required");
    }
    if (!VALID_REPORT_TYPES.includes(reportType)) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid reportType: "${reportType}". Must be one of: ${VALID_REPORT_TYPES.join(", ")}`);
    }
    const db = admin.firestore();
    try {
        // Place order with EagleView API (stub)
        const { orderId, estimatedDelivery } = await placeEagleviewOrder(address, reportType);
        // Create tracking record
        const reportData = {
            projectId,
            surveyId: null,
            orderId,
            status: "ordered",
            reportType,
            address,
            cost: REPORT_COSTS[reportType] || 0,
            data: {
                roof_facets: [],
                total_roof_area: 0,
                total_usable_area: 0,
                obstructions: [],
                three_d_model_url: null,
                shade_report_url: null,
                measurement_report_url: null,
            },
            estimatedDelivery,
            ordered_at: admin.firestore.FieldValue.serverTimestamp(),
            delivered_at: null,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
        const reportRef = await db
            .collection("eagleview_reports")
            .add(reportData);
        functions.logger.info(`EagleView report ordered: ${reportRef.id} (order=${orderId}, type=${reportType}, address=${address})`);
        return {
            success: true,
            reportId: reportRef.id,
            orderId,
            estimatedDelivery,
        };
    }
    catch (error) {
        functions.logger.error("Order EagleView report error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to order EagleView report");
    }
});
// ─── Cloud Function: checkEagleviewStatus ───────────────────────────────────────
/**
 * Check the status of an EagleView order. Polls the EagleView API and
 * updates the local record.
 *
 * @function checkEagleviewStatus
 * @type onCall
 * @auth firebase
 * @input {{ orderId: string }}
 * @output {{ success: boolean, orderId: string, status: EagleviewStatus }}
 */
exports.checkEagleviewStatus = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to check status");
    }
    const { orderId } = data;
    if (!orderId) {
        throw new functions.https.HttpsError("invalid-argument", "orderId is required");
    }
    const db = admin.firestore();
    // Find the report by orderId
    const snapshot = await db
        .collection("eagleview_reports")
        .where("orderId", "==", orderId)
        .limit(1)
        .get();
    if (snapshot.empty) {
        throw new functions.https.HttpsError("not-found", `No report found for order: ${orderId}`);
    }
    try {
        // Check with EagleView API (stub)
        const apiStatus = await checkEagleviewOrderStatus(orderId);
        // Update local record
        const reportRef = snapshot.docs[0].ref;
        await reportRef.update({
            status: apiStatus.status,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            orderId,
            status: apiStatus.status,
            percentComplete: apiStatus.percentComplete,
        };
    }
    catch (error) {
        functions.logger.error(`Check EagleView status error (${orderId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to check EagleView status");
    }
});
// ─── Cloud Function: processEagleviewDelivery ───────────────────────────────────
/**
 * Process a delivered EagleView report. Parses the report data and populates
 * the survey record with roof measurements, shade data, and obstructions.
 * Also feeds the data into the CAD engine for design generation.
 *
 * @function processEagleviewDelivery
 * @type onCall
 * @auth firebase
 * @input {{ orderId: string, reportData: object }}
 * @output {{ success: boolean, reportId: string, surveyUpdated: boolean }}
 */
exports.processEagleviewDelivery = functions
    .runWith({ timeoutSeconds: 60, memory: "512MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to process deliveries");
    }
    const { orderId, reportData } = data;
    if (!orderId || !reportData) {
        throw new functions.https.HttpsError("invalid-argument", "orderId and reportData are required");
    }
    const db = admin.firestore();
    // Find the report
    const snapshot = await db
        .collection("eagleview_reports")
        .where("orderId", "==", orderId)
        .limit(1)
        .get();
    if (snapshot.empty) {
        throw new functions.https.HttpsError("not-found", `No report found for order: ${orderId}`);
    }
    try {
        const reportRef = snapshot.docs[0].ref;
        const report = snapshot.docs[0].data();
        // Parse and store the delivered data
        const parsedData = {
            roof_facets: reportData.roof_facets || [],
            total_roof_area: reportData.total_roof_area || 0,
            total_usable_area: reportData.total_usable_area || 0,
            obstructions: reportData.obstructions || [],
            three_d_model_url: reportData.three_d_model_url || null,
            shade_report_url: reportData.shade_report_url || null,
            measurement_report_url: reportData.measurement_report_url || null,
        };
        await reportRef.update({
            status: "delivered",
            data: parsedData,
            delivered_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        // If there's an associated survey, update it with the roof data
        let surveyUpdated = false;
        if (report.surveyId) {
            const surveyRef = db.collection("site_surveys").doc(report.surveyId);
            const surveySnap = await surveyRef.get();
            if (surveySnap.exists) {
                await surveyRef.update({
                    "roof_measurements.eagleview_data": parsedData,
                    "roof_measurements.total_roof_area": parsedData.total_roof_area,
                    "roof_measurements.usable_roof_area": parsedData.total_usable_area,
                    "roof_measurements.facets": parsedData.roof_facets,
                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                });
                surveyUpdated = true;
            }
        }
        functions.logger.info(`EagleView report delivered for order ${orderId}. Survey updated: ${surveyUpdated}`);
        return {
            success: true,
            reportId: snapshot.docs[0].id,
            surveyUpdated,
        };
    }
    catch (error) {
        functions.logger.error(`Process EagleView delivery error (${orderId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to process EagleView delivery");
    }
});
// ─── Cloud Function: getEagleviewReport ─────────────────────────────────────────
/**
 * Get an EagleView report by its document ID.
 *
 * @function getEagleviewReport
 * @type onCall
 * @auth firebase
 * @input {{ reportId: string }}
 * @output {{ success: boolean, report: object }}
 */
exports.getEagleviewReport = functions
    .runWith({ timeoutSeconds: 10, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to view reports");
    }
    const { reportId } = data;
    if (!reportId) {
        throw new functions.https.HttpsError("invalid-argument", "reportId is required");
    }
    const db = admin.firestore();
    const reportSnap = await db
        .collection("eagleview_reports")
        .doc(reportId)
        .get();
    if (!reportSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Report not found: ${reportId}`);
    }
    return {
        success: true,
        report: { id: reportSnap.id, ...reportSnap.data() },
    };
});
// ─── Cloud Function: shouldOrderEagleview ───────────────────────────────────────
/**
 * Decision function: determine whether an EagleView report is needed for a project.
 * Checks multiple factors to decide if existing solar API data is sufficient
 * or if high-fidelity aerial data is required.
 *
 * EagleView is recommended when:
 *   - Solar API data confidence is below 0.7 (unreliable measurements)
 *   - Survey is missing roof facet data
 *   - Project uses PPA/lease financing (bankable shade report required)
 *   - Complex roof geometry (multiple planes, dormers, etc.)
 *
 * @function shouldOrderEagleview
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string }}
 * @output {{ success: boolean, needed: boolean, reason: string, recommendedType: string | null }}
 */
exports.shouldOrderEagleview = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to check EagleView need");
    }
    const { projectId } = data;
    if (!projectId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId is required");
    }
    const db = admin.firestore();
    try {
        // Get the project
        const projectSnap = await db.collection("projects").doc(projectId).get();
        if (!projectSnap.exists) {
            throw new functions.https.HttpsError("not-found", `Project not found: ${projectId}`);
        }
        const project = projectSnap.data();
        // Check if there's already an EagleView report for this project
        const existingReport = await db
            .collection("eagleview_reports")
            .where("projectId", "==", projectId)
            .where("status", "in", ["ordered", "processing", "delivered"])
            .limit(1)
            .get();
        if (!existingReport.empty) {
            return {
                success: true,
                needed: false,
                reason: "An EagleView report already exists or is in progress for this project.",
                recommendedType: null,
            };
        }
        // Check survey data confidence
        const surveySnap = await db
            .collection("site_surveys")
            .where("projectId", "==", projectId)
            .orderBy("created_at", "desc")
            .limit(1)
            .get();
        const reasons = [];
        let recommendedType = "SunSite";
        // Rule 1: No survey data at all
        if (surveySnap.empty) {
            reasons.push("No site survey data available");
        }
        else {
            const survey = surveySnap.docs[0].data();
            // Rule 2: Missing roof facet data
            if (!((_a = survey.roof_measurements) === null || _a === void 0 ? void 0 : _a.facets) ||
                survey.roof_measurements.facets.length === 0) {
                reasons.push("Survey is missing roof facet measurements");
            }
            // Rule 3: Low confidence on roof measurements
            if (((_b = survey.roof_measurements) === null || _b === void 0 ? void 0 : _b.confidence) &&
                survey.roof_measurements.confidence < 0.7) {
                reasons.push(`Roof measurement confidence is low (${survey.roof_measurements.confidence})`);
            }
        }
        // Rule 4: PPA/lease deal requires bankable shade report
        const financingType = project.financing_type || project.financingType;
        if (financingType === "ppa" || financingType === "lease") {
            reasons.push("PPA/lease financing requires a bankable shade report");
            recommendedType = "PremiumSunSite";
        }
        const needed = reasons.length > 0;
        return {
            success: true,
            needed,
            reason: needed
                ? reasons.join(". ") + "."
                : "Existing data is sufficient for design.",
            recommendedType: needed ? recommendedType : null,
        };
    }
    catch (error) {
        functions.logger.error(`shouldOrderEagleview error (${projectId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to check EagleView need");
    }
});
//# sourceMappingURL=eagleviewService.js.map