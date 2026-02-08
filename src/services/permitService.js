/**
 * Permit Service -- Frontend interface to the Permit Lifecycle System
 *
 * Provides functions for creating, submitting, and tracking permits
 * through their full lifecycle. All functions call Firebase Cloud
 * Functions via httpsCallable.
 *
 * Permit lifecycle:
 *   preparing -> submitting -> submitted -> under_review -> approved
 *                                        -> corrections_needed -> (resubmit)
 */

import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "us-central1");

/**
 * Create a new permit for a project.
 *
 * @param {string} projectId - The project this permit belongs to
 * @param {string} ahjId - The AHJ (jurisdiction) to submit to
 * @param {string} type - Permit type: "solar", "electrical", "building", "hoa"
 * @returns {Promise<{success: boolean, permitId: string}>}
 */
export async function createPermit(projectId, ahjId, type) {
  const fn = httpsCallable(functions, "createPermit");
  const result = await fn({ projectId, ahjId, type });
  return result.data;
}

/**
 * Initiate permit submission. Creates an AI task that will attempt
 * automated submission or escalate to a human operator.
 *
 * @param {string} permitId - The permit to submit
 * @returns {Promise<{success: boolean, permitId: string, aiTaskId: string}>}
 */
export async function submitPermit(permitId) {
  const fn = httpsCallable(functions, "submitPermit");
  const result = await fn({ permitId });
  return result.data;
}

/**
 * Update a permit's status with optional details.
 *
 * @param {string} permitId - The permit to update
 * @param {string} status - New status
 * @param {Object} [details] - Additional details (notes, permit_number, etc.)
 * @returns {Promise<{success: boolean, permitId: string, status: string}>}
 */
export async function updatePermitStatus(permitId, status, details = {}) {
  const fn = httpsCallable(functions, "updatePermitStatus");
  const result = await fn({ permitId, status, details });
  return result.data;
}

/**
 * Get a single permit with full timeline and correction details.
 *
 * @param {string} permitId - The permit to retrieve
 * @returns {Promise<{success: boolean, permit: Object}>}
 */
export async function getPermit(permitId) {
  const fn = httpsCallable(functions, "getPermit");
  const result = await fn({ permitId });
  return result.data;
}

/**
 * Get all permits for a project.
 *
 * @param {string} projectId - The project to get permits for
 * @returns {Promise<{success: boolean, permits: Array}>}
 */
export async function getPermitsByProject(projectId) {
  const fn = httpsCallable(functions, "getPermitsByProject");
  const result = await fn({ projectId });
  return result.data;
}

/**
 * Add a correction request from an AHJ to a permit.
 *
 * @param {string} permitId - The permit that needs correction
 * @param {Object} correction - { item: string, description: string }
 * @returns {Promise<{success: boolean, permitId: string, correctionId: string}>}
 */
export async function addPermitCorrection(permitId, correction) {
  const fn = httpsCallable(functions, "addPermitCorrection");
  const result = await fn({ permitId, correction });
  return result.data;
}

/**
 * Mark a correction as resolved.
 *
 * @param {string} permitId - The permit containing the correction
 * @param {string} correctionId - The specific correction to resolve
 * @param {string} resolution - Description of how it was resolved
 * @returns {Promise<{success: boolean, permitId: string, allResolved: boolean}>}
 */
export async function resolveCorrection(permitId, correctionId, resolution) {
  const fn = httpsCallable(functions, "resolveCorrection");
  const result = await fn({ permitId, correctionId, resolution });
  return result.data;
}
