/**
 * EagleView Service -- Frontend interface to EagleView Integration
 *
 * Provides functions for ordering aerial imagery reports, checking
 * delivery status, and processing report data. All functions call
 * Firebase Cloud Functions via httpsCallable.
 *
 * EagleView report types:
 *   - SunSite: Basic solar measurements (~$25)
 *   - PremiumSunSite: Full shade analysis + bankable report (~$50)
 *   - InForm: Roof condition + measurements (~$40)
 */

import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "us-central1");

/**
 * Order an EagleView aerial report for a property.
 *
 * @param {string} projectId - The project this report is for
 * @param {string} address - Full street address of the property
 * @param {string} reportType - "SunSite", "PremiumSunSite", or "InForm"
 * @returns {Promise<{success: boolean, reportId: string, orderId: string, estimatedDelivery: string}>}
 */
export async function orderEagleviewReport(projectId, address, reportType) {
  const fn = httpsCallable(functions, "orderEagleviewReport");
  const result = await fn({ projectId, address, reportType });
  return result.data;
}

/**
 * Check the status of an EagleView order.
 *
 * @param {string} orderId - The EagleView order ID
 * @returns {Promise<{success: boolean, orderId: string, status: string, percentComplete?: number}>}
 */
export async function checkEagleviewStatus(orderId) {
  const fn = httpsCallable(functions, "checkEagleviewStatus");
  const result = await fn({ orderId });
  return result.data;
}

/**
 * Process a delivered EagleView report, parsing data into the survey.
 *
 * @param {string} orderId - The EagleView order ID
 * @param {Object} reportData - The delivered report data
 * @returns {Promise<{success: boolean, reportId: string, surveyUpdated: boolean}>}
 */
export async function processEagleviewDelivery(orderId, reportData) {
  const fn = httpsCallable(functions, "processEagleviewDelivery");
  const result = await fn({ orderId, reportData });
  return result.data;
}

/**
 * Get an EagleView report by its document ID.
 *
 * @param {string} reportId - The report document ID
 * @returns {Promise<{success: boolean, report: Object}>}
 */
export async function getEagleviewReport(reportId) {
  const fn = httpsCallable(functions, "getEagleviewReport");
  const result = await fn({ reportId });
  return result.data;
}

/**
 * Check whether an EagleView report is needed for a project.
 * Returns a recommendation based on existing data quality and financing type.
 *
 * @param {string} projectId - The project to evaluate
 * @returns {Promise<{success: boolean, needed: boolean, reason: string, recommendedType: string|null}>}
 */
export async function shouldOrderEagleview(projectId) {
  const fn = httpsCallable(functions, "shouldOrderEagleview");
  const result = await fn({ projectId });
  return result.data;
}
