/**
 * Document Service -- Frontend interface
 *
 * Replaces PandaDoc with zero-cost HTML->PDF generation,
 * ESIGN Act compliant e-signatures, and full audit trail.
 *
 * Document types: proposal, contract, change_order, permit_package,
 * funding_package, completion_certificate, interconnection_application,
 * tax_credit_certificate
 *
 * All functions call Firebase Cloud Functions via httpsCallable.
 */
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "us-central1");

// ─── GENERATION ───────────────────────────────────────────────────────────────

/**
 * Generate a document from project data + template.
 * Gathers project/design/survey/permit data automatically.
 *
 * @param {string} projectId - Project to generate document for
 * @param {string} type - Document type (proposal, contract, permit_package, etc.)
 * @param {object} [customData] - Optional overrides for template variables
 * @returns {Promise<{success: boolean, documentId: string, type: string}>}
 */
export async function generateDocument(projectId, type, customData = {}) {
  const fn = httpsCallable(functions, "generateDocument");
  const result = await fn({ projectId, type, customData });
  return result.data;
}

// ─── RETRIEVAL ────────────────────────────────────────────────────────────────

/**
 * Get a single document by ID with full metadata and audit trail.
 * @param {string} documentId
 * @returns {Promise<{success: boolean, document: object}>}
 */
export async function getDocument(documentId) {
  const fn = httpsCallable(functions, "getDocument");
  const result = await fn({ documentId });
  return result.data;
}

/**
 * Get all documents for a project, ordered by creation date.
 * @param {string} projectId
 * @returns {Promise<{success: boolean, documents: object[]}>}
 */
export async function getDocumentsByProject(projectId) {
  const fn = httpsCallable(functions, "getDocumentsByProject");
  const result = await fn({ projectId });
  return result.data;
}

// ─── SENDING ──────────────────────────────────────────────────────────────────

/**
 * Send a document to recipients for viewing/signing.
 * Records delivery in the document's audit trail.
 *
 * @param {string} documentId
 * @param {Array<{email: string, name: string, role: string}>} recipients
 * @returns {Promise<{success: boolean}>}
 */
export async function sendDocument(documentId, recipients) {
  const fn = httpsCallable(functions, "sendDocument");
  const result = await fn({ documentId, recipients });
  return result.data;
}

// ─── VIEWING ──────────────────────────────────────────────────────────────────

/**
 * Record that someone viewed a document.
 * Used for tracking engagement before signing.
 *
 * @param {string} documentId
 * @returns {Promise<{success: boolean, document: object}>}
 */
export async function viewDocument(documentId) {
  const fn = httpsCallable(functions, "viewDocument");
  const result = await fn({ documentId });
  return result.data;
}

// ─── SIGNING ──────────────────────────────────────────────────────────────────

/**
 * Apply an e-signature to a document.
 * ESIGN Act compliant: captures consent, IP address, user agent, timestamp.
 *
 * @param {string} documentId
 * @param {string} signatureImageUrl - URL or base64 of signature image
 * @param {string} signerRole - Role of signer (customer, installer, engineer, admin)
 * @param {boolean} consentGiven - Must be true for ESIGN compliance
 * @param {string} [ipAddress] - Signer's IP (captured server-side if omitted)
 * @param {string} [userAgent] - Browser user agent
 * @returns {Promise<{success: boolean, allSigned: boolean}>}
 */
export async function signDocument(
  documentId,
  signatureImageUrl,
  signerRole,
  consentGiven,
  ipAddress,
  userAgent,
) {
  const fn = httpsCallable(functions, "signDocument");
  const result = await fn({
    documentId,
    signatureImageUrl,
    signerRole,
    consentGiven,
    ipAddress,
    userAgent,
  });
  return result.data;
}

// ─── VOIDING ──────────────────────────────────────────────────────────────────

/**
 * Void a document (invalidate it permanently).
 * Cannot be undone. Document status changes to "voided".
 *
 * @param {string} documentId
 * @param {string} reason - Reason for voiding
 * @returns {Promise<{success: boolean}>}
 */
export async function voidDocument(documentId, reason) {
  const fn = httpsCallable(functions, "voidDocument");
  const result = await fn({ documentId, reason });
  return result.data;
}

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

/**
 * Save or update a document template (admin only).
 *
 * @param {object} params
 * @param {string} [params.templateId] - Existing template ID to update (omit to create)
 * @param {string} params.name - Template name
 * @param {string} params.type - Document type this template is for
 * @param {string} [params.customHtml] - Custom HTML template content
 * @returns {Promise<{success: boolean, templateId: string}>}
 */
export async function saveDocumentTemplate(params) {
  const fn = httpsCallable(functions, "saveDocumentTemplate");
  const result = await fn(params);
  return result.data;
}

// ─── STATS ────────────────────────────────────────────────────────────────────

/**
 * Get document statistics (overall or per project).
 *
 * @param {string} [projectId] - Filter to a specific project
 * @returns {Promise<{success: boolean, stats: object}>}
 */
export async function getDocumentStats(projectId) {
  const fn = httpsCallable(functions, "getDocumentStats");
  const result = await fn({ projectId });
  return result.data;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

/** All supported document types */
export const DOCUMENT_TYPES = [
  { value: "proposal", label: "Proposal" },
  { value: "contract", label: "Contract" },
  { value: "change_order", label: "Change Order" },
  { value: "permit_package", label: "Permit Package" },
  { value: "funding_package", label: "Funding Package" },
  { value: "completion_certificate", label: "Completion Certificate" },
  {
    value: "interconnection_application",
    label: "Interconnection Application",
  },
  { value: "tax_credit_certificate", label: "Tax Credit Certificate" },
];

/** Document status display config */
export const DOCUMENT_STATUS = {
  draft: { label: "Draft", color: "gray" },
  sent: { label: "Sent", color: "blue" },
  viewed: { label: "Viewed", color: "yellow" },
  partially_signed: { label: "Partially Signed", color: "orange" },
  completed: { label: "Completed", color: "green" },
  voided: { label: "Voided", color: "red" },
};
