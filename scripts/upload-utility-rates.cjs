#!/usr/bin/env node
/**
 * Upload utility rates data to Firestore solar_utility_rates collection.
 * Reads from data/utilities/national_utility_rates.json and uploads each utility as a document.
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize with service account
const serviceAccount = require("../firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "power-to-the-people-vpp",
});

const db = admin.firestore();

async function main() {
  const dataFile = path.join(
    __dirname,
    "../data/utilities/national_utility_rates.json",
  );
  const raw = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const utilities = raw.utilities;

  console.log(
    `Uploading ${utilities.length} utilities to Firestore solar_utility_rates...`,
  );

  const collection = db.collection("solar_utility_rates");
  const batchSize = 400; // Firestore batch limit is 500
  let totalWritten = 0;

  for (let i = 0; i < utilities.length; i += batchSize) {
    const chunk = utilities.slice(i, i + batchSize);
    const batch = db.batch();

    for (const util of chunk) {
      // Use state + utility_id as document ID for easy lookups
      const docId = `${util.state}_${util.utility_id}`;
      const docRef = collection.doc(docId);

      batch.set(docRef, {
        utility_id: util.utility_id,
        utility_name: util.utility_name,
        state: util.state,
        states_served: util.states_served || [util.state],
        type: util.type,
        customer_count: util.customer_count || 0,
        residential_avg_rate: util.residential_avg_rate,
        rate_structure: util.rate_structure,
        has_net_metering: util.has_net_metering,
        net_metering_type: util.net_metering_type,
        export_rate: util.export_rate || null,
        tou_available: util.tou_available || false,
        demand_charges: util.demand_charges || false,
        updated_at: util.updated_at,
        source: "OpenEI USURDB + EIA-861",
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    totalWritten += chunk.length;
    console.log(
      `  Batch ${Math.floor(i / batchSize) + 1}: wrote ${chunk.length} docs (${totalWritten}/${utilities.length})`,
    );
  }

  // Also upload state-level summary docs
  console.log("\nUploading state summary documents...");
  const statesDir = path.join(__dirname, "../data/utilities/states");
  const stateFiles = fs
    .readdirSync(statesDir)
    .filter((f) => f.endsWith(".json"));

  const stateBatch = db.batch();
  for (const stateFile of stateFiles) {
    const stateCode = stateFile.replace(".json", "");
    const stateData = JSON.parse(
      fs.readFileSync(path.join(statesDir, stateFile), "utf8"),
    );

    const docRef = collection.doc(`_state_${stateCode}`);
    stateBatch.set(docRef, {
      _type: "state_summary",
      state: stateCode,
      utility_count: stateData.utility_count,
      avg_residential_rate: stateData.avg_residential_rate,
      eia_state_avg_rate: stateData.eia_state_avg_rate,
      net_metering: stateData.net_metering || {},
      updated_at: stateData.fetched_at,
      imported_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await stateBatch.commit();
  console.log(`  Wrote ${stateFiles.length} state summary docs`);

  console.log(
    `\nDone! ${totalWritten} utility docs + ${stateFiles.length} state summaries uploaded to solar_utility_rates`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
