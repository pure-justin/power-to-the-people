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
const corsConfig_1 = require("./corsConfig");
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
 * Creates a new lead in the sales pipeline with initial scoring
 *
 * @function createLead
 * @type onCall
 * @auth firebase
 * @input {{ customerName: string, email: string, phone: string, address: string, city: string, state: string, zip: string, source?: LeadSource, utmSource?: string, utmMedium?: string, utmCampaign?: string, systemSize?: number, batterySize?: number, annualKwh?: number, solarApiData?: any }}
 * @output {{ success: boolean, leadId: string, lead: Lead }}
 * @errors invalid-argument, internal
 * @billing lead
 * @rateLimit none
 * @firestore leads
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
        functions.logger.info(`Created lead ${leadRef.id} for ${data.customerName}`);
        return {
            success: true,
            leadId: leadRef.id,
            lead: newLead,
        };
    }
    catch (error) {
        functions.logger.error("Create lead error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to create lead");
    }
});
/**
 * Updates lead status, details, and recalculates score when relevant fields change
 *
 * @function updateLead
 * @type onCall
 * @auth firebase
 * @input {{ leadId: string, updates: Partial<Lead> }}
 * @output {{ success: boolean, leadId: string }}
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @billing lead
 * @rateLimit none
 * @firestore leads
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
        functions.logger.info(`Updated lead ${leadId} by user ${context.auth.uid}`);
        return {
            success: true,
            leadId,
        };
    }
    catch (error) {
        functions.logger.error("Update lead error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to update lead");
    }
});
/**
 * Adds a sales note (call, email, meeting, or general note) to an existing lead
 *
 * @function addLeadNote
 * @type onCall
 * @auth firebase
 * @input {{ leadId: string, text: string, type?: "call" | "email" | "meeting" | "note" }}
 * @output {{ success: boolean, note: SalesNote }}
 * @errors unauthenticated, invalid-argument, internal
 * @billing none
 * @rateLimit none
 * @firestore leads
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
        functions.logger.info(`Added note to lead ${leadId} by ${context.auth.uid}`);
        return {
            success: true,
            note,
        };
    }
    catch (error) {
        functions.logger.error("Add note error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to add note");
    }
});
/**
 * Assigns a lead to a sales representative for follow-up
 *
 * @function assignLead
 * @type onCall
 * @auth firebase
 * @input {{ leadId: string, assignToUserId: string, assignToName?: string }}
 * @output {{ success: boolean, leadId: string, assignedTo: string }}
 * @errors unauthenticated, invalid-argument, internal
 * @billing none
 * @rateLimit none
 * @firestore leads
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
        functions.logger.info(`Assigned lead ${leadId} to ${assignToUserId} by ${context.auth.uid}`);
        return {
            success: true,
            leadId,
            assignedTo: assignToUserId,
        };
    }
    catch (error) {
        functions.logger.error("Assign lead error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to assign lead");
    }
});
/**
 * Batch recalculates lead quality scores for all non-archived leads
 *
 * @function recalculateLeadScores
 * @type onCall
 * @auth firebase
 * @input {{ }}
 * @output {{ success: boolean, totalLeads: number, updatedLeads: number }}
 * @errors unauthenticated, internal
 * @billing none
 * @rateLimit none
 * @firestore leads
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
        functions.logger.info(`Recalculated scores for ${updated} leads`);
        return {
            success: true,
            totalLeads: leadsSnapshot.size,
            updatedLeads: updated,
        };
    }
    catch (error) {
        functions.logger.error("Recalculate scores error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to recalculate scores");
    }
});
/**
 * HTTP webhook to create leads from external API integrations and partner sites
 *
 * @function leadWebhook
 * @type onRequest
 * @method POST
 * @auth api_key
 * @scope LEAD_WEBHOOK_API_KEY
 * @input {{ customerName: string, email: string, phone: string, address: string, city: string, state: string, zip: string, source?: LeadSource, utmSource?: string, utmMedium?: string, utmCampaign?: string, systemSize?: number, batterySize?: number, annualKwh?: number, solarApiData?: any }}
 * @output {{ success: boolean, leadId: string, message: string }}
 * @errors 400, 401, 405, 500
 * @billing lead
 * @rateLimit none
 * @firestore leads
 */
exports.leadWebhook = functions
    .runWith({
    timeoutSeconds: 60,
    memory: "512MB",
})
    .https.onRequest(async (req, res) => {
    var _a, _b;
    if ((0, corsConfig_1.handleOptions)(req, res))
        return;
    (0, corsConfig_1.setCors)(req, res);
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    // Validate API key
    const apiKey = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
    const validApiKey = process.env.LEAD_WEBHOOK_API_KEY ||
        ((_b = functions.config().lead) === null || _b === void 0 ? void 0 : _b.webhook_api_key);
    if (!validApiKey) {
        res.status(500).json({ error: "Lead webhook API key not configured" });
        return;
    }
    if (apiKey !== validApiKey) {
        res.status(401).json({ error: "Invalid API key" });
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
        functions.logger.info(`Webhook created lead ${leadRef.id} for ${data.customerName} from IP ${req.ip}`);
        res.json({
            success: true,
            leadId: leadRef.id,
            message: "Lead created successfully",
        });
    }
    catch (error) {
        functions.logger.error("Lead webhook error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create lead",
        });
    }
});
//# sourceMappingURL=leads.js.map