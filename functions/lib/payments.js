"use strict";
/**
 * Solar CRM Payments - Cloud Functions
 *
 * Uses the @agntc/universal-payments package for Stripe integration.
 * Configures solar-specific subscription tiers, usage billing, and webhooks.
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
exports.stripeWebhook = exports.cancelSubscription = exports.updateSubscription = exports.createSubscription = exports.SOLAR_TIERS = void 0;
exports.recordUsage = recordUsage;
exports.checkUsageLimit = checkUsageLimit;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// ─── Solar Platform Config ─────────────────────────────────────────────────────
const STRIPE_SECRET_KEY = ((_a = functions.config().stripe) === null || _a === void 0 ? void 0 : _a.secret_key) || "";
const STRIPE_WEBHOOK_SECRET = ((_b = functions.config().stripe) === null || _b === void 0 ? void 0 : _b.webhook_secret) || "";
const stripe = STRIPE_SECRET_KEY
    ? new stripe_1.default(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" })
    : null;
/**
 * Solar CRM subscription tiers
 */
exports.SOLAR_TIERS = {
    starter: {
        name: "Starter",
        price_monthly: 7900, // $79/mo in cents
        features: ["50 leads/month", "Basic compliance checks", "Email support"],
        limits: {
            leads_per_month: 50,
            api_calls_per_month: 1000,
            compliance_checks_per_month: 25,
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
        },
    },
};
// ─── Subscription Management ───────────────────────────────────────────────────
/**
 * Create a new subscription for a user
 *
 * Callable function - requires authentication
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
        // Create Stripe subscription
        const tierConfig = exports.SOLAR_TIERS[tier];
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `Solar CRM - ${tierConfig.name}`,
                            metadata: { tier },
                        },
                        unit_amount: tierConfig.price_monthly,
                        recurring: { interval: "month" },
                    },
                },
            ],
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
 * Update subscription tier (upgrade/downgrade)
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
        // Update the subscription item with new price
        const tierConfig = exports.SOLAR_TIERS[new_tier];
        await stripe.subscriptions.update(subData.stripeSubscriptionId, {
            items: [
                {
                    id: stripeSubscription.items.data[0].id,
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `Solar CRM - ${tierConfig.name}`,
                            metadata: { tier: new_tier },
                        },
                        unit_amount: tierConfig.price_monthly,
                        recurring: { interval: "month" },
                    },
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
 * Cancel subscription
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
 * Record API usage for a user (called internally by other functions)
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
/**
 * Check if user is within their subscription limits
 */
async function checkUsageLimit(userId, usageType) {
    var _a, _b, _c;
    const db = admin.firestore();
    // Get subscription
    const subSnapshot = await db
        .collection("subscriptions")
        .where("userId", "==", userId)
        .where("status", "in", ["active", "trialing"])
        .limit(1)
        .get();
    if (subSnapshot.empty) {
        return { allowed: false, current: 0, limit: 0 };
    }
    const subData = subSnapshot.docs[0].data();
    const limit = (_b = (_a = subData.limits) === null || _a === void 0 ? void 0 : _a[usageType]) !== null && _b !== void 0 ? _b : 0;
    // Unlimited
    if (limit === -1) {
        return { allowed: true, current: 0, limit: -1 };
    }
    // Get current usage
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const usageTypeKey = usageType === "leads_per_month"
        ? "lead_count"
        : usageType === "api_calls_per_month"
            ? "api_call_count"
            : "compliance_check_count";
    const usageDoc = await db
        .collection("usage_records")
        .doc(`${userId}_${monthKey}`)
        .get();
    const current = usageDoc.exists ? ((_c = usageDoc.data()) === null || _c === void 0 ? void 0 : _c[usageTypeKey]) || 0 : 0;
    return {
        allowed: current < limit,
        current,
        limit,
    };
}
// ─── Stripe Webhook Handler ────────────────────────────────────────────────────
/**
 * Handle Stripe webhook events for subscription lifecycle
 */
exports.stripeWebhook = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onRequest(async (req, res) => {
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
//# sourceMappingURL=payments.js.map