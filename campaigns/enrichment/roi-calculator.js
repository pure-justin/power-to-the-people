/**
 * Solar ROI Calculator for Commercial Properties
 * Calculates personalized ROI based on building specifics
 */

const { getFirestore } = require("firebase-admin/firestore");

class ROICalculator {
  constructor() {
    this.db = getFirestore();
  }

  /**
   * Calculate comprehensive solar ROI for a commercial property
   * @param {Object} lead - Lead data with building info
   */
  async calculateROI(lead) {
    const {
      squareFootage,
      annualkWh,
      annualElectricBill,
      utilityRate,
      state,
      propertyType,
      yearBuilt,
    } = lead;

    // 1. Determine system size
    const systemSize = this.calculateSystemSize(squareFootage, annualkWh);

    // 2. Calculate installation cost
    const installationCost = this.calculateInstallationCost(
      systemSize,
      propertyType,
      state,
    );

    // 3. Calculate incentives
    const incentives = this.calculateIncentives(
      installationCost,
      systemSize,
      state,
    );

    // 4. Calculate annual savings
    const annualSavings = this.calculateAnnualSavings(
      systemSize,
      utilityRate,
      state,
    );

    // 5. Calculate payback and ROI
    const netCost = installationCost - incentives.total;
    const paybackYears = netCost / annualSavings;
    const roi = (annualSavings / netCost) * 100;

    // 6. Calculate 25-year value
    const lifetimeValue = this.calculateLifetimeValue(
      annualSavings,
      utilityRate,
      25,
    );

    return {
      systemSize, // kW
      panelCount: Math.floor(systemSize / 0.4), // ~400W panels
      installationCost,
      incentives,
      netCost,
      annualSavings: Math.floor(annualSavings),
      monthlySavings: Math.floor(annualSavings / 12),
      paybackYears: parseFloat(paybackYears.toFixed(1)),
      roi: parseFloat(roi.toFixed(1)),
      lifetimeValue: Math.floor(lifetimeValue),
      lifetimeROI: parseFloat(((lifetimeValue / netCost) * 100).toFixed(0)),
      co2Offset: Math.floor(systemSize * 1.2 * 25), // tons over 25 years
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate optimal system size based on building
   * @param {number} squareFootage - Building square footage
   * @param {number} annualkWh - Annual energy usage
   */
  calculateSystemSize(squareFootage, annualkWh) {
    // Target 80-100% of annual usage
    const targetProduction = annualkWh * 0.9;

    // Average production: 1.4 kWh per watt in sun-belt states
    const systemSizeW = targetProduction / 1400;

    // Round to nearest 10kW for commercial
    const systemSizekW = Math.ceil(systemSizeW / 10) * 10;

    // Max out at roof capacity (~10W per sqft for commercial)
    const maxRoofCapacity = (squareFootage * 0.3 * 10) / 1000; // 30% roof, 10W/sqft

    return Math.min(systemSizekW, maxRoofCapacity);
  }

  /**
   * Calculate installation cost
   * Commercial solar: $2.50-$3.50 per watt
   */
  calculateInstallationCost(systemSizekW, propertyType, state) {
    // Base cost per watt
    let costPerWatt = 2.75;

    // Adjust for property type
    const typeAdjustments = {
      office: 0, // Standard
      retail: 0.1, // More complex
      industrial: -0.15, // Easier install
      warehouse: -0.2, // Easiest
      flex: 0,
      medical: 0.15, // More requirements
    };

    costPerWatt += typeAdjustments[propertyType] || 0;

    // Adjust for state (permitting, labor)
    const stateAdjustments = {
      CA: 0.35, // Highest cost
      AZ: 0,
      TX: -0.1,
      FL: 0,
      NV: 0.05,
      NM: -0.05,
      GA: 0,
      NC: 0,
      SC: -0.05,
    };

    costPerWatt += stateAdjustments[state] || 0;

    // Economies of scale for larger systems
    if (systemSizekW > 100) {
      costPerWatt *= 0.95;
    }
    if (systemSizekW > 250) {
      costPerWatt *= 0.92;
    }

    return Math.floor(systemSizekW * 1000 * costPerWatt);
  }

  /**
   * Calculate federal and state incentives
   */
  calculateIncentives(installationCost, systemSizekW, state) {
    const incentives = {
      federal: 0,
      state: 0,
      local: 0,
      depreciation: 0,
      total: 0,
      details: [],
    };

    // 1. Federal Investment Tax Credit (ITC) - 30% through 2032
    incentives.federal = Math.floor(installationCost * 0.3);
    incentives.details.push({
      name: "Federal ITC",
      amount: incentives.federal,
      description: "30% Investment Tax Credit",
    });

    // 2. Modified Accelerated Cost Recovery System (MACRS)
    // 5-year depreciation schedule, worth ~20% of system cost
    incentives.depreciation = Math.floor(installationCost * 0.2);
    incentives.details.push({
      name: "MACRS Depreciation",
      amount: incentives.depreciation,
      description: "5-year accelerated depreciation",
    });

    // 3. State-specific incentives
    const stateIncentives = {
      CA: 0.1, // SGIP, local rebates
      AZ: 0.05, // Equipment tax exemption
      TX: 0.03, // Property tax exemption
      FL: 0.04, // Sales tax exemption
      NV: 0.05, // Solar incentives
      NM: 0.06, // Sustainable Building Tax Credit
      GA: 0.02, // Property tax exemption
      NC: 0.03, // State incentives
      SC: 0.04, // Various incentives
    };

    const stateRate = stateIncentives[state] || 0;
    if (stateRate > 0) {
      incentives.state = Math.floor(installationCost * stateRate);
      incentives.details.push({
        name: `${state} State Incentives`,
        amount: incentives.state,
        description: "State-level solar incentives",
      });
    }

    // 4. Inflation Reduction Act (IRA) bonus credits
    // Additional 10% for domestic content
    const iraBonusCredit = Math.floor(installationCost * 0.1);
    incentives.federal += iraBonusCredit;
    incentives.details.push({
      name: "IRA Domestic Content",
      amount: iraBonusCredit,
      description: "10% bonus for domestic solar products",
    });

    incentives.total =
      incentives.federal +
      incentives.state +
      incentives.local +
      incentives.depreciation;

    return incentives;
  }

  /**
   * Calculate annual electricity savings
   */
  calculateAnnualSavings(systemSizekW, utilityRate, state) {
    // Annual production (kWh) = systemSize * sun hours * 365 * efficiency
    const sunHoursByState = {
      TX: 5.3,
      AZ: 6.5, // Best in US
      CA: 5.8,
      FL: 5.2,
      NV: 6.2,
      NM: 6.4,
      GA: 5.0,
      NC: 4.9,
      SC: 5.1,
    };

    const sunHours = sunHoursByState[state] || 5.0;
    const systemEfficiency = 0.8; // Accounting for losses

    const annualProduction = systemSizekW * sunHours * 365 * systemEfficiency;
    const annualSavings = annualProduction * utilityRate;

    return annualSavings;
  }

  /**
   * Calculate lifetime value with utility rate escalation
   */
  calculateLifetimeValue(annualSavings, utilityRate, years) {
    const rateEscalation = 0.03; // 3% annual rate increase
    let totalValue = 0;

    for (let year = 1; year <= years; year++) {
      const yearSavings =
        annualSavings * Math.pow(1 + rateEscalation, year - 1);
      totalValue += yearSavings;
    }

    return totalValue;
  }

  /**
   * Enrich leads with ROI calculations
   */
  async enrichLeads(batchSize = 50) {
    console.log("💰 Calculating solar ROI for leads...");

    const snapshot = await this.db
      .collection("commercial_leads")
      .where("utilityRate", "!=", null)
      .where("solarROI", "==", null)
      .limit(batchSize)
      .get();

    let enriched = 0;

    for (const doc of snapshot.docs) {
      const lead = doc.data();

      try {
        const roiData = await this.calculateROI(lead);

        await doc.ref.update({
          solarROI: roiData,
          roi: roiData.roi,
          paybackYears: roiData.paybackYears,
          estimatedSolarCost: roiData.installationCost,
          estimatedAnnualSavings: roiData.annualSavings,
          systemSize: roiData.systemSize,
          updatedAt: new Date().toISOString(),
        });

        enriched++;

        if (enriched % 10 === 0) {
          console.log(
            `   ✓ Calculated ROI for ${enriched}/${snapshot.size} leads`,
          );
        }
      } catch (error) {
        console.error(
          `   ❌ Error calculating ROI for lead ${lead.id}:`,
          error.message,
        );
      }
    }

    console.log(`✅ Calculated ROI for ${enriched} leads`);
    return enriched;
  }

  /**
   * Get ROI statistics
   */
  async getStats() {
    const snapshot = await this.db.collection("commercial_leads").get();
    const leads = snapshot.docs.map((doc) => doc.data());
    const enrichedLeads = leads.filter((l) => l.solarROI);

    if (enrichedLeads.length === 0) {
      return { total: leads.length, enriched: 0 };
    }

    const stats = {
      total: leads.length,
      enriched: enrichedLeads.length,
      avgSystemSize: 0,
      totalSystemSize: 0,
      avgInstallationCost: 0,
      totalInstallationCost: 0,
      avgAnnualSavings: 0,
      totalAnnualSavings: 0,
      avgPayback: 0,
      avgROI: 0,
      totalMarketValue: 0,
      byState: {},
    };

    enrichedLeads.forEach((lead) => {
      stats.totalSystemSize += lead.solarROI.systemSize;
      stats.totalInstallationCost += lead.solarROI.installationCost;
      stats.totalAnnualSavings += lead.solarROI.annualSavings;
      stats.avgPayback += lead.solarROI.paybackYears;
      stats.avgROI += lead.solarROI.roi;
      stats.totalMarketValue += lead.solarROI.lifetimeValue;

      // By state
      if (!stats.byState[lead.state]) {
        stats.byState[lead.state] = {
          count: 0,
          totalSystemSize: 0,
          totalValue: 0,
        };
      }
      stats.byState[lead.state].count++;
      stats.byState[lead.state].totalSystemSize += lead.solarROI.systemSize;
      stats.byState[lead.state].totalValue += lead.solarROI.installationCost;
    });

    stats.avgSystemSize = Math.floor(
      stats.totalSystemSize / enrichedLeads.length,
    );
    stats.avgInstallationCost = Math.floor(
      stats.totalInstallationCost / enrichedLeads.length,
    );
    stats.avgAnnualSavings = Math.floor(
      stats.totalAnnualSavings / enrichedLeads.length,
    );
    stats.avgPayback = parseFloat(
      (stats.avgPayback / enrichedLeads.length).toFixed(1),
    );
    stats.avgROI = parseFloat((stats.avgROI / enrichedLeads.length).toFixed(1));

    return stats;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const calculator = new ROICalculator();

  if (args.includes("--enrich")) {
    const batchSize = parseInt(args[args.indexOf("--batch-size") + 1]) || 50;
    await calculator.enrichLeads(batchSize);
  } else if (args.includes("--stats")) {
    const stats = await calculator.getStats();
    console.log("\n📊 ROI Statistics:");
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log("Usage:");
    console.log("  node roi-calculator.js --enrich [--batch-size 50]");
    console.log("  node roi-calculator.js --stats");
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ROICalculator;
