#!/usr/bin/env node

/**
 * Import Solar Installers to Firestore
 *
 * Imports scraped installer data into Firebase Firestore
 * Creates collection: installers
 * Enables full-text search via composite indexes
 */

import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(resolve("./firebase-service-account.json"), "utf8"),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "power-to-the-people-vpp",
});

const db = admin.firestore();

class InstallerImporter {
  constructor(dataFile) {
    this.dataFile = dataFile;
    this.batch = db.batch();
    this.batchCount = 0;
    this.totalImported = 0;
  }

  /**
   * Load installer data from JSON file
   */
  loadData() {
    if (!existsSync(this.dataFile)) {
      throw new Error(`Data file not found: ${this.dataFile}`);
    }

    const rawData = readFileSync(this.dataFile, "utf8");
    const data = JSON.parse(rawData);

    console.log(
      `📂 Loaded ${data.totalCount} installers from ${this.dataFile}`,
    );
    console.log(
      `📊 Data sources: ${Object.entries(data.stats)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    );

    return data.installers;
  }

  /**
   * Commit current batch and start a new one
   */
  async commitBatch() {
    if (this.batchCount > 0) {
      await this.batch.commit();
      console.log(`  ✅ Committed batch of ${this.batchCount} installers`);
      this.batch = db.batch();
      this.batchCount = 0;
    }
  }

  /**
   * Transform installer data for Firestore
   */
  transformInstaller(installer) {
    return {
      // Basic info
      id: installer.id,
      name: installer.name,
      city: installer.city,
      state: installer.state,
      address: installer.address || null,

      // Contact
      phone: installer.phone || null,
      email: installer.email || null,
      website: installer.website || null,

      // Reputation
      rating: installer.rating || null,
      reviewCount: installer.reviewCount || 0,

      // Certifications & licenses
      certifications: installer.certifications || [],
      licenses: installer.licenses || [],

      // Service info
      serviceAreas: installer.serviceAreas || [],

      // Company size
      companySize: installer.companySize?.category || "unknown",
      employeeEstimate: installer.companySize?.employeeEstimate || null,

      // Installation volume
      annualInstalls: installer.installationVolume?.annualEstimate || null,
      cumulativeInstalls:
        installer.installationVolume?.cumulativeEstimate || null,

      // Social media
      socialMedia: installer.socialMedia || null,

      // Data sources
      sources: installer.sources || [],
      googlePlaceId: installer.googlePlaceId || null,

      // Search fields (for full-text search)
      searchKeywords: this.generateSearchKeywords(installer),

      // Metadata
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      verified: false,
      featured: false,
      active: true,
    };
  }

  /**
   * Generate search keywords for full-text search
   */
  generateSearchKeywords(installer) {
    const keywords = new Set();

    // Add name variations
    if (installer.name) {
      keywords.add(installer.name.toLowerCase());
      installer.name
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => keywords.add(word));
    }

    // Add location
    if (installer.city) keywords.add(installer.city.toLowerCase());
    if (installer.state) keywords.add(installer.state.toLowerCase());

    // Add certifications
    (installer.certifications || []).forEach((cert) => {
      keywords.add(cert.toLowerCase());
      cert
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => keywords.add(word));
    });

    return Array.from(keywords);
  }

  /**
   * Import installers to Firestore
   */
  async import() {
    console.log("🚀 Starting Firestore import...\n");

    const installers = this.loadData();

    for (const installer of installers) {
      const docRef = db.collection("installers").doc(installer.id);
      const transformed = this.transformInstaller(installer);

      this.batch.set(docRef, transformed, { merge: true });
      this.batchCount++;
      this.totalImported++;

      // Firestore batch limit is 500
      if (this.batchCount >= 500) {
        await this.commitBatch();
      }
    }

    // Commit remaining
    await this.commitBatch();

    console.log(
      `\n✅ Import complete! Imported ${this.totalImported} installers`,
    );
  }

  /**
   * Create Firestore indexes for efficient queries
   */
  async createIndexes() {
    console.log("\n📊 Creating Firestore indexes...");
    console.log(
      "Please create the following composite indexes in Firebase Console:",
    );
    console.log(
      "https://console.firebase.google.com/project/power-to-the-people-vpp/firestore/indexes\n",
    );

    const indexes = [
      {
        collection: "installers",
        fields: [
          { name: "state", mode: "ASCENDING" },
          { name: "rating", mode: "DESCENDING" },
        ],
      },
      {
        collection: "installers",
        fields: [
          { name: "state", mode: "ASCENDING" },
          { name: "reviewCount", mode: "DESCENDING" },
        ],
      },
      {
        collection: "installers",
        fields: [
          { name: "state", mode: "ASCENDING" },
          { name: "companySize", mode: "ASCENDING" },
          { name: "rating", mode: "DESCENDING" },
        ],
      },
      {
        collection: "installers",
        fields: [
          { name: "certifications", mode: "ARRAY_CONTAINS" },
          { name: "state", mode: "ASCENDING" },
        ],
      },
      {
        collection: "installers",
        fields: [
          { name: "active", mode: "ASCENDING" },
          { name: "rating", mode: "DESCENDING" },
        ],
      },
    ];

    indexes.forEach((index, i) => {
      console.log(`${i + 1}. Collection: ${index.collection}`);
      console.log(
        `   Fields: ${index.fields.map((f) => `${f.name} (${f.mode})`).join(", ")}`,
      );
      console.log("");
    });
  }

  /**
   * Print usage statistics
   */
  async printStats() {
    console.log("\n📊 Database Statistics:");

    const snapshot = await db.collection("installers").get();
    console.log(`   Total Installers: ${snapshot.size}`);

    // Count by state
    const stateCount = {};
    snapshot.forEach((doc) => {
      const state = doc.data().state;
      stateCount[state] = (stateCount[state] || 0) + 1;
    });

    console.log("\n   By State:");
    Object.entries(stateCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([state, count]) => {
        console.log(`     ${state}: ${count}`);
      });

    // Count by company size
    const sizeCount = {};
    snapshot.forEach((doc) => {
      const size = doc.data().companySize;
      sizeCount[size] = (sizeCount[size] || 0) + 1;
    });

    console.log("\n   By Company Size:");
    Object.entries(sizeCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([size, count]) => {
        console.log(`     ${size}: ${count}`);
      });
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dataFile = args[0] || "./data/installers/installers-latest.json";

  console.log("🔥 Firebase Installer Importer");
  console.log(`📂 Data file: ${dataFile}\n`);

  const importer = new InstallerImporter(dataFile);

  importer
    .import()
    .then(() => importer.createIndexes())
    .then(() => importer.printStats())
    .then(() => {
      console.log("\n✅ All done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Import failed:", error);
      process.exit(1);
    });
}

export default InstallerImporter;
