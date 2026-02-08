#!/usr/bin/env node
/**
 * Upload solar permit requirements data to Firestore solar_permits collection.
 * Reads from data/permits/states/*.json and uploads each state as a document.
 * Also uploads the national summary as a special _national_summary document.
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
  const statesDir = path.join(__dirname, "../data/permits/states");
  const stateFiles = fs
    .readdirSync(statesDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  console.log(
    `Uploading ${stateFiles.length} state permit documents to Firestore solar_permits...`,
  );

  const collection = db.collection("solar_permits");
  const batchSize = 400; // Firestore batch limit is 500
  let totalWritten = 0;

  // Upload state documents in batches
  for (let i = 0; i < stateFiles.length; i += batchSize) {
    const chunk = stateFiles.slice(i, i + batchSize);
    const batch = db.batch();

    for (const stateFile of chunk) {
      const stateCode = stateFile.replace(".json", "");
      const stateData = JSON.parse(
        fs.readFileSync(path.join(statesDir, stateFile), "utf8"),
      );

      const docRef = collection.doc(stateCode);
      batch.set(docRef, {
        state: stateData.state,
        state_name: stateData.state_name,
        data_compiled: stateData.data_compiled,
        general_requirements: stateData.general_requirements,
        interconnection: stateData.interconnection,
        special_considerations: stateData.special_considerations,
        licensing: stateData.licensing || null,
        notes: stateData.notes,
        source: "DSIRE, NCSL, DOE, IREC, state energy offices",
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    totalWritten += chunk.length;
    console.log(
      `  Batch ${Math.floor(i / batchSize) + 1}: wrote ${chunk.length} docs (${totalWritten}/${stateFiles.length})`,
    );
  }

  // Upload national summary document
  console.log("\nUploading national summary document...");
  const summaryFile = path.join(
    __dirname,
    "../data/permits/national_permits_summary.json",
  );

  if (fs.existsSync(summaryFile)) {
    const summaryData = JSON.parse(fs.readFileSync(summaryFile, "utf8"));

    const summaryRef = collection.doc("_national_summary");
    await summaryRef.set({
      _type: "national_summary",
      ...summaryData,
      imported_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("  Wrote national summary document");
  } else {
    // Generate summary from state files
    const summary = {
      _type: "national_summary",
      total_states: stateFiles.length,
      data_compiled: "2026-02-08",
      states_requiring_permit: 0,
      states_with_net_metering: 0,
      states_with_statewide_program: 0,
    };

    for (const stateFile of stateFiles) {
      const data = JSON.parse(
        fs.readFileSync(path.join(statesDir, stateFile), "utf8"),
      );
      if (data.general_requirements?.permit_required)
        summary.states_requiring_permit++;
      if (data.interconnection?.net_metering_available)
        summary.states_with_net_metering++;
      if (data.general_requirements?.statewide_permit_program)
        summary.states_with_statewide_program++;
    }

    const summaryRef = collection.doc("_national_summary");
    await summaryRef.set({
      ...summary,
      imported_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("  Generated and wrote summary document");
  }

  console.log(
    `\nDone! ${totalWritten} state docs + 1 national summary uploaded to solar_permits`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
