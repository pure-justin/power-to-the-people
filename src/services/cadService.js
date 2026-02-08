/**
 * CAD Design Service -- Frontend interface to the CAD Design Engine
 *
 * Provides functions for generating, reviewing, and approving solar
 * system designs. All functions call Firebase Cloud Functions via httpsCallable.
 *
 * Design workflow:
 *   1. generateDesign() — AI creates initial design from survey data
 *   2. getDesign() — Review specs, layout, compliance
 *   3. updateDesign() — Human adjusts design parameters
 *   4. approveDesign() — Finalize and trigger permit creation
 */

import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "us-central1");

/**
 * Generate a new CAD design for a project using survey data.
 * Creates an AI task that will attempt to calculate optimal system specs.
 *
 * @param {string} projectId - The project to design for
 * @param {string} surveyId - The survey with site measurements
 * @returns {Promise<{success: boolean, designId: string, aiTaskId: string}>}
 */
export async function generateDesign(projectId, surveyId) {
  const fn = httpsCallable(functions, "generateDesign");
  const result = await fn({ projectId, surveyId });
  return result.data;
}

/**
 * Get a single design with all specs, documents, and compliance details.
 *
 * @param {string} designId - The design to retrieve
 * @returns {Promise<{success: boolean, design: Object}>}
 */
export async function getDesign(designId) {
  const fn = httpsCallable(functions, "getDesign");
  const result = await fn({ designId });
  return result.data;
}

/**
 * List all designs for a project.
 *
 * @param {string} projectId - The project to list designs for
 * @returns {Promise<{success: boolean, designs: Array}>}
 */
export async function getDesignsByProject(projectId) {
  const fn = httpsCallable(functions, "getDesignsByProject");
  const result = await fn({ projectId });
  return result.data;
}

/**
 * Apply human edits to a design. Changes are logged for AI learning.
 *
 * @param {string} designId - The design to update
 * @param {Object} changes - Partial updates to system_design, compliance, or documents
 * @returns {Promise<{success: boolean, designId: string}>}
 */
export async function updateDesign(designId, changes) {
  const fn = httpsCallable(functions, "updateDesign");
  const result = await fn({ designId, changes });
  return result.data;
}

/**
 * Approve a design, finalizing it for permit submission.
 *
 * @param {string} designId - The design to approve
 * @returns {Promise<{success: boolean, designId: string}>}
 */
export async function approveDesign(designId) {
  const fn = httpsCallable(functions, "approveDesign");
  const result = await fn({ designId });
  return result.data;
}

/**
 * Calculate optimal solar system size without creating a design record.
 * Pure calculation — useful for quick estimates and proposal generation.
 *
 * @param {number} annualKwh - Annual energy consumption in kWh
 * @param {number} usableRoofSqft - Available roof area in square feet
 * @param {number} [shadingLoss=0.05] - Shading loss factor (0-1)
 * @param {number} [sunHours=5.0] - Average peak sun hours
 * @returns {Promise<{success: boolean, system: Object}>}
 */
export async function calculateSystemSize(
  annualKwh,
  usableRoofSqft,
  shadingLoss,
  sunHours,
) {
  const fn = httpsCallable(functions, "calculateSystemSize");
  const result = await fn({ annualKwh, usableRoofSqft, shadingLoss, sunHours });
  return result.data;
}
