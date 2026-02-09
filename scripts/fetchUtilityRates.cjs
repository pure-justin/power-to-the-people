#!/usr/bin/env node
/**
 * fetchUtilityRates.js
 *
 * Comprehensive utility rate data fetcher that merges:
 * 1. EIA-861 utility data (customer counts, revenue-based rates for 2,100+ utilities)
 * 2. OpenEI URDB rate structures (TOU/tiered/flat classification for 2,600+ utilities)
 * 3. EIA-861 net metering data (solar installations per utility)
 * 4. EIA-861 service territory data (county-to-utility mapping)
 *
 * Sources:
 * - EIA-861 Annual Electric Power Industry Report (free, public)
 *   https://www.eia.gov/electricity/data/eia861/
 * - OpenEI Utility Rate Database (free with NREL API key)
 *   https://api.openei.org/utility_rates
 *
 * Output:
 * - data/utility_rates/{STATE}.json (per-state files)
 * - data/utility_rates/all_utilities.json (comprehensive flat file)
 * - data/utility_rates/utility_territories.json (county-to-utility mapping)
 *
 * Usage:
 *   node scripts/fetchUtilityRates.js
 *   # Or with pre-fetched data:
 *   node scripts/fetchUtilityRates.js --use-cached
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { execSync } = require("child_process");

// ============================================================
// Configuration
// ============================================================

const NREL_API_KEY =
  process.env.NREL_API_KEY ||
  (() => {
    try {
      return execSync(
        "security find-generic-password -a vaultdev -s NREL_API_KEY -w 2>/dev/null",
      )
        .toString()
        .trim();
    } catch {
      return "";
    }
  })();

const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "data", "utility_rates");
const CACHE_DIR = path.join(OUTPUT_DIR, ".cache");
const USE_CACHED = process.argv.includes("--use-cached");

// State name mapping
const STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

// Net metering state-level policies (2026 status)
// Sources: DSIRE, SEIA, state PUC orders
const NET_METERING_POLICIES = {
  AL: { type: "avoided_cost", statewide: false },
  AK: { type: "NEM", statewide: true },
  AZ: { type: "net_billing", statewide: true },
  AR: { type: "NEM", statewide: true },
  CA: {
    type: "net_billing",
    statewide: true,
    note: "NEM 3.0/NBT since Apr 2023, export ~$0.04-0.08/kWh",
  },
  CO: { type: "NEM", statewide: true },
  CT: { type: "NEM", statewide: true },
  DE: { type: "NEM", statewide: true },
  DC: { type: "NEM", statewide: true },
  FL: { type: "NEM", statewide: true },
  GA: { type: "none", statewide: false },
  HI: {
    type: "net_billing",
    statewide: true,
    note: "Customer Grid Supply/Self-Supply programs",
  },
  ID: { type: "net_billing", statewide: true },
  IL: { type: "NEM", statewide: true },
  IN: {
    type: "net_billing",
    statewide: true,
    note: "Transitioning from NEM to net billing",
  },
  IA: { type: "NEM", statewide: true },
  KS: { type: "NEM", statewide: true },
  KY: { type: "NEM", statewide: true },
  LA: { type: "net_billing", statewide: true },
  ME: { type: "net_billing", statewide: true },
  MD: { type: "NEM", statewide: true },
  MA: { type: "NEM", statewide: true },
  MI: { type: "net_billing", statewide: true },
  MN: { type: "NEM", statewide: true },
  MS: { type: "avoided_cost", statewide: false },
  MO: { type: "NEM", statewide: true },
  MT: { type: "NEM", statewide: true },
  NE: { type: "NEM", statewide: true },
  NV: { type: "net_billing", statewide: true },
  NH: { type: "NEM", statewide: true },
  NJ: { type: "NEM", statewide: true },
  NM: { type: "NEM", statewide: true },
  NY: {
    type: "net_billing",
    statewide: true,
    note: "VDER/Value Stack since 2020",
  },
  NC: { type: "NEM", statewide: true },
  ND: { type: "NEM", statewide: true },
  OH: { type: "NEM", statewide: true },
  OK: { type: "NEM", statewide: true },
  OR: { type: "NEM", statewide: true },
  PA: { type: "NEM", statewide: true },
  RI: { type: "NEM", statewide: true },
  SC: { type: "net_billing", statewide: true },
  SD: { type: "NEM", statewide: true },
  TN: {
    type: "avoided_cost",
    statewide: false,
    note: "TVA territory, limited buyback",
  },
  TX: {
    type: "none",
    statewide: false,
    note: "Deregulated; some REPs offer solar buyback plans",
  },
  UT: { type: "net_billing", statewide: true },
  VT: { type: "NEM", statewide: true },
  VA: { type: "NEM", statewide: true },
  WA: { type: "NEM", statewide: true },
  WV: { type: "NEM", statewide: true },
  WI: { type: "NEM", statewide: true },
  WY: { type: "NEM", statewide: true },
};

// ============================================================
// HTTP Helper
// ============================================================

function fetchJSON(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const doFetch = (attempt) => {
      const proto = url.startsWith("https") ? https : http;
      proto
        .get(url, { timeout: 30000 }, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              if (attempt < retries) {
                setTimeout(() => doFetch(attempt + 1), 1000 * attempt);
              } else {
                reject(new Error(`JSON parse error: ${e.message}`));
              }
            }
          });
        })
        .on("error", (e) => {
          if (attempt < retries) {
            setTimeout(() => doFetch(attempt + 1), 1000 * attempt);
          } else {
            reject(e);
          }
        });
    };
    doFetch(1);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Data Fetching: OpenEI URDB
// ============================================================

async function fetchOpenEIRates() {
  const cacheFile = path.join(CACHE_DIR, "openei_urdb_rates.json");

  if (USE_CACHED && fs.existsSync(cacheFile)) {
    console.log("  Using cached OpenEI URDB data...");
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }

  // Check for pre-fetched data from Python script
  const preFetched = "/tmp/openei_urdb_rates.json";
  if (fs.existsSync(preFetched)) {
    console.log("  Using pre-fetched OpenEI URDB data...");
    const data = JSON.parse(fs.readFileSync(preFetched, "utf8"));
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    return data;
  }

  console.log("  Fetching all residential rates from OpenEI URDB...");
  if (!NREL_API_KEY) {
    console.error(
      "  ERROR: NREL_API_KEY not found. Set env var or store in macOS keychain.",
    );
    return {};
  }

  const allRates = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      version: "8",
      format: "json",
      detail: "full",
      limit: "500",
      offset: String(offset),
      api_key: NREL_API_KEY,
      approved: "true",
      country: "USA",
      sector: "Residential",
      orderby: "startdate",
      direction: "desc",
    });

    try {
      const data = await fetchJSON(
        `https://api.openei.org/utility_rates?${params}`,
      );
      const items = data.items || [];
      if (items.length === 0) break;

      allRates.push(...items);
      process.stdout.write(`\r  Fetched ${allRates.length} rate entries...`);
      offset += 500;
      await sleep(500);
    } catch (e) {
      console.error(`\n  Error at offset ${offset}: ${e.message}`);
      break;
    }
  }

  console.log(`\n  Total rate entries: ${allRates.length}`);

  // Deduplicate: keep latest rate per utility (by eiaid)
  const utilities = {};
  for (const item of allRates) {
    const eid = item.eiaid;
    if (!eid) continue;
    const startdate = item.startdate || 0;

    if (utilities[eid] && startdate <= (utilities[eid].startdate || 0)) {
      continue;
    }
    utilities[eid] = item;
  }

  console.log(
    `  Unique utilities with rate structures: ${Object.keys(utilities).length}`,
  );

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(utilities, null, 2));

  return utilities;
}

// ============================================================
// Data Loading: EIA-861 (pre-parsed)
// ============================================================

function loadEIA861Data() {
  const files = {
    utilities: "/tmp/eia861_utilities.json",
    netMetering: "/tmp/eia861_net_metering.json",
    territory: "/tmp/eia861_territory.json",
  };

  const result = {};
  for (const [key, filepath] of Object.entries(files)) {
    if (fs.existsSync(filepath)) {
      result[key] = JSON.parse(fs.readFileSync(filepath, "utf8"));
      console.log(
        `  Loaded ${key}: ${Array.isArray(result[key]) ? result[key].length : Object.keys(result[key]).length} entries`,
      );
    } else {
      console.error(
        `  WARNING: ${filepath} not found. Run the EIA-861 parser first.`,
      );
      result[key] = key === "utilities" ? [] : {};
    }
  }
  return result;
}

// ============================================================
// Rate Structure Analysis
// ============================================================

function classifyRateStructure(rateData) {
  let hasTOU = false;
  let hasTiers = false;

  // Check for TOU: different period values in weekday schedule
  const weekday = rateData.energyweekdayschedule || [];
  if (weekday.length > 0) {
    const periodsUsed = new Set();
    for (const month of weekday) {
      if (Array.isArray(month)) {
        for (const val of month) {
          periodsUsed.add(val);
        }
      }
    }
    if (periodsUsed.size > 1) hasTOU = true;
  }

  // Check for tiered rates
  const structure = rateData.energyratestructure || [];
  for (const period of structure) {
    if (Array.isArray(period) && period.length > 1) {
      hasTiers = true;
      break;
    }
  }

  if (hasTOU) return "tou";
  if (hasTiers) return "tiered";
  return "flat";
}

function extractRateFromStructure(rateData) {
  const structure = rateData.energyratestructure || [];
  if (structure.length > 0) {
    let totalRate = 0;
    let count = 0;
    for (const period of structure) {
      if (Array.isArray(period)) {
        for (const tier of period) {
          if (tier && typeof tier === "object" && tier.rate !== undefined) {
            const rate = (tier.rate || 0) + (tier.adj || 0);
            totalRate += rate;
            count++;
          }
        }
      }
    }
    if (count > 0) {
      const avg = totalRate / count;
      if (avg >= 0.01 && avg <= 1.0) return Math.round(avg * 10000) / 10000;
    }
  }
  return null;
}

function hasDemandCharges(rateData) {
  return !!(
    rateData.demandratestructure ||
    rateData.flatdemandstructure ||
    rateData.demandmax
  );
}

function classifyOwnership(ownershipStr) {
  if (!ownershipStr) return "IOU";
  const lower = ownershipStr.toLowerCase();
  if (lower.includes("investor")) return "IOU";
  if (lower.includes("municipal") || lower.includes("political"))
    return "municipal";
  if (lower.includes("cooperative") || lower.includes("coop"))
    return "cooperative";
  if (lower.includes("federal")) return "federal";
  if (lower.includes("state")) return "state";
  if (lower.includes("retail") || lower.includes("marketer"))
    return "retail_marketer";
  return "other";
}

function classifyOwnershipFromName(utilityName) {
  const lower = utilityName.toLowerCase();
  if (/coop|cooperative|co-op|\bemc\b|\bec\b|\brec\b|\bremc\b/.test(lower))
    return "cooperative";
  if (
    /city of|municipal|dept of|department of|public util|pud\b|district|authority|board|town of|village of|city light|utilities board/.test(
      lower,
    )
  )
    return "municipal";
  return "IOU";
}

// ============================================================
// Merge & Build Final Dataset
// ============================================================

function mergeDatasets(eiaData, urdbData) {
  const { utilities: eiaUtils, netMetering, territory } = eiaData;

  // Index EIA utilities by utility_id for matching
  const eiaByID = {};
  for (const u of eiaUtils) {
    eiaByID[u.utility_id] = u;
  }

  // Build merged dataset
  const merged = {};

  // Start with EIA-861 as the base (most comprehensive for utility list)
  for (const u of eiaUtils) {
    const key = `${u.state}_${u.utility_id}`;
    const nmData = netMetering[u.utility_id] || {};
    const statePolicy = NET_METERING_POLICIES[u.state] || {
      type: "unknown",
      statewide: false,
    };
    const urdb = urdbData[u.utility_id] || null;

    // Determine rate structure from URDB if available
    let rateStructure = "unknown";
    let urdbRate = null;
    let touAvailable = false;
    let demandCharges = false;
    let rateName = null;
    let rateSource = null;

    if (urdb) {
      rateStructure = classifyRateStructure(urdb);
      urdbRate = extractRateFromStructure(urdb);
      touAvailable = rateStructure === "tou";
      demandCharges = hasDemandCharges(urdb);
      rateName = urdb.name || null;
      rateSource = urdb.source || null;
    }

    // Use EIA calculated rate as primary, URDB rate as validation/fallback
    let avgRate = u.residential_avg_rate;
    let rateDataSource = "EIA-861";

    // If EIA rate seems off but URDB has a rate, prefer URDB
    if (urdbRate && urdbRate >= 0.03 && urdbRate <= 0.8) {
      // If rates differ by more than 50%, note the discrepancy
      if (avgRate > 0 && Math.abs(urdbRate - avgRate) / avgRate > 0.5) {
        // Keep EIA rate as primary but note URDB rate
      }
    }

    const ownershipType = classifyOwnership(u.ownership);

    // Net metering: combine state policy with utility-specific data
    const hasNM =
      statePolicy.type === "NEM" ||
      statePolicy.type === "net_billing" ||
      nmData.has_net_metering === true;

    merged[key] = {
      utility_id: u.utility_id,
      utility_name: u.utility_name,
      state: u.state,
      state_name: STATE_NAMES[u.state] || u.state,
      ownership_type: ownershipType,
      customer_count: u.customer_count,
      residential_rate_per_kwh: avgRate,
      rate_data_source: rateDataSource,
      rate_structure: rateStructure,
      tou_available: touAvailable,
      demand_charges: demandCharges,
      has_net_metering: hasNM,
      net_metering_type: statePolicy.type,
      net_metering_note: statePolicy.note || null,
      solar_installations: nmData.residential_pv_installations || 0,
      solar_capacity_mw: nmData.residential_pv_capacity_mw || 0,
      urdb_rate_name: rateName,
      urdb_rate_per_kwh: urdbRate,
      service_territories: [],
      updated_at: new Date().toISOString().split("T")[0],
    };

    // Add territory data (counties served)
    if (territory[u.utility_id]) {
      merged[key].service_territories = territory[u.utility_id].counties || [];
    }
  }

  // Add URDB utilities not found in EIA-861
  let urdbOnlyCount = 0;
  for (const [eid, urdb] of Object.entries(urdbData)) {
    // Check if any state variant exists
    let found = false;
    for (const key of Object.keys(merged)) {
      if (key.includes(`_${eid}`)) {
        found = true;
        break;
      }
    }

    if (!found && urdb.utility) {
      urdbOnlyCount++;
      const utilName = urdb.utility;
      // Try to determine state from the rate data
      let state = "";
      if (urdb.name) {
        // Some rate names contain state info
        for (const [code, name] of Object.entries(STATE_NAMES)) {
          if (urdb.name.includes(name) || urdb.name.includes(`(${code})`)) {
            state = code;
            break;
          }
        }
      }
      // Fallback: try to get state from utility name
      if (!state) {
        for (const [code, name] of Object.entries(STATE_NAMES)) {
          if (
            utilName.includes(`(${name})`) ||
            utilName.includes(`(${code})`)
          ) {
            state = code;
            break;
          }
        }
      }

      if (!state) continue; // Skip if we can't determine state

      const key = `${state}_${eid}`;
      const statePolicy = NET_METERING_POLICIES[state] || {
        type: "unknown",
        statewide: false,
      };
      const urdbRate = extractRateFromStructure(urdb);
      const rateStructure = classifyRateStructure(urdb);

      merged[key] = {
        utility_id: String(eid),
        utility_name: utilName,
        state: state,
        state_name: STATE_NAMES[state] || state,
        ownership_type: classifyOwnershipFromName(utilName),
        customer_count: 0,
        residential_rate_per_kwh: urdbRate || 0,
        rate_data_source: "OpenEI_URDB",
        rate_structure: rateStructure,
        tou_available: rateStructure === "tou",
        demand_charges: hasDemandCharges(urdb),
        has_net_metering:
          statePolicy.type === "NEM" || statePolicy.type === "net_billing",
        net_metering_type: statePolicy.type,
        net_metering_note: statePolicy.note || null,
        solar_installations: 0,
        solar_capacity_mw: 0,
        urdb_rate_name: urdb.name || null,
        urdb_rate_per_kwh: urdbRate,
        service_territories: territory[String(eid)]?.counties || [],
        updated_at: new Date().toISOString().split("T")[0],
      };
    }
  }

  console.log(`  URDB-only utilities added: ${urdbOnlyCount}`);

  return merged;
}

// ============================================================
// Output Generation
// ============================================================

function generateOutput(merged) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Group by state
  const byState = {};
  const allUtilities = [];

  for (const util of Object.values(merged)) {
    const state = util.state;
    if (!byState[state]) byState[state] = [];

    // Create clean copy without service_territories for the flat file
    const clean = { ...util };
    delete clean.service_territories;
    allUtilities.push(clean);

    byState[state].push(util);
  }

  // Sort each state by customer count
  for (const state of Object.keys(byState)) {
    byState[state].sort(
      (a, b) => (b.customer_count || 0) - (a.customer_count || 0),
    );
  }
  allUtilities.sort(
    (a, b) => (b.customer_count || 0) - (a.customer_count || 0),
  );

  // Write per-state files
  const statesSummary = {};
  for (const [state, utils] of Object.entries(byState)) {
    const rates = utils
      .map((u) => u.residential_rate_per_kwh)
      .filter((r) => r > 0);
    const avgRate =
      rates.length > 0
        ? Math.round(
            (rates.reduce((a, b) => a + b, 0) / rates.length) * 10000,
          ) / 10000
        : 0;

    const statePolicy = NET_METERING_POLICIES[state] || {
      type: "unknown",
      statewide: false,
    };

    const stateData = {
      state: state,
      state_name: STATE_NAMES[state] || state,
      utility_count: utils.length,
      total_residential_customers: utils.reduce(
        (a, u) => a + (u.customer_count || 0),
        0,
      ),
      avg_residential_rate: avgRate,
      net_metering_policy: statePolicy,
      total_solar_installations: utils.reduce(
        (a, u) => a + (u.solar_installations || 0),
        0,
      ),
      total_solar_capacity_mw:
        Math.round(
          utils.reduce((a, u) => a + (u.solar_capacity_mw || 0), 0) * 100,
        ) / 100,
      utilities: utils.map((u) => {
        const clean = { ...u };
        // Remove verbose territory data from state files to keep them manageable
        delete clean.service_territories;
        delete clean.state_name;
        return clean;
      }),
      data_sources: ["EIA-861 (2024)", "OpenEI URDB", "DSIRE"],
      generated_at: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${state}.json`),
      JSON.stringify(stateData, null, 2),
    );

    statesSummary[state] = {
      state_name: STATE_NAMES[state] || state,
      utility_count: utils.length,
      total_customers: stateData.total_residential_customers,
      avg_rate: avgRate,
      net_metering: statePolicy.type,
      solar_installations: stateData.total_solar_installations,
    };
  }

  // Write all_utilities.json
  const allData = {
    total_utilities: allUtilities.length,
    states_covered: Object.keys(byState).length,
    total_residential_customers: allUtilities.reduce(
      (a, u) => a + (u.customer_count || 0),
      0,
    ),
    national_avg_rate: (() => {
      const rates = allUtilities
        .map((u) => u.residential_rate_per_kwh)
        .filter((r) => r > 0);
      return rates.length > 0
        ? Math.round(
            (rates.reduce((a, b) => a + b, 0) / rates.length) * 10000,
          ) / 10000
        : 0;
    })(),
    // Weighted average rate (by customer count)
    weighted_avg_rate: (() => {
      let totalRevenue = 0;
      let totalCustomers = 0;
      for (const u of allUtilities) {
        if (u.customer_count > 0 && u.residential_rate_per_kwh > 0) {
          totalRevenue += u.residential_rate_per_kwh * u.customer_count;
          totalCustomers += u.customer_count;
        }
      }
      return totalCustomers > 0
        ? Math.round((totalRevenue / totalCustomers) * 10000) / 10000
        : 0;
    })(),
    rate_structure_breakdown: (() => {
      const counts = { flat: 0, tiered: 0, tou: 0, unknown: 0 };
      for (const u of allUtilities) {
        counts[u.rate_structure] = (counts[u.rate_structure] || 0) + 1;
      }
      return counts;
    })(),
    ownership_breakdown: (() => {
      const counts = {};
      for (const u of allUtilities) {
        counts[u.ownership_type] = (counts[u.ownership_type] || 0) + 1;
      }
      return counts;
    })(),
    state_summary: statesSummary,
    utilities: allUtilities,
    data_sources: [
      "EIA-861 Annual Electric Power Industry Report (2024)",
      "OpenEI Utility Rate Database (URDB)",
      "DSIRE (Database of State Incentives for Renewables & Efficiency)",
    ],
    generated_at: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "all_utilities.json"),
    JSON.stringify(allData, null, 2),
  );

  return { allData, byState };
}

function generateTerritoryMapping(merged) {
  // Build county-to-utility mapping for the solar estimator
  // Also build a simplified version that maps state+county to utility names
  const countyToUtility = {};
  const stateCountyMap = {};

  for (const util of Object.values(merged)) {
    if (!util.service_territories || util.service_territories.length === 0)
      continue;

    for (const territory of util.service_territories) {
      const state = territory.state;
      const county = territory.county;
      if (!state || !county) continue;

      const key = `${state}_${county}`;

      if (!countyToUtility[key]) {
        countyToUtility[key] = [];
      }

      countyToUtility[key].push({
        utility_id: util.utility_id,
        utility_name: util.utility_name,
        customer_count: util.customer_count || 0,
        rate: util.residential_rate_per_kwh || 0,
        ownership_type: util.ownership_type,
      });

      // Also build state-level summary
      if (!stateCountyMap[state]) stateCountyMap[state] = {};
      if (!stateCountyMap[state][county]) stateCountyMap[state][county] = [];

      // Avoid duplicates
      const existing = stateCountyMap[state][county].find(
        (u) => u.utility_id === util.utility_id,
      );
      if (!existing) {
        stateCountyMap[state][county].push({
          utility_id: util.utility_id,
          utility_name: util.utility_name,
          customer_count: util.customer_count || 0,
        });
      }
    }
  }

  // Sort utilities within each county by customer count
  for (const key of Object.keys(countyToUtility)) {
    countyToUtility[key].sort(
      (a, b) => (b.customer_count || 0) - (a.customer_count || 0),
    );
  }

  const territoryData = {
    description:
      "Maps state + county to serving utility companies. Source: EIA-861 Service Territory data (2024).",
    usage:
      "Look up county from address geocoding, then find serving utilities. For multiple utilities in one county, the one with the most customers is typically the primary.",
    total_mappings: Object.keys(countyToUtility).length,
    states_covered: Object.keys(stateCountyMap).length,
    counties_covered: Object.keys(countyToUtility).length,
    county_to_utilities: countyToUtility,
    generated_at: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "utility_territories.json"),
    JSON.stringify(territoryData, null, 2),
  );

  return territoryData;
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("=== Utility Rate Data Fetcher ===");
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(
    `NREL API Key: ${NREL_API_KEY ? NREL_API_KEY.substring(0, 8) + "..." : "NOT SET"}`,
  );
  console.log("");

  // Step 1: Load EIA-861 data
  console.log("[1/4] Loading EIA-861 data...");
  const eiaData = loadEIA861Data();

  // Step 2: Fetch OpenEI URDB rate structures
  console.log("\n[2/4] Loading OpenEI URDB rate structures...");
  const urdbData = await fetchOpenEIRates();

  // Step 3: Merge datasets
  console.log("\n[3/4] Merging datasets...");
  const merged = mergeDatasets(eiaData, urdbData);
  console.log(`  Total merged utilities: ${Object.keys(merged).length}`);

  // Step 4: Generate output files
  console.log("\n[4/4] Generating output files...");
  const { allData, byState } = generateOutput(merged);
  const territoryData = generateTerritoryMapping(merged);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(
    `Total utilities:          ${allData.total_utilities.toLocaleString()}`,
  );
  console.log(`States + DC covered:      ${allData.states_covered}`);
  console.log(
    `Total res. customers:     ${allData.total_residential_customers.toLocaleString()}`,
  );
  console.log(`National avg rate:        $${allData.national_avg_rate}/kWh`);
  console.log(`Weighted avg rate:        $${allData.weighted_avg_rate}/kWh`);
  console.log(
    `County-utility mappings:  ${territoryData.total_mappings.toLocaleString()}`,
  );
  console.log("");
  console.log("Rate structure breakdown:");
  for (const [type, count] of Object.entries(
    allData.rate_structure_breakdown,
  )) {
    console.log(`  ${type}: ${count}`);
  }
  console.log("");
  console.log("Ownership breakdown:");
  for (const [type, count] of Object.entries(allData.ownership_breakdown)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log("");
  console.log("Files generated:");
  console.log(`  ${OUTPUT_DIR}/all_utilities.json`);
  console.log(`  ${OUTPUT_DIR}/utility_territories.json`);
  console.log(
    `  ${OUTPUT_DIR}/{STATE}.json (${Object.keys(byState).length} state files)`,
  );

  // Top 10 states by solar
  console.log("\nTop 10 states by solar installations:");
  const sortedStates = Object.entries(allData.state_summary)
    .sort(
      (a, b) =>
        (b[1].solar_installations || 0) - (a[1].solar_installations || 0),
    )
    .slice(0, 10);
  for (const [state, summary] of sortedStates) {
    console.log(
      `  ${state} (${summary.state_name}): ${(summary.solar_installations || 0).toLocaleString()} installs, $${summary.avg_rate}/kWh, ${summary.utility_count} utilities`,
    );
  }

  console.log("\nTop 10 utilities by customer count:");
  for (const u of allData.utilities.slice(0, 10)) {
    console.log(
      `  ${u.utility_name} (${u.state}): ${u.customer_count.toLocaleString()} customers, $${u.residential_rate_per_kwh}/kWh, ${u.rate_structure}`,
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
