/**
 * Compliance Service
 * Client-side compliance logic for FEOC, domestic content, and tariff checks.
 * Also wraps server-side solarComplianceCheck for full compound reports.
 *
 * 2026 context:
 * - Residential ITC ended January 1, 2026
 * - Lease/PPA (TPO) still gets commercial ITC if equipment is FEOC-compliant
 * - Massive tariffs on SE Asian panels (up to 3,400% AD/CVD)
 * - Domestic content bonus (10%) requires 50% US-manufactured threshold
 */

import { runComplianceCheck } from "./solarDataService";

// ---------------------------------------------------------------------------
// FEOC-compliant US manufacturers with domestic production facilities
// FEOC = Foreign Entity of Concern (no China, Russia, North Korea, Iran)
// ---------------------------------------------------------------------------
const FEOC_COMPLIANT_MANUFACTURERS = [
  {
    name: "First Solar",
    country: "US",
    facilities: [
      "Perrysburg, OH",
      "Lake Township, OH",
      "Walbridge, OH",
      "Lawrence County, AL",
      "Iberia Parish, LA",
      "Richland County, SC",
    ],
    technology: "CdTe (Cadmium Telluride)",
    notes:
      "Fully domestic supply chain. Only major US manufacturer using non-silicon thin-film technology.",
    domestic_content_pct: 100,
    type: "panel",
  },
  {
    name: "Qcells",
    country: "US",
    facilities: ["Cartersville, GA"],
    technology: "Mono PERC / TOPCon",
    notes:
      "8.4 GW capacity. Korean-owned (Hanwha), US-manufactured. Fully FEOC-compliant.",
    domestic_content_pct: 85,
    type: "panel",
  },
  {
    name: "Mission Solar",
    country: "US",
    facilities: ["San Antonio, TX"],
    technology: "Mono PERC",
    notes:
      "+2 GW cell production. Texas-based, expanding domestic cell manufacturing.",
    domestic_content_pct: 90,
    type: "panel",
  },
  {
    name: "SolarEdge",
    country: "US",
    facilities: ["Sorrento, FL", "Austin, TX", "Salt Lake City, UT"],
    technology: "Power optimizers, inverters",
    notes: "Israeli-owned, US-manufactured inverters and optimizers.",
    domestic_content_pct: 75,
    type: "inverter",
  },
  {
    name: "Silfab Solar",
    country: "US",
    facilities: ["Bellingham, WA", "Fort Mill, SC"],
    technology: "Mono PERC / HJT",
    notes:
      "~2 GW assembly capacity. Canadian-owned, US assembly with expanding cell production.",
    domestic_content_pct: 70,
    type: "panel",
  },
  {
    name: "Heliene",
    country: "US",
    facilities: ["Mountain Iron, MN"],
    technology: "Mono PERC",
    notes:
      "Canadian-owned, US assembly using Suniva cells for domestic content compliance.",
    domestic_content_pct: 65,
    type: "panel",
  },
];

// Countries subject to AD/CVD tariffs on solar equipment
const TARIFF_COUNTRIES = {
  CN: {
    name: "China",
    tariff_rate: 254.0,
    notes: "Up to 254% combined AD/CVD + Section 301",
  },
  VN: {
    name: "Vietnam",
    tariff_rate: 271.0,
    notes: "Up to 271% AD/CVD (circumvention ruling)",
  },
  TH: {
    name: "Thailand",
    tariff_rate: 206.0,
    notes: "Up to 206% AD/CVD (circumvention ruling)",
  },
  MY: {
    name: "Malaysia",
    tariff_rate: 81.0,
    notes: "Up to 81% AD/CVD (circumvention ruling)",
  },
  KH: {
    name: "Cambodia",
    tariff_rate: 3400.0,
    notes: "Up to 3,400% preliminary AD/CVD rate",
  },
  KR: {
    name: "South Korea",
    tariff_rate: 0,
    notes: "No AD/CVD. Subject to standard tariffs only.",
  },
  IN: { name: "India", tariff_rate: 0, notes: "No AD/CVD. Emerging supplier." },
};

// FEOC countries (Foreign Entity of Concern) per IRA Section 40207
const FEOC_COUNTRIES = ["CN", "RU", "KP", "IR"];
const FEOC_COUNTRY_NAMES = {
  CN: "China",
  RU: "Russia",
  KP: "North Korea",
  IR: "Iran",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check a single piece of equipment for compliance (FEOC, domestic content, tariff)
 * @param {Object} equipment - Equipment to check
 * @param {string} equipment.manufacturer - Manufacturer name
 * @param {string} equipment.country - Country code (e.g. "US", "CN", "VN")
 * @param {string} equipment.type - Equipment type: "panel", "inverter", "battery"
 * @param {number} [equipment.cost] - Equipment cost in dollars (for tariff impact calculation)
 * @returns {Object} Compliance result with feoc, domestic_content, tariff fields
 */
export function checkEquipmentCompliance(equipment) {
  const { manufacturer, country, type, cost } = equipment;
  const countryUpper = (country || "").toUpperCase();

  // FEOC check
  const feocResult = getFEOCStatus(manufacturer, countryUpper);

  // Domestic content check
  const knownManufacturer = FEOC_COMPLIANT_MANUFACTURERS.find(
    (m) => m.name.toLowerCase() === (manufacturer || "").toLowerCase(),
  );
  const domesticContentPct = knownManufacturer
    ? knownManufacturer.domestic_content_pct
    : countryUpper === "US"
      ? 50
      : 0;
  const domesticContentCompliant = domesticContentPct >= 50;

  // Tariff check
  const tariffInfo = getTariffImpact(countryUpper, type);
  const tariffSafe = tariffInfo.tariff_rate === 0;

  return {
    manufacturer: manufacturer || "Unknown",
    country: countryUpper,
    type: type || "unknown",
    feoc_compliant: feocResult.compliant,
    feoc_details: feocResult,
    domestic_content_compliant: domesticContentCompliant,
    domestic_content_pct: domesticContentPct,
    tariff_safe: tariffSafe,
    tariff_details: tariffInfo,
    cost_impact:
      cost && tariffInfo.tariff_rate > 0
        ? Math.round(cost * (tariffInfo.tariff_rate / 100))
        : 0,
    known_manufacturer: knownManufacturer || null,
  };
}

/**
 * Calculate an overall compliance score for a set of components
 * @param {Object[]} components - Array of equipment objects
 * @param {string} components[].manufacturer - Manufacturer name
 * @param {string} components[].country - Country code
 * @param {string} components[].type - Equipment type
 * @param {number} [components[].cost] - Equipment cost
 * @returns {Object} { score: "green"|"yellow"|"red", details, components }
 */
export function getComplianceScore(components) {
  if (!components || components.length === 0) {
    return { score: "red", details: "No components provided", components: [] };
  }

  const results = components.map((comp) => checkEquipmentCompliance(comp));

  const allFEOC = results.every((r) => r.feoc_compliant);
  const allDomestic = results.every((r) => r.domestic_content_compliant);
  const allTariffSafe = results.every((r) => r.tariff_safe);

  const anyFEOCFail = results.some((r) => !r.feoc_compliant);
  const anyTariffRisk = results.some((r) => !r.tariff_safe);

  let score;
  let details;

  if (allFEOC && allDomestic && allTariffSafe) {
    score = "green";
    details =
      "All components are FEOC-compliant, meet domestic content requirements, and are tariff-safe.";
  } else if (anyFEOCFail) {
    score = "red";
    const failedComponents = results
      .filter((r) => !r.feoc_compliant)
      .map((r) => r.manufacturer);
    details = `FEOC non-compliant components: ${failedComponents.join(", ")}. System is ineligible for IRA tax credits under TPO/lease.`;
  } else if (anyTariffRisk && !allDomestic) {
    score = "red";
    details =
      "Components subject to tariffs and do not meet domestic content threshold. High cost risk.";
  } else if (anyTariffRisk) {
    score = "yellow";
    details =
      "Some components subject to import tariffs. System qualifies for credits but has cost risk from tariffs.";
  } else if (!allDomestic) {
    score = "yellow";
    details =
      "Domestic content below 50% threshold. System may not qualify for the 10% domestic content bonus.";
  } else {
    score = "yellow";
    details = "Partial compliance. Review individual component details.";
  }

  const totalCostImpact = results.reduce(
    (sum, r) => sum + (r.cost_impact || 0),
    0,
  );

  return {
    score,
    details,
    total_cost_impact: totalCostImpact,
    feoc_all_pass: allFEOC,
    domestic_content_all_pass: allDomestic,
    tariff_all_safe: allTariffSafe,
    components: results,
  };
}

/**
 * Check if a manufacturer/country combination is FEOC-compliant
 * FEOC = Foreign Entity of Concern (China, Russia, North Korea, Iran)
 * @param {string} manufacturer - Manufacturer name
 * @param {string} country - Two-letter country code
 * @returns {Object} { compliant: boolean, reason: string }
 */
export function getFEOCStatus(manufacturer, country) {
  const countryUpper = (country || "").toUpperCase();

  // Check if the country is a FEOC country
  if (FEOC_COUNTRIES.includes(countryUpper)) {
    return {
      compliant: false,
      reason: `Manufactured in ${FEOC_COUNTRY_NAMES[countryUpper] || countryUpper}, which is a Foreign Entity of Concern under IRA Section 40207.`,
    };
  }

  // Check if the manufacturer is in our known-compliant list
  const knownManufacturer = FEOC_COMPLIANT_MANUFACTURERS.find(
    (m) => m.name.toLowerCase() === (manufacturer || "").toLowerCase(),
  );

  if (knownManufacturer) {
    return {
      compliant: true,
      reason: `${knownManufacturer.name} manufactures in ${knownManufacturer.facilities.join(", ")}. Verified FEOC-compliant.`,
      manufacturer_info: knownManufacturer,
    };
  }

  // For non-FEOC countries with unknown manufacturers, assume compliant but flag for review
  if (countryUpper === "US") {
    return {
      compliant: true,
      reason:
        "US-manufactured. Verify supply chain does not include FEOC-sourced components.",
    };
  }

  return {
    compliant: true,
    reason: `Manufactured in ${countryUpper}. Not a FEOC country, but verify supply chain for FEOC-sourced subcomponents.`,
  };
}

/**
 * Calculate the domestic content percentage for a set of components
 * Domestic content is based on cost-weighted percentage of US-manufactured components.
 * @param {Object[]} components - Array of equipment objects
 * @param {string} components[].manufacturer - Manufacturer name
 * @param {string} components[].country - Country code
 * @param {number} [components[].cost] - Equipment cost (used for weighting)
 * @returns {Object} { percentage, meets_threshold, details }
 */
export function getDomesticContentPercentage(components) {
  if (!components || components.length === 0) {
    return {
      percentage: 0,
      meets_threshold: false,
      details: "No components provided",
    };
  }

  const hasCosts = components.some((c) => c.cost && c.cost > 0);

  if (hasCosts) {
    // Cost-weighted calculation
    let totalCost = 0;
    let domesticCost = 0;

    components.forEach((comp) => {
      const cost = comp.cost || 0;
      totalCost += cost;

      const knownManufacturer = FEOC_COMPLIANT_MANUFACTURERS.find(
        (m) => m.name.toLowerCase() === (comp.manufacturer || "").toLowerCase(),
      );

      if (knownManufacturer) {
        domesticCost += cost * (knownManufacturer.domestic_content_pct / 100);
      } else if ((comp.country || "").toUpperCase() === "US") {
        domesticCost += cost * 0.5; // Assume 50% for unknown US manufacturers
      }
    });

    const percentage =
      totalCost > 0 ? Math.round((domesticCost / totalCost) * 100) : 0;

    return {
      percentage,
      meets_threshold: percentage >= 50,
      details:
        percentage >= 50
          ? `Domestic content is ${percentage}%, meeting the 50% threshold for the domestic content bonus.`
          : `Domestic content is ${percentage}%, below the 50% threshold. Consider substituting imported components with US-manufactured alternatives.`,
      domestic_cost: Math.round(domesticCost),
      total_cost: Math.round(totalCost),
    };
  }

  // Count-based fallback when costs are not available
  let domesticCount = 0;

  components.forEach((comp) => {
    const knownManufacturer = FEOC_COMPLIANT_MANUFACTURERS.find(
      (m) => m.name.toLowerCase() === (comp.manufacturer || "").toLowerCase(),
    );

    if (knownManufacturer || (comp.country || "").toUpperCase() === "US") {
      domesticCount++;
    }
  });

  const percentage = Math.round((domesticCount / components.length) * 100);

  return {
    percentage,
    meets_threshold: percentage >= 50,
    details: `${domesticCount} of ${components.length} components are US-manufactured (${percentage}%). Cost-weighted calculation requires component costs.`,
    domestic_count: domesticCount,
    total_count: components.length,
  };
}

/**
 * Get tariff impact for equipment from a given country
 * @param {string} country - Two-letter country code (e.g. "CN", "VN", "TH")
 * @param {string} productType - Equipment type: "panel", "inverter", "battery", "cell"
 * @returns {Object} { tariff_rate, country_name, notes, estimated_cost_impact }
 */
export function getTariffImpact(country, productType) {
  const countryUpper = (country || "").toUpperCase();
  const tariffData = TARIFF_COUNTRIES[countryUpper];

  if (!tariffData) {
    return {
      tariff_rate: 0,
      country: countryUpper,
      country_name: countryUpper,
      notes: "No specific AD/CVD tariffs applicable.",
      subject_to_tariff: false,
    };
  }

  // Tariffs primarily apply to solar cells and panels
  const applicableTypes = ["panel", "cell", "module"];
  const isApplicable =
    applicableTypes.includes((productType || "").toLowerCase()) ||
    tariffData.tariff_rate === 0;

  const effectiveRate = isApplicable ? tariffData.tariff_rate : 0;

  return {
    tariff_rate: effectiveRate,
    country: countryUpper,
    country_name: tariffData.name,
    notes: tariffData.notes,
    subject_to_tariff: effectiveRate > 0,
    product_type: productType || "unknown",
    warning:
      effectiveRate > 50
        ? `Extreme tariff risk (${effectiveRate}%). Strongly recommend US-manufactured alternatives.`
        : effectiveRate > 0
          ? `Moderate tariff exposure (${effectiveRate}%). Consider domestic alternatives.`
          : null,
  };
}

/**
 * Run a server-side compound compliance check via the Solar Data API
 * Provides a more thorough analysis using the full equipment database.
 * @param {Object} data - System configuration
 * @param {Object[]} data.components - Equipment components
 * @param {string} data.state - Installation state
 * @param {string} [data.county] - Installation county
 * @param {string} [data.financing_type] - Financing type for credit eligibility
 * @returns {Promise<Object>} Full compliance report from server
 */
export async function runServerComplianceCheck(data) {
  try {
    const result = await runComplianceCheck(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error running server compliance check:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get the list of known FEOC-compliant US manufacturers
 * @returns {Object[]} Array of manufacturer info objects
 */
export function getCompliantManufacturers() {
  return FEOC_COMPLIANT_MANUFACTURERS.map((m) => ({
    name: m.name,
    country: m.country,
    facilities: m.facilities,
    technology: m.technology,
    notes: m.notes,
    domestic_content_pct: m.domestic_content_pct,
    type: m.type,
  }));
}

/**
 * Get tariff data for all tracked countries
 * @returns {Object} Map of country code to tariff info
 */
export function getTariffCountries() {
  return { ...TARIFF_COUNTRIES };
}
