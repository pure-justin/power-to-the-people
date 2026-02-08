/**
 * Tax Credit Marketplace Service -- Frontend interface
 *
 * IRA Section 6418 transferable tax credit marketplace.
 * All functions call Firebase Cloud Functions via httpsCallable.
 *
 * Flow: Audit -> Insure -> List -> Offer -> Transfer
 */
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "us-central1");

// ─── AUDIT ──────────────────────────────────────────────────────────────────────

/**
 * Create a full credit audit for a project.
 * Triggers AI task to verify FEOC compliance, domestic content,
 * energy community eligibility, and documentation completeness.
 *
 * @param {string} projectId - Project to audit
 * @returns {Promise<{success: boolean, auditId: string}>}
 */
export async function auditProjectCredits(projectId) {
  const fn = httpsCallable(functions, "auditProjectCredits");
  const result = await fn({ projectId });
  return result.data;
}

/**
 * Get a full audit record with all checks.
 * @param {string} auditId
 * @returns {Promise<{success: boolean, audit: object}>}
 */
export async function getAudit(auditId) {
  const fn = httpsCallable(functions, "getAudit");
  const result = await fn({ auditId });
  return result.data;
}

/**
 * Get all audits for a project.
 * @param {string} projectId
 * @returns {Promise<{success: boolean, audits: Array}>}
 */
export async function getAuditsByProject(projectId) {
  const fn = httpsCallable(functions, "getAuditsByProject");
  const result = await fn({ projectId });
  return result.data;
}

/**
 * Certify an audit after all checks pass.
 * Admin/system action that generates a certification record.
 * @param {string} auditId
 * @returns {Promise<{success: boolean, auditId: string, certification: object}>}
 */
export async function certifyAudit(auditId) {
  const fn = httpsCallable(functions, "certifyAudit");
  const result = await fn({ auditId });
  return result.data;
}

/**
 * Add an individual check result to an audit.
 * @param {string} auditId
 * @param {object} checkData - { checkType, status, evidence?, notes? }
 * @returns {Promise<{success: boolean}>}
 */
export async function addAuditCheck(auditId, checkData) {
  const fn = httpsCallable(functions, "addAuditCheck");
  const result = await fn({ auditId, ...checkData });
  return result.data;
}

// ─── INSURANCE ──────────────────────────────────────────────────────────────────

/**
 * Run AI risk assessment on an audit.
 * Returns risk score and creates insurance assessment record.
 * @param {string} auditId
 * @returns {Promise<{success: boolean, insuranceId: string, riskScore: number, overallRisk: string}>}
 */
export async function assessCreditRisk(auditId) {
  const fn = httpsCallable(functions, "assessCreditRisk");
  const result = await fn({ auditId });
  return result.data;
}

/**
 * Generate insurance quote based on risk assessment.
 * @param {string} auditId
 * @returns {Promise<{success: boolean, insuranceId: string, quote: object}>}
 */
export async function quoteCreditInsurance(auditId) {
  const fn = httpsCallable(functions, "quoteCreditInsurance");
  const result = await fn({ auditId });
  return result.data;
}

/**
 * Activate insurance coverage after payment.
 * @param {string} insuranceId
 * @param {string} paymentRef - Payment reference
 * @returns {Promise<{success: boolean}>}
 */
export async function activateInsurance(insuranceId, paymentRef) {
  const fn = httpsCallable(functions, "activateInsurance");
  const result = await fn({ insuranceId, paymentRef });
  return result.data;
}

/**
 * Get insurance details.
 * @param {string} insuranceId
 * @returns {Promise<{success: boolean, insurance: object}>}
 */
export async function getInsurance(insuranceId) {
  const fn = httpsCallable(functions, "getInsurance");
  const result = await fn({ insuranceId });
  return result.data;
}

// ─── MARKETPLACE ────────────────────────────────────────────────────────────────

/**
 * List a certified credit for sale on the marketplace.
 * @param {string} auditId - Must be a certified audit
 * @param {object} listingDetails - { askingPrice, discountRate?, minimumBid?, auctionStyle, expiresAt? }
 * @returns {Promise<{success: boolean, listingId: string}>}
 */
export async function createCreditListing(auditId, listingDetails) {
  const fn = httpsCallable(functions, "createCreditListing");
  const result = await fn({ auditId, listingDetails });
  return result.data;
}

/**
 * Search marketplace listings. Public — no auth required.
 * @param {object} filters - { creditType?, state?, minSize?, maxSize?, minDiscount?, maxDiscount?, verificationLevel?, limit? }
 * @returns {Promise<{success: boolean, listings: Array, count: number}>}
 */
export async function searchCreditListings(filters = {}) {
  const fn = httpsCallable(functions, "searchCreditListings");
  const result = await fn({ filters });
  return result.data;
}

/**
 * Get full listing detail with audit and insurance info.
 * @param {string} listingId
 * @returns {Promise<{success: boolean, listing: object, audit: object, insurance: object|null}>}
 */
export async function getCreditListing(listingId) {
  const fn = httpsCallable(functions, "getCreditListing");
  const result = await fn({ listingId });
  return result.data;
}

/**
 * Make an offer on a credit listing.
 * @param {string} listingId
 * @param {number} offerAmount - Cash consideration per Section 6418
 * @param {string} [message] - Optional message to seller
 * @returns {Promise<{success: boolean, offerId: string}>}
 */
export async function makeOffer(listingId, offerAmount, message) {
  const fn = httpsCallable(functions, "makeOffer");
  const result = await fn({ listingId, offerAmount, message });
  return result.data;
}

/**
 * Respond to an offer: accept, reject, or counter.
 * @param {string} listingId
 * @param {string} offerId
 * @param {string} response - "accepted", "rejected", or "countered"
 * @param {number} [counterAmount] - Required if response is "countered"
 * @returns {Promise<{success: boolean}>}
 */
export async function respondToOffer(
  listingId,
  offerId,
  response,
  counterAmount,
) {
  const fn = httpsCallable(functions, "respondToOffer");
  const result = await fn({ listingId, offerId, response, counterAmount });
  return result.data;
}

/**
 * Initiate credit transfer (escrow + documents).
 * @param {string} listingId
 * @param {string} offerId - Must be an accepted offer
 * @returns {Promise<{success: boolean, transactionId: string}>}
 */
export async function initiateCreditTransfer(listingId, offerId) {
  const fn = httpsCallable(functions, "initiateCreditTransfer");
  const result = await fn({ listingId, offerId });
  return result.data;
}

/**
 * Complete the credit transfer (admin).
 * @param {string} transactionId
 * @returns {Promise<{success: boolean}>}
 */
export async function completeCreditTransfer(transactionId) {
  const fn = httpsCallable(functions, "completeCreditTransfer");
  const result = await fn({ transactionId });
  return result.data;
}

/**
 * Get transaction history.
 * @param {object} [filters] - { sellerId?, buyerId?, status?, limit? }
 * @returns {Promise<{success: boolean, transactions: Array, count: number}>}
 */
export async function getCreditTransactions(filters = {}) {
  const fn = httpsCallable(functions, "getCreditTransactions");
  const result = await fn({ filters });
  return result.data;
}

/**
 * Get marketplace statistics (admin).
 * @returns {Promise<{success: boolean, stats: object}>}
 */
export async function getCreditMarketStats() {
  const fn = httpsCallable(functions, "getCreditMarketStats");
  const result = await fn();
  return result.data;
}
