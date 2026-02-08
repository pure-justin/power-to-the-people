/**
 * Solar Data Service
 * Client-side wrapper for Solar Data HTTP API endpoints (onRequest Cloud Functions)
 *
 * These endpoints are API-key authenticated (Bearer token), not Firebase Auth.
 * Use createApiKey from apiKeyService.js to generate a key first.
 */

const API_BASE_URL =
  "https://us-central1-power-to-the-people-vpp.cloudfunctions.net";

/**
 * Get the current API key from localStorage or sessionStorage
 * @returns {string|null} The API key, or null if not set
 */
function getApiKey() {
  return (
    localStorage.getItem("solaros_api_key") ||
    sessionStorage.getItem("solaros_api_key") ||
    null
  );
}

/**
 * Set the API key for subsequent requests
 * @param {string} apiKey - The API key to store
 * @param {boolean} [persistent=true] - If true, store in localStorage; otherwise sessionStorage
 */
export function setApiKey(apiKey, persistent = true) {
  if (persistent) {
    localStorage.setItem("solaros_api_key", apiKey);
  } else {
    sessionStorage.setItem("solaros_api_key", apiKey);
  }
}

/**
 * Clear the stored API key
 */
export function clearApiKey() {
  localStorage.removeItem("solaros_api_key");
  sessionStorage.removeItem("solaros_api_key");
}

/**
 * Build headers with Authorization bearer token
 * @param {Object} [extraHeaders] - Additional headers to merge
 * @returns {Object} Headers object
 */
function buildHeaders(extraHeaders = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "No API key configured. Call setApiKey() or store a key in localStorage as 'solaros_api_key'.",
    );
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

/**
 * Make a GET request to the Solar Data API
 * @param {string} endpoint - Endpoint path (e.g. "/solarEquipment")
 * @param {Object} [params] - Query parameters
 * @returns {Promise<Object>} Parsed JSON response
 */
async function apiGet(endpoint, params = {}) {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API error ${response.status}: ${errorBody || response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Make a POST request to the Solar Data API
 * @param {string} endpoint - Endpoint path (e.g. "/solarComplianceCheck")
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Parsed JSON response
 */
async function apiPost(endpoint, body) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API error ${response.status}: ${errorBody || response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Query the solar equipment database
 * @param {Object} [params] - Query parameters
 * @param {string} [params.type] - Equipment type: "panel", "inverter", "battery", "optimizer", "racking", "rapid_shutdown", "electrical_bos", "monitoring", "ev_charger"
 * @param {string} [params.manufacturer] - Manufacturer name filter
 * @param {boolean} [params.feoc_compliant] - Filter by FEOC compliance
 * @param {boolean} [params.domestic_content_compliant] - Filter by domestic content
 * @param {boolean} [params.tariff_safe] - Filter by tariff safety
 * @returns {Promise<Object>} Equipment list
 */
export async function getEquipment(params = {}) {
  return apiGet("/solarEquipment", params);
}

/**
 * Search equipment with text search and optional filters
 * @param {string} searchTerm - Text to search for in equipment names, manufacturers, models
 * @param {Object} [filters] - Additional filters
 * @param {string} [filters.type] - Equipment category
 * @param {string} [filters.manufacturer] - Manufacturer name
 * @param {boolean} [filters.feoc_compliant] - FEOC compliance filter
 * @param {boolean} [filters.domestic_content_compliant] - Domestic content filter
 * @param {boolean} [filters.tariff_safe] - Tariff safety filter
 * @param {number} [filters.limit] - Max results
 * @param {number} [filters.offset] - Pagination offset
 * @returns {Promise<Object>} Search results
 */
export async function searchEquipment(searchTerm, filters = {}) {
  return apiGet("/solarEquipment", { search: searchTerm, ...filters });
}

/**
 * Get all equipment items of a specific category
 * @param {string} category - Equipment type: "panel", "inverter", "battery", "optimizer", "racking", "rapid_shutdown", "electrical_bos", "monitoring", "ev_charger"
 * @returns {Promise<Object>} Equipment list for that category
 */
export async function getEquipmentByCategory(category) {
  return apiGet("/solarEquipment", { type: category });
}

/**
 * Get a single equipment item by ID
 * @param {string} id - Equipment document ID
 * @returns {Promise<Object>} Equipment details
 */
export async function getEquipmentById(id) {
  return apiGet("/solarEquipment", { id });
}

/**
 * Get unique manufacturers for a given equipment category
 * @param {string} [category] - Equipment type (omit for all categories)
 * @returns {Promise<Object>} List of manufacturer names
 */
export async function getManufacturers(category) {
  const params = { fields: "manufacturer" };
  if (category) params.type = category;
  return apiGet("/solarEquipment", params);
}

/**
 * Query utility rates by state and/or zip code
 * @param {Object} [params] - Query parameters
 * @param {string} [params.state] - Two-letter state code (e.g. "TX")
 * @param {string} [params.zip] - ZIP code (e.g. "77001")
 * @param {string} [params.utility_name] - Utility company name
 * @returns {Promise<Object>} Utility rate data
 */
export async function getUtilities(params = {}) {
  return apiGet("/solarUtilities", params);
}

/**
 * Query solar incentive programs by state
 * @param {Object} [params] - Query parameters
 * @param {string} [params.state] - Two-letter state code (e.g. "TX")
 * @param {string} [params.incentive_type] - Type filter (e.g. "rebate", "tax_credit", "srec")
 * @param {string} [params.sector] - Sector filter (e.g. "residential", "commercial")
 * @returns {Promise<Object>} Incentive programs list
 */
export async function getIncentives(params = {}) {
  return apiGet("/solarIncentives", params);
}

/**
 * Query permit requirements by state and county
 * @param {Object} [params] - Query parameters
 * @param {string} [params.state] - Two-letter state code (e.g. "TX")
 * @param {string} [params.county] - County name (e.g. "Harris")
 * @param {string} [params.jurisdiction_id] - Specific jurisdiction ID
 * @returns {Promise<Object>} Permit requirements
 */
export async function getPermits(params = {}) {
  return apiGet("/solarPermits", params);
}

/**
 * Run a compound compliance check on a system configuration
 * Checks FEOC status, domestic content, tariff exposure, and incentive eligibility.
 * @param {Object} data - System configuration to check
 * @param {Object[]} data.components - Array of equipment components
 * @param {string} data.state - Installation state
 * @param {string} [data.county] - Installation county
 * @param {string} [data.financing_type] - "cash", "loan", "lease", "ppa"
 * @returns {Promise<Object>} Compliance report
 */
export async function runComplianceCheck(data) {
  return apiPost("/solarComplianceCheck", data);
}

/**
 * Generate a full solar estimate for a property
 * @param {Object} data - Estimate request data
 * @param {number} data.latitude - Property latitude
 * @param {number} data.longitude - Property longitude
 * @param {number} data.annualUsageKwh - Annual electricity usage in kWh
 * @param {string} data.state - Installation state
 * @param {string} [data.zip] - ZIP code for utility rate lookup
 * @param {string} [data.financing_type] - Financing type for incentive calculation
 * @param {Object[]} [data.equipment] - Specific equipment selections
 * @returns {Promise<Object>} Full solar estimate with production, savings, compliance
 */
export async function getSolarEstimate(data) {
  return apiPost("/solarEstimate", data);
}

// ─── Direct Firestore Lookups (no API key required) ──────────────────────────

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

/**
 * Get solar resource data for a state directly from Firestore
 * @param {string} state - Two-letter state code
 * @returns {Promise<Object|null>} NREL solar resource data for the state
 */
export async function getSolarResource(state) {
  const db = getFirestore();
  const docRef = doc(db, "solar_resource_data", state.toUpperCase());
  const snap = await getDoc(docRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Get energy community info for a state directly from Firestore
 * @param {string} state - Two-letter state code
 * @returns {Promise<Object[]>} Energy community documents for the state
 */
export async function getEnergyCommunityData(state) {
  const db = getFirestore();
  const q = query(
    collection(db, "energy_communities"),
    where("state", "==", state.toUpperCase()),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get all incentives for a state directly from Firestore
 * @param {string} state - Two-letter state code
 * @returns {Promise<Object[]>} Incentive programs for the state
 */
export async function getStateIncentives(state) {
  const db = getFirestore();
  const q = query(
    collection(db, "solar_incentives"),
    where("state", "==", state.toUpperCase()),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get permit requirements for a state directly from Firestore
 * @param {string} state - Two-letter state code
 * @returns {Promise<Object|null>} Permit requirements for the state
 */
export async function getStatePermits(state) {
  const db = getFirestore();
  const docRef = doc(db, "solar_permits", state.toUpperCase());
  const snap = await getDoc(docRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Get utility rates for a state directly from Firestore
 * @param {string} state - Two-letter state code
 * @returns {Promise<Object[]>} Utility rate data for the state
 */
export async function getStateUtilities(state) {
  const db = getFirestore();
  const q = query(
    collection(db, "solar_utility_rates"),
    where("state", "==", state.toUpperCase()),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Comprehensive address intelligence - combines all data sources
 * @param {Object} params
 * @param {string} params.state - Two-letter state code
 * @param {string} [params.county] - County name
 * @param {string} [params.zip] - ZIP code
 * @returns {Promise<Object>} Combined solar intelligence for the address
 */
export async function getAddressIntelligence({ state, county, zip }) {
  const [solarResource, energyCommunity, incentives, permits, utilities] =
    await Promise.all([
      getSolarResource(state).catch(() => null),
      getEnergyCommunityData(state).catch(() => []),
      getStateIncentives(state).catch(() => []),
      getStatePermits(state).catch(() => null),
      getStateUtilities(state).catch(() => []),
    ]);

  // Find matching utility by zip if possible
  const matchingUtility = zip
    ? utilities.find((u) => u.zip_codes?.includes(zip))
    : null;

  return {
    state,
    county,
    zip,
    solar_resource: solarResource,
    energy_community: energyCommunity,
    incentives,
    permits,
    utilities: matchingUtility ? [matchingUtility] : utilities.slice(0, 5),
    total_incentives: incentives.length,
    has_energy_community_bonus: energyCommunity.some(
      (ec) => ec.category === "statistical_area",
    ),
  };
}
