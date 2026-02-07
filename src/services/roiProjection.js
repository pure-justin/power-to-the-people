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

export { DEFAULTS as ROI_DEFAULTS };
