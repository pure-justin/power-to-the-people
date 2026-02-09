"use strict";
/**
 * Secure Lead Webhook - Example Integration
 *
 * Demonstrates how to integrate API key authentication with existing endpoints.
 * This is a secure version of leadWebhook that requires API key authentication.
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
exports.secureLeadQuery = exports.secureSolarWebhook = exports.secureLeadWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const apiKeys_1 = require("./apiKeys");
const leads_1 = require("./leads");
const corsConfig_1 = require("./corsConfig");
/**
 * Creates a new lead via API key authentication with automatic rate limiting and usage tracking
 *
 * @function secureLeadWebhook
 * @type onRequest
 * @method POST
 * @auth api_key
 * @scope WRITE_LEADS
 * @input {{ customerName: string, email: string, phone: string, address: string, city: string, state: string, zip: string, source?: LeadSource, utmSource?: string, utmMedium?: string, utmCampaign?: string, systemSize?: number, batterySize?: number, annualKwh?: number, solarApiData?: any }}
 * @output {{ success: boolean, leadId: string, message: string, usage: { requestsThisHour: number, hourlyLimit: number, requestsThisDay: number, dailyLimit: number } }}
 * @errors 400, 401, 403, 405, 429, 500
 * @billing api_call, lead
 * @rateLimit api_key
 * @firestore leads, apiKeys
 */
exports.secureLeadWebhook = functions
    .runWith({
    timeoutSeconds: 60,
    memory: "512MB",
})
    .https.onRequest(async (req, res) => {
    if ((0, corsConfig_1.handleOptions)(req, res))
        return;
    (0, corsConfig_1.setCors)(req, res);
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Validate API key and check for write_leads scope
        const apiKeyData = await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.WRITE_LEADS);
        functions.logger.info(`Authenticated request from API key ${apiKeyData.id} (user: ${apiKeyData.userId})`);
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
        // Create lead
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
            status: leads_1.LeadStatus.SUBMITTED,
            source: data.source || leads_1.LeadSource.API,
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
            // Store API key info for tracking
            createdBy: apiKeyData.userId,
        };
        // Calculate lead score if we have solar data
        if (data.solarApiData || data.annualKwh || data.systemSize) {
            newLead.score = calculateLeadScore(newLead);
        }
        await leadRef.set(newLead);
        functions.logger.info(`API key ${apiKeyData.id} created lead ${leadRef.id} for ${data.customerName}`);
        res.json({
            success: true,
            leadId: leadRef.id,
            message: "Lead created successfully",
            // Return usage info so client can track their quota
            usage: {
                requestsThisHour: apiKeyData.usageStats.requestsThisHour,
                hourlyLimit: apiKeyData.rateLimit.requestsPerHour,
                requestsThisDay: apiKeyData.usageStats.requestsThisDay,
                dailyLimit: apiKeyData.rateLimit.requestsPerDay,
            },
        });
    }
    catch (error) {
        functions.logger.error("Secure lead webhook error:", error);
        // Handle specific API key errors
        if (error.code === "unauthenticated") {
            res.status(401).json({
                success: false,
                error: "Invalid or missing API key",
            });
        }
        else if (error.code === "permission-denied") {
            res.status(403).json({
                success: false,
                error: error.message || "Permission denied",
            });
        }
        else if (error.code === "resource-exhausted") {
            res.status(429).json({
                success: false,
                error: error.message || "Rate limit exceeded",
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: error.message || "Failed to create lead",
            });
        }
    }
});
/**
 * Calculate lead score based on available data
 * (Duplicated from leads.ts for this example)
 */
function calculateLeadScore(lead) {
    let score = 50;
    if (lead.solarApiData) {
        const maxPanels = lead.solarApiData.maxArrayPanels || 0;
        const sunshineHours = lead.solarApiData.maxSunshineHours || 0;
        if (maxPanels > 20)
            score += 10;
        if (sunshineHours > 1500)
            score += 10;
        if (lead.systemSize && lead.systemSize > 7)
            score += 5;
    }
    if (lead.annualKwh) {
        if (lead.annualKwh > 12000)
            score += 10;
        if (lead.annualKwh > 15000)
            score += 5;
    }
    if (lead.phone && lead.phone.length >= 10)
        score += 5;
    if (lead.email && lead.email.includes("@"))
        score += 5;
    return Math.max(0, Math.min(100, Math.round(score)));
}
/**
 * Triggers solar analysis for an address via API key authentication and optionally updates an existing lead
 *
 * @function secureSolarWebhook
 * @type onRequest
 * @method POST
 * @auth api_key
 * @scope WRITE_SOLAR
 * @input {{ address: string, leadId?: string }}
 * @output {{ success: boolean, data: { address: string, maxArrayPanels: number, maxArrayArea: number, maxSunshineHours: number, carbonOffset: number, estimatedSystemSize: number, estimatedAnnualProduction: number }, usage: { requestsThisHour: number, hourlyLimit: number } }}
 * @errors 400, 401, 403, 405, 429, 500
 * @billing api_call
 * @rateLimit api_key
 * @firestore leads, apiKeys
 */
exports.secureSolarWebhook = functions
    .runWith({
    timeoutSeconds: 120,
    memory: "1GB",
})
    .https.onRequest(async (req, res) => {
    var _a;
    if ((0, corsConfig_1.handleOptions)(req, res))
        return;
    (0, corsConfig_1.setCors)(req, res);
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Validate API key with write_solar scope
        const apiKeyData = await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.WRITE_SOLAR);
        const { address, leadId } = req.body;
        if (!address) {
            res.status(400).json({ error: "Address is required" });
            return;
        }
        // Google Solar API integration required
        // Configure GOOGLE_SOLAR_API_KEY in Firebase config to enable
        const googleSolarApiKey = process.env.GOOGLE_SOLAR_API_KEY ||
            ((_a = functions.config().google) === null || _a === void 0 ? void 0 : _a.solar_api_key);
        if (!googleSolarApiKey) {
            res.status(501).json({
                success: false,
                error: "Solar API integration not configured. Set google.solar_api_key in Firebase config.",
            });
            return;
        }
        // Call Google Solar API Building Insights
        const encodedAddress = encodeURIComponent(address);
        const solarApiUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.address=${encodedAddress}&key=${googleSolarApiKey}`;
        const apiResponse = await fetch(solarApiUrl);
        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            functions.logger.error("Google Solar API error:", errorBody);
            res.status(502).json({
                success: false,
                error: "Google Solar API request failed",
            });
            return;
        }
        const buildingInsights = await apiResponse.json();
        const solarPotential = buildingInsights.solarPotential || {};
        const solarData = {
            address,
            maxArrayPanels: solarPotential.maxArrayPanelsCount || 0,
            maxArrayArea: solarPotential.maxArrayAreaMeters2 || 0,
            maxSunshineHours: solarPotential.maxSunshineHoursPerYear || 0,
            carbonOffset: solarPotential.carbonOffsetFactorKgPerMwh || 0,
            estimatedSystemSize: ((solarPotential.maxArrayPanelsCount || 0) * 0.4) / 1000 || 0,
            estimatedAnnualProduction: 0,
            rawBuildingInsights: buildingInsights,
        };
        // Estimate annual production from panel configs if available
        const panelConfigs = solarPotential.solarPanelConfigs;
        if (Array.isArray(panelConfigs) && panelConfigs.length > 0) {
            const bestConfig = panelConfigs[panelConfigs.length - 1];
            solarData.estimatedAnnualProduction = bestConfig.yearlyEnergyDcKwh || 0;
        }
        // If leadId provided, update the lead with real data
        if (leadId) {
            const db = admin.firestore();
            await db.collection("leads").doc(leadId).update({
                solarApiData: solarData,
                systemSize: solarData.estimatedSystemSize,
                updatedAt: admin.firestore.Timestamp.now(),
            });
        }
        res.json({
            success: true,
            data: solarData,
            usage: {
                requestsThisHour: apiKeyData.usageStats.requestsThisHour,
                hourlyLimit: apiKeyData.rateLimit.requestsPerHour,
            },
        });
    }
    catch (error) {
        functions.logger.error("Secure solar webhook error:", error);
        if (error.code === "unauthenticated") {
            res.status(401).json({ error: "Invalid or missing API key" });
        }
        else if (error.code === "permission-denied") {
            res.status(403).json({ error: error.message });
        }
        else if (error.code === "resource-exhausted") {
            res.status(429).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Failed to analyze solar data" });
        }
    }
});
/**
 * Queries leads owned by the API key holder with optional status filtering and pagination
 *
 * @function secureLeadQuery
 * @type onRequest
 * @method GET
 * @auth api_key
 * @scope READ_LEADS
 * @input {{ status?: string, limit?: number, offset?: number }}
 * @output {{ success: boolean, leads: Lead[], count: number, pagination: { limit: number, offset: number }, usage: { requestsThisHour: number, hourlyLimit: number } }}
 * @errors 401, 403, 405, 429, 500
 * @billing api_call
 * @rateLimit api_key
 * @firestore leads, apiKeys
 */
exports.secureLeadQuery = functions
    .runWith({
    timeoutSeconds: 30,
    memory: "512MB",
})
    .https.onRequest(async (req, res) => {
    if ((0, corsConfig_1.handleOptions)(req, res))
        return;
    (0, corsConfig_1.setCors)(req, res);
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Validate API key with read_leads scope
        const apiKeyData = await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_LEADS);
        const db = admin.firestore();
        const { status, limit = 10, offset = 0 } = req.query;
        // Build query
        let query = db.collection("leads").orderBy("createdAt", "desc");
        // Filter by status if provided
        if (status && typeof status === "string") {
            query = query.where("status", "==", status);
        }
        // Only return leads created by this API key's owner
        // (for multi-tenant security)
        query = query.where("createdBy", "==", apiKeyData.userId);
        // Apply pagination
        const limitNum = parseInt(limit) || 10;
        const offsetNum = parseInt(offset) || 0;
        if (offsetNum > 0) {
            const skipSnapshot = await query.limit(offsetNum).get();
            if (!skipSnapshot.empty) {
                const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
                query = query.startAfter(lastDoc);
            }
        }
        const snapshot = await query.limit(limitNum).get();
        const leads = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json({
            success: true,
            leads,
            count: leads.length,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
            },
            usage: {
                requestsThisHour: apiKeyData.usageStats.requestsThisHour,
                hourlyLimit: apiKeyData.rateLimit.requestsPerHour,
            },
        });
    }
    catch (error) {
        functions.logger.error("Secure lead query error:", error);
        if (error.code === "unauthenticated") {
            res.status(401).json({ error: "Invalid or missing API key" });
        }
        else if (error.code === "permission-denied") {
            res.status(403).json({ error: error.message });
        }
        else if (error.code === "resource-exhausted") {
            res.status(429).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Failed to query leads" });
        }
    }
});
//# sourceMappingURL=secureLeadWebhook.js.map