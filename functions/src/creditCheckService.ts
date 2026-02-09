/**
 * Credit Check Service - iSoftPull Integration
 *
 * Soft credit pull integration for solar pre-qualification.
 * Uses iSoftPull API v2 for soft pulls (no SSN required).
 * Stores only report links (not raw credit data) to avoid SOC 2 requirements.
 *
 * @module creditCheckService
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// iSoftPull API config
const ISOFTPULL_API_BASE = "https://app.isoftpull.com/api/v2";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreditCheckRequest {
  leadId: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  middleName?: string;
  email?: string;
  phone?: string;
  ssn?: string;
  dateOfBirth?: string;
}

interface BureauReport {
  status: string;
  message?: string;
  report_link?: string;
}

interface ISoftPullResponse {
  reports: {
    equifax?: BureauReport;
    transunion?: BureauReport;
    experian?: BureauReport;
  };
  intelligence?: {
    result: string;
    intelligence_name?: string;
  };
  failure_type?: string;
}

interface CreditCheckRecord {
  leadId: string;
  status: "passed" | "failed" | "error" | "no-hit" | "freeze";
  intelligence_result: string;
  report_links: {
    equifax?: string | null;
    transunion?: string | null;
    experian?: string | null;
  };
  bureau_statuses: {
    equifax?: string | null;
    transunion?: string | null;
    experian?: string | null;
  };
  failure_type?: string | null;
  checked_at: FirebaseFirestore.Timestamp;
  checked_by: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Internal helper for authenticated iSoftPull API requests
 *
 * @function isoftpullFetch
 * @type helper
 * @auth api_key
 * @input {{ endpoint: string, method: string, body?: any }}
 * @output any (iSoftPull API response JSON)
 * @errors failed-precondition, internal
 * @billing none
 * @rateLimit none
 * @firestore none
 */
async function isoftpullFetch(
  endpoint: string,
  method: string,
  body?: any,
): Promise<any> {
  const apiKeyId = functions.config().isoftpull?.api_key_id;
  const apiSecret = functions.config().isoftpull?.api_secret;

  if (!apiKeyId || !apiSecret) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "iSoftPull API credentials are not configured. Set isoftpull.api_key_id and isoftpull.api_secret.",
    );
  }

  const options: RequestInit = {
    method,
    headers: {
      "api-key": apiKeyId,
      "api-secret": apiSecret,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${ISOFTPULL_API_BASE}${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error(
      `iSoftPull API error: ${response.status} ${errorText}`,
    );
    throw new functions.https.HttpsError(
      "internal",
      `iSoftPull API error: ${response.status} - ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Verify the caller is authenticated via Firebase Auth
 *
 * @function verifyAuth
 * @type helper
 * @auth firebase
 * @input {{ context: functions.https.CallableContext }}
 * @output void
 * @errors unauthenticated
 * @billing none
 * @rateLimit none
 * @firestore none
 */
function verifyAuth(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to perform credit checks",
    );
  }
}

/**
 * Validate a US state name or abbreviation
 */
function isValidState(state: string): boolean {
  const states = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
    "DC",
    "District of Columbia",
  ];
  return states.includes(state);
}

/**
 * Validate a US zip code (5 digits)
 */
function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/**
 * Validate SSN format if provided (9 digits, no dashes)
 */
function isValidSsn(ssn: string): boolean {
  return /^\d{9}$/.test(ssn);
}

/**
 * Validate date of birth format if provided (mm/dd/yyyy)
 */
function isValidDob(dob: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(dob);
}

// ─── Cloud Functions ─────────────────────────────────────────────────────────

/**
 * Run a soft credit check via iSoftPull and store the result in Firestore
 *
 * @function runSoftCreditCheck
 * @type onCall
 * @auth firebase
 * @input {{ leadId: string, firstName: string, lastName: string, address: string, city: string, state: string, zip: string, middleName?: string, email?: string, phone?: string, ssn?: string, dateOfBirth?: string }}
 * @output {{ success: boolean, creditCheck: CreditCheckRecord }}
 * @errors unauthenticated, invalid-argument, internal
 * @billing none
 * @rateLimit none
 * @firestore credit_checks, leads
 */
export const runSoftCreditCheck = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data: CreditCheckRequest, context) => {
    verifyAuth(context);

    const {
      leadId,
      firstName,
      lastName,
      address,
      city,
      state,
      zip,
      middleName,
      email,
      phone,
      ssn,
      dateOfBirth,
    } = data;

    // ── Input validation ──────────────────────────────────────────────

    if (!leadId || typeof leadId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "leadId is required and must be a string",
      );
    }

    if (
      !firstName ||
      typeof firstName !== "string" ||
      firstName.trim().length === 0
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "firstName is required",
      );
    }

    if (
      !lastName ||
      typeof lastName !== "string" ||
      lastName.trim().length === 0
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "lastName is required",
      );
    }

    if (
      !address ||
      typeof address !== "string" ||
      address.trim().length === 0
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "address is required",
      );
    }

    if (!city || typeof city !== "string" || city.trim().length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "city is required",
      );
    }

    if (!state || typeof state !== "string" || !isValidState(state.trim())) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid US state name or abbreviation is required",
      );
    }

    if (!zip || typeof zip !== "string" || !isValidZip(zip.trim())) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid 5-digit US zip code is required",
      );
    }

    // Validate optional fields if provided
    if (ssn && !isValidSsn(ssn)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "SSN must be 9 digits with no dashes",
      );
    }

    if (dateOfBirth && !isValidDob(dateOfBirth)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Date of birth must be in mm/dd/yyyy format",
      );
    }

    // ── Verify lead exists ────────────────────────────────────────────

    const db = admin.firestore();
    const leadDoc = await db.collection("leads").doc(leadId).get();

    if (!leadDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Lead ${leadId} not found`,
      );
    }

    // ── Build iSoftPull request body ──────────────────────────────────

    const requestBody: Record<string, string> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
    };

    if (middleName) requestBody.middle_name = middleName.trim();
    if (email) requestBody.email = email.trim();
    if (phone) requestBody.phone = phone.replace(/\D/g, "");
    if (ssn) requestBody.ssn = ssn;
    if (dateOfBirth) requestBody.date_of_birth = dateOfBirth;

    // ── Call iSoftPull API ────────────────────────────────────────────

    try {
      const result: ISoftPullResponse = await isoftpullFetch(
        "/reports",
        "POST",
        requestBody,
      );

      functions.logger.info(
        `iSoftPull credit check for lead ${leadId}: intelligence=${result.intelligence?.result || "unknown"}`,
      );

      // ── Determine status ──────────────────────────────────────────

      let status: CreditCheckRecord["status"] = "error";

      if (result.failure_type) {
        // Handle failure cases: "error", "no-hit", "freeze"
        status = result.failure_type as CreditCheckRecord["status"];
      } else if (result.intelligence?.result) {
        status = result.intelligence.result === "passed" ? "passed" : "failed";
      }

      // ── Extract report links only (no raw credit data) ──────────

      const reportLinks: CreditCheckRecord["report_links"] = {
        equifax: result.reports?.equifax?.report_link || null,
        transunion: result.reports?.transunion?.report_link || null,
        experian: result.reports?.experian?.report_link || null,
      };

      const bureauStatuses: CreditCheckRecord["bureau_statuses"] = {
        equifax: result.reports?.equifax?.status || null,
        transunion: result.reports?.transunion?.status || null,
        experian: result.reports?.experian?.status || null,
      };

      // ── Store in Firestore ──────────────────────────────────────

      const creditCheckData: CreditCheckRecord = {
        leadId,
        status,
        intelligence_result: result.intelligence?.result || "unknown",
        report_links: reportLinks,
        bureau_statuses: bureauStatuses,
        failure_type: result.failure_type || null,
        checked_at: admin.firestore.Timestamp.now(),
        checked_by: context.auth!.uid,
      };

      const creditCheckRef = await db
        .collection("credit_checks")
        .add(creditCheckData);

      // Update lead with credit check reference
      await db
        .collection("leads")
        .doc(leadId)
        .update({
          "creditCheck.latestId": creditCheckRef.id,
          "creditCheck.status": status,
          "creditCheck.intelligenceResult":
            result.intelligence?.result || "unknown",
          "creditCheck.checkedAt": admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

      functions.logger.info(
        `Credit check ${creditCheckRef.id} saved for lead ${leadId} — status: ${status}`,
      );

      return {
        success: true,
        creditCheck: {
          id: creditCheckRef.id,
          ...creditCheckData,
          checked_at: creditCheckData.checked_at.toDate().toISOString(),
        },
      };
    } catch (error: any) {
      functions.logger.error("iSoftPull credit check error:", error);

      // Store the failed attempt in Firestore for audit trail
      await db.collection("credit_checks").add({
        leadId,
        status: "error",
        intelligence_result: "error",
        report_links: { equifax: null, transunion: null, experian: null },
        bureau_statuses: { equifax: null, transunion: null, experian: null },
        failure_type: "api_error",
        error_message: error.message || "Unknown error",
        checked_at: admin.firestore.Timestamp.now(),
        checked_by: context.auth!.uid,
      });

      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to run credit check",
      );
    }
  });

/**
 * Get the most recent credit check result for a lead
 *
 * @function getCreditCheckResult
 * @type onCall
 * @auth firebase
 * @input {{ leadId: string }}
 * @output {{ success: boolean, creditCheck: CreditCheckRecord | null }}
 * @errors unauthenticated, invalid-argument
 * @billing none
 * @rateLimit none
 * @firestore credit_checks
 */
export const getCreditCheckResult = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data: { leadId: string }, context) => {
    verifyAuth(context);

    const { leadId } = data;

    if (!leadId || typeof leadId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "leadId is required",
      );
    }

    try {
      const db = admin.firestore();

      const checksSnapshot = await db
        .collection("credit_checks")
        .where("leadId", "==", leadId)
        .orderBy("checked_at", "desc")
        .limit(1)
        .get();

      if (checksSnapshot.empty) {
        return {
          success: true,
          creditCheck: null,
        };
      }

      const doc = checksSnapshot.docs[0];
      const checkData = doc.data();

      return {
        success: true,
        creditCheck: {
          id: doc.id,
          ...checkData,
          checked_at: checkData.checked_at?.toDate?.()?.toISOString() || null,
        },
      };
    } catch (error: any) {
      functions.logger.error("Get credit check result error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get credit check result",
      );
    }
  });

/**
 * Get aggregate credit check statistics: total checks, pass rate, checks this month
 *
 * @function getCreditCheckStats
 * @type onCall
 * @auth firebase
 * @input {{ }}
 * @output {{ success: boolean, stats: { totalChecks: number, passRate: number, checksThisMonth: number, statusBreakdown: object } }}
 * @errors unauthenticated
 * @billing none
 * @rateLimit none
 * @firestore credit_checks
 */
export const getCreditCheckStats = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data: any, context) => {
    verifyAuth(context);

    try {
      const db = admin.firestore();

      // Get all credit checks
      const allChecksSnapshot = await db.collection("credit_checks").get();

      const totalChecks = allChecksSnapshot.size;

      // Count statuses
      let passed = 0;
      let failed = 0;
      let errors = 0;
      let noHit = 0;
      let freeze = 0;

      // Count checks this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      let checksThisMonth = 0;

      allChecksSnapshot.docs.forEach((doc) => {
        const check = doc.data();

        switch (check.status) {
          case "passed":
            passed++;
            break;
          case "failed":
            failed++;
            break;
          case "error":
            errors++;
            break;
          case "no-hit":
            noHit++;
            break;
          case "freeze":
            freeze++;
            break;
        }

        // Check if this month
        const checkedAt = check.checked_at?.toDate?.();
        if (checkedAt && checkedAt >= startOfMonth) {
          checksThisMonth++;
        }
      });

      const passRate =
        totalChecks > 0
          ? Math.round((passed / totalChecks) * 100 * 10) / 10
          : 0;

      return {
        success: true,
        stats: {
          totalChecks,
          passed,
          failed,
          passRate,
          checksThisMonth,
          statusBreakdown: {
            passed,
            failed,
            error: errors,
            "no-hit": noHit,
            freeze,
          },
        },
      };
    } catch (error: any) {
      functions.logger.error("Get credit check stats error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get credit check stats",
      );
    }
  });
