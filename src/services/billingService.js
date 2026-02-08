/**
 * Billing Service
 * Client-side wrapper for Stripe subscription Cloud Functions
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import app from "./firebase";

const functions = getFunctions(app, "us-central1");

/**
 * Create a Stripe Checkout session for subscription signup
 * @param {string} tier - Subscription tier: "starter", "professional", or "enterprise"
 * @returns {Promise<Object>} { success, data: { url }, error }
 */
export async function createCheckoutSession(tier) {
  try {
    const callable = httpsCallable(functions, "createCheckoutSession");
    const result = await callable({ tier });
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Create a Stripe Billing Portal session for self-service management
 * @returns {Promise<Object>} { success, data: { url }, error }
 */
export async function createBillingPortalSession() {
  try {
    const callable = httpsCallable(functions, "createBillingPortalSession");
    const result = await callable();
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get current subscription status for the authenticated user
 * @returns {Promise<Object>} { success, data: { tier, status, limits, usage, nextBilling }, error }
 */
export async function getSubscriptionStatus() {
  try {
    const callable = httpsCallable(functions, "getSubscriptionStatus");
    const result = await callable();
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update subscription tier (upgrade or downgrade with proration)
 * @param {string} newTier - Target tier: "starter", "professional", or "enterprise"
 * @returns {Promise<Object>} { success, data, error }
 */
export async function updateSubscription(newTier) {
  try {
    const callable = httpsCallable(functions, "updateSubscription");
    const result = await callable({ newTier });
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error updating subscription:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Cancel subscription
 * @param {boolean} [immediate=false] - If true, cancel immediately. If false, cancel at end of billing period.
 * @returns {Promise<Object>} { success, data, error }
 */
export async function cancelSubscription(immediate = false) {
  try {
    const callable = httpsCallable(functions, "cancelSubscription");
    const result = await callable({ immediate });
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return { success: false, data: null, error: error.message };
  }
}
