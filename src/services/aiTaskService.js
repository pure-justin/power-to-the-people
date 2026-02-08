/**
 * AI Task Service -- Frontend interface to the AI Task Engine
 *
 * Enables the human-in-the-loop workflow:
 *   1. AI attempts a task (permit filing, CAD generation, survey review, etc.)
 *   2. If AI succeeds -> task auto-completes, no human needed
 *   3. If AI fails or confidence is low -> task routes to human queue
 *   4. Human completes the task and optionally marks solution as reusable
 *   5. System learns from human action, improving future AI attempts
 *
 * All functions call Firebase Cloud Functions via httpsCallable.
 */
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "us-central1");

/**
 * Create a new AI task for the engine to attempt.
 * The engine will try AI-first, then escalate to human if needed.
 *
 * @param {string} type - Task type: "permit", "survey", "photo_review", "schedule", "cad", "funding"
 * @param {string} projectId - Associated project ID
 * @param {Object} input - Type-specific input data for the AI to work with
 * @returns {Promise<{taskId: string, status: string}>}
 */
export async function createAiTask(type, projectId, input) {
  const fn = httpsCallable(functions, "createAiTask");
  const result = await fn({ type, projectId, input });
  return result.data;
}

/**
 * Get the task queue with optional filters.
 * Used by both the installer dashboard (their tasks) and admin overview (all tasks).
 *
 * @param {Object} filters
 * @param {string} [filters.status] - "pending_human", "ai_processing", "completed", "failed"
 * @param {string} [filters.type] - Task type filter
 * @param {number} [filters.priority] - Priority level 1-5 (1=highest)
 * @param {string} [filters.assignedTo] - User ID filter
 * @param {string} [filters.projectId] - Project ID filter
 * @param {number} [filters.limit] - Max results (default 50)
 * @returns {Promise<{tasks: Array, total: number}>}
 */
export async function getTaskQueue(filters = {}) {
  const fn = httpsCallable(functions, "getTaskQueue");
  const result = await fn(filters);
  return result.data;
}

/**
 * Trigger AI processing on a task.
 * Called when a task is first created or when retrying after a fix.
 *
 * @param {string} taskId
 * @returns {Promise<{status: string, result?: Object, error?: string}>}
 */
export async function processAiTask(taskId) {
  const fn = httpsCallable(functions, "processAiTask");
  const result = await fn({ taskId });
  return result.data;
}

/**
 * Manually escalate a task from AI processing to the human queue.
 * Used when AI is stuck or a human knows they need to handle it.
 *
 * @param {string} taskId
 * @param {string} reason - Why this needs human attention
 * @returns {Promise<{status: string}>}
 */
export async function escalateToHuman(taskId, reason) {
  const fn = httpsCallable(functions, "escalateToHuman");
  const result = await fn({ taskId, reason });
  return result.data;
}

/**
 * Human completes a task that AI couldn't handle.
 * Optionally marks the solution as a learning pattern so AI can handle similar tasks next time.
 *
 * @param {string} taskId
 * @param {Object} result - The completed task output (type-specific)
 * @param {string} [notes] - Human notes about what they did
 * @param {boolean} [teachAi=false] - Whether to save this as a reusable AI pattern
 * @returns {Promise<{status: string, learningId?: string}>}
 */
export async function completeHumanTask(
  taskId,
  result,
  notes = "",
  teachAi = false,
) {
  const fn = httpsCallable(functions, "completeHumanTask");
  const res = await fn({ taskId, result, notes, teachAi });
  return res.data;
}

/**
 * Retry a failed AI task. Useful after fixing the underlying issue
 * or after adding new learning data that might help.
 *
 * @param {string} taskId
 * @returns {Promise<{status: string}>}
 */
export async function retryAiTask(taskId) {
  const fn = httpsCallable(functions, "retryAiTask");
  const result = await fn({ taskId });
  return result.data;
}

/**
 * Get dashboard statistics for the task system.
 * Returns counts, success rates, and performance metrics.
 *
 * @returns {Promise<{
 *   totalTasks: number,
 *   aiSuccessRate: number,
 *   humanInterventionsToday: number,
 *   completedToday: number,
 *   activeLearnings: number,
 *   avgResolutionMinutes: number,
 *   byType: Object,
 *   byStatus: Object
 * }>}
 */
export async function getTaskStats() {
  const fn = httpsCallable(functions, "getTaskStats");
  const result = await fn();
  return result.data;
}

/**
 * Claim an unassigned task from the queue.
 * Assigns it to the current user so others know it's being worked on.
 *
 * @param {string} taskId
 * @returns {Promise<{status: string}>}
 */
export async function claimTask(taskId) {
  const fn = httpsCallable(functions, "claimTask");
  const result = await fn({ taskId });
  return result.data;
}

/**
 * Reassign a task to a different team member (admin only).
 *
 * @param {string} taskId
 * @param {string} userId - User ID to assign to
 * @returns {Promise<{status: string}>}
 */
export async function reassignTask(taskId, userId) {
  const fn = httpsCallable(functions, "reassignTask");
  const result = await fn({ taskId, userId });
  return result.data;
}

/**
 * Get AI learning data -- patterns the system has learned from human completions.
 * Admin-only endpoint for reviewing and managing learned patterns.
 *
 * @param {Object} [filters]
 * @param {string} [filters.type] - Filter by task type
 * @param {number} [filters.limit] - Max results
 * @returns {Promise<{learnings: Array}>}
 */
export async function getLearnings(filters = {}) {
  const fn = httpsCallable(functions, "getLearnings");
  const result = await fn(filters);
  return result.data;
}

/**
 * Adjust confidence on a learning pattern (admin only).
 * Boost patterns that work well, reduce ones that cause issues.
 *
 * @param {string} learningId
 * @param {"boost"|"reduce"} action
 * @returns {Promise<{confidence: number}>}
 */
export async function adjustLearningConfidence(learningId, action) {
  const fn = httpsCallable(functions, "adjustLearningConfidence");
  const result = await fn({ learningId, action });
  return result.data;
}
