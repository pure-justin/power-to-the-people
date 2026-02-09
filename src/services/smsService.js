/**
 * SMS Service
 * Client-side wrapper for SMS notification functions
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import app from "./firebase";

const functions = getFunctions(app, "us-central1");

/**
 * Send a custom SMS message (admin only)
 * @param {string} phone - Phone number (format: +1 or 10 digits)
 * @param {string} message - Message text (max 160 characters)
 * @returns {Promise<boolean>} Success status
 */
export async function sendCustomSMS(phone, message) {
  try {
    const sendCustomSMSFunc = httpsCallable(functions, "sendCustomSMS");
    const result = await sendCustomSMSFunc({ phone, message });
    return result.data.success;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
}

/**
 * Send bulk SMS to multiple recipients (admin only)
 * @param {string[]} recipients - Array of phone numbers (max 100)
 * @param {string} message - Message text (max 160 characters)
 * @returns {Promise<{total: number, successful: number, failed: number}>}
 */
export async function sendBulkSMS(recipients, message) {
  try {
    const sendBulkSMSFunc = httpsCallable(functions, "sendBulkSMS");
    const result = await sendBulkSMSFunc({ recipients, message });
    return result.data;
  } catch (error) {
    console.error("Error sending bulk SMS:", error);
    throw error;
  }
}

/**
 * Get SMS usage statistics (admin only)
 * @returns {Promise<{total: number, successful: number, failed: number, estimatedCost: string, period: string}>}
 */
export async function getSmsStats() {
  try {
    const getSmsStatsFunc = httpsCallable(functions, "getSmsStats");
    const result = await getSmsStatsFunc();
    return result.data;
  } catch (error) {
    console.error("Error getting SMS stats:", error);
    throw error;
  }
}

/**
 * SMS Templates for quick use
 */
export const SMS_TEMPLATES = {
  enrollmentConfirmation: (name, projectId) =>
    `Hi ${name}! Thanks for enrolling in Power to the People. Your application ${projectId} is being reviewed. Track status: https://power-to-the-people-vpp.web.app/project/${projectId}`,

  enrollmentApproved: (name, savingsAmount) =>
    `Great news ${name}! Your solar application is approved. You'll save ~$${savingsAmount}/month. Your installer will contact you within 48 hours to schedule.`,

  referralReward: (name, amount, friendName) =>
    `${name}, you earned $${amount}! ${friendName} enrolled using your referral code. Payment processing within 7 days.`,

  installationScheduled: (name, date, installer) =>
    `${name}, your solar installation is scheduled for ${date} with ${installer}. They'll contact you 24hrs before arrival.`,

  paymentReminder: (name, amount, dueDate) =>
    `Hi ${name}, reminder: $${amount} payment due ${dueDate}. Pay at: https://power-to-the-people-vpp.web.app/portal`,
};

/**
 * Update SMS notification preferences for a project
 * @param {string} projectId - Project ID
 * @param {boolean} smsOptIn - Whether to opt in to SMS
 * @returns {Promise<{success: boolean, smsOptIn: boolean}>}
 */
export async function updateSmsPreferences(projectId, smsOptIn) {
  try {
    const updateFunc = httpsCallable(functions, "updateSmsPreferences");
    const result = await updateFunc({ projectId, smsOptIn });
    return result.data;
  } catch (error) {
    console.error("Error updating SMS preferences:", error);
    throw error;
  }
}

/**
 * Get SMS message history for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<{messages: Array, smsOptIn: boolean}>}
 */
export async function getProjectSmsHistory(projectId) {
  try {
    const getHistoryFunc = httpsCallable(functions, "getProjectSmsHistory");
    const result = await getHistoryFunc({ projectId });
    return result.data;
  } catch (error) {
    console.error("Error getting SMS history:", error);
    throw error;
  }
}

/**
 * Format phone number to E.164 format (+1 for US)
 * @param {string} phone - Phone number in any format
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phone) {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If 10 digits, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // If already has +, return as is
  if (phone.startsWith("+")) {
    return phone;
  }

  // Default: assume it needs +1
  return `+1${digits}`;
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export function isValidPhoneNumber(phone) {
  const formatted = formatPhoneNumber(phone);
  // US phone numbers: +1 followed by 10 digits
  return /^\+1\d{10}$/.test(formatted);
}

/**
 * Validate message length
 * @param {string} message - Message text
 * @returns {boolean} True if valid (≤160 characters)
 */
export function isValidMessageLength(message) {
  return message && message.length > 0 && message.length <= 160;
}
