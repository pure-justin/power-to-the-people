/**
 * Install Photo QC - Cloud Functions
 *
 * Manages installation photo capture, AI-powered quality analysis, and
 * phase-by-phase sign-off during solar installations. Each installation
 * phase has required photo types that are analyzed for compliance.
 *
 * Photo check types by phase:
 *   mounting:  rail_alignment, lag_bolt_spacing, flashing_seal
 *   wiring:    wire_management, conduit_runs, junction_boxes, labeling
 *   panels:    alignment, spacing, clamp_torque, no_damage
 *   inverter:  mounting_height, clearance, disconnect_visible, labels
 *   battery:   indoor_outdoor_compliance, clearance, ventilation
 *   final:     system_labels, rapid_shutdown, placards, meter
 *
 * Collections:
 *   install_photos — Photo records grouped by project and phase
 *
 * @module photoAnalysisService
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Installation phases that require photo documentation */
type InstallPhase =
  | "pre_install"
  | "mounting"
  | "wiring"
  | "panels"
  | "inverter"
  | "battery"
  | "final"
  | "inspection";

/** AI analysis result status for individual photos */
type AnalysisStatus = "analyzing" | "pass" | "flag" | "fail";

/** Phase-level completion status */
type PhaseStatus =
  | "in_progress"
  | "passed"
  | "needs_rework"
  | "rework_complete";

/** Valid phases list for input validation */
const VALID_PHASES: InstallPhase[] = [
  "pre_install",
  "mounting",
  "wiring",
  "panels",
  "inverter",
  "battery",
  "final",
  "inspection",
];

/** Check types required per phase — used by AI analysis and UI checklists */
const PHASE_CHECK_TYPES: Record<string, string[]> = {
  pre_install: [
    "site_condition",
    "roof_condition",
    "electrical_panel",
    "access_points",
  ],
  mounting: ["rail_alignment", "lag_bolt_spacing", "flashing_seal"],
  wiring: ["wire_management", "conduit_runs", "junction_boxes", "labeling"],
  panels: ["alignment", "spacing", "clamp_torque", "no_damage"],
  inverter: ["mounting_height", "clearance", "disconnect_visible", "labels"],
  battery: ["indoor_outdoor_compliance", "clearance", "ventilation"],
  final: ["system_labels", "rapid_shutdown", "placards", "meter"],
  inspection: ["inspector_approval", "final_sign_off"],
};

// ─── Cloud Function: uploadInstallPhoto ─────────────────────────────────────────

/**
 * Upload a photo entry for an installation phase, triggering AI analysis.
 * Creates or appends to the install_photos record for the project+phase combo.
 * Dispatches an AI task "photo_analyze" to check the photo against phase requirements.
 *
 * @function uploadInstallPhoto
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string, scheduleId: string, phase: InstallPhase, photoData: { url: string, takenBy: string, gps?: {lat, lng} } }}
 * @output {{ success: boolean, photoId: string, recordId: string }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore install_photos, ai_tasks
 */
export const uploadInstallPhoto = functions
  .runWith({ timeoutSeconds: 30, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to upload photos",
      );
    }

    const { projectId, scheduleId, phase, photoData } = data;

    if (!projectId || !scheduleId || !phase || !photoData?.url) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId, scheduleId, phase, and photoData.url are required",
      );
    }

    if (!VALID_PHASES.includes(phase)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid phase: "${phase}". Must be one of: ${VALID_PHASES.join(", ")}`,
      );
    }

    try {
      const photoId = db.collection("_").doc().id; // Generate unique ID

      const photoEntry = {
        id: photoId,
        url: photoData.url,
        taken_at: new Date().toISOString(),
        taken_by: photoData.takenBy || context.auth.uid,
        gps: photoData.gps || null,
        ai_analysis: {
          status: "analyzing" as AnalysisStatus,
          checks: [],
          overall_score: null,
          blocking_issues: [],
          recommendations: [],
          analyzed_at: null,
        },
      };

      // Find or create the install_photos record for this project+phase
      const existingQuery = await db
        .collection("install_photos")
        .where("projectId", "==", projectId)
        .where("phase", "==", phase)
        .limit(1)
        .get();

      let recordId: string;

      if (!existingQuery.empty) {
        // Append photo to existing record
        recordId = existingQuery.docs[0].id;
        await db
          .collection("install_photos")
          .doc(recordId)
          .update({
            photos: admin.firestore.FieldValue.arrayUnion(photoEntry),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
      } else {
        // Create new record for this phase
        const ref = await db.collection("install_photos").add({
          projectId,
          scheduleId,
          phase,
          photos: [photoEntry],
          phase_status: "in_progress" as PhaseStatus,
          sign_off: {
            installer_signed: false,
            reviewer_signed: false,
            customer_signed: false,
            signed_at: null,
          },
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        recordId = ref.id;
      }

      // Create AI task for photo analysis
      await db.collection("ai_tasks").add({
        type: "photo_analyze",
        projectId,
        status: "pending",
        input: {
          recordId,
          photoId,
          phase,
          photoUrl: photoData.url,
          checkTypes: PHASE_CHECK_TYPES[phase] || [],
          gps: photoData.gps || null,
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
        `Photo uploaded: project=${projectId}, phase=${phase}, photoId=${photoId}`,
      );

      return { success: true, photoId, recordId };
    } catch (error: any) {
      functions.logger.error("Upload install photo error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to upload photo",
      );
    }
  });

// ─── Cloud Function: getPhotosByProject ─────────────────────────────────────────

/**
 * Get all photos for a project, grouped by phase.
 *
 * @function getPhotosByProject
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string }}
 * @output {{ success: boolean, phases: Record<string, object> }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore install_photos
 */
export const getPhotosByProject = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view photos",
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
        .collection("install_photos")
        .where("projectId", "==", projectId)
        .get();

      // Group by phase for easy frontend consumption
      const phases: Record<string, any> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const record = { id: doc.id, ...data };
        phases[data.phase] = record;
      });

      return { success: true, phases };
    } catch (error: any) {
      functions.logger.error("Get photos by project error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get photos",
      );
    }
  });

// ─── Cloud Function: getPhaseStatus ─────────────────────────────────────────────

/**
 * Check if all required photos for a phase are uploaded and analyzed.
 * Returns completion status and any outstanding issues.
 *
 * @function getPhaseStatus
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string, phase: InstallPhase }}
 * @output {{ success: boolean, complete: boolean, passing: boolean, issues: Array, photoCount: number }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore install_photos
 */
export const getPhaseStatus = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to check phase status",
      );
    }

    const { projectId, phase } = data;

    if (!projectId || !phase) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId and phase are required",
      );
    }

    try {
      const snapshot = await db
        .collection("install_photos")
        .where("projectId", "==", projectId)
        .where("phase", "==", phase)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          success: true,
          complete: false,
          passing: false,
          issues: ["No photos uploaded for this phase"],
          photoCount: 0,
        };
      }

      const record = snapshot.docs[0].data();
      const photos = record.photos || [];
      const issues: string[] = [];

      // Check if all photos have been analyzed
      const allAnalyzed = photos.every(
        (p: any) => p.ai_analysis?.status !== "analyzing",
      );

      // Check for failures or flags
      const failedPhotos = photos.filter(
        (p: any) => p.ai_analysis?.status === "fail",
      );
      const flaggedPhotos = photos.filter(
        (p: any) => p.ai_analysis?.status === "flag",
      );

      if (failedPhotos.length > 0) {
        issues.push(`${failedPhotos.length} photo(s) failed QC checks`);
      }
      if (flaggedPhotos.length > 0) {
        issues.push(`${flaggedPhotos.length} photo(s) flagged for review`);
      }

      // Collect blocking issues from all photos
      photos.forEach((p: any) => {
        if (p.ai_analysis?.blocking_issues) {
          issues.push(...p.ai_analysis.blocking_issues);
        }
      });

      const complete = allAnalyzed && photos.length > 0;
      const passing = complete && failedPhotos.length === 0;

      return {
        success: true,
        complete,
        passing,
        issues,
        photoCount: photos.length,
      };
    } catch (error: any) {
      functions.logger.error("Get phase status error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get phase status",
      );
    }
  });

// ─── Cloud Function: requestPhotoReview ─────────────────────────────────────────

/**
 * Escalate a specific photo to a human reviewer via the AI task engine.
 * Used when AI analysis flags something that needs human judgment.
 *
 * @function requestPhotoReview
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string, photoId: string }}
 * @output {{ success: boolean, taskId: string }}
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @firestore install_photos, ai_tasks
 */
export const requestPhotoReview = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to request review",
      );
    }

    const { projectId, photoId } = data;

    if (!projectId || !photoId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId and photoId are required",
      );
    }

    try {
      // Find the photo record
      const snapshot = await db
        .collection("install_photos")
        .where("projectId", "==", projectId)
        .get();

      let foundPhoto: any = null;
      let foundPhase: string = "";

      snapshot.docs.forEach((doc) => {
        const record = doc.data();
        const photo = (record.photos || []).find((p: any) => p.id === photoId);
        if (photo) {
          foundPhoto = photo;
          foundPhase = record.phase;
        }
      });

      if (!foundPhoto) {
        throw new functions.https.HttpsError(
          "not-found",
          `Photo not found: ${photoId}`,
        );
      }

      // Create human review task
      const taskRef = await db.collection("ai_tasks").add({
        type: "photo_analyze",
        projectId,
        status: "human_needed",
        input: {
          photoId,
          phase: foundPhase,
          photoUrl: foundPhoto.url,
          currentAnalysis: foundPhoto.ai_analysis,
          reviewRequested: true,
        },
        output: null,
        aiAttempt: null,
        humanFallback: {
          reason: "Manual review requested",
          escalatedBy: context.auth.uid,
          escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        learningData: null,
        retryCount: 0,
        maxRetries: 0,
        priority: 2,
        createdBy: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(
        `Photo review requested: project=${projectId}, photo=${photoId}, task=${taskRef.id}`,
      );

      return { success: true, taskId: taskRef.id };
    } catch (error: any) {
      functions.logger.error("Request photo review error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to request review",
      );
    }
  });

// ─── Cloud Function: signOffPhase ───────────────────────────────────────────────

/**
 * Sign off on a completed installation phase.
 * Requires role-based authorization: installer, reviewer, or customer.
 *
 * @function signOffPhase
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string, phase: InstallPhase, signedBy: string, role: "installer" | "reviewer" | "customer" }}
 * @output {{ success: boolean, signOff: object }}
 * @errors unauthenticated, invalid-argument, not-found, failed-precondition, internal
 * @firestore install_photos
 */
export const signOffPhase = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to sign off phases",
      );
    }

    const { projectId, phase, signedBy, role } = data;

    if (!projectId || !phase || !signedBy || !role) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId, phase, signedBy, and role are required",
      );
    }

    if (!["installer", "reviewer", "customer"].includes(role)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        'role must be "installer", "reviewer", or "customer"',
      );
    }

    try {
      const snapshot = await db
        .collection("install_photos")
        .where("projectId", "==", projectId)
        .where("phase", "==", phase)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new functions.https.HttpsError(
          "not-found",
          `No photo record found for project ${projectId}, phase ${phase}`,
        );
      }

      const recordRef = snapshot.docs[0].ref;
      const record = snapshot.docs[0].data();

      // Check that all photos pass before allowing sign-off
      const hasFailures = (record.photos || []).some(
        (p: any) => p.ai_analysis?.status === "fail",
      );

      if (hasFailures && role !== "reviewer") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Cannot sign off phase with failed QC checks. Request a reviewer override or fix issues.",
        );
      }

      // Update the appropriate sign-off field
      const signOffField = `sign_off.${role}_signed`;
      const updateData: Record<string, unknown> = {
        [signOffField]: true,
        "sign_off.signed_at": admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Check if all roles have signed — if so, mark phase as passed
      const currentSignOff = record.sign_off || {};
      const updatedSignOff = { ...currentSignOff, [`${role}_signed`]: true };

      if (updatedSignOff.installer_signed && updatedSignOff.reviewer_signed) {
        updateData.phase_status = "passed";
      }

      await recordRef.update(updateData);

      functions.logger.info(
        `Phase signed off: project=${projectId}, phase=${phase}, role=${role}`,
      );

      return {
        success: true,
        signOff: { ...updatedSignOff, [`${role}_signed`]: true },
      };
    } catch (error: any) {
      functions.logger.error("Sign off phase error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to sign off phase",
      );
    }
  });

// ─── Cloud Function: getInstallProgress ─────────────────────────────────────────

/**
 * Get overall install progress for a project across all phases.
 * Returns which phases are complete, their scores, and overall progress.
 *
 * @function getInstallProgress
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string }}
 * @output {{ success: boolean, progress: { phases: Record, overallScore: number, completedPhases: number, totalPhases: number } }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore install_photos
 */
export const getInstallProgress = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view progress",
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
        .collection("install_photos")
        .where("projectId", "==", projectId)
        .get();

      const phases: Record<string, any> = {};
      let totalScore = 0;
      let scoredPhases = 0;
      let completedPhases = 0;

      // Initialize all phases
      VALID_PHASES.forEach((phase) => {
        phases[phase] = {
          status: "not_started",
          photoCount: 0,
          score: null,
          issues: [],
          signedOff: false,
        };
      });

      // Fill in data from existing records
      snapshot.docs.forEach((doc) => {
        const record = doc.data();
        const phase = record.phase;
        const photos = record.photos || [];

        const failCount = photos.filter(
          (p: any) => p.ai_analysis?.status === "fail",
        ).length;
        const passCount = photos.filter(
          (p: any) => p.ai_analysis?.status === "pass",
        ).length;

        // Compute average score from photo analyses
        const scores = photos
          .filter((p: any) => p.ai_analysis?.overall_score != null)
          .map((p: any) => p.ai_analysis.overall_score);

        const avgScore =
          scores.length > 0
            ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
            : null;

        if (avgScore !== null) {
          totalScore += avgScore;
          scoredPhases++;
        }

        const isComplete = record.phase_status === "passed";
        if (isComplete) completedPhases++;

        phases[phase] = {
          status: record.phase_status || "in_progress",
          photoCount: photos.length,
          score: avgScore,
          passCount,
          failCount,
          issues: photos.flatMap(
            (p: any) => p.ai_analysis?.blocking_issues || [],
          ),
          signedOff:
            record.sign_off?.installer_signed &&
            record.sign_off?.reviewer_signed,
        };
      });

      const overallScore =
        scoredPhases > 0 ? Math.round(totalScore / scoredPhases) : 0;

      return {
        success: true,
        progress: {
          phases,
          overallScore,
          completedPhases,
          totalPhases: VALID_PHASES.length,
          percentComplete: Math.round(
            (completedPhases / VALID_PHASES.length) * 100,
          ),
        },
      };
    } catch (error: any) {
      functions.logger.error("Get install progress error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get install progress",
      );
    }
  });
