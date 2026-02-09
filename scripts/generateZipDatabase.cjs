#!/usr/bin/env node

/**
 * generateZipDatabase.js
 *
 * Reads the GeoNames US.zip postal code data and produces a clean JSON file
 * at data/us_zip_coordinates.json with structure:
 *
 *   { "10001": { "lat": 40.7484, "lng": -73.9967, "city": "New York", "state": "NY" }, ... }
 *
 * Data source: https://download.geonames.org/export/zip/US.zip (CC BY 4.0)
 * Credit: GeoNames (www.geonames.org)
 *
 * Handles:
 *   - All 50 states + DC
 *   - US Territories: PR, GU, VI, AS, MP
 *   - Military zip codes (APO/FPO — AA, AE, AP)
 *   - PO Box zip codes (included if they have coordinates)
 *   - Deduplication: for zip codes with multiple entries, picks the first (highest accuracy)
 *
 * Usage:
 *   # First download the data:
 *   curl -s "https://download.geonames.org/export/zip/US.zip" -o /tmp/us_zips.zip
 *   unzip -o /tmp/us_zips.zip -d /tmp/us_zips/
 *
 *   # Then run:
 *   node scripts/generateZipDatabase.js
 */

const fs = require("fs");
const path = require("path");

// ── Configuration ────────────────────────────────────────────────────────────

// Main US data file + territory data files
const INPUT_FILES = [
  { file: "/tmp/us_zips/US.txt", stateOverride: null },
  { file: "/tmp/pr_zips/PR.txt", stateOverride: "PR" },
  { file: "/tmp/gu_zips/GU.txt", stateOverride: "GU" },
  { file: "/tmp/vi_zips/VI.txt", stateOverride: "VI" },
  { file: "/tmp/as_zips/AS.txt", stateOverride: "AS" },
  { file: "/tmp/mp_zips/MP.txt", stateOverride: "MP" },
];

const OUTPUT_DIR = path.join(__dirname, "..", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "us_zip_coordinates.json");

// GeoNames column indices (tab-delimited)
const COL = {
  COUNTRY_CODE: 0,
  POSTAL_CODE: 1,
  PLACE_NAME: 2,
  STATE_NAME: 3, // admin_name1
  STATE_CODE: 4, // admin_code1 (2-letter abbreviation)
  COUNTY_NAME: 5, // admin_name2
  COUNTY_CODE: 6,
  COMMUNITY: 7,
  COMMUNITY_CODE: 8,
  LATITUDE: 9,
  LONGITUDE: 10,
  ACCURACY: 11,
};

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // Verify input file exists
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    console.error("Download it first:");
    console.error(
      '  curl -s "https://download.geonames.org/export/zip/US.zip" -o /tmp/us_zips.zip',
    );
    console.error("  unzip -o /tmp/us_zips.zip -d /tmp/us_zips/");
    process.exit(1);
  }

  console.log(`Reading GeoNames data from ${INPUT_FILE}...`);
  const raw = fs.readFileSync(INPUT_FILE, "utf-8");
  const lines = raw.split("\n").filter((line) => line.trim().length > 0);
  console.log(`  Found ${lines.length} raw lines`);

  // Parse into zip code map (first occurrence wins for duplicates)
  const zipMap = {};
  let skipped = 0;
  let duplicates = 0;

  for (const line of lines) {
    const cols = line.split("\t");

    // Validate we have enough columns
    if (cols.length < 11) {
      skipped++;
      continue;
    }

    const zip = cols[COL.POSTAL_CODE].trim();
    const city = cols[COL.PLACE_NAME].trim();
    const stateCode = cols[COL.STATE_CODE].trim();
    const lat = parseFloat(cols[COL.LATITUDE]);
    const lng = parseFloat(cols[COL.LONGITUDE]);

    // Validate zip code format (5 digits)
    if (!/^\d{5}$/.test(zip)) {
      skipped++;
      continue;
    }

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      skipped++;
      continue;
    }

    // Validate state code exists
    if (!stateCode || stateCode.length === 0) {
      skipped++;
      continue;
    }

    // Deduplicate: keep first entry (GeoNames sorts by accuracy)
    if (zipMap[zip]) {
      duplicates++;
      continue;
    }

    zipMap[zip] = {
      lat: Math.round(lat * 10000) / 10000, // 4 decimal places (~11m precision)
      lng: Math.round(lng * 10000) / 10000,
      city: city,
      state: stateCode,
    };
  }

  // Sort by zip code for clean output
  const sortedZips = Object.keys(zipMap).sort();
  const sortedResult = {};
  for (const zip of sortedZips) {
    sortedResult[zip] = zipMap[zip];
  }

  // Stats
  const totalZips = sortedZips.length;
  const stateSet = new Set(Object.values(zipMap).map((v) => v.state));
  const states = Array.from(stateSet).sort();

  console.log(`\n── Results ────────────────────────────────────`);
  console.log(`  Total zip codes: ${totalZips.toLocaleString()}`);
  console.log(`  Duplicates merged: ${duplicates}`);
  console.log(`  Skipped (bad data): ${skipped}`);
  console.log(`  States/territories: ${states.length}`);
  console.log(`  States: ${states.join(", ")}`);

  // Zip code range stats
  const zipNums = sortedZips.map(Number);
  console.log(`  Lowest zip: ${sortedZips[0]}`);
  console.log(`  Highest zip: ${sortedZips[sortedZips.length - 1]}`);

  // Count by state
  const stateCount = {};
  for (const data of Object.values(zipMap)) {
    stateCount[data.state] = (stateCount[data.state] || 0) + 1;
  }
  const topStates = Object.entries(stateCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log(`\n── Top 10 states by zip count ──────────────────`);
  for (const [st, count] of topStates) {
    console.log(`  ${st}: ${count.toLocaleString()}`);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write JSON output
  console.log(`\nWriting to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sortedResult, null, 2), "utf-8");

  const fileSizeMB = (fs.statSync(OUTPUT_FILE).size / (1024 * 1024)).toFixed(2);
  console.log(`  File size: ${fileSizeMB} MB`);
  console.log(`\nDone! ${totalZips.toLocaleString()} zip codes written.`);
}

main();
