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
exports.solarEstimate = exports.solarComplianceQuickCheck = exports.solarComplianceCheck = exports.solarPermits = exports.solarIncentives = exports.solarUtilities = exports.solarEquipment = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const apiKeys_1 = require("./apiKeys");
const complianceEngine_1 = require("./complianceEngine");
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
 * Queries the solar equipment database with search, filtering, sorting, and pagination
 *
 * @function solarEquipment
 * @type onRequest
 * @method GET
 * @auth api_key
 * @scope read_equipment
 * @input {{ type?: "panel" | "inverter" | "battery" | "optimizer" | "racking" | "rapid_shutdown" | "electrical_bos" | "monitoring" | "ev_charger", manufacturer?: string, feoc_compliant?: "true" | "false", domestic_content?: "true" | "false", tariff_safe?: "true" | "false", search?: string, limit?: number, offset?: number, startAfter?: string, sortBy?: "manufacturer" | "model" | "wattage" | "price", sortOrder?: "asc" | "desc", availability?: "in_stock" | "backorder", min_price?: number, max_price?: number, tags?: string }}
 * @output {{ success: boolean, count: number, total: number, hasMore: boolean, data: object[] }}
 * @errors unauthenticated, permission-denied, resource-exhausted, internal
 * @billing api_call
 * @rateLimit api_key
 * @firestore solar_equipment
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
        const collectionRef = db.collection("solar_equipment");
        let query = collectionRef;
        // Validate type against all 9 categories
        const validTypes = [
            "panel",
            "inverter",
            "battery",
            "optimizer",
            "racking",
            "rapid_shutdown",
            "electrical_bos",
            "monitoring",
            "ev_charger",
        ];
        if (req.query.type) {
            const typeVal = req.query.type;
            if (!validTypes.includes(typeVal)) {
                res.status(400).json({
                    error: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
                });
                return;
            }
            query = query.where("type", "==", typeVal);
        }
        if (req.query.manufacturer) {
            query = query.where("manufacturer", "==", req.query.manufacturer.toUpperCase());
        }
        if (req.query.feoc_compliant === "true") {
            query = query.where("feoc_compliant", "==", true);
        }
        if (req.query.domestic_content === "true") {
            query = query.where("domestic_content_eligible", "==", true);
        }
        if (req.query.tariff_safe === "true") {
            query = query.where("tariff_safe", "==", true);
        }
        // Availability filter
        if (req.query.availability) {
            query = query.where("pricing.distributor_availability", "==", req.query.availability);
        }
        // Tags filter (comma-separated, uses array-contains-any)
        if (req.query.tags) {
            const tags = req.query.tags
                .split(",")
                .map((t) => t.trim().toLowerCase())
                .filter((t) => t.length > 0)
                .slice(0, 10); // Firestore limit for array-contains-any
            if (tags.length > 0) {
                query = query.where("tags", "array-contains-any", tags);
            }
        }
        // Sorting
        const sortBy = req.query.sortBy || "manufacturer";
        const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
        const sortFieldMap = {
            manufacturer: "manufacturer",
            model: "model",
            wattage: "wattage_w",
            price: "pricing.wholesale_per_unit",
        };
        const sortField = sortFieldMap[sortBy] || "manufacturer";
        query = query.orderBy(sortField, sortOrder);
        // Pagination
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const offset = parseInt(req.query.offset) || 0;
        // startAfter cursor-based pagination
        if (req.query.startAfter) {
            const cursorDoc = await collectionRef
                .doc(req.query.startAfter)
                .get();
            if (cursorDoc.exists) {
                query = query.startAfter(cursorDoc);
            }
        }
        else if (offset > 0) {
            query = query.offset(offset);
        }
        query = query.limit(limit + 1); // Fetch one extra to determine hasMore
        const snapshot = await query.get();
        const hasMore = snapshot.docs.length > limit;
        const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
        let equipment = docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        // Text search: client-side filter on search_text field
        if (req.query.search) {
            const searchTerm = req.query.search.toLowerCase();
            equipment = equipment.filter((item) => {
                const searchText = item.search_text || "";
                return searchText.includes(searchTerm);
            });
        }
        // Price range filters (client-side since Firestore limits inequality filters)
        const minPrice = parseFloat(req.query.min_price);
        const maxPrice = parseFloat(req.query.max_price);
        if (!isNaN(minPrice)) {
            equipment = equipment.filter((item) => {
                var _a, _b;
                const price = (_b = (_a = item.pricing) === null || _a === void 0 ? void 0 : _a.wholesale_per_unit) !== null && _b !== void 0 ? _b : 0;
                return price >= minPrice;
            });
        }
        if (!isNaN(maxPrice)) {
            equipment = equipment.filter((item) => {
                var _a, _b;
                const price = (_b = (_a = item.pricing) === null || _a === void 0 ? void 0 : _a.wholesale_per_unit) !== null && _b !== void 0 ? _b : 0;
                return price <= maxPrice;
            });
        }
        // Get total count for the base query (without pagination)
        // Use a count query if type filter is set for efficiency
        let total = equipment.length + offset;
        if (hasMore) {
            // Estimate: there are more docs beyond what we fetched
            total = offset + equipment.length + 1; // Minimum; exact count requires separate query
        }
        res.status(200).json({
            success: true,
            count: equipment.length,
            total,
            hasMore,
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
 * Queries utility rate data by state, ZIP code, or utility name
 *
 * @function solarUtilities
 * @type onRequest
 * @method GET
 * @auth api_key
 * @scope read_utilities
 * @input {{ state?: string, zip?: string, utility_name?: string, has_net_metering?: "true" | "false", limit?: number }}
 * @output {{ success: boolean, count: number, data: object[] }}
 * @errors unauthenticated, permission-denied, resource-exhausted, internal
 * @billing api_call
 * @rateLimit api_key
 * @firestore solar_utility_rates
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
 * Queries active, expired, or upcoming solar incentive programs by state and sector
 *
 * @function solarIncentives
 * @type onRequest
 * @method GET
 * @auth api_key
 * @scope read_incentives
 * @input {{ state?: string, type?: "tax_credit" | "rebate" | "srec" | "performance" | "grant", status?: "active" | "expired" | "upcoming", sector?: "residential" | "commercial" | "both", limit?: number }}
 * @output {{ success: boolean, count: number, data: object[] }}
 * @errors unauthenticated, permission-denied, resource-exhausted, internal
 * @billing api_call
 * @rateLimit api_key
 * @firestore solar_incentives
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
 * Queries solar permit requirements by state, jurisdiction, or county
 *
 * @function solarPermits
 * @type onRequest
 * @method GET
 * @auth api_key
 * @scope read_permits
 * @input {{ state?: string, jurisdiction?: string, county?: string, limit?: number }}
 * @output {{ success: boolean, count: number, data: object[] }}
 * @errors unauthenticated, permission-denied, resource-exhausted, internal
 * @billing api_call
 * @rateLimit api_key
 * @firestore solar_permits
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
 * Runs a compound compliance report across equipment FEOC/domestic content, permits, and incentives
 *
 * @function solarComplianceCheck
 * @type onRequest
 * @method POST
 * @auth api_key
 * @scope read_compliance
 * @input {{ equipment_ids: string[], jurisdiction?: string, state?: string, project_type?: "residential" | "commercial" }}
 * @output {{ success: boolean, compliance_summary: object, equipment: object[], permit_requirements: object | null, incentives: object[] }}
 * @errors unauthenticated, permission-denied, resource-exhausted, internal
 * @billing compliance_check
 * @rateLimit api_key
 * @firestore solar_equipment, solar_permits, solar_incentives
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
        const { equipment_ids, jurisdiction, state, project_type, financing_type, system_cost, installation_date, } = req.body;
        if (!equipment_ids || !Array.isArray(equipment_ids)) {
            res.status(400).json({ error: "equipment_ids array is required" });
            return;
        }
        // Run the compliance engine analysis
        const complianceInput = {
            equipment_ids: equipment_ids.slice(0, 20),
            project_type: project_type || "residential",
            state: (state || "").toUpperCase(),
            financing_type: financing_type || "cash",
            system_cost: system_cost || 0,
            installation_date,
        };
        const complianceResult = await (0, complianceEngine_1.analyzeCompliance)(complianceInput);
        const db = admin.firestore();
        // Fetch permit requirements for jurisdiction (keep existing behavior)
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
        // Fetch applicable incentives (keep existing behavior)
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
        res.status(200).json({
            success: true,
            compliance: complianceResult,
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
// ─── Quick Compliance Check Endpoint ──────────────────────────────────────────
/**
 * Quick compliance check for a single equipment item
 *
 * @function solarComplianceQuickCheck
 * @type onRequest
 * @method GET
 * @auth api_key
 * @scope read_compliance
 * @input {{ equipment_id: string }}
 * @output {{ success: boolean, compliance: SingleEquipmentCompliance }}
 * @errors unauthenticated, permission-denied, resource-exhausted, internal
 * @billing api_call
 * @rateLimit api_key
 * @firestore solar_equipment
 */
exports.solarComplianceQuickCheck = functions
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
        await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_COMPLIANCE);
        const equipmentId = req.query.equipment_id;
        if (!equipmentId) {
            res
                .status(400)
                .json({ error: "equipment_id query parameter is required" });
            return;
        }
        const result = await (0, complianceEngine_1.quickComplianceCheck)(equipmentId);
        res.status(200).json({
            success: true,
            compliance: result,
        });
    }
    catch (error) {
        console.error("Quick compliance check error:", error);
        const status = error.code === "unauthenticated"
            ? 401
            : error.code === "permission-denied"
                ? 403
                : error.code === "resource-exhausted"
                    ? 429
                    : 500;
        res.status(status).json({
            error: error.message || "Failed to run quick compliance check",
        });
    }
});
// ─── Solar Estimate Endpoint ───────────────────────────────────────────────────
/**
 * Generates a full solar estimate including cost, production, incentives, equipment, permits, and financing
 *
 * @function solarEstimate
 * @type onRequest
 * @method POST
 * @auth api_key
 * @scope read_solar
 * @input {{ state: string, zip?: string, jurisdiction?: string, system_size_kw: number, monthly_bill?: number, project_type?: "residential" | "commercial", equipment_preferences?: { panel_type?: string, feoc_required?: boolean, domestic_content_required?: boolean } }}
 * @output {{ success: boolean, estimate: object, utility_rates: object[], recommended_equipment: object[], incentives: object[], permit_requirements: object | null, financing_options: object[] }}
 * @errors unauthenticated, permission-denied, resource-exhausted, internal
 * @billing api_call
 * @rateLimit api_key
 * @firestore solar_utility_rates, solar_equipment, solar_incentives, solar_permits, solar_tpo_providers
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
        // 4. Find permit requirements (by jurisdiction or by state)
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
        else if (state) {
            const permitSnapshot = await db
                .collection("solar_permits")
                .doc(state.toUpperCase())
                .get();
            if (permitSnapshot.exists) {
                permitRequirements = {
                    id: permitSnapshot.id,
                    ...permitSnapshot.data(),
                };
            }
        }
        // 4b. Check energy community status
        let energyCommunity = null;
        const ecSnapshot = await db
            .collection("energy_communities")
            .where("state", "==", state.toUpperCase())
            .where("category", "==", "statistical_area")
            .limit(1)
            .get();
        if (!ecSnapshot.empty) {
            energyCommunity = {
                id: ecSnapshot.docs[0].id,
                ...ecSnapshot.docs[0].data(),
                bonus_percentage: 10,
            };
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
        // Look up solar resource data for this state from NREL data
        let kwhPerKw = 1400; // Default fallback
        const nrelSnapshot = await db
            .collection("solar_resource_data")
            .doc(state.toUpperCase())
            .get();
        if (nrelSnapshot.exists) {
            const nrelData = nrelSnapshot.data();
            // Use first city's capacity factor to estimate state average
            if (nrelData === null || nrelData === void 0 ? void 0 : nrelData.cities) {
                const cities = Object.values(nrelData.cities);
                if (cities.length > 0) {
                    const avgKwh = cities.reduce((sum, c) => sum + (c.ac_annual_kwh || 0), 0) / cities.length;
                    const systemKw = nrelData.system_capacity_kw || 8;
                    kwhPerKw = Math.round(avgKwh / systemKw);
                }
            }
        }
        const annualProduction = system_size_kw * kwhPerKw;
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
            energy_community: energyCommunity,
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