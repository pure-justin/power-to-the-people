/**
 * Commercial Lead Generator Service
 * Generates realistic commercial property data for Nevada
 * Alternative to Google Places API scraping
 */

// Nevada major cities and regions with realistic zones
const NEVADA_LOCATIONS = [
  {
    name: "Las Vegas",
    center: { lat: 36.1699, lng: -115.1398 },
    zones: [
      { name: "Downtown", offset: { lat: 0, lng: 0 } },
      { name: "The Strip", offset: { lat: -0.02, lng: -0.01 } },
      { name: "North", offset: { lat: 0.05, lng: 0 } },
      { name: "West", offset: { lat: 0, lng: -0.05 } },
      { name: "East", offset: { lat: 0, lng: 0.05 } },
      { name: "South", offset: { lat: -0.05, lng: 0 } },
    ],
  },
  {
    name: "Henderson",
    center: { lat: 36.0395, lng: -114.9817 },
    zones: [
      { name: "Green Valley", offset: { lat: 0, lng: 0 } },
      { name: "Black Mountain", offset: { lat: 0.03, lng: 0.02 } },
      { name: "Anthem", offset: { lat: 0.05, lng: 0 } },
    ],
  },
  {
    name: "North Las Vegas",
    center: { lat: 36.1989, lng: -115.1175 },
    zones: [
      { name: "Downtown", offset: { lat: 0, lng: 0 } },
      { name: "Aliante", offset: { lat: 0.04, lng: 0.02 } },
    ],
  },
  {
    name: "Reno",
    center: { lat: 39.5296, lng: -119.8138 },
    zones: [
      { name: "Downtown", offset: { lat: 0, lng: 0 } },
      { name: "Midtown", offset: { lat: 0.02, lng: 0.01 } },
      { name: "South", offset: { lat: -0.03, lng: 0 } },
    ],
  },
  {
    name: "Sparks",
    center: { lat: 39.5349, lng: -119.7527 },
    zones: [
      { name: "Downtown", offset: { lat: 0, lng: 0 } },
      { name: "Spanish Springs", offset: { lat: 0.05, lng: 0.03 } },
    ],
  },
  {
    name: "Carson City",
    center: { lat: 39.1638, lng: -119.7674 },
    zones: [
      { name: "Downtown", offset: { lat: 0, lng: 0 } },
      { name: "North", offset: { lat: 0.03, lng: 0 } },
    ],
  },
  {
    name: "Elko",
    center: { lat: 40.8324, lng: -115.7631 },
    zones: [
      { name: "Downtown", offset: { lat: 0, lng: 0 } },
      { name: "Spring Creek", offset: { lat: 0.05, lng: 0.05 } },
    ],
  },
];

// Commercial property types with realistic business name patterns
const PROPERTY_TYPES = {
  warehouse: {
    keyword: "warehouse",
    avgSqFt: 15000,
    energyIntensity: 5.5,
    roofCoverage: 0.85,
    priority: "high",
    namePatterns: [
      "{city} Distribution Warehouse",
      "{zone} Storage Facility",
      "{city} Industrial Warehouse",
      "{zone} Logistics Center",
      "Southwest {type} Center",
      "{city} Commerce Warehouse",
      "Nevada {type} Complex",
      "{zone} Distribution Hub",
    ],
  },
  retail_center: {
    keyword: "shopping center",
    avgSqFt: 25000,
    energyIntensity: 18,
    roofCoverage: 0.7,
    priority: "high",
    namePatterns: [
      "{zone} Shopping Center",
      "{city} Plaza",
      "{zone} Retail Center",
      "{city} Commons",
      "{zone} Marketplace",
      "{city} Square",
      "{zone} Pavilion",
      "The Shops at {zone}",
    ],
  },
  office_building: {
    keyword: "office building",
    avgSqFt: 20000,
    energyIntensity: 15,
    roofCoverage: 0.65,
    priority: "medium",
    namePatterns: [
      "{zone} Office Complex",
      "{city} Business Center",
      "{zone} Professional Plaza",
      "{city} Corporate Center",
      "{zone} Business Park",
      "{city} Office Tower",
      "{zone} Executive Center",
      "{city} Commerce Building",
    ],
  },
  industrial_park: {
    keyword: "industrial park",
    avgSqFt: 30000,
    energyIntensity: 12,
    roofCoverage: 0.8,
    priority: "high",
    namePatterns: [
      "{city} Industrial Park",
      "{zone} Business Park",
      "{city} Tech Center",
      "{zone} Industrial Complex",
      "{city} Manufacturing Center",
      "{zone} Technology Park",
      "Nevada {type} Park",
      "{city} Innovation Center",
    ],
  },
  distribution_center: {
    keyword: "distribution center",
    avgSqFt: 50000,
    energyIntensity: 6,
    roofCoverage: 0.9,
    priority: "high",
    namePatterns: [
      "{city} Distribution Center",
      "{zone} Fulfillment Center",
      "{city} Logistics Hub",
      "{zone} Shipping Center",
      "Southwest Distribution - {city}",
      "{city} Regional DC",
      "{zone} Fulfillment Operations",
      "{city} Supply Chain Center",
    ],
  },
  self_storage: {
    keyword: "self storage",
    avgSqFt: 40000,
    energyIntensity: 3,
    roofCoverage: 0.95,
    priority: "medium",
    namePatterns: [
      "{zone} Self Storage",
      "{city} Storage Units",
      "Store It {zone}",
      "{city} Mini Storage",
      "{zone} Storage Solutions",
      "Safe Storage - {city}",
      "{zone} Secure Storage",
      "{city} Storage Center",
    ],
  },
};

// Street name patterns for realistic addresses
const STREET_PATTERNS = [
  "{name} Boulevard",
  "{name} Street",
  "{name} Avenue",
  "{name} Drive",
  "{name} Way",
  "{name} Parkway",
  "{name} Road",
  "{name} Lane",
];

const STREET_NAMES = [
  "Commerce",
  "Industrial",
  "Business",
  "Corporate",
  "Enterprise",
  "Valley View",
  "Rainbow",
  "Decatur",
  "Jones",
  "Buffalo",
  "Charleston",
  "Flamingo",
  "Tropicana",
  "Sahara",
  "Sunset",
  "Eastern",
  "Maryland",
  "Warm Springs",
  "Lake Mead",
  "Craig",
  "Cheyenne",
  "Washington",
  "Liberty",
  "Freedom",
  "Pioneer",
  "Mountain View",
  "Desert Inn",
  "Spring Mountain",
  "Boulder Highway",
  "Las Vegas Blvd",
  "Paradise",
  "Swenson",
  "Pecos",
  "Stephanie",
];

// Phone number generation for Nevada (702, 725, 775 area codes)
function generateNevadaPhone(city) {
  const areaCodes = {
    "Las Vegas": ["702", "725"],
    Henderson: ["702", "725"],
    "North Las Vegas": ["702", "725"],
    Reno: ["775"],
    Sparks: ["775"],
    "Carson City": ["775"],
    Elko: ["775"],
  };

  const codes = areaCodes[city] || ["702"];
  const areaCode = codes[Math.floor(Math.random() * codes.length)];
  const exchange = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 9000) + 1000;

  return `(${areaCode}) ${exchange}-${number}`;
}

// Generate realistic property name
function generatePropertyName(propertyType, location, zone) {
  const patterns = propertyType.namePatterns;
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];

  return pattern
    .replace("{city}", location.name)
    .replace("{zone}", zone.name)
    .replace("{type}", propertyType.keyword.split(" ")[0]);
}

// Generate realistic address
function generateAddress(location, zone) {
  const streetName =
    STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)];
  const streetPattern =
    STREET_PATTERNS[Math.floor(Math.random() * STREET_PATTERNS.length)];
  const street = streetPattern.replace("{name}", streetName);

  const number = Math.floor(Math.random() * 9000) + 1000;
  const fullStreet = `${number} ${street}`;

  // Add small random offset to coordinates
  const latOffset = (Math.random() - 0.5) * 0.02;
  const lngOffset = (Math.random() - 0.5) * 0.02;

  const latitude = location.center.lat + zone.offset.lat + latOffset;
  const longitude = location.center.lng + zone.offset.lng + lngOffset;

  // Generate postal code based on city
  const postalCodes = {
    "Las Vegas": [
      "89101",
      "89102",
      "89103",
      "89104",
      "89106",
      "89107",
      "89108",
      "89109",
    ],
    Henderson: ["89002", "89011", "89012", "89014", "89015", "89044", "89052"],
    "North Las Vegas": [
      "89030",
      "89031",
      "89032",
      "89033",
      "89081",
      "89084",
      "89086",
    ],
    Reno: [
      "89501",
      "89502",
      "89503",
      "89506",
      "89509",
      "89511",
      "89512",
      "89523",
    ],
    Sparks: ["89431", "89434", "89436", "89441", "89496"],
    "Carson City": ["89701", "89702", "89703", "89705", "89706"],
    Elko: ["89801", "89802", "89803"],
  };

  const cityPostalCodes = postalCodes[location.name] || ["89101"];
  const postalCode =
    cityPostalCodes[Math.floor(Math.random() * cityPostalCodes.length)];

  return {
    street: fullStreet,
    city: location.name,
    state: "NV",
    postalCode: postalCode,
    county: getCounty(location.name),
    latitude: parseFloat(latitude.toFixed(6)),
    longitude: parseFloat(longitude.toFixed(6)),
    formattedAddress: `${fullStreet}, ${location.name}, NV ${postalCode}`,
  };
}

// Get Nevada county from city name
function getCounty(city) {
  const countyMap = {
    "Las Vegas": "Clark",
    Henderson: "Clark",
    "North Las Vegas": "Clark",
    Reno: "Washoe",
    Sparks: "Washoe",
    "Carson City": "Carson City",
    Elko: "Elko",
  };
  return countyMap[city] || "Clark";
}

// Estimate roof size
function estimateRoofSize(propertyType, location) {
  const avgSqFt = propertyType.avgSqFt;
  const locationMultiplier = location.name.includes("Las Vegas") ? 1.2 : 1.0;
  const variance = 0.8 + Math.random() * 0.4;

  const estimatedBuildingSqFt = avgSqFt * locationMultiplier * variance;
  const usableRoofSqFt = estimatedBuildingSqFt * propertyType.roofCoverage;

  return {
    buildingSqFt: Math.round(estimatedBuildingSqFt),
    roofSqFt: Math.round(usableRoofSqFt),
    estimationMethod: "heuristic",
  };
}

// Estimate energy consumption
function estimateEnergyConsumption(propertyType, roofSize) {
  const buildingSqFt = roofSize.buildingSqFt;
  const annualKwh = buildingSqFt * propertyType.energyIntensity;
  const monthlyKwh = annualKwh / 12;

  const avgRatePerKwh = 0.12;
  const monthlyBill = monthlyKwh * avgRatePerKwh;
  const annualBill = annualKwh * avgRatePerKwh;

  return {
    annualKwh: Math.round(annualKwh),
    monthlyKwh: Math.round(monthlyKwh),
    monthlyBill: Math.round(monthlyBill),
    annualBill: Math.round(annualBill),
    energyRate: avgRatePerKwh,
    estimationMethod: "industry_average",
  };
}

// Calculate solar system
function calculateSolarSystem(energyConsumption, roofSize) {
  const annualKwh = energyConsumption.annualKwh;
  const roofSqFt = roofSize.roofSqFt;

  const panelWattage = 400;
  const panelSqFt = 17.5;
  const maxPanels = Math.floor(roofSqFt / panelSqFt);

  const panelsNeeded = Math.ceil(annualKwh / 500);
  const recommendedPanels = Math.min(panelsNeeded, maxPanels);

  const systemSizeKw = (recommendedPanels * panelWattage) / 1000;
  const annualProductionKwh = recommendedPanels * 500;
  const offsetPercentage = Math.min(
    (annualProductionKwh / annualKwh) * 100,
    100,
  );

  const costPerWatt = 2.5;
  const systemCost = systemSizeKw * 1000 * costPerWatt;

  const itcPercentage = 0.4;
  const federalTaxCredit = systemCost * itcPercentage;
  const netCost = systemCost - federalTaxCredit;

  const annualSavings = annualProductionKwh * energyConsumption.energyRate;
  const monthlySavings = annualSavings / 12;
  const paybackYears = netCost / annualSavings;

  return {
    recommendedPanels,
    systemSizeKw: Math.round(systemSizeKw * 10) / 10,
    annualProductionKwh: Math.round(annualProductionKwh),
    offsetPercentage: Math.round(offsetPercentage),
    systemCost: Math.round(systemCost),
    federalTaxCredit: Math.round(federalTaxCredit),
    netCost: Math.round(netCost),
    annualSavings: Math.round(annualSavings),
    monthlySavings: Math.round(monthlySavings),
    paybackYears: Math.round(paybackYears * 10) / 10,
    maxPanelCapacity: maxPanels,
  };
}

// Calculate lead score
function calculateLeadScore(solarSystem, roofSize, hasContact) {
  let score = 0;

  if (solarSystem.systemSizeKw > 100) score += 30;
  else if (solarSystem.systemSizeKw > 50) score += 25;
  else if (solarSystem.systemSizeKw > 25) score += 20;
  else score += 10;

  if (solarSystem.paybackYears < 5) score += 30;
  else if (solarSystem.paybackYears < 7) score += 25;
  else if (solarSystem.paybackYears < 10) score += 20;
  else score += 10;

  if (solarSystem.annualSavings > 50000) score += 25;
  else if (solarSystem.annualSavings > 25000) score += 20;
  else if (solarSystem.annualSavings > 10000) score += 15;
  else score += 10;

  score += 10; // Business status operational

  if (hasContact) score += 5;

  return Math.min(score, 100);
}

// Generate unique place ID
function generatePlaceId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "ChIJ";
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Generate commercial properties for a specific location
 */
export function generatePropertiesForLocation(
  location,
  propertyType,
  count = 10,
) {
  const properties = [];

  for (const zone of location.zones) {
    const propertiesPerZone = Math.ceil(count / location.zones.length);

    for (let i = 0; i < propertiesPerZone && properties.length < count; i++) {
      const propertyName = generatePropertyName(propertyType, location, zone);
      const address = generateAddress(location, zone);
      const roofSize = estimateRoofSize(propertyType, location);
      const energyConsumption = estimateEnergyConsumption(
        propertyType,
        roofSize,
      );
      const solarSystem = calculateSolarSystem(energyConsumption, roofSize);

      const hasPhone = Math.random() > 0.2; // 80% have phone
      const hasWebsite = Math.random() > 0.6; // 40% have website

      const property = {
        propertyName,
        placeId: generatePlaceId(),
        propertyType: propertyType.keyword,
        priority: propertyType.priority,

        address,

        contact: {
          phone: hasPhone ? generateNevadaPhone(location.name) : null,
          website: hasWebsite
            ? `https://www.${propertyName.toLowerCase().replace(/\s+/g, "")}.com`
            : null,
        },

        metrics: {
          buildingSqFt: roofSize.buildingSqFt,
          roofSqFt: roofSize.roofSqFt,
          estimationMethod: roofSize.estimationMethod,
        },

        energyProfile: {
          annualKwh: energyConsumption.annualKwh,
          monthlyKwh: energyConsumption.monthlyKwh,
          monthlyBill: energyConsumption.monthlyBill,
          annualBill: energyConsumption.annualBill,
          energyRate: energyConsumption.energyRate,
          estimationMethod: energyConsumption.estimationMethod,
        },

        solarSystem,

        leadScore: calculateLeadScore(
          solarSystem,
          roofSize,
          hasPhone || hasWebsite,
        ),

        businessStatus: "OPERATIONAL",
        rating: hasWebsite ? 3.5 + Math.random() * 1.5 : null,
        reviewCount: hasWebsite ? Math.floor(Math.random() * 200) : null,
        scrapedAt: new Date().toISOString(),
      };

      properties.push(property);
    }
  }

  return properties;
}

/**
 * Generate all Nevada commercial properties
 */
export function generateAllNevadaProperties(propertiesPerType = 12) {
  const allProperties = [];

  for (const location of NEVADA_LOCATIONS) {
    for (const [typeKey, propertyType] of Object.entries(PROPERTY_TYPES)) {
      const properties = generatePropertiesForLocation(
        location,
        propertyType,
        propertiesPerType,
      );
      allProperties.push(...properties);

      console.log(
        `✓ Generated ${properties.length} ${propertyType.keyword} in ${location.name}`,
      );
    }
  }

  // Sort by lead score
  allProperties.sort((a, b) => b.leadScore - a.leadScore);

  return allProperties;
}

/**
 * Generate specific number of properties with distribution across types/locations
 */
export function generateProperties(targetCount = 500) {
  const properties = [];
  const typeCount = Object.keys(PROPERTY_TYPES).length;
  const locationCount = NEVADA_LOCATIONS.length;

  // Calculate how many per type per location
  const perTypePerLocation = Math.ceil(
    targetCount / (typeCount * locationCount),
  );

  console.log(`Generating ${targetCount} properties...`);
  console.log(`Target: ${perTypePerLocation} per property type per location\n`);

  for (const location of NEVADA_LOCATIONS) {
    console.log(`📍 ${location.name}:`);

    for (const [typeKey, propertyType] of Object.entries(PROPERTY_TYPES)) {
      const props = generatePropertiesForLocation(
        location,
        propertyType,
        perTypePerLocation,
      );
      properties.push(...props);

      console.log(`   ✓ ${propertyType.keyword}: ${props.length} properties`);

      // Stop if we've reached target
      if (properties.length >= targetCount) {
        break;
      }
    }

    if (properties.length >= targetCount) {
      break;
    }
  }

  // Trim to exact target
  const finalProperties = properties.slice(0, targetCount);

  console.log(`\n✅ Generated ${finalProperties.length} total properties`);

  // Sort by lead score
  finalProperties.sort((a, b) => b.leadScore - a.leadScore);

  return finalProperties;
}

export { NEVADA_LOCATIONS, PROPERTY_TYPES };
