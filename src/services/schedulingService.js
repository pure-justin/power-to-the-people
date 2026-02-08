/**
 * Scheduling Service -- Frontend interface for install scheduling
 *
 * Manages installer availability, schedule proposals, confirmations,
 * and reschedules. All functions call Firebase Cloud Functions via httpsCallable.
 *
 * @module schedulingService
 */
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "us-central1");

/**
 * Set installer availability for a specific date.
 *
 * @param {string} installerId - Installer's user ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array<{start: string, end: string}>} timeSlots - Available time windows
 * @param {number} crewSize - Number of crew members available
 * @param {Object} [options] - Optional: serviceAreaMiles, equipmentAvailable
 * @returns {Promise<{success: boolean, slotId: string}>}
 */
export async function setAvailability(
  installerId,
  date,
  timeSlots,
  crewSize,
  options = {},
) {
  const fn = httpsCallable(functions, "setAvailability");
  const result = await fn({
    installerId,
    date,
    timeSlots,
    crewSize,
    ...options,
  });
  return result.data;
}

/**
 * Get installer availability for a date range.
 *
 * @param {string} installerId - Installer's user ID
 * @param {string} startDate - Range start (YYYY-MM-DD)
 * @param {string} endDate - Range end (YYYY-MM-DD)
 * @returns {Promise<{success: boolean, slots: Array}>}
 */
export async function getAvailability(installerId, startDate, endDate) {
  const fn = httpsCallable(functions, "getAvailability");
  const result = await fn({ installerId, startDate, endDate });
  return result.data;
}

/**
 * Propose install schedule for a permitted project.
 * AI matches available crews to the project.
 *
 * @param {string} projectId - Project ID
 * @param {string} permitId - Approved permit ID
 * @param {Object} [preferences] - Optional: preferredDates[], preferredTimeOfDay
 * @returns {Promise<{success: boolean, scheduleId: string, proposedSlots: Array}>}
 */
export async function proposeSchedule(projectId, permitId, preferences = {}) {
  const fn = httpsCallable(functions, "proposeSchedule");
  const result = await fn({ projectId, permitId, ...preferences });
  return result.data;
}

/**
 * Confirm a proposed schedule as customer or installer.
 *
 * @param {string} scheduleId - Schedule ID to confirm
 * @param {"customer"|"installer"} confirmedBy - Who is confirming
 * @returns {Promise<{success: boolean, status: string}>}
 */
export async function confirmSchedule(scheduleId, confirmedBy) {
  const fn = httpsCallable(functions, "confirmSchedule");
  const result = await fn({ scheduleId, confirmedBy });
  return result.data;
}

/**
 * Reschedule an install with a reason.
 *
 * @param {string} scheduleId - Schedule to reschedule
 * @param {string} newDate - New date (YYYY-MM-DD)
 * @param {{start: string, end: string}} newTimeWindow - New time window
 * @param {string} reason - Reason for rescheduling
 * @returns {Promise<{success: boolean, status: string}>}
 */
export async function reschedule(scheduleId, newDate, newTimeWindow, reason) {
  const fn = httpsCallable(functions, "reschedule");
  const result = await fn({ scheduleId, newDate, newTimeWindow, reason });
  return result.data;
}

/**
 * Get full details of an install schedule.
 *
 * @param {string} scheduleId
 * @returns {Promise<{success: boolean, schedule: Object}>}
 */
export async function getInstallSchedule(scheduleId) {
  const fn = httpsCallable(functions, "getInstallSchedule");
  const result = await fn({ scheduleId });
  return result.data;
}

/**
 * Get installer's upcoming installs sorted by date.
 *
 * @param {string} installerId
 * @param {number} [limit=20]
 * @returns {Promise<{success: boolean, installs: Array}>}
 */
export async function getUpcomingInstalls(installerId, limit = 20) {
  const fn = httpsCallable(functions, "getUpcomingInstalls");
  const result = await fn({ installerId, limit });
  return result.data;
}

/**
 * Get a customer's scheduled installs.
 *
 * @param {string} customerId
 * @returns {Promise<{success: boolean, schedules: Array}>}
 */
export async function getCustomerSchedule(customerId) {
  const fn = httpsCallable(functions, "getCustomerSchedule");
  const result = await fn({ customerId });
  return result.data;
}
