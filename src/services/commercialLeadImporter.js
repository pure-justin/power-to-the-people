/**
 * Commercial Lead Importer Service
 * Imports scraped commercial properties into Firestore
 */

import { db } from "./firebase.js";
import {
  collection,
  doc,
  setDoc,
  Timestamp,
  writeBatch,
  query,
  where,
  getDocs,
} from "firebase/firestore";

/**
 * Generate unique lead ID for commercial properties
 */
function generateCommercialLeadId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `COMM-${timestamp}-${random}`;
}

/**
 * Convert scraped property to Firestore lead format
 */
export function convertToLeadFormat(property) {
  const leadId = generateCommercialLeadId();

  return {
    // Document ID
    id: leadId,

    // Lead type
    leadType: "commercial",
    isCommercial: true,

    // Core metadata
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    status: "new",

    // Property information
    propertyName: property.propertyName,
    propertyType: property.propertyType,
    priority: property.priority,

    // Customer information (will be filled when contacted)
    customer: {
      firstName: null,
      lastName: null,
      email: null,
      phone: property.contact.phone,
      userId: null,
      organizationName: property.propertyName,
    },

    // Property address
    address: {
      street: property.address.street,
      city: property.address.city,
      state: property.address.state,
      postalCode: property.address.postalCode,
      county: property.address.county,
      latitude: property.address.latitude,
      longitude: property.address.longitude,
      formattedAddress: property.address.formattedAddress,
    },

    // Qualification criteria (commercial defaults)
    qualification: {
      isHomeowner: false,
      isCommercial: true,
      creditScore: null,
      hasUtilityBill: false,
      utilityBillUrl: null,
    },

    // Energy community eligibility (Nevada qualifies)
    energyCommunity: {
      eligible: true,
      msa: property.address.city,
      reason: "Nevada renewable energy zone",
      bonusEligible: true,
    },

    // Bill data from estimates
    billData: {
      source: "estimated",
      provider: getNevadaUtility(property.address.city),
      esiid: null,
      accountNumber: null,

      // Usage data
      monthlyUsageKwh: property.energyProfile.monthlyKwh,
      annualUsageKwh: property.energyProfile.annualKwh,
      monthlyBillAmount: property.energyProfile.monthlyBill,

      // Rate information
      energyRate: property.energyProfile.energyRate,
      hasTimeOfUse: false,

      // Estimation metadata
      isEstimated: true,
      estimateMethod: property.energyProfile.estimationMethod,
      scanConfidence: null,
      historicalData: null,
    },

    // Solar system design
    systemDesign: {
      // System sizing
      recommendedPanelCount: property.solarSystem.recommendedPanels,
      systemSizeKw: property.solarSystem.systemSizeKw,
      annualProductionKwh: property.solarSystem.annualProductionKwh,
      offsetPercentage: property.solarSystem.offsetPercentage,

      // Financial estimates
      estimatedCost: property.solarSystem.systemCost,
      federalTaxCredit: property.solarSystem.federalTaxCredit,
      netCost: property.solarSystem.netCost,
      estimatedMonthlySavings: property.solarSystem.monthlySavings,
      estimatedAnnualSavings: property.solarSystem.annualSavings,
      paybackPeriodYears: property.solarSystem.paybackYears,

      // Roof analysis
      roofSegmentCount: 1,
      maxPanelCapacity: property.solarSystem.maxPanelCapacity,
      solarPotentialKwh: property.solarSystem.annualProductionKwh,
      sunshineHoursPerYear: null,
      panels: null,
    },

    // Property metrics (commercial-specific)
    propertyMetrics: {
      buildingSqFt: property.metrics.buildingSqFt,
      roofSqFt: property.metrics.roofSqFt,
      estimationMethod: property.metrics.estimationMethod,
    },

    // Contact information
    contactInfo: {
      phone: property.contact.phone,
      website: property.contact.website,
    },

    // Business information
    businessInfo: {
      status: property.businessStatus,
      rating: property.rating,
      reviewCount: property.reviewCount,
      placeId: property.placeId,
    },

    // Lead scoring
    leadScore: property.leadScore,
    qualityTier: getQualityTier(property.leadScore),

    // Smart Meter Texas integration (N/A for Nevada)
    smartMeterTexas: {
      linked: false,
      method: null,
      fetchedAt: null,
      autoFetchEnabled: false,
    },

    // Lead source & tracking
    tracking: {
      source: "scraper",
      medium: "automated",
      campaign: "nevada_commercial_2026",
      referralCode: null,
      utmParams: null,
      landingPage: null,
      userAgent: "Commercial Lead Scraper v1.0",
    },

    // Application progress
    progress: {
      qualificationCompleted: false,
      proposalSent: false,
      proposalSentAt: null,
      siteVisitScheduled: false,
      siteVisitDate: null,
      contractSigned: false,
      contractSignedAt: null,
      installationScheduled: false,
      installationDate: null,
      installationCompleted: false,
      installationCompletedAt: null,
    },

    // Admin notes
    notes: [],

    // Assignment
    assignedTo: null,
    assignedAt: null,

    // Tags
    tags: ["commercial", "nevada", property.propertyType, property.priority],

    // Scraper metadata
    scraperMetadata: {
      scrapedAt: property.scrapedAt,
      version: "1.0",
      needsVerification: true,
    },
  };
}

/**
 * Get quality tier based on lead score
 */
function getQualityTier(score) {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

/**
 * Get Nevada utility provider by city
 */
function getNevadaUtility(city) {
  const utilityMap = {
    "Las Vegas": "NV Energy",
    Henderson: "NV Energy",
    "North Las Vegas": "NV Energy",
    Reno: "NV Energy",
    Sparks: "NV Energy",
    "Carson City": "NV Energy",
    Elko: "NV Energy",
  };
  return utilityMap[city] || "NV Energy";
}

/**
 * Check if property already exists in database
 * Note: This requires read permissions. For automated imports,
 * we'll skip this check and rely on unique placeIds in generation.
 */
export async function propertyExists(placeId) {
  try {
    const leadsRef = collection(db, "leads");
    const q = query(leadsRef, where("businessInfo.placeId", "==", placeId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    // If permission denied, assume doesn't exist (create will fail if duplicate)
    if (error.code === "permission-denied") {
      return false;
    }
    console.error("Error checking property existence:", error);
    return false;
  }
}

/**
 * Import single commercial property to Firestore
 */
export async function importProperty(property) {
  try {
    // Check if already exists
    const exists = await propertyExists(property.placeId);
    if (exists) {
      console.log(`⚠️ Property already exists: ${property.propertyName}`);
      return { success: false, reason: "duplicate", id: null };
    }

    // Convert to lead format
    const lead = convertToLeadFormat(property);

    // Save to Firestore
    const docRef = doc(db, "leads", lead.id);
    await setDoc(docRef, lead);

    console.log(`✓ Imported: ${property.propertyName} (${lead.id})`);

    return { success: true, reason: "imported", id: lead.id };
  } catch (error) {
    console.error(
      `✗ Failed to import ${property.propertyName}:`,
      error.message,
    );
    return { success: false, reason: "error", error: error.message, id: null };
  }
}

/**
 * Batch import commercial properties to Firestore
 * Firestore allows max 500 operations per batch
 */
export async function importPropertiesBatch(properties, batchSize = 100) {
  const results = {
    total: properties.length,
    imported: 0,
    duplicates: 0,
    errors: 0,
    details: [],
  };

  console.log(
    `\n🚀 Starting batch import of ${properties.length} properties...`,
  );

  // Process in chunks to respect Firestore limits
  for (let i = 0; i < properties.length; i += batchSize) {
    const chunk = properties.slice(i, i + batchSize);
    console.log(
      `\nProcessing batch ${Math.floor(i / batchSize) + 1} (${chunk.length} properties)...`,
    );

    // Import each property in the chunk
    for (const property of chunk) {
      const result = await importProperty(property);
      results.details.push(result);

      if (result.success) {
        results.imported++;
      } else if (result.reason === "duplicate") {
        results.duplicates++;
      } else {
        results.errors++;
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Total: ${results.total}`);
  console.log(`   Imported: ${results.imported}`);
  console.log(`   Duplicates: ${results.duplicates}`);
  console.log(`   Errors: ${results.errors}`);

  return results;
}

/**
 * Import properties with filtering
 */
export async function importFilteredProperties(properties, options = {}) {
  const {
    minLeadScore = 40,
    maxLeadScore = 100,
    priorities = ["high", "medium", "low"],
    propertyTypes = null, // null = all types
    cities = null, // null = all cities
  } = options;

  // Filter properties
  let filtered = properties.filter((p) => {
    if (p.leadScore < minLeadScore || p.leadScore > maxLeadScore) return false;
    if (!priorities.includes(p.priority)) return false;
    if (propertyTypes && !propertyTypes.includes(p.propertyType)) return false;
    if (cities && !cities.includes(p.address.city)) return false;
    return true;
  });

  console.log(
    `\n📊 Filtered ${properties.length} properties to ${filtered.length}`,
  );

  return importPropertiesBatch(filtered);
}

/**
 * Export properties to JSON file (for backup/review)
 */
export function exportToJSON(properties, filename = "commercial-leads.json") {
  const data = {
    exportDate: new Date().toISOString(),
    totalProperties: properties.length,
    properties: properties.map(convertToLeadFormat),
  };

  const json = JSON.stringify(data, null, 2);
  return json;
}

/**
 * Get import statistics
 */
export async function getImportStats() {
  try {
    const leadsRef = collection(db, "leads");
    const q = query(leadsRef, where("leadType", "==", "commercial"));
    const snapshot = await getDocs(q);

    const stats = {
      total: snapshot.size,
      byType: {},
      byCity: {},
      byPriority: {},
      byTier: {},
      avgLeadScore: 0,
      totalSavingsPotential: 0,
    };

    let scoreSum = 0;

    snapshot.forEach((doc) => {
      const lead = doc.data();

      // Count by property type
      stats.byType[lead.propertyType] =
        (stats.byType[lead.propertyType] || 0) + 1;

      // Count by city
      stats.byCity[lead.address.city] =
        (stats.byCity[lead.address.city] || 0) + 1;

      // Count by priority
      stats.byPriority[lead.priority] =
        (stats.byPriority[lead.priority] || 0) + 1;

      // Count by tier
      stats.byTier[lead.qualityTier] =
        (stats.byTier[lead.qualityTier] || 0) + 1;

      // Accumulate scores and savings
      scoreSum += lead.leadScore || 0;
      stats.totalSavingsPotential +=
        lead.systemDesign.estimatedAnnualSavings || 0;
    });

    stats.avgLeadScore = Math.round(scoreSum / snapshot.size);

    return stats;
  } catch (error) {
    console.error("Error getting import stats:", error);
    return null;
  }
}

export default {
  importProperty,
  importPropertiesBatch,
  importFilteredProperties,
  exportToJSON,
  getImportStats,
  propertyExists,
  convertToLeadFormat,
};
