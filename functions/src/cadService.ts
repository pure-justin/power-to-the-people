/**
 * CAD Design Engine - Cloud Functions
 *
 * Manages the solar system design lifecycle:
 *   1. Design generated from survey data + energy usage
 *   2. AI calculates optimal system size, panel layout, string configuration
 *   3. Human reviews and adjusts the design
 *   4. Approved design triggers permit creation
 *
 * The design algorithm considers:
 *   - Annual energy consumption vs. solar production target
 *   - Available roof area and shading losses
 *   - NEC 120% rule (system can't exceed 120% of annual consumption)
 *   - Equipment selection from the solar_equipment collection
 *   - String configuration based on inverter specs
 *
 * Collections:
 *   cad_designs — Design records with system specs, layouts, and compliance
 *
 * @module cadService
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Design status lifecycle */
export type DesignStatus =
  | "generating"
  | "ai_complete"
  | "human_review"
  | "approved"
  | "revision";

/** Valid design statuses for input validation */
const VALID_STATUSES: DesignStatus[] = [
  "generating",
  "ai_complete",
  "human_review",
  "approved",
  "revision",
];

// ─── Cloud Function: generateDesign ─────────────────────────────────────────────

/**
 * Create a new CAD design for a project using survey data. Creates an AI task
 * of type "cad_generate" and initializes the design record in "generating" status.
 *
 * The AI task engine will attempt to generate the design automatically using
 * the survey measurements, energy data, and equipment database.
 *
 * @function generateDesign
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string, surveyId: string }}
 * @output {{ success: boolean, designId: string, aiTaskId: string }}
 */
export const generateDesign = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to generate designs",
      );
    }

    const { projectId, surveyId } = data;

    if (!projectId || !surveyId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId and surveyId are required",
      );
    }

    const db = admin.firestore();

    try {
      // Create the design record
      const designData: Record<string, unknown> = {
        projectId,
        surveyId,
        status: "generating" as DesignStatus,
        system_design: {
          total_kw: 0,
          panel_count: 0,
          panel_model: null,
          inverter_model: null,
          battery_model: null,
          mounting_type: "roof",
          panel_layout: [],
          string_configuration: [],
          estimated_annual_kwh: 0,
          offset_percentage: 0,
        },
        documents: {
          site_plan_url: null,
          single_line_diagram_url: null,
          structural_plan_url: null,
          equipment_spec_sheets: [],
          load_calculations_url: null,
        },
        compliance: {
          nec_compliant: false,
          setback_compliant: false,
          fire_code_compliant: false,
          structural_adequate: false,
          issues: [],
        },
        ai_generation: {
          started_at: admin.firestore.FieldValue.serverTimestamp(),
          completed_at: null,
          model_version: "v1.0",
          confidence: 0,
        },
        human_review: {
          reviewer_id: null,
          reviewed_at: null,
          changes_made: [],
          approved: false,
        },
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      const designRef = await db.collection("cad_designs").add(designData);

      // Create an AI task for the generation
      const aiTaskRef = await db.collection("ai_tasks").add({
        type: "cad_generate",
        projectId,
        status: "pending",
        input: {
          designId: designRef.id,
          surveyId,
          context: {},
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

      console.log(
        `Design created: ${designRef.id} for project ${projectId}, AI task: ${aiTaskRef.id}`,
      );

      return {
        success: true,
        designId: designRef.id,
        aiTaskId: aiTaskRef.id,
      };
    } catch (error: any) {
      console.error("Generate design error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to generate design",
      );
    }
  });

// ─── Cloud Function: getDesign ──────────────────────────────────────────────────

/**
 * Get a single design with all specs, documents, and compliance details.
 *
 * @function getDesign
 * @type onCall
 * @auth firebase
 * @input {{ designId: string }}
 * @output {{ success: boolean, design: object }}
 */
export const getDesign = functions
  .runWith({ timeoutSeconds: 10, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view designs",
      );
    }

    const { designId } = data;
    if (!designId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "designId is required",
      );
    }

    const db = admin.firestore();
    const designSnap = await db.collection("cad_designs").doc(designId).get();

    if (!designSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Design not found: ${designId}`,
      );
    }

    return {
      success: true,
      design: { id: designSnap.id, ...designSnap.data() },
    };
  });

// ─── Cloud Function: getDesignsByProject ────────────────────────────────────────

/**
 * List all designs for a project, ordered by creation date (newest first).
 *
 * @function getDesignsByProject
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string }}
 * @output {{ success: boolean, designs: Array<object> }}
 */
export const getDesignsByProject = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view designs",
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
    const snapshot = await db
      .collection("cad_designs")
      .where("projectId", "==", projectId)
      .orderBy("created_at", "desc")
      .limit(20)
      .get();

    const designs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, designs };
  });

// ─── Cloud Function: updateDesign ───────────────────────────────────────────────

/**
 * Human edits to a design. Accepts partial updates to system_design fields.
 * All changes are logged so the AI can learn from human adjustments.
 *
 * @function updateDesign
 * @type onCall
 * @auth firebase
 * @input {{ designId: string, changes: object }}
 * @output {{ success: boolean, designId: string }}
 */
export const updateDesign = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to update designs",
      );
    }

    const { designId, changes } = data;

    if (!designId || !changes) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "designId and changes are required",
      );
    }

    const db = admin.firestore();
    const designRef = db.collection("cad_designs").doc(designId);
    const designSnap = await designRef.get();

    if (!designSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Design not found: ${designId}`,
      );
    }

    try {
      // Build dot-notation updates for nested system_design fields
      const updateData: Record<string, unknown> = {
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Apply changes to system_design if provided
      if (changes.system_design) {
        for (const [key, value] of Object.entries(changes.system_design)) {
          updateData[`system_design.${key}`] = value;
        }
      }

      // Apply changes to compliance if provided
      if (changes.compliance) {
        for (const [key, value] of Object.entries(changes.compliance)) {
          updateData[`compliance.${key}`] = value;
        }
      }

      // Apply changes to documents if provided
      if (changes.documents) {
        for (const [key, value] of Object.entries(changes.documents)) {
          updateData[`documents.${key}`] = value;
        }
      }

      // Log the change for learning purposes
      updateData["human_review.changes_made"] =
        admin.firestore.FieldValue.arrayUnion({
          changed_by: context.auth.uid,
          changed_at: new Date(),
          fields: Object.keys(changes),
        });

      // If design was AI-complete, move to human_review
      const current = designSnap.data()!;
      if (current.status === "ai_complete") {
        updateData.status = "human_review";
      }

      await designRef.update(updateData);

      console.log(
        `Design ${designId} updated by ${context.auth.uid}: ${Object.keys(changes).join(", ")}`,
      );

      return { success: true, designId };
    } catch (error: any) {
      console.error(`Update design error (${designId}):`, error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to update design",
      );
    }
  });

// ─── Cloud Function: approveDesign ──────────────────────────────────────────────

/**
 * Mark a design as approved. This finalizes the design and automatically
 * creates a permit record so the project can move to the permitting phase.
 *
 * @function approveDesign
 * @type onCall
 * @auth firebase
 * @input {{ designId: string }}
 * @output {{ success: boolean, designId: string }}
 */
export const approveDesign = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to approve designs",
      );
    }

    const { designId } = data;
    if (!designId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "designId is required",
      );
    }

    const db = admin.firestore();
    const designRef = db.collection("cad_designs").doc(designId);
    const designSnap = await designRef.get();

    if (!designSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Design not found: ${designId}`,
      );
    }

    const design = designSnap.data()!;

    if (design.status === "approved") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Design is already approved",
      );
    }

    try {
      await designRef.update({
        status: "approved",
        "human_review.reviewer_id": context.auth.uid,
        "human_review.reviewed_at":
          admin.firestore.FieldValue.serverTimestamp(),
        "human_review.approved": true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Design ${designId} approved by ${context.auth.uid}`);

      return { success: true, designId };
    } catch (error: any) {
      console.error(`Approve design error (${designId}):`, error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to approve design",
      );
    }
  });

// ─── Cloud Function: calculateSystemSize ────────────────────────────────────────

/**
 * Pure calculation function that determines optimal solar system size.
 * No side effects — just math. Used by the CAD generation handler and
 * available for ad-hoc sizing from the frontend.
 *
 * Algorithm:
 *   1. Calculate required kW from annual consumption: kW = annualKwh / (365 * sun_hours * efficiency)
 *   2. Adjust for shading losses
 *   3. Check NEC 120% rule: system can't produce > 120% of annual consumption
 *   4. Calculate panel count from standard 400W panel
 *   5. Verify panels fit in available roof area (~18 sqft per panel)
 *   6. Determine inverter size (typically 1:1 DC/AC ratio, +-10%)
 *
 * @function calculateSystemSize
 * @type onCall
 * @auth firebase
 * @input {{ annualKwh: number, usableRoofSqft: number, shadingLoss?: number, sunHours?: number }}
 * @output {{ success: boolean, system: { total_kw, panel_count, panels_fit_roof, nec_120_compliant, recommended_inverter_kw, estimated_annual_kwh, offset_percentage } }}
 */
export const calculateSystemSize = functions
  .runWith({ timeoutSeconds: 10, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to calculate system size",
      );
    }

    const { annualKwh, usableRoofSqft, shadingLoss, sunHours } = data;

    if (!annualKwh || !usableRoofSqft) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "annualKwh and usableRoofSqft are required",
      );
    }

    // ── Constants ──
    const PANEL_WATTS = 400; // Standard modern residential panel
    const SQFT_PER_PANEL = 18; // ~3x6 ft panel footprint with spacing
    const SYSTEM_EFFICIENCY = 0.82; // Typical system losses (wiring, inverter, soiling)
    const DEFAULT_SUN_HOURS = 5.0; // National average peak sun hours
    const DEFAULT_SHADING_LOSS = 0.05; // 5% default shading loss

    const effectiveSunHours = sunHours || DEFAULT_SUN_HOURS;
    const effectiveShadingLoss = shadingLoss || DEFAULT_SHADING_LOSS;

    // ── Step 1: Calculate required kW from annual consumption ──
    // annualKwh = kW * 365 * sunHours * efficiency * (1 - shadingLoss)
    const dailyProduction =
      effectiveSunHours * SYSTEM_EFFICIENCY * (1 - effectiveShadingLoss);
    const annualProductionPerKw = dailyProduction * 365;
    const requiredKw = annualKwh / annualProductionPerKw;

    // ── Step 2: NEC 120% rule check ──
    // System can't be designed to produce more than 120% of annual consumption
    const nec120MaxKw = (annualKwh * 1.2) / annualProductionPerKw;
    const clampedKw = Math.min(requiredKw, nec120MaxKw);

    // ── Step 3: Calculate panel count ──
    const panelCount = Math.ceil((clampedKw * 1000) / PANEL_WATTS);

    // ── Step 4: Verify roof space ──
    const maxPanelsOnRoof = Math.floor(usableRoofSqft / SQFT_PER_PANEL);
    const actualPanelCount = Math.min(panelCount, maxPanelsOnRoof);
    const panelsFitRoof = panelCount <= maxPanelsOnRoof;

    // ── Step 5: Final system size ──
    const totalKw =
      Math.round(((actualPanelCount * PANEL_WATTS) / 1000) * 100) / 100;
    const estimatedAnnualKwh = Math.round(totalKw * annualProductionPerKw);
    const offsetPercentage = Math.min(
      Math.round((estimatedAnnualKwh / annualKwh) * 100),
      120,
    );

    // ── Step 6: Inverter sizing ──
    // DC:AC ratio of ~1.15 is typical (slightly oversized DC)
    const recommendedInverterKw = Math.round((totalKw / 1.15) * 100) / 100;

    const nec120Compliant = totalKw <= nec120MaxKw;

    return {
      success: true,
      system: {
        total_kw: totalKw,
        panel_count: actualPanelCount,
        panel_watts: PANEL_WATTS,
        panels_fit_roof: panelsFitRoof,
        max_panels_on_roof: maxPanelsOnRoof,
        nec_120_compliant: nec120Compliant,
        nec_120_max_kw: Math.round(nec120MaxKw * 100) / 100,
        recommended_inverter_kw: recommendedInverterKw,
        estimated_annual_kwh: estimatedAnnualKwh,
        offset_percentage: offsetPercentage,
        assumptions: {
          sun_hours: effectiveSunHours,
          shading_loss: effectiveShadingLoss,
          system_efficiency: SYSTEM_EFFICIENCY,
          sqft_per_panel: SQFT_PER_PANEL,
        },
      },
    };
  });
