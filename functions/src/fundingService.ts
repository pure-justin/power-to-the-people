/**
 * Funding & PPA Bankability - Cloud Functions
 *
 * Manages the funding lifecycle for solar projects: package creation,
 * document readiness, submission to funders, milestone payments, and
 * bankability package generation.
 *
 * Supports funding types: lease, ppa, loan, cash, pace
 *
 * Collections:
 *   funding_packages      — Funding lifecycle from preparation to funded
 *   bankability_packages  — Bankable documentation with P50/P90 estimates
 *
 * @module fundingService
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Supported funding types */
type FundingType = "lease" | "ppa" | "loan" | "cash" | "pace";

/** Funding status through the lifecycle */
type FundingStatus =
  | "preparing"
  | "documents_ready"
  | "submitted"
  | "under_review"
  | "approved"
  | "funded"
  | "rejected";

/** Bankability package status */
type BankabilityStatus =
  | "generating"
  | "review"
  | "certified"
  | "submitted_to_funder";

/** Valid funding types for validation */
const VALID_FUNDING_TYPES: FundingType[] = [
  "lease",
  "ppa",
  "loan",
  "cash",
  "pace",
];

/** Required documents for funding submission */
const REQUIRED_DOCUMENTS = [
  "contract_signed",
  "permit_approved",
  "install_photos_approved",
  "inspection_passed",
  "interconnection_approved",
  "utility_pto",
];

// ─── Cloud Function: createFundingPackage ───────────────────────────────────────

/**
 * Create a new funding package for a project.
 * Initializes document tracking and milestone payment structure.
 *
 * @function createFundingPackage
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string, type: FundingType, provider: string, fundingAmount?: number }}
 * @output {{ success: boolean, packageId: string }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore funding_packages
 */
export const createFundingPackage = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to create funding packages",
      );
    }

    const { projectId, type, provider, fundingAmount } = data;

    if (!projectId || !type || !provider) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId, type, and provider are required",
      );
    }

    if (!VALID_FUNDING_TYPES.includes(type)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid funding type: "${type}". Must be one of: ${VALID_FUNDING_TYPES.join(", ")}`,
      );
    }

    try {
      // Initialize document tracking — all start as false
      const documents: Record<string, boolean> = {};
      REQUIRED_DOCUMENTS.forEach((doc) => {
        documents[doc] = false;
      });

      // Standard milestone structure for solar installs
      const milestonePayments = [
        {
          milestone: "contract_signed",
          amount: 0,
          status: "pending",
          paid_at: null,
        },
        {
          milestone: "permit_approved",
          amount: 0,
          status: "pending",
          paid_at: null,
        },
        {
          milestone: "installation_complete",
          amount: 0,
          status: "pending",
          paid_at: null,
        },
        {
          milestone: "inspection_passed",
          amount: 0,
          status: "pending",
          paid_at: null,
        },
        {
          milestone: "pto_received",
          amount: 0,
          status: "pending",
          paid_at: null,
        },
      ];

      const packageData = {
        projectId,
        type,
        provider,
        status: "preparing" as FundingStatus,
        documents,
        submission: {
          method: null,
          submitted_at: null,
          submitted_by: null,
          reference_number: null,
        },
        funding_amount: fundingAmount || 0,
        milestone_payments: milestonePayments,
        created_by: context.auth.uid,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      const ref = await db.collection("funding_packages").add(packageData);

      functions.logger.info(
        `Funding package created: ${ref.id} (type=${type}, provider=${provider}, project=${projectId})`,
      );

      return { success: true, packageId: ref.id };
    } catch (error: any) {
      functions.logger.error("Create funding package error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create funding package",
      );
    }
  });

// ─── Cloud Function: checkDocumentReadiness ─────────────────────────────────────

/**
 * Check if all required documents for a funding package are ready.
 * Returns the list of missing documents so the UI can show a checklist.
 *
 * @function checkDocumentReadiness
 * @type onCall
 * @auth firebase
 * @input {{ packageId: string }}
 * @output {{ success: boolean, ready: boolean, missing: string[], completed: string[] }}
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @firestore funding_packages
 */
export const checkDocumentReadiness = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to check documents",
      );
    }

    const { packageId } = data;

    if (!packageId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "packageId is required",
      );
    }

    try {
      const packageSnap = await db
        .collection("funding_packages")
        .doc(packageId)
        .get();

      if (!packageSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Funding package not found: ${packageId}`,
        );
      }

      const pkg = packageSnap.data()!;
      const documents = pkg.documents || {};

      const missing = REQUIRED_DOCUMENTS.filter((doc) => !documents[doc]);
      const completed = REQUIRED_DOCUMENTS.filter((doc) => documents[doc]);
      const ready = missing.length === 0;

      // If all documents ready and status is "preparing", auto-advance
      if (ready && pkg.status === "preparing") {
        await db.collection("funding_packages").doc(packageId).update({
          status: "documents_ready",
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true, ready, missing, completed };
    } catch (error: any) {
      functions.logger.error("Check document readiness error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to check documents",
      );
    }
  });

// ─── Cloud Function: submitFunding ──────────────────────────────────────────────

/**
 * Submit a funding package to the funder. Creates an AI task "funding_submit"
 * to compile and transmit the application. Documents must be ready first.
 *
 * @function submitFunding
 * @type onCall
 * @auth firebase
 * @input {{ packageId: string }}
 * @output {{ success: boolean, status: string, taskId: string }}
 * @errors unauthenticated, invalid-argument, not-found, failed-precondition, internal
 * @firestore funding_packages, ai_tasks
 */
export const submitFunding = functions
  .runWith({ timeoutSeconds: 30, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to submit funding",
      );
    }

    const { packageId } = data;

    if (!packageId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "packageId is required",
      );
    }

    try {
      const packageRef = db.collection("funding_packages").doc(packageId);
      const packageSnap = await packageRef.get();

      if (!packageSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Funding package not found: ${packageId}`,
        );
      }

      const pkg = packageSnap.data()!;

      // Verify documents are ready
      if (pkg.status === "preparing") {
        const documents = pkg.documents || {};
        const missing = REQUIRED_DOCUMENTS.filter((doc) => !documents[doc]);
        if (missing.length > 0) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `Documents not ready. Missing: ${missing.join(", ")}`,
          );
        }
      }

      // Update status to submitted
      await packageRef.update({
        status: "submitted",
        "submission.submitted_at": new Date().toISOString(),
        "submission.submitted_by": context.auth.uid,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create AI task for funding submission automation
      const taskRef = await db.collection("ai_tasks").add({
        type: "funding_submit",
        projectId: pkg.projectId,
        status: "pending",
        input: {
          packageId,
          fundingType: pkg.type,
          provider: pkg.provider,
          projectId: pkg.projectId,
          fundingAmount: pkg.funding_amount,
        },
        output: null,
        aiAttempt: null,
        humanFallback: null,
        learningData: null,
        retryCount: 0,
        maxRetries: 3,
        priority: 2,
        createdBy: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(
        `Funding submitted: package=${packageId}, task=${taskRef.id}`,
      );

      return {
        success: true,
        status: "submitted",
        taskId: taskRef.id,
      };
    } catch (error: any) {
      functions.logger.error("Submit funding error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to submit funding",
      );
    }
  });

// ─── Cloud Function: updateFundingStatus ────────────────────────────────────────

/**
 * Update the status of a funding package. Used to track progress through
 * the funder's review process.
 *
 * @function updateFundingStatus
 * @type onCall
 * @auth firebase
 * @input {{ packageId: string, status: FundingStatus, details?: object }}
 * @output {{ success: boolean, status: string }}
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @firestore funding_packages
 */
export const updateFundingStatus = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to update funding status",
      );
    }

    const { packageId, status, details } = data;

    if (!packageId || !status) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "packageId and status are required",
      );
    }

    const validStatuses: FundingStatus[] = [
      "preparing",
      "documents_ready",
      "submitted",
      "under_review",
      "approved",
      "funded",
      "rejected",
    ];

    if (!validStatuses.includes(status)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid status: "${status}". Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    try {
      const packageRef = db.collection("funding_packages").doc(packageId);
      const packageSnap = await packageRef.get();

      if (!packageSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Funding package not found: ${packageId}`,
        );
      }

      const updateData: Record<string, unknown> = {
        status,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      // If approved, record approval details
      if (status === "approved" && details) {
        updateData["approval_details"] = details;
      }

      // If rejected, record rejection reason
      if (status === "rejected" && details) {
        updateData["rejection_details"] = details;
      }

      // If funded, record reference number
      if (status === "funded" && details?.referenceNumber) {
        updateData["submission.reference_number"] = details.referenceNumber;
      }

      await packageRef.update(updateData);

      functions.logger.info(
        `Funding status updated: package=${packageId}, status=${status}`,
      );

      return { success: true, status };
    } catch (error: any) {
      functions.logger.error("Update funding status error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to update funding status",
      );
    }
  });

// ─── Cloud Function: requestMilestonePayment ────────────────────────────────────

/**
 * Request payment for a completed milestone.
 * Updates the milestone status and records the request timestamp.
 *
 * @function requestMilestonePayment
 * @type onCall
 * @auth firebase
 * @input {{ packageId: string, milestone: string }}
 * @output {{ success: boolean, milestone: object }}
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @firestore funding_packages
 */
export const requestMilestonePayment = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to request payments",
      );
    }

    const { packageId, milestone } = data;

    if (!packageId || !milestone) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "packageId and milestone are required",
      );
    }

    try {
      const packageRef = db.collection("funding_packages").doc(packageId);
      const packageSnap = await packageRef.get();

      if (!packageSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Funding package not found: ${packageId}`,
        );
      }

      const pkg = packageSnap.data()!;
      const milestones = pkg.milestone_payments || [];

      // Find and update the matching milestone
      const milestoneIndex = milestones.findIndex(
        (m: any) => m.milestone === milestone,
      );

      if (milestoneIndex === -1) {
        throw new functions.https.HttpsError(
          "not-found",
          `Milestone not found: ${milestone}`,
        );
      }

      milestones[milestoneIndex] = {
        ...milestones[milestoneIndex],
        status: "requested",
        requested_at: new Date().toISOString(),
        requested_by: context.auth.uid,
      };

      await packageRef.update({
        milestone_payments: milestones,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(
        `Milestone payment requested: package=${packageId}, milestone=${milestone}`,
      );

      return { success: true, milestone: milestones[milestoneIndex] };
    } catch (error: any) {
      functions.logger.error("Request milestone payment error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to request milestone payment",
      );
    }
  });

// ─── Cloud Function: getFundingByProject ────────────────────────────────────────

/**
 * Get all funding packages for a project.
 *
 * @function getFundingByProject
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string }}
 * @output {{ success: boolean, packages: Array }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore funding_packages
 */
export const getFundingByProject = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view funding",
      );
    }

    const { projectId } = data;

    if (!projectId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId is required",
      );
    }

    try {
      const snapshot = await db
        .collection("funding_packages")
        .where("projectId", "==", projectId)
        .orderBy("created_at", "desc")
        .get();

      const packages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, packages };
    } catch (error: any) {
      functions.logger.error("Get funding by project error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get funding packages",
      );
    }
  });

// ─── Cloud Function: generateBankabilityPackage ─────────────────────────────────

/**
 * Generate a bankability documentation package for a project.
 * Compiles P50/P90 production estimates, shade reports, financial models,
 * and compliance checklists into a single package for funders.
 *
 * @function generateBankabilityPackage
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string, fundingPackageId?: string, financials?: object }}
 * @output {{ success: boolean, bankabilityId: string }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore bankability_packages, funding_packages
 */
export const generateBankabilityPackage = functions
  .runWith({ timeoutSeconds: 60, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to generate bankability packages",
      );
    }

    const { projectId, fundingPackageId, financials } = data;

    if (!projectId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId is required",
      );
    }

    try {
      // Gather project data for the bankability package
      const projectSnap = await db.collection("projects").doc(projectId).get();
      const projectData = projectSnap.exists ? projectSnap.data() : {};

      // Build production estimates (placeholder structure — real values from survey/design)
      const production = {
        source: "system_design",
        annual_kwh: projectData?.systemSize
          ? Math.round(projectData.systemSize * 1400)
          : 0,
        monthly_kwh: Array(12).fill(0),
        degradation_rate: 0.005,
        twenty_five_year_kwh: [],
        p50_estimate: 0,
        p90_estimate: 0,
        weather_data_source: "NREL TMY3",
        confidence_interval: 0.9,
      };

      // Compute 25-year production with degradation
      if (production.annual_kwh > 0) {
        production.p50_estimate = production.annual_kwh;
        production.p90_estimate = Math.round(production.annual_kwh * 0.88);

        for (let year = 0; year < 25; year++) {
          production.twenty_five_year_kwh.push(
            Math.round(
              production.annual_kwh *
                Math.pow(1 - production.degradation_rate, year),
            ),
          );
        }
      }

      // Build financials from input or project defaults
      const finData = financials || {};
      const financialModel = {
        system_cost: finData.systemCost || projectData?.systemCost || 0,
        ppa_rate_per_kwh: finData.ppaRate || 0.08,
        escalator: finData.escalator || 0.029,
        term_years: finData.termYears || 25,
        customer_year1_savings: finData.year1Savings || 0,
        customer_lifetime_savings: finData.lifetimeSavings || 0,
        irr: finData.irr || 0,
        payback_period_years: finData.paybackYears || 0,
        lcoe: finData.lcoe || 0,
      };

      // Build compliance checklist
      const compliance = {
        equipment_warranty_valid: true,
        installer_certified: true,
        permit_approved: false,
        interconnection_approved: false,
        insurance_verified: false,
        itc_eligible: false,
        domestic_content_bonus: false,
        energy_community_bonus: false,
      };

      // Check funding package for document status to fill compliance
      if (fundingPackageId) {
        const fundingSnap = await db
          .collection("funding_packages")
          .doc(fundingPackageId)
          .get();

        if (fundingSnap.exists) {
          const fundingData = fundingSnap.data()!;
          const docs = fundingData.documents || {};
          compliance.permit_approved = docs.permit_approved || false;
          compliance.interconnection_approved =
            docs.interconnection_approved || false;
        }
      }

      const bankabilityData = {
        projectId,
        fundingPackageId: fundingPackageId || null,
        status: "generating" as BankabilityStatus,
        production,
        shading: {
          source: "pending",
          tsrf: 0,
          tof: 0,
          solar_access: 0,
          monthly_shade_loss: Array(12).fill(0),
          shade_report_url: null,
          methodology: "satellite_imagery",
        },
        financials: financialModel,
        compliance,
        documents: {
          shade_report: null,
          production_estimate: null,
          site_survey_report: null,
          equipment_spec_sheets: [],
          permit_approval: null,
          install_photos_package: null,
          financial_model: null,
          customer_agreement: null,
        },
        created_by: context.auth.uid,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      const ref = await db
        .collection("bankability_packages")
        .add(bankabilityData);

      // Mark as "review" since we've generated the initial structure
      await ref.update({
        status: "review",
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(
        `Bankability package generated: ${ref.id} for project ${projectId}`,
      );

      return { success: true, bankabilityId: ref.id };
    } catch (error: any) {
      functions.logger.error("Generate bankability package error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to generate bankability package",
      );
    }
  });
