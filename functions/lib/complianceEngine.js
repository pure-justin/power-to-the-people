"use strict";
/**
 * FEOC & Domestic Content Compliance Engine
 *
 * Provides deep compliance analysis for solar equipment systems:
 * - FEOC (Foreign Entity of Concern) status per IRA Section 40207
 * - Domestic content scoring for 10% ITC adder
 * - ITC eligibility calculation (base + adders)
 * - AD/CVD tariff exposure analysis
 * - Actionable recommendations
 *
 * 2026 Regulatory Context:
 * - Residential 25D ITC expired Jan 1, 2026
 * - TPO (lease/PPA) claims 48E commercial ITC — requires FEOC compliance
 * - 40% PFE threshold for manufactured products (increases 5%/yr to 60% by 2029)
 * - 55% critical minerals threshold for batteries (increases to 75% by 2029)
 * - Domestic content bonus: 10% ITC adder for 50%+ US content
 * - Energy community adder: 10% ITC adder (requires location verification)
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
exports.analyzeCompliance = analyzeCompliance;
exports.quickComplianceCheck = quickComplianceCheck;
const admin = __importStar(require("firebase-admin"));
// ============ Known FEOC Entities ============
// Companies headquartered in or controlled by China, Russia, North Korea, or Iran
// Match against manufacturer field (case-insensitive, partial match)
const KNOWN_FEOC_ENTITIES = [
    "catl",
    "byd",
    "longi",
    "ja solar",
    "trina solar",
    "trina",
    "jinkosolar",
    "jinko",
    "risen energy",
    "risen",
    "canadian solar",
    "csi solar",
    "tongwei",
    "jl mag",
    "gotion",
    "eve energy",
    "svolt",
    "apsystems",
    "ap systems",
    "growatt",
    "sungrow",
    "huawei",
    "chint",
    "znshine",
    "seraphim",
    "astronergy",
    "talesun",
    "suntech",
    "yingli",
    "hanwha qcells", // NOT FEOC — Korean parent, listed here as negative match note
].filter((name) => 
// Exclude Hanwha/QCells — they are Korean-owned, NOT FEOC
!name.includes("hanwha"));
const FEOC_COUNTRIES = ["CN", "RU", "KP", "IR"];
// AD/CVD tariff data by country
const TARIFF_DATA = {
    CN: {
        name: "China",
        rate: 254,
        type: "AD/CVD + Section 301",
    },
    VN: {
        name: "Vietnam",
        rate: 271,
        type: "AD/CVD (circumvention)",
    },
    TH: {
        name: "Thailand",
        rate: 206,
        type: "AD/CVD (circumvention)",
    },
    MY: {
        name: "Malaysia",
        rate: 81,
        type: "AD/CVD (circumvention)",
    },
    KH: {
        name: "Cambodia",
        rate: 3400,
        type: "AD/CVD (preliminary)",
    },
    MX: {
        name: "Mexico",
        rate: 25,
        type: "Section 232 / Executive tariff",
    },
};
// Equipment type weights for domestic content calculation
const TYPE_WEIGHTS = {
    panel: 0.5,
    inverter: 0.2,
    battery: 0.2,
    optimizer: 0.05,
    racking: 0.03,
    monitoring: 0.02,
};
// ============ Helper Functions ============
function isKnownFEOCEntity(manufacturer) {
    const mfr = (manufacturer || "").toLowerCase().trim();
    return KNOWN_FEOC_ENTITIES.some((entity) => mfr.includes(entity) || entity.includes(mfr));
}
function isFEOCCountry(countryCode) {
    return FEOC_COUNTRIES.includes((countryCode || "").toUpperCase());
}
function getPFEThreshold(installationDate) {
    // 2026: 40%, increases 5% per year to 60% by 2029
    const year = installationDate
        ? new Date(installationDate).getFullYear()
        : new Date().getFullYear();
    if (year <= 2026)
        return 40;
    if (year === 2027)
        return 45;
    if (year === 2028)
        return 50;
    if (year === 2029)
        return 55;
    return 60;
}
function getBatteryThreshold(installationDate) {
    // 2026: 55% critical minerals, increases to 75% by 2029
    const year = installationDate
        ? new Date(installationDate).getFullYear()
        : new Date().getFullYear();
    if (year <= 2026)
        return 55;
    if (year === 2027)
        return 60;
    if (year === 2028)
        return 65;
    if (year === 2029)
        return 70;
    return 75;
}
function getTariffInfo(countryCode, equipmentType) {
    const code = (countryCode || "").toUpperCase();
    const data = TARIFF_DATA[code];
    if (!data)
        return null;
    // AD/CVD tariffs primarily apply to crystalline silicon cells and modules
    const applicableTypes = ["panel", "cell", "module"];
    if (applicableTypes.includes((equipmentType || "").toLowerCase()) ||
        code === "MX") {
        return { rate: data.rate, type: data.type };
    }
    // Batteries from China also subject to tariffs
    if (code === "CN" && (equipmentType || "").toLowerCase() === "battery") {
        return { rate: 25, type: "Section 301 (batteries)" };
    }
    return null;
}
function extractCountryCode(equipment) {
    var _a, _b;
    // Try various fields to determine country of origin
    if (equipment.country_of_origin)
        return equipment.country_of_origin;
    if ((_a = equipment.supply_chain) === null || _a === void 0 ? void 0 : _a.country_of_origin)
        return equipment.supply_chain.country_of_origin;
    // Infer from manufacturing location text
    const location = (equipment.manufacturing_location ||
        ((_b = equipment.supply_chain) === null || _b === void 0 ? void 0 : _b.manufacturing_location) ||
        "").toLowerCase();
    if (location.includes("usa") || location.includes("united states"))
        return "US";
    if (location.includes("china"))
        return "CN";
    if (location.includes("vietnam"))
        return "VN";
    if (location.includes("thailand"))
        return "TH";
    if (location.includes("malaysia"))
        return "MY";
    if (location.includes("cambodia"))
        return "KH";
    if (location.includes("mexico"))
        return "MX";
    if (location.includes("singapore"))
        return "SG";
    if (location.includes("south korea") || location.includes("korea"))
        return "KR";
    if (location.includes("india"))
        return "IN";
    if (location.includes("germany"))
        return "DE";
    if (location.includes("austria"))
        return "AT";
    if (location.includes("japan"))
        return "JP";
    if (location.includes("canada"))
        return "CA";
    return "UNKNOWN";
}
function getDomesticContentPct(equipment) {
    var _a;
    // Check explicit fields first
    if (typeof equipment.us_content_percentage === "number")
        return equipment.us_content_percentage;
    if (typeof equipment.domestic_content_pct === "number")
        return equipment.domestic_content_pct;
    if (typeof ((_a = equipment.supply_chain) === null || _a === void 0 ? void 0 : _a.domestic_content_pct) === "number")
        return equipment.supply_chain.domestic_content_pct;
    // Infer from domestic content eligibility and country
    if (equipment.domestic_content_eligible === true) {
        const country = extractCountryCode(equipment);
        if (country === "US")
            return 70; // Conservative estimate for US-made
        return 30; // US assembly with imported components
    }
    if (extractCountryCode(equipment) === "US")
        return 50; // Default for US-origin
    return 0;
}
// ============ Main Analysis Function ============
async function analyzeCompliance(input) {
    var _a, _b, _c;
    const db = admin.firestore();
    const threshold = getPFEThreshold(input.installation_date);
    const batteryThreshold = getBatteryThreshold(input.installation_date);
    // Fetch all equipment docs by IDs
    const equipmentDocs = await Promise.all(input.equipment_ids.slice(0, 20).map(async (id) => {
        const doc = await db.collection("solar_equipment").doc(id).get();
        if (!doc.exists)
            return { id, _notFound: true };
        return { id, ...doc.data() };
    }));
    // ── FEOC Analysis ──
    const feocDetails = [];
    let feocPassCount = 0;
    let feocFailCount = 0;
    let feocUnknownCount = 0;
    for (const equip of equipmentDocs) {
        if (equip._notFound) {
            feocDetails.push({
                equipment_id: equip.id,
                name: "Unknown (not found)",
                manufacturer: "Unknown",
                type: "unknown",
                pfe_percentage: 0,
                threshold,
                passes: false,
                reason: `Equipment ID "${equip.id}" not found in database.`,
            });
            feocUnknownCount++;
            continue;
        }
        const data = equip;
        const eqType = (data.type || "unknown").toLowerCase();
        const currentThreshold = eqType === "battery" ? batteryThreshold : threshold;
        const pfe = typeof ((_a = data.supply_chain) === null || _a === void 0 ? void 0 : _a.pfe_percentage) === "number"
            ? data.supply_chain.pfe_percentage
            : null;
        let passes;
        let reason;
        if (pfe !== null) {
            // Use explicit PFE percentage
            passes = pfe <= currentThreshold;
            reason = passes
                ? `PFE ${pfe}% is within the ${currentThreshold}% threshold.`
                : `PFE ${pfe}% exceeds the ${currentThreshold}% threshold.`;
        }
        else if (typeof data.feoc_compliant === "boolean") {
            // Use boolean flag as fallback
            passes = data.feoc_compliant;
            reason = passes
                ? "Marked as FEOC-compliant in equipment database."
                : "Marked as FEOC non-compliant in equipment database.";
        }
        else if (isKnownFEOCEntity(data.manufacturer || "")) {
            passes = false;
            reason = `${data.manufacturer} is a known Foreign Entity of Concern.`;
        }
        else if (isFEOCCountry(extractCountryCode(data))) {
            passes = false;
            reason = `Manufactured in a FEOC country (${extractCountryCode(data)}).`;
        }
        else {
            passes = true;
            reason =
                "Not identified as FEOC entity. Verify supply chain for subcomponents.";
        }
        if (passes)
            feocPassCount++;
        else
            feocFailCount++;
        feocDetails.push({
            equipment_id: equip.id,
            name: data.name || data.model || "Unknown",
            manufacturer: data.manufacturer || "Unknown",
            type: eqType,
            pfe_percentage: pfe !== null && pfe !== void 0 ? pfe : 0,
            threshold: currentThreshold,
            passes,
            reason,
        });
    }
    let feocStatus;
    if (feocFailCount === 0 && feocUnknownCount === 0)
        feocStatus = "compliant";
    else if (feocFailCount > 0 && feocPassCount > 0)
        feocStatus = "partial";
    else if (feocFailCount > 0)
        feocStatus = "non_compliant";
    else
        feocStatus = "unknown";
    // ── Domestic Content Score ──
    // Weighted average of domestic content % across equipment types
    let totalWeight = 0;
    let weightedDomestic = 0;
    for (const equip of equipmentDocs) {
        if (equip._notFound)
            continue;
        const data = equip;
        const eqType = (data.type || "other").toLowerCase();
        const weight = TYPE_WEIGHTS[eqType] || 0.02;
        const domesticPct = getDomesticContentPct(data);
        totalWeight += weight;
        weightedDomestic += weight * domesticPct;
    }
    const domesticScore = totalWeight > 0 ? Math.round(weightedDomestic / totalWeight) : 0;
    const domesticThreshold = 50;
    const domesticEligible = domesticScore >= domesticThreshold;
    const domesticContent = {
        score: domesticScore,
        threshold: domesticThreshold,
        eligible: domesticEligible,
        bonus_value: domesticEligible ? "+10% ITC adder" : "Not eligible",
    };
    // ── ITC Eligibility ──
    let itcEligible = false;
    let itcReason = "";
    let baseRate = 0;
    if (input.project_type === "residential" &&
        (input.financing_type === "cash" || input.financing_type === "loan")) {
        itcEligible = false;
        itcReason =
            "Residential ITC (Section 25D) expired January 1, 2026. Cash and loan purchases no longer qualify. Consider lease/PPA for TPO ITC via Section 48E.";
    }
    else if (input.project_type === "residential" &&
        (input.financing_type === "lease" || input.financing_type === "ppa")) {
        itcEligible = feocStatus === "compliant";
        baseRate = 30;
        itcReason = itcEligible
            ? "Eligible for 48E commercial ITC via TPO (lease/PPA). All equipment is FEOC-compliant."
            : "TPO structure available but equipment has FEOC issues. Must use compliant equipment for 48E ITC.";
    }
    else if (input.project_type === "commercial" ||
        input.project_type === "tpo") {
        itcEligible = feocStatus === "compliant";
        baseRate = 30;
        itcReason = itcEligible
            ? "Eligible for 48E commercial ITC at 30% base rate."
            : "Commercial project but equipment has FEOC compliance issues. Replace non-compliant equipment.";
    }
    else {
        itcReason =
            "Unable to determine ITC eligibility. Specify project_type and financing_type.";
    }
    const dcAdder = itcEligible && domesticEligible ? 10 : 0;
    // Energy community is location-dependent — flag for verification
    const ecAdder = itcEligible ? 10 : 0;
    const totalRate = itcEligible ? baseRate + dcAdder + ecAdder : 0;
    const estimatedValue = input.system_cost
        ? Math.round(input.system_cost * (totalRate / 100))
        : 0;
    const itcEligibility = {
        eligible: itcEligible,
        base_rate: itcEligible ? baseRate : 0,
        domestic_content_adder: dcAdder,
        energy_community_adder: ecAdder,
        total_rate: totalRate,
        estimated_value: estimatedValue,
        reason: itcReason,
    };
    // ── Tariff Exposure ──
    const tariffExposure = [];
    for (const equip of equipmentDocs) {
        if (equip._notFound)
            continue;
        const data = equip;
        const country = extractCountryCode(data);
        const tariff = getTariffInfo(country, data.type || "");
        if (tariff && tariff.rate > 0) {
            // Estimate cost impact from equipment price
            const unitCost = ((_b = data.pricing) === null || _b === void 0 ? void 0 : _b.wholesale_per_unit) || data.price_estimate_usd || 0;
            const costImpact = unitCost
                ? Math.round(unitCost * (tariff.rate / 100))
                : 0;
            tariffExposure.push({
                equipment_id: equip.id,
                name: data.name || data.model || "Unknown",
                country_of_origin: `${country} (${((_c = TARIFF_DATA[country]) === null || _c === void 0 ? void 0 : _c.name) || country})`,
                tariff_type: tariff.type,
                rate_percentage: tariff.rate,
                estimated_cost_impact: costImpact,
            });
        }
    }
    // ── Recommendations ──
    const recommendations = [];
    // FEOC recommendations
    const feocFailedItems = feocDetails.filter((d) => !d.passes);
    if (feocFailedItems.length > 0) {
        const failedNames = feocFailedItems
            .map((d) => `${d.manufacturer} ${d.name}`)
            .join(", ");
        recommendations.push(`Replace FEOC non-compliant equipment (${failedNames}) with US-manufactured alternatives from QCells, Silfab, First Solar, Mission Solar, Heliene, or Enphase.`);
        for (const item of feocFailedItems) {
            if (item.type === "panel") {
                recommendations.push(`Replace ${item.manufacturer} panel with QCells Q.TRON (Dalton, GA), Silfab Prime (Fort Mill, SC), or Mission Solar (San Antonio, TX).`);
            }
            else if (item.type === "inverter") {
                recommendations.push(`Replace ${item.manufacturer} inverter with Enphase IQ8+ (US-made) or SolarEdge Home Hub (Austin, TX).`);
            }
            else if (item.type === "battery") {
                recommendations.push(`Replace ${item.manufacturer} battery with Enphase IQ Battery 5P (FEOC-verified) or SolarEdge Home Battery (US-made).`);
            }
        }
    }
    // Domestic content recommendations
    if (!domesticEligible && itcEligible) {
        recommendations.push(`Domestic content score is ${domesticScore}%, below the 50% threshold for the 10% ITC adder. Consider substituting imported components with US-manufactured alternatives.`);
    }
    // Tariff recommendations
    if (tariffExposure.length > 0) {
        const totalTariffImpact = tariffExposure.reduce((sum, t) => sum + t.estimated_cost_impact, 0);
        if (totalTariffImpact > 0) {
            recommendations.push(`Total estimated tariff cost impact: $${totalTariffImpact.toLocaleString()}. US-manufactured equipment eliminates tariff exposure entirely.`);
        }
    }
    // ITC optimization
    if (input.project_type === "residential" &&
        (input.financing_type === "cash" || input.financing_type === "loan")) {
        recommendations.push("Residential ITC is no longer available for cash/loan purchases. Switch to lease or PPA (TPO) financing to access the 48E commercial ITC via the third-party owner.");
    }
    if (itcEligible && ecAdder > 0) {
        recommendations.push("Energy community adder (+10%) requires verification that the installation site is in a designated energy community. Verify at energycommunities.gov.");
    }
    // No-credit market recommendation
    if (!itcEligible && feocFailedItems.length > 0) {
        recommendations.push("If this project is in a market without ITC (e.g., San Antonio CPS Energy territory), FEOC compliance is not required. Cheaper non-compliant panels may be acceptable to reduce cost.");
    }
    if (recommendations.length === 0) {
        recommendations.push("System is fully compliant. All equipment meets FEOC requirements and qualifies for available tax credits.");
    }
    return {
        feoc_status: feocStatus,
        feoc_details: feocDetails,
        domestic_content: domesticContent,
        itc_eligibility: itcEligibility,
        tariff_exposure: tariffExposure,
        recommendations,
    };
}
// ============ Quick Single-Equipment Check ============
async function quickComplianceCheck(equipmentId) {
    const db = admin.firestore();
    const doc = await db.collection("solar_equipment").doc(equipmentId).get();
    if (!doc.exists) {
        return {
            equipment_id: equipmentId,
            name: "Not found",
            manufacturer: "Unknown",
            type: "unknown",
            feoc_compliant: false,
            feoc_reason: `Equipment ID "${equipmentId}" not found in database.`,
            domestic_content_percentage: 0,
            tariff_safe: false,
            tariff_details: null,
        };
    }
    const data = doc.data();
    const country = extractCountryCode(data);
    const tariff = getTariffInfo(country, data.type || "");
    // FEOC check
    let feocCompliant;
    let feocReason;
    if (typeof data.feoc_compliant === "boolean") {
        feocCompliant = data.feoc_compliant;
        feocReason = feocCompliant
            ? "Verified FEOC-compliant in equipment database."
            : "Marked as FEOC non-compliant in equipment database.";
    }
    else if (isKnownFEOCEntity(data.manufacturer || "")) {
        feocCompliant = false;
        feocReason = `${data.manufacturer} is a known Foreign Entity of Concern.`;
    }
    else if (isFEOCCountry(country)) {
        feocCompliant = false;
        feocReason = `Manufactured in a FEOC country (${country}).`;
    }
    else {
        feocCompliant = true;
        feocReason =
            "Not identified as FEOC entity. Verify supply chain for subcomponents.";
    }
    return {
        equipment_id: equipmentId,
        name: data.name || data.model || "Unknown",
        manufacturer: data.manufacturer || "Unknown",
        type: data.type || "unknown",
        feoc_compliant: feocCompliant,
        feoc_reason: feocReason,
        domestic_content_percentage: getDomesticContentPct(data),
        tariff_safe: !tariff || tariff.rate === 0,
        tariff_details: tariff
            ? {
                country_of_origin: country,
                tariff_type: tariff.type,
                rate_percentage: tariff.rate,
            }
            : null,
    };
}
//# sourceMappingURL=complianceEngine.js.map