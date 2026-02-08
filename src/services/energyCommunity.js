// Energy Community Lookup Service - NATIONAL
// Based on IRS/Treasury Energy Community designations under the Inflation Reduction Act
// Categories: Statistical Area (fossil fuel employment), Coal Closure, Brownfield
// Source: IRS Notice 2025-31, energycommunities.gov

// National Energy Community MSAs by state (Statistical Area Category)
// Counties qualifying due to fossil fuel employment >= 0.17% AND unemployment >= national avg
const ENERGY_COMMUNITY_MSAS = {
  AL: {
    "Birmingham-Hoover, AL MSA": ["Bibb", "Walker", "Jefferson"],
    "Tuscaloosa, AL MSA": ["Tuscaloosa"],
    "Non-MSA": ["Fayette"],
  },
  AK: {
    "Non-MSA": ["North Slope", "Kenai Peninsula"],
    "Anchorage, AK MSA": ["Matanuska-Susitna"],
    "Fairbanks, AK MSA": ["Fairbanks North Star"],
  },
  AR: {
    "Non-MSA": ["Columbia", "Logan"],
    "El Dorado, AR MSA": ["Union"],
    "Fort Smith, AR-OK MSA": ["Sebastian"],
  },
  CA: {
    "Bakersfield, CA MSA": ["Kern"],
    "Hanford-Corcoran, CA MSA": ["Kings"],
  },
  CO: {
    "Greeley, CO MSA": ["Weld"],
    "Non-MSA": ["Garfield", "Rio Blanco", "Moffat"],
    "Grand Junction, CO MSA": ["Mesa"],
    "Durango, CO MSA": ["La Plata"],
  },
  IL: {
    "Non-MSA": ["Franklin", "Williamson", "Saline", "Perry", "Gallatin"],
  },
  IN: {
    "Non-MSA": ["Gibson", "Pike", "Sullivan"],
    "Evansville, IN-KY MSA": ["Warrick"],
  },
  KS: {
    "Non-MSA": ["Barton", "Russell"],
    "Hays, KS MSA": ["Ellis"],
  },
  KY: {
    "Non-MSA": [
      "Pike",
      "Perry",
      "Harlan",
      "Floyd",
      "Knott",
      "Letcher",
      "Martin",
      "Leslie",
      "Hopkins",
      "Muhlenberg",
      "Webster",
      "Union",
    ],
  },
  LA: {
    "Houma-Thibodaux, LA MSA": ["Lafourche", "Terrebonne"],
    "Non-MSA": ["Iberia", "St. Mary"],
    "Lafayette, LA MSA": ["Lafayette", "Vermilion"],
    "Lake Charles, LA MSA": ["Calcasieu"],
    "New Orleans-Metairie, LA MSA": ["Plaquemines"],
    "Shreveport-Bossier City, LA MSA": ["Caddo"],
  },
  MS: {
    "Non-MSA": ["Adams"],
    "Laurel, MS MSA": ["Jones"],
  },
  MT: {
    "Non-MSA": ["Richland", "Fallon", "Rosebud", "Big Horn"],
  },
  ND: {
    "Williston, ND MSA": ["Williams"],
    "Non-MSA": ["McKenzie", "Mountrail", "Dunn", "Mercer", "McLean", "Oliver"],
    "Dickinson, ND MSA": ["Stark"],
  },
  NE: {
    "Non-MSA": ["Kimball"],
  },
  NM: {
    "Non-MSA": ["Lea", "Rio Arriba"],
    "Carlsbad-Artesia, NM MSA": ["Eddy"],
    "Farmington, NM MSA": ["San Juan"],
    "Roswell, NM MSA": ["Chaves"],
  },
  OH: {
    "Non-MSA": ["Belmont", "Harrison", "Monroe", "Noble", "Guernsey"],
  },
  OK: {
    "Oklahoma City, OK MSA": ["Canadian", "Grady"],
    "Non-MSA": [
      "Garvin",
      "Stephens",
      "Pittsburg",
      "Le Flore",
      "Woodward",
      "Major",
    ],
    "Ardmore, OK MSA": ["Carter"],
  },
  PA: {
    "Pittsburgh, PA MSA": ["Washington", "Greene"],
    "Non-MSA": ["Tioga", "Bradford", "Susquehanna", "Somerset"],
    "Williamsport, PA MSA": ["Lycoming"],
    "Johnstown, PA MSA": ["Cambria"],
  },
  SD: {
    "Non-MSA": ["Harding"],
  },
  TX: {
    "Midland, TX MSA": ["Midland"],
    "Odessa, TX MSA": ["Ector"],
    "Non-MSA": [
      "Martin",
      "Loving",
      "Andrews",
      "Upton",
      "Reagan",
      "Karnes",
      "DeWitt",
      "La Salle",
      "Panola",
    ],
    "Big Spring, TX MSA": ["Howard"],
    "Pecos, TX MSA": ["Reeves"],
    "Laredo, TX MSA": ["Webb"],
    "Beaumont-Port Arthur, TX MSA": ["Jefferson", "Orange"],
  },
  UT: {
    "Non-MSA": ["Duchesne", "Uintah", "Carbon", "Emery"],
  },
  VA: {
    "Non-MSA": ["Buchanan", "Dickenson", "Wise", "Lee", "Russell", "Tazewell"],
  },
  WV: {
    "Non-MSA": [
      "Boone",
      "Logan",
      "Mingo",
      "McDowell",
      "Wyoming",
      "Fayette",
      "Nicholas",
      "Marshall",
      "Wetzel",
      "Doddridge",
    ],
    "Beckley, WV MSA": ["Raleigh"],
    "Charleston, WV MSA": ["Kanawha"],
    "Fairmont, WV MSA": ["Marion"],
    "Morgantown, WV MSA": ["Monongalia"],
  },
  WY: {
    "Gillette, WY MSA": ["Campbell"],
    "Non-MSA": [
      "Converse",
      "Sweetwater",
      "Sublette",
      "Lincoln",
      "Fremont",
      "Park",
      "Uinta",
      "Hot Springs",
    ],
    "Casper, WY MSA": ["Natrona"],
  },
};

// Build fast lookup: "state:county" -> msa name
const ENERGY_COMMUNITY_LOOKUP = new Map();
for (const [state, msas] of Object.entries(ENERGY_COMMUNITY_MSAS)) {
  for (const [msaName, counties] of Object.entries(msas)) {
    for (const county of counties) {
      ENERGY_COMMUNITY_LOOKUP.set(`${state}:${county.toLowerCase()}`, msaName);
    }
  }
}

// States with coal closure communities (45 states)
const COAL_CLOSURE_STATES = new Set([
  "AL",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
]);

/**
 * Check if a county is in an Energy Community (national)
 * @param {string} county - County name (e.g., "Harris", "Harris County")
 * @param {string} state - State code (e.g., "TX", "PA")
 * @returns {object} { isEnergyCommunity: boolean, msa: string|null, category: string, bonusPercentage: number }
 */
export function checkEnergyCommunity(county, state = "") {
  if (!state) {
    return {
      isEnergyCommunity: false,
      msa: null,
      category: null,
      bonusPercentage: 0,
      reason: "No state provided",
    };
  }

  const normalizedState = state.toUpperCase().trim();

  if (!county) {
    // Even without county, check if state has coal closure communities
    if (COAL_CLOSURE_STATES.has(normalizedState)) {
      return {
        isEnergyCommunity: false,
        msa: null,
        category: "possible_coal_closure",
        bonusPercentage: 0,
        reason: `${normalizedState} has coal closure energy communities. Provide county for specific lookup. Verify at energycommunities.gov`,
      };
    }
    return {
      isEnergyCommunity: false,
      msa: null,
      category: null,
      bonusPercentage: 0,
      reason: "No county provided",
    };
  }

  // Normalize county name (remove " County" / " Parish" / " Borough" suffix, lowercase)
  const normalizedCounty = county
    .replace(/\s+(county|parish|borough)$/i, "")
    .trim()
    .toLowerCase();

  // Check statistical area category (most valuable - pre-determined)
  const lookupKey = `${normalizedState}:${normalizedCounty}`;
  const msa = ENERGY_COMMUNITY_LOOKUP.get(lookupKey);

  if (msa) {
    return {
      isEnergyCommunity: true,
      msa,
      county,
      state: normalizedState,
      category: "statistical_area",
      bonusPercentage: 10,
      reason: `Part of ${msa} - qualifies as Energy Community under IRS Statistical Area Category (fossil fuel employment). 10% ITC bonus for qualifying installations.`,
    };
  }

  // Check if state has coal closure communities (requires census tract verification)
  if (COAL_CLOSURE_STATES.has(normalizedState)) {
    return {
      isEnergyCommunity: false,
      msa: null,
      county,
      state: normalizedState,
      category: "possible_coal_closure",
      bonusPercentage: 0,
      reason: `County not in Statistical Area category, but ${normalizedState} has coal closure energy communities. Check energycommunities.gov with specific address for coal closure or brownfield eligibility.`,
      verifyUrl: "https://energycommunities.gov",
    };
  }

  return {
    isEnergyCommunity: false,
    msa: null,
    county,
    state: normalizedState,
    category: null,
    bonusPercentage: 0,
    reason: "County not in a qualifying Energy Community designation",
  };
}

/**
 * Get all Energy Community counties for a state
 * @param {string} state - Two-letter state code
 * @returns {string[]} Array of county names
 */
export function getEnergyCommunityCounties(state = null) {
  if (state) {
    const stateData = ENERGY_COMMUNITY_MSAS[state.toUpperCase()];
    if (!stateData) return [];
    const counties = [];
    for (const msaCounties of Object.values(stateData)) {
      counties.push(...msaCounties);
    }
    return counties.sort();
  }

  // Return all counties across all states
  const allCounties = [];
  for (const [st, msas] of Object.entries(ENERGY_COMMUNITY_MSAS)) {
    for (const counties of Object.values(msas)) {
      allCounties.push(...counties.map((c) => `${c}, ${st}`));
    }
  }
  return allCounties.sort();
}

// Backward compatibility
export const getTexasEnergyCommunityCounties = () =>
  getEnergyCommunityCounties("TX");

/**
 * Get MSA information for a county
 * @param {string} county - County name
 * @param {string} state - State code
 * @returns {object|null} MSA info or null
 */
export function getMSAInfo(county, state = null) {
  const normalizedCounty = county
    .replace(/\s+(county|parish|borough)$/i, "")
    .trim()
    .toLowerCase();

  const statesToCheck = state
    ? [state.toUpperCase()]
    : Object.keys(ENERGY_COMMUNITY_MSAS);

  for (const st of statesToCheck) {
    const stateData = ENERGY_COMMUNITY_MSAS[st];
    if (!stateData) continue;

    for (const [msaName, counties] of Object.entries(stateData)) {
      if (counties.some((c) => c.toLowerCase() === normalizedCounty)) {
        return {
          name: msaName,
          state: st,
          counties,
          totalCounties: counties.length,
        };
      }
    }
  }
  return null;
}

/**
 * Get summary statistics
 */
export function getEnergyCommunityStats() {
  let totalCounties = 0;
  const statesWithStatistical = Object.keys(ENERGY_COMMUNITY_MSAS).length;

  for (const msas of Object.values(ENERGY_COMMUNITY_MSAS)) {
    for (const counties of Object.values(msas)) {
      totalCounties += counties.length;
    }
  }

  return {
    totalStatesStatisticalArea: statesWithStatistical,
    totalStatesCoalClosure: COAL_CLOSURE_STATES.size,
    totalStatesAny: 50, // Brownfield applies everywhere
    totalCountiesStatisticalArea: totalCounties,
    bonusPercentage: 10,
    categories: ["statistical_area", "coal_closure", "brownfield"],
  };
}

export default {
  checkEnergyCommunity,
  getEnergyCommunityCounties,
  getTexasEnergyCommunityCounties,
  getMSAInfo,
  getEnergyCommunityStats,
  ENERGY_COMMUNITY_MSAS,
};
