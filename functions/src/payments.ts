/**
 * Solar CRM Payments - Cloud Functions
 *
 * Uses the @agntc/universal-payments package for Stripe integration.
 * Configures solar-specific subscription tiers, usage billing, and webhooks.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import Stripe from "stripe";

// ─── Solar Platform Config ─────────────────────────────────────────────────────

const STRIPE_SECRET_KEY = functions.config().stripe?.secret_key || "";
const STRIPE_WEBHOOK_SECRET = functions.config().stripe?.webhook_secret || "";

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" as any })
  : null;

/**
 * Solar CRM subscription tiers
 */
export const SOLAR_TIERS = {
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
} as const;

type TierKey = keyof typeof SOLAR_TIERS;

// ─── Subscription Management ───────────────────────────────────────────────────

/**
 * Create a new subscription for a user
 *
 * Callable function - requires authentication
 */
export const createSubscription = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(
    async (
      data: {
        tier: TierKey;
        payment_method_id: string;
      },
      context,
    ) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Must be authenticated",
        );
      }

      if (!stripe) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Stripe is not configured",
        );
      }

      const { tier, payment_method_id } = data;

      if (!SOLAR_TIERS[tier]) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid tier: ${tier}. Must be one of: ${Object.keys(SOLAR_TIERS).join(", ")}`,
        );
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
          throw new functions.https.HttpsError(
            "already-exists",
            "User already has an active subscription. Use updateSubscription to change tiers.",
          );
        }

        // Create or retrieve Stripe customer
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 1,
        });
        let customer: Stripe.Customer;

        if (customers.data.length > 0) {
          customer = customers.data[0];
        } else {
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

        // Create Stripe product + price, then subscription
        const tierConfig = SOLAR_TIERS[tier];
        const product = await stripe.products.create({
          name: `Solar CRM - ${tierConfig.name}`,
          metadata: { tier },
        });
        const price = await stripe.prices.create({
          product: product.id,
          currency: "usd",
          unit_amount: tierConfig.price_monthly,
          recurring: { interval: "month" },
        });
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: price.id }],
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
            currentPeriodStart: admin.firestore.Timestamp.fromMillis(
              subscription.current_period_start * 1000,
            ),
            currentPeriodEnd: admin.firestore.Timestamp.fromMillis(
              subscription.current_period_end * 1000,
            ),
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
      } catch (error: any) {
        console.error("Create subscription error:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to create subscription",
        );
      }
    },
  );

/**
 * Update subscription tier (upgrade/downgrade)
 */
export const updateSubscription = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data: { new_tier: TierKey }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated",
      );
    }

    if (!stripe) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Stripe is not configured",
      );
    }

    const { new_tier } = data;
    if (!SOLAR_TIERS[new_tier]) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid tier: ${new_tier}`,
      );
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
      throw new functions.https.HttpsError(
        "not-found",
        "No active subscription found",
      );
    }

    const subDoc = subSnapshot.docs[0];
    const subData = subDoc.data();

    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subData.stripeSubscriptionId,
      );

      // Create new price for the updated tier
      const tierConfig = SOLAR_TIERS[new_tier];
      const product = await stripe.products.create({
        name: `Solar CRM - ${tierConfig.name}`,
        metadata: { tier: new_tier },
      });
      const newPrice = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: tierConfig.price_monthly,
        recurring: { interval: "month" },
      });
      await stripe.subscriptions.update(subData.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPrice.id,
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
    } catch (error: any) {
      console.error("Update subscription error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to update subscription",
      );
    }
  });

/**
 * Cancel subscription
 */
export const cancelSubscription = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data: { immediate?: boolean }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated",
      );
    }

    if (!stripe) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Stripe is not configured",
      );
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
      throw new functions.https.HttpsError(
        "not-found",
        "No active subscription found",
      );
    }

    const subDoc = subSnapshot.docs[0];
    const subData = subDoc.data();

    try {
      if (data?.immediate) {
        // Cancel immediately
        await stripe.subscriptions.cancel(subData.stripeSubscriptionId);
        await subDoc.ref.update({
          status: "canceled",
          canceledAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      } else {
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
        immediate: data?.immediate || false,
        message: data?.immediate
          ? "Subscription canceled immediately"
          : "Subscription will cancel at end of billing period",
      };
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to cancel subscription",
      );
    }
  });

// ─── Usage Metering ────────────────────────────────────────────────────────────

/**
 * Record API usage for a user (called internally by other functions)
 */
export async function recordUsage(
  userId: string,
  usageType: "api_call" | "lead" | "compliance_check",
  quantity: number = 1,
): Promise<void> {
  const db = admin.firestore();

  // Get current month key
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const usageRef = db.collection("usage_records").doc(`${userId}_${monthKey}`);

  await usageRef.set(
    {
      userId,
      month: monthKey,
      [`${usageType}_count`]: admin.firestore.FieldValue.increment(quantity),
      lastUpdated: admin.firestore.Timestamp.now(),
    },
    { merge: true },
  );
}

/**
 * Check if user is within their subscription limits
 */
export async function checkUsageLimit(
  userId: string,
  usageType:
    | "leads_per_month"
    | "api_calls_per_month"
    | "compliance_checks_per_month",
): Promise<{ allowed: boolean; current: number; limit: number }> {
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
  const limit = subData.limits?.[usageType] ?? 0;

  // Unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Get current usage
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const usageTypeKey =
    usageType === "leads_per_month"
      ? "lead_count"
      : usageType === "api_calls_per_month"
        ? "api_call_count"
        : "compliance_check_count";

  const usageDoc = await db
    .collection("usage_records")
    .doc(`${userId}_${monthKey}`)
    .get();

  const current = usageDoc.exists ? usageDoc.data()?.[usageTypeKey] || 0 : 0;

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
export const stripeWebhook = functions
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

    const sig = req.headers["stripe-signature"] as string;
    if (!sig || !STRIPE_WEBHOOK_SECRET) {
      res.status(400).json({ error: "Missing signature or webhook secret" });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET,
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    const db = admin.firestore();

    try {
      switch (event.type) {
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const subRef = db.collection("subscriptions").doc(subscription.id);
          await subRef.update({
            status: subscription.status,
            currentPeriodStart: admin.firestore.Timestamp.fromMillis(
              subscription.current_period_start * 1000,
            ),
            currentPeriodEnd: admin.firestore.Timestamp.fromMillis(
              subscription.current_period_end * 1000,
            ),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: admin.firestore.Timestamp.now(),
          });
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const subRef = db.collection("subscriptions").doc(subscription.id);
          await subRef.update({
            status: "canceled",
            canceledAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
          });
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription) {
            const subRef = db
              .collection("subscriptions")
              .doc(invoice.subscription as string);
            await subRef.update({
              lastPaymentAt: admin.firestore.Timestamp.now(),
              lastPaymentAmount: invoice.amount_paid,
              updatedAt: admin.firestore.Timestamp.now(),
            });
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription) {
            const subRef = db
              .collection("subscriptions")
              .doc(invoice.subscription as string);
            await subRef.update({
              paymentFailedAt: admin.firestore.Timestamp.now(),
              updatedAt: admin.firestore.Timestamp.now(),
            });
          }
          console.warn(
            `Payment failed for subscription ${invoice.subscription}`,
          );
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook handler error:", error);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });
