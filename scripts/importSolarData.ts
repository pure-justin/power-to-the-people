#!/usr/bin/env npx tsx

/**
 * Solar Data Import Pipeline
 *
 * Imports Ava's research data into Firestore collections:
 *   - solar_equipment (panels, inverters, batteries)
 *   - solar_utility_rates (municipal, coop, REP, T&D utilities)
 *   - solar_incentives (federal, state, municipal, VPP programs)
 *   - solar_permits (jurisdiction-level permit requirements)
 *   - solar_tpo_providers (TPO providers, loan providers)
 *
 * Usage: npx tsx scripts/importSolarData.ts
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

// --- Firebase Init ---
const serviceAccountPath = resolve(
  projectRoot,
  "firebase-service-account.json",
);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "power-to-the-people-vpp",
});

const db = admin.firestore();

// --- Helpers ---

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 128);
}

function loadJson(filename: string): any {
  const filepath = resolve(projectRoot, "data", filename);
  const raw = readFileSync(filepath, "utf8");
  return JSON.parse(raw);
}

class BatchWriter {
  private batch: admin.firestore.WriteBatch;
  private count = 0;
  private totalWritten = 0;
  private readonly MAX_BATCH = 499; // Firestore limit is 500

  constructor() {
    this.batch = db.batch();
  }

  async set(ref: admin.firestore.DocumentReference, data: any) {
    this.batch.set(ref, data, { merge: true });
    this.count++;
    if (this.count >= this.MAX_BATCH) {
      await this.flush();
    }
  }

  async flush() {
    if (this.count > 0) {
      await this.batch.commit();
      this.totalWritten += this.count;
      this.count = 0;
      this.batch = db.batch();
    }
  }

  get total() {
    return this.totalWritten + this.count;
  }
}

// --- Equipment Helpers ---

/**
 * Generate a search_text field from equipment data for text search.
 * Combines manufacturer, model, type, and tags into a single lowercase string.
 */
function generateSearchText(item: any, type: string): string {
  const parts: string[] = [];
  if (item.manufacturer) parts.push(item.manufacturer);
  if (item.model) parts.push(item.model);
  parts.push(type);
  if (item.tags && Array.isArray(item.tags)) {
    parts.push(...item.tags);
  }
  if (item.cell_technology) parts.push(item.cell_technology);
  if (item.manufacturing_location) parts.push(item.manufacturing_location);
  return parts.join(" ").toLowerCase();
}

/**
 * Extract supply_chain object from raw equipment data.
 */
function extractSupplyChain(item: any): Record<string, any> | null {
  if (item.supply_chain) return item.supply_chain;
  // Build from existing fields if supply_chain not present
  const sc: Record<string, any> = {};
  if (item.manufacturing_location)
    sc.assembly_location = item.manufacturing_location;
  if (item.feoc_compliant !== undefined)
    sc.pfe_percentage = item.feoc_compliant ? 0 : null;
  if (item.domestic_content_eligible !== undefined) {
    sc.us_content_percentage = item.domestic_content_eligible ? 50 : 0;
  }
  if (item.feoc_notes) sc.uflpa_status = item.feoc_notes;
  return Object.keys(sc).length > 0 ? sc : null;
}

/**
 * Extract pricing object from raw equipment data.
 */
function extractPricing(item: any): Record<string, any> {
  if (item.pricing) return item.pricing;
  const pricing: Record<string, any> = {};
  if (item.wholesale_price_per_watt_usd !== undefined) {
    pricing.wholesale_per_unit = item.wholesale_price_per_watt_usd;
    pricing.unit = "per_watt";
  } else if (item.wholesale_price_per_unit_usd !== undefined) {
    pricing.wholesale_per_unit = item.wholesale_price_per_unit_usd;
    pricing.unit = "per_unit";
  } else if (item.price_estimate_usd !== undefined) {
    pricing.wholesale_per_unit = item.price_estimate_usd;
    pricing.unit = "per_unit";
  }
  if (item.price_notes) pricing.price_notes = item.price_notes;
  pricing.price_updated = new Date().toISOString().slice(0, 10);
  // Map availability_status to distributor_availability
  if (item.availability_status) {
    const statusMap: Record<string, string> = {
      widely_available: "in_stock",
      available: "in_stock",
      limited_residential: "in_stock",
      available_with_caveats: "in_stock",
      supply_disrupted: "backorder",
      tariff_restricted: "backorder",
      effectively_unavailable_us: "backorder",
      discontinued: "discontinued",
    };
    pricing.distributor_availability =
      statusMap[item.availability_status] || item.availability_status;
  }
  return pricing;
}

/**
 * Process a single equipment item, adding enriched fields.
 */
function enrichEquipmentDoc(item: any, type: string): Record<string, any> {
  const doc: Record<string, any> = { ...item };
  doc.type = type;

  // Generate search_text
  doc.search_text = generateSearchText(item, type);

  // Ensure tags array exists
  if (!doc.tags) {
    doc.tags = [type];
    if (item.feoc_compliant) doc.tags.push("feoc_compliant");
    if (item.domestic_content_eligible) doc.tags.push("domestic_content");
    if (item.tariff_safe) doc.tags.push("tariff_safe");
    if (item.cell_technology) doc.tags.push(item.cell_technology.toLowerCase());
  }

  // Extract/normalize supply_chain
  const supplyChain = extractSupplyChain(item);
  if (supplyChain) doc.supply_chain = supplyChain;

  // Extract/normalize pricing
  doc.pricing = extractPricing(item);

  // Preserve specs as-is if present, or leave existing fields
  // (type-specific specs remain at top level for backward compatibility)

  return doc;
}

// --- Import Functions ---

async function importEquipment() {
  console.log("\n--- Importing Equipment ---");
  const data = loadJson("equipment_national.json");
  const writer = new BatchWriter();
  const collection = db.collection("solar_equipment");

  // Import metadata
  await writer.set(collection.doc("_metadata"), {
    ...data.metadata,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Import compliance summary
  if (data.compliance_summary) {
    await writer.set(collection.doc("_compliance_summary"), {
      ...data.compliance_summary,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // All 9 equipment type mappings
  const typeKeys: Array<{ key: string; type: string }> = [
    { key: "panels", type: "panel" },
    { key: "inverters", type: "inverter" },
    { key: "batteries", type: "battery" },
    { key: "optimizers", type: "optimizer" },
    { key: "racking", type: "racking" },
    { key: "rapid_shutdown", type: "rapid_shutdown" },
    { key: "electrical_bos", type: "electrical_bos" },
    { key: "monitoring", type: "monitoring" },
    { key: "ev_chargers", type: "ev_charger" },
  ];

  const counts: Record<string, number> = {};

  for (const { key, type } of typeKeys) {
    const items = data[key] || [];
    counts[type] = 0;
    for (const item of items) {
      const docId = item.id || slugify(`${item.manufacturer}-${item.model}`);
      const enriched = enrichEquipmentDoc(item, type);
      await writer.set(collection.doc(docId), {
        ...enriched,
        importedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      counts[type]++;
    }
  }

  await writer.flush();

  for (const [type, c] of Object.entries(counts)) {
    if (c > 0) console.log(`  ${type}: ${c}`);
  }
  console.log(`  Total equipment docs: ${writer.total}`);
}

async function importUtilityRates() {
  console.log("\n--- Importing Utility Rates ---");
  const data = loadJson("texas_utility_buyback_rates.json");
  const writer = new BatchWriter();
  const collection = db.collection("solar_utility_rates");
  const counts: Record<string, number> = {};

  // Import metadata + market context
  await writer.set(collection.doc("_metadata"), {
    ...data.metadata,
    market_context: data.market_context,
    rate_comparison_summary: data.rate_comparison_summary,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Import each utility type as flat docs with a type field
  const utilityTypes = [
    { key: "municipal_utilities", type: "municipal" },
    { key: "cooperatives", type: "cooperative" },
    { key: "regulated_utilities", type: "regulated" },
    { key: "retail_electric_providers", type: "rep" },
    { key: "transmission_distribution_utilities", type: "tdu" },
  ];

  for (const { key, type } of utilityTypes) {
    const items = data[key] || [];
    counts[type] = 0;
    for (const item of items) {
      const docId = item.id || slugify(item.name);
      await writer.set(collection.doc(docId), {
        ...item,
        utility_type: type,
        importedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      counts[type]++;
    }
  }

  await writer.flush();
  for (const [type, c] of Object.entries(counts)) {
    console.log(`  ${type}: ${c}`);
  }
  console.log(`  Total utility rate docs: ${writer.total}`);
}

async function importIncentives() {
  console.log("\n--- Importing Incentives ---");
  const data = loadJson("texas_solar_incentives_2026.json");
  const writer = new BatchWriter();
  const collection = db.collection("solar_incentives");

  // Import metadata
  await writer.set(collection.doc("_metadata"), {
    ...data.metadata,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Federal incentives - each is a named dict entry
  const fedIncentives = data.federal_incentives || {};
  let fedCount = 0;
  for (const [key, value] of Object.entries(fedIncentives)) {
    await writer.set(collection.doc(`federal-${slugify(key)}`), {
      ...(value as any),
      incentive_type: "federal",
      key,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    fedCount++;
  }
  console.log(`  Federal incentives: ${fedCount}`);

  // Texas state incentives
  const stateIncentives = data.texas_state_incentives || {};
  let stateCount = 0;
  for (const [key, value] of Object.entries(stateIncentives)) {
    await writer.set(collection.doc(`state-${slugify(key)}`), {
      ...(value as any),
      incentive_type: "state",
      key,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    stateCount++;
  }
  console.log(`  State incentives: ${stateCount}`);

  // Municipal / local incentives
  const muniIncentives = data.municipal_local_incentives || {};
  let muniCount = 0;
  for (const [key, value] of Object.entries(muniIncentives)) {
    await writer.set(collection.doc(`municipal-${slugify(key)}`), {
      ...(value as any),
      incentive_type: "municipal",
      key,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    muniCount++;
  }
  console.log(`  Municipal incentives: ${muniCount}`);

  // VPP and demand response programs
  const vppPrograms = data.vpp_and_demand_response || {};
  let vppCount = 0;
  for (const [key, value] of Object.entries(vppPrograms)) {
    await writer.set(collection.doc(`vpp-${slugify(key)}`), {
      ...(value as any),
      incentive_type: "vpp",
      key,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    vppCount++;
  }
  console.log(`  VPP/DR programs: ${vppCount}`);

  // Federal programs affecting solar
  const fedPrograms = data.federal_programs_affecting_solar || {};
  let fedProgCount = 0;
  for (const [key, value] of Object.entries(fedPrograms)) {
    await writer.set(collection.doc(`fedprog-${slugify(key)}`), {
      ...(value as any),
      incentive_type: "federal_program",
      key,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    fedProgCount++;
  }
  console.log(`  Federal programs: ${fedProgCount}`);

  // Utility buyback programs
  if (data.utility_buyback_programs) {
    await writer.set(collection.doc("_utility_buyback_programs"), {
      ...data.utility_buyback_programs,
      incentive_type: "utility_buyback_overview",
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Net metering / value of solar by utility
  if (data.net_metering_value_of_solar_by_utility) {
    await writer.set(collection.doc("_net_metering_summary"), {
      ...data.net_metering_value_of_solar_by_utility,
      incentive_type: "net_metering_summary",
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Practical scenarios
  if (data.practical_scenarios_2026) {
    await writer.set(collection.doc("_practical_scenarios_2026"), {
      ...data.practical_scenarios_2026,
      incentive_type: "scenarios",
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Sources
  if (data.sources) {
    await writer.set(collection.doc("_sources"), {
      ...data.sources,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await writer.flush();
  console.log(`  Total incentive docs: ${writer.total}`);
}

async function importPermits() {
  console.log("\n--- Importing Permits ---");
  const data = loadJson("texas_permits_by_jurisdiction.json");
  const writer = new BatchWriter();
  const collection = db.collection("solar_permits");

  // Import metadata + statewide legislation
  await writer.set(collection.doc("_metadata"), {
    ...data.metadata,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Third party services
  if (data.third_party_services) {
    await writer.set(collection.doc("_third_party_services"), {
      ...data.third_party_services,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Summary comparison
  if (data.summary_comparison) {
    await writer.set(collection.doc("_summary_comparison"), {
      ...data.summary_comparison,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Jurisdictions - key is the slug, value is the jurisdiction data
  const jurisdictions = data.jurisdictions || {};
  let jurCount = 0;
  for (const [key, value] of Object.entries(jurisdictions)) {
    await writer.set(collection.doc(slugify(key)), {
      ...(value as any),
      jurisdiction_key: key,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    jurCount++;
  }
  console.log(`  Jurisdictions: ${jurCount}`);

  await writer.flush();
  console.log(`  Total permit docs: ${writer.total}`);
}

async function importTPOProviders() {
  console.log("\n--- Importing TPO Providers ---");
  const data = loadJson("tpo_finance_providers_texas_2026.json");
  const writer = new BatchWriter();
  const collection = db.collection("solar_tpo_providers");

  // Import metadata + market dynamics
  await writer.set(collection.doc("_metadata"), {
    ...data.metadata,
    market_dynamics: data.market_dynamics_texas_2026,
    competitive_landscape: data.competitive_landscape_summary,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Active TPO providers
  let tpoCount = 0;
  for (const provider of data.tpo_providers || []) {
    const docId = provider.id || slugify(provider.name);
    await writer.set(collection.doc(docId), {
      ...provider,
      provider_type: "tpo_active",
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tpoCount++;
  }
  console.log(`  Active TPO providers: ${tpoCount}`);

  // Defunct TPO providers
  let defunctCount = 0;
  for (const provider of data.defunct_tpo_providers || []) {
    const docId = provider.id || slugify(provider.name);
    await writer.set(collection.doc(docId), {
      ...provider,
      provider_type: "tpo_defunct",
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    defunctCount++;
  }
  console.log(`  Defunct TPO providers: ${defunctCount}`);

  // Solar loan providers
  let loanCount = 0;
  for (const provider of data.solar_loan_providers || []) {
    const docId = provider.id || slugify(provider.name);
    await writer.set(collection.doc(docId), {
      ...provider,
      provider_type: "loan",
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    loanCount++;
  }
  console.log(`  Loan providers: ${loanCount}`);

  await writer.flush();
  console.log(`  Total TPO/finance docs: ${writer.total}`);
}

// --- Main ---

async function main() {
  console.log("=== Solar Data Import Pipeline ===");
  console.log(`Project: power-to-the-people-vpp`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    await importEquipment();
    await importUtilityRates();
    await importIncentives();
    await importPermits();
    await importTPOProviders();

    console.log("\n=== Import Complete ===");
    console.log("Collections created/updated:");
    console.log("  - solar_equipment");
    console.log("  - solar_utility_rates");
    console.log("  - solar_incentives");
    console.log("  - solar_permits");
    console.log("  - solar_tpo_providers");
  } catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
  }

  process.exit(0);
}

main();
