#!/usr/bin/env node

/**
 * Test Script for Installer Data Pipeline
 *
 * Quick test to verify the pipeline works correctly
 */

import InstallerDataPipeline from "./installer-data-pipeline.js";

console.log("🧪 Testing Solar Installer Data Pipeline\n");

// Create pipeline with small target for testing
const pipeline = new InstallerDataPipeline({
  targetCount: 50, // Small test run
  outputDir: "./data/installers/test",
});

// Test individual methods
async function runTests() {
  console.log("📝 Running pipeline tests...\n");

  // Test 1: NABCEP data generation
  console.log("Test 1: NABCEP Data Generation");
  await pipeline.scrapeNABCEP({ name: "Texas", abbr: "TX", priority: 1 });
  console.log(`✅ Generated ${pipeline.stats.nabcep} NABCEP installers\n`);

  // Test 2: Company size estimation
  console.log("Test 2: Company Size Estimation");
  const testInstaller = {
    name: "Test Solar Co",
    reviewCount: 150,
    serviceAreas: ["TX", "OK", "LA"],
  };
  const sizeEstimate = pipeline.estimateCompanySize(testInstaller);
  console.log(
    `✅ Estimated size: ${sizeEstimate.category}, ${sizeEstimate.employeeEstimate} employees\n`,
  );

  // Test 3: Installation volume estimation
  console.log("Test 3: Installation Volume Estimation");
  testInstaller.companySize = sizeEstimate;
  const volumeEstimate = pipeline.estimateInstallationVolume(testInstaller);
  console.log(
    `✅ Annual installs: ${volumeEstimate.annualEstimate}, Cumulative: ${volumeEstimate.cumulativeEstimate}\n`,
  );

  // Test 4: ID generation
  console.log("Test 4: ID Generation");
  const testId = pipeline.generateInstallerId(
    "Bright Sun Solar Energy",
    "TX",
    "Austin",
  );
  console.log(`✅ Generated ID: ${testId}\n`);

  // Test 5: Data merging
  console.log("Test 5: Data Merging");
  const id1 = pipeline.generateInstallerId("Sun Power Co", "TX", "Austin");
  pipeline.mergeInstallerData(id1, {
    name: "Sun Power Co",
    city: "Austin",
    state: "TX",
    phone: "(512) 555-1234",
    sources: ["nabcep"],
  });
  pipeline.mergeInstallerData(id1, {
    name: "Sun Power Co",
    city: "Austin",
    state: "TX",
    website: "https://sunpowerco.com",
    rating: 4.8,
    sources: ["googleplaces"],
  });
  const merged = pipeline.installers.get(id1);
  console.log(`✅ Merged data:`, {
    name: merged.name,
    phone: merged.phone,
    website: merged.website,
    rating: merged.rating,
    sources: merged.sources,
  });
  console.log("");

  // Test 6: Full mini pipeline run
  console.log("Test 6: Mini Pipeline Run (50 installers)");
  console.log("Running full pipeline with NABCEP only...\n");

  // Reset stats for clean test
  pipeline.installers.clear();
  pipeline.stats = {
    nabcep: 0,
    energySage: 0,
    solarReviews: 0,
    googlePlaces: 0,
    enriched: 0,
    total: 0,
  };

  // Run just NABCEP for speed
  await pipeline.scrapeNABCEP({ name: "Texas", abbr: "TX", priority: 1 });

  // Enrich a few samples
  const samples = Array.from(pipeline.installers.values()).slice(0, 5);
  for (const installer of samples) {
    await pipeline.enrichInstallerData(installer);
  }

  pipeline.saveData();

  console.log("\n✅ All tests passed!");
  console.log(`📊 Final Stats:`);
  console.log(`   - Total Installers: ${pipeline.installers.size}`);
  console.log(`   - NABCEP: ${pipeline.stats.nabcep}`);
  console.log(`   - Enriched: ${pipeline.stats.enriched}`);
  console.log(`   - Output: ${pipeline.outputDir}`);
}

runTests()
  .then(() => {
    console.log("\n🎉 Test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
