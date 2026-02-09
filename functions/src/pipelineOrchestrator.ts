/**
 * Pipeline Orchestrator — Auto-triggers between SolarOS pipeline stages
 *
 * This is the glue that connects the full automated pipeline:
 * Survey → CAD → Permit → Schedule → Install → Funding → Tax Credit
 *
 * Each Firestore trigger watches for status changes and automatically
 * kicks off the next stage via the AI Task Engine.
 *
 * PATTERN: When stage N completes → create AI task for stage N+1
 * The AI Task Engine handles the attempt + human fallback + learning loop.
 *
 * @module pipelineOrchestrator
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ============================================================
// CONSTANTS — Pipeline stage transitions
// ============================================================

/** Minimum confidence score for AI to auto-approve a survey */
const SURVEY_AUTO_APPROVE_THRESHOLD = 0.85;

/** Priority levels for AI tasks (1 = highest, 5 = lowest) */
const PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  BACKGROUND: 5,
} as const;

// ============================================================
// TRIGGER 1: Survey Approved → Generate CAD Design
// When a site survey is approved, automatically start CAD generation
// ============================================================

/**
 * Watches site_surveys for status changes to "approved".
 * When a survey is approved (by AI or human), kicks off CAD design generation.
 *
 * Pipeline: Survey ✓ → [CAD Generation]
 */
export const onSurveyApproved = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .firestore.document("site_surveys/{surveyId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const surveyId = context.params.surveyId;

    // Only trigger when status changes TO "approved"
    if (before.status === after.status || after.status !== "approved") {
      return null;
    }

    functions.logger.info(
      `[Pipeline] Survey ${surveyId} approved → triggering CAD generation`,
    );

    try {
      // Create AI task to generate the CAD design
      await db.collection("ai_tasks").add({
        type: "cad_generate",
        projectId: after.projectId,
        status: "pending",
        input: {
          surveyId,
          projectId: after.projectId,
          // Pass key survey data the CAD engine needs
          roofMeasurements: after.roof_measurements || null,
          electrical: after.electrical || null,
          utility: after.utility || null,
          shading: after.shading || null,
          property: after.property || null,
        },
        output: null,
        aiAttempt: null,
        humanFallback: null,
        learningData: null,
        retryCount: 0,
        maxRetries: 3,
        priority: PRIORITY.HIGH,
        createdBy: "pipeline_orchestrator",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Also check if EagleView data is needed for bankability
      // (PPA/lease projects require bankable shade reports)
      const projectSnap = await db
        .collection("projects")
        .doc(after.projectId)
        .get();
      const project = projectSnap.data();

      if (
        project?.financingType === "ppa" ||
        project?.financingType === "lease"
      ) {
        functions.logger.info(
          `[Pipeline] PPA/Lease project — checking if EagleView needed`,
        );
        await db.collection("ai_tasks").add({
          type: "survey_process", // Reuse survey_process type for EagleView decision
          projectId: after.projectId,
          status: "pending",
          input: {
            action: "check_eagleview_need",
            surveyId,
            projectId: after.projectId,
            financingType: project.financingType,
          },
          output: null,
          aiAttempt: null,
          humanFallback: null,
          learningData: null,
          retryCount: 0,
          maxRetries: 1,
          priority: PRIORITY.MEDIUM,
          createdBy: "pipeline_orchestrator",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return null;
    } catch (error) {
      functions.logger.error(
        `[Pipeline] Error triggering CAD generation for survey ${surveyId}:`,
        error,
      );
      return null;
    }
  });

// ============================================================
// TRIGGER 2: CAD Design Approved → Create & Submit Permits
// When a design is approved, look up the AHJ and start permit process
// ============================================================

/**
 * Watches cad_designs for status changes to "approved".
 * When approved, finds the relevant AHJ and creates permit submission tasks.
 *
 * Pipeline: CAD ✓ → [Permit Submission]
 */
export const onDesignApproved = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .firestore.document("cad_designs/{designId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const designId = context.params.designId;

    if (before.status === after.status || after.status !== "approved") {
      return null;
    }

    functions.logger.info(
      `[Pipeline] Design ${designId} approved → triggering permit submission`,
    );

    try {
      // Look up the project to get the address
      const projectSnap = await db
        .collection("projects")
        .doc(after.projectId)
        .get();
      const project = projectSnap.data();

      if (!project) {
        functions.logger.error(`[Pipeline] Project ${after.projectId} not found`);
        return null;
      }

      // Find the AHJ for this address (by ZIP code)
      const address = project.address || project.customerAddress || "";
      const zipMatch = address.match(/\b(\d{5})\b/);
      let ahjId = null;

      if (zipMatch) {
        const zip = zipMatch[1];
        const ahjQuery = await db
          .collection("ahj_registry")
          .where("zip_codes", "array-contains", zip)
          .limit(1)
          .get();

        if (!ahjQuery.empty) {
          ahjId = ahjQuery.docs[0].id;
        }
      }

      // Create the permit record
      const permitRef = await db.collection("permits").add({
        projectId: after.projectId,
        designId,
        ahjId: ahjId || "unknown",
        type: "solar",
        status: "preparing",
        submission: null,
        review: null,
        approval: null,
        fees: null,
        timeline: [
          {
            status: "preparing",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            actor: "pipeline_orchestrator",
            notes: "Auto-created after design approval",
          },
        ],
        ai_attempts: [],
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create AI task to submit the permit
      await db.collection("ai_tasks").add({
        type: "permit_submit",
        projectId: after.projectId,
        status: "pending",
        input: {
          permitId: permitRef.id,
          designId,
          ahjId: ahjId || "unknown",
          address,
          designDocuments: after.documents || null,
        },
        output: null,
        aiAttempt: null,
        humanFallback: null,
        learningData: null,
        retryCount: 0,
        maxRetries: 3,
        priority: PRIORITY.HIGH,
        createdBy: "pipeline_orchestrator",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    } catch (error) {
      functions.logger.error(
        `[Pipeline] Error creating permit for design ${designId}:`,
        error,
      );
      return null;
    }
  });

// ============================================================
// TRIGGER 3: Permit Approved → Schedule Installation
// When all permits are approved, start the scheduling process
// ============================================================

/**
 * Watches permits for status changes to "approved".
 * Checks if ALL permits for the project are approved, then triggers scheduling.
 *
 * Pipeline: Permit ✓ → [Schedule Installation]
 */
export const onPermitApproved = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .firestore.document("permits/{permitId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const permitId = context.params.permitId;

    if (before.status === after.status || after.status !== "approved") {
      return null;
    }

    functions.logger.info(
      `[Pipeline] Permit ${permitId} approved → checking if all permits done`,
    );

    try {
      // Check if ALL permits for this project are approved
      const allPermits = await db
        .collection("permits")
        .where("projectId", "==", after.projectId)
        .get();

      const allApproved = allPermits.docs.every(
        (doc) => doc.data().status === "approved",
      );

      if (!allApproved) {
        functions.logger.info(
          `[Pipeline] Not all permits approved yet for project ${after.projectId}`,
        );
        return null;
      }

      functions.logger.info(`[Pipeline] All permits approved → triggering scheduling`);

      // Create AI task to propose a schedule
      await db.collection("ai_tasks").add({
        type: "schedule_match",
        projectId: after.projectId,
        status: "pending",
        input: {
          permitId,
          projectId: after.projectId,
          allPermitIds: allPermits.docs.map((d) => d.id),
        },
        output: null,
        aiAttempt: null,
        humanFallback: null,
        learningData: null,
        retryCount: 0,
        maxRetries: 3,
        priority: PRIORITY.HIGH,
        createdBy: "pipeline_orchestrator",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update project status
      await db.collection("projects").doc(after.projectId).update({
        status: "scheduling",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    } catch (error) {
      functions.logger.error(
        `[Pipeline] Error triggering schedule for permit ${permitId}:`,
        error,
      );
      return null;
    }
  });

// ============================================================
// TRIGGER 4: Install Complete → Submit Funding + Audit Credits
// When all install phases pass QC, trigger funding and credit audit
// ============================================================

/**
 * Watches install_photos for phase_status changes.
 * When the "final" phase is signed off, triggers funding submission
 * and tax credit audit in parallel.
 *
 * Pipeline: Install ✓ → [Funding + Credit Audit] (parallel)
 */
export const onInstallComplete = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .firestore.document("install_photos/{photoSetId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when the "final" phase is signed off
    if (
      after.phase !== "final" ||
      before.phase_status === after.phase_status ||
      after.phase_status !== "passed"
    ) {
      return null;
    }

    // Check sign-off is complete
    const signOff = after.sign_off || {};
    if (!signOff.installer_signed || !signOff.reviewer_signed) {
      return null;
    }

    const projectId = after.projectId;
    functions.logger.info(
      `[Pipeline] Install complete for project ${projectId} → triggering funding + credit audit`,
    );

    try {
      // Create funding submission task
      await db.collection("ai_tasks").add({
        type: "funding_submit",
        projectId,
        status: "pending",
        input: {
          projectId,
          scheduleId: after.scheduleId,
          photoSetId: context.params.photoSetId,
        },
        output: null,
        aiAttempt: null,
        humanFallback: null,
        learningData: null,
        retryCount: 0,
        maxRetries: 3,
        priority: PRIORITY.HIGH,
        createdBy: "pipeline_orchestrator",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create tax credit audit task (runs in parallel with funding)
      await db.collection("ai_tasks").add({
        type: "credit_audit",
        projectId,
        status: "pending",
        input: {
          projectId,
          action: "full_audit",
        },
        output: null,
        aiAttempt: null,
        humanFallback: null,
        learningData: null,
        retryCount: 0,
        maxRetries: 3,
        priority: PRIORITY.MEDIUM,
        createdBy: "pipeline_orchestrator",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update project status
      await db.collection("projects").doc(projectId).update({
        status: "funding",
        installCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    } catch (error) {
      functions.logger.error(
        `[Pipeline] Error triggering post-install tasks for ${projectId}:`,
        error,
      );
      return null;
    }
  });

// ============================================================
// TRIGGER 5: Funding Approved → Notify for Credit Listing
// When funding is approved, the project is complete.
// Notify the owner they can list their tax credits.
// ============================================================

/**
 * Watches funding_packages for status changes to "funded".
 * Marks the project as complete and notifies about credit listing.
 *
 * Pipeline: Funding ✓ → [Project Complete + Credit Listing Available]
 */
export const onFundingComplete = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .firestore.document("funding_packages/{packageId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status || after.status !== "funded") {
      return null;
    }

    const projectId = after.projectId;
    functions.logger.info(
      `[Pipeline] Funding complete for project ${projectId} → project DONE`,
    );

    try {
      // Mark project as complete
      await db.collection("projects").doc(projectId).update({
        status: "complete",
        fundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Check if credit audit is certified — if so, credit can be listed
      const auditQuery = await db
        .collection("tax_credit_audits")
        .where("projectId", "==", projectId)
        .where("status", "==", "certified")
        .limit(1)
        .get();

      if (!auditQuery.empty) {
        functions.logger.info(
          `[Pipeline] Credit audit certified — credit ready for marketplace listing`,
        );
        // The seller can now list via the DashboardCredits UI
        // No auto-listing — that's a business decision for the seller
      }

      return null;
    } catch (error) {
      functions.logger.error(`[Pipeline] Error completing project ${projectId}:`, error);
      return null;
    }
  });
