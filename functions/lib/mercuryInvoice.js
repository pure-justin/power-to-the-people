"use strict";
/**
 * Mercury Invoice Service - Cloud Functions
 *
 * Manages invoicing via Mercury Banking API for solar installations.
 * Handles customer creation, invoice CRUD, and status sync.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncInvoiceStatus = exports.cancelMercuryInvoice = exports.listMercuryInvoices = exports.getMercuryInvoice = exports.createMercuryInvoice = exports.createMercuryCustomer = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const smsNotifications_1 = require("./smsNotifications");
// Mercury API config
const MERCURY_API_BASE = "https://api.mercury.com/api/v1";
const MERCURY_ACCOUNT_ID = "ecc22c2c-aabf-11f0-955b-13f894471589";
/**
 * Internal helper for Mercury API calls
 */
async function mercuryFetch(endpoint, method, body) {
    var _a;
    const apiToken = (_a = functions.config().mercury) === null || _a === void 0 ? void 0 : _a.api_token;
    if (!apiToken) {
        throw new functions.https.HttpsError("failed-precondition", "Mercury API token is not configured");
    }
    const options = {
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
        console.error(`Mercury API error: ${response.status} ${errorText}`);
        throw new functions.https.HttpsError("internal", `Mercury API error: ${response.status} - ${errorText}`);
    }
    return response.json();
}
/**
 * Verify caller is authenticated and has admin role
 */
async function verifyAdmin(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(context.auth.uid)
        .get();
    const user = userDoc.data();
    if ((user === null || user === void 0 ? void 0 : user.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be admin to manage invoices");
    }
}
// ─── Customer Management ──────────────────────────────────────────────────────
/**
 * Create a Mercury AR customer for a lead
 */
exports.createMercuryCustomer = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    await verifyAdmin(context);
    const { leadId, name, email, phone } = data;
    if (!leadId || !name || !email) {
        throw new functions.https.HttpsError("invalid-argument", "leadId, name, and email are required");
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
        console.log(`Created Mercury customer ${result.id} for lead ${leadId}`);
        return {
            success: true,
            customerId: result.id,
        };
    }
    catch (error) {
        console.error("Create Mercury customer error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to create Mercury customer");
    }
});
// ─── Invoice Management ───────────────────────────────────────────────────────
/**
 * Create a Mercury invoice for a lead
 */
exports.createMercuryInvoice = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    await verifyAdmin(context);
    const { leadId, customerId, amount, lineItems, dueDate, memo, customerName, customerEmail, } = data;
    if (!leadId || !customerId || !amount || !lineItems || !dueDate) {
        throw new functions.https.HttpsError("invalid-argument", "leadId, customerId, amount, lineItems, and dueDate are required");
    }
    try {
        const invoiceDate = new Date().toISOString().split("T")[0];
        const mercuryLineItems = lineItems.map((item) => ({
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
            createdBy: context.auth.uid,
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
            "mercury.totalInvoiced": admin.firestore.FieldValue.increment(amount),
            "mercury.paymentStatus": "unpaid",
            updatedAt: admin.firestore.Timestamp.now(),
        });
        console.log(`Created Mercury invoice ${result.id} for lead ${leadId} - $${amount}`);
        return {
            success: true,
            invoiceId: invoiceRef.id,
            mercuryInvoiceId: result.id,
            slug: result.slug,
        };
    }
    catch (error) {
        console.error("Create Mercury invoice error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to create Mercury invoice");
    }
});
/**
 * Get a Mercury invoice by ID
 */
exports.getMercuryInvoice = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    await verifyAdmin(context);
    const { mercuryInvoiceId } = data;
    if (!mercuryInvoiceId) {
        throw new functions.https.HttpsError("invalid-argument", "mercuryInvoiceId is required");
    }
    try {
        const result = await mercuryFetch(`/ar/invoices/${mercuryInvoiceId}`, "GET");
        return {
            success: true,
            invoice: result,
        };
    }
    catch (error) {
        console.error("Get Mercury invoice error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to get Mercury invoice");
    }
});
/**
 * List Mercury invoices
 */
exports.listMercuryInvoices = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    await verifyAdmin(context);
    try {
        let endpoint = "/invoices?";
        if (data === null || data === void 0 ? void 0 : data.status)
            endpoint += `status=${data.status}&`;
        if (data === null || data === void 0 ? void 0 : data.limit)
            endpoint += `limit=${data.limit}&`;
        if (data === null || data === void 0 ? void 0 : data.offset)
            endpoint += `offset=${data.offset}&`;
        const result = await mercuryFetch(endpoint, "GET");
        return {
            success: true,
            invoices: result,
        };
    }
    catch (error) {
        console.error("List Mercury invoices error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to list Mercury invoices");
    }
});
/**
 * Cancel a Mercury invoice
 */
exports.cancelMercuryInvoice = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    await verifyAdmin(context);
    const { mercuryInvoiceId, firestoreInvoiceId, leadId } = data;
    if (!mercuryInvoiceId || !firestoreInvoiceId) {
        throw new functions.https.HttpsError("invalid-argument", "mercuryInvoiceId and firestoreInvoiceId are required");
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
        console.log(`Canceled Mercury invoice ${mercuryInvoiceId}`);
        return {
            success: true,
            mercuryInvoiceId,
        };
    }
    catch (error) {
        console.error("Cancel Mercury invoice error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to cancel Mercury invoice");
    }
});
// ─── Scheduled Sync ───────────────────────────────────────────────────────────
/**
 * Sync invoice statuses from Mercury every 30 minutes
 * Checks unpaid/processing invoices and updates Firestore + leads
 */
exports.syncInvoiceStatus = functions.pubsub
    .schedule("every 30 minutes")
    .onRun(async () => {
    const db = admin.firestore();
    // Query invoices that need status checks
    const invoicesSnapshot = await db
        .collection("invoices")
        .where("status", "in", ["unpaid", "processing"])
        .get();
    if (invoicesSnapshot.empty) {
        console.log("No invoices to sync");
        return null;
    }
    let updated = 0;
    let paid = 0;
    for (const doc of invoicesSnapshot.docs) {
        const invoice = doc.data();
        try {
            const mercuryInvoice = await mercuryFetch(`/ar/invoices/${invoice.mercuryInvoiceId}`, "GET");
            const newStatus = mercuryInvoice.status;
            // Skip if status hasn't changed
            if (newStatus === invoice.status)
                continue;
            // Update Firestore invoice
            const updateData = {
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
                    "mercury.totalPaid": admin.firestore.FieldValue.increment(invoice.amount),
                    updatedAt: admin.firestore.Timestamp.now(),
                });
                // Send SMS notification for payment received
                const leadDoc = await db
                    .collection("leads")
                    .doc(invoice.leadId)
                    .get();
                const lead = leadDoc.data();
                if (lead === null || lead === void 0 ? void 0 : lead.phone) {
                    await (0, smsNotifications_1.sendSMS)(lead.phone, `Hi ${lead.customerName || "there"}! We've received your payment of $${invoice.amount.toLocaleString()} for your solar installation. Thank you!`);
                }
            }
        }
        catch (error) {
            console.error(`Error syncing invoice ${invoice.mercuryInvoiceId}:`, error);
            // Continue with other invoices
        }
    }
    console.log(`Invoice sync complete: ${updated} updated, ${paid} newly paid out of ${invoicesSnapshot.size} checked`);
    return null;
});
//# sourceMappingURL=mercuryInvoice.js.map