/**
 * Invoice Service
 * Client-side wrapper for Mercury invoice Cloud Functions
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import app from "./firebase";

const functions = getFunctions(app, "us-central1");

/**
 * Create a new Mercury invoice
 * @param {Object} data - Invoice data
 * @param {string} data.leadId - Lead/customer ID
 * @param {number} data.amount - Total amount in dollars
 * @param {Array} data.lineItems - Array of { description, amount }
 * @param {string} data.dueDate - Due date (ISO string)
 * @param {string} data.memo - Optional memo/notes
 * @returns {Promise<Object>} Created invoice data
 */
export async function createInvoice(data) {
  try {
    const createMercuryInvoiceFunc = httpsCallable(
      functions,
      "createMercuryInvoice",
    );
    const result = await createMercuryInvoiceFunc(data);
    return result.data;
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw error;
  }
}

/**
 * Get a single invoice by ID
 * @param {string} invoiceId - Mercury invoice ID
 * @returns {Promise<Object>} Invoice data
 */
export async function getInvoice(invoiceId) {
  try {
    const getMercuryInvoiceFunc = httpsCallable(functions, "getMercuryInvoice");
    const result = await getMercuryInvoiceFunc({ invoiceId });
    return result.data;
  } catch (error) {
    console.error("Error getting invoice:", error);
    throw error;
  }
}

/**
 * List invoices with optional filters
 * @param {Object} filters - Optional filters (status, leadId, etc.)
 * @returns {Promise<Array>} Array of invoice objects
 */
export async function listInvoices(filters = {}) {
  try {
    const listMercuryInvoicesFunc = httpsCallable(
      functions,
      "listMercuryInvoices",
    );
    const result = await listMercuryInvoicesFunc(filters);
    return result.data;
  } catch (error) {
    console.error("Error listing invoices:", error);
    throw error;
  }
}

/**
 * Cancel an invoice
 * @param {string} invoiceId - Mercury invoice ID
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelInvoice(invoiceId) {
  try {
    const cancelMercuryInvoiceFunc = httpsCallable(
      functions,
      "cancelMercuryInvoice",
    );
    const result = await cancelMercuryInvoiceFunc({ invoiceId });
    return result.data;
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    throw error;
  }
}
