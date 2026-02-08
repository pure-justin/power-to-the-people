"use strict";
/**
 * Permit Lifecycle Management - Cloud Functions
 *
 * Manages the full permit lifecycle from creation through approval:
 *   1. Permit created for a project (solar, electrical, building, HOA)
 *   2. AI task engine attempts automated submission
 *   3. Status tracked through review, corrections, and approval
 *   4. Scheduled checks poll for status updates
 *
 * Every status change is recorded in a timeline for full audit trail.
 * Corrections from AHJs are tracked individually with resolution status.
 *
 * Collections:
 *   permits — Permit records with full lifecycle tracking
 *
 * @module permitService
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
exports.checkPermitStatuses = exports.resolveCorrection = exports.addPermitCorrection = exports.getPermitsByProject = exports.getPermit = exports.updatePermitStatus = exports.submitPermit = exports.createPermit = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
/** All valid permit types for input validation */
const VALID_PERMIT_TYPES = [
    "solar",
    "electrical",
    "building",
    "hoa",
];
/** All valid permit statuses for input validation */
const VALID_STATUSES = [
    "preparing",
    "submitting",
    "submitted",
    "under_review",
    "corrections_needed",
    "approved",
    "denied",
    "expired",
];
// ─── Helper: Add Timeline Entry ─────────────────────────────────────────────────
/**
 * Append a timeline entry to a permit's timeline array.
 * Every status change gets recorded here for full audit trail.
 */
function buildTimelineEntry(status, actor, notes) {
    return {
        status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actor,
        notes,
    };
}
// ─── Cloud Function: createPermit ───────────────────────────────────────────────
/**
 * Create a new permit record for a project. Initializes in "preparing" status
 * with an empty timeline entry. The permit is linked to both a project and an AHJ
 * (Authority Having Jurisdiction) so the system knows where to submit.
 *
 * @function createPermit
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string, ahjId: string, type: PermitType }}
 * @output {{ success: boolean, permitId: string }}
 */
exports.createPermit = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to create permits");
    }
    const { projectId, ahjId, type } = data;
    if (!projectId || !ahjId || !type) {
        throw new functions.https.HttpsError("invalid-argument", "projectId, ahjId, and type are required");
    }
    if (!VALID_PERMIT_TYPES.includes(type)) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid permit type: "${type}". Must be one of: ${VALID_PERMIT_TYPES.join(", ")}`);
    }
    const db = admin.firestore();
    try {
        const permitData = {
            projectId,
            ahjId,
            type,
            status: "preparing",
            submission: {
                method: null,
                submitted_at: null,
                submitted_by: null,
                confirmation_number: null,
                portal_reference: null,
                documents_submitted: [],
            },
            review: {
                reviewer_name: null,
                comments: [],
                corrections_requested: [],
            },
            approval: {
                approved_at: null,
                permit_number: null,
                valid_until: null,
                conditions: [],
                inspection_required: false,
            },
            fees: {
                amount: 0,
                paid: false,
                paid_at: null,
                payment_method: null,
                receipt_url: null,
            },
            timeline: [
                {
                    status: "preparing",
                    timestamp: new Date(),
                    actor: "human",
                    notes: `Permit created by user ${context.auth.uid}`,
                },
            ],
            ai_attempts: [],
            createdBy: context.auth.uid,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
        const permitRef = await db.collection("permits").add(permitData);
        console.log(`Permit created: ${permitRef.id} (type=${type}, project=${projectId}, ahj=${ahjId})`);
        return {
            success: true,
            permitId: permitRef.id,
        };
    }
    catch (error) {
        console.error("Create permit error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to create permit");
    }
});
// ─── Cloud Function: submitPermit ───────────────────────────────────────────────
/**
 * Initiate permit submission by creating an AI task of type "permit_submit".
 * The AI task engine will attempt automated submission via the AHJ's portal,
 * or escalate to a human operator if it can't handle the jurisdiction.
 *
 * @function submitPermit
 * @type onCall
 * @auth firebase
 * @input {{ permitId: string }}
 * @output {{ success: boolean, permitId: string, aiTaskId: string }}
 */
exports.submitPermit = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to submit permits");
    }
    const { permitId } = data;
    if (!permitId) {
        throw new functions.https.HttpsError("invalid-argument", "permitId is required");
    }
    const db = admin.firestore();
    const permitRef = db.collection("permits").doc(permitId);
    const permitSnap = await permitRef.get();
    if (!permitSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Permit not found: ${permitId}`);
    }
    const permit = permitSnap.data();
    if (permit.status !== "preparing" &&
        permit.status !== "corrections_needed") {
        throw new functions.https.HttpsError("failed-precondition", `Permit is in status "${permit.status}" and cannot be submitted. Only "preparing" or "corrections_needed" permits can be submitted.`);
    }
    try {
        // Update permit status to submitting
        await permitRef.update({
            status: "submitting",
            timeline: admin.firestore.FieldValue.arrayUnion(buildTimelineEntry("submitting", "human", `Submission initiated by user ${context.auth.uid}`)),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Create an AI task for the submission — the AI task engine handles
        // whether this gets done by AI or routed to a human
        const aiTaskData = {
            type: "permit_submit",
            projectId: permit.projectId,
            status: "pending",
            input: {
                permitId,
                ahjId: permit.ahjId,
                permitType: permit.type,
                context: {
                    jurisdiction: permit.ahjId,
                },
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
        };
        const aiTaskRef = await db.collection("ai_tasks").add(aiTaskData);
        console.log(`Permit ${permitId} submission initiated — AI task: ${aiTaskRef.id}`);
        return {
            success: true,
            permitId,
            aiTaskId: aiTaskRef.id,
        };
    }
    catch (error) {
        console.error(`Submit permit error (${permitId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to submit permit");
    }
});
// ─── Cloud Function: updatePermitStatus ─────────────────────────────────────────
/**
 * Update a permit's status with a new timeline entry. Used by operators,
 * AI handlers, and AHJ notification processors to advance the permit lifecycle.
 *
 * @function updatePermitStatus
 * @type onCall
 * @auth firebase
 * @input {{ permitId: string, status: PermitStatus, details?: { actor?: string, notes?: string, reviewer_name?: string, permit_number?: string, valid_until?: string, conditions?: string[], inspection_required?: boolean } }}
 * @output {{ success: boolean, permitId: string, status: PermitStatus }}
 */
exports.updatePermitStatus = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to update permit status");
    }
    const { permitId, status, details } = data;
    if (!permitId || !status) {
        throw new functions.https.HttpsError("invalid-argument", "permitId and status are required");
    }
    if (!VALID_STATUSES.includes(status)) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid status: "${status}". Must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    const db = admin.firestore();
    const permitRef = db.collection("permits").doc(permitId);
    const permitSnap = await permitRef.get();
    if (!permitSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Permit not found: ${permitId}`);
    }
    try {
        const actor = (details === null || details === void 0 ? void 0 : details.actor) || "human";
        const notes = (details === null || details === void 0 ? void 0 : details.notes) || `Status updated to ${status}`;
        const updateData = {
            status,
            timeline: admin.firestore.FieldValue.arrayUnion(buildTimelineEntry(status, actor, notes)),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
        // If approved, populate approval fields
        if (status === "approved") {
            if (details === null || details === void 0 ? void 0 : details.permit_number) {
                updateData["approval.permit_number"] = details.permit_number;
            }
            if (details === null || details === void 0 ? void 0 : details.valid_until) {
                updateData["approval.valid_until"] = details.valid_until;
            }
            if (details === null || details === void 0 ? void 0 : details.conditions) {
                updateData["approval.conditions"] = details.conditions;
            }
            if ((details === null || details === void 0 ? void 0 : details.inspection_required) !== undefined) {
                updateData["approval.inspection_required"] =
                    details.inspection_required;
            }
            updateData["approval.approved_at"] =
                admin.firestore.FieldValue.serverTimestamp();
        }
        // If under review, capture reviewer name
        if (status === "under_review" && (details === null || details === void 0 ? void 0 : details.reviewer_name)) {
            updateData["review.reviewer_name"] = details.reviewer_name;
        }
        await permitRef.update(updateData);
        console.log(`Permit ${permitId} status updated: ${status}`);
        return {
            success: true,
            permitId,
            status,
        };
    }
    catch (error) {
        console.error(`Update permit status error (${permitId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to update permit status");
    }
});
// ─── Cloud Function: getPermit ──────────────────────────────────────────────────
/**
 * Get a single permit with full timeline, corrections, and approval details.
 *
 * @function getPermit
 * @type onCall
 * @auth firebase
 * @input {{ permitId: string }}
 * @output {{ success: boolean, permit: object }}
 */
exports.getPermit = functions
    .runWith({ timeoutSeconds: 10, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to view permits");
    }
    const { permitId } = data;
    if (!permitId) {
        throw new functions.https.HttpsError("invalid-argument", "permitId is required");
    }
    const db = admin.firestore();
    const permitSnap = await db.collection("permits").doc(permitId).get();
    if (!permitSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Permit not found: ${permitId}`);
    }
    return {
        success: true,
        permit: { id: permitSnap.id, ...permitSnap.data() },
    };
});
// ─── Cloud Function: getPermitsByProject ────────────────────────────────────────
/**
 * Get all permits for a project, ordered by creation date (newest first).
 *
 * @function getPermitsByProject
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string }}
 * @output {{ success: boolean, permits: Array<object> }}
 */
exports.getPermitsByProject = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to view permits");
    }
    const { projectId } = data;
    if (!projectId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId is required");
    }
    const db = admin.firestore();
    const snapshot = await db
        .collection("permits")
        .where("projectId", "==", projectId)
        .orderBy("created_at", "desc")
        .limit(50)
        .get();
    const permits = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    return { success: true, permits };
});
// ─── Cloud Function: addPermitCorrection ────────────────────────────────────────
/**
 * Log a correction request from an AHJ. Corrections are individual items
 * that need to be addressed before the permit can be approved. Each correction
 * has its own resolution tracking.
 *
 * @function addPermitCorrection
 * @type onCall
 * @auth firebase
 * @input {{ permitId: string, correction: { item: string, description: string } }}
 * @output {{ success: boolean, permitId: string, correctionId: string }}
 */
exports.addPermitCorrection = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to add corrections");
    }
    const { permitId, correction } = data;
    if (!permitId || !(correction === null || correction === void 0 ? void 0 : correction.item) || !(correction === null || correction === void 0 ? void 0 : correction.description)) {
        throw new functions.https.HttpsError("invalid-argument", "permitId, correction.item, and correction.description are required");
    }
    const db = admin.firestore();
    const permitRef = db.collection("permits").doc(permitId);
    const permitSnap = await permitRef.get();
    if (!permitSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Permit not found: ${permitId}`);
    }
    try {
        const correctionId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const correctionEntry = {
            id: correctionId,
            item: correction.item,
            description: correction.description,
            resolved: false,
            resolved_by: null,
            resolved_at: null,
            created_at: new Date(),
        };
        await permitRef.update({
            status: "corrections_needed",
            "review.corrections_requested": admin.firestore.FieldValue.arrayUnion(correctionEntry),
            timeline: admin.firestore.FieldValue.arrayUnion(buildTimelineEntry("corrections_needed", "ahj", `Correction requested: ${correction.item}`)),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Correction added to permit ${permitId}: ${correctionId} — ${correction.item}`);
        return {
            success: true,
            permitId,
            correctionId,
        };
    }
    catch (error) {
        console.error(`Add correction error (${permitId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to add correction");
    }
});
// ─── Cloud Function: resolveCorrection ──────────────────────────────────────────
/**
 * Mark a correction as resolved. When all corrections on a permit are resolved,
 * the permit can be resubmitted.
 *
 * @function resolveCorrection
 * @type onCall
 * @auth firebase
 * @input {{ permitId: string, correctionId: string, resolution: string }}
 * @output {{ success: boolean, permitId: string, allResolved: boolean }}
 */
exports.resolveCorrection = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to resolve corrections");
    }
    const { permitId, correctionId, resolution } = data;
    if (!permitId || !correctionId || !resolution) {
        throw new functions.https.HttpsError("invalid-argument", "permitId, correctionId, and resolution are required");
    }
    const db = admin.firestore();
    const permitRef = db.collection("permits").doc(permitId);
    const permitSnap = await permitRef.get();
    if (!permitSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Permit not found: ${permitId}`);
    }
    try {
        const permit = permitSnap.data();
        const corrections = ((_a = permit.review) === null || _a === void 0 ? void 0 : _a.corrections_requested) || [];
        // Find and update the specific correction
        const updatedCorrections = corrections.map((c) => {
            if (c.id === correctionId) {
                return {
                    ...c,
                    resolved: true,
                    resolved_by: context.auth.uid,
                    resolved_at: new Date(),
                    resolution,
                };
            }
            return c;
        });
        const allResolved = updatedCorrections.every((c) => c.resolved === true);
        await permitRef.update({
            "review.corrections_requested": updatedCorrections,
            timeline: admin.firestore.FieldValue.arrayUnion(buildTimelineEntry("corrections_needed", "human", `Correction resolved: ${correctionId} — ${resolution}`)),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Correction ${correctionId} resolved on permit ${permitId}. All resolved: ${allResolved}`);
        return {
            success: true,
            permitId,
            allResolved,
        };
    }
    catch (error) {
        console.error(`Resolve correction error (${permitId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to resolve correction");
    }
});
// ─── Scheduled Function: checkPermitStatuses ────────────────────────────────────
/**
 * Scheduled function that runs every 4 hours to check on permits that are
 * "submitted" or "under_review". Creates an AI task of type "permit_check"
 * for each, which will attempt to scrape the AHJ portal for status updates.
 *
 * @function checkPermitStatuses
 * @type pubsub schedule
 * @schedule every 4 hours
 * @auth none (system)
 * @firestore permits, ai_tasks
 */
exports.checkPermitStatuses = functions
    .runWith({ timeoutSeconds: 120, memory: "512MB" })
    .pubsub.schedule("every 4 hours")
    .onRun(async () => {
    const db = admin.firestore();
    try {
        // Find all permits in "submitted" or "under_review" status
        const submittedSnap = await db
            .collection("permits")
            .where("status", "in", ["submitted", "under_review"])
            .limit(100)
            .get();
        if (submittedSnap.empty) {
            console.log("checkPermitStatuses: No permits to check");
            return null;
        }
        console.log(`checkPermitStatuses: Found ${submittedSnap.size} permits to check`);
        // Create an AI task for each permit that needs checking
        const batch = db.batch();
        let taskCount = 0;
        for (const permitDoc of submittedSnap.docs) {
            const permit = permitDoc.data();
            const aiTaskRef = db.collection("ai_tasks").doc();
            batch.set(aiTaskRef, {
                type: "permit_check",
                projectId: permit.projectId,
                status: "pending",
                input: {
                    permitId: permitDoc.id,
                    ahjId: permit.ahjId,
                    permitType: permit.type,
                    currentStatus: permit.status,
                    context: {
                        jurisdiction: permit.ahjId,
                    },
                },
                output: null,
                aiAttempt: null,
                humanFallback: null,
                learningData: null,
                retryCount: 0,
                maxRetries: 3,
                priority: 4,
                createdBy: "system",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            taskCount++;
        }
        await batch.commit();
        console.log(`checkPermitStatuses: Created ${taskCount} permit_check AI tasks`);
        return null;
    }
    catch (error) {
        console.error("checkPermitStatuses error:", error);
        return null;
    }
});
//# sourceMappingURL=permitService.js.map