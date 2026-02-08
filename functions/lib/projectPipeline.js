"use strict";
/**
 * Project Pipeline - Cloud Functions
 *
 * Manages project lifecycle through solar installation pipeline stages.
 * Handles stage transitions, task management, and timeline tracking.
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
exports.getProjectTimeline = exports.completeProjectTask = exports.assignProjectTask = exports.createProjectTask = exports.advanceProjectStage = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// Valid pipeline stages in order
const PIPELINE_STAGES = [
    "lead",
    "qualified",
    "proposal",
    "sold",
    "survey",
    "design",
    "engineering",
    "permit_submitted",
    "permit_approved",
    "scheduled",
    "installing",
    "inspection",
    "pto_submitted",
    "pto_approved",
    "activated",
    "monitoring",
];
// Map stages to phases
const STAGE_TO_PHASE = {
    lead: "acquisition",
    qualified: "acquisition",
    proposal: "sales",
    sold: "sales",
    survey: "pre_construction",
    design: "pre_construction",
    engineering: "pre_construction",
    permit_submitted: "pre_construction",
    permit_approved: "pre_construction",
    scheduled: "construction",
    installing: "construction",
    inspection: "construction",
    pto_submitted: "activation",
    pto_approved: "activation",
    activated: "activation",
    monitoring: "activation",
};
// Valid task types
const TASK_TYPES = [
    "site_survey",
    "cad_design",
    "engineering_stamp",
    "permit_submission",
    "hoa_approval",
    "equipment_order",
    "installation",
    "inspection",
    "pto_submission",
];
/**
 * advanceProjectStage - Advance project to next or specified pipeline stage
 *
 * Validates transition is forward-only (or to "cancelled").
 * Updates project status, pipeline phase/step, and appends to timeline.
 */
exports.advanceProjectStage = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { projectId, targetStage, notes } = data;
    if (!projectId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId is required");
    }
    const projectRef = db.collection("projects").doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Project not found");
    }
    const project = projectSnap.data();
    const currentStatus = project.status || "lead";
    const currentIndex = PIPELINE_STAGES.indexOf(currentStatus);
    // Determine target
    let newStage;
    if (targetStage === "cancelled") {
        newStage = "cancelled";
    }
    else if (targetStage) {
        const targetIndex = PIPELINE_STAGES.indexOf(targetStage);
        if (targetIndex === -1) {
            throw new functions.https.HttpsError("invalid-argument", `Invalid stage: ${targetStage}`);
        }
        if (targetIndex <= currentIndex) {
            throw new functions.https.HttpsError("failed-precondition", `Cannot move backward from "${currentStatus}" to "${targetStage}"`);
        }
        newStage = targetStage;
    }
    else {
        // Default: advance to next stage
        if (currentIndex === -1 || currentIndex >= PIPELINE_STAGES.length - 1) {
            throw new functions.https.HttpsError("failed-precondition", `Cannot advance from "${currentStatus}"`);
        }
        newStage = PIPELINE_STAGES[currentIndex + 1];
    }
    const phase = newStage === "cancelled" ? "cancelled" : STAGE_TO_PHASE[newStage];
    const timelineEntry = {
        from: currentStatus,
        to: newStage,
        phase,
        notes: notes || "",
        changedBy: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    const updateData = {
        status: newStage,
        "pipeline.current_phase": phase,
        "pipeline.current_step": newStage,
        "pipeline.timeline": admin.firestore.FieldValue.arrayUnion(timelineEntry),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await projectRef.update(updateData);
    return {
        success: true,
        projectId,
        previousStage: currentStatus,
        newStage,
        phase,
    };
});
/**
 * createProjectTask - Create a task in the project's tasks subcollection
 */
exports.createProjectTask = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { projectId, type, description, assignment_method, budget_range, deadline, } = data;
    if (!projectId || !type || !description) {
        throw new functions.https.HttpsError("invalid-argument", "projectId, type, and description are required");
    }
    if (!TASK_TYPES.includes(type)) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid task type: ${type}. Valid types: ${TASK_TYPES.join(", ")}`);
    }
    // Verify project exists
    const projectSnap = await db.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Project not found");
    }
    const taskData = {
        type,
        description,
        status: "pending",
        assignment_method: assignment_method || "manual",
        budget_range: budget_range || null,
        deadline: deadline
            ? admin.firestore.Timestamp.fromDate(new Date(deadline))
            : null,
        assigned_to: null,
        created_by: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const taskRef = await db
        .collection("projects")
        .doc(projectId)
        .collection("tasks")
        .add(taskData);
    return {
        success: true,
        taskId: taskRef.id,
        projectId,
        type,
    };
});
/**
 * assignProjectTask - Assign a task to a user or organization
 */
exports.assignProjectTask = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { projectId, taskId, userId, orgId } = data;
    if (!projectId || !taskId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId and taskId are required");
    }
    if (!userId && !orgId) {
        throw new functions.https.HttpsError("invalid-argument", "Either userId or orgId is required");
    }
    const taskRef = db
        .collection("projects")
        .doc(projectId)
        .collection("tasks")
        .doc(taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Task not found");
    }
    await taskRef.update({
        status: "assigned",
        assigned_to: {
            userId: userId || null,
            orgId: orgId || null,
            assignedAt: admin.firestore.FieldValue.serverTimestamp(),
            assignedBy: context.auth.uid,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        projectId,
        taskId,
        assignedTo: userId || orgId,
    };
});
/**
 * completeProjectTask - Mark a task as completed
 */
exports.completeProjectTask = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { projectId, taskId, notes, rating } = data;
    if (!projectId || !taskId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId and taskId are required");
    }
    const taskRef = db
        .collection("projects")
        .doc(projectId)
        .collection("tasks")
        .doc(taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Task not found");
    }
    const updateData = {
        status: "completed",
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
        completed_by: context.auth.uid,
        completion_notes: notes || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (rating !== undefined && rating >= 1 && rating <= 5) {
        updateData.rating = rating;
    }
    await taskRef.update(updateData);
    return {
        success: true,
        projectId,
        taskId,
    };
});
/**
 * getProjectTimeline - Get the full pipeline timeline for a project
 */
exports.getProjectTimeline = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { projectId } = data;
    if (!projectId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId is required");
    }
    const projectSnap = await db.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Project not found");
    }
    const project = projectSnap.data();
    const timeline = ((_a = project.pipeline) === null || _a === void 0 ? void 0 : _a.timeline) || [];
    // Sort by timestamp descending (newest first)
    const sorted = [...timeline].sort((a, b) => {
        var _a, _b, _c, _d;
        const aTime = ((_b = (_a = a.timestamp) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a)) || 0;
        const bTime = ((_d = (_c = b.timestamp) === null || _c === void 0 ? void 0 : _c.toMillis) === null || _d === void 0 ? void 0 : _d.call(_c)) || 0;
        return bTime - aTime;
    });
    return {
        success: true,
        projectId,
        currentStage: project.status,
        currentPhase: ((_b = project.pipeline) === null || _b === void 0 ? void 0 : _b.current_phase) || null,
        timeline: sorted,
    };
});
//# sourceMappingURL=projectPipeline.js.map