/**
 * Photo Service -- Frontend interface for install photo QC
 *
 * Manages photo upload, AI analysis status, phase completion,
 * and sign-off workflows. All functions call Firebase Cloud Functions
 * via httpsCallable.
 *
 * @module photoService
 */
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "us-central1");

/** Installation phases that require photos */
export const INSTALL_PHASES = [
  "pre_install",
  "mounting",
  "wiring",
  "panels",
  "inverter",
  "battery",
  "final",
  "inspection",
];

/** Human-readable phase labels */
export const PHASE_LABELS = {
  pre_install: "Pre-Install Survey",
  mounting: "Mounting & Racking",
  wiring: "Wiring & Conduit",
  panels: "Panel Installation",
  inverter: "Inverter Setup",
  battery: "Battery System",
  final: "Final Inspection Prep",
  inspection: "Inspector Photos",
};

/** Required check types per phase (matches backend PHASE_CHECK_TYPES) */
export const PHASE_CHECKS = {
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

/**
 * Upload a photo for an installation phase. Triggers AI analysis.
 *
 * @param {string} projectId - Project ID
 * @param {string} scheduleId - Install schedule ID
 * @param {string} phase - Installation phase
 * @param {{ url: string, takenBy?: string, gps?: {lat: number, lng: number} }} photoData
 * @returns {Promise<{success: boolean, photoId: string, recordId: string}>}
 */
export async function uploadInstallPhoto(
  projectId,
  scheduleId,
  phase,
  photoData,
) {
  const fn = httpsCallable(functions, "uploadInstallPhoto");
  const result = await fn({ projectId, scheduleId, phase, photoData });
  return result.data;
}

/**
 * Get all photos for a project grouped by phase.
 *
 * @param {string} projectId
 * @returns {Promise<{success: boolean, phases: Object}>}
 */
export async function getPhotosByProject(projectId) {
  const fn = httpsCallable(functions, "getPhotosByProject");
  const result = await fn({ projectId });
  return result.data;
}

/**
 * Get the status of a specific phase (complete, passing, issues).
 *
 * @param {string} projectId
 * @param {string} phase
 * @returns {Promise<{success: boolean, complete: boolean, passing: boolean, issues: string[], photoCount: number}>}
 */
export async function getPhaseStatus(projectId, phase) {
  const fn = httpsCallable(functions, "getPhaseStatus");
  const result = await fn({ projectId, phase });
  return result.data;
}

/**
 * Escalate a photo to human reviewer.
 *
 * @param {string} projectId
 * @param {string} photoId
 * @returns {Promise<{success: boolean, taskId: string}>}
 */
export async function requestPhotoReview(projectId, photoId) {
  const fn = httpsCallable(functions, "requestPhotoReview");
  const result = await fn({ projectId, photoId });
  return result.data;
}

/**
 * Sign off on a completed phase.
 *
 * @param {string} projectId
 * @param {string} phase
 * @param {string} signedBy - Name/ID of signer
 * @param {"installer"|"reviewer"|"customer"} role
 * @returns {Promise<{success: boolean, signOff: Object}>}
 */
export async function signOffPhase(projectId, phase, signedBy, role) {
  const fn = httpsCallable(functions, "signOffPhase");
  const result = await fn({ projectId, phase, signedBy, role });
  return result.data;
}

/**
 * Get overall install progress across all phases.
 *
 * @param {string} projectId
 * @returns {Promise<{success: boolean, progress: Object}>}
 */
export async function getInstallProgress(projectId) {
  const fn = httpsCallable(functions, "getInstallProgress");
  const result = await fn({ projectId });
  return result.data;
}
