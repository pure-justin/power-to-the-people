"use strict";
/**
 * Site Survey Service - Cloud Functions
 *
 * Manages the full site survey lifecycle for solar installations.
 * Surveys collect property details, roof measurements, electrical panel info,
 * shading analysis, utility data, and photos needed for system design.
 *
 * Survey workflow:
 *   draft → in_progress → submitted → ai_review → approved | revision_needed
 *
 * When a survey is submitted, an AI task is created in the ai_tasks collection
 * to automatically analyze photos, validate measurements, and flag issues
 * before human review.
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
exports.addSurveyPhoto = exports.reviewSurvey = exports.getSurveysByProject = exports.getSurvey = exports.submitSurvey = exports.updateSurvey = exports.createSurvey = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Valid survey statuses representing lifecycle stages.
 * - draft: Initial creation, no data yet
 * - in_progress: Customer/installer actively filling out
 * - submitted: All required data provided, awaiting review
 * - ai_review: AI is analyzing photos and measurements
 * - approved: Survey passes review, ready for design
 * - revision_needed: Issues found, needs corrections
 */
const VALID_STATUSES = [
    "draft",
    "in_progress",
    "submitted",
    "ai_review",
    "approved",
    "revision_needed",
];
/**
 * Valid survey sections that can be independently updated.
 * Each section corresponds to a step in the survey wizard.
 */
const VALID_SECTIONS = [
    "property",
    "roof_measurements",
    "electrical",
    "shading",
    "utility",
];
/**
 * Valid photo types for site survey documentation.
 * Each type serves a specific purpose in the AI analysis pipeline.
 */
const VALID_PHOTO_TYPES = [
    "roof_overview",
    "electrical_panel",
    "meter",
    "obstruction",
    "attic",
    "mounting_area",
];
/**
 * Required fields that must be present before a survey can be submitted.
 * Organized by section — at minimum, property address and basic electrical
 * info are needed for any design to proceed.
 */
const REQUIRED_FIELDS = {
    property: ["address", "roof_type", "stories"],
    electrical: ["panel_amps", "main_breaker_amps"],
};
/**
 * createSurvey - Initialize a new site survey for a project
 *
 * Creates a survey document in the site_surveys collection with "draft" status.
 * Links the survey to both a project and customer for tracking.
 *
 * @param {string} data.projectId - The project this survey belongs to
 * @param {string} data.customerId - The customer who owns the property
 * @returns {{ surveyId: string }} The ID of the created survey
 * @throws {HttpsError} unauthenticated - If caller is not signed in
 * @throws {HttpsError} invalid-argument - If projectId or customerId missing
 */
exports.createSurvey = functions.https.onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in to create a survey");
    }
    const { projectId, customerId } = data;
    if (!projectId || !customerId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId and customerId are required");
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    const surveyData = {
        projectId,
        customerId,
        createdBy: context.auth.uid,
        status: "draft",
        property: {},
        roof_measurements: {},
        electrical: {},
        shading: {},
        utility: {},
        photos: [],
        ai_review: null,
        created_at: now,
        updated_at: now,
        submitted_at: null,
    };
    const docRef = await db.collection("site_surveys").add(surveyData);
    functions.logger.info("Survey created", {
        surveyId: docRef.id,
        projectId,
        customerId,
        createdBy: context.auth.uid,
    });
    return { surveyId: docRef.id };
});
/**
 * updateSurvey - Partial update of survey sections
 *
 * Allows updating individual sections (property, roof_measurements, electrical,
 * shading, utility) without overwriting other sections. Uses Firestore merge
 * semantics so only provided fields within a section are updated.
 *
 * Automatically transitions status from "draft" to "in_progress" on first update.
 * Also handles transition from "revision_needed" back to "in_progress" when
 * the customer makes corrections.
 *
 * @param {string} data.surveyId - The survey to update
 * @param {object} data.sectionData - Object keyed by section name with field values
 * @returns {{ surveyId: string, updatedSections: string[] }}
 * @throws {HttpsError} unauthenticated - If caller is not signed in
 * @throws {HttpsError} invalid-argument - If surveyId missing or invalid sections
 * @throws {HttpsError} not-found - If survey does not exist
 * @throws {HttpsError} failed-precondition - If survey is in non-editable status
 */
exports.updateSurvey = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { surveyId, sectionData } = data;
    if (!surveyId || !sectionData) {
        throw new functions.https.HttpsError("invalid-argument", "surveyId and sectionData are required");
    }
    // Validate section names
    const sections = Object.keys(sectionData);
    for (const section of sections) {
        if (!VALID_SECTIONS.includes(section)) {
            throw new functions.https.HttpsError("invalid-argument", `Invalid section: ${section}. Valid sections: ${VALID_SECTIONS.join(", ")}`);
        }
    }
    const surveyRef = db.collection("site_surveys").doc(surveyId);
    const surveySnap = await surveyRef.get();
    if (!surveySnap.exists) {
        throw new functions.https.HttpsError("not-found", "Survey not found");
    }
    const currentData = surveySnap.data();
    const editableStatuses = [
        "draft",
        "in_progress",
        "revision_needed",
    ];
    if (!editableStatuses.includes(currentData.status)) {
        throw new functions.https.HttpsError("failed-precondition", `Cannot edit survey in "${currentData.status}" status. Editable statuses: ${editableStatuses.join(", ")}`);
    }
    // Build the update object using dot notation to merge section fields
    // without overwriting the entire section
    const updateObj = {
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    for (const section of sections) {
        const sectionFields = sectionData[section];
        if (typeof sectionFields === "object" && sectionFields !== null) {
            for (const [key, value] of Object.entries(sectionFields)) {
                updateObj[`${section}.${key}`] = value;
            }
        }
    }
    // Auto-transition from draft to in_progress on first update
    if (currentData.status === "draft" ||
        currentData.status === "revision_needed") {
        updateObj.status = "in_progress";
    }
    await surveyRef.update(updateObj);
    functions.logger.info("Survey updated", {
        surveyId,
        sections,
        updatedBy: context.auth.uid,
    });
    return { surveyId, updatedSections: sections };
});
/**
 * submitSurvey - Submit a completed survey for review
 *
 * Validates that all required fields are present, then transitions the survey
 * to "submitted" status and creates an AI task in the ai_tasks collection
 * for automated analysis of photos and measurements.
 *
 * Required fields (minimum for design):
 * - property: address, roof_type, stories
 * - electrical: panel_amps, main_breaker_amps
 *
 * @param {string} data.surveyId - The survey to submit
 * @returns {{ surveyId: string, status: string, aiTaskId: string }}
 * @throws {HttpsError} unauthenticated - If caller is not signed in
 * @throws {HttpsError} not-found - If survey does not exist
 * @throws {HttpsError} failed-precondition - If survey not in submittable status
 * @throws {HttpsError} invalid-argument - If required fields are missing
 */
exports.submitSurvey = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { surveyId } = data;
    if (!surveyId) {
        throw new functions.https.HttpsError("invalid-argument", "surveyId is required");
    }
    const surveyRef = db.collection("site_surveys").doc(surveyId);
    const surveySnap = await surveyRef.get();
    if (!surveySnap.exists) {
        throw new functions.https.HttpsError("not-found", "Survey not found");
    }
    const surveyData = surveySnap.data();
    // Only allow submission from in_progress status
    if (surveyData.status !== "in_progress" && surveyData.status !== "draft") {
        throw new functions.https.HttpsError("failed-precondition", `Cannot submit survey in "${surveyData.status}" status. Must be "in_progress" or "draft".`);
    }
    // Validate required fields are present
    const missingFields = [];
    for (const [section, fields] of Object.entries(REQUIRED_FIELDS)) {
        const sectionData = surveyData[section] || {};
        for (const field of fields) {
            if (sectionData[field] === undefined ||
                sectionData[field] === null ||
                sectionData[field] === "") {
                missingFields.push(`${section}.${field}`);
            }
        }
    }
    if (missingFields.length > 0) {
        throw new functions.https.HttpsError("invalid-argument", `Missing required fields: ${missingFields.join(", ")}`);
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    // Create AI task for automated survey analysis
    const aiTaskRef = await db.collection("ai_tasks").add({
        type: "survey_process",
        projectId: surveyData.projectId,
        status: "pending",
        priority: 2,
        input: {
            surveyId,
            photoCount: (surveyData.photos || []).length,
            sections: Object.keys(surveyData).filter((k) => VALID_SECTIONS.includes(k) &&
                Object.keys(surveyData[k] || {}).length > 0),
        },
        output: null,
        aiAttempt: null,
        humanFallback: null,
        learningData: null,
        retryCount: 0,
        maxRetries: 3,
        createdBy: context.auth.uid,
        createdAt: now,
        updatedAt: now,
    });
    // Update survey status to submitted
    await surveyRef.update({
        status: "submitted",
        submitted_at: now,
        updated_at: now,
    });
    functions.logger.info("Survey submitted", {
        surveyId,
        aiTaskId: aiTaskRef.id,
        missingOptional: VALID_SECTIONS.filter((s) => Object.keys(surveyData[s] || {}).length === 0),
    });
    return {
        surveyId,
        status: "submitted",
        aiTaskId: aiTaskRef.id,
    };
});
/**
 * getSurvey - Retrieve full survey data by ID
 *
 * Returns the complete survey document including all sections, photos,
 * and AI review results. Used by both customer portal and installer dashboard.
 *
 * @param {string} data.surveyId - The survey to retrieve
 * @returns {{ survey: object }} The complete survey document with ID
 * @throws {HttpsError} unauthenticated - If caller is not signed in
 * @throws {HttpsError} not-found - If survey does not exist
 */
exports.getSurvey = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { surveyId } = data;
    if (!surveyId) {
        throw new functions.https.HttpsError("invalid-argument", "surveyId is required");
    }
    const surveySnap = await db.collection("site_surveys").doc(surveyId).get();
    if (!surveySnap.exists) {
        throw new functions.https.HttpsError("not-found", "Survey not found");
    }
    return { survey: { id: surveySnap.id, ...surveySnap.data() } };
});
/**
 * getSurveysByProject - List all surveys for a given project
 *
 * Returns surveys ordered by creation date (newest first).
 * Typically a project has one survey, but revisions may create additional ones.
 *
 * @param {string} data.projectId - The project to list surveys for
 * @returns {{ surveys: object[] }} Array of survey documents
 * @throws {HttpsError} unauthenticated - If caller is not signed in
 * @throws {HttpsError} invalid-argument - If projectId missing
 */
exports.getSurveysByProject = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { projectId } = data;
    if (!projectId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId is required");
    }
    const surveysSnap = await db
        .collection("site_surveys")
        .where("projectId", "==", projectId)
        .orderBy("created_at", "desc")
        .get();
    const surveys = surveysSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    return { surveys };
});
/**
 * reviewSurvey - Apply AI or human review results to a survey
 *
 * Updates the survey's ai_review field and transitions status to either
 * "approved" (ready for design) or "revision_needed" (issues to fix).
 *
 * When approved, the survey data feeds into the CAD design pipeline.
 * When revision is needed, the customer/installer gets notified of issues.
 *
 * @param {string} data.surveyId - The survey being reviewed
 * @param {object} data.reviewResult - Review outcome
 * @param {boolean} data.reviewResult.design_ready - Whether survey is complete enough for design
 * @param {string[]} data.reviewResult.issues - List of issues found
 * @param {string[]} data.reviewResult.recommendations - Suggestions for improvement
 * @param {number} data.reviewResult.confidence - AI confidence score 0-1
 * @returns {{ surveyId: string, status: string }}
 * @throws {HttpsError} unauthenticated - If caller is not signed in
 * @throws {HttpsError} not-found - If survey does not exist
 */
exports.reviewSurvey = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { surveyId, reviewResult } = data;
    if (!surveyId || !reviewResult) {
        throw new functions.https.HttpsError("invalid-argument", "surveyId and reviewResult are required");
    }
    const surveyRef = db.collection("site_surveys").doc(surveyId);
    const surveySnap = await surveyRef.get();
    if (!surveySnap.exists) {
        throw new functions.https.HttpsError("not-found", "Survey not found");
    }
    const newStatus = reviewResult.design_ready
        ? "approved"
        : "revision_needed";
    const now = admin.firestore.FieldValue.serverTimestamp();
    await surveyRef.update({
        status: newStatus,
        ai_review: {
            design_ready: reviewResult.design_ready || false,
            issues: reviewResult.issues || [],
            recommendations: reviewResult.recommendations || [],
            confidence: reviewResult.confidence || 0,
            reviewed_at: now,
            reviewed_by: context.auth.uid,
        },
        updated_at: now,
    });
    functions.logger.info("Survey reviewed", {
        surveyId,
        status: newStatus,
        issueCount: (reviewResult.issues || []).length,
        reviewedBy: context.auth.uid,
    });
    return { surveyId, status: newStatus };
});
/**
 * addSurveyPhoto - Add a photo entry to a survey
 *
 * Appends a photo object to the survey's photos array. Photos are uploaded
 * to Firebase Storage separately — this function records the metadata
 * (URL, type, timestamp) and sets AI analysis status to "pending".
 *
 * The AI task engine will pick up pending photos for automated analysis
 * (e.g., detecting panel condition from electrical photos, measuring
 * roof area from aerial shots, identifying obstructions).
 *
 * @param {string} data.surveyId - The survey to add the photo to
 * @param {object} data.photoData - Photo metadata
 * @param {string} data.photoData.type - Photo category (roof_overview, electrical_panel, etc.)
 * @param {string} data.photoData.url - Firebase Storage download URL
 * @returns {{ surveyId: string, photoId: string }}
 * @throws {HttpsError} unauthenticated - If caller is not signed in
 * @throws {HttpsError} invalid-argument - If required photo fields missing
 * @throws {HttpsError} not-found - If survey does not exist
 */
exports.addSurveyPhoto = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { surveyId, photoData } = data;
    if (!surveyId || !photoData) {
        throw new functions.https.HttpsError("invalid-argument", "surveyId and photoData are required");
    }
    if (!photoData.type || !photoData.url) {
        throw new functions.https.HttpsError("invalid-argument", "photoData must include type and url");
    }
    if (!VALID_PHOTO_TYPES.includes(photoData.type)) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid photo type: ${photoData.type}. Valid types: ${VALID_PHOTO_TYPES.join(", ")}`);
    }
    const surveyRef = db.collection("site_surveys").doc(surveyId);
    const surveySnap = await surveyRef.get();
    if (!surveySnap.exists) {
        throw new functions.https.HttpsError("not-found", "Survey not found");
    }
    // Generate a unique photo ID
    const photoId = db.collection("_").doc().id;
    const photoEntry = {
        id: photoId,
        type: photoData.type,
        url: photoData.url,
        ai_analysis: {
            status: "pending",
            findings: [],
            measurements: {},
            confidence: 0,
        },
        uploaded_at: admin.firestore.FieldValue.serverTimestamp(),
        uploaded_by: context.auth.uid,
    };
    // Append photo to the photos array
    await surveyRef.update({
        photos: admin.firestore.FieldValue.arrayUnion(photoEntry),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    functions.logger.info("Photo added to survey", {
        surveyId,
        photoId,
        type: photoData.type,
        uploadedBy: context.auth.uid,
    });
    return { surveyId, photoId };
});
//# sourceMappingURL=surveyService.js.map