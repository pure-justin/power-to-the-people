/**
 * Utility Rate Fetcher for Sun-Belt States
 * Gets commercial electricity rates by location
 */

const axios = require("axios");
const { getFirestore } = require("firebase-admin/firestore");

// Average commercial utility rates by state ($/kWh)
// Source: EIA Commercial Average Retail Price of Electricity
const STATE_UTILITY_RATES = {
  TX: 0.0928, // Texas (ERCOT)
  AZ: 0.1045, // Arizona
  CA: 0.1678, // California (highest)
  FL: 0.0956, // Florida
  NV: 0.1123, // Nevada
  NM: 0.0982, // New Mexico
  GA: 0.1034, // Georgia
  NC: 0.0945, // North Carolina
  SC: 0.0971, // South Carolina
};

// Time-of-use multipliers for commercial (peak hours cost more)
const TOU_MULTIPLIERS = {
  peak: 1.35, // 12pm-7pm
  shoulder: 1.0, // 7am-12pm, 7pm-10pm
  offPeak: 0.65, // 10pm-7am
};

class UtilityRateService {
  constructor() {
    this.db = getFirestore();
  }

  /**
   * Get utility rate for a specific location
   * @param {string} state - State code (TX, AZ, etc)
   * @param {string} zipCode - Zip code
   * @param {string} utilityName - Optional utility company name
   */
  async getRate(state, zipCode, utilityName = null) {
    // Base rate from state average
    let baseRate = STATE_UTILITY_RATES[state] || 0.11;

    // Check if we have cached utility-specific data
    if (utilityName) {
      const cachedRate = await this.getCachedRate(utilityName);
      if (cachedRate) {
        return cachedRate;
      }
    }

    // In production, this would call OpenEI API or utility company APIs
    // For now, add slight variation based on zip code
    const zipVariation = parseInt(zipCode.slice(-2)) / 1000;
    const finalRate = baseRate + zipVariation;

    return {
      baseRate: finalRate,
      state,
      zipCode,
      utilityName: utilityName || this.getUtilityByState(state),
      rateStructure: "tiered",
      demandCharge: this.estimateDemandCharge(state),
      touRates: {
        peak: finalRate * TOU_MULTIPLIERS.peak,
        shoulder: finalRate * TOU_MULTIPLIERS.shoulder,
        offPeak: finalRate * TOU_MULTIPLIERS.offPeak,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get cached utility rate from Firestore
   */
  async getCachedRate(utilityName) {
    const doc = await this.db
      .collection("utility_rates")
      .doc(utilityName.replace(/\s/g, "_").toLowerCase())
      .get();

    if (doc.exists) {
      const data = doc.data();
      // Check if data is less than 90 days old
      const age = Date.now() - new Date(data.lastUpdated).getTime();
      if (age < 90 * 24 * 60 * 60 * 1000) {
        return data;
      }
    }

    return null;
  }

  /**
   * Estimate demand charge ($/kW/month)
   * Commercial customers often pay for peak demand
   */
  estimateDemandCharge(state) {
    const demandCharges = {
      TX: 8.5,
      AZ: 12.0,
      CA: 18.5,
      FL: 9.75,
      NV: 11.25,
      NM: 8.0,
      GA: 10.5,
      NC: 9.0,
      SC: 8.75,
    };
    return demandCharges[state] || 10.0;
  }

  /**
   * Get primary utility company by state
   */
  getUtilityByState(state) {
    const utilities = {
      TX: "Oncor Electric Delivery",
      AZ: "Arizona Public Service",
      CA: "Pacific Gas & Electric",
      FL: "Florida Power & Light",
      NV: "NV Energy",
      NM: "Public Service Company of New Mexico",
      GA: "Georgia Power",
      NC: "Duke Energy",
      SC: "Duke Energy",
    };
    return utilities[state] || "Local Utility";
  }

  /**
   * Calculate annual electricity cost for commercial building
   * @param {number} squareFootage - Building square footage
   * @param {number} rate - Electricity rate ($/kWh)
   * @param {string} propertyType - Type of property
   */
  calculateAnnualCost(squareFootage, rate, propertyType = "office") {
    // Energy Use Intensity (kWh/sqft/year) by property type
    const euiByType = {
      office: 15.3,
      retail: 14.1,
      industrial: 11.7,
      warehouse: 6.5,
      flex: 10.2,
      medical: 22.8,
    };

    const eui = euiByType[propertyType] || 12.0;
    const annualkWh = squareFootage * eui;
    const annualCost = annualkWh * rate;

    return {
      annualkWh: Math.floor(annualkWh),
      annualCost: Math.floor(annualCost),
      monthlyCost: Math.floor(annualCost / 12),
      eui,
      rate,
    };
  }

  /**
   * Enrich all leads with utility rate data
   */
  async enrichLeads(batchSize = 50) {
    console.log("🔋 Enriching leads with utility rate data...");

    const snapshot = await this.db
      .collection("commercial_leads")
      .where("utilityRate", "==", null)
      .limit(batchSize)
      .get();

    let enriched = 0;

    for (const doc of snapshot.docs) {
      const lead = doc.data();

      try {
        // Get utility rate
        const rateData = await this.getRate(lead.state, lead.zipCode);

        // Calculate annual cost
        const costData = this.calculateAnnualCost(
          lead.squareFootage,
          rateData.baseRate,
          lead.propertyType,
        );

        // Update lead
        await doc.ref.update({
          utilityRate: rateData.baseRate,
          utilityData: rateData,
          annualElectricBill: costData.annualCost,
          annualkWh: costData.annualkWh,
          monthlyCost: costData.monthlyCost,
          updatedAt: new Date().toISOString(),
        });

        enriched++;

        if (enriched % 10 === 0) {
          console.log(`   ✓ Enriched ${enriched}/${snapshot.size} leads`);
        }
      } catch (error) {
        console.error(`   ❌ Error enriching lead ${lead.id}:`, error.message);
      }
    }

    console.log(`✅ Enriched ${enriched} leads with utility data`);
    return enriched;
  }

  /**
   * Get utility rate statistics
   */
  async getStats() {
    const snapshot = await this.db.collection("commercial_leads").get();
    const leads = snapshot.docs.map((doc) => doc.data());

    const stats = {
      total: leads.length,
      enriched: leads.filter((l) => l.utilityRate).length,
      avgRate: 0,
      avgAnnualCost: 0,
      totalAnnualCost: 0,
      byState: {},
    };

    const enrichedLeads = leads.filter((l) => l.utilityRate);

    if (enrichedLeads.length > 0) {
      stats.avgRate =
        enrichedLeads.reduce((sum, l) => sum + l.utilityRate, 0) /
        enrichedLeads.length;

      stats.avgAnnualCost =
        enrichedLeads.reduce((sum, l) => sum + l.annualElectricBill, 0) /
        enrichedLeads.length;

      stats.totalAnnualCost = enrichedLeads.reduce(
        (sum, l) => sum + l.annualElectricBill,
        0,
      );

      // By state
      enrichedLeads.forEach((lead) => {
        if (!stats.byState[lead.state]) {
          stats.byState[lead.state] = {
            count: 0,
            avgRate: 0,
            avgCost: 0,
            totalCost: 0,
          };
        }
        stats.byState[lead.state].count++;
        stats.byState[lead.state].totalCost += lead.annualElectricBill;
      });

      // Calculate averages
      Object.keys(stats.byState).forEach((state) => {
        const data = stats.byState[state];
        data.avgCost = Math.floor(data.totalCost / data.count);
        data.totalCost = Math.floor(data.totalCost);
      });
    }

    return stats;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const service = new UtilityRateService();

  if (args.includes("--enrich")) {
    const batchSize = parseInt(args[args.indexOf("--batch-size") + 1]) || 50;
    await service.enrichLeads(batchSize);
  } else if (args.includes("--stats")) {
    const stats = await service.getStats();
    console.log("\n📊 Utility Rate Statistics:");
    console.log(JSON.stringify(stats, null, 2));
  } else if (args.includes("--get-rate")) {
    const state = args[args.indexOf("--state") + 1];
    const zip = args[args.indexOf("--zip") + 1];
    const rate = await service.getRate(state, zip);
    console.log("\n💡 Utility Rate:");
    console.log(JSON.stringify(rate, null, 2));
  } else {
    console.log("Usage:");
    console.log("  node utility-rates.js --enrich [--batch-size 50]");
    console.log("  node utility-rates.js --stats");
    console.log("  node utility-rates.js --get-rate --state TX --zip 75001");
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = UtilityRateService;
