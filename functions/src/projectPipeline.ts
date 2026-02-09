/**
 * Project Pipeline - Cloud Functions
 *
 * Manages project lifecycle through solar installation pipeline stages.
 * Handles stage transitions, task management, and timeline tracking.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {
  onPipelineTaskCompleted,
  createPipelineTasks,
  openNextTasks,
} from "./pipelineAutoTasks";

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
] as const;

type PipelineStage = (typeof PIPELINE_STAGES)[number] | "cancelled";

// Map stages to phases
const STAGE_TO_PHASE: Record<string, string> = {
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
] as const;

/**
 * advanceProjectStage - Advance project to next or specified pipeline stage
 *
 * Validates transition is forward-only (or to "cancelled").
 * Updates project status, pipeline phase/step, and appends to timeline.
 */
export const advanceProjectStage = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const { projectId, targetStage, notes } = data;

    if (!projectId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId is required",
      );
    }

    const projectRef = db.collection("projects").doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Project not found");
    }

    const project = projectSnap.data()!;
    const currentStatus = project.status || "lead";
    const currentIndex = PIPELINE_STAGES.indexOf(
      currentStatus as (typeof PIPELINE_STAGES)[number],
    );

    // Determine target
    let newStage: PipelineStage;

    if (targetStage === "cancelled") {
      newStage = "cancelled";
    } else if (targetStage) {
      const targetIndex = PIPELINE_STAGES.indexOf(
        targetStage as (typeof PIPELINE_STAGES)[number],
      );
      if (targetIndex === -1) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid stage: ${targetStage}`,
        );
      }
      if (targetIndex <= currentIndex) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Cannot move backward from "${currentStatus}" to "${targetStage}"`,
        );
      }
      newStage = targetStage as PipelineStage;
    } else {
      // Default: advance to next stage
      if (currentIndex === -1 || currentIndex >= PIPELINE_STAGES.length - 1) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Cannot advance from "${currentStatus}"`,
        );
      }
      newStage = PIPELINE_STAGES[currentIndex + 1];
    }

    const phase =
      newStage === "cancelled" ? "cancelled" : STAGE_TO_PHASE[newStage];

    const timelineEntry = {
      from: currentStatus,
      to: newStage,
      phase,
      notes: notes || "",
      changedBy: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const updateData: Record<string, unknown> = {
      status: newStage,
      "pipeline.current_phase": phase,
      "pipeline.current_step": newStage,
      "pipeline.timeline": admin.firestore.FieldValue.arrayUnion(timelineEntry),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await projectRef.update(updateData);

    // When project reaches "sold", create pipeline tasks and open the first ones
    if (newStage === "sold") {
      try {
        const projectData = projectSnap.data()!;
        await createPipelineTasks(projectId, projectData);
        await openNextTasks(projectId);
      } catch (err) {
        functions.logger.warn(
          `Failed to create pipeline tasks for project ${projectId}:`,
          err,
        );
      }
    }

    return {
      success: true,
      projectId,
      previousStage: currentStatus,
      newStage,
      phase,
    };
  },
);

/**
 * createProjectTask - Create a task in the project's tasks subcollection
 */
export const createProjectTask = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const {
      projectId,
      type,
      description,
      assignment_method,
      budget_range,
      deadline,
    } = data;

    if (!projectId || !type || !description) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId, type, and description are required",
      );
    }

    if (!TASK_TYPES.includes(type)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid task type: ${type}. Valid types: ${TASK_TYPES.join(", ")}`,
      );
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
  },
);

/**
 * assignProjectTask - Assign a task to a user or organization
 */
export const assignProjectTask = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const { projectId, taskId, userId, orgId } = data;

    if (!projectId || !taskId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId and taskId are required",
      );
    }

    if (!userId && !orgId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Either userId or orgId is required",
      );
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
  },
);

/**
 * completeProjectTask - Mark a task as completed
 */
export const completeProjectTask = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const { projectId, taskId, notes, rating } = data;

    if (!projectId || !taskId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId and taskId are required",
      );
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

    const updateData: Record<string, unknown> = {
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

    // Cascade pipeline: mark pipeline task completed and open downstream tasks
    const taskData = taskSnap.data()!;
    const taskType = taskData.type;
    if (taskType) {
      try {
        await onPipelineTaskCompleted(projectId, taskType);
      } catch (err) {
        functions.logger.warn(
          `Pipeline cascade failed for task ${taskType} on project ${projectId}:`,
          err,
        );
      }
    }

    return {
      success: true,
      projectId,
      taskId,
    };
  },
);

/**
 * getProjectTimeline - Get the full pipeline timeline for a project
 */
export const getProjectTimeline = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const { projectId } = data;

    if (!projectId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId is required",
      );
    }

    const projectSnap = await db.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Project not found");
    }

    const project = projectSnap.data()!;
    const timeline = project.pipeline?.timeline || [];

    // Sort by timestamp descending (newest first)
    const sorted = [...timeline].sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aTime =
          (a.timestamp as admin.firestore.Timestamp)?.toMillis?.() || 0;
        const bTime =
          (b.timestamp as admin.firestore.Timestamp)?.toMillis?.() || 0;
        return bTime - aTime;
      },
    );

    return {
      success: true,
      projectId,
      currentStage: project.status,
      currentPhase: project.pipeline?.current_phase || null,
      timeline: sorted,
    };
  },
);
