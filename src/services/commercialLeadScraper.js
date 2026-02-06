/**
 * Commercial Lead Scraper Service
 * Scrapes commercial properties in Nevada using Google Places API
 */

// Support both Vite (import.meta.env) and Node.js (process.env)
const GOOGLE_MAPS_API_KEY =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    : process.env.VITE_GOOGLE_MAPS_API_KEY;

// Nevada major cities and regions to search
const NEVADA_LOCATIONS = [
  { name: "Las Vegas", center: { lat: 36.1699, lng: -115.1398 } },
  { name: "Henderson", center: { lat: 36.0395, lng: -114.9817 } },
  { name: "North Las Vegas", center: { lat: 36.1989, lng: -115.1175 } },
  { name: "Reno", center: { lat: 39.5296, lng: -119.8138 } },
  { name: "Sparks", center: { lat: 39.5349, lng: -119.7527 } },
  { name: "Carson City", center: { lat: 39.1638, lng: -119.7674 } },
  { name: "Elko", center: { lat: 40.8324, lng: -115.7631 } },
];

// Commercial property types with typical energy profiles
const PROPERTY_TYPES = {
  warehouse: {
    keyword: "warehouse",
    avgSqFt: 15000,
    energyIntensity: 5.5, // kWh/sqft/year (low due to minimal HVAC)
    roofCoverage: 0.85, // 85% usable roof space
    priority: "high",
  },
  retail_center: {
    keyword: "shopping center",
    avgSqFt: 25000,
    energyIntensity: 18, // kWh/sqft/year (high due to lighting, HVAC)
    roofCoverage: 0.7,
    priority: "high",
  },
  office_building: {
    keyword: "office building",
    avgSqFt: 20000,
    energyIntensity: 15, // kWh/sqft/year (moderate)
    roofCoverage: 0.65,
    priority: "medium",
  },
  industrial_park: {
    keyword: "industrial park",
    avgSqFt: 30000,
    energyIntensity: 12, // kWh/sqft/year
    roofCoverage: 0.8,
    priority: "high",
  },
  distribution_center: {
    keyword: "distribution center",
    avgSqFt: 50000,
    energyIntensity: 6, // kWh/sqft/year
    roofCoverage: 0.9,
    priority: "high",
  },
  self_storage: {
    keyword: "self storage",
    avgSqFt: 40000,
    energyIntensity: 3, // kWh/sqft/year (very low)
    roofCoverage: 0.95,
    priority: "medium",
  },
};

/**
 * Search for commercial properties using Google Places API
 */
export async function searchCommercialProperties(
  location,
  propertyType,
  radius = 5000,
) {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
  );
  url.searchParams.set(
    "location",
    `${location.center.lat},${location.center.lng}`,
  );
  url.searchParams.set("radius", radius);
  url.searchParams.set("keyword", propertyType.keyword);
  url.searchParams.set("type", "establishment");
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  return data.results || [];
}

/**
 * Get detailed property information
 */
export async function getPropertyDetails(placeId) {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,formatted_address,geometry,formatted_phone_number,website,business_status,types,rating,user_ratings_total",
  );
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Places Details API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(`Google Places Details API error: ${data.status}`);
  }

  return data.result;
}

/**
 * Estimate roof size using building footprint heuristics
 * This is a fallback when Google Solar API data isn't available
 */
export function estimateRoofSize(propertyType, location) {
  // Base estimation on typical property sizes
  const avgSqFt = propertyType.avgSqFt;

  // Add location-based variance (Vegas properties tend to be larger)
  const locationMultiplier = location.name.includes("Las Vegas") ? 1.2 : 1.0;

  // Random variance ±20%
  const variance = 0.8 + Math.random() * 0.4;

  const estimatedBuildingSqFt = avgSqFt * locationMultiplier * variance;
  const usableRoofSqFt = estimatedBuildingSqFt * propertyType.roofCoverage;

  return {
    buildingSqFt: Math.round(estimatedBuildingSqFt),
    roofSqFt: Math.round(usableRoofSqFt),
    estimationMethod: "heuristic",
  };
}

/**
 * Estimate annual energy consumption based on property type and size
 */
export function estimateEnergyConsumption(propertyType, roofSize) {
  const buildingSqFt = roofSize.buildingSqFt;
  const annualKwh = buildingSqFt * propertyType.energyIntensity;
  const monthlyKwh = annualKwh / 12;

  // Nevada commercial electricity rates average ~$0.12/kWh
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

/**
 * Calculate solar system sizing and ROI
 */
export function calculateSolarSystem(energyConsumption, roofSize) {
  const annualKwh = energyConsumption.annualKwh;
  const roofSqFt = roofSize.roofSqFt;

  // Panel specs: 400W panels, 17.5 sqft each
  const panelWattage = 400;
  const panelSqFt = 17.5;
  const maxPanels = Math.floor(roofSqFt / panelSqFt);

  // Target 100% offset
  const panelsNeeded = Math.ceil(annualKwh / 500); // ~500 kWh/year per panel in Nevada
  const recommendedPanels = Math.min(panelsNeeded, maxPanels);

  const systemSizeKw = (recommendedPanels * panelWattage) / 1000;
  const annualProductionKwh = recommendedPanels * 500;
  const offsetPercentage = Math.min(
    (annualProductionKwh / annualKwh) * 100,
    100,
  );

  // Pricing: ~$2.50/W for commercial
  const costPerWatt = 2.5;
  const systemCost = systemSizeKw * 1000 * costPerWatt;

  // Federal ITC: 30% base + 10% energy community bonus for Nevada
  const itcPercentage = 0.4; // 40% for energy communities
  const federalTaxCredit = systemCost * itcPercentage;
  const netCost = systemCost - federalTaxCredit;

  // Savings calculation
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

/**
 * Scrape commercial properties for a specific location and property type
 */
export async function scrapeLocation(location, propertyType, maxResults = 20) {
  console.log(`Scraping ${propertyType.keyword} in ${location.name}...`);

  const properties = [];
  const places = await searchCommercialProperties(location, propertyType);

  for (let i = 0; i < Math.min(places.length, maxResults); i++) {
    const place = places[i];

    try {
      // Get detailed information
      const details = await getPropertyDetails(place.place_id);

      // Estimate property metrics
      const roofSize = estimateRoofSize(propertyType, location);
      const energyConsumption = estimateEnergyConsumption(
        propertyType,
        roofSize,
      );
      const solarSystem = calculateSolarSystem(energyConsumption, roofSize);

      // Parse address components
      const addressParts = details.formatted_address.split(", ");
      const state =
        addressParts[addressParts.length - 2]?.split(" ")[0] || "NV";
      const postalCode =
        addressParts[addressParts.length - 2]?.split(" ")[1] || "";
      const city = addressParts[addressParts.length - 3] || location.name;
      const street = addressParts.slice(0, -2).join(", ");

      properties.push({
        // Property identification
        propertyName: details.name,
        placeId: place.place_id,
        propertyType: propertyType.keyword,
        priority: propertyType.priority,

        // Address
        address: {
          street,
          city,
          state,
          postalCode,
          county: getCounty(city), // Helper function
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
          formattedAddress: details.formatted_address,
        },

        // Contact information
        contact: {
          phone: details.formatted_phone_number || null,
          website: details.website || null,
        },

        // Property metrics
        metrics: {
          buildingSqFt: roofSize.buildingSqFt,
          roofSqFt: roofSize.roofSqFt,
          estimationMethod: roofSize.estimationMethod,
        },

        // Energy data
        energyProfile: {
          annualKwh: energyConsumption.annualKwh,
          monthlyKwh: energyConsumption.monthlyKwh,
          monthlyBill: energyConsumption.monthlyBill,
          annualBill: energyConsumption.annualBill,
          energyRate: energyConsumption.energyRate,
          estimationMethod: energyConsumption.estimationMethod,
        },

        // Solar system design
        solarSystem: {
          recommendedPanels: solarSystem.recommendedPanels,
          systemSizeKw: solarSystem.systemSizeKw,
          annualProductionKwh: solarSystem.annualProductionKwh,
          offsetPercentage: solarSystem.offsetPercentage,
          systemCost: solarSystem.systemCost,
          federalTaxCredit: solarSystem.federalTaxCredit,
          netCost: solarSystem.netCost,
          annualSavings: solarSystem.annualSavings,
          monthlySavings: solarSystem.monthlySavings,
          paybackYears: solarSystem.paybackYears,
          maxPanelCapacity: solarSystem.maxPanelCapacity,
        },

        // Lead scoring
        leadScore: calculateLeadScore(solarSystem, roofSize, details),

        // Metadata
        businessStatus: details.business_status,
        rating: details.rating || null,
        reviewCount: details.user_ratings_total || null,
        scrapedAt: new Date().toISOString(),
      });

      // Delay to respect API rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error processing ${place.name}:`, error.message);
    }
  }

  return properties;
}

/**
 * Calculate lead score (0-100) based on solar potential
 */
function calculateLeadScore(solarSystem, roofSize, details) {
  let score = 0;

  // System size (0-30 points)
  if (solarSystem.systemSizeKw > 100) score += 30;
  else if (solarSystem.systemSizeKw > 50) score += 25;
  else if (solarSystem.systemSizeKw > 25) score += 20;
  else score += 10;

  // ROI (0-30 points)
  if (solarSystem.paybackYears < 5) score += 30;
  else if (solarSystem.paybackYears < 7) score += 25;
  else if (solarSystem.paybackYears < 10) score += 20;
  else score += 10;

  // Annual savings (0-25 points)
  if (solarSystem.annualSavings > 50000) score += 25;
  else if (solarSystem.annualSavings > 25000) score += 20;
  else if (solarSystem.annualSavings > 10000) score += 15;
  else score += 10;

  // Business status (0-10 points)
  if (details.business_status === "OPERATIONAL") score += 10;
  else score += 5;

  // Contact info availability (0-5 points)
  if (details.formatted_phone_number || details.website) score += 5;

  return Math.min(score, 100);
}

/**
 * Get Nevada county from city name
 */
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

/**
 * Scrape all Nevada locations and property types
 */
export async function scrapeAllNevada(propertiesPerType = 10) {
  const allProperties = [];

  for (const location of NEVADA_LOCATIONS) {
    for (const [typeKey, propertyType] of Object.entries(PROPERTY_TYPES)) {
      const properties = await scrapeLocation(
        location,
        propertyType,
        propertiesPerType,
      );
      allProperties.push(...properties);

      console.log(
        `✓ Found ${properties.length} ${propertyType.keyword} in ${location.name}`,
      );
    }
  }

  // Sort by lead score
  allProperties.sort((a, b) => b.leadScore - a.leadScore);

  return allProperties;
}

export { NEVADA_LOCATIONS, PROPERTY_TYPES };
