/**
 * ROI Calculator Service - Firestore Integration
 * Calculates solar ROI for commercial leads and updates Firestore
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp, cert } from "firebase-admin/app";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ROICalculatorService {
  constructor(options = {}) {
    this.db = null;

    // Federal Investment Tax Credit (ITC)
    this.federalITC = options.federalITC || 0.3; // 30% through 2032

    // Cost assumptions ($ per watt)
    this.baseCostPerWatt = options.baseCostPerWatt || 2.5;
    this.installationCostPerWatt = options.installationCostPerWatt || 0.5;

    // Financial assumptions
    this.annualDegradation = 0.005; // 0.5% per year
    this.utilityInflation = 0.03; // 3% per year
    this.discountRate = 0.06; // 6% discount rate
    this.systemEfficiency = 0.85;

    // Sun hours by state (annual average)
    this.sunHours = {
      TX: 5.5,
      AZ: 6.5,
      CA: 5.8,
      FL: 5.3,
      NV: 6.2,
      GA: 5.2,
      NC: 5.0,
      SC: 5.1,
    };

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
   * Calculate optimal system size based on building characteristics
   */
  calculateOptimalSystemSize(squareFootage, buildingType, state) {
    // Roof space utilization (varies by building type)
    const roofUtilization = {
      office: 0.6, // 60% of roof can be used
      retail: 0.7, // More flat roof space
      warehouse: 0.75, // Large flat roofs
      industrial: 0.7,
      flex: 0.65,
    };

    const utilization = roofUtilization[buildingType?.toLowerCase()] || 0.6;

    // Available roof space (assume single story for now)
    const availableRoofSqft = squareFootage * utilization;

    // Panel efficiency: 350W panels at 20 sqft each
    const panelsPerSqft = 1 / 20;
    const wattsPerPanel = 350;

    // Maximum system capacity (kW)
    const maxCapacity =
      (availableRoofSqft * panelsPerSqft * wattsPerPanel) / 1000;

    // Annual energy usage (kWh)
    const annualUsage = this.estimateAnnualUsage(squareFootage, buildingType);

    // Don't oversize - limit to 100% of annual usage
    const sunHoursPerYear = (this.sunHours[state] || 5.5) * 365;
    const capacityForUsage =
      annualUsage / sunHoursPerYear / this.systemEfficiency;

    // Return the smaller of the two
    return Math.min(maxCapacity, capacityForUsage);
  }

  /**
   * Estimate annual energy usage (kWh)
   */
  estimateAnnualUsage(squareFootage, buildingType) {
    const usageRates = {
      office: 15, // kWh/sqft/year
      retail: 18,
      warehouse: 8,
      industrial: 20,
      flex: 14,
    };

    const rate = usageRates[buildingType?.toLowerCase()] || 15;
    return squareFootage * rate;
  }

  /**
   * Calculate annual solar production (kWh)
   */
  calculateAnnualProduction(systemSizeKw, state) {
    const sunHoursPerDay = this.sunHours[state] || 5.5;
    const sunHoursPerYear = sunHoursPerDay * 365;

    return systemSizeKw * sunHoursPerYear * this.systemEfficiency;
  }

  /**
   * Calculate system cost with volume discounts
   */
  calculateSystemCost(systemSizeKw) {
    const totalCostPerWatt =
      this.baseCostPerWatt + this.installationCostPerWatt;

    // Volume discounts
    let discount = 1.0;
    if (systemSizeKw > 100) discount = 0.95; // 5% off
    if (systemSizeKw > 250) discount = 0.9; // 10% off
    if (systemSizeKw > 500) discount = 0.85; // 15% off

    return systemSizeKw * 1000 * totalCostPerWatt * discount;
  }

  /**
   * Calculate MACRS depreciation benefit (5-year schedule)
   */
  calculateMACRS(systemCost, federalCredit) {
    const depreciableBasis = systemCost - federalCredit * 0.5;
    const schedule = [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576];
    const taxRate = 0.21; // Corporate tax rate

    return schedule.reduce((total, rate, year) => {
      const yearlyBenefit = depreciableBasis * rate * taxRate;
      const pv = yearlyBenefit / Math.pow(1 + this.discountRate, year + 1);
      return total + pv;
    }, 0);
  }

  /**
   * Calculate complete ROI for a lead
   */
  calculateROI(lead) {
    const { squareFootage, buildingType, state, utilityRate } = lead;

    // System sizing
    const systemSize = this.calculateOptimalSystemSize(
      squareFootage,
      buildingType,
      state,
    );
    const annualProduction = this.calculateAnnualProduction(systemSize, state);
    const annualUsage = this.estimateAnnualUsage(squareFootage, buildingType);

    // Costs
    const systemCost = this.calculateSystemCost(systemSize);
    const federalTaxCredit = systemCost * this.federalITC;
    const acceleratedDepreciation = this.calculateMACRS(
      systemCost,
      federalTaxCredit,
    );
    const netCost = systemCost - federalTaxCredit - acceleratedDepreciation;

    // Savings
    const firstYearSavings = annualProduction * utilityRate;

    // 25-year projections
    let totalSavings = 0;
    let npv = -netCost;

    for (let year = 1; year <= 25; year++) {
      const production =
        annualProduction * Math.pow(1 - this.annualDegradation, year - 1);
      const electricRate =
        utilityRate * Math.pow(1 + this.utilityInflation, year - 1);
      const savings = production * electricRate;

      totalSavings += savings;
      npv += savings / Math.pow(1 + this.discountRate, year);
    }

    // Metrics
    const simplePayback = netCost / firstYearSavings;
    const roi25Year = ((totalSavings - netCost) / netCost) * 100;

    return {
      systemSize: Math.round(systemSize * 10) / 10,
      annualProduction: Math.round(annualProduction),
      annualUsage: Math.round(annualUsage),
      offsetPercentage: Math.min((annualProduction / annualUsage) * 100, 100),

      systemCost: Math.round(systemCost),
      federalTaxCredit: Math.round(federalTaxCredit),
      acceleratedDepreciation: Math.round(acceleratedDepreciation),
      netCost: Math.round(netCost),

      annualSavings: Math.round(firstYearSavings),
      totalSavings25Year: Math.round(totalSavings),
      npv25Year: Math.round(npv),

      simplePayback: Math.round(simplePayback * 10) / 10,
      roi25Year: Math.round(roi25Year),
    };
  }

  /**
   * Calculate lead score (0-100)
   */
  calculateLeadScore(roi, lead) {
    let score = 0;

    // ROI Score (40 points max)
    if (roi.roi25Year >= 200) score += 40;
    else if (roi.roi25Year >= 150) score += 35;
    else if (roi.roi25Year >= 100) score += 30;
    else if (roi.roi25Year >= 50) score += 20;

    // Payback Period (30 points max)
    if (roi.simplePayback < 5) score += 30;
    else if (roi.simplePayback < 7) score += 25;
    else if (roi.simplePayback < 10) score += 20;
    else if (roi.simplePayback < 15) score += 10;

    // System Size (15 points max)
    if (roi.systemSize > 250) score += 15;
    else if (roi.systemSize > 100) score += 12;
    else if (roi.systemSize > 50) score += 8;
    else score += 5;

    // Electric Rate (15 points max)
    if (lead.utilityRate > 0.15) score += 15;
    else if (lead.utilityRate > 0.12) score += 12;
    else if (lead.utilityRate > 0.1) score += 8;
    else score += 5;

    // Determine priority
    let priority;
    if (score >= 80) priority = "hot";
    else if (score >= 65) priority = "warm";
    else if (score >= 50) priority = "medium";
    else priority = "cold";

    return { score, priority };
  }

  /**
   * Enrich a single lead with ROI calculations
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

      // Check if utility data exists
      if (!lead.utilityRate) {
        console.error(`Lead ${leadId} missing utility rate data`);
        return null;
      }

      // Calculate ROI
      const roi = this.calculateROI(lead);

      // Calculate lead score
      const scoring = this.calculateLeadScore(roi, lead);

      // Update Firestore
      await leadRef.update({
        // System details
        estimatedSystemSize: roi.systemSize,
        estimatedAnnualProduction: roi.annualProduction,
        estimatedAnnualUsage: roi.annualUsage,
        solarOffsetPercentage: Math.round(roi.offsetPercentage),

        // Financial details
        estimatedSystemCost: roi.systemCost,
        federalTaxCredit: roi.federalTaxCredit,
        acceleratedDepreciation: roi.acceleratedDepreciation,
        netSystemCost: roi.netCost,

        // Savings
        estimatedAnnualSavings: roi.annualSavings,
        totalSavings25Year: roi.totalSavings25Year,
        npv25Year: roi.npv25Year,

        // ROI Metrics
        paybackPeriod: roi.simplePayback,
        roi25Year: roi.roi25Year,

        // Lead scoring
        leadScore: scoring.score,
        leadPriority: scoring.priority,

        // Tracking
        enrichedWithROI: true,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        leadId,
        ...roi,
        ...scoring,
      };
    } catch (error) {
      console.error(`Error enriching lead ${leadId}:`, error.message);
      return null;
    }
  }

  /**
   * Enrich multiple leads with ROI calculations
   */
  async enrichLeads(batchSize = 100) {
    console.log(`💰 Calculating solar ROI for leads...\n`);

    // Find leads with utility data but no ROI
    const snapshot = await this.db
      .collection("commercial_leads")
      .where("enrichedWithUtilityData", "==", true)
      .where("enrichedWithROI", "!=", true)
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
        `   Processing: ${lead.propertyName} (${lead.squareFootage.toLocaleString()} sqft)`,
      );

      const result = await this.enrichLead(doc.id);

      if (result) {
        enrichedCount++;
        console.log(
          `      ✅ System: ${result.systemSize}kW, ROI: ${result.roi25Year}%, Payback: ${result.simplePayback}y, Score: ${result.score} (${result.priority})`,
        );
      } else {
        failedCount++;
        console.log(`      ❌ Failed to calculate ROI`);
      }
    }

    console.log(`\n✅ ROI calculation complete:`);
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
   * Get ROI statistics
   */
  async getStats() {
    const snapshot = await this.db
      .collection("commercial_leads")
      .where("enrichedWithROI", "==", true)
      .get();

    if (snapshot.empty) {
      return { total: 0 };
    }

    const stats = {
      total: snapshot.size,
      byPriority: { hot: 0, warm: 0, medium: 0, cold: 0 },
      byState: {},
      avgSystemSize: 0,
      avgROI: 0,
      avgPayback: 0,
      totalSavingsPotential: 0,
    };

    let totalSystemSize = 0;
    let totalROI = 0;
    let totalPayback = 0;

    snapshot.forEach((doc) => {
      const lead = doc.data();

      // By priority
      stats.byPriority[lead.leadPriority] =
        (stats.byPriority[lead.leadPriority] || 0) + 1;

      // By state
      if (!stats.byState[lead.state]) {
        stats.byState[lead.state] = { count: 0, avgROI: 0, totalROI: 0 };
      }
      stats.byState[lead.state].count++;
      stats.byState[lead.state].totalROI += lead.roi25Year || 0;

      totalSystemSize += lead.estimatedSystemSize || 0;
      totalROI += lead.roi25Year || 0;
      totalPayback += lead.paybackPeriod || 0;
      stats.totalSavingsPotential += lead.estimatedAnnualSavings || 0;
    });

    stats.avgSystemSize = Math.round(totalSystemSize / snapshot.size);
    stats.avgROI = Math.round(totalROI / snapshot.size);
    stats.avgPayback = Math.round((totalPayback / snapshot.size) * 10) / 10;

    // Calculate state averages
    Object.keys(stats.byState).forEach((state) => {
      const stateData = stats.byState[state];
      stateData.avgROI = Math.round(stateData.totalROI / stateData.count);
      delete stateData.totalROI;
    });

    return stats;
  }

  /**
   * Get top leads by score
   */
  async getTopLeads(limit = 50) {
    const snapshot = await this.db
      .collection("commercial_leads")
      .where("enrichedWithROI", "==", true)
      .orderBy("leadScore", "desc")
      .limit(limit)
      .get();

    const leads = [];
    snapshot.forEach((doc) => {
      leads.push({ id: doc.id, ...doc.data() });
    });

    return leads;
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new ROICalculatorService();
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
      console.log("\n📊 ROI Statistics:");
      console.log(JSON.stringify(stats, null, 2));
    } else if (args.includes("--top")) {
      const limit =
        parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1]) ||
        50;
      const leads = await service.getTopLeads(limit);

      console.log(`\n🏆 Top ${leads.length} Leads:\n`);
      leads.forEach((lead, i) => {
        console.log(
          `${i + 1}. ${lead.propertyName} - ${lead.city}, ${lead.state}`,
        );
        console.log(`   Score: ${lead.leadScore} (${lead.leadPriority})`);
        console.log(`   System: ${lead.estimatedSystemSize}kW`);
        console.log(
          `   ROI: ${lead.roi25Year}% | Payback: ${lead.paybackPeriod}y`,
        );
        console.log(
          `   Annual Savings: $${lead.estimatedAnnualSavings?.toLocaleString()}\n`,
        );
      });
    } else {
      console.log(`
💰 ROI Calculator Service

Usage:
  --enrich [--batch-size=100]    Calculate ROI for leads
  --stats                         Show ROI statistics
  --top [--limit=50]              Show top leads by score

Examples:
  node roi-calculator-service.js --enrich --batch-size=50
  node roi-calculator-service.js --stats
  node roi-calculator-service.js --top --limit=20
      `);
    }

    process.exit(0);
  })();
}
