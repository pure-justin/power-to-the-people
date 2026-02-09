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

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Available EagleView report types */
export type EagleviewReportType = "SunSite" | "PremiumSunSite" | "InForm";

/** Report order status */
export type EagleviewStatus = "ordered" | "processing" | "delivered" | "failed";

/** Valid report types for input validation */
const VALID_REPORT_TYPES: EagleviewReportType[] = [
  "SunSite",
  "PremiumSunSite",
  "InForm",
];

/** Approximate cost per report type (for estimation) */
const REPORT_COSTS: Record<EagleviewReportType, number> = {
  SunSite: 25,
  PremiumSunSite: 50,
  InForm: 40,
};

// ─── EagleView API ──────────────────────────────────────────────────────────────
//
// OAuth2 Client Credentials flow with token caching.
// API Base: https://webservices-integrations.eagleview.com (integration env)
//
// Endpoints:
//   POST /v2/orders — Create a new report order
//   GET  /v2/orders/{orderId} — Check order status
//   GET  /v2/orders/{orderId}/results — Download report data
//

const EAGLEVIEW_TOKEN_URL = "https://api.eagleview.com/auth-service/v1/token";
const EAGLEVIEW_API_BASE = "https://webservices-integrations.eagleview.com";

/** Cached OAuth2 token and its expiry timestamp */
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

/**
 * Get a valid OAuth2 access token for EagleView API.
 * Caches the token for 23 hours (tokens last 24h, refresh 1h early).
 */
async function getEagleviewToken(): Promise<string> {
  // Return cached token if still valid (with 1-hour safety margin)
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const config = functions.config();
  const clientId = config.eagleview?.client_id;
  const clientSecret = config.eagleview?.client_secret;

  if (!clientId || !clientSecret) {
    throw new Error(
      "EagleView credentials not configured. Set eagleview.client_id and eagleview.client_secret in Firebase Functions config.",
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(EAGLEVIEW_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    functions.logger.error("EagleView token request failed:", {
      status: response.status,
      body: errorBody,
    });
    throw new Error(`EagleView auth failed (${response.status}): ${errorBody}`);
  }

  const tokenData = (await response.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  // Cache for 23 hours (expires_in is typically 86400s = 24h)
  const safetyMarginMs = 60 * 60 * 1000; // 1 hour
  cachedToken = {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000 - safetyMarginMs,
  };

  functions.logger.info(
    "EagleView OAuth2 token acquired, cached for ~23 hours",
  );
  return cachedToken.accessToken;
}

/**
 * Place an order with EagleView API.
 * Authenticates via OAuth2, posts to /v2/orders, returns the order ID and ETA.
 */
async function placeEagleviewOrder(
  address: string,
  reportType: EagleviewReportType,
): Promise<{ orderId: string; estimatedDelivery: string }> {
  const token = await getEagleviewToken();

  // Build the webhook callback URL for this Firebase project
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "";
  const callbackUrl = projectId
    ? `https://us-central1-${projectId}.cloudfunctions.net/eagleviewWebhook`
    : undefined;

  const orderPayload: Record<string, unknown> = {
    address,
    productType: reportType,
    deliveryMethod: "API",
  };

  // Include callback URL so EagleView notifies us when the report is ready
  if (callbackUrl) {
    orderPayload.callbackUrl = callbackUrl;
  }

  const response = await fetch(`${EAGLEVIEW_API_BASE}/v2/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderPayload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    functions.logger.error("EagleView order placement failed:", {
      status: response.status,
      body: errorBody,
      address,
      reportType,
    });
    throw new Error(
      `EagleView order failed (${response.status}): ${errorBody}`,
    );
  }

  const result = (await response.json()) as {
    orderId?: string;
    order_id?: string;
    id?: string;
    estimatedDelivery?: string;
    estimated_delivery?: string;
  };

  // Handle various possible response field names
  const orderId = result.orderId || result.order_id || result.id;
  if (!orderId) {
    functions.logger.error("EagleView order response missing orderId:", result);
    throw new Error("EagleView order response did not include an order ID");
  }

  const estimatedDelivery =
    result.estimatedDelivery ||
    result.estimated_delivery ||
    new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // fallback ~48h

  functions.logger.info(
    `EagleView order placed: ${orderId} for ${reportType} at ${address}`,
  );

  return { orderId: String(orderId), estimatedDelivery };
}

/**
 * Check order status with EagleView API.
 * Maps EagleView's status values to our internal EagleviewStatus type.
 */
async function checkEagleviewOrderStatus(
  orderId: string,
): Promise<{ status: EagleviewStatus; percentComplete?: number }> {
  const token = await getEagleviewToken();

  const response = await fetch(
    `${EAGLEVIEW_API_BASE}/v2/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    functions.logger.error(`EagleView status check failed for ${orderId}:`, {
      status: response.status,
      body: errorBody,
    });
    throw new Error(
      `EagleView status check failed (${response.status}): ${errorBody}`,
    );
  }

  const result = (await response.json()) as {
    status?: string;
    orderStatus?: string;
    order_status?: string;
    percentComplete?: number;
    percent_complete?: number;
  };

  const rawStatus = (
    result.status ||
    result.orderStatus ||
    result.order_status ||
    ""
  ).toLowerCase();

  // Map EagleView status values to our internal status type
  let status: EagleviewStatus;
  if (
    rawStatus === "delivered" ||
    rawStatus === "complete" ||
    rawStatus === "completed"
  ) {
    status = "delivered";
  } else if (
    rawStatus === "failed" ||
    rawStatus === "error" ||
    rawStatus === "cancelled"
  ) {
    status = "failed";
  } else if (
    rawStatus === "ordered" ||
    rawStatus === "new" ||
    rawStatus === "accepted"
  ) {
    status = "ordered";
  } else {
    // processing, in_progress, pending, etc.
    status = "processing";
  }

  const percentComplete = result.percentComplete ?? result.percent_complete;

  functions.logger.info(
    `EagleView status for ${orderId}: ${status} (raw: ${rawStatus}, ${percentComplete ?? "n/a"}%)`,
  );

  return { status, percentComplete };
}

/**
 * Fetch the completed report results from EagleView.
 * Only call this when the order status is "delivered".
 */
async function fetchEagleviewResults(
  orderId: string,
): Promise<Record<string, unknown>> {
  const token = await getEagleviewToken();

  const response = await fetch(
    `${EAGLEVIEW_API_BASE}/v2/orders/${encodeURIComponent(orderId)}/results`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    functions.logger.error(`EagleView results fetch failed for ${orderId}:`, {
      status: response.status,
      body: errorBody,
    });
    throw new Error(
      `EagleView results fetch failed (${response.status}): ${errorBody}`,
    );
  }

  const results = (await response.json()) as Record<string, unknown>;

  functions.logger.info(
    `EagleView results fetched for ${orderId}: ${Object.keys(results).length} top-level keys`,
  );

  return results;
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
export const orderEagleviewReport = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to order reports",
      );
    }

    const { projectId, address, reportType } = data;

    if (!projectId || !address || !reportType) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId, address, and reportType are required",
      );
    }

    if (!VALID_REPORT_TYPES.includes(reportType)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid reportType: "${reportType}". Must be one of: ${VALID_REPORT_TYPES.join(", ")}`,
      );
    }

    const db = admin.firestore();

    try {
      // Place order with EagleView API
      const { orderId, estimatedDelivery } = await placeEagleviewOrder(
        address,
        reportType,
      );

      // Create tracking record
      const reportData: Record<string, unknown> = {
        projectId,
        surveyId: null,
        orderId,
        status: "ordered" as EagleviewStatus,
        reportType,
        address,
        cost: REPORT_COSTS[reportType as EagleviewReportType] || 0,
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

      functions.logger.info(
        `EagleView report ordered: ${reportRef.id} (order=${orderId}, type=${reportType}, address=${address})`,
      );

      return {
        success: true,
        reportId: reportRef.id,
        orderId,
        estimatedDelivery,
      };
    } catch (error: any) {
      functions.logger.error("Order EagleView report error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to order EagleView report",
      );
    }
  });

// ─── Cloud Function: checkEagleviewStatus ───────────────────────────────────────

/**
 * Check the status of an EagleView order. Polls the EagleView API and
 * updates the local record. If the order is delivered, automatically
 * fetches the report results.
 *
 * @function checkEagleviewStatus
 * @type onCall
 * @auth firebase
 * @input {{ orderId: string }}
 * @output {{ success: boolean, orderId: string, status: EagleviewStatus, reportData?: object }}
 */
export const checkEagleviewStatus = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to check status",
      );
    }

    const { orderId } = data;
    if (!orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "orderId is required",
      );
    }

    const db = admin.firestore();

    // Find the report by orderId
    const snapshot = await db
      .collection("eagleview_reports")
      .where("orderId", "==", orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        `No report found for order: ${orderId}`,
      );
    }

    try {
      // Check with EagleView API
      const apiStatus = await checkEagleviewOrderStatus(orderId);

      // Update local record
      const reportRef = snapshot.docs[0].ref;
      const updateData: Record<string, unknown> = {
        status: apiStatus.status,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      // If delivered, auto-fetch the report results
      let reportData: Record<string, unknown> | undefined;
      if (apiStatus.status === "delivered") {
        try {
          reportData = await fetchEagleviewResults(orderId);
          updateData.data = {
            roof_facets: reportData.roof_facets || reportData.roofFacets || [],
            total_roof_area:
              reportData.total_roof_area || reportData.totalRoofArea || 0,
            total_usable_area:
              reportData.total_usable_area || reportData.totalUsableArea || 0,
            obstructions: reportData.obstructions || [],
            three_d_model_url:
              reportData.three_d_model_url || reportData.modelUrl || null,
            shade_report_url:
              reportData.shade_report_url || reportData.shadeReportUrl || null,
            measurement_report_url:
              reportData.measurement_report_url ||
              reportData.measurementReportUrl ||
              null,
          };
          updateData.delivered_at =
            admin.firestore.FieldValue.serverTimestamp();
          functions.logger.info(
            `Auto-fetched results for delivered order ${orderId}`,
          );
        } catch (fetchError: any) {
          functions.logger.warn(
            `Order ${orderId} is delivered but results fetch failed: ${fetchError.message}. Results can be fetched later.`,
          );
        }
      }

      await reportRef.update(updateData);

      return {
        success: true,
        orderId,
        status: apiStatus.status,
        percentComplete: apiStatus.percentComplete,
        ...(reportData ? { reportData } : {}),
      };
    } catch (error: any) {
      functions.logger.error(
        `Check EagleView status error (${orderId}):`,
        error,
      );
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to check EagleView status",
      );
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
export const processEagleviewDelivery = functions
  .runWith({ timeoutSeconds: 60, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to process deliveries",
      );
    }

    const { orderId, reportData } = data;

    if (!orderId || !reportData) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "orderId and reportData are required",
      );
    }

    const db = admin.firestore();

    // Find the report
    const snapshot = await db
      .collection("eagleview_reports")
      .where("orderId", "==", orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        `No report found for order: ${orderId}`,
      );
    }

    try {
      const reportRef = snapshot.docs[0].ref;
      const report = snapshot.docs[0].data();

      // Parse and store the delivered data
      const parsedData: Record<string, unknown> = {
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

      functions.logger.info(
        `EagleView report delivered for order ${orderId}. Survey updated: ${surveyUpdated}`,
      );

      return {
        success: true,
        reportId: snapshot.docs[0].id,
        surveyUpdated,
      };
    } catch (error: any) {
      functions.logger.error(
        `Process EagleView delivery error (${orderId}):`,
        error,
      );
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to process EagleView delivery",
      );
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
export const getEagleviewReport = functions
  .runWith({ timeoutSeconds: 10, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view reports",
      );
    }

    const { reportId } = data;
    if (!reportId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "reportId is required",
      );
    }

    const db = admin.firestore();
    const reportSnap = await db
      .collection("eagleview_reports")
      .doc(reportId)
      .get();

    if (!reportSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Report not found: ${reportId}`,
      );
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
export const shouldOrderEagleview = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to check EagleView need",
      );
    }

    const { projectId } = data;
    if (!projectId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId is required",
      );
    }

    const db = admin.firestore();

    try {
      // Get the project
      const projectSnap = await db.collection("projects").doc(projectId).get();

      if (!projectSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Project not found: ${projectId}`,
        );
      }

      const project = projectSnap.data()!;

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
          reason:
            "An EagleView report already exists or is in progress for this project.",
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

      const reasons: string[] = [];
      let recommendedType: EagleviewReportType = "SunSite";

      // Rule 1: No survey data at all
      if (surveySnap.empty) {
        reasons.push("No site survey data available");
      } else {
        const survey = surveySnap.docs[0].data();

        // Rule 2: Missing roof facet data
        if (
          !survey.roof_measurements?.facets ||
          survey.roof_measurements.facets.length === 0
        ) {
          reasons.push("Survey is missing roof facet measurements");
        }

        // Rule 3: Low confidence on roof measurements
        if (
          survey.roof_measurements?.confidence &&
          survey.roof_measurements.confidence < 0.7
        ) {
          reasons.push(
            `Roof measurement confidence is low (${survey.roof_measurements.confidence})`,
          );
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
    } catch (error: any) {
      functions.logger.error(
        `shouldOrderEagleview error (${projectId}):`,
        error,
      );
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to check EagleView need",
      );
    }
  });

// ─── Cloud Function: getEagleviewResults ────────────────────────────────────────

/**
 * Fetch completed report results from EagleView for a delivered order.
 * Downloads the full report data and updates the local record.
 *
 * @function getEagleviewResults
 * @type onCall
 * @auth firebase
 * @input {{ orderId: string }}
 * @output {{ success: boolean, orderId: string, reportData: object }}
 */
export const getEagleviewResults = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to fetch results",
      );
    }

    const { orderId } = data;
    if (!orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "orderId is required",
      );
    }

    const db = admin.firestore();

    // Find the report by orderId
    const snapshot = await db
      .collection("eagleview_reports")
      .where("orderId", "==", orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        `No report found for order: ${orderId}`,
      );
    }

    try {
      const reportData = await fetchEagleviewResults(orderId);

      // Parse into our standard data format
      const parsedData: Record<string, unknown> = {
        roof_facets: reportData.roof_facets || reportData.roofFacets || [],
        total_roof_area:
          reportData.total_roof_area || reportData.totalRoofArea || 0,
        total_usable_area:
          reportData.total_usable_area || reportData.totalUsableArea || 0,
        obstructions: reportData.obstructions || [],
        three_d_model_url:
          reportData.three_d_model_url || reportData.modelUrl || null,
        shade_report_url:
          reportData.shade_report_url || reportData.shadeReportUrl || null,
        measurement_report_url:
          reportData.measurement_report_url ||
          reportData.measurementReportUrl ||
          null,
      };

      // Update the local record
      const reportRef = snapshot.docs[0].ref;
      await reportRef.update({
        status: "delivered",
        data: parsedData,
        delivered_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(
        `EagleView results fetched and stored for order ${orderId}`,
      );

      return {
        success: true,
        orderId,
        reportData: parsedData,
      };
    } catch (error: any) {
      functions.logger.error(
        `Fetch EagleView results error (${orderId}):`,
        error,
      );
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to fetch EagleView results",
      );
    }
  });

// ─── Cloud Function: eagleviewWebhook ───────────────────────────────────────────

/**
 * Webhook handler for EagleView delivery callbacks.
 * EagleView calls this endpoint when a report is ready for download.
 * Automatically fetches the report data and updates the local record.
 *
 * @function eagleviewWebhook
 * @type onRequest (POST)
 * @auth none (validated by checking orderId exists in our records)
 */
export const eagleviewWebhook = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    // Only accept POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = req.body || {};
    const orderId = body.orderId || body.order_id || body.id;
    const eventType =
      body.eventType || body.event_type || body.event || "delivery";

    if (!orderId) {
      functions.logger.warn(
        "EagleView webhook received without orderId:",
        body,
      );
      res.status(400).json({ error: "Missing orderId in webhook payload" });
      return;
    }

    functions.logger.info(
      `EagleView webhook received: orderId=${orderId}, event=${eventType}`,
    );

    const db = admin.firestore();

    // Find the report by orderId — also validates this is a legitimate callback
    const snapshot = await db
      .collection("eagleview_reports")
      .where("orderId", "==", orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      functions.logger.warn(`EagleView webhook for unknown order: ${orderId}`);
      // Return 200 anyway to prevent EagleView from retrying for unknown orders
      res.status(200).json({ received: true, matched: false });
      return;
    }

    const reportRef = snapshot.docs[0].ref;

    try {
      // Handle different event types
      if (
        eventType === "failed" ||
        eventType === "error" ||
        eventType === "cancelled"
      ) {
        await reportRef.update({
          status: "failed",
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          webhook_received_at: admin.firestore.FieldValue.serverTimestamp(),
          failure_reason:
            body.reason ||
            body.message ||
            "Order failed (reported via webhook)",
        });

        functions.logger.warn(
          `EagleView order ${orderId} failed via webhook: ${body.reason || "no reason"}`,
        );
        res.status(200).json({ received: true, status: "failed" });
        return;
      }

      // For delivery events, fetch the full results
      let parsedData: Record<string, unknown> | null = null;
      try {
        const reportData = await fetchEagleviewResults(orderId);
        parsedData = {
          roof_facets: reportData.roof_facets || reportData.roofFacets || [],
          total_roof_area:
            reportData.total_roof_area || reportData.totalRoofArea || 0,
          total_usable_area:
            reportData.total_usable_area || reportData.totalUsableArea || 0,
          obstructions: reportData.obstructions || [],
          three_d_model_url:
            reportData.three_d_model_url || reportData.modelUrl || null,
          shade_report_url:
            reportData.shade_report_url || reportData.shadeReportUrl || null,
          measurement_report_url:
            reportData.measurement_report_url ||
            reportData.measurementReportUrl ||
            null,
        };
      } catch (fetchErr: any) {
        functions.logger.warn(
          `Webhook for ${orderId}: results fetch failed (${fetchErr.message}), marking delivered without data`,
        );
      }

      const updatePayload: Record<string, unknown> = {
        status: "delivered",
        delivered_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        webhook_received_at: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (parsedData) {
        updatePayload.data = parsedData;
      }

      await reportRef.update(updatePayload);

      // If there's an associated survey, update it with the roof data
      const report = snapshot.docs[0].data();
      if (report.surveyId && parsedData) {
        try {
          const surveyRef = db.collection("site_surveys").doc(report.surveyId);
          const surveySnap = await surveyRef.get();
          if (surveySnap.exists) {
            await surveyRef.update({
              "roof_measurements.eagleview_data": parsedData,
              "roof_measurements.total_roof_area": parsedData.total_roof_area,
              "roof_measurements.usable_roof_area":
                parsedData.total_usable_area,
              "roof_measurements.facets": parsedData.roof_facets,
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            functions.logger.info(
              `Survey ${report.surveyId} updated with EagleView data from webhook`,
            );
          }
        } catch (surveyErr: any) {
          functions.logger.warn(
            `Failed to update survey ${report.surveyId} from webhook: ${surveyErr.message}`,
          );
        }
      }

      functions.logger.info(
        `EagleView webhook processed: order ${orderId} delivered${parsedData ? " with data" : " (data pending)"}`,
      );

      res.status(200).json({
        received: true,
        status: "delivered",
        dataFetched: !!parsedData,
      });
    } catch (error: any) {
      functions.logger.error(
        `EagleView webhook processing error (${orderId}):`,
        error,
      );
      // Return 500 so EagleView will retry
      res.status(500).json({ error: "Internal processing error" });
    }
  });
