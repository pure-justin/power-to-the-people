"use strict";
/**
 * Solar CRM Payments - Cloud Functions
 *
 * Stripe subscription management, usage metering, checkout, and billing portal.
 * Covers: SaaS subscriptions, per-API-call billing, lead billing, compliance checks.
 *
 * @module payments
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionStatus = exports.createBillingPortalSession = exports.createCheckoutSession = exports.stripeWebhook = exports.cancelSubscription = exports.updateSubscription = exports.createSubscription = exports.SOLAR_TIERS = exports.FREE_TIER_LIMITS = exports.STRIPE_PAYGO_PRICE_IDS = void 0;
exports.recordUsage = recordUsage;
exports.checkUsageLimit = checkUsageLimit;
exports.recordAndCheckUsage = recordAndCheckUsage;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// ─── Solar Platform Config ─────────────────────────────────────────────────────
const STRIPE_SECRET_KEY = ((_a = functions.config().stripe) === null || _a === void 0 ? void 0 : _a.secret_key) || "";
const STRIPE_WEBHOOK_SECRET = ((_b = functions.config().stripe) === null || _b === void 0 ? void 0 : _b.webhook_secret) || "";
const stripe = STRIPE_SECRET_KEY
    ? new stripe_1.default(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" })
    : null;
// ─── Pre-Created Stripe Price IDs (Test Mode) ──────────────────────────────────
/** @const STRIPE_PRICE_IDS - Maps subscription tier names to Stripe recurring price IDs (test mode) */
const STRIPE_PRICE_IDS = {
    starter: "price_1SyMrCQhgZdyZ7qRyWDGrr9U",
    professional: "price_1SyMrEQhgZdyZ7qRYLfqv0Ds",
    enterprise: "price_1SyMrFQhgZdyZ7qRcQk9fAqh",
};
/** @const STRIPE_PAYGO_PRICE_IDS - Maps pay-as-you-go product names to Stripe one-off price IDs (test mode) */
exports.STRIPE_PAYGO_PRICE_IDS = {
    solar_lead: "price_1SyMrGQhgZdyZ7qRixVanOLJ", // $5/lead
    api_call_pack: "price_1SyMrHQhgZdyZ7qRfeQQUUI6", // $25/1000 calls
    compliance_check: "price_1SyMrIQhgZdyZ7qRZKDhbgKL", // $2/check
};
/** @const FREE_TIER_LIMITS - Usage limits for users without a paid subscription */
exports.FREE_TIER_LIMITS = {
    leads_per_month: 5,
    api_calls_per_month: 50,
    compliance_checks_per_month: 3,
    equipment_lookups_per_month: 10,
    solar_estimates_per_month: 1,
    marketplace_listings_per_month: 1,
};
/** @const SOLAR_TIERS - Subscription tier definitions with pricing, features, and usage limits */
exports.SOLAR_TIERS = {
    starter: {
        name: "Starter",
        price_monthly: 7900, // $79/mo in cents
        features: ["50 leads/month", "Basic compliance checks", "Email support"],
        limits: {
            leads_per_month: 50,
            api_calls_per_month: 1000,
            compliance_checks_per_month: 25,
            equipment_lookups_per_month: 100,
            solar_estimates_per_month: 10,
            marketplace_listings_per_month: 10,
        },
    },
    professional: {
        name: "Professional",
        price_monthly: 14900, // $149/mo
        features: [
            "200 leads/month",
            "Full compliance suite",
            "Priority support",
            "API access",
        ],
        limits: {
            leads_per_month: 200,
            api_calls_per_month: 10000,
            compliance_checks_per_month: 200,
            equipment_lookups_per_month: -1, // unlimited
            solar_estimates_per_month: 100,
            marketplace_listings_per_month: -1, // unlimited
        },
    },
    enterprise: {
        name: "Enterprise",
        price_monthly: 29900, // $299/mo
        features: [
            "Unlimited leads",
            "Full compliance suite",
            "Dedicated support",
            "Full API access",
            "Custom integrations",
        ],
        limits: {
            leads_per_month: -1, // unlimited
            api_calls_per_month: 100000,
            compliance_checks_per_month: -1, // unlimited
            equipment_lookups_per_month: -1, // unlimited
            solar_estimates_per_month: -1, // unlimited
            marketplace_listings_per_month: -1, // unlimited
        },
    },
};
// ─── Subscription Management ───────────────────────────────────────────────────
/**
 * Create a new Stripe subscription for an authenticated user
 *
 * @function createSubscription
 * @type onCall
 * @auth firebase
 * @input {{ tier: TierKey, payment_method_id: string }}
 * @output {{ success: boolean, subscriptionId: string, tier: string, status: string }}
 * @errors unauthenticated, failed-precondition, invalid-argument, already-exists, internal
 * @billing none
 * @rateLimit subscription_tier
 * @firestore subscriptions
 */
exports.createSubscription = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    if (!stripe) {
        throw new functions.https.HttpsError("failed-precondition", "Stripe is not configured");
    }
    const { tier, payment_method_id } = data;
    if (!exports.SOLAR_TIERS[tier]) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid tier: ${tier}. Must be one of: ${Object.keys(exports.SOLAR_TIERS).join(", ")}`);
    }
    const db = admin.firestore();
    const userId = context.auth.uid;
    const userEmail = context.auth.token.email || `user_${userId}@solar.app`;
    try {
        // Check for existing subscription
        const existingSub = await db
            .collection("subscriptions")
            .where("userId", "==", userId)
            .where("status", "in", ["active", "trialing"])
            .limit(1)
            .get();
        if (!existingSub.empty) {
            throw new functions.https.HttpsError("already-exists", "User already has an active subscription. Use updateSubscription to change tiers.");
        }
        // Create or retrieve Stripe customer
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });
        let customer;
        if (customers.data.length > 0) {
            customer = customers.data[0];
        }
        else {
            customer = await stripe.customers.create({
                email: userEmail,
                metadata: { firebase_uid: userId },
            });
        }
        // Attach payment method
        await stripe.paymentMethods.attach(payment_method_id, {
            customer: customer.id,
        });
        await stripe.customers.update(customer.id, {
            invoice_settings: {
                default_payment_method: payment_method_id,
            },
        });
        // Create subscription using pre-created price ID
        const tierConfig = exports.SOLAR_TIERS[tier];
        const priceId = STRIPE_PRICE_IDS[tier];
        if (!priceId) {
            throw new functions.https.HttpsError("internal", `No Stripe price configured for tier: ${tier}`);
        }
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            metadata: {
                firebase_uid: userId,
                tier,
            },
            expand: ["latest_invoice.payment_intent"],
        });
        // Save to Firestore
        await db
            .collection("subscriptions")
            .doc(subscription.id)
            .set({
            userId,
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
            tier,
            status: subscription.status,
            currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
            currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
            limits: tierConfig.limits,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        });
        return {
            success: true,
            subscriptionId: subscription.id,
            tier,
            status: subscription.status,
        };
    }
    catch (error) {
        console.error("Create subscription error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to create subscription");
    }
});
/**
 * Update an existing subscription tier (upgrade or downgrade with proration)
 *
 * @function updateSubscription
 * @type onCall
 * @auth firebase
 * @input {{ new_tier: TierKey }}
 * @output {{ success: boolean, previousTier: string, newTier: string }}
 * @errors unauthenticated, failed-precondition, invalid-argument, not-found, internal
 * @billing none
 * @rateLimit subscription_tier
 * @firestore subscriptions
 */
exports.updateSubscription = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    if (!stripe) {
        throw new functions.https.HttpsError("failed-precondition", "Stripe is not configured");
    }
    const { new_tier } = data;
    if (!exports.SOLAR_TIERS[new_tier]) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid tier: ${new_tier}`);
    }
    const db = admin.firestore();
    const userId = context.auth.uid;
    // Find active subscription
    const subSnapshot = await db
        .collection("subscriptions")
        .where("userId", "==", userId)
        .where("status", "in", ["active", "trialing"])
        .limit(1)
        .get();
    if (subSnapshot.empty) {
        throw new functions.https.HttpsError("not-found", "No active subscription found");
    }
    const subDoc = subSnapshot.docs[0];
    const subData = subDoc.data();
    try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subData.stripeSubscriptionId);
        // Use pre-created price ID for the new tier
        const tierConfig = exports.SOLAR_TIERS[new_tier];
        const newPriceId = STRIPE_PRICE_IDS[new_tier];
        if (!newPriceId) {
            throw new functions.https.HttpsError("internal", `No Stripe price configured for tier: ${new_tier}`);
        }
        await stripe.subscriptions.update(subData.stripeSubscriptionId, {
            items: [
                {
                    id: stripeSubscription.items.data[0].id,
                    price: newPriceId,
                },
            ],
            proration_behavior: "create_prorations",
            metadata: { tier: new_tier },
        });
        // Update Firestore
        await subDoc.ref.update({
            tier: new_tier,
            limits: tierConfig.limits,
            updatedAt: admin.firestore.Timestamp.now(),
        });
        return {
            success: true,
            previousTier: subData.tier,
            newTier: new_tier,
        };
    }
    catch (error) {
        console.error("Update subscription error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to update subscription");
    }
});
/**
 * Cancel a user's active subscription immediately or at period end
 *
 * @function cancelSubscription
 * @type onCall
 * @auth firebase
 * @input {{ immediate?: boolean }}
 * @output {{ success: boolean, immediate: boolean, message: string }}
 * @errors unauthenticated, failed-precondition, not-found, internal
 * @billing none
 * @rateLimit subscription_tier
 * @firestore subscriptions
 */
exports.cancelSubscription = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    if (!stripe) {
        throw new functions.https.HttpsError("failed-precondition", "Stripe is not configured");
    }
    const db = admin.firestore();
    const userId = context.auth.uid;
    const subSnapshot = await db
        .collection("subscriptions")
        .where("userId", "==", userId)
        .where("status", "in", ["active", "trialing"])
        .limit(1)
        .get();
    if (subSnapshot.empty) {
        throw new functions.https.HttpsError("not-found", "No active subscription found");
    }
    const subDoc = subSnapshot.docs[0];
    const subData = subDoc.data();
    try {
        if (data === null || data === void 0 ? void 0 : data.immediate) {
            // Cancel immediately
            await stripe.subscriptions.cancel(subData.stripeSubscriptionId);
            await subDoc.ref.update({
                status: "canceled",
                canceledAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
            });
        }
        else {
            // Cancel at period end (grace period)
            await stripe.subscriptions.update(subData.stripeSubscriptionId, {
                cancel_at_period_end: true,
            });
            await subDoc.ref.update({
                cancelAtPeriodEnd: true,
                updatedAt: admin.firestore.Timestamp.now(),
            });
        }
        return {
            success: true,
            immediate: (data === null || data === void 0 ? void 0 : data.immediate) || false,
            message: (data === null || data === void 0 ? void 0 : data.immediate)
                ? "Subscription canceled immediately"
                : "Subscription will cancel at end of billing period",
        };
    }
    catch (error) {
        console.error("Cancel subscription error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to cancel subscription");
    }
});
// ─── Usage Metering ────────────────────────────────────────────────────────────
/**
 * Record API usage for a user by incrementing the monthly usage counter
 *
 * @function recordUsage
 * @type helper
 * @auth none
 * @input {{ userId: string, usageType: "api_call" | "lead" | "compliance_check" | "equipment_lookup" | "solar_estimate" | "marketplace_listing", quantity?: number }}
 * @output void
 * @errors none
 * @billing none
 * @rateLimit none
 * @firestore usage_records
 */
async function recordUsage(userId, usageType, quantity = 1) {
    const db = admin.firestore();
    // Get current month key
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const usageRef = db.collection("usage_records").doc(`${userId}_${monthKey}`);
    await usageRef.set({
        userId,
        month: monthKey,
        [`${usageType}_count`]: admin.firestore.FieldValue.increment(quantity),
        lastUpdated: admin.firestore.Timestamp.now(),
    }, { merge: true });
}
const USAGE_TYPE_TO_COUNT_KEY = {
    leads_per_month: "lead_count",
    api_calls_per_month: "api_call_count",
    compliance_checks_per_month: "compliance_check_count",
    equipment_lookups_per_month: "equipment_lookup_count",
    solar_estimates_per_month: "solar_estimate_count",
    marketplace_listings_per_month: "marketplace_listing_count",
};
async function checkUsageLimit(userId, usageType) {
    var _a, _b, _c, _d;
    const db = admin.firestore();
    // Get subscription
    const subSnapshot = await db
        .collection("subscriptions")
        .where("userId", "==", userId)
        .where("status", "in", ["active", "trialing"])
        .limit(1)
        .get();
    let limit;
    if (subSnapshot.empty) {
        limit = (_a = exports.FREE_TIER_LIMITS[usageType]) !== null && _a !== void 0 ? _a : 0;
    }
    else {
        const subData = subSnapshot.docs[0].data();
        limit = (_c = (_b = subData.limits) === null || _b === void 0 ? void 0 : _b[usageType]) !== null && _c !== void 0 ? _c : 0;
    }
    // Unlimited
    if (limit === -1) {
        return { allowed: true, current: 0, limit: -1 };
    }
    // Get current usage
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const usageTypeKey = USAGE_TYPE_TO_COUNT_KEY[usageType];
    const usageDoc = await db
        .collection("usage_records")
        .doc(`${userId}_${monthKey}`)
        .get();
    const current = usageDoc.exists ? ((_d = usageDoc.data()) === null || _d === void 0 ? void 0 : _d[usageTypeKey]) || 0 : 0;
    return {
        allowed: current < limit,
        current,
        limit,
    };
}
// ─── Stripe Webhook Handler ────────────────────────────────────────────────────
/**
 * Handle Stripe webhook events for subscription lifecycle updates
 *
 * @function stripeWebhook
 * @type onRequest
 * @method POST
 * @auth none
 * @input Stripe webhook event (verified via stripe-signature header)
 * @output {{ received: boolean }}
 * @errors 400 (invalid signature), 405 (wrong method), 500 (handler failure)
 * @billing none
 * @rateLimit none
 * @firestore subscriptions
 */
exports.stripeWebhook = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onRequest(async (req, res) => {
    var _a;
    if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
    }
    if (!stripe) {
        res.status(500).json({ error: "Stripe not configured" });
        return;
    }
    const sig = req.headers["stripe-signature"];
    if (!sig || !STRIPE_WEBHOOK_SECRET) {
        res.status(400).json({ error: "Missing signature or webhook secret" });
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        res.status(400).json({ error: "Invalid signature" });
        return;
    }
    const db = admin.firestore();
    try {
        switch (event.type) {
            case "customer.subscription.updated": {
                const subscription = event.data.object;
                const subRef = db.collection("subscriptions").doc(subscription.id);
                await subRef.update({
                    status: subscription.status,
                    currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
                    currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    updatedAt: admin.firestore.Timestamp.now(),
                });
                break;
            }
            case "customer.subscription.deleted": {
                const subscription = event.data.object;
                const subRef = db.collection("subscriptions").doc(subscription.id);
                await subRef.update({
                    status: "canceled",
                    canceledAt: admin.firestore.Timestamp.now(),
                    updatedAt: admin.firestore.Timestamp.now(),
                });
                break;
            }
            case "invoice.payment_succeeded": {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    const subRef = db
                        .collection("subscriptions")
                        .doc(invoice.subscription);
                    await subRef.update({
                        lastPaymentAt: admin.firestore.Timestamp.now(),
                        lastPaymentAmount: invoice.amount_paid,
                        updatedAt: admin.firestore.Timestamp.now(),
                    });
                }
                break;
            }
            case "invoice.payment_failed": {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    const subRef = db
                        .collection("subscriptions")
                        .doc(invoice.subscription);
                    await subRef.update({
                        paymentFailedAt: admin.firestore.Timestamp.now(),
                        updatedAt: admin.firestore.Timestamp.now(),
                    });
                }
                console.warn(`Payment failed for subscription ${invoice.subscription}`);
                break;
            }
            case "checkout.session.completed": {
                const session = event.data.object;
                if (session.mode === "subscription" &&
                    session.subscription &&
                    ((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.firebase_uid)) {
                    const subId = typeof session.subscription === "string"
                        ? session.subscription
                        : session.subscription.id;
                    const stripeSub = await stripe.subscriptions.retrieve(subId);
                    const tier = (session.metadata.tier || "starter");
                    const tierConfig = exports.SOLAR_TIERS[tier] || exports.SOLAR_TIERS.starter;
                    await db
                        .collection("subscriptions")
                        .doc(subId)
                        .set({
                        userId: session.metadata.firebase_uid,
                        stripeCustomerId: session.customer,
                        stripeSubscriptionId: subId,
                        tier,
                        status: stripeSub.status,
                        currentPeriodStart: admin.firestore.Timestamp.fromMillis(stripeSub.current_period_start * 1000),
                        currentPeriodEnd: admin.firestore.Timestamp.fromMillis(stripeSub.current_period_end * 1000),
                        limits: tierConfig.limits,
                        createdAt: admin.firestore.Timestamp.now(),
                        updatedAt: admin.firestore.Timestamp.now(),
                    }, { merge: true });
                    console.log(`Checkout completed: subscription ${subId} for user ${session.metadata.firebase_uid}`);
                }
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error("Webhook handler error:", error);
        res.status(500).json({ error: "Webhook handler failed" });
    }
});
// ─── Checkout & Billing Portal ───────────────────────────────────────────────
/**
 * Create a Stripe Checkout Session for subscription signup
 *
 * @function createCheckoutSession
 * @type onCall
 * @auth firebase
 * @input {{ tier: TierKey, successUrl?: string, cancelUrl?: string }}
 * @output {{ sessionId: string, url: string }}
 * @errors unauthenticated, failed-precondition, invalid-argument, already-exists, internal
 * @billing none
 * @rateLimit subscription_tier
 * @firestore subscriptions
 */
exports.createCheckoutSession = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    if (!stripe) {
        throw new functions.https.HttpsError("failed-precondition", "Stripe is not configured");
    }
    const { tier } = data;
    if (!exports.SOLAR_TIERS[tier]) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid tier: ${tier}`);
    }
    const priceId = STRIPE_PRICE_IDS[tier];
    if (!priceId) {
        throw new functions.https.HttpsError("internal", `No Stripe price configured for tier: ${tier}`);
    }
    const userId = context.auth.uid;
    const userEmail = context.auth.token.email || `user_${userId}@solar.app`;
    try {
        // Check for existing subscription
        const existingSub = await admin
            .firestore()
            .collection("subscriptions")
            .where("userId", "==", userId)
            .where("status", "in", ["active", "trialing"])
            .limit(1)
            .get();
        if (!existingSub.empty) {
            throw new functions.https.HttpsError("already-exists", "User already has an active subscription. Use the billing portal to manage it.");
        }
        // Find or create Stripe customer
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });
        let customerId;
        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
        }
        else {
            const customer = await stripe.customers.create({
                email: userEmail,
                metadata: { firebase_uid: userId },
            });
            customerId = customer.id;
        }
        const successUrl = data.successUrl ||
            "https://power-to-the-people-vpp.web.app/portal?payment=success";
        const cancelUrl = data.cancelUrl ||
            "https://power-to-the-people-vpp.web.app/portal?payment=canceled";
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                firebase_uid: userId,
                tier,
            },
            subscription_data: {
                metadata: {
                    firebase_uid: userId,
                    tier,
                },
            },
        });
        return {
            sessionId: session.id,
            url: session.url,
        };
    }
    catch (error) {
        console.error("Create checkout session error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to create checkout session");
    }
});
/**
 * Create a Stripe Billing Portal session for subscription self-service management
 *
 * @function createBillingPortalSession
 * @type onCall
 * @auth firebase
 * @input {{ returnUrl?: string }}
 * @output {{ url: string }}
 * @errors unauthenticated, failed-precondition, not-found, internal
 * @billing none
 * @rateLimit subscription_tier
 * @firestore subscriptions
 */
exports.createBillingPortalSession = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    if (!stripe) {
        throw new functions.https.HttpsError("failed-precondition", "Stripe is not configured");
    }
    const db = admin.firestore();
    const userId = context.auth.uid;
    // Find active subscription to get Stripe customer ID
    const subSnapshot = await db
        .collection("subscriptions")
        .where("userId", "==", userId)
        .where("status", "in", ["active", "trialing", "past_due"])
        .limit(1)
        .get();
    if (subSnapshot.empty) {
        throw new functions.https.HttpsError("not-found", "No active subscription found");
    }
    const subData = subSnapshot.docs[0].data();
    try {
        const returnUrl = (data === null || data === void 0 ? void 0 : data.returnUrl) || "https://power-to-the-people-vpp.web.app/portal";
        const session = await stripe.billingPortal.sessions.create({
            customer: subData.stripeCustomerId,
            return_url: returnUrl,
        });
        return { url: session.url };
    }
    catch (error) {
        console.error("Create billing portal session error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to create billing portal session");
    }
});
// ─── Subscription Status & Usage ─────────────────────────────────────────────
/**
 * Get current subscription status, monthly usage, and tier limits for the authenticated user
 *
 * @function getSubscriptionStatus
 * @type onCall
 * @auth firebase
 * @input {{}}
 * @output {{ hasSubscription: boolean, subscriptionId?: string, tier?: string, status?: string, cancelAtPeriodEnd?: boolean, currentPeriodStart?: Timestamp, currentPeriodEnd?: Timestamp, usage?: { month: string, api_calls: number, leads: number, compliance_checks: number }, limits?: object }}
 * @errors unauthenticated
 * @billing none
 * @rateLimit subscription_tier
 * @firestore subscriptions, usage_records
 */
exports.getSubscriptionStatus = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (_data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const db = admin.firestore();
    const userId = context.auth.uid;
    // Get subscription
    const subSnapshot = await db
        .collection("subscriptions")
        .where("userId", "==", userId)
        .limit(1)
        .get();
    if (subSnapshot.empty) {
        return {
            hasSubscription: false,
            tier: null,
            status: null,
            usage: null,
            limits: null,
        };
    }
    const subData = subSnapshot.docs[0].data();
    // Get usage for current month
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const usageDoc = await db
        .collection("usage_records")
        .doc(`${userId}_${monthKey}`)
        .get();
    const usage = usageDoc.exists
        ? usageDoc.data()
        : {
            api_call_count: 0,
            lead_count: 0,
            compliance_check_count: 0,
            equipment_lookup_count: 0,
            solar_estimate_count: 0,
            marketplace_listing_count: 0,
        };
    return {
        hasSubscription: true,
        subscriptionId: subData.stripeSubscriptionId,
        tier: subData.tier,
        status: subData.status,
        cancelAtPeriodEnd: subData.cancelAtPeriodEnd || false,
        currentPeriodStart: subData.currentPeriodStart,
        currentPeriodEnd: subData.currentPeriodEnd,
        lastPaymentAt: subData.lastPaymentAt || null,
        lastPaymentAmount: subData.lastPaymentAmount || null,
        paymentFailedAt: subData.paymentFailedAt || null,
        usage: {
            month: monthKey,
            api_calls: usage.api_call_count || 0,
            leads: usage.lead_count || 0,
            compliance_checks: usage.compliance_check_count || 0,
            equipment_lookups: usage.equipment_lookup_count || 0,
            solar_estimates: usage.solar_estimate_count || 0,
            marketplace_listings: usage.marketplace_listing_count || 0,
        },
        limits: subData.limits || null,
    };
});
const USAGE_TO_LIMIT_TYPE = {
    api_call: "api_calls_per_month",
    lead: "leads_per_month",
    compliance_check: "compliance_checks_per_month",
    equipment_lookup: "equipment_lookups_per_month",
    solar_estimate: "solar_estimates_per_month",
    marketplace_listing: "marketplace_listings_per_month",
};
async function recordAndCheckUsage(userId, usageType, quantity = 1) {
    const limitType = USAGE_TO_LIMIT_TYPE[usageType];
    const check = await checkUsageLimit(userId, limitType);
    if (!check.allowed) {
        return check;
    }
    await recordUsage(userId, usageType, quantity);
    return {
        allowed: true,
        current: check.current + quantity,
        limit: check.limit,
    };
}
//# sourceMappingURL=payments.js.map