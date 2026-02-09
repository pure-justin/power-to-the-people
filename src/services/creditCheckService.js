/**
 * Credit Check Service
 * Client-side wrapper for iSoftPull soft credit check Cloud Functions
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import app from "./firebase";

const functions = getFunctions(app, "us-central1");

/**
 * Run a soft credit check for a lead via iSoftPull
 * @param {Object} data - Credit check request data
 * @param {string} data.leadId - Lead ID in Firestore
 * @param {string} data.firstName - Applicant first name
 * @param {string} data.lastName - Applicant last name
 * @param {string} data.address - Street address
 * @param {string} data.city - City
 * @param {string} data.state - US state (name or abbreviation)
 * @param {string} data.zip - 5-digit zip code
 * @param {string} [data.middleName] - Middle name (optional)
 * @param {string} [data.email] - Email address (optional)
 * @param {string} [data.phone] - Phone number (optional)
 * @param {string} [data.ssn] - SSN, 9 digits no dashes (optional)
 * @param {string} [data.dateOfBirth] - DOB in mm/dd/yyyy format (optional)
 * @returns {Promise<{success: boolean, creditCheck: Object}>} Credit check result with report links
 */
export async function runSoftCreditCheck(data) {
  try {
    const runSoftCreditCheckFunc = httpsCallable(
      functions,
      "runSoftCreditCheck",
    );
    const result = await runSoftCreditCheckFunc(data);
    return result.data;
  } catch (error) {
    console.error("Error running credit check:", error);
    throw error;
  }
}

/**
 * Get the most recent credit check result for a lead
 * @param {string} leadId - Lead ID in Firestore
 * @returns {Promise<{success: boolean, creditCheck: Object|null}>} Most recent credit check or null
 */
export async function getCreditCheckResult(leadId) {
  try {
    const getCreditCheckResultFunc = httpsCallable(
      functions,
      "getCreditCheckResult",
    );
    const result = await getCreditCheckResultFunc({ leadId });
    return result.data;
  } catch (error) {
    console.error("Error getting credit check result:", error);
    throw error;
  }
}

/**
 * Get aggregate credit check statistics
 * @returns {Promise<{success: boolean, stats: {totalChecks: number, passed: number, failed: number, passRate: number, checksThisMonth: number, statusBreakdown: Object}}>}
 */
export async function getCreditCheckStats() {
  try {
    const getCreditCheckStatsFunc = httpsCallable(
      functions,
      "getCreditCheckStats",
    );
    const result = await getCreditCheckStatsFunc();
    return result.data;
  } catch (error) {
    console.error("Error getting credit check stats:", error);
    throw error;
  }
}

/**
 * Credit check status labels for display
 */
export const CREDIT_CHECK_STATUS = {
  passed: { label: "Passed", color: "green", description: "Pre-qualified" },
  failed: {
    label: "Failed",
    color: "red",
    description: "Did not pre-qualify",
  },
  error: {
    label: "Error",
    color: "yellow",
    description: "Check could not be completed",
  },
  "no-hit": {
    label: "No Hit",
    color: "orange",
    description: "No credit file found",
  },
  freeze: {
    label: "Frozen",
    color: "blue",
    description: "Credit file is frozen",
  },
};

/**
 * Get a human-readable status label for a credit check status
 * @param {string} status - Credit check status
 * @returns {{label: string, color: string, description: string}}
 */
export function getCreditCheckStatusInfo(status) {
  return (
    CREDIT_CHECK_STATUS[status] || {
      label: "Unknown",
      color: "gray",
      description: "Status unknown",
    }
  );
}
