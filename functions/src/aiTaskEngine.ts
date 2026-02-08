/**
 * AI Task Engine - Cloud Functions
 *
 * The foundational automation layer for SolarOS. Every automatable operation
 * flows through this engine: AI attempts the task first, and if it can't handle
 * it with sufficient confidence, the task escalates to a human. When a human
 * completes the task, the engine captures a learning record so that next time,
 * the AI can handle it autonomously.
 *
 * Pattern: AI tries first -> asks human when stuck -> learns from human action
 *
 * Collections:
 *   ai_tasks     — Individual task records with full lifecycle tracking
 *   ai_learnings — Patterns extracted from human completions, used to improve AI
 *
 * @module aiTaskEngine
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// ─── Types ──────────────────────────────────────────────────────────────────────

/** All automatable task types in the SolarOS pipeline */
export type AiTaskType =
  | "permit_submit"
  | "permit_check"
  | "cad_generate"
  | "photo_analyze"
  | "funding_submit"
  | "schedule_match"
  | "survey_process";

/** Task status lifecycle: pending -> ai_processing -> ai_completed/ai_failed/human_needed -> ... */
export type AiTaskStatus =
  | "pending"
  | "ai_processing"
  | "ai_completed"
  | "ai_failed"
  | "human_needed"
  | "human_processing"
  | "human_completed"
  | "learning";

/** Priority levels: 1 = critical (blocking other work), 5 = low (nice to have) */
export type AiTaskPriority = 1 | 2 | 3 | 4 | 5;

/** Confidence threshold above which AI learnings are applied automatically */
const LEARNING_AUTO_APPLY_THRESHOLD = 0.8;

/** Maximum number of times a task can be retried before requiring human intervention */
const DEFAULT_MAX_RETRIES = 3;

// ─── Task Type Handlers (Stubs) ─────────────────────────────────────────────────
//
// Each handler receives the task input and any applicable learnings, then returns
// a confidence score and result. For now these are stubs that return zero confidence
// so every task escalates to a human — real implementations will be plugged in by
// the permit, CAD, photo, funding, scheduling, and survey subsystems.

/**
 * Handler result from a type-specific AI processor
 */
interface AiHandlerResult {
  /** 0-1 score indicating how confident the AI is in its result */
  confidence: number;
  /** The output data, or null if the handler couldn't produce a result */
  result: Record<string, unknown> | null;
  /** Optional error message if something went wrong */
  error?: string;
}

/**
 * Stub handler for permit submission automation.
 * Will eventually fill out jurisdiction-specific permit forms and submit them.
 */
async function handlePermitSubmit(
  _input: Record<string, unknown>,
  _learnings: FirebaseFirestore.QuerySnapshot,
): Promise<AiHandlerResult> {
  console.log("AI handler: permit_submit (stub — no implementation yet)");
  return { confidence: 0, result: null };
}

/**
 * Stub handler for permit status checking.
 * Will eventually scrape jurisdiction portals to check permit approval status.
 */
async function handlePermitCheck(
  _input: Record<string, unknown>,
  _learnings: FirebaseFirestore.QuerySnapshot,
): Promise<AiHandlerResult> {
  console.log("AI handler: permit_check (stub — no implementation yet)");
  return { confidence: 0, result: null };
}

/**
 * Stub handler for CAD plan generation.
 * Will eventually generate solar panel layout drawings from survey data.
 */
async function handleCadGenerate(
  _input: Record<string, unknown>,
  _learnings: FirebaseFirestore.QuerySnapshot,
): Promise<AiHandlerResult> {
  console.log("AI handler: cad_generate (stub — no implementation yet)");
  return { confidence: 0, result: null };
}

/**
 * Stub handler for installation photo analysis.
 * Will eventually analyze site photos to verify installation quality.
 */
async function handlePhotoAnalyze(
  _input: Record<string, unknown>,
  _learnings: FirebaseFirestore.QuerySnapshot,
): Promise<AiHandlerResult> {
  console.log("AI handler: photo_analyze (stub — no implementation yet)");
  return { confidence: 0, result: null };
}

/**
 * Stub handler for funding/financing submission.
 * Will eventually submit loan or lease applications to TPO providers.
 */
async function handleFundingSubmit(
  _input: Record<string, unknown>,
  _learnings: FirebaseFirestore.QuerySnapshot,
): Promise<AiHandlerResult> {
  console.log("AI handler: funding_submit (stub — no implementation yet)");
  return { confidence: 0, result: null };
}

/**
 * Stub handler for installer/crew schedule matching.
 * Will eventually match available crews to project timelines.
 */
async function handleScheduleMatch(
  _input: Record<string, unknown>,
  _learnings: FirebaseFirestore.QuerySnapshot,
): Promise<AiHandlerResult> {
  console.log("AI handler: schedule_match (stub — no implementation yet)");
  return { confidence: 0, result: null };
}

/**
 * Stub handler for site survey data processing.
 * Will eventually extract measurements and constraints from survey data/photos.
 */
async function handleSurveyProcess(
  _input: Record<string, unknown>,
  _learnings: FirebaseFirestore.QuerySnapshot,
): Promise<AiHandlerResult> {
  console.log("AI handler: survey_process (stub — no implementation yet)");
  return { confidence: 0, result: null };
}

/** Maps each task type to its handler function */
const TASK_HANDLERS: Record<
  AiTaskType,
  (
    input: Record<string, unknown>,
    learnings: FirebaseFirestore.QuerySnapshot,
  ) => Promise<AiHandlerResult>
> = {
  permit_submit: handlePermitSubmit,
  permit_check: handlePermitCheck,
  cad_generate: handleCadGenerate,
  photo_analyze: handlePhotoAnalyze,
  funding_submit: handleFundingSubmit,
  schedule_match: handleScheduleMatch,
  survey_process: handleSurveyProcess,
};

/** All valid task types for input validation */
const VALID_TASK_TYPES: AiTaskType[] = Object.keys(
  TASK_HANDLERS,
) as AiTaskType[];

// ─── Helper: Query Learnings ────────────────────────────────────────────────────

/**
 * Query the ai_learnings collection for patterns that match the given task type
 * and context. Matches are found by taskType equality, then optionally filtered
 * by overlapping context fields (jurisdiction, state, zipCode, etc.).
 *
 * Returns learnings sorted by confidence descending so the most reliable
 * patterns come first.
 *
 * @param taskType - The type of task to find learnings for
 * @param context - Optional context fields to narrow the search
 * @returns Firestore QuerySnapshot of matching ai_learnings documents
 */
async function queryLearnings(
  taskType: AiTaskType,
  context?: Record<string, unknown>,
): Promise<FirebaseFirestore.QuerySnapshot> {
  const db = admin.firestore();

  // Start with taskType match — this is always required
  let query: FirebaseFirestore.Query = db
    .collection("ai_learnings")
    .where("taskType", "==", taskType)
    .orderBy("confidence", "desc")
    .limit(10);

  // If we have context, try to narrow by the most specific field available.
  // Firestore doesn't support OR across fields, so we pick the most specific
  // context field and use it as an additional filter. The handler can then
  // do further in-memory filtering on the results.
  if (context) {
    if (context.jurisdiction) {
      query = db
        .collection("ai_learnings")
        .where("taskType", "==", taskType)
        .where("context.jurisdiction", "==", context.jurisdiction)
        .orderBy("confidence", "desc")
        .limit(10);
    } else if (context.zipCode) {
      query = db
        .collection("ai_learnings")
        .where("taskType", "==", taskType)
        .where("context.zipCode", "==", context.zipCode)
        .orderBy("confidence", "desc")
        .limit(10);
    } else if (context.state) {
      query = db
        .collection("ai_learnings")
        .where("taskType", "==", taskType)
        .where("context.state", "==", context.state)
        .orderBy("confidence", "desc")
        .limit(10);
    }
  }

  return query.get();
}

// ─── Helper: Create Learning Record ─────────────────────────────────────────────

/**
 * Create a learning record by comparing what the AI attempted with what the
 * human actually did. This is the core of the learning flywheel — every human
 * action inside the platform becomes training data for future automation.
 *
 * @param taskDoc - The completed task document containing both AI and human data
 */
async function createLearningFromTask(
  taskDoc: FirebaseFirestore.DocumentSnapshot,
): Promise<string> {
  const db = admin.firestore();
  const task = taskDoc.data()!;

  // Build a delta object showing what differed between AI output and human output.
  // This helps handlers understand exactly what the AI got wrong.
  const aiOutput = task.aiAttempt?.result || {};
  const humanOutput = task.humanFallback?.action || "";

  const learningData: Record<string, unknown> = {
    taskType: task.type,
    taskId: taskDoc.id,
    context: task.input?.context || {},
    pattern: `Human completed ${task.type} task that AI could not handle`,
    humanAction: humanOutput,
    humanInput: task.humanFallback || {},
    aiAttemptedOutput: aiOutput,
    // Delta captures what changed — the difference between AI's attempt and human's result
    delta: {
      aiConfidence: task.aiAttempt?.confidence || 0,
      humanProvided: true,
    },
    // New learnings start at 0.5 confidence; repeated successful use increases this
    confidence: 0.5,
    usageCount: 0,
    successCount: 0,
    failureCount: 0,
    trainable: true,
    createdBy: task.humanFallback?.assignedTo || "system",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const learningRef = await db.collection("ai_learnings").add(learningData);
  return learningRef.id;
}

// ─── Cloud Function: createAiTask ───────────────────────────────────────────────

/**
 * Create a new AI task and optionally begin processing it immediately.
 * This is the entry point for all automation — any system that wants something
 * done (permit filed, photo analyzed, schedule matched) creates a task here.
 *
 * @function createAiTask
 * @type onCall
 * @auth firebase
 * @input {{ type: AiTaskType, projectId: string, input: object, priority?: 1-5, autoProcess?: boolean, maxRetries?: number }}
 * @output {{ success: boolean, taskId: string, status: AiTaskStatus }}
 * @errors unauthenticated, invalid-argument, internal
 * @billing none
 * @firestore ai_tasks
 */
export const createAiTask = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to create AI tasks",
      );
    }

    const { type, projectId, input, priority, autoProcess, maxRetries } = data;

    // Validate required fields
    if (!type || !projectId || !input) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "type, projectId, and input are required. type must be one of: " +
          VALID_TASK_TYPES.join(", "),
      );
    }

    // Validate task type
    if (!VALID_TASK_TYPES.includes(type)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid task type: "${type}". Must be one of: ${VALID_TASK_TYPES.join(", ")}`,
      );
    }

    // Validate priority if provided (1-5, where 1 is highest)
    const taskPriority: AiTaskPriority =
      priority && priority >= 1 && priority <= 5 ? priority : 3;

    const db = admin.firestore();

    try {
      const taskData: Record<string, unknown> = {
        type,
        projectId,
        status: "pending" as AiTaskStatus,
        input,
        output: null,
        aiAttempt: null,
        humanFallback: null,
        learningData: null,
        retryCount: 0,
        maxRetries: maxRetries || DEFAULT_MAX_RETRIES,
        priority: taskPriority,
        createdBy: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const taskRef = await db.collection("ai_tasks").add(taskData);

      console.log(
        `AI task created: ${taskRef.id} (type=${type}, project=${projectId}, priority=${taskPriority})`,
      );

      // If autoProcess is true (default), immediately attempt AI processing.
      // This keeps the flow synchronous for the caller when possible.
      if (autoProcess !== false) {
        try {
          await _processTask(taskRef.id, db);
        } catch (processError: any) {
          // Processing failure shouldn't fail task creation — the task exists
          // and can be retried. Log the error and return the task as pending.
          console.error(
            `Auto-process failed for task ${taskRef.id}:`,
            processError.message,
          );
        }
      }

      // Re-read to get the latest status (may have changed during auto-process)
      const updatedTask = await taskRef.get();
      const currentStatus = updatedTask.data()?.status || "pending";

      return {
        success: true,
        taskId: taskRef.id,
        status: currentStatus,
      };
    } catch (error: any) {
      console.error("Create AI task error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create AI task",
      );
    }
  });

// ─── Cloud Function: processAiTask ──────────────────────────────────────────────

/**
 * Main AI processing dispatcher. Reads the task type, queries for applicable
 * learnings, and calls the type-specific handler. If the handler returns high
 * confidence, the task completes. Otherwise, it escalates to a human.
 *
 * This is the brain of the automation engine — it's the function that decides
 * whether AI can handle something or whether a human needs to step in.
 *
 * @function processAiTask
 * @type onCall
 * @auth firebase
 * @input {{ taskId: string }}
 * @output {{ success: boolean, taskId: string, status: AiTaskStatus, confidence: number }}
 * @errors unauthenticated, invalid-argument, not-found, failed-precondition, internal
 * @billing none
 * @firestore ai_tasks, ai_learnings
 */
export const processAiTask = functions
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to process AI tasks",
      );
    }

    const { taskId } = data;
    if (!taskId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "taskId is required",
      );
    }

    const db = admin.firestore();

    try {
      const result = await _processTask(taskId, db);
      return result;
    } catch (error: any) {
      console.error(`Process AI task error (${taskId}):`, error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to process AI task",
      );
    }
  });

/**
 * Internal processing logic, shared between processAiTask (explicit call) and
 * createAiTask (auto-process). Separated so that task creation can trigger
 * processing without going through the Cloud Function HTTP layer.
 */
async function _processTask(
  taskId: string,
  db: FirebaseFirestore.Firestore,
): Promise<{
  success: boolean;
  taskId: string;
  status: AiTaskStatus;
  confidence: number;
}> {
  const taskRef = db.collection("ai_tasks").doc(taskId);
  const taskSnap = await taskRef.get();

  if (!taskSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      `AI task not found: ${taskId}`,
    );
  }

  const task = taskSnap.data()!;

  // Only process tasks that are in a processable state
  if (!["pending", "ai_failed"].includes(task.status)) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `Task ${taskId} is in status "${task.status}" and cannot be processed. ` +
        "Only pending or ai_failed tasks can be processed.",
    );
  }

  // Mark as processing
  await taskRef.update({
    status: "ai_processing",
    "aiAttempt.startedAt": admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const taskType = task.type as AiTaskType;
  const handler = TASK_HANDLERS[taskType];

  if (!handler) {
    // This shouldn't happen if createAiTask validated the type, but guard anyway
    await taskRef.update({
      status: "ai_failed",
      "aiAttempt.error": `No handler registered for task type: ${taskType}`,
      "aiAttempt.completedAt": admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: false, taskId, status: "ai_failed", confidence: 0 };
  }

  // Query learnings BEFORE attempting the task — this is how AI gets smarter
  const learnings = await queryLearnings(taskType, task.input?.context);

  // Check if any learning has high enough confidence to apply directly.
  // If a human has successfully done this exact thing multiple times,
  // we can skip the AI handler and use the learned pattern.
  let highConfidenceLearning: FirebaseFirestore.DocumentData | null = null;
  if (!learnings.empty) {
    const topLearning = learnings.docs[0].data();
    if (topLearning.confidence >= LEARNING_AUTO_APPLY_THRESHOLD) {
      highConfidenceLearning = topLearning;
      console.log(
        `Found high-confidence learning (${topLearning.confidence}) for ${taskType} — applying directly`,
      );

      // Increment usage count on the learning
      await learnings.docs[0].ref.update({
        usageCount: admin.firestore.FieldValue.increment(1),
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  try {
    // Run the type-specific handler
    const handlerResult = await handler(task.input || {}, learnings);

    // If we had a high-confidence learning, boost the handler's confidence
    const effectiveConfidence = highConfidenceLearning
      ? Math.max(handlerResult.confidence, highConfidenceLearning.confidence)
      : handlerResult.confidence;

    // Determine outcome: confidence >= 0.7 means AI handled it successfully
    const aiSucceeded = effectiveConfidence >= 0.7;
    const newStatus: AiTaskStatus = aiSucceeded
      ? "ai_completed"
      : "human_needed";

    await taskRef.update({
      status: newStatus,
      output: aiSucceeded ? handlerResult.result : null,
      "aiAttempt.completedAt": admin.firestore.FieldValue.serverTimestamp(),
      "aiAttempt.result": handlerResult.result,
      "aiAttempt.confidence": effectiveConfidence,
      "aiAttempt.error": handlerResult.error || null,
      "aiAttempt.learningsApplied": !learnings.empty
        ? learnings.docs.map((d) => d.id)
        : [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If AI succeeded and we used a learning, increment its success count
    if (aiSucceeded && highConfidenceLearning && !learnings.empty) {
      await learnings.docs[0].ref.update({
        successCount: admin.firestore.FieldValue.increment(1),
      });
    }

    console.log(
      `AI task ${taskId} processed: status=${newStatus}, confidence=${effectiveConfidence}`,
    );

    return {
      success: true,
      taskId,
      status: newStatus,
      confidence: effectiveConfidence,
    };
  } catch (handlerError: any) {
    // Handler threw an error — mark as failed so it can be retried
    const retryCount = (task.retryCount || 0) + 1;
    const maxRetries = task.maxRetries || DEFAULT_MAX_RETRIES;
    const newStatus: AiTaskStatus =
      retryCount >= maxRetries ? "human_needed" : "ai_failed";

    await taskRef.update({
      status: newStatus,
      retryCount,
      "aiAttempt.completedAt": admin.firestore.FieldValue.serverTimestamp(),
      "aiAttempt.confidence": 0,
      "aiAttempt.error": handlerError.message || "Handler threw an exception",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If we used a learning and it failed, increment its failure count
    if (highConfidenceLearning && !learnings.empty) {
      await learnings.docs[0].ref.update({
        failureCount: admin.firestore.FieldValue.increment(1),
        // Decay confidence on failure so bad learnings get phased out
        confidence: admin.firestore.FieldValue.increment(-0.1),
      });
    }

    console.warn(
      `AI task ${taskId} handler failed (retry ${retryCount}/${maxRetries}):`,
      handlerError.message,
    );

    return { success: false, taskId, status: newStatus, confidence: 0 };
  }
}

// ─── Cloud Function: escalateToHuman ────────────────────────────────────────────

/**
 * Explicitly escalate a task to the human queue. Used when AI processing
 * determines it cannot handle something, or when an operator manually decides
 * a task needs human attention.
 *
 * Optionally assigns to a specific user. If no assignedTo is provided,
 * the task enters the unassigned human queue for anyone to pick up.
 *
 * @function escalateToHuman
 * @type onCall
 * @auth firebase
 * @input {{ taskId: string, reason?: string, assignedTo?: string }}
 * @output {{ success: boolean, taskId: string, status: "human_needed" | "human_processing" }}
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @billing none
 * @firestore ai_tasks
 */
export const escalateToHuman = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to escalate tasks",
      );
    }

    const { taskId, reason, assignedTo } = data;

    if (!taskId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "taskId is required",
      );
    }

    const db = admin.firestore();
    const taskRef = db.collection("ai_tasks").doc(taskId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `AI task not found: ${taskId}`,
      );
    }

    try {
      const newStatus: AiTaskStatus = assignedTo
        ? "human_processing"
        : "human_needed";

      const updateData: Record<string, unknown> = {
        status: newStatus,
        "humanFallback.reason": reason || "Escalated manually",
        "humanFallback.escalatedBy": context.auth.uid,
        "humanFallback.escalatedAt":
          admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // If a specific user is assigned, record the assignment
      if (assignedTo) {
        updateData["humanFallback.assignedTo"] = assignedTo;
        updateData["humanFallback.assignedAt"] =
          admin.firestore.FieldValue.serverTimestamp();
      }

      await taskRef.update(updateData);

      console.log(
        `AI task ${taskId} escalated to human` +
          (assignedTo ? ` (assigned to ${assignedTo})` : " (unassigned)"),
      );

      return {
        success: true,
        taskId,
        status: newStatus,
      };
    } catch (error: any) {
      console.error(`Escalate task error (${taskId}):`, error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to escalate task",
      );
    }
  });

// ─── Cloud Function: completeHumanTask ──────────────────────────────────────────

/**
 * Mark a human-assigned task as completed. This is where the learning flywheel
 * turns: the human's action is captured and compared against what the AI tried,
 * creating a learning record that makes future AI attempts smarter.
 *
 * Every time a human completes a task here, the system gets better.
 *
 * @function completeHumanTask
 * @type onCall
 * @auth firebase
 * @input {{ taskId: string, action: string, output?: object, notes?: string }}
 * @output {{ success: boolean, taskId: string, learningId: string | null }}
 * @errors unauthenticated, invalid-argument, not-found, failed-precondition, internal
 * @billing none
 * @firestore ai_tasks, ai_learnings
 */
export const completeHumanTask = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to complete tasks",
      );
    }

    const { taskId, action, output, notes } = data;

    if (!taskId || !action) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "taskId and action are required. action should describe what you did.",
      );
    }

    const db = admin.firestore();
    const taskRef = db.collection("ai_tasks").doc(taskId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `AI task not found: ${taskId}`,
      );
    }

    const task = taskSnap.data()!;

    // Only human_needed or human_processing tasks can be completed by humans
    if (!["human_needed", "human_processing"].includes(task.status)) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Task ${taskId} is in status "${task.status}" and cannot be completed as a human task. ` +
          "Only human_needed or human_processing tasks can be completed here.",
      );
    }

    try {
      // Temporarily set status to "learning" while we create the learning record
      await taskRef.update({
        status: "learning",
        output: output || null,
        "humanFallback.completedAt":
          admin.firestore.FieldValue.serverTimestamp(),
        "humanFallback.completedBy": context.auth.uid,
        "humanFallback.action": action,
        "humanFallback.notes": notes || "",
        "humanFallback.output": output || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create the learning record — this is the flywheel
      let learningId: string | null = null;
      try {
        learningId = await createLearningFromTask(
          await taskRef.get(), // Re-read to get the updated data
        );
        console.log(
          `Learning record created: ${learningId} from task ${taskId}`,
        );
      } catch (learningError: any) {
        // Learning creation failure shouldn't block task completion
        console.error(
          `Failed to create learning from task ${taskId}:`,
          learningError.message,
        );
      }

      // Finalize the task as human_completed
      await taskRef.update({
        status: "human_completed",
        "learningData.learningId": learningId,
        "learningData.aiInput": task.input,
        "learningData.humanOutput": output || null,
        "learningData.delta": {
          aiConfidence: task.aiAttempt?.confidence || 0,
          humanAction: action,
        },
        "learningData.trainable": true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `Human task completed: ${taskId} by ${context.auth.uid}` +
          (learningId ? ` (learning: ${learningId})` : ""),
      );

      return {
        success: true,
        taskId,
        learningId,
      };
    } catch (error: any) {
      console.error(`Complete human task error (${taskId}):`, error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to complete human task",
      );
    }
  });

// ─── Cloud Function: getTaskQueue ───────────────────────────────────────────────

/**
 * Query the AI task queue with filters. Used by dashboard UIs and operators
 * to see what needs attention — especially the human_needed queue.
 *
 * Supports filtering by status, type, priority, and assignment.
 *
 * @function getTaskQueue
 * @type onCall
 * @auth firebase
 * @input {{ status?: AiTaskStatus, type?: AiTaskType, priority?: 1-5, assignedTo?: string, projectId?: string, limit?: number }}
 * @output {{ success: boolean, tasks: Array<object>, count: number }}
 * @errors unauthenticated, internal
 * @billing none
 * @firestore ai_tasks
 */
export const getTaskQueue = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view task queue",
      );
    }

    const db = admin.firestore();
    const queryLimit = Math.min(data?.limit || 50, 200); // Cap at 200

    try {
      // Build query based on provided filters.
      // Firestore only allows one inequality filter, so we use equality filters
      // for the most common query patterns and sort by priority + creation time.
      let query: FirebaseFirestore.Query = db.collection("ai_tasks");

      if (data?.status) {
        query = query.where("status", "==", data.status);
      }

      if (data?.type) {
        query = query.where("type", "==", data.type);
      }

      if (data?.projectId) {
        query = query.where("projectId", "==", data.projectId);
      }

      if (data?.priority) {
        query = query.where("priority", "==", data.priority);
      }

      if (data?.assignedTo) {
        query = query.where("humanFallback.assignedTo", "==", data.assignedTo);
      }

      // Order by priority (1=highest) then creation time (oldest first)
      query = query
        .orderBy("priority", "asc")
        .orderBy("createdAt", "asc")
        .limit(queryLimit);

      const snapshot = await query.get();

      const tasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        tasks,
        count: tasks.length,
      };
    } catch (error: any) {
      console.error("Get task queue error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to query task queue",
      );
    }
  });

// ─── Cloud Function: retryAiTask ────────────────────────────────────────────────

/**
 * Re-attempt a failed AI task. Before retrying, checks for any NEW learnings
 * that may have been created since the last attempt (e.g., a human completed
 * a similar task and generated a learning). This means retries get smarter
 * over time, not just repeat the same failure.
 *
 * @function retryAiTask
 * @type onCall
 * @auth firebase
 * @input {{ taskId: string }}
 * @output {{ success: boolean, taskId: string, status: AiTaskStatus, confidence: number }}
 * @errors unauthenticated, invalid-argument, not-found, failed-precondition, internal
 * @billing none
 * @firestore ai_tasks, ai_learnings
 */
export const retryAiTask = functions
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to retry tasks",
      );
    }

    const { taskId } = data;
    if (!taskId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "taskId is required",
      );
    }

    const db = admin.firestore();
    const taskRef = db.collection("ai_tasks").doc(taskId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `AI task not found: ${taskId}`,
      );
    }

    const task = taskSnap.data()!;

    // Only failed or human_needed tasks can be retried
    if (!["ai_failed", "human_needed"].includes(task.status)) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Task ${taskId} is in status "${task.status}" and cannot be retried. ` +
          "Only ai_failed or human_needed tasks can be retried.",
      );
    }

    // Check retry limit
    const retryCount = task.retryCount || 0;
    const maxRetries = task.maxRetries || DEFAULT_MAX_RETRIES;
    if (retryCount >= maxRetries) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Task ${taskId} has reached its retry limit (${retryCount}/${maxRetries}). ` +
          "Assign to a human or increase maxRetries.",
      );
    }

    try {
      // Check for new learnings since last attempt — this is what makes retries
      // smarter than just repeating the same thing
      const learnings = await queryLearnings(
        task.type as AiTaskType,
        task.input?.context,
      );

      const newLearningsCount = learnings.empty ? 0 : learnings.size;
      console.log(
        `Retrying task ${taskId}: found ${newLearningsCount} applicable learnings`,
      );

      // Reset to pending state so _processTask will pick it up
      await taskRef.update({
        status: "pending",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Re-process with the (possibly new) learnings
      const result = await _processTask(taskId, db);
      return result;
    } catch (error: any) {
      console.error(`Retry AI task error (${taskId}):`, error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to retry AI task",
      );
    }
  });

// ─── Cloud Function: getTaskStats ───────────────────────────────────────────────

/**
 * Get dashboard statistics for the AI task engine. Shows counts by status,
 * AI success rate, average resolution time, and learning coverage by task type.
 * This is how operators monitor whether the AI is getting better over time.
 *
 * @function getTaskStats
 * @type onCall
 * @auth firebase
 * @input {{ projectId?: string, since?: string (ISO date) }}
 * @output {{ success: boolean, stats: { total, byStatus, byType, aiSuccessRate, avgResolutionMs, learningCount } }}
 * @errors unauthenticated, internal
 * @billing none
 * @firestore ai_tasks, ai_learnings
 */
export const getTaskStats = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view stats",
      );
    }

    const db = admin.firestore();

    try {
      // Build query with optional filters
      let taskQuery: FirebaseFirestore.Query = db.collection("ai_tasks");

      if (data?.projectId) {
        taskQuery = taskQuery.where("projectId", "==", data.projectId);
      }

      if (data?.since) {
        const sinceDate = new Date(data.since);
        const sinceTimestamp = admin.firestore.Timestamp.fromDate(sinceDate);
        taskQuery = taskQuery.where("createdAt", ">=", sinceTimestamp);
      }

      const taskSnapshot = await taskQuery.get();

      // Compute aggregates in memory (Firestore doesn't have native aggregations
      // beyond count, so for a dashboard this is the pragmatic approach)
      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};
      let aiAttempted = 0;
      let aiSucceeded = 0;
      let totalResolutionMs = 0;
      let resolvedCount = 0;

      taskSnapshot.docs.forEach((doc) => {
        const t = doc.data();

        // Count by status
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;

        // Count by type
        byType[t.type] = (byType[t.type] || 0) + 1;

        // AI success tracking: count tasks where AI was attempted
        if (t.aiAttempt?.completedAt) {
          aiAttempted++;
          if (t.status === "ai_completed") {
            aiSucceeded++;
          }
        }

        // Resolution time: from creation to completion (either AI or human)
        const createdAt = t.createdAt?.toMillis?.();
        const aiCompleted = t.aiAttempt?.completedAt?.toMillis?.();
        const humanCompleted = t.humanFallback?.completedAt?.toMillis?.();
        const completedAt = humanCompleted || aiCompleted;

        if (createdAt && completedAt) {
          totalResolutionMs += completedAt - createdAt;
          resolvedCount++;
        }
      });

      // Get learning count to show coverage
      const learningSnapshot = await db.collection("ai_learnings").get();

      // Count learnings by task type
      const learningsByType: Record<string, number> = {};
      learningSnapshot.docs.forEach((doc) => {
        const l = doc.data();
        learningsByType[l.taskType] = (learningsByType[l.taskType] || 0) + 1;
      });

      return {
        success: true,
        stats: {
          total: taskSnapshot.size,
          byStatus,
          byType,
          // AI success rate as a percentage (0-100)
          aiSuccessRate:
            aiAttempted > 0 ? Math.round((aiSucceeded / aiAttempted) * 100) : 0,
          aiAttempted,
          aiSucceeded,
          // Average resolution time in milliseconds
          avgResolutionMs:
            resolvedCount > 0
              ? Math.round(totalResolutionMs / resolvedCount)
              : 0,
          resolvedCount,
          // Learning coverage
          learningCount: learningSnapshot.size,
          learningsByType,
        },
      };
    } catch (error: any) {
      console.error("Get task stats error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get task stats",
      );
    }
  });
