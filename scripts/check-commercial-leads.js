#!/usr/bin/env node

/**
 * Check Commercial Leads in Firestore
 */

import dotenv from "dotenv";
dotenv.config();

import { getImportStats } from "../src/services/commercialLeadImporter.js";

async function main() {
  console.log("📊 Checking Commercial Leads in Firestore...\n");

  const stats = await getImportStats();

  if (!stats) {
    console.log("❌ Failed to retrieve stats");
    return;
  }

  console.log(`✅ Total commercial leads: ${stats.total}\n`);
  console.log(`📈 Average lead score: ${stats.avgLeadScore}/100`);
  console.log(
    `💰 Total annual savings potential: $${stats.totalSavingsPotential.toLocaleString()}\n`,
  );

  console.log("Property Types:");
  Object.entries(stats.byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  console.log("\nCities:");
  Object.entries(stats.byCity)
    .sort((a, b) => b[1] - a[1])
    .forEach(([city, count]) => {
      console.log(`  ${city}: ${count}`);
    });

  console.log("\nPriority:");
  Object.entries(stats.byPriority)
    .sort((a, b) => b[1] - a[1])
    .forEach(([priority, count]) => {
      console.log(`  ${priority}: ${count}`);
    });

  console.log("\nQuality Tiers:");
  Object.entries(stats.byTier)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([tier, count]) => {
      console.log(`  Tier ${tier}: ${count}`);
    });

  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
