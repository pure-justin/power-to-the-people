/**
 * Solar Data API - Cloud Functions
 *
 * Provides API endpoints for querying the nationwide solar database:
 * equipment, utility rates, incentives, permits, TPO providers,
 * and compound compliance/estimate endpoints.
 *
 * All endpoints require API key authentication with appropriate scopes.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { validateApiKeyFromRequest, ApiKeyScope } from "./apiKeys";
import {
  analyzeCompliance,
  quickComplianceCheck,
  ComplianceInput,
} from "./complianceEngine";
import { setCors, handleOptions } from "./corsConfig";

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
export const solarEquipment = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    if (handleOptions(req, res)) return;
    setCors(req, res);

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await validateApiKeyFromRequest(req, ApiKeyScope.READ_EQUIPMENT);

      const db = admin.firestore();
      const collectionRef = db.collection("solar_equipment");
      let query: admin.firestore.Query = collectionRef;

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
        const typeVal = req.query.type as string;
        if (!validTypes.includes(typeVal)) {
          res.status(400).json({
            error: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
          });
          return;
        }
        query = query.where("type", "==", typeVal);
      }

      if (req.query.manufacturer) {
        query = query.where(
          "manufacturer",
          "==",
          (req.query.manufacturer as string).toUpperCase(),
        );
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
        query = query.where(
          "pricing.distributor_availability",
          "==",
          req.query.availability as string,
        );
      }

      // Tags filter (comma-separated, uses array-contains-any)
      if (req.query.tags) {
        const tags = (req.query.tags as string)
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
          .slice(0, 10); // Firestore limit for array-contains-any
        if (tags.length > 0) {
          query = query.where("tags", "array-contains-any", tags);
        }
      }

      // Sorting
      const sortBy = (req.query.sortBy as string) || "manufacturer";
      const sortOrder =
        (req.query.sortOrder as string) === "desc" ? "desc" : "asc";
      const sortFieldMap: Record<string, string> = {
        manufacturer: "manufacturer",
        model: "model",
        wattage: "wattage_w",
        price: "pricing.wholesale_per_unit",
      };
      const sortField = sortFieldMap[sortBy] || "manufacturer";
      query = query.orderBy(sortField, sortOrder as "asc" | "desc");

      // Pagination
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      // startAfter cursor-based pagination
      if (req.query.startAfter) {
        const cursorDoc = await collectionRef
          .doc(req.query.startAfter as string)
          .get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      } else if (offset > 0) {
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
        const searchTerm = (req.query.search as string).toLowerCase();
        equipment = equipment.filter((item: any) => {
          const searchText = item.search_text || "";
          return searchText.includes(searchTerm);
        });
      }

      // Price range filters (client-side since Firestore limits inequality filters)
      const minPrice = parseFloat(req.query.min_price as string);
      const maxPrice = parseFloat(req.query.max_price as string);
      if (!isNaN(minPrice)) {
        equipment = equipment.filter((item: any) => {
          const price = item.pricing?.wholesale_per_unit ?? 0;
          return price >= minPrice;
        });
      }
      if (!isNaN(maxPrice)) {
        equipment = equipment.filter((item: any) => {
          const price = item.pricing?.wholesale_per_unit ?? 0;
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
    } catch (error: any) {
      console.error("Solar equipment query error:", error);
      const status =
        error.code === "unauthenticated"
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
export const solarUtilities = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    if (handleOptions(req, res)) return;
    setCors(req, res);

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await validateApiKeyFromRequest(req, ApiKeyScope.READ_UTILITIES);

      const db = admin.firestore();
      let query: admin.firestore.Query = db.collection("solar_utility_rates");

      if (req.query.state) {
        query = query.where(
          "state",
          "==",
          (req.query.state as string).toUpperCase(),
        );
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

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
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
    } catch (error: any) {
      console.error("Solar utilities query error:", error);
      const status =
        error.code === "unauthenticated"
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
export const solarIncentives = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    if (handleOptions(req, res)) return;
    setCors(req, res);

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await validateApiKeyFromRequest(req, ApiKeyScope.READ_INCENTIVES);

      const db = admin.firestore();
      let query: admin.firestore.Query = db.collection("solar_incentives");

      if (req.query.state) {
        query = query.where(
          "state",
          "==",
          (req.query.state as string).toUpperCase(),
        );
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

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
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
    } catch (error: any) {
      console.error("Solar incentives query error:", error);
      const status =
        error.code === "unauthenticated"
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
export const solarPermits = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    if (handleOptions(req, res)) return;
    setCors(req, res);

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await validateApiKeyFromRequest(req, ApiKeyScope.READ_PERMITS);

      const db = admin.firestore();
      let query: admin.firestore.Query = db.collection("solar_permits");

      if (req.query.state) {
        query = query.where(
          "state",
          "==",
          (req.query.state as string).toUpperCase(),
        );
      }
      if (req.query.jurisdiction) {
        query = query.where("jurisdiction_id", "==", req.query.jurisdiction);
      }
      if (req.query.county) {
        query = query.where("county", "==", req.query.county);
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
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
    } catch (error: any) {
      console.error("Solar permits query error:", error);
      const status =
        error.code === "unauthenticated"
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
export const solarComplianceCheck = functions
  .runWith({ timeoutSeconds: 60, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    if (handleOptions(req, res)) return;
    setCors(req, res);

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await validateApiKeyFromRequest(req, ApiKeyScope.READ_COMPLIANCE);

      const {
        equipment_ids,
        jurisdiction,
        state,
        project_type,
        financing_type,
        system_cost,
        installation_date,
      } = req.body;

      if (!equipment_ids || !Array.isArray(equipment_ids)) {
        res.status(400).json({ error: "equipment_ids array is required" });
        return;
      }

      // Run the compliance engine analysis
      const complianceInput: ComplianceInput = {
        equipment_ids: equipment_ids.slice(0, 20),
        project_type: project_type || "residential",
        state: (state || "").toUpperCase(),
        financing_type: financing_type || "cash",
        system_cost: system_cost || 0,
        installation_date,
      };

      const complianceResult = await analyzeCompliance(complianceInput);

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
      let incentives: any[] = [];
      if (state) {
        const sector = project_type || "residential";
        const incentiveSnapshot = await db
          .collection("solar_incentives")
          .where("state", "==", state.toUpperCase())
          .where("status", "==", "active")
          .get();
        incentives = incentiveSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((inc: any) => inc.sector === "both" || inc.sector === sector);
      }

      res.status(200).json({
        success: true,
        compliance: complianceResult,
        permit_requirements: permitRequirements,
        incentives,
      });
    } catch (error: any) {
      console.error("Compliance check error:", error);
      const status =
        error.code === "unauthenticated"
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
export const solarComplianceQuickCheck = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    if (handleOptions(req, res)) return;
    setCors(req, res);

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await validateApiKeyFromRequest(req, ApiKeyScope.READ_COMPLIANCE);

      const equipmentId = req.query.equipment_id as string;
      if (!equipmentId) {
        res
          .status(400)
          .json({ error: "equipment_id query parameter is required" });
        return;
      }

      const result = await quickComplianceCheck(equipmentId);

      res.status(200).json({
        success: true,
        compliance: result,
      });
    } catch (error: any) {
      console.error("Quick compliance check error:", error);
      const status =
        error.code === "unauthenticated"
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
export const solarEstimate = functions
  .runWith({ timeoutSeconds: 60, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    if (handleOptions(req, res)) return;
    setCors(req, res);

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Estimate requires at least READ_SOLAR scope
      await validateApiKeyFromRequest(req, ApiKeyScope.READ_SOLAR);

      const {
        state,
        zip,
        jurisdiction,
        system_size_kw,
        monthly_bill,
        project_type = "residential",
        equipment_preferences = {},
      } = req.body;

      if (!state || !system_size_kw) {
        res.status(400).json({
          error: "state and system_size_kw are required",
        });
        return;
      }

      const db = admin.firestore();

      // 1. Find utility rates
      let utilityQuery: admin.firestore.Query = db
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
      let equipmentQuery: admin.firestore.Query = db
        .collection("solar_equipment")
        .where("type", "==", "panel");
      if (equipment_preferences.feoc_required) {
        equipmentQuery = equipmentQuery.where("feoc_compliant", "==", true);
      }
      if (equipment_preferences.domestic_content_required) {
        equipmentQuery = equipmentQuery.where(
          "domestic_content_compliant",
          "==",
          true,
        );
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
        .filter(
          (inc: any) => inc.sector === "both" || inc.sector === project_type,
        );

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
      } else if (state) {
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
        if (nrelData?.cities) {
          const cities = Object.values(nrelData.cities) as any[];
          if (cities.length > 0) {
            const avgKwh =
              cities.reduce(
                (sum: number, c: any) => sum + (c.ac_annual_kwh || 0),
                0,
              ) / cities.length;
            const systemKw = nrelData.system_capacity_kw || 8;
            kwhPerKw = Math.round(avgKwh / systemKw);
          }
        }
      }
      const annualProduction = system_size_kw * kwhPerKw;
      const annualSavings = monthly_bill ? monthly_bill * 12 * 0.85 : 0;
      const simplePayback =
        annualSavings > 0
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
            note:
              project_type === "residential"
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
    } catch (error: any) {
      console.error("Solar estimate error:", error);
      const status =
        error.code === "unauthenticated"
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
