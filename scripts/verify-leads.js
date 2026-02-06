#!/usr/bin/env node

/**
 * Verify Commercial Leads in Firestore
 * Checks how many commercial leads are in the database
 */

import dotenv from "dotenv";
dotenv.config();

import { getImportStats } from "../src/services/commercialLeadImporter.js";

async function main() {
  console.log("🔍 Checking Firestore for commercial leads...\n");

  const stats = await getImportStats();

  if (stats) {
    console.log(`✅ Total commercial leads in database: ${stats.total}`);
    console.log(`   Average lead score: ${stats.avgLeadScore}`);
    console.log(
      `   Total annual savings potential: $${stats.totalSavingsPotential.toLocaleString()}`,
    );

    console.log("\n📊 By Property Type:");
    Object.entries(stats.byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });

    console.log("\n📊 By City:");
    Object.entries(stats.byCity)
      .sort((a, b) => b[1] - a[1])
      .forEach(([city, count]) => {
        console.log(`   ${city}: ${count}`);
      });

    console.log("\n📊 By Quality Tier:");
    Object.entries(stats.byTier)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([tier, count]) => {
        console.log(`   Tier ${tier}: ${count}`);
      });

    console.log("\n📊 By Priority:");
    Object.entries(stats.byPriority)
      .sort((a, b) => b[1] - a[1])
      .forEach(([priority, count]) => {
        console.log(`   ${priority}: ${count}`);
      });
  } else {
    console.log("❌ Failed to get stats from database");
  }
}

main()
  .then(() => {
    console.log("\n✅ Done!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
