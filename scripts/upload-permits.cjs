#!/usr/bin/env node
/**
 * Upload permit requirements data to Firestore solar_permits collection.
 * Reads from data/permits/states/*.json and uploads each state as a document.
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

async function main() {
  const stateDir = path.join(__dirname, "../data/permits/states");
  const files = fs.readdirSync(stateDir).filter(f => f.endsWith(".json"));

  console.log(`Uploading ${files.length} state permit files to Firestore solar_permits...`);

  const collection = db.collection("solar_permits");
  const batch = db.batch();
  let count = 0;

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(stateDir, file), "utf8"));
    const stateCode = path.basename(file, ".json");
    const ref = collection.doc(stateCode);
    batch.set(ref, { ...data, uploaded_at: new Date().toISOString() });
    count++;
  }

  await batch.commit();
  console.log(`Uploaded ${count} state permit documents to solar_permits.`);

  // Create summary
  const summary = {
    total_states: count,
    data_compiled: new Date().toISOString().split("T")[0],
    states_requiring_permit: 0,
    states_with_net_metering: 0,
    states_with_statewide_program: 0,
  };

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(stateDir, file), "utf8"));
    if (data.general_requirements?.permit_required) summary.states_requiring_permit++;
    if (data.interconnection?.net_metering_available) summary.states_with_net_metering++;
    if (data.general_requirements?.statewide_permit_program) summary.states_with_statewide_program++;
  }

  fs.writeFileSync(
    path.join(__dirname, "../data/permits/national_permits_summary.json"),
    JSON.stringify(summary, null, 2)
  );
  console.log("Summary:", JSON.stringify(summary));
  console.log("Done!");
  process.exit(0);
}

main().catch(console.error);
