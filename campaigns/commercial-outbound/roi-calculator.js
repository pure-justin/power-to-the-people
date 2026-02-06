/**
 * Commercial Solar ROI Calculator
 * Calculates personalized financial projections for commercial properties
 */

export class CommercialSolarROI {
  constructor(options = {}) {
    // Federal Investment Tax Credit (ITC)
    this.federalITC = options.federalITC || 0.3; // 30% through 2032

    // Cost assumptions ($ per watt)
    this.baseCostPerWatt = options.baseCostPerWatt || 2.5; // Commercial average
    this.installationCostPerWatt = options.installationCostPerWatt || 0.5;

    // Financial assumptions
    this.annualDegradation = options.annualDegradation || 0.005; // 0.5% per year
    this.utilityInflation = options.utilityInflation || 0.03; // 3% per year
    this.discountRate = options.discountRate || 0.06; // 6% discount rate

    // System specifications
    this.systemEfficiency = options.systemEfficiency || 0.85;
  }

  /**
   * Calculate complete ROI for a commercial property
   */
  calculateROI(property) {
    const {
      solarCapacity, // kW
      annualProduction, // kWh
      avgElectricRate, // $/kWh
      squareFootage,
      buildingType,
      location,
    } = property;

    // Estimate annual usage if not provided
    const estimatedUsage =
      property.estimatedAnnualUsage ||
      this.estimateCommercialUsage(squareFootage, buildingType);

    // System sizing (don't oversize)
    const optimalCapacity = Math.min(
      solarCapacity,
      estimatedUsage / 1500, // Assume 1500 sun hours
    );

    // Calculate costs
    const systemCost = this.calculateSystemCost(optimalCapacity);
    const federalTaxCredit = systemCost * this.federalITC;
    const stateTaxCredit = this.calculateStateTaxCredit(
      systemCost,
      location?.state,
    );
    const acceleratedDepreciation = this.calculateMACRS(
      systemCost,
      federalTaxCredit,
      stateTaxCredit,
    );

    // Net cost after incentives
    const netCost =
      systemCost - federalTaxCredit - stateTaxCredit - acceleratedDepreciation;

    // Calculate savings
    const firstYearProduction =
      annualProduction || optimalCapacity * 1500 * this.systemEfficiency;
    const firstYearSavings = firstYearProduction * avgElectricRate;

    // 25-year projections
    const projections = this.calculate25YearProjections({
      firstYearProduction,
      avgElectricRate,
      netCost,
    });

    // Simple payback
    const simplePayback = netCost / firstYearSavings;

    // Return on investment
    const roi25Year = ((projections.totalSavings - netCost) / netCost) * 100;

    return {
      // System details
      systemSize: optimalCapacity,
      annualProduction: firstYearProduction,
      estimatedAnnualUsage: estimatedUsage,
      offsetPercentage: Math.min(
        (firstYearProduction / estimatedUsage) * 100,
        100,
      ),

      // Costs
      systemCost,
      federalTaxCredit,
      stateTaxCredit,
      acceleratedDepreciation,
      netCost,

      // Savings
      firstYearSavings,
      annualSavings: firstYearSavings, // Alias for compatibility

      // ROI Metrics
      simplePayback,
      roi25Year,
      npv25Year: projections.npv,
      totalSavings25Year: projections.totalSavings,
      totalCashFlow25Year: projections.totalSavings - netCost,

      // Year-by-year breakdown
      yearlyProjections: projections.yearly,
    };
  }

  /**
   * Estimate annual commercial usage based on building type and size
   */
  estimateCommercialUsage(squareFootage, buildingType) {
    // Annual kWh per sq ft by building type
    const usageRates = {
      office: 15, // 15 kWh/sq ft/year
      retail: 18,
      warehouse: 8,
      industrial: 20,
      multifamily: 12,
      mixed_use: 14,
    };

    const rate = usageRates[buildingType?.toLowerCase()] || 15;
    return squareFootage * rate;
  }

  /**
   * Calculate total system cost
   */
  calculateSystemCost(capacityKw) {
    const totalCostPerWatt =
      this.baseCostPerWatt + this.installationCostPerWatt;

    // Volume discounts for larger systems
    let discount = 1.0;
    if (capacityKw > 100) discount = 0.95; // 5% discount
    if (capacityKw > 250) discount = 0.9; // 10% discount
    if (capacityKw > 500) discount = 0.85; // 15% discount

    return capacityKw * 1000 * totalCostPerWatt * discount;
  }

  /**
   * Calculate state tax credits
   */
  calculateStateTaxCredit(systemCost, state) {
    const stateIncentives = {
      NY: 0.25, // 25% state tax credit
      MA: 0.15,
      NJ: 0.1,
      CA: 0.1,
      MD: 0.1,
      // Most states don't have additional credits
      default: 0,
    };

    const creditRate = stateIncentives[state] || stateIncentives.default;
    const maxCredit = state === "NY" ? 5000000 : 1000000; // State-specific caps

    return Math.min(systemCost * creditRate, maxCredit);
  }

  /**
   * Calculate MACRS depreciation benefit
   * Modified Accelerated Cost Recovery System (5-year for solar)
   */
  calculateMACRS(systemCost, federalCredit, stateCredit) {
    // Depreciable basis is reduced by 50% of federal credit
    const depreciableBasis = systemCost - federalCredit * 0.5;

    // MACRS 5-year schedule percentages
    const schedule = [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576];

    // Assume 21% corporate tax rate
    const taxRate = 0.21;

    // Calculate present value of depreciation benefits
    const depreciationBenefit = schedule.reduce((total, rate, year) => {
      const yearlyBenefit = depreciableBasis * rate * taxRate;
      // Discount to present value
      const pv = yearlyBenefit / Math.pow(1 + this.discountRate, year + 1);
      return total + pv;
    }, 0);

    return depreciationBenefit;
  }

  /**
   * Calculate 25-year financial projections
   */
  calculate25YearProjections({
    firstYearProduction,
    avgElectricRate,
    netCost,
  }) {
    const yearly = [];
    let totalSavings = 0;
    let npv = -netCost; // Start with initial investment as negative

    for (let year = 1; year <= 25; year++) {
      // Production degrades over time
      const production =
        firstYearProduction * Math.pow(1 - this.annualDegradation, year - 1);

      // Utility rates increase with inflation
      const electricRate =
        avgElectricRate * Math.pow(1 + this.utilityInflation, year - 1);

      // Annual savings
      const savings = production * electricRate;
      totalSavings += savings;

      // Net present value (discount future savings)
      const discountedSavings = savings / Math.pow(1 + this.discountRate, year);
      npv += discountedSavings;

      yearly.push({
        year,
        production: Math.round(production),
        electricRate: Number(electricRate.toFixed(4)),
        savings: Math.round(savings),
        cumulativeSavings: Math.round(totalSavings),
        npv: Math.round(npv),
      });
    }

    return {
      totalSavings: Math.round(totalSavings),
      npv: Math.round(npv),
      yearly,
    };
  }

  /**
   * Calculate qualification score (0-100)
   */
  calculateQualificationScore(property, roi) {
    let score = 0;
    const reasons = [];

    // ROI Score (0-40 points)
    if (roi.roi25Year > 200) {
      score += 40;
      reasons.push("Exceptional ROI (>200%)");
    } else if (roi.roi25Year > 150) {
      score += 35;
      reasons.push("Strong ROI (>150%)");
    } else if (roi.roi25Year > 100) {
      score += 30;
      reasons.push("Good ROI (>100%)");
    } else if (roi.roi25Year > 50) {
      score += 20;
      reasons.push("Moderate ROI (>50%)");
    } else {
      reasons.push("Low ROI (<50%)");
    }

    // Payback Period (0-30 points)
    if (roi.simplePayback < 5) {
      score += 30;
      reasons.push("Fast payback (<5 years)");
    } else if (roi.simplePayback < 7) {
      score += 25;
      reasons.push("Good payback (<7 years)");
    } else if (roi.simplePayback < 10) {
      score += 20;
      reasons.push("Moderate payback (<10 years)");
    } else if (roi.simplePayback < 15) {
      score += 10;
      reasons.push("Slow payback (<15 years)");
    } else {
      reasons.push("Very slow payback (>15 years)");
    }

    // System Size (0-15 points)
    if (roi.systemSize > 250) {
      score += 15;
      reasons.push("Large system (>250kW)");
    } else if (roi.systemSize > 100) {
      score += 12;
      reasons.push("Mid-size system (>100kW)");
    } else if (roi.systemSize > 50) {
      score += 8;
      reasons.push("Small-medium system (>50kW)");
    } else {
      score += 5;
      reasons.push("Small system (<50kW)");
    }

    // Electric Rate (0-15 points)
    if (property.avgElectricRate > 0.15) {
      score += 15;
      reasons.push("High electric rates (>$0.15/kWh)");
    } else if (property.avgElectricRate > 0.12) {
      score += 12;
      reasons.push("Above average rates (>$0.12/kWh)");
    } else if (property.avgElectricRate > 0.1) {
      score += 8;
      reasons.push("Average rates (>$0.10/kWh)");
    } else {
      score += 5;
      reasons.push("Low rates (<$0.10/kWh)");
    }

    return {
      score,
      reasons,
      tier: this.getQualificationTier(score),
    };
  }

  /**
   * Get qualification tier
   */
  getQualificationTier(score) {
    if (score >= 80) return "A - Excellent";
    if (score >= 65) return "B - Good";
    if (score >= 50) return "C - Fair";
    if (score >= 35) return "D - Poor";
    return "F - Not Qualified";
  }

  /**
   * Batch calculate ROI for multiple properties
   */
  batchCalculateROI(properties) {
    return properties.map((property) => {
      const roi = this.calculateROI(property);
      const qualification = this.calculateQualificationScore(property, roi);

      return {
        ...property,
        ...roi,
        qualificationScore: qualification.score,
        qualificationReasons: qualification.reasons,
        qualificationTier: qualification.tier,
      };
    });
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  import { readFile, writeFile } from "fs/promises";

  const calculator = new CommercialSolarROI();

  // Load enriched leads
  const leadsFile = process.argv[2] || "enriched-leads.json";
  const leadsData = await readFile(leadsFile, "utf-8");
  const leads = JSON.parse(leadsData);

  console.log(`📂 Loaded ${leads.length} leads from ${leadsFile}`);

  // Calculate ROI for all leads
  const leadsWithROI = calculator.batchCalculateROI(leads);

  // Filter qualified leads (score > 50)
  const qualifiedLeads = leadsWithROI.filter((l) => l.qualificationScore >= 50);

  console.log(`\n✅ ROI Calculated for ${leadsWithROI.length} leads`);
  console.log(`🎯 ${qualifiedLeads.length} qualified leads (score >= 50)`);

  // Sort by qualification score
  qualifiedLeads.sort((a, b) => b.qualificationScore - a.qualificationScore);

  // Save results
  const outputFile = `qualified-leads-${new Date().toISOString().split("T")[0]}.json`;
  await writeFile(outputFile, JSON.stringify(qualifiedLeads, null, 2));

  console.log(`💾 Saved to ${outputFile}`);

  // Print top 10
  console.log("\n🏆 Top 10 Qualified Leads:");
  qualifiedLeads.slice(0, 10).forEach((lead, i) => {
    console.log(`\n${i + 1}. ${lead.propertyName || lead.address?.street}`);
    console.log(
      `   Score: ${lead.qualificationScore}/100 (${lead.qualificationTier})`,
    );
    console.log(`   System: ${lead.systemSize?.toFixed(1)} kW`);
    console.log(`   ROI: ${lead.roi25Year?.toFixed(0)}% over 25 years`);
    console.log(`   Payback: ${lead.simplePayback?.toFixed(1)} years`);
    console.log(`   Annual Savings: $${lead.annualSavings?.toLocaleString()}`);
  });
}
