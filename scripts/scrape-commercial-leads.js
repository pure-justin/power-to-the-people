#!/usr/bin/env node

/**
 * Commercial Lead Generation Pipeline
 * Scrapes 500+ commercial properties in Nevada and imports to Firestore
 *
 * Usage:
 *   node scripts/scrape-commercial-leads.js [options]
 *
 * Options:
 *   --dry-run          Run without importing to Firestore
 *   --limit=N          Limit total properties (default: 500)
 *   --per-type=N       Properties per type per location (default: 12)
 *   --min-score=N      Minimum lead score (default: 40)
 *   --export           Export to JSON file
 *   --cities=city1,city2  Only specific cities (comma-separated)
 */

import {
  scrapeAllNevada,
  scrapeLocation,
  NEVADA_LOCATIONS,
  PROPERTY_TYPES,
} from "../src/services/commercialLeadScraper.js";
import {
  importPropertiesBatch,
  importFilteredProperties,
  exportToJSON,
  getImportStats,
} from "../src/services/commercialLeadImporter.js";
import { writeFileSync } from "fs";

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes("--dry-run"),
  export: args.includes("--export"),
  limit:
    parseInt(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1]) ||
    500,
  perType:
    parseInt(
      args.find((arg) => arg.startsWith("--per-type="))?.split("=")[1],
    ) || 12,
  minScore:
    parseInt(
      args.find((arg) => arg.startsWith("--min-score="))?.split("=")[1],
    ) || 40,
  cities:
    args
      .find((arg) => arg.startsWith("--cities="))
      ?.split("=")[1]
      ?.split(",") || null,
};

console.log("🏢 Commercial Lead Generation Pipeline");
console.log("=====================================\n");
console.log("Configuration:");
console.log(`  Target: ${options.limit} properties`);
console.log(`  Per type/location: ${options.perType}`);
console.log(`  Min lead score: ${options.minScore}`);
console.log(`  Dry run: ${options.dryRun ? "Yes" : "No"}`);
console.log(`  Export JSON: ${options.export ? "Yes" : "No"}`);
if (options.cities) {
  console.log(`  Cities: ${options.cities.join(", ")}`);
}
console.log("");

/**
 * Main pipeline execution
 */
async function main() {
  const startTime = Date.now();

  try {
    // Step 1: Scrape properties
    console.log(
      "📡 Step 1: Scraping commercial properties from Google Places API...\n",
    );

    const locations = options.cities
      ? NEVADA_LOCATIONS.filter((loc) => options.cities.includes(loc.name))
      : NEVADA_LOCATIONS;

    const allProperties = [];

    for (const location of locations) {
      console.log(`\n🌆 Scraping ${location.name}...`);

      for (const [typeKey, propertyType] of Object.entries(PROPERTY_TYPES)) {
        try {
          const properties = await scrapeLocation(
            location,
            propertyType,
            options.perType,
          );
          allProperties.push(...properties);

          console.log(
            `   ✓ ${propertyType.keyword}: ${properties.length} properties`,
          );

          // Check if we've reached the limit
          if (allProperties.length >= options.limit) {
            console.log(`\n✓ Reached target of ${options.limit} properties`);
            break;
          }
        } catch (error) {
          console.error(
            `   ✗ Error scraping ${propertyType.keyword}:`,
            error.message,
          );
        }
      }

      if (allProperties.length >= options.limit) break;
    }

    // Trim to exact limit
    const properties = allProperties.slice(0, options.limit);

    console.log(`\n✅ Scraped ${properties.length} total properties`);

    // Step 2: Display statistics
    console.log("\n📊 Step 2: Analyzing scraped properties...\n");

    const stats = {
      total: properties.length,
      byType: {},
      byCity: {},
      byPriority: {},
      avgLeadScore: 0,
      avgSystemSize: 0,
      totalSavingsPotential: 0,
    };

    let scoreSum = 0;
    let sizeSum = 0;

    properties.forEach((property) => {
      // Count by type
      stats.byType[property.propertyType] =
        (stats.byType[property.propertyType] || 0) + 1;

      // Count by city
      stats.byCity[property.address.city] =
        (stats.byCity[property.address.city] || 0) + 1;

      // Count by priority
      stats.byPriority[property.priority] =
        (stats.byPriority[property.priority] || 0) + 1;

      // Accumulate metrics
      scoreSum += property.leadScore;
      sizeSum += property.solarSystem.systemSizeKw;
      stats.totalSavingsPotential += property.solarSystem.annualSavings;
    });

    stats.avgLeadScore = Math.round(scoreSum / properties.length);
    stats.avgSystemSize = Math.round((sizeSum / properties.length) * 10) / 10;

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

    console.log("\nMetrics:");
    console.log(`  Average lead score: ${stats.avgLeadScore}/100`);
    console.log(`  Average system size: ${stats.avgSystemSize} kW`);
    console.log(
      `  Total savings potential: $${stats.totalSavingsPotential.toLocaleString()}/year`,
    );

    // Top 10 leads
    const topLeads = properties
      .sort((a, b) => b.leadScore - a.leadScore)
      .slice(0, 10);

    console.log("\n🏆 Top 10 Leads by Score:\n");
    topLeads.forEach((property, idx) => {
      console.log(
        `${idx + 1}. ${property.propertyName} (${property.address.city})`,
      );
      console.log(
        `   Score: ${property.leadScore} | ${property.solarSystem.systemSizeKw}kW | $${property.solarSystem.annualSavings.toLocaleString()}/yr savings`,
      );
    });

    // Step 3: Export to JSON (if requested)
    if (options.export) {
      console.log("\n💾 Step 3: Exporting to JSON...\n");

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `commercial-leads-${timestamp}.json`;
      const json = exportToJSON(properties, filename);

      writeFileSync(filename, json);
      console.log(`✓ Exported to ${filename}`);
    }

    // Step 4: Import to Firestore
    if (!options.dryRun) {
      console.log("\n🔥 Step 4: Importing to Firestore...\n");

      const results = await importFilteredProperties(properties, {
        minLeadScore: options.minScore,
        priorities: ["high", "medium", "low"],
      });

      console.log("\n📈 Final Import Results:");
      console.log(`  Total processed: ${results.total}`);
      console.log(`  Successfully imported: ${results.imported}`);
      console.log(`  Duplicates skipped: ${results.duplicates}`);
      console.log(`  Errors: ${results.errors}`);

      // Get database statistics
      console.log("\n📊 Database Statistics:\n");
      const dbStats = await getImportStats();

      if (dbStats) {
        console.log(`Total commercial leads in database: ${dbStats.total}`);
        console.log(`Average lead score: ${dbStats.avgLeadScore}`);
        console.log(
          `Total annual savings potential: $${dbStats.totalSavingsPotential.toLocaleString()}`,
        );

        console.log("\nBy Property Type:");
        Object.entries(dbStats.byType)
          .sort((a, b) => b[1] - a[1])
          .forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
          });

        console.log("\nBy Quality Tier:");
        Object.entries(dbStats.byTier)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([tier, count]) => {
            console.log(`  Tier ${tier}: ${count}`);
          });
      }
    } else {
      console.log("\n⚠️  Dry run mode - skipping Firestore import");
      console.log(
        `   Would have imported ${properties.filter((p) => p.leadScore >= options.minScore).length} properties`,
      );
    }

    // Execution summary
    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    console.log("\n✅ Pipeline completed successfully!");
    console.log(`   Execution time: ${minutes}m ${seconds}s`);
    console.log(`   Properties scraped: ${properties.length}`);
    if (!options.dryRun) {
      console.log(
        `   Properties imported: ${properties.filter((p) => p.leadScore >= options.minScore).length}`,
      );
    }
  } catch (error) {
    console.error("\n❌ Pipeline failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the pipeline
main()
  .then(() => {
    console.log("\n🎉 All done!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
