/**
 * Funding Service -- Frontend interface for funding & bankability
 *
 * Manages funding package lifecycle, document readiness, submission,
 * milestone payments, and bankability package generation.
 * All functions call Firebase Cloud Functions via httpsCallable.
 *
 * @module fundingService
 */
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "us-central1");

/** Supported funding types */
export const FUNDING_TYPES = {
  lease: "Lease",
  ppa: "Power Purchase Agreement (PPA)",
  loan: "Solar Loan",
  cash: "Cash Purchase",
  pace: "PACE Financing",
};

/** Required documents for funding submission */
export const REQUIRED_DOCUMENTS = [
  { key: "contract_signed", label: "Signed Contract" },
  { key: "permit_approved", label: "Permit Approval" },
  { key: "install_photos_approved", label: "Install Photos Approved" },
  { key: "inspection_passed", label: "Inspection Passed" },
  { key: "interconnection_approved", label: "Interconnection Approved" },
  { key: "utility_pto", label: "Utility PTO" },
];

/** Funding status labels for display */
export const FUNDING_STATUS_LABELS = {
  preparing: "Preparing Documents",
  documents_ready: "Documents Ready",
  submitted: "Submitted to Funder",
  under_review: "Under Review",
  approved: "Approved",
  funded: "Funded",
  rejected: "Rejected",
};

/**
 * Create a new funding package for a project.
 *
 * @param {string} projectId
 * @param {string} type - "lease"|"ppa"|"loan"|"cash"|"pace"
 * @param {string} provider - Funding provider name
 * @param {number} [fundingAmount] - Optional funding amount
 * @returns {Promise<{success: boolean, packageId: string}>}
 */
export async function createFundingPackage(
  projectId,
  type,
  provider,
  fundingAmount,
) {
  const fn = httpsCallable(functions, "createFundingPackage");
  const result = await fn({ projectId, type, provider, fundingAmount });
  return result.data;
}

/**
 * Check if all required documents are ready for submission.
 *
 * @param {string} packageId
 * @returns {Promise<{success: boolean, ready: boolean, missing: string[], completed: string[]}>}
 */
export async function checkDocumentReadiness(packageId) {
  const fn = httpsCallable(functions, "checkDocumentReadiness");
  const result = await fn({ packageId });
  return result.data;
}

/**
 * Submit a funding package to the funder.
 *
 * @param {string} packageId
 * @returns {Promise<{success: boolean, status: string, taskId: string}>}
 */
export async function submitFunding(packageId) {
  const fn = httpsCallable(functions, "submitFunding");
  const result = await fn({ packageId });
  return result.data;
}

/**
 * Update the status of a funding package.
 *
 * @param {string} packageId
 * @param {string} status - New status
 * @param {Object} [details] - Optional details (approval info, rejection reason)
 * @returns {Promise<{success: boolean, status: string}>}
 */
export async function updateFundingStatus(packageId, status, details) {
  const fn = httpsCallable(functions, "updateFundingStatus");
  const result = await fn({ packageId, status, details });
  return result.data;
}

/**
 * Request payment for a completed milestone.
 *
 * @param {string} packageId
 * @param {string} milestone - Milestone name
 * @returns {Promise<{success: boolean, milestone: Object}>}
 */
export async function requestMilestonePayment(packageId, milestone) {
  const fn = httpsCallable(functions, "requestMilestonePayment");
  const result = await fn({ packageId, milestone });
  return result.data;
}

/**
 * Get all funding packages for a project.
 *
 * @param {string} projectId
 * @returns {Promise<{success: boolean, packages: Array}>}
 */
export async function getFundingByProject(projectId) {
  const fn = httpsCallable(functions, "getFundingByProject");
  const result = await fn({ projectId });
  return result.data;
}

/**
 * Generate a bankability documentation package.
 *
 * @param {string} projectId
 * @param {string} [fundingPackageId] - Optional linked funding package
 * @param {Object} [financials] - Optional financial model overrides
 * @returns {Promise<{success: boolean, bankabilityId: string}>}
 */
export async function generateBankabilityPackage(
  projectId,
  fundingPackageId,
  financials,
) {
  const fn = httpsCallable(functions, "generateBankabilityPackage");
  const result = await fn({ projectId, fundingPackageId, financials });
  return result.data;
}
