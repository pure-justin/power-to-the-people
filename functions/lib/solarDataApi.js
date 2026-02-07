"use strict";
/**
 * Solar Data API - Cloud Functions
 *
 * Provides API endpoints for querying the nationwide solar database:
 * equipment, utility rates, incentives, permits, TPO providers,
 * and compound compliance/estimate endpoints.
 *
 * All endpoints require API key authentication with appropriate scopes.
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
exports.solarEstimate = exports.solarComplianceCheck = exports.solarPermits = exports.solarIncentives = exports.solarUtilities = exports.solarEquipment = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const apiKeys_1 = require("./apiKeys");
// ─── CORS Helper ───────────────────────────────────────────────────────────────
function setCors(res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
function handleOptions(req, res) {
    if (req.method === "OPTIONS") {
        setCors(res);
        res.status(204).send("");
        return true;
    }
    return false;
}
// ─── Equipment Endpoint ────────────────────────────────────────────────────────
/**
 * GET /equipment - Query solar equipment database
 *
 * Query params:
 *   type: "panel" | "inverter" | "battery" | "optimizer"
 *   manufacturer: string
 *   feoc_compliant: "true" | "false"
 *   domestic_content: "true" | "false"
 *   tariff_safe: "true" | "false"
 *   limit: number (default 50, max 200)
 */
exports.solarEquipment = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onRequest(async (req, res) => {
    if (handleOptions(req, res))
        return;
    setCors(res);
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_EQUIPMENT);
        const db = admin.firestore();
        let query = db.collection("solar_equipment");
        // Apply filters
        if (req.query.type) {
            query = query.where("type", "==", req.query.type);
        }
        if (req.query.manufacturer) {
            query = query.where("manufacturer", "==", req.query.manufacturer.toUpperCase());
        }
        if (req.query.feoc_compliant === "true") {
            query = query.where("feoc_compliant", "==", true);
        }
        if (req.query.domestic_content === "true") {
            query = query.where("domestic_content_compliant", "==", true);
        }
        if (req.query.tariff_safe === "true") {
            query = query.where("tariff_safe", "==", true);
        }
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        query = query.limit(limit);
        const snapshot = await query.get();
        const equipment = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.status(200).json({
            success: true,
            count: equipment.length,
            data: equipment,
        });
    }
    catch (error) {
        console.error("Solar equipment query error:", error);
        const status = error.code === "unauthenticated"
            ? 401
            : error.code === "permission-denied"
                ? 403
                : error.code === "resource-exhausted"
                    ? 429
                    : 500;
        res.status(status).json({
            error: error.message || "Failed to query equipment",
        });
    }
});
// ─── Utility Rates Endpoint ────────────────────────────────────────────────────
/**
 * GET /utilities - Query utility rate data
 *
 * Query params:
 *   state: string (e.g., "TX")
 *   zip: string (e.g., "78701")
 *   utility_name: string
 *   has_net_metering: "true" | "false"
 *   limit: number (default 50, max 200)
 */
exports.solarUtilities = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onRequest(async (req, res) => {
    if (handleOptions(req, res))
        return;
    setCors(res);
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_UTILITIES);
        const db = admin.firestore();
        let query = db.collection("solar_utility_rates");
        if (req.query.state) {
            query = query.where("state", "==", req.query.state.toUpperCase());
        }
        if (req.query.zip) {
            query = query.where("zip_codes", "array-contains", req.query.zip);
        }
        if (req.query.utility_name) {
            query = query.where("utility_name", "==", req.query.utility_name);
        }
        if (req.query.has_net_metering === "true") {
            query = query.where("has_net_metering", "==", true);
        }
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        query = query.limit(limit);
        const snapshot = await query.get();
        const rates = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.status(200).json({
            success: true,
            count: rates.length,
            data: rates,
        });
    }
    catch (error) {
        console.error("Solar utilities query error:", error);
        const status = error.code === "unauthenticated"
            ? 401
            : error.code === "permission-denied"
                ? 403
                : error.code === "resource-exhausted"
                    ? 429
                    : 500;
        res.status(status).json({
            error: error.message || "Failed to query utility rates",
        });
    }
});
// ─── Incentives Endpoint ───────────────────────────────────────────────────────
/**
 * GET /incentives - Query solar incentive programs
 *
 * Query params:
 *   state: string (e.g., "TX")
 *   type: "tax_credit" | "rebate" | "srec" | "performance" | "grant"
 *   status: "active" | "expired" | "upcoming"
 *   sector: "residential" | "commercial" | "both"
 *   limit: number (default 50, max 200)
 */
exports.solarIncentives = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onRequest(async (req, res) => {
    if (handleOptions(req, res))
        return;
    setCors(res);
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_INCENTIVES);
        const db = admin.firestore();
        let query = db.collection("solar_incentives");
        if (req.query.state) {
            query = query.where("state", "==", req.query.state.toUpperCase());
        }
        if (req.query.type) {
            query = query.where("incentive_type", "==", req.query.type);
        }
        if (req.query.status) {
            query = query.where("status", "==", req.query.status);
        }
        if (req.query.sector) {
            query = query.where("sector", "in", [req.query.sector, "both"]);
        }
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        query = query.limit(limit);
        const snapshot = await query.get();
        const incentives = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.status(200).json({
            success: true,
            count: incentives.length,
            data: incentives,
        });
    }
    catch (error) {
        console.error("Solar incentives query error:", error);
        const status = error.code === "unauthenticated"
            ? 401
            : error.code === "permission-denied"
                ? 403
                : error.code === "resource-exhausted"
                    ? 429
                    : 500;
        res.status(status).json({
            error: error.message || "Failed to query incentives",
        });
    }
});
// ─── Permits Endpoint ──────────────────────────────────────────────────────────
/**
 * GET /permits - Query permit requirements by jurisdiction
 *
 * Query params:
 *   state: string (e.g., "TX")
 *   jurisdiction: string (e.g., "houston_tx")
 *   county: string
 *   limit: number (default 50, max 200)
 */
exports.solarPermits = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onRequest(async (req, res) => {
    if (handleOptions(req, res))
        return;
    setCors(res);
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_PERMITS);
        const db = admin.firestore();
        let query = db.collection("solar_permits");
        if (req.query.state) {
            query = query.where("state", "==", req.query.state.toUpperCase());
        }
        if (req.query.jurisdiction) {
            query = query.where("jurisdiction_id", "==", req.query.jurisdiction);
        }
        if (req.query.county) {
            query = query.where("county", "==", req.query.county);
        }
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        query = query.limit(limit);
        const snapshot = await query.get();
        const permits = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.status(200).json({
            success: true,
            count: permits.length,
            data: permits,
        });
    }
    catch (error) {
        console.error("Solar permits query error:", error);
        const status = error.code === "unauthenticated"
            ? 401
            : error.code === "permission-denied"
                ? 403
                : error.code === "resource-exhausted"
                    ? 429
                    : 500;
        res.status(status).json({
            error: error.message || "Failed to query permits",
        });
    }
});
// ─── Compliance Check Endpoint ─────────────────────────────────────────────────
/**
 * POST /compliance/check - Compound compliance report
 *
 * Body:
 *   equipment_ids: string[]  - Equipment document IDs to check
 *   jurisdiction: string     - Jurisdiction ID for permit requirements
 *   state: string           - State code for incentives
 *   project_type: "residential" | "commercial"
 */
exports.solarComplianceCheck = functions
    .runWith({ timeoutSeconds: 60, memory: "512MB" })
    .https.onRequest(async (req, res) => {
    if (handleOptions(req, res))
        return;
    setCors(res);
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_COMPLIANCE);
        const { equipment_ids, jurisdiction, state, project_type } = req.body;
        if (!equipment_ids || !Array.isArray(equipment_ids)) {
            res.status(400).json({ error: "equipment_ids array is required" });
            return;
        }
        const db = admin.firestore();
        // Fetch equipment compliance data
        const equipmentResults = await Promise.all(equipment_ids.slice(0, 20).map(async (id) => {
            const doc = await db.collection("solar_equipment").doc(id).get();
            if (!doc.exists)
                return { id, found: false };
            const data = doc.data();
            return {
                id,
                found: true,
                name: data.name || data.model,
                manufacturer: data.manufacturer,
                type: data.type,
                feoc_compliant: data.feoc_compliant || false,
                domestic_content_compliant: data.domestic_content_compliant || false,
                tariff_safe: data.tariff_safe || false,
                country_of_origin: data.country_of_origin,
            };
        }));
        // Fetch permit requirements for jurisdiction
        let permitRequirements = null;
        if (jurisdiction) {
            const permitSnapshot = await db
                .collection("solar_permits")
                .where("jurisdiction_id", "==", jurisdiction)
                .limit(1)
                .get();
            if (!permitSnapshot.empty) {
                permitRequirements = {
                    id: permitSnapshot.docs[0].id,
                    ...permitSnapshot.docs[0].data(),
                };
            }
        }
        // Fetch applicable incentives
        let incentives = [];
        if (state) {
            const sector = project_type || "residential";
            const incentiveSnapshot = await db
                .collection("solar_incentives")
                .where("state", "==", state.toUpperCase())
                .where("status", "==", "active")
                .get();
            incentives = incentiveSnapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((inc) => inc.sector === "both" || inc.sector === sector);
        }
        // Overall compliance summary
        const allEquipmentFound = equipmentResults.every((e) => e.found);
        const allFeocCompliant = equipmentResults
            .filter((e) => e.found)
            .every((e) => e.feoc_compliant);
        const allDomesticContent = equipmentResults
            .filter((e) => e.found)
            .every((e) => e.domestic_content_compliant);
        const allTariffSafe = equipmentResults
            .filter((e) => e.found)
            .every((e) => e.tariff_safe);
        res.status(200).json({
            success: true,
            compliance_summary: {
                all_equipment_found: allEquipmentFound,
                feoc_compliant: allFeocCompliant,
                domestic_content_compliant: allDomesticContent,
                tariff_safe: allTariffSafe,
                eligible_for_itc: project_type === "commercial" &&
                    allFeocCompliant &&
                    allDomesticContent,
                incentives_available: incentives.length,
            },
            equipment: equipmentResults,
            permit_requirements: permitRequirements,
            incentives,
        });
    }
    catch (error) {
        console.error("Compliance check error:", error);
        const status = error.code === "unauthenticated"
            ? 401
            : error.code === "permission-denied"
                ? 403
                : error.code === "resource-exhausted"
                    ? 429
                    : 500;
        res.status(status).json({
            error: error.message || "Failed to run compliance check",
        });
    }
});
// ─── Solar Estimate Endpoint ───────────────────────────────────────────────────
/**
 * POST /estimate - Full solar estimate for an address
 *
 * Body:
 *   state: string          - State code (e.g., "TX")
 *   zip: string            - ZIP code
 *   jurisdiction: string   - Jurisdiction ID (optional)
 *   system_size_kw: number - Desired system size in kW
 *   monthly_bill: number   - Current monthly electric bill ($)
 *   project_type: "residential" | "commercial"
 *   equipment_preferences: {
 *     panel_type?: string
 *     feoc_required?: boolean
 *     domestic_content_required?: boolean
 *   }
 */
exports.solarEstimate = functions
    .runWith({ timeoutSeconds: 60, memory: "512MB" })
    .https.onRequest(async (req, res) => {
    if (handleOptions(req, res))
        return;
    setCors(res);
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Estimate requires at least READ_SOLAR scope
        await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_SOLAR);
        const { state, zip, jurisdiction, system_size_kw, monthly_bill, project_type = "residential", equipment_preferences = {}, } = req.body;
        if (!state || !system_size_kw) {
            res.status(400).json({
                error: "state and system_size_kw are required",
            });
            return;
        }
        const db = admin.firestore();
        // 1. Find utility rates
        let utilityQuery = db
            .collection("solar_utility_rates")
            .where("state", "==", state.toUpperCase());
        if (zip) {
            utilityQuery = utilityQuery.where("zip_codes", "array-contains", zip);
        }
        const utilitySnapshot = await utilityQuery.limit(5).get();
        const utilities = utilitySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        // 2. Find recommended equipment
        let equipmentQuery = db
            .collection("solar_equipment")
            .where("type", "==", "panel");
        if (equipment_preferences.feoc_required) {
            equipmentQuery = equipmentQuery.where("feoc_compliant", "==", true);
        }
        if (equipment_preferences.domestic_content_required) {
            equipmentQuery = equipmentQuery.where("domestic_content_compliant", "==", true);
        }
        const equipmentSnapshot = await equipmentQuery.limit(10).get();
        const recommendedPanels = equipmentSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        // 3. Find incentives
        const incentiveSnapshot = await db
            .collection("solar_incentives")
            .where("state", "==", state.toUpperCase())
            .where("status", "==", "active")
            .get();
        const incentives = incentiveSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((inc) => inc.sector === "both" || inc.sector === project_type);
        // 4. Find permit requirements
        let permitRequirements = null;
        if (jurisdiction) {
            const permitSnapshot = await db
                .collection("solar_permits")
                .where("jurisdiction_id", "==", jurisdiction)
                .limit(1)
                .get();
            if (!permitSnapshot.empty) {
                permitRequirements = {
                    id: permitSnapshot.docs[0].id,
                    ...permitSnapshot.docs[0].data(),
                };
            }
        }
        // 5. Find TPO/financing options
        const tpoSnapshot = await db
            .collection("solar_tpo_providers")
            .where("states", "array-contains", state.toUpperCase())
            .limit(10)
            .get();
        const financingOptions = tpoSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        // 6. Basic cost estimate
        const avgCostPerWatt = project_type === "residential" ? 3.0 : 2.5;
        const systemCost = system_size_kw * 1000 * avgCostPerWatt;
        const annualProduction = system_size_kw * 1400; // ~1400 kWh/kW in TX
        const annualSavings = monthly_bill ? monthly_bill * 12 * 0.85 : 0;
        const simplePayback = annualSavings > 0
            ? Math.round((systemCost / annualSavings) * 10) / 10
            : null;
        // Calculate ITC if applicable
        let itcAmount = 0;
        if (project_type === "commercial") {
            // 30% ITC for commercial (2026)
            itcAmount = systemCost * 0.3;
        }
        // Residential ITC ended Jan 1, 2026
        res.status(200).json({
            success: true,
            estimate: {
                system_size_kw,
                project_type,
                estimated_cost: {
                    total: systemCost,
                    per_watt: avgCostPerWatt,
                    after_incentives: systemCost - itcAmount,
                },
                production: {
                    annual_kwh: annualProduction,
                    monthly_kwh: Math.round(annualProduction / 12),
                },
                savings: {
                    monthly_bill,
                    estimated_annual_savings: annualSavings,
                    simple_payback_years: simplePayback,
                },
                itc: {
                    eligible: project_type === "commercial",
                    rate: project_type === "commercial" ? 0.3 : 0,
                    amount: itcAmount,
                    note: project_type === "residential"
                        ? "Residential ITC ended January 1, 2026. Consider lease/PPA for TPO ITC."
                        : "30% ITC available for commercial projects with compliant equipment.",
                },
            },
            utility_rates: utilities,
            recommended_equipment: recommendedPanels,
            incentives,
            permit_requirements: permitRequirements,
            financing_options: financingOptions,
        });
    }
    catch (error) {
        console.error("Solar estimate error:", error);
        const status = error.code === "unauthenticated"
            ? 401
            : error.code === "permission-denied"
                ? 403
                : error.code === "resource-exhausted"
                    ? 429
                    : 500;
        res.status(status).json({
            error: error.message || "Failed to generate solar estimate",
        });
    }
});
//# sourceMappingURL=solarDataApi.js.map