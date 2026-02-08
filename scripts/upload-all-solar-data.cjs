#!/usr/bin/env node
/**
 * Upload all solar data to Firestore.
 * Collections: solar_equipment, solar_incentives, energy_communities, solar_resource_data
 * (solar_utility_rates already uploaded separately)
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("../firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "power-to-the-people-vpp",
});

const db = admin.firestore();
const DATA_DIR = path.join(__dirname, "../data");

async function batchWrite(collectionName, docs, idField) {
  const collection = db.collection(collectionName);
  const batchSize = 400;
  let total = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batch = db.batch();

    for (const doc of chunk) {
      const docId = idField ? doc[idField] : undefined;
      const ref = docId ? collection.doc(docId) : collection.doc();
      batch.set(ref, { ...doc, uploaded_at: new Date().toISOString() });
    }

    await batch.commit();
    total += chunk.length;
    console.log(`  ${collectionName}: ${total}/${docs.length} written`);
  }

  return total;
}

async function uploadEquipment() {
  console.log("\n=== EQUIPMENT ===");
  const panels = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "equipment/panels.json"), "utf8"));
  const inverters = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "equipment/inverters.json"), "utf8"));
  const batteries = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "equipment/batteries.json"), "utf8"));

  const allEquipment = [
    ...panels.panels.map(p => ({ ...p, equipment_type: "panel" })),
    ...inverters.inverters.map(i => ({ ...i, equipment_type: "inverter" })),
    ...batteries.batteries.map(b => ({ ...b, equipment_type: "battery" })),
  ];

  const total = await batchWrite("solar_equipment", allEquipment, "id");
  console.log(`Equipment: ${total} products uploaded`);
  return total;
}

async function uploadIncentives() {
  console.log("\n=== INCENTIVES ===");
  const stateDir = path.join(DATA_DIR, "incentives/states");
  const files = fs.readdirSync(stateDir).filter(f => f.endsWith(".json"));
  const allIncentives = [];

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(stateDir, file), "utf8"));
    if (data.incentives) {
      allIncentives.push(...data.incentives);
    }
  }

  const total = await batchWrite("solar_incentives", allIncentives, "id");
  console.log(`Incentives: ${total} programs uploaded from ${files.length} states`);
  return total;
}

async function uploadEnergyCommunities() {
  console.log("\n=== ENERGY COMMUNITIES ===");
  const data = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "energy-communities/national_energy_communities.json"), "utf8")
  );

  // Upload state-level documents
  const stateDocs = [];
  if (data.statistical_area_communities) {
    for (const [state, info] of Object.entries(data.statistical_area_communities)) {
      stateDocs.push({
        id: `statistical_${state}`,
        state,
        category: "statistical_area",
        ...info,
      });
    }
  }

  if (data.coal_closure_states) {
    for (const state of data.coal_closure_states) {
      stateDocs.push({
        id: `coal_closure_${state}`,
        state,
        category: "coal_closure",
        qualifies: true,
      });
    }
  }

  // Also upload the summary/metadata
  stateDocs.push({
    id: "_metadata",
    data_compiled: data.data_compiled || new Date().toISOString(),
    total_statistical_area_states: Object.keys(data.statistical_area_communities || {}).length,
    total_coal_closure_states: (data.coal_closure_states || []).length,
    categories: ["statistical_area", "coal_closure", "brownfield"],
    bonus_percentage: 10,
    source: "IRS Notice 2025-31, energycommunities.gov",
  });

  const total = await batchWrite("energy_communities", stateDocs, "id");
  console.log(`Energy Communities: ${total} documents uploaded`);
  return total;
}

async function uploadNRELData() {
  console.log("\n=== NREL SOLAR RESOURCE ===");
  const data = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "nrel/national_solar_resource.json"), "utf8")
  );

  const docs = [];
  if (data.states) {
    for (const [state, stateData] of Object.entries(data.states)) {
      // Create one doc per state with all cities
      docs.push({
        id: state,
        state,
        cities: stateData.cities || stateData,
        data_source: "NREL PVWatts v8",
        system_capacity_kw: data.parameters?.system_capacity_kw || 8,
      });
    }
  }

  const total = await batchWrite("solar_resource_data", docs, "id");
  console.log(`NREL Solar Resource: ${total} state documents uploaded`);
  return total;
}

async function main() {
  console.log("=== Solar CRM Data Upload to Firestore ===");
  console.log(`Project: power-to-the-people-vpp`);
  console.log(`Time: ${new Date().toISOString()}`);

  const results = {};

  try {
    results.equipment = await uploadEquipment();
  } catch (e) {
    console.error("Equipment upload failed:", e.message);
    results.equipment = 0;
  }

  try {
    results.incentives = await uploadIncentives();
  } catch (e) {
    console.error("Incentives upload failed:", e.message);
    results.incentives = 0;
  }

  try {
    results.energyCommunities = await uploadEnergyCommunities();
  } catch (e) {
    console.error("Energy communities upload failed:", e.message);
    results.energyCommunities = 0;
  }

  try {
    results.nrel = await uploadNRELData();
  } catch (e) {
    console.error("NREL upload failed:", e.message);
    results.nrel = 0;
  }

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));
  console.log("\nDone!");

  process.exit(0);
}

main().catch(console.error);
