// Google Solar API Service
// Uses Building Insights API to design solar + battery systems

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const SOLAR_API_BASE = "https://solar.googleapis.com/v1";

// Premium panel specifications (410W residential panel)
const SOLRITE_PANEL = {
  wattage: 410, // 410W per panel
  efficiency: 0.21, // 21% efficiency
  width: 1.134, // meters
  height: 2.278, // meters
  area: 2.58, // square meters
  brand: "Premium", // High-efficiency residential panels
};

// Duracell PowerCenter Hybrid battery specifications
// Every customer receives 60 kWh of storage
// See: https://duracellpowercenter.com/storage-collection/powercenter-hybrid/
const BATTERY_SPECS = {
  brand: "Duracell PowerCenter Hybrid",
  totalCapacityKwh: 60, // 60 kWh total per install
  peakPowerKw: 15.0, // Combined peak power output
  warranty: "10-year warranty",
  features: [
    "Whole-home backup",
    "Smart load management",
    "Grid-tied with backup",
    "EV charging ready",
  ],
};

/**
 * Get building insights from Google Solar API
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<object>} Building insights data
 */
export async function getBuildingInsights(latitude, longitude) {
  const url = `${SOLAR_API_BASE}/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&requiredQuality=HIGH&key=${GOOGLE_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Solar API error:", error);

    // Handle specific error cases
    if (response.status === 404) {
      throw new Error(
        "Solar data not available for this location. The property may not have imagery coverage.",
      );
    }
    if (response.status === 400) {
      throw new Error("Invalid location coordinates.");
    }
    throw new Error(error.error?.message || "Failed to fetch solar data");
  }

  return response.json();
}

/**
 * Calculate system design based on usage and solar potential
 * @param {object} buildingInsights - From Google Solar API
 * @param {number} annualUsageKwh - Annual electricity usage in kWh
 * @param {number} targetOffset - Target offset percentage (default 105%)
 * @returns {object} System design specifications
 */
export function calculateSystemDesign(
  buildingInsights,
  annualUsageKwh,
  targetOffset = 1.05,
) {
  const solarPotential = buildingInsights.solarPotential;

  if (!solarPotential) {
    throw new Error("No solar potential data available for this property");
  }

  // Target production (105% of usage)
  const targetProductionKwh = annualUsageKwh * targetOffset;

  // Get roof panel capacity info
  const maxPanelCount = solarPotential.maxArrayPanelsCount || 0;
  const maxSunshineHours = solarPotential.maxSunshineHoursPerYear || 1600;

  // Find the best panel configuration that meets our target
  // The API returns solarPanelConfigs sorted by panel count
  const configs = solarPotential.solarPanelConfigs || [];

  let selectedConfig = null;
  let panelCount = 0;
  let estimatedProductionKwh = 0;

  // Calculate production per panel based on location
  // Using average sun hours and panel wattage
  const productionPerPanel =
    (SOLRITE_PANEL.wattage * maxSunshineHours * 0.8) / 1000; // 80% real-world efficiency

  // Calculate required panels for 105% offset
  panelCount = Math.ceil(targetProductionKwh / productionPerPanel);

  // Cap at max panels that fit on roof
  if (panelCount > maxPanelCount) {
    panelCount = maxPanelCount;
  }

  // Ensure minimum viable system
  if (panelCount < 4) {
    panelCount = 4;
  }

  estimatedProductionKwh = panelCount * productionPerPanel;

  // Find matching config from API for financial data
  for (const config of configs) {
    if (config.panelsCount >= panelCount) {
      selectedConfig = config;
      break;
    }
  }

  // If no exact match, use the largest available
  if (!selectedConfig && configs.length > 0) {
    selectedConfig = configs[configs.length - 1];
  }

  // Calculate system size in kW
  const systemSizeKw = (panelCount * SOLRITE_PANEL.wattage) / 1000;

  // Calculate actual offset percentage
  const actualOffset = (estimatedProductionKwh / annualUsageKwh) * 100;

  // Roof area calculation
  const roofArea = solarPotential.wholeRoofStats?.areaMeters2 || 0;
  const panelArea = panelCount * SOLRITE_PANEL.area;

  // Carbon offset (EPA average: 0.855 lbs CO2 per kWh)
  const carbonOffsetLbs = estimatedProductionKwh * 0.855;
  const carbonOffsetTons = carbonOffsetLbs / 2000;

  return {
    // Panel configuration
    panels: {
      count: panelCount,
      wattage: SOLRITE_PANEL.wattage,
      totalWatts: panelCount * SOLRITE_PANEL.wattage,
      systemSizeKw: systemSizeKw,
      brand: "Premium",
    },

    // Duracell PowerCenter Hybrid battery configuration
    // Every customer receives 60 kWh of storage
    batteries: {
      brand: BATTERY_SPECS.brand,
      totalCapacityKwh: BATTERY_SPECS.totalCapacityKwh,
      peakPowerKw: BATTERY_SPECS.peakPowerKw,
      warranty: BATTERY_SPECS.warranty,
      features: BATTERY_SPECS.features,
    },

    // Production estimates
    production: {
      annualKwh: Math.round(estimatedProductionKwh),
      monthlyKwh: Math.round(estimatedProductionKwh / 12),
      dailyKwh: Math.round((estimatedProductionKwh / 365) * 10) / 10,
    },

    // Usage and offset
    usage: {
      annualKwh: annualUsageKwh,
      monthlyKwh: Math.round(annualUsageKwh / 12),
      targetOffset: targetOffset * 100,
      actualOffset: Math.round(actualOffset),
    },

    // Roof data
    roof: {
      totalAreaSqFt: Math.round(roofArea * 10.764), // m2 to sqft
      panelAreaSqFt: Math.round(panelArea * 10.764),
      utilizationPercent: Math.round((panelArea / roofArea) * 100) || 0,
      maxPanelsCapacity: maxPanelCount,
      sunshineHoursPerYear: Math.round(maxSunshineHours),
    },

    // Environmental impact
    environmental: {
      carbonOffsetTonsPerYear: Math.round(carbonOffsetTons * 10) / 10,
      treesEquivalent: Math.round(carbonOffsetTons * 16.5), // EPA tree equivalency
      milesNotDriven: Math.round(carbonOffsetLbs / 0.89), // EPA average car
    },

    // Building center (more accurate than address coordinates)
    buildingCenter: buildingInsights.center,

    // Panel dimensions from API (in meters)
    panelDimensions: {
      heightMeters: solarPotential.panelHeightMeters || 1.65,
      widthMeters: solarPotential.panelWidthMeters || 0.99,
      capacityWatts: solarPotential.panelCapacityWatts || 400,
    },

    // Individual solar panel positions from API (ALL panels for visualization)
    solarPanels: (() => {
      const panels = solarPotential.solarPanels || [];
      console.log(
        "Raw solarPanels from API:",
        panels.length,
        "total panels available",
      );
      console.log("Using panelCount:", panelCount);
      return panels.map((panel) => ({
        center: panel.center,
        orientation: panel.orientation, // LANDSCAPE or PORTRAIT
        segmentIndex: panel.segmentIndex,
        yearlyEnergyDcKwh: panel.yearlyEnergyDcKwh,
      }));
    })(),

    // How many panels we're actually using for this system
    panelsUsed: panelCount,

    // Roof segments for reference (orientation data)
    roofSegments: (solarPotential.roofSegmentStats || []).map((segment) => {
      const area = segment.stats?.areaMeters2 || segment.areaMeters2 || 0;
      return {
        center: segment.center,
        boundingBox: segment.boundingBox,
        pitchDegrees: segment.pitchDegrees,
        azimuthDegrees: segment.azimuthDegrees,
        areaMeters2: area,
      };
    }),

    // Raw API data for reference
    _apiConfig: selectedConfig,
    _buildingInsights: {
      imageryDate: buildingInsights.imageryDate,
      imageryQuality: buildingInsights.imageryQuality,
      center: buildingInsights.center,
    },
  };
}

/**
 * Design complete solar + battery system for a property
 * @param {number} latitude - Property latitude
 * @param {number} longitude - Property longitude
 * @param {number} annualUsageKwh - Annual electricity usage (default 12000 kWh)
 * @param {number} targetOffset - Target offset percentage (default 1.0 = 100%)
 * @returns {Promise<object>} Complete system design
 */
export async function designSolarSystem(
  latitude,
  longitude,
  annualUsageKwh = 12000,
  targetOffset = 1.0,
) {
  // Get building insights from Google
  const buildingInsights = await getBuildingInsights(latitude, longitude);

  // Calculate system design for specified offset (default 100%)
  const systemDesign = calculateSystemDesign(
    buildingInsights,
    annualUsageKwh,
    targetOffset,
  );

  return systemDesign;
}

/**
 * Get estimated monthly bill savings
 * @param {number} productionKwh - Monthly production in kWh
 * @param {number} electricityRate - Rate per kWh (default $0.12)
 * @returns {object} Savings estimate
 */
export function calculateSavings(productionKwh, electricityRate = 0.12) {
  const monthlySavings = productionKwh * electricityRate;
  const annualSavings = monthlySavings * 12;

  return {
    monthly: Math.round(monthlySavings),
    annual: Math.round(annualSavings),
    lifetime25Year: Math.round(annualSavings * 25 * 0.95), // Account for degradation
  };
}

/**
 * Get data layers (imagery) from Google Solar API
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} radiusMeters - Radius around the point (default 50m)
 * @returns {Promise<object>} Data layers URLs
 */
export async function getDataLayers(
  latitude,
  longitude,
  radiusMeters = 50,
  pixelSizeMeters = 0.1,
) {
  const url = `${SOLAR_API_BASE}/dataLayers:get?location.latitude=${latitude}&location.longitude=${longitude}&radiusMeters=${radiusMeters}&view=FULL_LAYERS&requiredQuality=HIGH&pixelSizeMeters=${pixelSizeMeters}&key=${GOOGLE_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Solar Data Layers API error:", error);
    throw new Error(error.error?.message || "Failed to fetch solar imagery");
  }

  return response.json();
}

/**
 * Get a GeoTiff image URL with API key appended
 * @param {string} url - The base URL from data layers
 * @returns {string} URL with API key
 */
export function getImageUrl(url) {
  if (!url) return null;
  return `${url}&key=${GOOGLE_API_KEY}`;
}

/**
 * Fetch and decode RGB GeoTIFF from Solar API
 * @param {string} rgbUrl - The RGB URL from getDataLayers
 * @returns {Promise<{imageData: ImageData, bounds: number[], width: number, height: number}>}
 */
export async function fetchRgbImagery(rgbUrl) {
  const { fromArrayBuffer } = await import("geotiff");

  const url = getImageUrl(rgbUrl);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch Solar API imagery");
  }

  const arrayBuffer = await response.arrayBuffer();
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();

  // Get geographic bounds [minX, minY, maxX, maxY] in UTM
  const bounds = image.getBoundingBox();
  const width = image.getWidth();
  const height = image.getHeight();

  // Read RGB rasters - returns array of typed arrays [R, G, B]
  const [r, g, b] = await image.readRasters();

  // Convert to ImageData format (RGBA interleaved)
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = r[i];
    rgba[i * 4 + 1] = g[i];
    rgba[i * 4 + 2] = b[i];
    rgba[i * 4 + 3] = 255; // Alpha
  }

  return {
    imageData: new ImageData(rgba, width, height),
    bounds,
    width,
    height,
  };
}

/**
 * Fetch and decode flux GeoTIFF from Solar API
 * Returns annual solar flux in kWh/kW/year for each pixel
 * @param {string} fluxUrl - The annualFluxUrl from getDataLayers
 * @returns {Promise<{data: Float32Array, bounds: number[], width: number, height: number}>}
 */
export async function fetchFluxData(fluxUrl) {
  const { fromArrayBuffer } = await import("geotiff");

  const url = getImageUrl(fluxUrl);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch Solar API flux data");
  }

  const arrayBuffer = await response.arrayBuffer();
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();

  const bounds = image.getBoundingBox();
  const width = image.getWidth();
  const height = image.getHeight();

  // Read flux data - single band of float values (kWh/kW/year)
  const [fluxData] = await image.readRasters();

  return {
    data: fluxData,
    bounds,
    width,
    height,
  };
}

/**
 * Calculate production for each panel based on flux data
 * @param {Array} panels - Array of panel objects with center coordinates
 * @param {Object} fluxData - Flux data from fetchFluxData
 * @param {Object} panelDimensions - Panel dimensions in meters
 * @param {number} panelWattage - Panel wattage (e.g., 400)
 * @param {Function} latLngToUtm - Function to convert lat/lng to UTM
 * @returns {Array} Panels with production estimates, sorted by production (highest first)
 */
export function calculatePanelProduction(
  panels,
  fluxData,
  panelDimensions,
  panelWattage,
  latLngToUtm,
) {
  const { data, bounds, width, height } = fluxData;
  const [minX, minY, maxX, maxY] = bounds;

  // Panel capacity in kW
  const panelKw = panelWattage / 1000;

  const panelsWithProduction = panels.map((panel, index) => {
    if (!panel.center?.latitude || !panel.center?.longitude) {
      return { ...panel, index, annualProductionKwh: 0, fluxValue: 0 };
    }

    // Convert panel center to UTM
    const [utmX, utmY] = latLngToUtm(
      panel.center.longitude,
      panel.center.latitude,
    );

    // Convert UTM to pixel position in flux data
    const pixelX = Math.floor(((utmX - minX) / (maxX - minX)) * width);
    const pixelY = Math.floor(((maxY - utmY) / (maxY - minY)) * height);

    // Get flux value at this pixel (kWh/kW/year)
    let fluxValue = 0;
    if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
      const pixelIndex = pixelY * width + pixelX;
      fluxValue = data[pixelIndex] || 0;
    }

    // Calculate annual production: flux (kWh/kW/year) × panel capacity (kW)
    // Apply 10% system loss factor (90% efficiency)
    // This accounts for inverter losses, wiring, soiling, etc.
    const systemEfficiency = 0.9;
    const annualProductionKwh = fluxValue * panelKw * systemEfficiency;

    return {
      ...panel,
      index,
      fluxValue: Math.round(fluxValue),
      annualProductionKwh: Math.round(annualProductionKwh),
    };
  });

  // Sort by production (highest first) for optimal panel selection
  return panelsWithProduction.sort(
    (a, b) => b.annualProductionKwh - a.annualProductionKwh,
  );
}

/**
 * Calculate optimal panel count to achieve target offset
 * Uses flux-based production with 10% loss factor
 * @param {Array} sortedPanels - Panels sorted by production (highest first)
 * @param {number} annualConsumptionKwh - Annual consumption in kWh
 * @param {number} targetOffset - Target offset (1.0 = 100%)
 * @returns {Object} Optimal configuration
 */
export function calculateOptimalPanelCount(
  sortedPanels,
  annualConsumptionKwh,
  targetOffset = 1.0,
) {
  const targetProductionKwh = annualConsumptionKwh * targetOffset;
  let cumulativeProduction = 0;
  let optimalCount = 0;

  // Add panels one by one (highest production first) until we reach target
  for (let i = 0; i < sortedPanels.length; i++) {
    cumulativeProduction += sortedPanels[i].annualProductionKwh;
    optimalCount = i + 1;

    if (cumulativeProduction >= targetProductionKwh) {
      break;
    }
  }

  // Ensure minimum of 4 panels
  optimalCount = Math.max(optimalCount, 4);

  // Recalculate production with optimal count
  const finalProduction = sortedPanels
    .slice(0, optimalCount)
    .reduce((sum, p) => sum + p.annualProductionKwh, 0);

  const actualOffset = (finalProduction / annualConsumptionKwh) * 100;

  return {
    optimalCount,
    annualProductionKwh: finalProduction,
    actualOffset: Math.round(actualOffset),
    targetOffset: targetOffset * 100,
    panels: sortedPanels.slice(0, optimalCount),
  };
}

/**
 * Calculate monthly production distribution based on typical solar curve
 * Uses latitude to adjust for seasonal variation
 * @param {number} annualProductionKwh - Total annual production
 * @param {number} latitude - Location latitude
 * @returns {Array} Monthly production values
 */
export function calculateMonthlyProduction(annualProductionKwh, latitude) {
  // Seasonal factors based on latitude (Northern Hemisphere)
  // These represent relative sun hours per month
  const baseFactors = [
    0.055, // January
    0.065, // February
    0.085, // March
    0.095, // April
    0.105, // May
    0.11, // June
    0.115, // July
    0.11, // August
    0.095, // September
    0.08, // October
    0.055, // November
    0.05, // December
  ];

  // Adjust factors based on latitude (more variation at higher latitudes)
  const latitudeFactor = Math.min(Math.abs(latitude) / 45, 1);
  const adjustedFactors = baseFactors.map((factor, i) => {
    // Months 4-8 (May-Sep) get boosted, winter months reduced at higher latitudes
    const monthOffset = Math.abs(i - 6); // Distance from July
    const adjustment = (6 - monthOffset) * 0.01 * latitudeFactor;
    return factor + adjustment;
  });

  // Normalize factors to sum to 1
  const totalFactor = adjustedFactors.reduce((a, b) => a + b, 0);
  const normalizedFactors = adjustedFactors.map((f) => f / totalFactor);

  // Calculate monthly production
  const monthNames = [
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

  return monthNames.map((month, i) => ({
    month,
    productionKwh: Math.round(annualProductionKwh * normalizedFactors[i]),
  }));
}

// Named exports for direct import
export { SOLRITE_PANEL, BATTERY_SPECS };

export default {
  getBuildingInsights,
  calculateSystemDesign,
  designSolarSystem,
  calculateSavings,
  getDataLayers,
  getImageUrl,
  fetchRgbImagery,
  fetchFluxData,
  calculatePanelProduction,
  calculateOptimalPanelCount,
  calculateMonthlyProduction,
  SOLRITE_PANEL,
  BATTERY_SPECS,
};
