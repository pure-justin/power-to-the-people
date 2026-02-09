"use strict";
/**
 * Solar Financial Modeling Engine
 *
 * Comprehensive financial calculator for solar proposals. Provides
 * accurate 25-year projections for all financing options:
 *   - Cash purchase
 *   - Loan financing
 *   - Lease (Third Party Ownership)
 *   - PPA (Power Purchase Agreement)
 *
 * Also calculates:
 *   - System sizing from energy usage
 *   - Production estimates with degradation
 *   - SREC/REC market value
 *   - Tax benefits (ITC base + adders)
 *   - Side-by-side financing comparison
 *
 * 2026 Regulatory Context:
 *   - Residential 25D ITC expired Jan 1, 2026
 *   - Commercial 48E ITC: 30% base (+ adders up to 70%)
 *   - TPO (lease/PPA) claims commercial ITC on behalf of homeowner
 *   - Net metering transitioning to net billing in many states
 *   - Massive tariffs on SE Asian panels (up to 3,400% AD/CVD)
 *
 * Exported as both internal utilities and Firebase callable functions.
 *
 * @module financialEngine
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSolarTaxBenefits = exports.calculateSolarRECValue = exports.runFinancialAnalysis = exports.estimateSolarProduction = exports.calculateSolarSystemSize = void 0;
exports.calculateSystemSize = calculateSystemSize;
exports.estimateProduction = estimateProduction;
exports.analyzeCashPurchase = analyzeCashPurchase;
exports.analyzeLoanPurchase = analyzeLoanPurchase;
exports.analyzeTPO = analyzeTPO;
exports.generateFinancialComparison = generateFinancialComparison;
exports.calculateRECValue = calculateRECValue;
exports.calculateTaxBenefits = calculateTaxBenefits;
const functions = __importStar(require("firebase-functions/v1"));
// ============================================================================
// Constants
// ============================================================================
/** Average monthly solar irradiance factors by month (normalized, latitude-adjusted baseline) */
const MONTHLY_IRRADIANCE_FACTORS = [
    0.058, // Jan
    0.065, // Feb
    0.085, // Mar
    0.092, // Apr
    0.1, // May
    0.105, // Jun
    0.108, // Jul
    0.102, // Aug
    0.09, // Sep
    0.078, // Oct
    0.062, // Nov
    0.055, // Dec
];
/** Month names for labeling */
const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
/**
 * State SREC market data (approximate 2025-2026 prices $/MWh).
 * States without active SREC programs return 0.
 */
const SREC_MARKETS = {
    NJ: { pricePerMwh: 185, notes: "NJ SREC-II program, Class I RECs" },
    MA: { pricePerMwh: 275, notes: "MA SMART program SRECs" },
    MD: { pricePerMwh: 65, notes: "MD RPS Tier 1 solar RECs" },
    DC: { pricePerMwh: 350, notes: "DC SREC market, strong RPS mandate" },
    PA: { pricePerMwh: 35, notes: "PA Alternative Energy Credits (solar)" },
    OH: { pricePerMwh: 8, notes: "OH S-RECs, oversupplied market" },
    IL: { pricePerMwh: 75, notes: "IL Adjustable Block Program RECs" },
    VA: { pricePerMwh: 25, notes: "VA Clean Economy Act RECs" },
    DE: { pricePerMwh: 20, notes: "DE SREC program" },
};
/**
 * State tax credit rates (2026).
 * Partial list of states with active solar tax credits.
 */
const STATE_TAX_CREDITS = {
    AZ: {
        rate: 0.25,
        maxAmount: 1000,
        notes: "25% of cost, max $1,000 residential",
    },
    HI: {
        rate: 0.35,
        maxAmount: 5000,
        notes: "35% of cost, max $5,000 residential",
    },
    IA: {
        rate: 0.15,
        maxAmount: 5000,
        notes: "15% of cost, max $5,000 residential",
    },
    MA: {
        rate: 0.15,
        maxAmount: 1000,
        notes: "15% of cost, max $1,000 residential",
    },
    MD: {
        rate: 0.0,
        maxAmount: 1000,
        notes: "$1,000 flat grant (property tax exemption separate)",
    },
    MN: {
        rate: 0.0,
        maxAmount: 0,
        notes: "Solar energy exemption from property tax",
    },
    MT: {
        rate: 0.0,
        maxAmount: 1000,
        notes: "Alternative energy system credit up to $1,000",
    },
    NM: {
        rate: 0.1,
        maxAmount: 6000,
        notes: "10% of cost, max $6,000 (2024 extension)",
    },
    NY: {
        rate: 0.25,
        maxAmount: 5000,
        notes: "25% of cost, max $5,000 residential",
    },
    OR: {
        rate: 0.0,
        maxAmount: 5000,
        notes: "Solar + Storage Rebate program, up to $5,000",
    },
    RI: {
        rate: 0.0,
        maxAmount: 7000,
        notes: "Renewable Energy Fund grants up to $7,000",
    },
    SC: {
        rate: 0.25,
        maxAmount: 35000,
        notes: "25% of cost, max $35,000 (generous)",
    },
    UT: {
        rate: 0.25,
        maxAmount: 800,
        notes: "25% of cost, max $800",
    },
    VT: {
        rate: 0.0,
        maxAmount: 0,
        notes: "No state credit, but strong net metering",
    },
};
// ============================================================================
// Core Calculation Functions
// ============================================================================
/**
 * Calculate optimal system size based on energy usage and site conditions.
 *
 * Applies azimuth, tilt, and shading derate factors to the NREL location
 * factor to determine how many kW and panels are needed to hit the
 * customer's target offset percentage.
 */
function calculateSystemSize(params) {
    const { monthlyUsageKwh, targetOffset, panelWattage, locationFactor, roofAzimuth = 180, roofTilt = 30, shading = 0, } = params;
    // Azimuth derate: 180 = due south = 1.0. Each degree off loses ~0.2%
    const azimuthDeviation = Math.abs(roofAzimuth - 180);
    const azimuthDerateFactor = Math.max(0.6, 1 - azimuthDeviation * 0.002);
    // Tilt derate: optimal tilt ~= latitude. Flat or steep loses production.
    // Simplified model: within 15 degrees of optimal loses ~0.5% per degree
    const optimalTilt = 30; // rough US average latitude-tilt
    const tiltDeviation = Math.abs(roofTilt - optimalTilt);
    const tiltDerateFactor = Math.max(0.75, 1 - tiltDeviation * 0.005);
    // Shading derate
    const shadingDerateFactor = Math.max(0, 1 - shading);
    // Effective location factor after all derates
    const effectiveLocationFactor = locationFactor *
        azimuthDerateFactor *
        tiltDerateFactor *
        shadingDerateFactor;
    // Annual usage
    const annualUsageKwh = monthlyUsageKwh * 12;
    const targetProductionKwh = annualUsageKwh * targetOffset;
    // System size needed: kWh / (kWh/kW/yr) = kW
    const systemSizeKw = effectiveLocationFactor > 0
        ? targetProductionKwh / effectiveLocationFactor
        : 0;
    // Round up to nearest 0.25 kW
    const roundedSystemSizeKw = Math.ceil(systemSizeKw * 4) / 4;
    // Number of panels
    const panelKw = panelWattage / 1000;
    const numberOfPanels = panelKw > 0 ? Math.ceil(roundedSystemSizeKw / panelKw) : 0;
    // Actual system size based on whole panels
    const actualSystemSizeKw = numberOfPanels * panelKw;
    // Actual annual production
    const annualProductionKwh = actualSystemSizeKw * effectiveLocationFactor;
    return {
        systemSizeKw: round2(actualSystemSizeKw),
        numberOfPanels,
        annualProductionKwh: Math.round(annualProductionKwh),
        offsetPercentage: round2(annualUsageKwh > 0 ? annualProductionKwh / annualUsageKwh : 0),
        panelWattage,
        azimuthDerateFactor: round4(azimuthDerateFactor),
        tiltDerateFactor: round4(tiltDerateFactor),
        shadingDerateFactor: round4(shadingDerateFactor),
        effectiveLocationFactor: Math.round(effectiveLocationFactor),
    };
}
/**
 * Estimate monthly and annual solar production.
 *
 * Uses latitude-based solar irradiance model with monthly distribution.
 * Returns month-by-month production and capacity factor.
 */
function estimateProduction(params) {
    const { systemSizeKw, latitude, tilt, azimuth, losses } = params;
    // Base annual production estimate using latitude-derived solar resource
    // Average peak sun hours varies from ~3.5 (northern US) to ~6.5 (SW)
    const latitudeAbs = Math.abs(latitude);
    const basePeakSunHours = Math.max(3.0, Math.min(7.0, 8.5 - latitudeAbs * 0.1));
    // Azimuth correction
    const azimuthDeviation = Math.abs(azimuth - 180);
    const azimuthFactor = Math.max(0.6, 1 - azimuthDeviation * 0.002);
    // Tilt correction relative to latitude
    const optimalTilt = latitudeAbs;
    const tiltDeviation = Math.abs(tilt - optimalTilt);
    const tiltFactor = Math.max(0.75, 1 - tiltDeviation * 0.005);
    // System losses
    const lossFactor = 1 - Math.min(losses, 0.5);
    // Performance ratio (typical: 0.75–0.85)
    const performanceRatio = azimuthFactor * tiltFactor * lossFactor;
    // Annual production: kW * hours/day * 365 * performance ratio
    const annualProductionKwh = systemSizeKw * basePeakSunHours * 365 * performanceRatio;
    // Latitude affects seasonal distribution
    // Higher latitude = more summer-weighted
    const seasonalAmplitude = Math.min(0.4, latitudeAbs * 0.008);
    // Distribute across months using irradiance model
    const monthlyProduction = MONTHLY_IRRADIANCE_FACTORS.map((baseFactor, i) => {
        // Adjust for latitude-dependent seasonality
        const monthAngle = ((i - 5.5) / 6) * Math.PI; // peaks in June/July
        const seasonalAdjustment = 1 + seasonalAmplitude * Math.cos(monthAngle);
        const adjustedFactor = baseFactor * seasonalAdjustment;
        const totalFactor = MONTHLY_IRRADIANCE_FACTORS.reduce((sum, f, j) => {
            const mAngle = ((j - 5.5) / 6) * Math.PI;
            return sum + f * (1 + seasonalAmplitude * Math.cos(mAngle));
        }, 0);
        const monthFraction = adjustedFactor / totalFactor;
        const productionKwh = annualProductionKwh * monthFraction;
        // Solar resource in kWh/m2/day for this month
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i];
        const solarResourceKwhPerM2PerDay = systemSizeKw > 0
            ? productionKwh / (systemSizeKw * daysInMonth * performanceRatio)
            : 0;
        return {
            month: i + 1,
            monthName: MONTH_NAMES[i],
            productionKwh: Math.round(productionKwh),
            solarResourceKwhPerM2PerDay: round2(solarResourceKwhPerM2PerDay),
        };
    });
    // Capacity factor: actual production / theoretical max
    const theoreticalMax = systemSizeKw * 8760; // kW * hours in year
    const capacityFactor = theoreticalMax > 0 ? annualProductionKwh / theoreticalMax : 0;
    return {
        annualProductionKwh: Math.round(annualProductionKwh),
        monthlyProduction,
        systemSizeKw,
        capacityFactor: round4(capacityFactor),
        performanceRatio: round4(performanceRatio),
    };
}
/**
 * Financial analysis for a CASH purchase.
 *
 * Calculates payback period, 25-year ROI, IRR, NPV, LCOE, and
 * year-by-year projections including degradation, rate escalation,
 * maintenance, and inverter replacement.
 */
function analyzeCashPurchase(params) {
    const { systemCostTotal, annualProductionKwh, utilityRatePerKwh, annualUsageKwh, rateEscalation = 0.03, federalITC = 0, stateIncentive = 0, utilityIncentive = 0, netMeteringRate, degradationRate = 0.005, maintenanceCostAnnual = 0, inverterReplacementYear = 15, inverterReplacementCost = 0, discountRate = 0.05, analysisYears = 25, } = params;
    const federalITCAmount = systemCostTotal * federalITC;
    const netSystemCost = systemCostTotal - federalITCAmount - stateIncentive - utilityIncentive;
    const yearlyProjections = [];
    let cumulativeSavings = 0;
    let cumulativeCashFlow = -netSystemCost; // initial outlay
    let simplePaybackYears = analysisYears; // default to end if never reached
    let paybackFound = false;
    const cashFlows = [-netSystemCost]; // for IRR calculation
    let totalProductionKwh = 0;
    let totalCostOfEnergy = netSystemCost; // for LCOE
    for (let year = 1; year <= analysisYears; year++) {
        // Degraded production
        const degradedProduction = annualProductionKwh * Math.pow(1 - degradationRate, year - 1);
        // Escalated utility rate
        const currentUtilityRate = utilityRatePerKwh * Math.pow(1 + rateEscalation, year - 1);
        // Energy cost without solar
        const energyCostWithoutSolar = annualUsageKwh * currentUtilityRate;
        // Energy value from solar
        // Self-consumed energy saves at retail rate, exported at net metering rate
        const selfConsumedKwh = Math.min(degradedProduction, annualUsageKwh);
        const exportedKwh = Math.max(0, degradedProduction - annualUsageKwh);
        const solarValue = selfConsumedKwh * currentUtilityRate +
            exportedKwh * netMeteringRate * Math.pow(1 + rateEscalation, year - 1);
        // Remaining utility cost
        const remainingUsageKwh = Math.max(0, annualUsageKwh - degradedProduction);
        const energyCostWithSolar = remainingUsageKwh * currentUtilityRate;
        // Annual costs
        let annualCost = maintenanceCostAnnual;
        if (year === inverterReplacementYear) {
            annualCost += inverterReplacementCost;
            totalCostOfEnergy += inverterReplacementCost;
        }
        totalCostOfEnergy += maintenanceCostAnnual;
        // Net savings
        const netSavings = solarValue - annualCost;
        cumulativeSavings += netSavings;
        // Cash flow
        const cashFlow = netSavings;
        cumulativeCashFlow += cashFlow;
        cashFlows.push(cashFlow);
        totalProductionKwh += degradedProduction;
        // Simple payback
        if (!paybackFound && cumulativeCashFlow >= 0) {
            // Interpolate for fractional year
            const prevCumCashFlow = cumulativeCashFlow - cashFlow;
            simplePaybackYears =
                year - 1 + (cashFlow > 0 ? -prevCumCashFlow / cashFlow : 0);
            paybackFound = true;
        }
        yearlyProjections.push({
            year,
            annualProductionKwh: Math.round(degradedProduction),
            utilityRatePerKwh: round4(currentUtilityRate),
            energyCostWithoutSolar: round2(energyCostWithoutSolar),
            energyCostWithSolar: round2(energyCostWithSolar),
            solarValueProduced: round2(solarValue),
            netSavings: round2(netSavings),
            cumulativeSavings: round2(cumulativeSavings),
            cashFlow: round2(cashFlow),
            cumulativeCashFlow: round2(cumulativeCashFlow),
        });
    }
    const totalSavings25Year = cumulativeSavings;
    const netSavings25Year = cumulativeCashFlow;
    const roi25Year = netSystemCost > 0 ? (netSavings25Year / netSystemCost) * 100 : 0;
    // LCOE: total lifetime cost / total lifetime production
    const lcoe = totalProductionKwh > 0 ? totalCostOfEnergy / totalProductionKwh : 0;
    // IRR & NPV
    const irr = calculateIRR(cashFlows);
    const npv = calculateNPV(cashFlows, discountRate);
    return {
        financingType: "cash",
        totalSystemCost: round2(systemCostTotal),
        netSystemCost: round2(netSystemCost),
        federalITCAmount: round2(federalITCAmount),
        stateIncentiveAmount: round2(stateIncentive),
        utilityIncentiveAmount: round2(utilityIncentive),
        simplePaybackYears: round2(simplePaybackYears),
        roi25Year: round2(roi25Year),
        totalSavings25Year: round2(totalSavings25Year),
        netSavings25Year: round2(netSavings25Year),
        irr: round4(irr),
        npv: round2(npv),
        lcoe: round4(lcoe),
        yearlyProjections,
    };
}
/**
 * Financial analysis for a LOAN purchase.
 *
 * Calculates monthly payment, total interest, payback period, and
 * year-by-year projections including loan balance drawdown.
 */
function analyzeLoanPurchase(params) {
    const { systemCostTotal, downPayment, loanAmount, interestRate, loanTermYears, annualProductionKwh, utilityRatePerKwh, annualUsageKwh, rateEscalation = 0.03, federalITC = 0, stateIncentive = 0, utilityIncentive = 0, netMeteringRate, degradationRate = 0.005, maintenanceCostAnnual = 0, inverterReplacementYear = 15, inverterReplacementCost = 0, applyITCToLoan = false, discountRate = 0.05, analysisYears = 25, } = params;
    const federalITCAmount = systemCostTotal * federalITC;
    // Monthly payment calculation (standard amortization)
    const monthlyRate = interestRate / 12;
    const totalPayments = loanTermYears * 12;
    const monthlyPayment = monthlyRate > 0
        ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
            (Math.pow(1 + monthlyRate, totalPayments) - 1)
        : loanAmount / totalPayments;
    const annualPayment = monthlyPayment * 12;
    // Track loan balance
    let loanBalance = loanAmount;
    let totalInterestPaid = 0;
    // If ITC is applied to loan as lump sum (typically at end of year 1)
    let itcAppliedToLoan = false;
    const yearlyProjections = [];
    let cumulativeSavings = 0;
    let cumulativeCashFlow = -downPayment; // initial outlay is just the down payment
    let simplePaybackYears = analysisYears;
    let paybackFound = false;
    const cashFlows = [-downPayment];
    for (let year = 1; year <= analysisYears; year++) {
        // Degraded production
        const degradedProduction = annualProductionKwh * Math.pow(1 - degradationRate, year - 1);
        // Escalated utility rate
        const currentUtilityRate = utilityRatePerKwh * Math.pow(1 + rateEscalation, year - 1);
        // Energy costs
        const energyCostWithoutSolar = annualUsageKwh * currentUtilityRate;
        const selfConsumedKwh = Math.min(degradedProduction, annualUsageKwh);
        const exportedKwh = Math.max(0, degradedProduction - annualUsageKwh);
        const solarValue = selfConsumedKwh * currentUtilityRate +
            exportedKwh * netMeteringRate * Math.pow(1 + rateEscalation, year - 1);
        const remainingUsageKwh = Math.max(0, annualUsageKwh - degradedProduction);
        const energyCostWithSolar = remainingUsageKwh * currentUtilityRate;
        // Loan payments for this year
        let yearLoanPayment = 0;
        let yearInterest = 0;
        let yearPrincipal = 0;
        if (loanBalance > 0 && year <= loanTermYears) {
            for (let month = 0; month < 12; month++) {
                if (loanBalance <= 0)
                    break;
                const monthInterest = loanBalance * monthlyRate;
                const monthPrincipal = Math.min(monthlyPayment - monthInterest, loanBalance);
                yearInterest += monthInterest;
                yearPrincipal += monthPrincipal;
                loanBalance = Math.max(0, loanBalance - monthPrincipal);
                // Apply ITC to loan at end of month 12 of year 1
                if (applyITCToLoan && !itcAppliedToLoan && year === 1 && month === 11) {
                    loanBalance = Math.max(0, loanBalance - federalITCAmount);
                    itcAppliedToLoan = true;
                }
            }
            yearLoanPayment = yearInterest + yearPrincipal;
            totalInterestPaid += yearInterest;
        }
        // Annual costs
        let annualCost = maintenanceCostAnnual + yearLoanPayment;
        if (year === inverterReplacementYear) {
            annualCost += inverterReplacementCost;
        }
        // Net savings (solar value minus all costs)
        const netSavings = solarValue -
            maintenanceCostAnnual -
            (year === inverterReplacementYear ? inverterReplacementCost : 0);
        cumulativeSavings += netSavings;
        // Cash flow includes loan payments
        let cashFlow = solarValue - annualCost;
        // ITC received in year 1 (if not applied to loan)
        if (year === 1 && !applyITCToLoan) {
            cashFlow += federalITCAmount + stateIncentive + utilityIncentive;
        }
        else if (year === 1) {
            cashFlow += stateIncentive + utilityIncentive;
        }
        cumulativeCashFlow += cashFlow;
        cashFlows.push(cashFlow);
        // Simple payback
        if (!paybackFound && cumulativeCashFlow >= 0) {
            const prevCumCashFlow = cumulativeCashFlow - cashFlow;
            simplePaybackYears =
                year - 1 + (cashFlow > 0 ? -prevCumCashFlow / cashFlow : 0);
            paybackFound = true;
        }
        yearlyProjections.push({
            year,
            annualProductionKwh: Math.round(degradedProduction),
            utilityRatePerKwh: round4(currentUtilityRate),
            energyCostWithoutSolar: round2(energyCostWithoutSolar),
            energyCostWithSolar: round2(energyCostWithSolar),
            solarValueProduced: round2(solarValue),
            netSavings: round2(netSavings),
            cumulativeSavings: round2(cumulativeSavings),
            cashFlow: round2(cashFlow),
            cumulativeCashFlow: round2(cumulativeCashFlow),
            loanBalanceRemaining: round2(loanBalance),
            loanPayment: round2(yearLoanPayment),
        });
    }
    const totalLoanCost = loanAmount + totalInterestPaid;
    // Net cost after all incentives
    const netCostAfterIncentives = downPayment +
        totalLoanCost -
        federalITCAmount -
        stateIncentive -
        utilityIncentive;
    const totalSavings25Year = cumulativeSavings;
    const netSavings25Year = cumulativeCashFlow;
    // Month-one economics
    const monthOneSavings = (annualProductionKwh / 12) * utilityRatePerKwh - maintenanceCostAnnual / 12;
    const dayOneSavings = monthOneSavings > monthlyPayment;
    // IRR & NPV
    const irr = calculateIRR(cashFlows);
    const npv = calculateNPV(cashFlows, discountRate);
    return {
        financingType: "loan",
        totalSystemCost: round2(systemCostTotal),
        downPayment: round2(downPayment),
        loanAmount: round2(loanAmount),
        interestRate: round4(interestRate),
        loanTermYears,
        monthlyPayment: round2(monthlyPayment),
        totalInterestPaid: round2(totalInterestPaid),
        totalLoanCost: round2(totalLoanCost),
        federalITCAmount: round2(federalITCAmount),
        stateIncentiveAmount: round2(stateIncentive),
        utilityIncentiveAmount: round2(utilityIncentive),
        netCostAfterIncentives: round2(netCostAfterIncentives),
        simplePaybackYears: round2(simplePaybackYears),
        totalSavings25Year: round2(totalSavings25Year),
        netSavings25Year: round2(netSavings25Year),
        irr: round4(irr),
        npv: round2(npv),
        monthOnePayment: round2(monthlyPayment),
        monthOneSavings: round2(monthOneSavings),
        dayOneSavings,
        yearlyProjections,
    };
}
/**
 * Financial analysis for Third Party Ownership (Lease or PPA).
 *
 * Compares the TPO payment stream against the utility costs the
 * customer would have paid without solar. Returns year-by-year
 * projections and total savings over the term.
 */
function analyzeTPO(params) {
    const { tpoType, monthlyLeasePayment = 0, ppaRatePerKwh = 0, escalationRate, termYears, annualProductionKwh, utilityRatePerKwh, annualUsageKwh, rateEscalation, degradationRate = 0.005, buyoutOption = null, analysisYears = 25, } = params;
    const yearlyProjections = [];
    let cumulativeSavings = 0;
    let cumulativeCashFlow = 0; // no upfront cost
    let totalTPOPayments = 0;
    let totalUtilityCostWithoutSolar = 0;
    let breakEvenYear = null;
    for (let year = 1; year <= analysisYears; year++) {
        // Degraded production
        const degradedProduction = annualProductionKwh * Math.pow(1 - degradationRate, year - 1);
        // Escalated utility rate
        const currentUtilityRate = utilityRatePerKwh * Math.pow(1 + rateEscalation, year - 1);
        // Energy cost without solar
        const energyCostWithoutSolar = annualUsageKwh * currentUtilityRate;
        totalUtilityCostWithoutSolar += energyCostWithoutSolar;
        // TPO payment for this year
        let annualTPOPayment = 0;
        if (year <= termYears) {
            if (tpoType === "lease") {
                const currentMonthlyLease = monthlyLeasePayment * Math.pow(1 + escalationRate, year - 1);
                annualTPOPayment = currentMonthlyLease * 12;
            }
            else {
                // PPA: pay per kWh produced
                const currentPPARate = ppaRatePerKwh * Math.pow(1 + escalationRate, year - 1);
                annualTPOPayment = degradedProduction * currentPPARate;
            }
        }
        // After term ends, no more TPO payments (customer keeps system or it's removed)
        totalTPOPayments += annualTPOPayment;
        // Energy cost with solar = remaining grid usage + TPO payment
        const solarCoveredKwh = Math.min(degradedProduction, annualUsageKwh);
        const remainingGridKwh = Math.max(0, annualUsageKwh - degradedProduction);
        const energyCostWithSolar = remainingGridKwh * currentUtilityRate + annualTPOPayment;
        // Net savings
        const netSavings = energyCostWithoutSolar - energyCostWithSolar;
        cumulativeSavings += netSavings;
        // Cash flow
        const cashFlow = netSavings;
        cumulativeCashFlow += cashFlow;
        // Break-even year
        if (breakEvenYear === null && cumulativeSavings > 0) {
            breakEvenYear = year;
        }
        const monthlyTPOPayment = annualTPOPayment / 12;
        yearlyProjections.push({
            year,
            annualProductionKwh: Math.round(degradedProduction),
            utilityRatePerKwh: round4(currentUtilityRate),
            energyCostWithoutSolar: round2(energyCostWithoutSolar),
            energyCostWithSolar: round2(energyCostWithSolar),
            solarValueProduced: round2(solarCoveredKwh * currentUtilityRate),
            netSavings: round2(netSavings),
            cumulativeSavings: round2(cumulativeSavings),
            cashFlow: round2(cashFlow),
            cumulativeCashFlow: round2(cumulativeCashFlow),
            leasePayment: tpoType === "lease" ? round2(annualTPOPayment) : undefined,
            ppaPayment: tpoType === "ppa" ? round2(annualTPOPayment) : undefined,
        });
    }
    // Monthly payment in year 1 and year 25
    const monthlyPaymentYear1 = tpoType === "lease"
        ? monthlyLeasePayment
        : (annualProductionKwh * ppaRatePerKwh) / 12;
    const monthlyPaymentYear25 = tpoType === "lease"
        ? monthlyLeasePayment * Math.pow(1 + escalationRate, 24)
        : (annualProductionKwh *
            Math.pow(1 - degradationRate, 24) *
            ppaRatePerKwh *
            Math.pow(1 + escalationRate, 24)) /
            12;
    const totalSavings = cumulativeSavings;
    const averageMonthlySavings = totalSavings / (analysisYears * 12);
    return {
        financingType: tpoType,
        monthlyPaymentYear1: round2(monthlyPaymentYear1),
        monthlyPaymentYear25: round2(monthlyPaymentYear25),
        annualEscalation: round4(escalationRate),
        termYears,
        totalTPOPayments: round2(totalTPOPayments),
        totalUtilityCostWithoutSolar: round2(totalUtilityCostWithoutSolar),
        totalSavings: round2(totalSavings),
        averageMonthlySavings: round2(averageMonthlySavings),
        breakEvenYear,
        buyoutOption,
        yearlyProjections,
    };
}
/**
 * Generate a side-by-side comparison of all financing options
 * versus doing nothing (staying on the grid).
 */
function generateFinancialComparison(params) {
    const { systemCostTotal, annualProductionKwh, annualUsageKwh, utilityRatePerKwh, rateEscalation, federalITC, stateIncentive, utilityIncentive, netMeteringRate, degradationRate, maintenanceCostAnnual, inverterReplacementYear, inverterReplacementCost, loanDownPayment, loanAmount, loanInterestRate, loanTermYears, monthlyLeasePayment, ppaRatePerKwh, tpoEscalationRate, tpoTermYears, discountRate = 0.05, analysisYears = 25, } = params;
    // Do Nothing: just pay utility bills
    const doNothingYearlyCosts = [];
    let doNothingTotal = 0;
    for (let year = 1; year <= analysisYears; year++) {
        const annualCost = annualUsageKwh *
            utilityRatePerKwh *
            Math.pow(1 + rateEscalation, year - 1);
        doNothingYearlyCosts.push(round2(annualCost));
        doNothingTotal += annualCost;
    }
    // Cash analysis
    let cashAnalysis = null;
    if (systemCostTotal > 0) {
        cashAnalysis = analyzeCashPurchase({
            systemCostTotal,
            annualProductionKwh,
            utilityRatePerKwh,
            annualUsageKwh,
            rateEscalation,
            federalITC,
            stateIncentive,
            utilityIncentive,
            netMeteringRate,
            degradationRate,
            maintenanceCostAnnual,
            inverterReplacementYear,
            inverterReplacementCost,
            discountRate,
            analysisYears,
        });
    }
    // Loan analysis
    let loanAnalysis = null;
    if (loanAmount > 0) {
        loanAnalysis = analyzeLoanPurchase({
            systemCostTotal,
            downPayment: loanDownPayment,
            loanAmount,
            interestRate: loanInterestRate,
            loanTermYears,
            annualProductionKwh,
            utilityRatePerKwh,
            annualUsageKwh,
            rateEscalation,
            federalITC,
            stateIncentive,
            utilityIncentive,
            netMeteringRate,
            degradationRate,
            maintenanceCostAnnual,
            inverterReplacementYear,
            inverterReplacementCost,
            discountRate,
            analysisYears,
        });
    }
    // Lease analysis
    let leaseAnalysis = null;
    if (monthlyLeasePayment && monthlyLeasePayment > 0) {
        leaseAnalysis = analyzeTPO({
            tpoType: "lease",
            monthlyLeasePayment,
            escalationRate: tpoEscalationRate,
            termYears: tpoTermYears,
            annualProductionKwh,
            utilityRatePerKwh,
            annualUsageKwh,
            rateEscalation,
            degradationRate,
            analysisYears,
        });
    }
    // PPA analysis
    let ppaAnalysis = null;
    if (ppaRatePerKwh && ppaRatePerKwh > 0) {
        ppaAnalysis = analyzeTPO({
            tpoType: "ppa",
            ppaRatePerKwh,
            escalationRate: tpoEscalationRate,
            termYears: tpoTermYears,
            annualProductionKwh,
            utilityRatePerKwh,
            annualUsageKwh,
            rateEscalation,
            degradationRate,
            analysisYears,
        });
    }
    // Build summary table
    const summaryTable = [];
    summaryTable.push({
        option: "Do Nothing",
        upfrontCost: 0,
        monthlyCostYear1: round2((annualUsageKwh * utilityRatePerKwh) / 12),
        totalCost25Year: round2(doNothingTotal),
        totalSavings25Year: 0,
        paybackYears: null,
    });
    if (cashAnalysis) {
        summaryTable.push({
            option: "Cash Purchase",
            upfrontCost: cashAnalysis.netSystemCost,
            monthlyCostYear1: round2(maintenanceCostAnnual / 12),
            totalCost25Year: round2(cashAnalysis.netSystemCost +
                maintenanceCostAnnual * analysisYears +
                inverterReplacementCost),
            totalSavings25Year: cashAnalysis.netSavings25Year,
            paybackYears: cashAnalysis.simplePaybackYears,
        });
    }
    if (loanAnalysis) {
        summaryTable.push({
            option: `Loan (${loanTermYears}yr @ ${(loanInterestRate * 100).toFixed(1)}%)`,
            upfrontCost: loanDownPayment,
            monthlyCostYear1: round2(loanAnalysis.monthlyPayment + maintenanceCostAnnual / 12),
            totalCost25Year: round2(loanDownPayment +
                loanAnalysis.totalLoanCost +
                maintenanceCostAnnual * analysisYears +
                inverterReplacementCost -
                loanAnalysis.federalITCAmount -
                stateIncentive -
                utilityIncentive),
            totalSavings25Year: loanAnalysis.netSavings25Year,
            paybackYears: loanAnalysis.simplePaybackYears,
        });
    }
    if (leaseAnalysis) {
        summaryTable.push({
            option: "Lease",
            upfrontCost: 0,
            monthlyCostYear1: round2(monthlyLeasePayment || 0),
            totalCost25Year: round2(leaseAnalysis.totalTPOPayments),
            totalSavings25Year: leaseAnalysis.totalSavings,
            paybackYears: leaseAnalysis.breakEvenYear,
        });
    }
    if (ppaAnalysis) {
        summaryTable.push({
            option: "PPA",
            upfrontCost: 0,
            monthlyCostYear1: round2((annualProductionKwh * (ppaRatePerKwh || 0)) / 12),
            totalCost25Year: round2(ppaAnalysis.totalTPOPayments),
            totalSavings25Year: ppaAnalysis.totalSavings,
            paybackYears: ppaAnalysis.breakEvenYear,
        });
    }
    // Generate recommendation
    let recommendation = "";
    const options = summaryTable.filter((o) => o.option !== "Do Nothing");
    if (options.length === 0) {
        recommendation = "Insufficient data to compare financing options.";
    }
    else {
        const bestSavings = options.reduce((best, current) => current.totalSavings25Year > best.totalSavings25Year ? current : best);
        const bestNoUpfront = options
            .filter((o) => o.upfrontCost === 0)
            .reduce((best, current) => !best || current.totalSavings25Year > best.totalSavings25Year
            ? current
            : best, null);
        recommendation = `Best overall savings: ${bestSavings.option} saves $${bestSavings.totalSavings25Year.toLocaleString()} over 25 years.`;
        if (bestNoUpfront && bestNoUpfront.option !== bestSavings.option) {
            recommendation += ` Best $0-down option: ${bestNoUpfront.option} saves $${bestNoUpfront.totalSavings25Year.toLocaleString()} with no upfront cost.`;
        }
    }
    return {
        doNothing: {
            totalCost25Year: round2(doNothingTotal),
            yearlyUtilityCosts: doNothingYearlyCosts,
        },
        cash: cashAnalysis,
        loan: loanAnalysis,
        lease: leaseAnalysis,
        ppa: ppaAnalysis,
        recommendation,
        summaryTable,
    };
}
/**
 * Calculate SREC / REC value for a given state and production level.
 * Uses known state SREC market prices where available.
 */
function calculateRECValue(params) {
    const { state, annualProductionKwh, srecMarketPrice } = params;
    const stateUpper = state.toUpperCase();
    const market = SREC_MARKETS[stateUpper];
    const hasSRECMarket = !!market || (srecMarketPrice !== undefined && srecMarketPrice > 0);
    const pricePerMwh = srecMarketPrice !== undefined ? srecMarketPrice : (market === null || market === void 0 ? void 0 : market.pricePerMwh) || 0;
    // 1 REC = 1 MWh = 1,000 kWh
    const annualRECs = annualProductionKwh / 1000;
    const annualRECValue = annualRECs * pricePerMwh;
    // 25-year value (conservative: assume flat pricing)
    const totalRECValue25Year = annualRECValue * 25;
    const marketNotes = (market === null || market === void 0 ? void 0 : market.notes) ||
        (hasSRECMarket
            ? "Custom SREC price provided"
            : `${stateUpper} does not have an active SREC market. Standard RECs may have minimal value ($1-5/MWh).`);
    return {
        state: stateUpper,
        hasSRECMarket,
        srecPricePerMwh: round2(pricePerMwh),
        annualRECs: round2(annualRECs),
        annualRECValue: round2(annualRECValue),
        totalRECValue25Year: round2(totalRECValue25Year),
        marketNotes,
    };
}
/**
 * Calculate federal and state tax benefits for a solar installation.
 *
 * 2026 context:
 * - Residential 25D ITC: EXPIRED (0%)
 * - Commercial 48E ITC: 30% base (6% if < prevailing wage & > 1MW)
 * - Adders: domestic content (+10%), energy community (+10%),
 *   low-income (+10-20%)
 * - TPO (lease/PPA) qualifies for commercial ITC even on residential roofs
 */
function calculateTaxBenefits(params) {
    const { systemCost, isResidential, domesticContentBonus, energyCommunityBonus, lowIncomeBonus, prevailingWage, state, } = params;
    const notes = [];
    // Federal ITC base rate
    let federalITCBaseRate = 0;
    if (!isResidential) {
        // Commercial: 30% base (or 6% if no prevailing wage for > 1MW)
        federalITCBaseRate = prevailingWage ? 0.3 : 0.06;
        if (!prevailingWage) {
            notes.push("Without prevailing wage compliance, ITC drops to 6% base for systems > 1MW.");
        }
    }
    else {
        // Residential: ITC expired Jan 1, 2026
        notes.push("Residential ITC (Section 25D) expired January 1, 2026. " +
            "Consider lease/PPA to access commercial ITC via TPO.");
    }
    // Adders (only apply to commercial / TPO)
    let domesticContentAdder = 0;
    let energyCommunityAdder = 0;
    let lowIncomeAdder = 0;
    if (!isResidential || federalITCBaseRate > 0) {
        if (domesticContentBonus) {
            domesticContentAdder = prevailingWage ? 0.1 : 0.02;
            notes.push(`Domestic content adder: +${(domesticContentAdder * 100).toFixed(0)}% ` +
                "(requires 50%+ US manufactured content).");
        }
        if (energyCommunityBonus) {
            energyCommunityAdder = prevailingWage ? 0.1 : 0.02;
            notes.push(`Energy community adder: +${(energyCommunityAdder * 100).toFixed(0)}% ` +
                "(project located in qualifying energy community).");
        }
        if (lowIncomeBonus) {
            lowIncomeAdder = prevailingWage ? 0.2 : 0.04;
            notes.push(`Low-income community adder: +${(lowIncomeAdder * 100).toFixed(0)}% ` +
                "(qualifying low-income / environmental justice community).");
        }
    }
    const federalITCRate = federalITCBaseRate +
        domesticContentAdder +
        energyCommunityAdder +
        lowIncomeAdder;
    const federalITCAmount = systemCost * federalITCRate;
    // State tax credits
    const stateUpper = state.toUpperCase();
    const stateCredit = STATE_TAX_CREDITS[stateUpper];
    let stateTaxCreditRate = 0;
    let stateTaxCreditAmount = 0;
    if (stateCredit) {
        if (stateCredit.rate > 0) {
            stateTaxCreditRate = stateCredit.rate;
            stateTaxCreditAmount = Math.min(systemCost * stateCredit.rate, stateCredit.maxAmount);
            notes.push(`${stateUpper} state tax credit: ${stateCredit.notes}`);
        }
        else if (stateCredit.maxAmount > 0) {
            stateTaxCreditAmount = stateCredit.maxAmount;
            notes.push(`${stateUpper}: ${stateCredit.notes}`);
        }
        else {
            notes.push(`${stateUpper}: ${stateCredit.notes}`);
        }
    }
    else {
        notes.push(`${stateUpper}: No specific state solar tax credit found. ` +
            "Check for local utility rebates and property tax exemptions.");
    }
    const totalTaxBenefits = federalITCAmount + stateTaxCreditAmount;
    return {
        federalITCRate: round4(federalITCRate),
        federalITCBaseRate: round4(federalITCBaseRate),
        domesticContentAdder: round4(domesticContentAdder),
        energyCommunityAdder: round4(energyCommunityAdder),
        lowIncomeAdder: round4(lowIncomeAdder),
        federalITCAmount: round2(federalITCAmount),
        stateTaxCreditRate: round4(stateTaxCreditRate),
        stateTaxCreditAmount: round2(stateTaxCreditAmount),
        totalTaxBenefits: round2(totalTaxBenefits),
        isResidential,
        notes,
    };
}
// ============================================================================
// Financial Math Helpers
// ============================================================================
/**
 * Calculate Internal Rate of Return (IRR) using Newton's method.
 * Cash flows array where index 0 is the initial investment (negative).
 */
function calculateIRR(cashFlows, maxIterations = 100) {
    if (cashFlows.length < 2)
        return 0;
    // Check if there is a sign change
    const hasPositive = cashFlows.some((cf) => cf > 0);
    const hasNegative = cashFlows.some((cf) => cf < 0);
    if (!hasPositive || !hasNegative)
        return 0;
    let guess = 0.1; // start with 10%
    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let derivative = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            const discountFactor = Math.pow(1 + guess, t);
            if (discountFactor === 0)
                continue;
            npv += cashFlows[t] / discountFactor;
            if (t > 0) {
                derivative -= (t * cashFlows[t]) / Math.pow(1 + guess, t + 1);
            }
        }
        if (Math.abs(derivative) < 1e-12)
            break;
        const newGuess = guess - npv / derivative;
        // Bound the guess to prevent divergence
        if (newGuess < -0.99) {
            guess = -0.99;
        }
        else if (newGuess > 10) {
            guess = 10;
        }
        else {
            guess = newGuess;
        }
        if (Math.abs(npv) < 0.01)
            break;
    }
    return guess;
}
/**
 * Calculate Net Present Value (NPV) at a given discount rate.
 */
function calculateNPV(cashFlows, discountRate) {
    return cashFlows.reduce((npv, cf, t) => {
        return npv + cf / Math.pow(1 + discountRate, t);
    }, 0);
}
/** Round to 2 decimal places */
function round2(n) {
    return Math.round(n * 100) / 100;
}
/** Round to 4 decimal places */
function round4(n) {
    return Math.round(n * 10000) / 10000;
}
// ============================================================================
// Firebase Cloud Functions (Callable)
// ============================================================================
/**
 * Calculate system size from energy usage — callable function.
 *
 * @function calculateSolarSystemSize
 * @type onCall
 * @auth firebase
 */
exports.calculateSolarSystemSize = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    const { monthlyUsageKwh, targetOffset, panelWattage, locationFactor, roofAzimuth, roofTilt, shading, } = data;
    if (!monthlyUsageKwh || !panelWattage || !locationFactor) {
        throw new functions.https.HttpsError("invalid-argument", "monthlyUsageKwh, panelWattage, and locationFactor are required.");
    }
    const result = calculateSystemSize({
        monthlyUsageKwh,
        targetOffset: targetOffset !== null && targetOffset !== void 0 ? targetOffset : 0.8,
        panelWattage,
        locationFactor,
        roofAzimuth,
        roofTilt,
        shading,
    });
    return { success: true, data: result };
});
/**
 * Estimate solar production — callable function.
 *
 * @function estimateSolarProduction
 * @type onCall
 * @auth firebase
 */
exports.estimateSolarProduction = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    const { systemSizeKw, latitude, longitude, tilt, azimuth, losses } = data;
    if (!systemSizeKw || latitude === undefined || longitude === undefined) {
        throw new functions.https.HttpsError("invalid-argument", "systemSizeKw, latitude, and longitude are required.");
    }
    const result = estimateProduction({
        systemSizeKw,
        latitude,
        longitude,
        tilt: tilt !== null && tilt !== void 0 ? tilt : 30,
        azimuth: azimuth !== null && azimuth !== void 0 ? azimuth : 180,
        losses: losses !== null && losses !== void 0 ? losses : 0.14,
    });
    return { success: true, data: result };
});
/**
 * Run full financial analysis — callable function.
 *
 * Accepts a financing type and parameters, returns the complete analysis
 * including year-by-year projections.
 *
 * @function runFinancialAnalysis
 * @type onCall
 * @auth firebase
 */
exports.runFinancialAnalysis = functions
    .runWith({ timeoutSeconds: 60, memory: "512MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    const { financingType } = data;
    if (!financingType) {
        throw new functions.https.HttpsError("invalid-argument", "financingType is required: 'cash', 'loan', 'lease', 'ppa', or 'comparison'.");
    }
    try {
        switch (financingType) {
            case "cash":
                return { success: true, data: analyzeCashPurchase(data) };
            case "loan":
                return { success: true, data: analyzeLoanPurchase(data) };
            case "lease":
                return {
                    success: true,
                    data: analyzeTPO({ ...data, tpoType: "lease" }),
                };
            case "ppa":
                return {
                    success: true,
                    data: analyzeTPO({ ...data, tpoType: "ppa" }),
                };
            case "comparison":
                return { success: true, data: generateFinancialComparison(data) };
            default:
                throw new functions.https.HttpsError("invalid-argument", `Unknown financing type: ${financingType}. Use 'cash', 'loan', 'lease', 'ppa', or 'comparison'.`);
        }
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error("Financial analysis error:", error);
        throw new functions.https.HttpsError("internal", "Financial analysis failed: " + (error.message || "Unknown error"));
    }
});
/**
 * Calculate REC/SREC value — callable function.
 *
 * @function calculateSolarRECValue
 * @type onCall
 * @auth firebase
 */
exports.calculateSolarRECValue = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    const { state, annualProductionKwh, srecMarketPrice } = data;
    if (!state || !annualProductionKwh) {
        throw new functions.https.HttpsError("invalid-argument", "state and annualProductionKwh are required.");
    }
    const result = calculateRECValue({
        state,
        annualProductionKwh,
        srecMarketPrice,
    });
    return { success: true, data: result };
});
/**
 * Calculate tax benefits — callable function.
 *
 * @function calculateSolarTaxBenefits
 * @type onCall
 * @auth firebase
 */
exports.calculateSolarTaxBenefits = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    const { systemCost, isResidential, domesticContentBonus, energyCommunityBonus, lowIncomeBonus, prevailingWage, state, } = data;
    if (!systemCost || !state) {
        throw new functions.https.HttpsError("invalid-argument", "systemCost and state are required.");
    }
    const result = calculateTaxBenefits({
        systemCost,
        isResidential: isResidential !== null && isResidential !== void 0 ? isResidential : true,
        domesticContentBonus: domesticContentBonus !== null && domesticContentBonus !== void 0 ? domesticContentBonus : false,
        energyCommunityBonus: energyCommunityBonus !== null && energyCommunityBonus !== void 0 ? energyCommunityBonus : false,
        lowIncomeBonus: lowIncomeBonus !== null && lowIncomeBonus !== void 0 ? lowIncomeBonus : false,
        prevailingWage: prevailingWage !== null && prevailingWage !== void 0 ? prevailingWage : false,
        state,
    });
    return { success: true, data: result };
});
//# sourceMappingURL=financialEngine.js.map