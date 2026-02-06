/**
 * Utility Rate Service
 * Looks up commercial electricity rates for sun-belt states
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp, cert } from "firebase-admin/app";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class UtilityRateService {
  constructor() {
    this.db = null;
    this.rateCache = new Map();
    this.initialize();
  }

  async initialize() {
    try {
      const serviceAccountPath = path.join(
        __dirname,
        "../../../firebase-service-account.json",
      );
      initializeApp({
        credential: cert(serviceAccountPath),
      });
      this.db = getFirestore();
    } catch (error) {
      if (error.code !== "app/duplicate-app") {
        throw error;
      }
      this.db = getFirestore();
    }
  }

  /**
   * Commercial electricity rates for sun-belt states ($/kWh)
   * Source: EIA 2024 Commercial rates + local utility data
   */
  getStateRates() {
    return {
      // Texas - ERCOT region (deregulated market)
      TX: {
        cities: {
          Austin: { rate: 0.092, utility: "Austin Energy", tier: "commercial" },
          Dallas: {
            rate: 0.095,
            utility: "Oncor/TXU Energy",
            tier: "commercial",
          },
          Houston: {
            rate: 0.089,
            utility: "CenterPoint Energy",
            tier: "commercial",
          },
          "San Antonio": {
            rate: 0.088,
            utility: "CPS Energy",
            tier: "commercial",
          },
          "Fort Worth": {
            rate: 0.094,
            utility: "Oncor/TXU Energy",
            tier: "commercial",
          },
        },
        stateAvg: 0.091,
      },

      // Arizona - High sun, high rates
      AZ: {
        cities: {
          Phoenix: { rate: 0.102, utility: "APS", tier: "commercial" },
          Tucson: { rate: 0.105, utility: "TEP", tier: "commercial" },
          Mesa: { rate: 0.101, utility: "SRP", tier: "commercial" },
          Scottsdale: { rate: 0.103, utility: "SRP", tier: "commercial" },
        },
        stateAvg: 0.103,
      },

      // California - Highest rates in nation
      CA: {
        cities: {
          "Los Angeles": { rate: 0.185, utility: "SCE", tier: "commercial" },
          "San Diego": { rate: 0.192, utility: "SDG&E", tier: "commercial" },
          Sacramento: { rate: 0.165, utility: "SMUD", tier: "commercial" },
          "San Jose": { rate: 0.178, utility: "PG&E", tier: "commercial" },
          "San Francisco": { rate: 0.18, utility: "PG&E", tier: "commercial" },
        },
        stateAvg: 0.18,
      },

      // Florida - Peninsula Power
      FL: {
        cities: {
          Miami: { rate: 0.098, utility: "FPL", tier: "commercial" },
          Tampa: { rate: 0.095, utility: "Tampa Electric", tier: "commercial" },
          Orlando: { rate: 0.097, utility: "Duke Energy", tier: "commercial" },
          Jacksonville: { rate: 0.093, utility: "JEA", tier: "commercial" },
        },
        stateAvg: 0.096,
      },

      // Nevada - Desert sun
      NV: {
        cities: {
          "Las Vegas": {
            rate: 0.097,
            utility: "NV Energy",
            tier: "commercial",
          },
          Henderson: { rate: 0.096, utility: "NV Energy", tier: "commercial" },
          Reno: { rate: 0.095, utility: "NV Energy", tier: "commercial" },
        },
        stateAvg: 0.096,
      },

      // Georgia
      GA: {
        cities: {
          Atlanta: {
            rate: 0.101,
            utility: "Georgia Power",
            tier: "commercial",
          },
          Savannah: {
            rate: 0.099,
            utility: "Georgia Power",
            tier: "commercial",
          },
          Augusta: {
            rate: 0.098,
            utility: "Georgia Power",
            tier: "commercial",
          },
        },
        stateAvg: 0.099,
      },

      // North Carolina
      NC: {
        cities: {
          Charlotte: {
            rate: 0.094,
            utility: "Duke Energy",
            tier: "commercial",
          },
          Raleigh: { rate: 0.092, utility: "Duke Energy", tier: "commercial" },
        },
        stateAvg: 0.093,
      },

      // South Carolina
      SC: {
        cities: {
          Charleston: { rate: 0.098, utility: "SCE&G", tier: "commercial" },
          Columbia: { rate: 0.096, utility: "SCE&G", tier: "commercial" },
        },
        stateAvg: 0.097,
      },
    };
  }

  /**
   * Get utility rate for specific location
   */
  getRateForLocation(state, city = null) {
    const cacheKey = `${state}-${city || "state"}`;

    if (this.rateCache.has(cacheKey)) {
      return this.rateCache.get(cacheKey);
    }

    const rates = this.getStateRates();
    const stateData = rates[state];

    if (!stateData) {
      console.warn(`⚠️  No rate data for state: ${state}`);
      return null;
    }

    let rateData;

    if (city && stateData.cities[city]) {
      rateData = {
        rate: stateData.cities[city].rate,
        utility: stateData.cities[city].utility,
        tier: stateData.cities[city].tier,
        location: `${city}, ${state}`,
        source: "city-specific",
      };
    } else {
      rateData = {
        rate: stateData.stateAvg,
        utility: "State Average",
        tier: "commercial",
        location: state,
        source: "state-average",
      };
    }

    this.rateCache.set(cacheKey, rateData);
    return rateData;
  }

  /**
   * Calculate estimated annual electricity cost
   */
  calculateAnnualElectricityCost(squareFootage, ratePerKwh) {
    // Commercial building energy usage: ~15-20 kWh per sqft per year
    // Using 17 kWh/sqft as average for office/retail
    const annualKwhUsage = squareFootage * 17;
    const annualCost = annualKwhUsage * ratePerKwh;

    return {
      annualKwhUsage: Math.round(annualKwhUsage),
      annualCost: Math.round(annualCost),
      costPerSqft: parseFloat((annualCost / squareFootage).toFixed(2)),
    };
  }

  /**
   * Enrich a single lead with utility rate data
   */
  async enrichLead(leadId) {
    try {
      const leadRef = this.db.collection("commercial_leads").doc(leadId);
      const leadDoc = await leadRef.get();

      if (!leadDoc.exists) {
        console.error(`Lead ${leadId} not found`);
        return null;
      }

      const lead = leadDoc.data();

      // Get rate for this location
      const rateData = this.getRateForLocation(lead.state, lead.city);

      if (!rateData) {
        console.error(`Could not find rate for ${lead.city}, ${lead.state}`);
        return null;
      }

      // Calculate electricity costs
      const electricityCosts = this.calculateAnnualElectricityCost(
        lead.squareFootage,
        rateData.rate,
      );

      // Update lead with utility data
      await leadRef.update({
        utilityRate: rateData.rate,
        utilityName: rateData.utility,
        utilityRateSource: rateData.source,
        annualElectricityUsage: electricityCosts.annualKwhUsage,
        annualElectricityCost: electricityCosts.annualCost,
        electricityCostPerSqft: electricityCosts.costPerSqft,
        enrichedWithUtilityData: true,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        leadId,
        ...rateData,
        ...electricityCosts,
      };
    } catch (error) {
      console.error(`Error enriching lead ${leadId}:`, error.message);
      return null;
    }
  }

  /**
   * Enrich multiple leads with utility rate data
   */
  async enrichLeads(batchSize = 100) {
    console.log(`🔋 Enriching leads with utility rate data...\n`);

    // Find leads without utility data
    const snapshot = await this.db
      .collection("commercial_leads")
      .where("enrichedWithUtilityData", "!=", true)
      .limit(batchSize)
      .get();

    if (snapshot.empty) {
      console.log("✅ No leads to enrich (all up to date)");
      return { count: 0, enriched: 0 };
    }

    let enrichedCount = 0;
    let failedCount = 0;

    for (const doc of snapshot.docs) {
      const lead = doc.data();
      console.log(
        `   Processing: ${lead.propertyName} (${lead.city}, ${lead.state})`,
      );

      const result = await this.enrichLead(doc.id);

      if (result) {
        enrichedCount++;
        console.log(
          `      ✅ Rate: $${result.rate}/kWh, Annual cost: $${result.annualCost.toLocaleString()}`,
        );
      } else {
        failedCount++;
        console.log(`      ❌ Failed to enrich`);
      }
    }

    console.log(`\n✅ Enrichment complete:`);
    console.log(`   Enriched: ${enrichedCount}/${snapshot.size}`);
    if (failedCount > 0) {
      console.log(`   Failed: ${failedCount}`);
    }

    return {
      count: snapshot.size,
      enriched: enrichedCount,
      failed: failedCount,
    };
  }

  /**
   * Get utility rate statistics
   */
  async getStats() {
    const snapshot = await this.db
      .collection("commercial_leads")
      .where("enrichedWithUtilityData", "==", true)
      .get();

    if (snapshot.empty) {
      return { total: 0 };
    }

    const stats = {
      total: snapshot.size,
      byState: {},
      avgRate: 0,
      avgAnnualCost: 0,
      totalAnnualCost: 0,
    };

    let totalRate = 0;
    let totalAnnualCost = 0;

    snapshot.forEach((doc) => {
      const lead = doc.data();

      // By state
      if (!stats.byState[lead.state]) {
        stats.byState[lead.state] = {
          count: 0,
          totalCost: 0,
          avgRate: 0,
        };
      }
      stats.byState[lead.state].count++;
      stats.byState[lead.state].totalCost += lead.annualElectricityCost || 0;

      totalRate += lead.utilityRate || 0;
      totalAnnualCost += lead.annualElectricityCost || 0;
    });

    stats.avgRate = parseFloat((totalRate / snapshot.size).toFixed(3));
    stats.avgAnnualCost = Math.round(totalAnnualCost / snapshot.size);
    stats.totalAnnualCost = Math.round(totalAnnualCost);

    // Calculate state averages
    Object.keys(stats.byState).forEach((state) => {
      const stateData = stats.byState[state];
      stateData.avgCost = Math.round(stateData.totalCost / stateData.count);
    });

    return stats;
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new UtilityRateService();
  const args = process.argv.slice(2);

  (async () => {
    if (args.includes("--enrich")) {
      const batchSize =
        parseInt(
          args.find((a) => a.startsWith("--batch-size="))?.split("=")[1],
        ) || 100;
      await service.enrichLeads(batchSize);
    } else if (args.includes("--stats")) {
      const stats = await service.getStats();
      console.log("\n📊 Utility Rate Statistics:");
      console.log(JSON.stringify(stats, null, 2));
    } else if (args.includes("--get-rate")) {
      const state = args.find((a) => a.startsWith("--state="))?.split("=")[1];
      const city = args.find((a) => a.startsWith("--city="))?.split("=")[1];

      const rate = service.getRateForLocation(state, city);
      console.log("\n🔋 Utility Rate:");
      console.log(JSON.stringify(rate, null, 2));
    } else {
      console.log(`
🔋 Utility Rate Service

Usage:
  --enrich [--batch-size=100]    Enrich leads with utility rate data
  --stats                         Show utility rate statistics
  --get-rate --state=TX [--city=Austin]  Get rate for location

Examples:
  node utility-rate-service.js --enrich --batch-size=50
  node utility-rate-service.js --stats
  node utility-rate-service.js --get-rate --state=CA --city="Los Angeles"
      `);
    }

    process.exit(0);
  })();
}
