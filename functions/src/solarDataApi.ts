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

// ─── CORS Helper ───────────────────────────────────────────────────────────────

function setCors(res: functions.Response): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function handleOptions(
  req: functions.https.Request,
  res: functions.Response,
): boolean {
  if (req.method === "OPTIONS") {
    setCors(res);
    res.status(204).send("");
    return true;
  }
  return false;
}

// ─── Equipment Endpoint ────────────────────────────────────────────────────────

/**
 * Queries the solar equipment database with optional compliance and manufacturer filters
 *
 * @function solarEquipment
 * @type onRequest
 * @method GET
 * @auth api_key
 * @scope read_equipment
 * @input {{ type?: "panel" | "inverter" | "battery" | "optimizer", manufacturer?: string, feoc_compliant?: "true" | "false", domestic_content?: "true" | "false", tariff_safe?: "true" | "false", limit?: number }}
 * @output {{ success: boolean, count: number, data: object[] }}
 * @errors unauthenticated, permission-denied, resource-exhausted, internal
 * @billing api_call
 * @rateLimit api_key
 * @firestore solar_equipment
 */
export const solarEquipment = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    if (handleOptions(req, res)) return;
    setCors(res);

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await validateApiKeyFromRequest(req, ApiKeyScope.READ_EQUIPMENT);

      const db = admin.firestore();
      let query: admin.firestore.Query = db.collection("solar_equipment");

      // Apply filters
      if (req.query.type) {
        query = query.where("type", "==", req.query.type);
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
        query = query.where("domestic_content_compliant", "==", true);
      }
      if (req.query.tariff_safe === "true") {
        query = query.where("tariff_safe", "==", true);
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
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
    setCors(res);

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
    setCors(res);

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
    setCors(res);

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
    setCors(res);

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await validateApiKeyFromRequest(req, ApiKeyScope.READ_COMPLIANCE);

      const { equipment_ids, jurisdiction, state, project_type } = req.body;

      if (!equipment_ids || !Array.isArray(equipment_ids)) {
        res.status(400).json({ error: "equipment_ids array is required" });
        return;
      }

      const db = admin.firestore();

      // Fetch equipment compliance data
      const equipmentResults = await Promise.all(
        equipment_ids.slice(0, 20).map(async (id: string) => {
          const doc = await db.collection("solar_equipment").doc(id).get();
          if (!doc.exists) return { id, found: false };
          const data = doc.data()!;
          return {
            id,
            found: true,
            name: data.name || data.model,
            manufacturer: data.manufacturer,
            type: data.type,
            feoc_compliant: data.feoc_compliant || false,
            domestic_content_compliant:
              data.domestic_content_compliant || false,
            tariff_safe: data.tariff_safe || false,
            country_of_origin: data.country_of_origin,
          };
        }),
      );

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

      // Overall compliance summary
      const allEquipmentFound = equipmentResults.every((e: any) => e.found);
      const allFeocCompliant = equipmentResults
        .filter((e: any) => e.found)
        .every((e: any) => e.feoc_compliant);
      const allDomesticContent = equipmentResults
        .filter((e: any) => e.found)
        .every((e: any) => e.domestic_content_compliant);
      const allTariffSafe = equipmentResults
        .filter((e: any) => e.found)
        .every((e: any) => e.tariff_safe);

      res.status(200).json({
        success: true,
        compliance_summary: {
          all_equipment_found: allEquipmentFound,
          feoc_compliant: allFeocCompliant,
          domestic_content_compliant: allDomesticContent,
          tariff_safe: allTariffSafe,
          eligible_for_itc:
            project_type === "commercial" &&
            allFeocCompliant &&
            allDomesticContent,
          incentives_available: incentives.length,
        },
        equipment: equipmentResults,
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
    setCors(res);

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
