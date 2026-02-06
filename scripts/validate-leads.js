#!/usr/bin/env node

/**
 * LEAD DATA VALIDATION & STATISTICS
 *
 * Validates exported lead data and generates detailed statistics
 *
 * Usage:
 *   node scripts/validate-leads.js commercial-leads-2026-02-06.json
 */

import { readFileSync } from "fs";

const filename = process.argv[2];

if (!filename) {
  console.error("❌ Please provide a JSON file to validate");
  console.error("Usage: node scripts/validate-leads.js <filename>");
  process.exit(1);
}

console.log("🔍 LEAD DATA VALIDATION\n");
console.log(`File: ${filename}\n`);

// Load data
let data;
try {
  data = JSON.parse(readFileSync(filename, "utf-8"));
  console.log("✅ JSON file is valid");
} catch (error) {
  console.error("❌ Invalid JSON file:", error.message);
  process.exit(1);
}

// Validate structure
console.log("\n📋 DATA STRUCTURE VALIDATION\n");

const validations = [
  {
    check: () => data.exportDate,
    message: "Export date present",
  },
  {
    check: () => data.totalProperties,
    message: "Total properties count present",
  },
  {
    check: () => Array.isArray(data.properties),
    message: "Properties is an array",
  },
  {
    check: () => data.properties.length === data.totalProperties,
    message: "Properties count matches total",
  },
  {
    check: () => data.properties.every((p) => p.propertyName),
    message: "All properties have names",
  },
  {
    check: () => data.properties.every((p) => p.placeId),
    message: "All properties have place IDs",
  },
  {
    check: () => data.properties.every((p) => p.address),
    message: "All properties have addresses",
  },
  {
    check: () => data.properties.every((p) => p.energyProfile),
    message: "All properties have energy profiles",
  },
  {
    check: () => data.properties.every((p) => p.solarSystem),
    message: "All properties have solar systems",
  },
  {
    check: () => data.properties.every((p) => p.leadScore),
    message: "All properties have lead scores",
  },
];

let passed = 0;
for (const validation of validations) {
  if (validation.check()) {
    console.log(`✅ ${validation.message}`);
    passed++;
  } else {
    console.log(`❌ ${validation.message}`);
  }
}

console.log(`\n${passed}/${validations.length} validation checks passed`);

// Statistics
console.log("\n" + "=".repeat(60));
console.log("📊 DETAILED STATISTICS");
console.log("=".repeat(60) + "\n");

const properties = data.properties;

// Basic counts
console.log("📈 BASIC COUNTS\n");
console.log(`Total Properties: ${properties.length}`);
console.log(`Export Date: ${new Date(data.exportDate).toLocaleString()}`);

// Property types
console.log("\n🏢 PROPERTY TYPES\n");
const byType = properties.reduce((acc, p) => {
  acc[p.propertyType] = (acc[p.propertyType] || 0) + 1;
  return acc;
}, {});

Object.entries(byType)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    const pct = ((count / properties.length) * 100).toFixed(1);
    console.log(`${type.padEnd(25)} ${count} (${pct}%)`);
  });

// Cities
console.log("\n📍 CITY DISTRIBUTION\n");
const byCity = properties.reduce((acc, p) => {
  acc[p.address.city] = (acc[p.address.city] || 0) + 1;
  return acc;
}, {});

Object.entries(byCity)
  .sort((a, b) => b[1] - a[1])
  .forEach(([city, count]) => {
    const pct = ((count / properties.length) * 100).toFixed(1);
    console.log(`${city.padEnd(25)} ${count} (${pct}%)`);
  });

// Counties
console.log("\n🗺️  COUNTY DISTRIBUTION\n");
const byCounty = properties.reduce((acc, p) => {
  acc[p.address.county] = (acc[p.address.county] || 0) + 1;
  return acc;
}, {});

Object.entries(byCounty)
  .sort((a, b) => b[1] - a[1])
  .forEach(([county, count]) => {
    const pct = ((count / properties.length) * 100).toFixed(1);
    console.log(`${county.padEnd(25)} ${count} (${pct}%)`);
  });

// Priority
console.log("\n⭐ PRIORITY DISTRIBUTION\n");
const byPriority = properties.reduce((acc, p) => {
  acc[p.priority] = (acc[p.priority] || 0) + 1;
  return acc;
}, {});

Object.entries(byPriority)
  .sort((a, b) => b[1] - a[1])
  .forEach(([priority, count]) => {
    const pct = ((count / properties.length) * 100).toFixed(1);
    console.log(`${priority.padEnd(25)} ${count} (${pct}%)`);
  });

// Lead tiers
console.log("\n🏆 QUALITY TIER DISTRIBUTION\n");
const byTier = properties.reduce((acc, p) => {
  acc[p.tier] = (acc[p.tier] || 0) + 1;
  return acc;
}, {});

Object.entries(byTier)
  .sort((a, b) => {
    const order = { Platinum: 0, Gold: 1, Silver: 2, Bronze: 3, Standard: 4 };
    return order[a[0]] - order[b[0]];
  })
  .forEach(([tier, count]) => {
    const pct = ((count / properties.length) * 100).toFixed(1);
    console.log(`${tier.padEnd(25)} ${count} (${pct}%)`);
  });

// Lead scores
console.log("\n📊 LEAD SCORE ANALYSIS\n");
const scores = properties.map((p) => p.leadScore);
const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
const minScore = Math.min(...scores);
const maxScore = Math.max(...scores);
const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];

console.log(`Average Score: ${avgScore.toFixed(1)}`);
console.log(`Median Score: ${medianScore}`);
console.log(`Min Score: ${minScore}`);
console.log(`Max Score: ${maxScore}`);

// Score ranges
const scoreRanges = {
  "90-100": scores.filter((s) => s >= 90).length,
  "80-89": scores.filter((s) => s >= 80 && s < 90).length,
  "70-79": scores.filter((s) => s >= 70 && s < 80).length,
  "60-69": scores.filter((s) => s >= 60 && s < 70).length,
  "50-59": scores.filter((s) => s >= 50 && s < 60).length,
  "40-49": scores.filter((s) => s >= 40 && s < 50).length,
  "0-39": scores.filter((s) => s < 40).length,
};

console.log("\nScore Distribution:");
Object.entries(scoreRanges).forEach(([range, count]) => {
  if (count > 0) {
    const pct = ((count / properties.length) * 100).toFixed(1);
    console.log(`${range.padEnd(10)} ${count} (${pct}%)`);
  }
});

// Building sizes
console.log("\n🏗️  BUILDING SIZE ANALYSIS\n");
const buildingSizes = properties.map((p) => p.metrics.buildingSqFt);
const avgBuilding =
  buildingSizes.reduce((a, b) => a + b, 0) / buildingSizes.length;
const minBuilding = Math.min(...buildingSizes);
const maxBuilding = Math.max(...buildingSizes);

console.log(
  `Average Building: ${Math.round(avgBuilding).toLocaleString()} sqft`,
);
console.log(`Min Building: ${minBuilding.toLocaleString()} sqft`);
console.log(`Max Building: ${maxBuilding.toLocaleString()} sqft`);

const roofSizes = properties.map((p) => p.metrics.roofSqFt);
const avgRoof = roofSizes.reduce((a, b) => a + b, 0) / roofSizes.length;

console.log(`Average Roof: ${Math.round(avgRoof).toLocaleString()} sqft`);

// Solar systems
console.log("\n☀️  SOLAR SYSTEM ANALYSIS\n");
const systemSizes = properties.map((p) => p.solarSystem.systemSizeKw);
const avgSystem = systemSizes.reduce((a, b) => a + b, 0) / systemSizes.length;
const minSystem = Math.min(...systemSizes);
const maxSystem = Math.max(...systemSizes);
const totalCapacity = systemSizes.reduce((a, b) => a + b, 0);

console.log(`Average System Size: ${avgSystem.toFixed(1)} kW`);
console.log(`Min System Size: ${minSystem} kW`);
console.log(`Max System Size: ${maxSystem} kW`);
console.log(
  `Total Capacity: ${totalCapacity.toFixed(1)} kW (${(totalCapacity / 1000).toFixed(1)} MW)`,
);

const panels = properties.map((p) => p.solarSystem.recommendedPanels);
const totalPanels = panels.reduce((a, b) => a + b, 0);
console.log(`Total Panels: ${totalPanels.toLocaleString()}`);

// Financial analysis
console.log("\n💰 FINANCIAL ANALYSIS\n");

const systemCosts = properties.map((p) => p.solarSystem.systemCost);
const totalCost = systemCosts.reduce((a, b) => a + b, 0);
const avgCost = totalCost / properties.length;

const taxCredits = properties.map((p) => p.solarSystem.federalTaxCredit);
const totalCredit = taxCredits.reduce((a, b) => a + b, 0);

const savings = properties.map((p) => p.solarSystem.annualSavings);
const totalSavings = savings.reduce((a, b) => a + b, 0);
const avgSavings = totalSavings / properties.length;

const paybacks = properties.map((p) => p.solarSystem.paybackYears);
const avgPayback = paybacks.reduce((a, b) => a + b, 0) / paybacks.length;

console.log(`Total System Cost: $${totalCost.toLocaleString()}`);
console.log(
  `Average Cost per Property: $${Math.round(avgCost).toLocaleString()}`,
);
console.log(`\nTotal Federal Tax Credits: $${totalCredit.toLocaleString()}`);
console.log(
  `Net Customer Investment: $${(totalCost - totalCredit).toLocaleString()}`,
);
console.log(`\nTotal Annual Savings: $${totalSavings.toLocaleString()}/year`);
console.log(
  `Average Savings per Property: $${Math.round(avgSavings).toLocaleString()}/year`,
);
console.log(`\nAverage Payback Period: ${avgPayback.toFixed(1)} years`);

// Energy profile
console.log("\n⚡ ENERGY CONSUMPTION ANALYSIS\n");

const annualKwh = properties.map((p) => p.energyProfile.annualKwh);
const totalAnnualKwh = annualKwh.reduce((a, b) => a + b, 0);
const avgAnnualKwh = totalAnnualKwh / properties.length;

console.log(`Total Annual Consumption: ${totalAnnualKwh.toLocaleString()} kWh`);
console.log(
  `Average per Property: ${Math.round(avgAnnualKwh).toLocaleString()} kWh/year`,
);

const bills = properties.map((p) => p.energyProfile.annualBill);
const totalBills = bills.reduce((a, b) => a + b, 0);
const avgBill = totalBills / properties.length;

console.log(`\nTotal Annual Bills: $${totalBills.toLocaleString()}`);
console.log(
  `Average per Property: $${Math.round(avgBill).toLocaleString()}/year`,
);

// Contact info
console.log("\n📞 CONTACT INFORMATION COVERAGE\n");

const withPhone = properties.filter((p) => p.contact.phone).length;
const withWebsite = properties.filter((p) => p.contact.website).length;
const withEither = properties.filter(
  (p) => p.contact.phone || p.contact.website,
).length;
const withBoth = properties.filter(
  (p) => p.contact.phone && p.contact.website,
).length;

console.log(
  `Properties with Phone: ${withPhone} (${((withPhone / properties.length) * 100).toFixed(1)}%)`,
);
console.log(
  `Properties with Website: ${withWebsite} (${((withWebsite / properties.length) * 100).toFixed(1)}%)`,
);
console.log(
  `Properties with Either: ${withEither} (${((withEither / properties.length) * 100).toFixed(1)}%)`,
);
console.log(
  `Properties with Both: ${withBoth} (${((withBoth / properties.length) * 100).toFixed(1)}%)`,
);

// Ownership analysis
console.log("\n🏛️  OWNERSHIP ANALYSIS\n");

const byOwnership = properties.reduce((acc, p) => {
  if (p.ownership) {
    acc[p.ownership.type] = (acc[p.ownership.type] || 0) + 1;
  }
  return acc;
}, {});

Object.entries(byOwnership)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    const pct = ((count / properties.length) * 100).toFixed(1);
    console.log(`${type.padEnd(25)} ${count} (${pct}%)`);
  });

// Market analysis
console.log("\n📈 MARKET DEMAND ANALYSIS\n");

const byDemand = properties.reduce((acc, p) => {
  if (p.marketAnalysis) {
    acc[p.marketAnalysis.demand] = (acc[p.marketAnalysis.demand] || 0) + 1;
  }
  return acc;
}, {});

Object.entries(byDemand)
  .sort((a, b) => b[1] - a[1])
  .forEach(([demand, count]) => {
    const pct = ((count / properties.length) * 100).toFixed(1);
    console.log(`${demand.padEnd(25)} ${count} (${pct}%)`);
  });

// Top leads
console.log("\n" + "=".repeat(60));
console.log("🏆 TOP 20 LEADS BY SCORE");
console.log("=".repeat(60) + "\n");

properties
  .sort((a, b) => b.leadScore - a.leadScore)
  .slice(0, 20)
  .forEach((prop, idx) => {
    console.log(`${(idx + 1).toString().padStart(2)}. ${prop.propertyName}`);
    console.log(`    ${prop.address.city}, NV | ${prop.propertyType}`);
    console.log(`    Score: ${prop.leadScore} | Tier: ${prop.tier}`);
    console.log(
      `    System: ${prop.solarSystem.systemSizeKw}kW | Savings: $${prop.solarSystem.annualSavings.toLocaleString()}/yr`,
    );
    console.log(`    Contact: ${prop.contact.phone || "N/A"}\n`);
  });

console.log("=".repeat(60));
console.log("✅ VALIDATION COMPLETE");
console.log("=".repeat(60) + "\n");
