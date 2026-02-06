"use strict";
/**
 * Leads Management - Cloud Functions
 *
 * Handles lead creation, updates, scoring, and management.
 * Integrates with Solar API data and sales workflow.
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
exports.leadWebhook = exports.recalculateLeadScores = exports.assignLead = exports.addLeadNote = exports.updateLead = exports.createLead = exports.LeadSource = exports.LeadStatus = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
/**
 * Lead status enum - tracks progress through sales funnel
 */
var LeadStatus;
(function (LeadStatus) {
    LeadStatus["SUBMITTED"] = "submitted";
    LeadStatus["CONTACTED"] = "contacted";
    LeadStatus["QUALIFIED"] = "qualified";
    LeadStatus["SOLD"] = "sold";
    LeadStatus["LOST"] = "lost";
})(LeadStatus || (exports.LeadStatus = LeadStatus = {}));
/**
 * Lead source - where the lead came from
 */
var LeadSource;
(function (LeadSource) {
    LeadSource["WEBSITE"] = "website";
    LeadSource["REFERRAL"] = "referral";
    LeadSource["AD"] = "ad";
    LeadSource["API"] = "api";
    LeadSource["PARTNER"] = "partner";
    LeadSource["EVENT"] = "event";
})(LeadSource || (exports.LeadSource = LeadSource = {}));
/**
 * Calculate lead score based on available data
 */
function calculateLeadScore(lead) {
    let score = 50; // Base score
    // Property quality (+25 points max)
    if (lead.solarApiData) {
        const maxPanels = lead.solarApiData.maxArrayPanels || 0;
        const sunshineHours = lead.solarApiData.maxSunshineHours || 0;
        if (maxPanels > 20)
            score += 10; // Good roof size
        if (sunshineHours > 1500)
            score += 10; // High sun exposure
        if (lead.systemSize && lead.systemSize > 7)
            score += 5; // Large system
    }
    // Energy usage (+15 points max)
    if (lead.annualKwh) {
        if (lead.annualKwh > 12000)
            score += 10; // High usage = good candidate
        if (lead.annualKwh > 15000)
            score += 5; // Very high usage
    }
    // Contact completeness (+10 points max)
    if (lead.phone && lead.phone.length >= 10)
        score += 5;
    if (lead.email && lead.email.includes("@"))
        score += 5;
    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
}
/**
 * Cloud Function: Create a new lead
 */
exports.createLead = functions
    .runWith({
    timeoutSeconds: 60,
    memory: "512MB",
})
    .https.onCall(async (data, context) => {
    var _a;
    // Validate required fields
    if (!data.customerName ||
        !data.email ||
        !data.phone ||
        !data.address ||
        !data.city ||
        !data.state ||
        !data.zip) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }
    try {
        const db = admin.firestore();
        const leadRef = db.collection("leads").doc();
        const fullAddress = `${data.address}, ${data.city}, ${data.state} ${data.zip}`;
        const newLead = {
            id: leadRef.id,
            customerName: data.customerName,
            email: data.email.toLowerCase().trim(),
            phone: data.phone.replace(/\D/g, ""), // Strip non-digits
            address: data.address,
            city: data.city,
            state: data.state,
            zip: data.zip,
            fullAddress,
            status: LeadStatus.SUBMITTED,
            source: data.source || LeadSource.WEBSITE,
            score: 50, // Will be calculated after save
            notes: [],
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
            createdBy: (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid,
            utmSource: data.utmSource,
            utmMedium: data.utmMedium,
            utmCampaign: data.utmCampaign,
            // Optional solar data
            systemSize: data.systemSize,
            batterySize: data.batterySize,
            annualKwh: data.annualKwh,
            solarApiData: data.solarApiData,
        };
        // Calculate initial score
        newLead.score = calculateLeadScore(newLead);
        // Save to Firestore
        await leadRef.set(newLead);
        console.log(`Created lead ${leadRef.id} for ${data.customerName}`);
        return {
            success: true,
            leadId: leadRef.id,
            lead: newLead,
        };
    }
    catch (error) {
        console.error("Create lead error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to create lead");
    }
});
/**
 * Cloud Function: Update lead status and details
 */
exports.updateLead = functions
    .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
})
    .https.onCall(async (data, context) => {
    var _a;
    // Require authentication for updates
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to update leads");
    }
    const { leadId, updates } = data;
    if (!leadId) {
        throw new functions.https.HttpsError("invalid-argument", "Lead ID is required");
    }
    try {
        const db = admin.firestore();
        const leadRef = db.collection("leads").doc(leadId);
        // Check if lead exists
        const leadDoc = await leadRef.get();
        if (!leadDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Lead not found");
        }
        // Prepare updates
        const updateData = {
            ...updates,
            updatedAt: admin.firestore.Timestamp.now(),
        };
        // Track status change timestamps
        if (updates.status === LeadStatus.CONTACTED &&
            !((_a = leadDoc.data()) === null || _a === void 0 ? void 0 : _a.lastContactedAt)) {
            updateData.lastContactedAt = admin.firestore.Timestamp.now();
        }
        if (updates.status === LeadStatus.QUALIFIED) {
            updateData.qualifiedAt = admin.firestore.Timestamp.now();
        }
        if (updates.status === LeadStatus.SOLD ||
            updates.status === LeadStatus.LOST) {
            updateData.closedAt = admin.firestore.Timestamp.now();
        }
        // Recalculate score if relevant fields changed
        if (updates.solarApiData ||
            updates.annualKwh ||
            updates.systemSize ||
            updates.batterySize) {
            const currentLead = leadDoc.data();
            const updatedLead = { ...currentLead, ...updates };
            updateData.score = calculateLeadScore(updatedLead);
        }
        // Don't allow direct manipulation of certain fields
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.createdBy;
        await leadRef.update(updateData);
        console.log(`Updated lead ${leadId} by user ${context.auth.uid}`);
        return {
            success: true,
            leadId,
        };
    }
    catch (error) {
        console.error("Update lead error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to update lead");
    }
});
/**
 * Cloud Function: Add a note to a lead
 */
exports.addLeadNote = functions
    .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
})
    .https.onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to add notes");
    }
    const { leadId, text, type } = data;
    if (!leadId || !text) {
        throw new functions.https.HttpsError("invalid-argument", "Lead ID and note text are required");
    }
    try {
        const db = admin.firestore();
        const leadRef = db.collection("leads").doc(leadId);
        const note = {
            id: db.collection("_").doc().id, // Generate unique ID
            text,
            author: context.auth.uid,
            authorName: context.auth.token.name || context.auth.token.email || "Unknown",
            createdAt: admin.firestore.Timestamp.now(),
            type: type || "note",
        };
        // Add note to array
        await leadRef.update({
            notes: admin.firestore.FieldValue.arrayUnion(note),
            updatedAt: admin.firestore.Timestamp.now(),
        });
        console.log(`Added note to lead ${leadId} by ${context.auth.uid}`);
        return {
            success: true,
            note,
        };
    }
    catch (error) {
        console.error("Add note error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to add note");
    }
});
/**
 * Cloud Function: Assign lead to sales rep
 */
exports.assignLead = functions
    .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
})
    .https.onCall(async (data, context) => {
    // Require authentication (admin/manager only in real app)
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to assign leads");
    }
    const { leadId, assignToUserId, assignToName } = data;
    if (!leadId || !assignToUserId) {
        throw new functions.https.HttpsError("invalid-argument", "Lead ID and assignee are required");
    }
    try {
        const db = admin.firestore();
        const leadRef = db.collection("leads").doc(leadId);
        await leadRef.update({
            assignedTo: assignToUserId,
            assignedToName: assignToName || assignToUserId,
            updatedAt: admin.firestore.Timestamp.now(),
        });
        console.log(`Assigned lead ${leadId} to ${assignToUserId} by ${context.auth.uid}`);
        return {
            success: true,
            leadId,
            assignedTo: assignToUserId,
        };
    }
    catch (error) {
        console.error("Assign lead error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to assign lead");
    }
});
/**
 * Cloud Function: Recalculate scores for all leads
 * (For batch processing / admin use)
 */
exports.recalculateLeadScores = functions
    .runWith({
    timeoutSeconds: 300,
    memory: "1GB",
})
    .https.onCall(async (data, context) => {
    // Admin only
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    try {
        const db = admin.firestore();
        const leadsSnapshot = await db
            .collection("leads")
            .where("archived", "!=", true)
            .get();
        let updated = 0;
        const batch = db.batch();
        leadsSnapshot.docs.forEach((doc) => {
            const lead = doc.data();
            const newScore = calculateLeadScore(lead);
            if (newScore !== lead.score) {
                batch.update(doc.ref, { score: newScore });
                updated++;
            }
        });
        if (updated > 0) {
            await batch.commit();
        }
        console.log(`Recalculated scores for ${updated} leads`);
        return {
            success: true,
            totalLeads: leadsSnapshot.size,
            updatedLeads: updated,
        };
    }
    catch (error) {
        console.error("Recalculate scores error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to recalculate scores");
    }
});
/**
 * HTTP Webhook: Create lead from external sources
 * (For API integrations, partner sites, etc.)
 */
exports.leadWebhook = functions
    .runWith({
    timeoutSeconds: 60,
    memory: "512MB",
})
    .https.onRequest(async (req, res) => {
    var _a;
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    // Validate API key (in production, use proper auth)
    const apiKey = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
    const validApiKey = process.env.LEAD_WEBHOOK_API_KEY;
    if (validApiKey && apiKey !== validApiKey) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const data = req.body;
    // Validate required fields
    if (!data.customerName ||
        !data.email ||
        !data.phone ||
        !data.address ||
        !data.city ||
        !data.state ||
        !data.zip) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }
    try {
        const db = admin.firestore();
        const leadRef = db.collection("leads").doc();
        const fullAddress = `${data.address}, ${data.city}, ${data.state} ${data.zip}`;
        const newLead = {
            id: leadRef.id,
            customerName: data.customerName,
            email: data.email.toLowerCase().trim(),
            phone: data.phone.replace(/\D/g, ""),
            address: data.address,
            city: data.city,
            state: data.state,
            zip: data.zip,
            fullAddress,
            status: LeadStatus.SUBMITTED,
            source: data.source || LeadSource.API,
            score: 50,
            notes: [],
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
            utmSource: data.utmSource,
            utmMedium: data.utmMedium,
            utmCampaign: data.utmCampaign,
            systemSize: data.systemSize,
            batterySize: data.batterySize,
            annualKwh: data.annualKwh,
            solarApiData: data.solarApiData,
        };
        // Calculate score
        newLead.score = calculateLeadScore(newLead);
        await leadRef.set(newLead);
        console.log(`Webhook created lead ${leadRef.id} for ${data.customerName} from IP ${req.ip}`);
        res.json({
            success: true,
            leadId: leadRef.id,
            message: "Lead created successfully",
        });
    }
    catch (error) {
        console.error("Lead webhook error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create lead",
        });
    }
});
//# sourceMappingURL=leads.js.map