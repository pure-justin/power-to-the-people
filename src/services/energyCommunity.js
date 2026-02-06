// Energy Community Lookup Service
// Based on IRS Notice 2025-31 Appendix 3 - Statistical Area Category
// Texas MSAs qualifying as Energy Communities due to fossil fuel employment + unemployment rate

// Texas counties by MSA that qualify as Energy Communities
// Source: IRS Notice 2025-31 Appendix 3, Treasury Energy Communities Data
const TEXAS_ENERGY_COMMUNITY_MSAS = {
  // Houston-The Woodlands-Sugar Land MSA (Major oil/gas hub)
  "Houston-The Woodlands-Sugar Land": [
    "Harris",
    "Fort Bend",
    "Montgomery",
    "Brazoria",
    "Galveston",
    "Liberty",
    "Chambers",
    "Waller",
    "Austin",
  ],

  // Midland MSA (Permian Basin)
  Midland: ["Midland", "Martin"],

  // Odessa MSA (Permian Basin)
  Odessa: ["Ector"],

  // Beaumont-Port Arthur MSA (Refining hub)
  "Beaumont-Port Arthur": ["Jefferson", "Orange", "Hardin", "Newton"],

  // Corpus Christi MSA (Petrochemical)
  "Corpus Christi": ["Nueces", "San Patricio", "Aransas"],

  // Victoria MSA
  Victoria: ["Victoria", "Goliad", "Calhoun"],

  // Tyler MSA (East Texas oil)
  Tyler: ["Smith"],

  // Longview MSA (East Texas oil)
  Longview: ["Gregg", "Upshur", "Rusk"],

  // Texarkana MSA
  Texarkana: ["Bowie"],

  // Waco MSA
  Waco: ["McLennan", "Falls"],

  // McAllen-Edinburg-Mission MSA
  "McAllen-Edinburg-Mission": ["Hidalgo"],

  // Brownsville-Harlingen MSA
  "Brownsville-Harlingen": ["Cameron"],

  // Laredo MSA
  Laredo: ["Webb"],

  // San Angelo MSA
  "San Angelo": ["Tom Green", "Irion"],

  // Abilene MSA
  Abilene: ["Taylor", "Jones", "Callahan"],

  // Amarillo MSA (Panhandle energy)
  Amarillo: ["Potter", "Randall", "Armstrong", "Carson"],

  // Lubbock MSA
  Lubbock: ["Lubbock", "Crosby", "Lynn"],

  // Non-MSA counties with significant fossil fuel activity
  "Non-MSA Energy Counties": [
    "Andrews",
    "Crane",
    "Gaines",
    "Howard",
    "Loving",
    "Pecos",
    "Reagan",
    "Reeves",
    "Scurry",
    "Upton",
    "Ward",
    "Winkler",
    "Yoakum",
  ],
};

// Flatten to a Set for fast lookup
const ENERGY_COMMUNITY_COUNTIES = new Set();
Object.values(TEXAS_ENERGY_COMMUNITY_MSAS).forEach((counties) => {
  counties.forEach((county) =>
    ENERGY_COMMUNITY_COUNTIES.add(county.toLowerCase()),
  );
});

/**
 * Check if a Texas county is in an Energy Community
 * @param {string} county - County name (e.g., "Harris", "Harris County")
 * @param {string} state - State code (e.g., "TX")
 * @returns {object} { isEnergyCommunity: boolean, msa: string|null }
 */
export function checkEnergyCommunity(county, state = "TX") {
  // Only check Texas counties for now
  if (state.toUpperCase() !== "TX" && state.toUpperCase() !== "TEXAS") {
    return {
      isEnergyCommunity: false,
      msa: null,
      reason: "Only Texas is currently supported",
    };
  }

  if (!county) {
    return {
      isEnergyCommunity: false,
      msa: null,
      reason: "No county provided",
    };
  }

  // Normalize county name (remove " County" suffix, lowercase)
  const normalizedCounty = county
    .replace(/\s+county$/i, "")
    .trim()
    .toLowerCase();

  // Debug logging
  console.log("Energy Community Check:", {
    inputCounty: county,
    normalizedCounty,
    allCountiesInSet: Array.from(ENERGY_COMMUNITY_COUNTIES),
    hasHarris: ENERGY_COMMUNITY_COUNTIES.has("harris"),
  });

  // Check if county is in energy community list
  const isEnergyCommunity = ENERGY_COMMUNITY_COUNTIES.has(normalizedCounty);

  // Find which MSA it belongs to
  let msa = null;
  if (isEnergyCommunity) {
    for (const [msaName, counties] of Object.entries(
      TEXAS_ENERGY_COMMUNITY_MSAS,
    )) {
      if (counties.some((c) => c.toLowerCase() === normalizedCounty)) {
        msa = msaName;
        break;
      }
    }
  }

  return {
    isEnergyCommunity,
    msa,
    county: county,
    reason: isEnergyCommunity
      ? `Part of ${msa} MSA - qualifies under IRS Notice 2025-31 Statistical Area Category`
      : "County not in a qualifying Metropolitan Statistical Area",
  };
}

/**
 * Get all Texas Energy Community counties
 * @returns {string[]} Array of county names
 */
export function getTexasEnergyCommunityCounties() {
  return Array.from(ENERGY_COMMUNITY_COUNTIES)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .sort();
}

/**
 * Get MSA information for a county
 * @param {string} county - County name
 * @returns {object|null} MSA info or null
 */
export function getMSAInfo(county) {
  const normalizedCounty = county
    .replace(/\s+county$/i, "")
    .trim()
    .toLowerCase();

  for (const [msaName, counties] of Object.entries(
    TEXAS_ENERGY_COMMUNITY_MSAS,
  )) {
    if (counties.some((c) => c.toLowerCase() === normalizedCounty)) {
      return {
        name: msaName,
        counties: counties,
        totalCounties: counties.length,
      };
    }
  }
  return null;
}

export default {
  checkEnergyCommunity,
  getTexasEnergyCommunityCounties,
  getMSAInfo,
  TEXAS_ENERGY_COMMUNITY_MSAS,
};
