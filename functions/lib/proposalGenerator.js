"use strict";
/**
 * Solar Proposal Generator
 *
 * Generates a structured customer-facing proposal from project data
 * and financial analysis results. The output is a comprehensive JSON
 * object that the frontend renders into a polished proposal view.
 *
 * Sections:
 *   1. System Overview
 *   2. Equipment List
 *   3. Production Estimate
 *   4. Financial Analysis (Cash, Loan, TPO)
 *   5. Environmental Impact
 *   6. Project Timeline
 *   7. Warranty Summary
 *
 * Environmental impact uses EPA equivalency factors:
 *   - CO2 per kWh: 0.417 kg (US grid average, eGRID 2022)
 *   - Trees per ton CO2/year: 16.5 mature trees
 *   - Miles per ton CO2: 2,535 (average passenger vehicle)
 *   - Homes powered per MWh: 0.119 (8,400 kWh/home/year)
 *
 * Exported as both an internal utility and a Firebase callable function.
 *
 * @module proposalGenerator
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
exports.getSolarProposal = exports.generateSolarProposal = void 0;
exports.generateProposal = generateProposal;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const financialEngine_1 = require("./financialEngine");
// ============================================================================
// Constants - EPA Equivalency Factors
// ============================================================================
/** CO2 emissions per kWh of US grid electricity (kg) - EPA eGRID 2022 */
const CO2_KG_PER_KWH = 0.417;
/** Mature trees needed to absorb 1 metric ton of CO2 per year */
const TREES_PER_TON_CO2_YEAR = 16.5;
/** Average passenger vehicle miles per metric ton CO2 */
const MILES_PER_TON_CO2 = 2535;
/** Average US home annual electricity consumption (kWh) */
const AVG_HOME_KWH_PER_YEAR = 8400;
/** Gallons of gasoline per metric ton CO2 */
const GALLONS_GAS_PER_TON_CO2 = 113;
/** Smartphone charges per kWh */
const SMARTPHONE_CHARGES_PER_KWH = 86;
/** Kg of coal burned per kWh (US average) */
const COAL_KG_PER_KWH = 0.453;
// ============================================================================
// Core Proposal Generation
// ============================================================================
/**
 * Generate a complete customer-facing proposal from project data.
 *
 * This is the primary entry point. It runs all financial calculations,
 * assembles equipment lists, calculates environmental impact, builds
 * the timeline, and packages everything into a structured Proposal object.
 */
function generateProposal(input) {
    const { projectId, customerName, customerEmail, customerPhone, propertyAddress, city, state, zip, systemSizeKw, panelCount, panelWattage, panelManufacturer, panelModel, inverterManufacturer, inverterModel, inverterCount, batteryManufacturer, batteryModel, batteryCount, batteryCapacityKwh, rackingType = "Roof mount", latitude, longitude, roofTilt, roofAzimuth, shading = 0, monthlyUsageKwh, annualUsageKwh, currentMonthlyBill, utilityName, utilityRatePerKwh, netMeteringRate, rateEscalation = 0.03, systemCostTotal, costPerWatt, maintenanceCostAnnual = 150, inverterReplacementYear = 15, inverterReplacementCost = 2500, isResidential, federalITC, stateIncentive = 0, utilityIncentive = 0, domesticContentBonus = false, energyCommunityBonus = false, lowIncomeBonus = false, prevailingWage = false, loanAvailable = false, loanDownPayment = 0, loanAmount = 0, loanInterestRate = 0.065, loanTermYears = 20, leaseAvailable = false, monthlyLeasePayment = 0, leaseEscalation = 0.029, leaseTermYears = 25, ppaAvailable = false, ppaRatePerKwh = 0, ppaEscalation = 0.029, ppaTermYears = 25, feocCompliant = true, domesticContentCompliant = false, tariffSafe = true, panelWarrantyYears = 25, panelPerformanceWarrantyYears = 25, inverterWarrantyYears = 12, batteryWarrantyYears = 10, workmanshipWarrantyYears = 10, installerCompany, installerLicense, installerPhone, installerEmail, salesRepName, degradationRate = 0.005, analysisYears = 25, discountRate = 0.05, } = input;
    // ─── Production Estimate ────────────────────────────────────────────────
    const production = (0, financialEngine_1.estimateProduction)({
        systemSizeKw,
        latitude,
        longitude,
        tilt: roofTilt,
        azimuth: roofAzimuth,
        losses: 0.14,
    });
    const annualProductionKwh = production.annualProductionKwh;
    // Lifetime production with degradation
    let lifetimeProductionKwh = 0;
    for (let y = 0; y < analysisYears; y++) {
        lifetimeProductionKwh +=
            annualProductionKwh * Math.pow(1 - degradationRate, y);
    }
    const year25ProductionKwh = Math.round(annualProductionKwh * Math.pow(1 - degradationRate, 24));
    // Monthly production vs usage breakdown
    const avgMonthlyUsage = annualUsageKwh / 12;
    const monthlyProductionBreakdown = production.monthlyProduction.map((mp) => ({
        month: mp.monthName,
        productionKwh: mp.productionKwh,
        usageKwh: Math.round(avgMonthlyUsage),
        netGridKwh: mp.productionKwh - Math.round(avgMonthlyUsage),
    }));
    // ─── Tax Benefits ──────────────────────────────────────────────────────
    const taxBenefits = (0, financialEngine_1.calculateTaxBenefits)({
        systemCost: systemCostTotal,
        isResidential,
        domesticContentBonus,
        energyCommunityBonus,
        lowIncomeBonus,
        prevailingWage,
        state,
    });
    // ─── REC Value ─────────────────────────────────────────────────────────
    const recValue = (0, financialEngine_1.calculateRECValue)({
        state,
        annualProductionKwh,
    });
    // ─── Financial Analyses ────────────────────────────────────────────────
    const commonFinancialParams = {
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
    };
    // Cash analysis (always computed)
    const cashAnalysis = (0, financialEngine_1.analyzeCashPurchase)({
        systemCostTotal,
        ...commonFinancialParams,
    });
    // Loan analysis (if available)
    let loanAnalysis = null;
    if (loanAvailable && loanAmount > 0) {
        loanAnalysis = (0, financialEngine_1.analyzeLoanPurchase)({
            systemCostTotal,
            downPayment: loanDownPayment,
            loanAmount,
            interestRate: loanInterestRate,
            loanTermYears,
            ...commonFinancialParams,
        });
    }
    // Lease analysis (if available)
    let leaseAnalysis = null;
    if (leaseAvailable && monthlyLeasePayment > 0) {
        leaseAnalysis = (0, financialEngine_1.analyzeTPO)({
            tpoType: "lease",
            monthlyLeasePayment,
            escalationRate: leaseEscalation,
            termYears: leaseTermYears,
            annualProductionKwh,
            utilityRatePerKwh,
            annualUsageKwh,
            rateEscalation,
            degradationRate,
            analysisYears,
        });
    }
    // PPA analysis (if available)
    let ppaAnalysis = null;
    if (ppaAvailable && ppaRatePerKwh > 0) {
        ppaAnalysis = (0, financialEngine_1.analyzeTPO)({
            tpoType: "ppa",
            ppaRatePerKwh,
            escalationRate: ppaEscalation,
            termYears: ppaTermYears,
            annualProductionKwh,
            utilityRatePerKwh,
            annualUsageKwh,
            rateEscalation,
            degradationRate,
            analysisYears,
        });
    }
    // Full comparison (if we have at least 2 options)
    let comparison = null;
    const optionCount = 1 +
        (loanAnalysis ? 1 : 0) +
        (leaseAnalysis ? 1 : 0) +
        (ppaAnalysis ? 1 : 0);
    if (optionCount >= 2) {
        comparison = (0, financialEngine_1.generateFinancialComparison)({
            systemCostTotal,
            annualProductionKwh,
            annualUsageKwh,
            utilityRatePerKwh,
            rateEscalation,
            federalITC,
            stateIncentive,
            utilityIncentive,
            netMeteringRate,
            degradationRate,
            maintenanceCostAnnual,
            inverterReplacementYear,
            inverterReplacementCost,
            loanDownPayment,
            loanAmount: loanAvailable ? loanAmount : 0,
            loanInterestRate,
            loanTermYears,
            monthlyLeasePayment: leaseAvailable ? monthlyLeasePayment : undefined,
            ppaRatePerKwh: ppaAvailable ? ppaRatePerKwh : undefined,
            tpoEscalationRate: leaseEscalation,
            tpoTermYears: leaseTermYears,
            discountRate,
            analysisYears,
        });
    }
    // Financial recommendation
    const recommendation = (comparison === null || comparison === void 0 ? void 0 : comparison.recommendation) ||
        `Cash purchase saves $${cashAnalysis.netSavings25Year.toLocaleString()} over ${analysisYears} years with a ${cashAnalysis.simplePaybackYears.toFixed(1)}-year payback.`;
    // Financial highlights for the proposal summary
    const highlights = buildFinancialHighlights(cashAnalysis, loanAnalysis, leaseAnalysis, ppaAnalysis, annualProductionKwh, utilityRatePerKwh, currentMonthlyBill);
    // ─── Environmental Impact ──────────────────────────────────────────────
    const environmentalImpact = calculateEnvironmentalImpact(lifetimeProductionKwh, annualProductionKwh, analysisYears);
    // ─── Equipment List ────────────────────────────────────────────────────
    const equipmentItems = [
        {
            category: "Solar Panels",
            manufacturer: panelManufacturer,
            model: panelModel,
            quantity: panelCount,
            specifications: `${panelWattage}W, ${systemSizeKw.toFixed(2)} kW DC total`,
            warrantyYears: panelWarrantyYears,
            certifications: feocCompliant ? ["FEOC Compliant"] : [],
        },
        {
            category: "Inverter",
            manufacturer: inverterManufacturer,
            model: inverterModel,
            quantity: inverterCount,
            specifications: `${(systemSizeKw / inverterCount).toFixed(1)} kW capacity per unit`,
            warrantyYears: inverterWarrantyYears,
        },
    ];
    if (batteryManufacturer && batteryModel && batteryCount && batteryCount > 0) {
        equipmentItems.push({
            category: "Battery Storage",
            manufacturer: batteryManufacturer,
            model: batteryModel,
            quantity: batteryCount,
            specifications: `${batteryCapacityKwh || 0} kWh total capacity`,
            warrantyYears: batteryWarrantyYears,
        });
    }
    equipmentItems.push({
        category: "Racking & Mounting",
        manufacturer: "Included",
        model: rackingType,
        quantity: 1,
        specifications: `${rackingType} system for ${panelCount} panels`,
        warrantyYears: workmanshipWarrantyYears,
    });
    equipmentItems.push({
        category: "Electrical BOS",
        manufacturer: "Included",
        model: "Wiring, conduit, disconnects, monitoring",
        quantity: 1,
        specifications: "NEC 2023 compliant balance of system",
        warrantyYears: workmanshipWarrantyYears,
    });
    // ─── Timeline ──────────────────────────────────────────────────────────
    const timeline = buildProjectTimeline(isResidential, state);
    // ─── Warranty Summary ──────────────────────────────────────────────────
    const warrantySummary = buildWarrantySummary({
        panelManufacturer,
        panelModel,
        panelWarrantyYears,
        panelPerformanceWarrantyYears,
        inverterManufacturer,
        inverterModel,
        inverterWarrantyYears,
        batteryManufacturer,
        batteryModel,
        batteryWarrantyYears,
        batteryCount,
        workmanshipWarrantyYears,
        installerCompany,
    });
    // ─── Net cost after incentives ─────────────────────────────────────────
    const netCostAfterIncentives = systemCostTotal -
        taxBenefits.federalITCAmount -
        taxBenefits.stateTaxCreditAmount -
        utilityIncentive;
    // ─── Assemble Proposal ─────────────────────────────────────────────────
    const now = new Date();
    const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const proposalId = `PRP-${projectId.slice(0, 8)}-${now.getTime().toString(36).toUpperCase()}`;
    return {
        meta: {
            proposalId,
            projectId,
            generatedAt: now.toISOString(),
            validUntil: validUntil.toISOString(),
            version: "2.0.0",
            customerName,
            customerEmail,
            customerPhone,
            propertyAddress,
            city,
            state,
            zip,
            installerCompany,
            salesRepName,
        },
        systemOverview: {
            systemSizeKw,
            systemSizeDc: `${systemSizeKw.toFixed(2)} kW DC`,
            panelCount,
            panelType: `${panelManufacturer} ${panelModel} - ${panelWattage}W`,
            inverterType: `${inverterManufacturer} ${inverterModel}`,
            inverterCount,
            hasBattery: !!(batteryCount && batteryCount > 0),
            batteryType: batteryCount && batteryCount > 0
                ? `${batteryManufacturer} ${batteryModel}`
                : undefined,
            batteryCapacityKwh: batteryCount && batteryCount > 0 ? batteryCapacityKwh : undefined,
            batteryCount: batteryCount && batteryCount > 0 ? batteryCount : undefined,
            rackingType,
            estimatedAnnualProductionKwh: annualProductionKwh,
            estimatedOffsetPercentage: Math.round((annualProductionKwh / annualUsageKwh) * 100),
            costPerWatt,
            totalSystemCost: systemCostTotal,
            netCostAfterIncentives: Math.round(netCostAfterIncentives * 100) / 100,
            compliance: {
                feocCompliant: feocCompliant !== null && feocCompliant !== void 0 ? feocCompliant : true,
                domesticContentCompliant: domesticContentCompliant !== null && domesticContentCompliant !== void 0 ? domesticContentCompliant : false,
                tariffSafe: tariffSafe !== null && tariffSafe !== void 0 ? tariffSafe : true,
            },
        },
        equipmentList: {
            items: equipmentItems,
            totalComponents: equipmentItems.reduce((s, i) => s + i.quantity, 0),
        },
        productionEstimate: {
            annualProductionKwh,
            monthlyProduction: monthlyProductionBreakdown,
            year1ProductionKwh: annualProductionKwh,
            year25ProductionKwh,
            lifetimeProductionKwh: Math.round(lifetimeProductionKwh),
            capacityFactor: production.capacityFactor,
            performanceRatio: production.performanceRatio,
            degradationRate,
            productionGuarantee: `${panelManufacturer} guarantees at least ${((1 - degradationRate * panelPerformanceWarrantyYears) * 100).toFixed(1)}% of original output at year ${panelPerformanceWarrantyYears}.`,
        },
        financialAnalysis: {
            cash: cashAnalysis,
            loan: loanAnalysis,
            lease: leaseAnalysis,
            ppa: ppaAnalysis,
            comparison,
            taxBenefits,
            recValue,
            recommendation,
            highlights,
        },
        environmentalImpact,
        timeline,
        warrantySummary,
        disclaimers: buildDisclaimers(isResidential, state),
    };
}
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Calculate environmental impact from lifetime solar production.
 * Uses EPA equivalency factors for relatable comparisons.
 */
function calculateEnvironmentalImpact(lifetimeProductionKwh, annualProductionKwh, analysisYears) {
    const lifetimeCO2OffsetKg = lifetimeProductionKwh * CO2_KG_PER_KWH;
    const lifetimeCO2OffsetTons = lifetimeCO2OffsetKg / 1000;
    const annualCO2OffsetKg = annualProductionKwh * CO2_KG_PER_KWH;
    // Trees: need to absorb CO2 over the same period
    const annualCO2Tons = annualCO2OffsetKg / 1000;
    const equivalentTreesPlanted = Math.round(annualCO2Tons * TREES_PER_TON_CO2_YEAR);
    // Miles not driven over lifetime
    const equivalentMilesNotDriven = Math.round(lifetimeCO2OffsetTons * MILES_PER_TON_CO2);
    // Homes powered (based on annual production)
    const equivalentHomesPowered = Math.round((annualProductionKwh / AVG_HOME_KWH_PER_YEAR) * 10) / 10;
    // Gallons of gasoline saved over lifetime
    const equivalentGallonsGasoline = Math.round(lifetimeCO2OffsetTons * GALLONS_GAS_PER_TON_CO2);
    // Smartphone charges over lifetime
    const equivalentSmartphoneCharges = Math.round(lifetimeProductionKwh * SMARTPHONE_CHARGES_PER_KWH);
    // Coal not burned annually
    const annualCoalNotBurnedKg = Math.round(annualProductionKwh * COAL_KG_PER_KWH);
    // Build a human-readable impact statement
    const impactStatement = `Over ${analysisYears} years, this solar system will offset approximately ` +
        `${Math.round(lifetimeCO2OffsetTons).toLocaleString()} metric tons of CO2 emissions. ` +
        `That is equivalent to planting ${equivalentTreesPlanted.toLocaleString()} trees, ` +
        `driving ${equivalentMilesNotDriven.toLocaleString()} fewer miles, or ` +
        `powering ${equivalentHomesPowered} average homes for a year.`;
    return {
        lifetimeCO2OffsetKg: Math.round(lifetimeCO2OffsetKg),
        lifetimeCO2OffsetTons: Math.round(lifetimeCO2OffsetTons * 10) / 10,
        annualCO2OffsetKg: Math.round(annualCO2OffsetKg),
        equivalentTreesPlanted,
        equivalentMilesNotDriven,
        equivalentHomesPowered,
        equivalentGallonsGasoline,
        equivalentSmartphoneCharges,
        annualCoalNotBurnedKg,
        impactStatement,
    };
}
/**
 * Build financial highlights for the proposal summary card.
 */
function buildFinancialHighlights(cash, loan, lease, ppa, annualProductionKwh, utilityRatePerKwh, currentMonthlyBill) {
    var _a;
    const highlights = [];
    // Estimated first-year savings
    const year1Savings = ((_a = cash.yearlyProjections[0]) === null || _a === void 0 ? void 0 : _a.netSavings) || 0;
    highlights.push({
        label: "First Year Savings",
        value: `$${Math.round(year1Savings).toLocaleString()}`,
        description: "Estimated net energy savings in the first year of operation.",
    });
    // 25-year total savings (best option)
    const bestSavings = Math.max(cash.netSavings25Year, (loan === null || loan === void 0 ? void 0 : loan.netSavings25Year) || -Infinity, (lease === null || lease === void 0 ? void 0 : lease.totalSavings) || -Infinity, (ppa === null || ppa === void 0 ? void 0 : ppa.totalSavings) || -Infinity);
    highlights.push({
        label: "25-Year Net Savings",
        value: `$${Math.round(bestSavings).toLocaleString()}`,
        description: "Total estimated savings over the system lifetime (best financing option).",
    });
    // Payback period (cash)
    highlights.push({
        label: "Cash Payback Period",
        value: `${cash.simplePaybackYears.toFixed(1)} years`,
        description: "Time to recover the net investment through energy savings (cash purchase).",
    });
    // Monthly bill reduction
    const monthlyProductionValue = (annualProductionKwh / 12) * utilityRatePerKwh;
    const newMonthlyBill = Math.max(0, currentMonthlyBill - monthlyProductionValue);
    highlights.push({
        label: "New Monthly Bill",
        value: `$${Math.round(newMonthlyBill)}`,
        description: `Estimated monthly electric bill after solar (from $${Math.round(currentMonthlyBill)}).`,
    });
    // Day-one savings for loan
    if (loan) {
        highlights.push({
            label: "Loan: Day-One Savings",
            value: loan.dayOneSavings ? "Yes" : "No",
            description: loan.dayOneSavings
                ? "Monthly solar savings exceed the loan payment from day one."
                : "Monthly loan payment exceeds solar savings initially, but savings grow over time.",
        });
    }
    // TPO: no upfront cost
    if (lease || ppa) {
        const tpo = lease || ppa;
        highlights.push({
            label: `${lease ? "Lease" : "PPA"}: $0 Down`,
            value: `$${Math.round(tpo.monthlyPaymentYear1)}/mo`,
            description: `Go solar with no upfront cost. Monthly payment starts at $${Math.round(tpo.monthlyPaymentYear1)}.`,
        });
    }
    return highlights;
}
/**
 * Build the standard solar project timeline with milestones.
 */
function buildProjectTimeline(isResidential, state) {
    const milestones = [
        {
            step: 1,
            name: "Contract Signed",
            description: "Proposal accepted, contract executed, deposit collected.",
            estimatedWeeks: "0",
            status: "pending",
        },
        {
            step: 2,
            name: "Site Survey",
            description: "Detailed site assessment: roof measurements, electrical panel, shading analysis.",
            estimatedWeeks: "1-2",
            status: "pending",
        },
        {
            step: 3,
            name: "Engineering & Design",
            description: "CAD design, structural analysis, electrical single-line diagram.",
            estimatedWeeks: "1-2",
            status: "pending",
        },
        {
            step: 4,
            name: "Permitting",
            description: "Submit permit application to local AHJ (Authority Having Jurisdiction).",
            estimatedWeeks: "2-6",
            status: "pending",
        },
        {
            step: 5,
            name: "Equipment Procurement",
            description: "Order panels, inverters, racking, and electrical components.",
            estimatedWeeks: "1-3",
            status: "pending",
        },
        {
            step: 6,
            name: "Installation",
            description: "Professional installation of racking, panels, inverter, and electrical connections.",
            estimatedWeeks: "1-3",
            status: "pending",
        },
        {
            step: 7,
            name: "Inspection",
            description: "Municipal and/or county inspection of the completed installation.",
            estimatedWeeks: "1-2",
            status: "pending",
        },
        {
            step: 8,
            name: "Utility Interconnection (PTO)",
            description: "Apply for Permission to Operate from the utility company. Meter swap if needed.",
            estimatedWeeks: "2-4",
            status: "pending",
        },
        {
            step: 9,
            name: "System Activation",
            description: "System turned on, monitoring configured, customer walkthrough.",
            estimatedWeeks: "0",
            status: "pending",
        },
    ];
    // Estimate total weeks: residential is usually 8-16, commercial longer
    const totalWeeksEstimate = isResidential ? 12 : 20;
    // Estimate install date (weeks from now)
    const installDate = new Date();
    installDate.setDate(installDate.getDate() + totalWeeksEstimate * 7);
    return {
        estimatedInstallDate: installDate.toISOString().split("T")[0],
        milestones,
        totalWeeksEstimate,
    };
}
/**
 * Build warranty summary section.
 */
function buildWarrantySummary(params) {
    const items = [
        {
            component: `${params.panelManufacturer} ${params.panelModel} Panels`,
            warrantyType: "Product Warranty",
            durationYears: params.panelWarrantyYears,
            coverage: "Covers manufacturing defects, materials, and workmanship of the solar panels.",
        },
        {
            component: `${params.panelManufacturer} ${params.panelModel} Panels`,
            warrantyType: "Performance Guarantee",
            durationYears: params.panelPerformanceWarrantyYears,
            coverage: `Panels guaranteed to produce at least ${(100 - params.panelPerformanceWarrantyYears * 0.5).toFixed(1)}% of rated output at year ${params.panelPerformanceWarrantyYears}.`,
        },
        {
            component: `${params.inverterManufacturer} ${params.inverterModel} Inverter`,
            warrantyType: "Product Warranty",
            durationYears: params.inverterWarrantyYears,
            coverage: "Covers inverter replacement or repair for manufacturing defects.",
        },
    ];
    if (params.batteryManufacturer &&
        params.batteryModel &&
        params.batteryCount &&
        params.batteryCount > 0) {
        items.push({
            component: `${params.batteryManufacturer} ${params.batteryModel} Battery`,
            warrantyType: "Product Warranty",
            durationYears: params.batteryWarrantyYears,
            coverage: "Covers battery defects and guarantees minimum capacity retention.",
        });
    }
    items.push({
        component: "Installation Workmanship",
        warrantyType: "Workmanship Warranty",
        durationYears: params.workmanshipWarrantyYears,
        coverage: `${params.installerCompany || "Installer"} guarantees quality of installation, including roof penetrations, wiring, and mounting.`,
    });
    // Overall coverage string
    const maxYears = Math.max(...items.map((i) => i.durationYears));
    const overallCoverage = `Your system is protected by up to ${maxYears} years of combined manufacturer and installer warranties.`;
    return { items, overallCoverage };
}
/**
 * Build standard legal disclaimers for the proposal.
 */
function buildDisclaimers(isResidential, state) {
    const disclaimers = [
        "This proposal is an estimate based on available data and is not a guarantee of future performance or savings. Actual solar production depends on weather, equipment performance, shading, and other site-specific factors.",
        "Energy savings projections assume current utility rate structures and estimated annual rate increases. Actual utility rates may vary.",
        "Financial returns (IRR, NPV, payback) are estimates based on the assumptions stated in this proposal. Consult a tax professional for advice specific to your situation.",
        "Equipment availability and pricing are subject to change. Final pricing will be confirmed in the installation contract.",
        "Production estimates use industry-standard modeling with historical solar irradiance data. Actual production may vary by +/- 10% in any given year.",
        `This proposal is valid for 30 days from the generation date.`,
    ];
    if (isResidential) {
        disclaimers.push("As of January 1, 2026, the federal residential solar Investment Tax Credit (Section 25D) has expired. Residential homeowners purchasing systems directly are not eligible for the federal ITC. Lease and PPA arrangements may allow the third-party owner to claim the commercial ITC (Section 48E) and pass savings to the homeowner.");
    }
    disclaimers.push("Net metering policies and rates are determined by your utility company and may change. This proposal uses current published rates.");
    return disclaimers;
}
// ============================================================================
// Firebase Cloud Functions (Callable)
// ============================================================================
/**
 * Generate a full customer proposal — callable function.
 *
 * Takes a project ID, loads project data from Firestore, merges with
 * provided overrides, and generates a complete proposal.
 *
 * @function generateSolarProposal
 * @type onCall
 * @auth firebase
 */
exports.generateSolarProposal = functions
    .runWith({ timeoutSeconds: 120, memory: "512MB" })
    .https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    const { projectId } = data;
    if (!projectId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId is required.");
    }
    try {
        const db = admin.firestore();
        // Load project data from Firestore
        const projectDoc = await db.collection("projects").doc(projectId).get();
        if (!projectDoc.exists) {
            throw new functions.https.HttpsError("not-found", `Project ${projectId} not found.`);
        }
        const project = projectDoc.data();
        // Load lead data if available
        let lead = {};
        if (project.leadId) {
            const leadDoc = await db.collection("leads").doc(project.leadId).get();
            if (leadDoc.exists) {
                lead = leadDoc.data();
            }
        }
        // Load latest CAD design if available
        let design = {};
        const designSnapshot = await db
            .collection("cad_designs")
            .where("projectId", "==", projectId)
            .where("status", "==", "approved")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        if (!designSnapshot.empty) {
            design = designSnapshot.docs[0].data();
        }
        // Merge project data with overrides from the request
        // Request data takes precedence over stored data
        const input = {
            projectId,
            customerName: data.customerName ||
                lead.customerName ||
                project.customerName ||
                "Homeowner",
            customerEmail: data.customerEmail || lead.email,
            customerPhone: data.customerPhone || lead.phone,
            propertyAddress: data.propertyAddress || lead.address || project.address || "",
            city: data.city || lead.city || project.city || "",
            state: data.state || lead.state || project.state || "",
            zip: data.zip || lead.zip || project.zip || "",
            systemSizeKw: data.systemSizeKw || design.systemSizeKw || project.systemSize || 8,
            panelCount: data.panelCount || design.panelCount || 20,
            panelWattage: data.panelWattage || design.panelWattage || 400,
            panelManufacturer: data.panelManufacturer || design.panelManufacturer || "Premium Panel",
            panelModel: data.panelModel || design.panelModel || "Standard",
            inverterManufacturer: data.inverterManufacturer ||
                design.inverterManufacturer ||
                "Premium Inverter",
            inverterModel: data.inverterModel || design.inverterModel || "Standard",
            inverterCount: data.inverterCount || design.inverterCount || 1,
            batteryManufacturer: data.batteryManufacturer,
            batteryModel: data.batteryModel,
            batteryCount: data.batteryCount,
            batteryCapacityKwh: data.batteryCapacityKwh,
            rackingType: data.rackingType || "Roof mount",
            latitude: data.latitude || project.latitude || 32.0,
            longitude: data.longitude || project.longitude || -97.0,
            roofTilt: data.roofTilt || design.roofTilt || 25,
            roofAzimuth: data.roofAzimuth || design.roofAzimuth || 180,
            shading: data.shading || design.shading || 0,
            monthlyUsageKwh: data.monthlyUsageKwh ||
                project.monthlyUsageKwh ||
                lead.monthlyUsageKwh ||
                1000,
            annualUsageKwh: data.annualUsageKwh ||
                project.annualUsageKwh ||
                (data.monthlyUsageKwh ||
                    project.monthlyUsageKwh ||
                    lead.monthlyUsageKwh ||
                    1000) * 12,
            currentMonthlyBill: data.currentMonthlyBill ||
                project.monthlyBill ||
                lead.monthlyBill ||
                150,
            utilityName: data.utilityName || project.utilityName || "Local Utility",
            utilityRatePerKwh: data.utilityRatePerKwh || project.utilityRatePerKwh || 0.13,
            netMeteringRate: data.netMeteringRate ||
                project.netMeteringRate ||
                data.utilityRatePerKwh ||
                project.utilityRatePerKwh ||
                0.1,
            rateEscalation: data.rateEscalation || 0.03,
            systemCostTotal: data.systemCostTotal ||
                project.systemCost ||
                (data.systemSizeKw ||
                    design.systemSizeKw ||
                    project.systemSize ||
                    8) *
                    1000 *
                    (data.costPerWatt || 3.0),
            costPerWatt: data.costPerWatt || project.costPerWatt || 3.0,
            maintenanceCostAnnual: data.maintenanceCostAnnual || 150,
            inverterReplacementYear: data.inverterReplacementYear || 15,
            inverterReplacementCost: data.inverterReplacementCost || 2500,
            isResidential: (_a = data.isResidential) !== null && _a !== void 0 ? _a : project.projectType !== "commercial",
            federalITC: (_b = data.federalITC) !== null && _b !== void 0 ? _b : 0,
            stateIncentive: data.stateIncentive || 0,
            utilityIncentive: data.utilityIncentive || 0,
            domesticContentBonus: data.domesticContentBonus || false,
            energyCommunityBonus: data.energyCommunityBonus || false,
            lowIncomeBonus: data.lowIncomeBonus || false,
            prevailingWage: data.prevailingWage || false,
            loanAvailable: data.loanAvailable || false,
            loanDownPayment: data.loanDownPayment || 0,
            loanAmount: data.loanAmount || 0,
            loanInterestRate: data.loanInterestRate || 0.065,
            loanTermYears: data.loanTermYears || 20,
            leaseAvailable: data.leaseAvailable || false,
            monthlyLeasePayment: data.monthlyLeasePayment || 0,
            leaseEscalation: data.leaseEscalation || 0.029,
            leaseTermYears: data.leaseTermYears || 25,
            ppaAvailable: data.ppaAvailable || false,
            ppaRatePerKwh: data.ppaRatePerKwh || 0,
            ppaEscalation: data.ppaEscalation || 0.029,
            ppaTermYears: data.ppaTermYears || 25,
            feocCompliant: data.feocCompliant,
            domesticContentCompliant: data.domesticContentCompliant,
            tariffSafe: data.tariffSafe,
            panelWarrantyYears: data.panelWarrantyYears || 25,
            panelPerformanceWarrantyYears: data.panelPerformanceWarrantyYears || 25,
            inverterWarrantyYears: data.inverterWarrantyYears || 12,
            batteryWarrantyYears: data.batteryWarrantyYears || 10,
            workmanshipWarrantyYears: data.workmanshipWarrantyYears || 10,
            installerCompany: data.installerCompany || project.installerCompany,
            installerLicense: data.installerLicense,
            installerPhone: data.installerPhone,
            installerEmail: data.installerEmail,
            salesRepName: data.salesRepName || project.salesRep,
            degradationRate: data.degradationRate || 0.005,
            analysisYears: data.analysisYears || 25,
            discountRate: data.discountRate || 0.05,
        };
        const proposal = generateProposal(input);
        // Save proposal to Firestore
        await db
            .collection("proposals")
            .doc(proposal.meta.proposalId)
            .set({
            ...proposal,
            createdBy: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Also link to project
        await db.collection("projects").doc(projectId).update({
            latestProposalId: proposal.meta.proposalId,
            latestProposalDate: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, data: proposal };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error("Proposal generation error:", error);
        throw new functions.https.HttpsError("internal", "Proposal generation failed: " + (error.message || "Unknown error"));
    }
});
/**
 * Get a previously generated proposal — callable function.
 *
 * @function getSolarProposal
 * @type onCall
 * @auth firebase
 */
exports.getSolarProposal = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    const { proposalId, projectId } = data;
    if (!proposalId && !projectId) {
        throw new functions.https.HttpsError("invalid-argument", "Either proposalId or projectId is required.");
    }
    try {
        const db = admin.firestore();
        if (proposalId) {
            const doc = await db.collection("proposals").doc(proposalId).get();
            if (!doc.exists) {
                throw new functions.https.HttpsError("not-found", `Proposal ${proposalId} not found.`);
            }
            return { success: true, data: { id: doc.id, ...doc.data() } };
        }
        // Get latest proposal for project
        const snapshot = await db
            .collection("proposals")
            .where("meta.projectId", "==", projectId)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        if (snapshot.empty) {
            throw new functions.https.HttpsError("not-found", `No proposals found for project ${projectId}.`);
        }
        const doc = snapshot.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error("Get proposal error:", error);
        throw new functions.https.HttpsError("internal", "Failed to retrieve proposal: " + (error.message || "Unknown error"));
    }
});
//# sourceMappingURL=proposalGenerator.js.map