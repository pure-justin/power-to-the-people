// ROI Projection Service
// Comprehensive solar + battery financial modeling for 2026 market
// Accounts for: ITC (TPO), utility escalation, solar degradation,
// net billing, battery arbitrage, and demand charge avoidance

// ============================================
// CONSTANTS & DEFAULTS
// ============================================

const DEFAULTS = {
  // System sizing
  systemSizeKw: 8.2,
  panelCount: 20,
  panelWattage: 410,
  batteryKwh: 60,

  // Financial
  systemCostPerWatt: 3.0, // $/W installed (lease/PPA pricing)
  batteryCostAdder: 0, // Included in lease/PPA
  solarRate: 0.12, // $/kWh solar PPA rate
  solarEscalator: 0.029, // 2.9% annual escalation
  utilityRate: 0.16, // $/kWh current utility rate
  utilityEscalator: 0.035, // 3.5% annual escalation (historical avg)

  // Production
  sunshineHoursPerYear: 1800, // Texas average
  systemEfficiency: 0.8, // Real-world (inverter, wiring, soiling)
  annualDegradation: 0.008, // 0.8% per year panel degradation
  annualUsageKwh: 12000,

  // Tax & Incentives (2026 TPO/Lease model)
  itcRate: 0.3, // 30% ITC goes to TPO provider
  domesticContentBonus: 0.1, // +10% if qualifying panels
  energyCommunityBonus: 0.1, // +10% if in energy community

  // Battery value
  batteryArbitragePerDay: 2.5, // $/day from TOU arbitrage
  demandChargeAvoidance: 0, // $/month (commercial only)
  backupValuePerMonth: 25, // Insurance value of backup power

  // Loan (for purchase scenario)
  loanTermYears: 25,
  loanInterestRate: 0.065, // 6.5% APR

  projectionYears: 25,
};

// ============================================
// CORE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate annual solar production with degradation
 */
function calculateAnnualProduction(
  systemSizeKw,
  sunshineHours,
  efficiency,
  year,
  degradationRate,
) {
  const baseProdKwh = systemSizeKw * sunshineHours * efficiency;
  const degradationFactor = 1 - degradationRate * (year - 1);
  return baseProdKwh * Math.max(degradationFactor, 0.75); // Floor at 75% (warranty minimum)
}

/**
 * Calculate monthly loan payment (for purchase scenario)
 */
function calculateMonthlyPayment(principal, annualRate, termYears) {
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  if (monthlyRate === 0) return principal / numPayments;
  return (
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

/**
 * Calculate the full ROI projection over N years
 * Compares: utility-only vs lease/PPA vs purchase
 */
export function calculateROIProjection(inputs = {}) {
  const config = { ...DEFAULTS, ...inputs };

  const systemSizeKw =
    config.systemSizeKw || (config.panelCount * config.panelWattage) / 1000;

  // System cost (for purchase scenario)
  const grossSystemCost = systemSizeKw * config.systemCostPerWatt * 1000;
  const itcAmount = grossSystemCost * config.itcRate;
  const netSystemCost = grossSystemCost - itcAmount;
  const monthlyPayment = calculateMonthlyPayment(
    netSystemCost,
    config.loanInterestRate,
    config.loanTermYears,
  );

  // Battery annual value
  const batteryAnnualValue =
    config.batteryArbitragePerDay * 365 +
    config.demandChargeAvoidance * 12 +
    config.backupValuePerMonth * 12;

  // Year-by-year projection
  const yearlyData = [];
  let cumulativeUtilityCost = 0;
  let cumulativeLeaseCost = 0;
  let cumulativePurchaseCost = 0;
  let cumulativeSavingsLease = 0;
  let cumulativeSavingsPurchase = 0;
  let leasePaybackYear = null;
  let purchasePaybackYear = null;

  for (let year = 1; year <= config.projectionYears; year++) {
    // Production this year (with degradation)
    const yearlyProduction = calculateAnnualProduction(
      systemSizeKw,
      config.sunshineHoursPerYear,
      config.systemEfficiency,
      year,
      config.annualDegradation,
    );

    // Utility rate this year (escalating)
    const yearlyUtilityRate =
      config.utilityRate * Math.pow(1 + config.utilityEscalator, year - 1);

    // === SCENARIO 1: Utility Only (no solar) ===
    const utilityOnlyCost = yearlyUtilityRate * config.annualUsageKwh;
    cumulativeUtilityCost += utilityOnlyCost;

    // === SCENARIO 2: Lease/PPA ===
    const yearlySolarRate =
      config.solarRate * Math.pow(1 + config.solarEscalator, year - 1);
    const solarCost = yearlySolarRate * yearlyProduction;
    const remainingGrid = Math.max(0, config.annualUsageKwh - yearlyProduction);
    const gridCost = yearlyUtilityRate * remainingGrid;
    const leaseYearlyCost = solarCost + gridCost;
    cumulativeLeaseCost += leaseYearlyCost;

    const leaseSavings = utilityOnlyCost - leaseYearlyCost + batteryAnnualValue;
    cumulativeSavingsLease += leaseSavings;

    // === SCENARIO 3: Purchase (loan) ===
    const purchaseYearlyPayment =
      year <= config.loanTermYears ? monthlyPayment * 12 : 0;
    const purchaseGridCost = yearlyUtilityRate * remainingGrid;
    const purchaseYearlyCost = purchaseYearlyPayment + purchaseGridCost;
    cumulativePurchaseCost += purchaseYearlyCost;

    const purchaseSavings =
      utilityOnlyCost - purchaseYearlyCost + batteryAnnualValue;
    cumulativeSavingsPurchase += purchaseSavings;

    // Payback tracking
    if (!leasePaybackYear && cumulativeSavingsLease > 0) {
      leasePaybackYear = year;
    }
    if (!purchasePaybackYear && cumulativeSavingsPurchase > 0) {
      purchasePaybackYear = year;
    }

    yearlyData.push({
      year,
      // Production
      production: Math.round(yearlyProduction),
      degradationPct: Math.round(
        (1 - config.annualDegradation * (year - 1)) * 100,
      ),

      // Rates
      utilityRate: parseFloat(yearlyUtilityRate.toFixed(4)),
      solarRate: parseFloat(yearlySolarRate.toFixed(4)),

      // Utility Only
      utilityOnlyCost: Math.round(utilityOnlyCost),
      utilityCumulative: Math.round(cumulativeUtilityCost),

      // Lease/PPA
      leaseSolarCost: Math.round(solarCost),
      leaseGridCost: Math.round(gridCost),
      leaseYearlyCost: Math.round(leaseYearlyCost),
      leaseCumulative: Math.round(cumulativeLeaseCost),
      leaseSavings: Math.round(leaseSavings),
      leaseCumulativeSavings: Math.round(cumulativeSavingsLease),

      // Purchase
      purchasePayment: Math.round(purchaseYearlyPayment),
      purchaseGridCost: Math.round(purchaseGridCost),
      purchaseYearlyCost: Math.round(purchaseYearlyCost),
      purchaseCumulative: Math.round(cumulativePurchaseCost),
      purchaseSavings: Math.round(purchaseSavings),
      purchaseCumulativeSavings: Math.round(cumulativeSavingsPurchase),

      // Battery
      batteryValue: Math.round(batteryAnnualValue),
    });
  }

  // Summary metrics
  const year1 = yearlyData[0];
  const yearN = yearlyData[yearlyData.length - 1];
  const offsetPercent = Math.round(
    (year1.production / config.annualUsageKwh) * 100,
  );

  return {
    // Input summary
    system: {
      sizeKw: parseFloat(systemSizeKw.toFixed(2)),
      panelCount: config.panelCount,
      panelWattage: config.panelWattage,
      batteryKwh: config.batteryKwh,
      annualUsageKwh: config.annualUsageKwh,
      offsetPercent,
    },

    // Cost summary
    costs: {
      grossSystemCost: Math.round(grossSystemCost),
      itcAmount: Math.round(itcAmount),
      netSystemCost: Math.round(netSystemCost),
      monthlyLoanPayment: Math.round(monthlyPayment),
      currentUtilityRate: config.utilityRate,
      solarPPARate: config.solarRate,
    },

    // Key metrics
    metrics: {
      year1SavingsLease: year1.leaseSavings,
      year1SavingsPurchase: year1.purchaseSavings,
      totalSavingsLease: yearN.leaseCumulativeSavings,
      totalSavingsPurchase: yearN.purchaseCumulativeSavings,
      monthlySavingsLease: Math.round(year1.leaseSavings / 12),
      monthlySavingsPurchase: Math.round(year1.purchaseSavings / 12),
      leasePaybackYear: leasePaybackYear || 1,
      purchasePaybackYear: purchasePaybackYear || config.projectionYears,
      lifetimeUtilityCost: yearN.utilityCumulative,
      lifetimeLeaseCost: yearN.leaseCumulative,
      lifetimePurchaseCost: yearN.purchaseCumulative,
      utilityRateYear25: yearN.utilityRate,
    },

    // Environmental
    environmental: {
      lifetimeProductionKwh: yearlyData.reduce(
        (sum, y) => sum + y.production,
        0,
      ),
      co2OffsetTons: Math.round(
        (yearlyData.reduce((sum, y) => sum + y.production, 0) * 0.855) / 2000,
      ),
      treesEquivalent: Math.round(
        ((yearlyData.reduce((sum, y) => sum + y.production, 0) * 0.855) /
          2000) *
          16.5,
      ),
      carsRemoved: Math.round(
        (yearlyData.reduce((sum, y) => sum + y.production, 0) * 0.855) /
          2000 /
          4.6,
      ),
    },

    // Year-by-year data
    yearlyData,
  };
}

/**
 * Calculate quick estimate from minimal inputs
 */
export function quickEstimate(monthlyBill, utilityRate = 0.16) {
  const monthlyUsageKwh = monthlyBill / utilityRate;
  const annualUsageKwh = monthlyUsageKwh * 12;
  const systemSizeKw =
    Math.ceil(
      (annualUsageKwh /
        (DEFAULTS.sunshineHoursPerYear * DEFAULTS.systemEfficiency)) *
        10,
    ) / 10;
  const panelCount = Math.ceil((systemSizeKw * 1000) / DEFAULTS.panelWattage);

  return calculateROIProjection({
    annualUsageKwh,
    systemSizeKw,
    panelCount,
    utilityRate,
  });
}

// ============================================
// STATE-SPECIFIC UTILITY RATES (2026 averages)
// ============================================
export const STATE_UTILITY_RATES = {
  AL: 0.14,
  AK: 0.23,
  AZ: 0.13,
  AR: 0.11,
  CA: 0.3,
  CO: 0.14,
  CT: 0.27,
  DE: 0.14,
  FL: 0.14,
  GA: 0.13,
  HI: 0.43,
  ID: 0.11,
  IL: 0.16,
  IN: 0.14,
  IA: 0.14,
  KS: 0.14,
  KY: 0.12,
  LA: 0.11,
  ME: 0.22,
  MD: 0.16,
  MA: 0.28,
  MI: 0.18,
  MN: 0.14,
  MS: 0.12,
  MO: 0.13,
  MT: 0.12,
  NE: 0.12,
  NV: 0.13,
  NH: 0.23,
  NJ: 0.18,
  NM: 0.14,
  NY: 0.22,
  NC: 0.12,
  ND: 0.11,
  OH: 0.14,
  OK: 0.11,
  OR: 0.12,
  PA: 0.16,
  RI: 0.27,
  SC: 0.13,
  SD: 0.13,
  TN: 0.12,
  TX: 0.14,
  UT: 0.11,
  VT: 0.2,
  VA: 0.13,
  WA: 0.11,
  WV: 0.12,
  WI: 0.16,
  WY: 0.11,
  DC: 0.14,
};

// State sunshine hours (annual peak sun hours)
export const STATE_SUNSHINE_HOURS = {
  AL: 1700,
  AK: 1050,
  AZ: 2350,
  AR: 1700,
  CA: 2100,
  CO: 2000,
  CT: 1400,
  DE: 1500,
  FL: 1900,
  GA: 1750,
  HI: 2100,
  ID: 1750,
  IL: 1500,
  IN: 1450,
  IA: 1550,
  KS: 1800,
  KY: 1500,
  LA: 1700,
  ME: 1350,
  MD: 1550,
  MA: 1400,
  MI: 1350,
  MN: 1500,
  MS: 1700,
  MO: 1650,
  MT: 1650,
  NE: 1700,
  NV: 2300,
  NH: 1350,
  NJ: 1500,
  NM: 2350,
  NY: 1350,
  NC: 1650,
  ND: 1550,
  OH: 1400,
  OK: 1800,
  OR: 1450,
  PA: 1450,
  RI: 1400,
  SC: 1700,
  SD: 1650,
  TN: 1600,
  TX: 1800,
  UT: 2050,
  VT: 1350,
  VA: 1550,
  WA: 1250,
  WV: 1400,
  WI: 1400,
  WY: 1800,
  DC: 1550,
};

// ============================================
// ADVANCED FINANCIAL CALCULATIONS
// ============================================

/**
 * Calculate Net Present Value (NPV) of solar investment
 */
export function calculateNPV(cashFlows, discountRate = 0.06) {
  return cashFlows.reduce((npv, cf, i) => {
    return npv + cf / Math.pow(1 + discountRate, i);
  }, 0);
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton's method
 */
export function calculateIRR(
  cashFlows,
  maxIterations = 100,
  tolerance = 0.0001,
) {
  let rate = 0.1; // initial guess
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let j = 0; j < cashFlows.length; j++) {
      const factor = Math.pow(1 + rate, j);
      npv += cashFlows[j] / factor;
      if (j > 0) dnpv -= (j * cashFlows[j]) / Math.pow(1 + rate, j + 1);
    }
    if (Math.abs(npv) < tolerance) return rate;
    if (dnpv === 0) return null;
    rate = rate - npv / dnpv;
    if (rate < -0.5 || rate > 10) return null; // diverged
  }
  return rate;
}

/**
 * Calculate Levelized Cost of Energy (LCOE)
 */
export function calculateLCOE(
  totalCost,
  totalProductionKwh,
  discountRate = 0.06,
  years = 25,
) {
  let discountedCost = 0;
  let discountedProduction = 0;
  const annualCost = totalCost / years;
  const annualProduction = totalProductionKwh / years;

  for (let y = 1; y <= years; y++) {
    const factor = Math.pow(1 + discountRate, y);
    discountedCost += annualCost / factor;
    discountedProduction += annualProduction / factor;
  }
  return discountedCost / discountedProduction;
}

/**
 * Estimate home value increase from solar
 * Based on Zillow/NREL research: ~$20/kWh of annual production or ~4.1% increase
 */
export function calculateHomeValueImpact(systemSizeKw, homeValue = 300000) {
  // Based on Lawrence Berkeley National Lab research: ~$4.10/W premium
  // Capped at 10% of home value (conservative ceiling)
  const rawPremium = systemSizeKw * 1000 * 4.1; // $4.10 per watt
  const solarPremium = Math.min(rawPremium, homeValue * 0.1);
  const percentIncrease = (solarPremium / homeValue) * 100;
  return {
    valueIncrease: Math.round(solarPremium),
    percentIncrease: parseFloat(percentIncrease.toFixed(1)),
    newHomeValue: Math.round(homeValue + solarPremium),
  };
}

/**
 * Run sensitivity analysis across a range of parameter values
 */
export function runSensitivityAnalysis(baseInputs = {}, parameter, range) {
  return range.map((value) => {
    const modified = { ...baseInputs, [parameter]: value };
    const result = calculateROIProjection(modified);
    return {
      paramValue: value,
      totalSavingsLease: result.metrics.totalSavingsLease,
      totalSavingsPurchase: result.metrics.totalSavingsPurchase,
      leasePaybackYear: result.metrics.leasePaybackYear,
      purchasePaybackYear: result.metrics.purchasePaybackYear,
      monthlySavingsLease: result.metrics.monthlySavingsLease,
    };
  });
}

/**
 * Calculate full ROI with advanced metrics (wraps base calculation)
 */
export function calculateAdvancedROI(inputs = {}) {
  const base = calculateROIProjection(inputs);
  const config = { ...DEFAULTS, ...inputs };
  const systemSizeKw =
    config.systemSizeKw || (config.panelCount * config.panelWattage) / 1000;

  // Cash flows for NPV/IRR (purchase scenario)
  const grossCost = systemSizeKw * config.systemCostPerWatt * 1000;
  const itcAmount = grossCost * config.itcRate;
  const netCost = grossCost - itcAmount;

  const purchaseCashFlows = [-netCost];
  const leaseCashFlows = [0]; // no upfront for lease

  base.yearlyData.forEach((d) => {
    purchaseCashFlows.push(d.purchaseSavings);
    leaseCashFlows.push(d.leaseSavings);
  });

  const purchaseNPV = calculateNPV(purchaseCashFlows);
  const purchaseIRR = calculateIRR(purchaseCashFlows);
  const leaseNPV = calculateNPV(leaseCashFlows);

  const lifetimeProduction = base.yearlyData.reduce(
    (s, y) => s + y.production,
    0,
  );
  const leaseLCOE = calculateLCOE(
    base.metrics.lifetimeLeaseCost,
    lifetimeProduction,
  );
  const purchaseLCOE = calculateLCOE(netCost, lifetimeProduction);

  const homeImpact = calculateHomeValueImpact(
    systemSizeKw,
    inputs.homeValue || 300000,
  );

  // Annual cash flow for bar chart
  const annualCashFlow = base.yearlyData.map((d) => ({
    year: d.year,
    leaseSavings: d.leaseSavings,
    purchaseSavings: d.purchaseSavings,
    cumulativeLease: d.leaseCumulativeSavings,
    cumulativePurchase: d.purchaseCumulativeSavings,
  }));

  // Sensitivity data: utility escalation rates
  const sensitivityUtilityEsc = runSensitivityAnalysis(
    {
      ...config,
      annualUsageKwh:
        config.annualUsageKwh ||
        ((inputs.monthlyBill || 200) / config.utilityRate) * 12,
    },
    "utilityEscalator",
    [0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05],
  );

  return {
    ...base,
    advanced: {
      purchaseNPV: Math.round(purchaseNPV),
      purchaseIRR: purchaseIRR
        ? parseFloat((purchaseIRR * 100).toFixed(1))
        : null,
      leaseNPV: Math.round(leaseNPV),
      leaseLCOE: parseFloat(leaseLCOE.toFixed(3)),
      purchaseLCOE: parseFloat(purchaseLCOE.toFixed(3)),
      homeValueImpact: homeImpact,
      annualCashFlow,
      sensitivityUtilityEsc,
      lifetimeProductionMwh: parseFloat((lifetimeProduction / 1000).toFixed(1)),
      costPerWatt: config.systemCostPerWatt,
      grossSystemCost: Math.round(grossCost),
      netSystemCost: Math.round(netCost),
    },
  };
}

export { DEFAULTS as ROI_DEFAULTS };
