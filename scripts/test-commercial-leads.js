#!/usr/bin/env node

/**
 * Test Script - Generate Mock Commercial Leads
 * Creates realistic mock data and imports to Firestore for testing
 */

import dotenv from "dotenv";
dotenv.config();

import {
  importPropertiesBatch,
  getImportStats,
} from "../src/services/commercialLeadImporter.js";
import {
  estimateRoofSize,
  estimateEnergyConsumption,
  calculateSolarSystem,
  NEVADA_LOCATIONS,
  PROPERTY_TYPES,
} from "../src/services/commercialLeadScraper.js";
import { writeFileSync } from "fs";

// Mock commercial properties based on real Nevada businesses
const MOCK_PROPERTIES = [
  // Las Vegas - Warehouses
  {
    name: "Vegas Distribution Center",
    type: "warehouse",
    city: "Las Vegas",
    lat: 36.1699,
    lng: -115.1398,
    phone: "(702) 555-0101",
    website: "https://example.com",
  },
  {
    name: "Southwest Logistics Hub",
    type: "warehouse",
    city: "Las Vegas",
    lat: 36.175,
    lng: -115.145,
    phone: "(702) 555-0102",
    website: null,
  },
  {
    name: "Desert Storage Facility",
    type: "warehouse",
    city: "Las Vegas",
    lat: 36.168,
    lng: -115.13,
    phone: "(702) 555-0103",
    website: "https://example.com",
  },

  // Las Vegas - Retail Centers
  {
    name: "Las Vegas Premium Outlets",
    type: "retail_center",
    city: "Las Vegas",
    lat: 36.1147,
    lng: -115.1728,
    phone: "(702) 555-0201",
    website: "https://example.com",
  },
  {
    name: "Boulevard Mall",
    type: "retail_center",
    city: "Las Vegas",
    lat: 36.1295,
    lng: -115.1356,
    phone: "(702) 555-0202",
    website: "https://example.com",
  },
  {
    name: "Town Square Las Vegas",
    type: "retail_center",
    city: "Las Vegas",
    lat: 36.0745,
    lng: -115.1734,
    phone: "(702) 555-0203",
    website: "https://example.com",
  },

  // Las Vegas - Office Buildings
  {
    name: "One Summerlin",
    type: "office_building",
    city: "Las Vegas",
    lat: 36.1524,
    lng: -115.3265,
    phone: "(702) 555-0301",
    website: "https://example.com",
  },
  {
    name: "Hughes Center",
    type: "office_building",
    city: "Las Vegas",
    lat: 36.1147,
    lng: -115.1528,
    phone: "(702) 555-0302",
    website: null,
  },
  {
    name: "Tivoli Village",
    type: "office_building",
    city: "Las Vegas",
    lat: 36.1674,
    lng: -115.3068,
    phone: "(702) 555-0303",
    website: "https://example.com",
  },

  // Henderson - Industrial
  {
    name: "Henderson Industrial Park",
    type: "industrial_park",
    city: "Henderson",
    lat: 36.0395,
    lng: -114.9817,
    phone: "(702) 555-0401",
    website: "https://example.com",
  },
  {
    name: "Black Mountain Industrial",
    type: "industrial_park",
    city: "Henderson",
    lat: 36.02,
    lng: -114.97,
    phone: "(702) 555-0402",
    website: null,
  },
  {
    name: "Eastgate Business Park",
    type: "industrial_park",
    city: "Henderson",
    lat: 36.045,
    lng: -114.99,
    phone: "(702) 555-0403",
    website: "https://example.com",
  },

  // Henderson - Distribution
  {
    name: "Amazon Fulfillment Center LAS7",
    type: "distribution_center",
    city: "Henderson",
    lat: 36.0339,
    lng: -115.0339,
    phone: "(702) 555-0501",
    website: "https://example.com",
  },
  {
    name: "FedEx Distribution Hub",
    type: "distribution_center",
    city: "Henderson",
    lat: 36.04,
    lng: -114.975,
    phone: "(702) 555-0502",
    website: "https://example.com",
  },
  {
    name: "UPS Henderson Facility",
    type: "distribution_center",
    city: "Henderson",
    lat: 36.035,
    lng: -114.98,
    phone: "(702) 555-0503",
    website: null,
  },

  // Reno - Warehouses
  {
    name: "Reno-Tahoe Industrial Center",
    type: "warehouse",
    city: "Reno",
    lat: 39.5296,
    lng: -119.8138,
    phone: "(775) 555-0601",
    website: "https://example.com",
  },
  {
    name: "Panasonic Gigafactory",
    type: "warehouse",
    city: "Reno",
    lat: 39.5376,
    lng: -119.4411,
    phone: "(775) 555-0602",
    website: "https://example.com",
  },
  {
    name: "Tesla Gigafactory Nevada",
    type: "warehouse",
    city: "Reno",
    lat: 39.5373,
    lng: -119.4431,
    phone: "(775) 555-0603",
    website: "https://example.com",
  },

  // Reno - Retail
  {
    name: "Meadowood Mall",
    type: "retail_center",
    city: "Reno",
    lat: 39.5045,
    lng: -119.7719,
    phone: "(775) 555-0701",
    website: "https://example.com",
  },
  {
    name: "The Summit Reno",
    type: "retail_center",
    city: "Reno",
    lat: 39.5422,
    lng: -119.8428,
    phone: "(775) 555-0702",
    website: null,
  },
  {
    name: "Legends Bay Casino",
    type: "retail_center",
    city: "Sparks",
    lat: 39.5349,
    lng: -119.7527,
    phone: "(775) 555-0703",
    website: "https://example.com",
  },

  // North Las Vegas - Self Storage
  {
    name: "Extra Space Storage",
    type: "self_storage",
    city: "North Las Vegas",
    lat: 36.1989,
    lng: -115.1175,
    phone: "(702) 555-0801",
    website: "https://example.com",
  },
  {
    name: "Public Storage North LV",
    type: "self_storage",
    city: "North Las Vegas",
    lat: 36.21,
    lng: -115.12,
    phone: "(702) 555-0802",
    website: "https://example.com",
  },
  {
    name: "CubeSmart Self Storage",
    type: "self_storage",
    city: "North Las Vegas",
    lat: 36.195,
    lng: -115.115,
    phone: "(702) 555-0803",
    website: null,
  },
];

/**
 * Generate mock property data
 */
function generateMockProperty(mockData) {
  const locationObj = NEVADA_LOCATIONS.find(
    (loc) => loc.name === mockData.city,
  );
  const propertyType = PROPERTY_TYPES[mockData.type];

  const roofSize = estimateRoofSize(propertyType, locationObj);
  const energyConsumption = estimateEnergyConsumption(propertyType, roofSize);
  const solarSystem = calculateSolarSystem(energyConsumption, roofSize);

  // Calculate lead score
  let leadScore = 0;
  if (solarSystem.systemSizeKw > 100) leadScore += 30;
  else if (solarSystem.systemSizeKw > 50) leadScore += 25;
  else if (solarSystem.systemSizeKw > 25) leadScore += 20;
  else leadScore += 10;

  if (solarSystem.paybackYears < 5) leadScore += 30;
  else if (solarSystem.paybackYears < 7) leadScore += 25;
  else if (solarSystem.paybackYears < 10) leadScore += 20;
  else leadScore += 10;

  if (solarSystem.annualSavings > 50000) leadScore += 25;
  else if (solarSystem.annualSavings > 25000) leadScore += 20;
  else if (solarSystem.annualSavings > 10000) leadScore += 15;
  else leadScore += 10;

  leadScore += 10; // operational
  if (mockData.phone || mockData.website) leadScore += 5;

  return {
    propertyName: mockData.name,
    placeId: `mock_${mockData.name.toLowerCase().replace(/\s+/g, "_")}`,
    propertyType: propertyType.keyword,
    priority: propertyType.priority,

    address: {
      street: `${Math.floor(Math.random() * 9000) + 1000} Mock Street`,
      city: mockData.city,
      state: "NV",
      postalCode: `89${Math.floor(Math.random() * 900) + 100}`,
      county: getCounty(mockData.city),
      latitude: mockData.lat,
      longitude: mockData.lng,
      formattedAddress: `${Math.floor(Math.random() * 9000) + 1000} Mock Street, ${mockData.city}, NV 89${Math.floor(Math.random() * 900) + 100}`,
    },

    contact: {
      phone: mockData.phone,
      website: mockData.website,
    },

    metrics: {
      buildingSqFt: roofSize.buildingSqFt,
      roofSqFt: roofSize.roofSqFt,
      estimationMethod: roofSize.estimationMethod,
    },

    energyProfile: {
      annualKwh: energyConsumption.annualKwh,
      monthlyKwh: energyConsumption.monthlyKwh,
      monthlyBill: energyConsumption.monthlyBill,
      annualBill: energyConsumption.annualBill,
      energyRate: energyConsumption.energyRate,
      estimationMethod: energyConsumption.estimationMethod,
    },

    solarSystem: {
      recommendedPanels: solarSystem.recommendedPanels,
      systemSizeKw: solarSystem.systemSizeKw,
      annualProductionKwh: solarSystem.annualProductionKwh,
      offsetPercentage: solarSystem.offsetPercentage,
      systemCost: solarSystem.systemCost,
      federalTaxCredit: solarSystem.federalTaxCredit,
      netCost: solarSystem.netCost,
      annualSavings: solarSystem.annualSavings,
      monthlySavings: solarSystem.monthlySavings,
      paybackYears: solarSystem.paybackYears,
      maxPanelCapacity: solarSystem.maxPanelCapacity,
    },

    leadScore,
    businessStatus: "OPERATIONAL",
    rating: 4.0 + Math.random(),
    reviewCount: Math.floor(Math.random() * 500) + 50,
    scrapedAt: new Date().toISOString(),
  };
}

function getCounty(city) {
  const countyMap = {
    "Las Vegas": "Clark",
    Henderson: "Clark",
    "North Las Vegas": "Clark",
    Reno: "Washoe",
    Sparks: "Washoe",
    "Carson City": "Carson City",
    Elko: "Elko",
  };
  return countyMap[city] || "Clark";
}

/**
 * Generate additional random properties to reach 500+
 */
function generateRandomProperties(count) {
  const properties = [];
  const cities = [
    "Las Vegas",
    "Henderson",
    "North Las Vegas",
    "Reno",
    "Sparks",
  ];
  const types = Object.keys(PROPERTY_TYPES);

  for (let i = 0; i < count; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const locationObj = NEVADA_LOCATIONS.find((loc) => loc.name === city);

    properties.push(
      generateMockProperty({
        name: `${city} ${PROPERTY_TYPES[type].keyword} ${i + 1}`,
        type,
        city,
        lat: locationObj.center.lat + (Math.random() - 0.5) * 0.1,
        lng: locationObj.center.lng + (Math.random() - 0.5) * 0.1,
        phone:
          Math.random() > 0.3
            ? `(${Math.floor(Math.random() * 900) + 100}) 555-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`
            : null,
        website: Math.random() > 0.5 ? "https://example.com" : null,
      }),
    );
  }

  return properties;
}

/**
 * Main test execution
 */
async function main() {
  console.log("🧪 Commercial Lead Test - Mock Data Generation\n");
  console.log("==============================================\n");

  // Generate mock properties
  console.log("📝 Generating mock commercial properties...\n");

  const namedProperties = MOCK_PROPERTIES.map(generateMockProperty);
  const randomProperties = generateRandomProperties(
    500 - MOCK_PROPERTIES.length,
  );
  const allProperties = [...namedProperties, ...randomProperties];

  console.log(`✓ Generated ${allProperties.length} mock properties\n`);

  // Display statistics
  const stats = {
    byType: {},
    byCity: {},
    avgLeadScore: 0,
    totalSavings: 0,
  };

  let scoreSum = 0;

  allProperties.forEach((prop) => {
    stats.byType[prop.propertyType] =
      (stats.byType[prop.propertyType] || 0) + 1;
    stats.byCity[prop.address.city] =
      (stats.byCity[prop.address.city] || 0) + 1;
    scoreSum += prop.leadScore;
    stats.totalSavings += prop.solarSystem.annualSavings;
  });

  stats.avgLeadScore = Math.round(scoreSum / allProperties.length);

  console.log("📊 Statistics:\n");
  console.log("Property Types:");
  Object.entries(stats.byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log("\nCities:");
  Object.entries(stats.byCity).forEach(([city, count]) => {
    console.log(`  ${city}: ${count}`);
  });

  console.log(`\nAverage Lead Score: ${stats.avgLeadScore}`);
  console.log(
    `Total Savings Potential: $${stats.totalSavings.toLocaleString()}/year\n`,
  );

  // Top 10
  const top10 = allProperties
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 10);

  console.log("🏆 Top 10 Leads:\n");
  top10.forEach((prop, idx) => {
    console.log(`${idx + 1}. ${prop.propertyName} (${prop.address.city})`);
    console.log(
      `   Score: ${prop.leadScore} | ${prop.solarSystem.systemSizeKw}kW | $${prop.solarSystem.annualSavings.toLocaleString()}/yr\n`,
    );
  });

  // Export to JSON
  const json = JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      totalProperties: allProperties.length,
      properties: allProperties,
    },
    null,
    2,
  );

  writeFileSync("mock-commercial-leads.json", json);
  console.log("✓ Exported to mock-commercial-leads.json\n");

  // Import to Firestore
  console.log("🔥 Importing to Firestore...\n");
  const results = await importPropertiesBatch(allProperties);

  console.log("\n📈 Import Results:");
  console.log(`  Total: ${results.total}`);
  console.log(`  Imported: ${results.imported}`);
  console.log(`  Duplicates: ${results.duplicates}`);
  console.log(`  Errors: ${results.errors}\n`);

  // Database stats
  const dbStats = await getImportStats();
  if (dbStats) {
    console.log("📊 Database Statistics:\n");
    console.log(`Total commercial leads: ${dbStats.total}`);
    console.log(`Average lead score: ${dbStats.avgLeadScore}`);
    console.log(
      `Total savings potential: $${dbStats.totalSavingsPotential.toLocaleString()}/year\n`,
    );
  }

  console.log("✅ Test complete!\n");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
