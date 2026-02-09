/**
 * Mercury Invoice Service - Cloud Functions
 *
 * Manages invoicing via Mercury Banking API for solar installations.
 * Handles customer creation, invoice CRUD, and status sync.
 *
 * @module mercuryInvoice
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { sendSMS } from "./smsNotifications";

// Mercury API config
const MERCURY_API_BASE = "https://api.mercury.com/api/v1";
const MERCURY_ACCOUNT_ID = functions.config().mercury?.account_id || "";

/**
 * Internal helper for authenticated Mercury Banking API requests
 *
 * @function mercuryFetch
 * @type helper
 * @auth api_key
 * @input {{ endpoint: string, method: string, body?: any }}
 * @output any (Mercury API response JSON)
 * @errors failed-precondition, internal
 * @billing none
 * @rateLimit none
 * @firestore none
 */
async function mercuryFetch(
  endpoint: string,
  method: string,
  body?: any,
): Promise<any> {
  const apiToken = functions.config().mercury?.api_token;
  if (!apiToken) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Mercury API token is not configured",
    );
  }

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${MERCURY_API_BASE}${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error(`Mercury API error: ${response.status} ${errorText}`);
    throw new functions.https.HttpsError(
      "internal",
      `Mercury API error: ${response.status} - ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Verify the caller is authenticated and has the admin role in Firestore
 *
 * @function verifyAdmin
 * @type helper
 * @auth firebase
 * @input {{ context: functions.https.CallableContext }}
 * @output void
 * @errors unauthenticated, permission-denied
 * @billing none
 * @rateLimit none
 * @firestore users
 */
async function verifyAdmin(
  context: functions.https.CallableContext,
): Promise<void> {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated",
    );
  }

  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();

  const user = userDoc.data();
  if (user?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Must be admin to manage invoices",
    );
  }
}

// ─── Customer Management ──────────────────────────────────────────────────────

/**
 * Create a Mercury Accounts Receivable customer linked to a lead
 *
 * @function createMercuryCustomer
 * @type onCall
 * @auth admin
 * @input {{ leadId: string, name: string, email: string, phone?: string }}
 * @output {{ success: boolean, customerId: string }}
 * @errors unauthenticated, permission-denied, invalid-argument, internal
 * @billing none
 * @rateLimit none
 * @firestore leads
 */
export const createMercuryCustomer = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(
    async (
      data: {
        leadId: string;
        name: string;
        email: string;
        phone?: string;
      },
      context,
    ) => {
      await verifyAdmin(context);

      const { leadId, name, email, phone } = data;

      if (!leadId || !name || !email) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "leadId, name, and email are required",
        );
      }

      try {
        const result = await mercuryFetch("/ar/customers", "POST", {
          name,
          email,
          phone: phone || undefined,
        });

        const db = admin.firestore();

        // Update lead with Mercury customer info
        await db.collection("leads").doc(leadId).update({
          "mercury.customerId": result.id,
          updatedAt: admin.firestore.Timestamp.now(),
        });

        functions.logger.info(`Created Mercury customer ${result.id} for lead ${leadId}`);

        return {
          success: true,
          customerId: result.id,
        };
      } catch (error: any) {
        functions.logger.error("Create Mercury customer error:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to create Mercury customer",
        );
      }
    },
  );

// ─── Invoice Management ───────────────────────────────────────────────────────

/**
 * Create a Mercury invoice for a lead and save it to Firestore
 *
 * @function createMercuryInvoice
 * @type onCall
 * @auth admin
 * @input {{ leadId: string, customerId: string, amount: number, lineItems: Array<{ description: string, quantity: number, unitPrice: number }>, dueDate: string, memo?: string, customerName: string, customerEmail: string }}
 * @output {{ success: boolean, invoiceId: string, mercuryInvoiceId: string, slug: string }}
 * @errors unauthenticated, permission-denied, invalid-argument, internal
 * @billing none
 * @rateLimit none
 * @firestore invoices, leads
 */
export const createMercuryInvoice = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(
    async (
      data: {
        leadId: string;
        customerId: string;
        amount: number;
        lineItems: Array<{
          description: string;
          quantity: number;
          unitPrice: number;
        }>;
        dueDate: string; // ISO date string
        memo?: string;
        customerName: string;
        customerEmail: string;
      },
      context,
    ) => {
      await verifyAdmin(context);

      const {
        leadId,
        customerId,
        amount,
        lineItems,
        dueDate,
        memo,
        customerName,
        customerEmail,
      } = data;

      if (!leadId || !customerId || !amount || !lineItems || !dueDate) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "leadId, customerId, amount, lineItems, and dueDate are required",
        );
      }

      try {
        const invoiceDate = new Date().toISOString().split("T")[0];

        const mercuryLineItems = lineItems.map((item: any) => ({
          name: item.description || item.name,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.amount,
        }));

        const result = await mercuryFetch("/ar/invoices", "POST", {
          customerId,
          destinationAccountId: MERCURY_ACCOUNT_ID,
          dueDate,
          invoiceDate,
          lineItems: mercuryLineItems,
          achDebitEnabled: true,
          creditCardEnabled: false,
          useRealAccountNumber: false,
          sendEmailOption: "SendNow",
          payerMemo: memo || "",
          ccEmails: [],
        });

        const db = admin.firestore();
        const invoiceRef = db.collection("invoices").doc();

        // Save invoice to Firestore
        await invoiceRef.set({
          mercuryInvoiceId: result.id,
          mercuryCustomerId: customerId,
          slug: result.slug || null,
          leadId,
          amount,
          lineItems,
          status: result.status || "unpaid",
          paymentMethod: null,
          achDebitEnabled: true,
          creditCardEnabled: false,
          invoiceDate,
          dueDate,
          paidAt: null,
          customerName,
          customerEmail,
          createdBy: context.auth!.uid,
          memo: memo || null,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        // Update lead with latest invoice info
        await db
          .collection("leads")
          .doc(leadId)
          .update({
            "mercury.latestInvoiceId": result.id,
            "mercury.invoiceSlug": result.slug || null,
            "mercury.totalInvoiced":
              admin.firestore.FieldValue.increment(amount),
            "mercury.paymentStatus": "unpaid",
            updatedAt: admin.firestore.Timestamp.now(),
          });

        functions.logger.info(
          `Created Mercury invoice ${result.id} for lead ${leadId} - $${amount}`,
        );

        return {
          success: true,
          invoiceId: invoiceRef.id,
          mercuryInvoiceId: result.id,
          slug: result.slug,
        };
      } catch (error: any) {
        functions.logger.error("Create Mercury invoice error:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to create Mercury invoice",
        );
      }
    },
  );

/**
 * Retrieve a single Mercury invoice by its Mercury invoice ID
 *
 * @function getMercuryInvoice
 * @type onCall
 * @auth admin
 * @input {{ mercuryInvoiceId: string }}
 * @output {{ success: boolean, invoice: object }}
 * @errors unauthenticated, permission-denied, invalid-argument, internal
 * @billing none
 * @rateLimit none
 * @firestore none
 */
export const getMercuryInvoice = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(
    async (
      data: {
        mercuryInvoiceId: string;
      },
      context,
    ) => {
      await verifyAdmin(context);

      const { mercuryInvoiceId } = data;

      if (!mercuryInvoiceId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "mercuryInvoiceId is required",
        );
      }

      try {
        const result = await mercuryFetch(
          `/ar/invoices/${mercuryInvoiceId}`,
          "GET",
        );

        return {
          success: true,
          invoice: result,
        };
      } catch (error: any) {
        functions.logger.error("Get Mercury invoice error:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to get Mercury invoice",
        );
      }
    },
  );

/**
 * List Mercury invoices with optional status filtering and pagination
 *
 * @function listMercuryInvoices
 * @type onCall
 * @auth admin
 * @input {{ status?: string, limit?: number, offset?: number }}
 * @output {{ success: boolean, invoices: object }}
 * @errors unauthenticated, permission-denied, internal
 * @billing none
 * @rateLimit none
 * @firestore none
 */
export const listMercuryInvoices = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(
    async (
      data: {
        status?: string;
        limit?: number;
        offset?: number;
      },
      context,
    ) => {
      await verifyAdmin(context);

      try {
        let endpoint = "/invoices?";
        if (data?.status) endpoint += `status=${data.status}&`;
        if (data?.limit) endpoint += `limit=${data.limit}&`;
        if (data?.offset) endpoint += `offset=${data.offset}&`;

        const result = await mercuryFetch(endpoint, "GET");

        return {
          success: true,
          invoices: result,
        };
      } catch (error: any) {
        functions.logger.error("List Mercury invoices error:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to list Mercury invoices",
        );
      }
    },
  );

/**
 * Cancel a Mercury invoice and update the corresponding Firestore records
 *
 * @function cancelMercuryInvoice
 * @type onCall
 * @auth admin
 * @input {{ mercuryInvoiceId: string, firestoreInvoiceId: string, leadId: string }}
 * @output {{ success: boolean, mercuryInvoiceId: string }}
 * @errors unauthenticated, permission-denied, invalid-argument, internal
 * @billing none
 * @rateLimit none
 * @firestore invoices, leads
 */
export const cancelMercuryInvoice = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(
    async (
      data: {
        mercuryInvoiceId: string;
        firestoreInvoiceId: string;
        leadId: string;
      },
      context,
    ) => {
      await verifyAdmin(context);

      const { mercuryInvoiceId, firestoreInvoiceId, leadId } = data;

      if (!mercuryInvoiceId || !firestoreInvoiceId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "mercuryInvoiceId and firestoreInvoiceId are required",
        );
      }

      try {
        await mercuryFetch(`/ar/invoices/${mercuryInvoiceId}/cancel`, "PUT");

        const db = admin.firestore();

        // Update Firestore invoice
        await db.collection("invoices").doc(firestoreInvoiceId).update({
          status: "canceled",
          updatedAt: admin.firestore.Timestamp.now(),
        });

        // Update lead payment status if leadId provided
        if (leadId) {
          await db.collection("leads").doc(leadId).update({
            "mercury.paymentStatus": "canceled",
            updatedAt: admin.firestore.Timestamp.now(),
          });
        }

        functions.logger.info(`Canceled Mercury invoice ${mercuryInvoiceId}`);

        return {
          success: true,
          mercuryInvoiceId,
        };
      } catch (error: any) {
        functions.logger.error("Cancel Mercury invoice error:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to cancel Mercury invoice",
        );
      }
    },
  );

// ─── Scheduled Sync ───────────────────────────────────────────────────────────

/**
 * Sync invoice statuses from Mercury every 30 minutes and send SMS on payment receipt
 *
 * @function syncInvoiceStatus
 * @type pubsub
 * @auth none
 * @input none (scheduled trigger)
 * @output null
 * @errors internal (per-invoice, non-fatal)
 * @billing sms
 * @rateLimit none
 * @firestore invoices, leads
 */
export const syncInvoiceStatus = functions.pubsub
  .schedule("every 30 minutes")
  .onRun(async () => {
    const db = admin.firestore();

    // Query invoices that need status checks
    const invoicesSnapshot = await db
      .collection("invoices")
      .where("status", "in", ["unpaid", "processing"])
      .get();

    if (invoicesSnapshot.empty) {
      functions.logger.info("No invoices to sync");
      return null;
    }

    let updated = 0;
    let paid = 0;

    for (const doc of invoicesSnapshot.docs) {
      const invoice = doc.data();

      try {
        const mercuryInvoice = await mercuryFetch(
          `/ar/invoices/${invoice.mercuryInvoiceId}`,
          "GET",
        );

        const newStatus = mercuryInvoice.status;

        // Skip if status hasn't changed
        if (newStatus === invoice.status) continue;

        // Update Firestore invoice
        const updateData: any = {
          status: newStatus,
          updatedAt: admin.firestore.Timestamp.now(),
        };

        if (newStatus === "paid") {
          updateData.paidAt = admin.firestore.Timestamp.now();
          updateData.paymentMethod = mercuryInvoice.paymentMethod || "ach";
        }

        await doc.ref.update(updateData);
        updated++;

        // Update lead if status changed to paid
        if (newStatus === "paid" && invoice.leadId) {
          paid++;

          await db
            .collection("leads")
            .doc(invoice.leadId)
            .update({
              "mercury.paymentStatus": "paid",
              "mercury.totalPaid": admin.firestore.FieldValue.increment(
                invoice.amount,
              ),
              updatedAt: admin.firestore.Timestamp.now(),
            });

          // Send SMS notification for payment received
          const leadDoc = await db
            .collection("leads")
            .doc(invoice.leadId)
            .get();
          const lead = leadDoc.data();

          if (lead?.phone) {
            await sendSMS(
              lead.phone,
              `Hi ${lead.customerName || "there"}! We've received your payment of $${invoice.amount.toLocaleString()} for your solar installation. Thank you!`,
            );
          }
        }
      } catch (error) {
        functions.logger.error(
          `Error syncing invoice ${invoice.mercuryInvoiceId}:`,
          error,
        );
        // Continue with other invoices
      }
    }

    functions.logger.info(
      `Invoice sync complete: ${updated} updated, ${paid} newly paid out of ${invoicesSnapshot.size} checked`,
    );

    return null;
  });
