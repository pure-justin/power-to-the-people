/**
 * Lead Enrichment Service
 * Enriches scraped leads with:
 * - Geocoding and location data
 * - Solar potential from Google Solar API
 * - Utility provider and rates
 * - Contact information from Apollo/Hunter
 * - Company information from LinkedIn/Clearbit
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";

export class LeadEnricher {
  constructor(options = {}) {
    this.googleMapsKey =
      options.googleMapsKey || process.env.VITE_GOOGLE_MAPS_API_KEY;
    this.apolloKey = options.apolloKey || process.env.APOLLO_API_KEY;
    this.hunterKey = options.hunterKey || process.env.HUNTER_API_KEY;
    this.openEiKey = options.openEiKey || process.env.OPENEI_API_KEY;
  }

  /**
   * Enrich a single lead with all available data
   */
  async enrichLead(lead) {
    console.log(`📊 Enriching: ${lead.propertyName || lead.address?.street}`);

    const enrichedLead = { ...lead };

    try {
      // 1. Geocoding
      if (!lead.location || !lead.location.lat) {
        const location = await this.geocodeAddress(lead.address);
        enrichedLead.location = location;
      }

      // 2. Solar potential
      if (enrichedLead.location) {
        const solarData = await this.getSolarPotential(
          enrichedLead.location,
          lead.squareFootage,
        );
        Object.assign(enrichedLead, solarData);
      }

      // 3. Utility provider and rates
      if (enrichedLead.location) {
        const utilityData = await this.getUtilityData(enrichedLead.location);
        Object.assign(enrichedLead, utilityData);
      }

      // 4. Contact information
      if (lead.ownerInfo || lead.managementCompany) {
        const contacts = await this.findContacts({
          company: lead.managementCompany || lead.ownerInfo,
          location: enrichedLead.location,
        });
        Object.assign(enrichedLead, contacts);
      }

      // 5. Company information
      if (enrichedLead.managementCompany) {
        const companyInfo = await this.getCompanyInfo(
          enrichedLead.managementCompany,
        );
        enrichedLead.companyDetails = companyInfo;
      }

      enrichedLead.enrichedAt = new Date().toISOString();
      enrichedLead.status = "enriched";

      return enrichedLead;
    } catch (error) {
      console.error(`❌ Error enriching lead:`, error.message);
      enrichedLead.enrichmentError = error.message;
      return enrichedLead;
    }
  }

  /**
   * Geocode address to lat/lng
   */
  async geocodeAddress(address) {
    if (!address || !address.street) return null;

    const addressString = [
      address.street,
      address.city,
      address.state,
      address.zip,
    ]
      .filter(Boolean)
      .join(", ");

    try {
      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: {
            address: addressString,
            key: this.googleMapsKey,
          },
        },
      );

      if (response.data.results?.[0]) {
        const location = response.data.results[0].geometry.location;
        const addressComponents = response.data.results[0].address_components;

        // Extract county
        const countyComponent = addressComponents.find((c) =>
          c.types.includes("administrative_area_level_2"),
        );

        return {
          lat: location.lat,
          lng: location.lng,
          county: countyComponent?.long_name || null,
        };
      }

      return null;
    } catch (error) {
      console.error("Geocoding error:", error.message);
      return null;
    }
  }

  /**
   * Get solar potential from Google Solar API
   */
  async getSolarPotential(location, squareFootage) {
    try {
      const response = await axios.get(
        `https://solar.googleapis.com/v1/buildingInsights:findClosest`,
        {
          params: {
            "location.latitude": location.lat,
            "location.longitude": location.lng,
            key: this.googleMapsKey,
          },
        },
      );

      const data = response.data;

      // For commercial, estimate usable roof at 60% of building footprint
      const buildingFootprint = squareFootage ? squareFootage / 2 : null; // Assume 2 stories
      const usableRoofArea = buildingFootprint ? buildingFootprint * 0.6 : null;

      // Panel specifications: 400W panels, 18 sq ft each
      const panelWatts = 400;
      const panelAreaSqFt = 18;
      const panelsAvailable = usableRoofArea
        ? Math.floor(usableRoofArea / panelAreaSqFt)
        : null;

      // Solar production calculation
      const solarCapacityKw = panelsAvailable
        ? (panelsAvailable * panelWatts) / 1000
        : null;
      const annualSunshineHours =
        data.solarPotential?.maxSunshineHoursPerYear || 1500;
      const systemEfficiency = 0.85; // 85% system efficiency
      const annualProductionKwh = solarCapacityKw
        ? solarCapacityKw * annualSunshineHours * systemEfficiency
        : null;

      return {
        roofArea: usableRoofArea,
        solarCapacity: solarCapacityKw,
        annualProduction: annualProductionKwh,
        maxSunshineHours: annualSunshineHours,
        solarPanelConfigs: data.solarPotential?.solarPanelConfigs || [],
      };
    } catch (error) {
      console.error("Solar API error:", error.message);
      return {
        roofArea: null,
        solarCapacity: null,
        annualProduction: null,
      };
    }
  }

  /**
   * Get utility provider and rates using OpenEI API
   */
  async getUtilityData(location) {
    try {
      // Find utility provider by location
      const utilityResponse = await axios.get(
        "https://api.openei.org/utility_rates",
        {
          params: {
            api_key: this.openEiKey,
            lat: location.lat,
            lon: location.lng,
            sector: "Commercial",
            format: "json",
          },
        },
      );

      const utilities = utilityResponse.data.items || [];

      if (utilities.length === 0) {
        // Fallback: estimate by state
        return this.getUtilityDataByState(location.state);
      }

      // Get the primary commercial rate
      const primaryUtility = utilities[0];
      const rateData = primaryUtility.rates?.[0];

      // Parse rate structure (simplified)
      let avgRate = 0.12; // Default $0.12/kWh

      if (rateData?.energyratestructure) {
        const rates = rateData.energyratestructure.flatMap((tier) =>
          tier.map((t) => t.rate),
        );
        avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      }

      return {
        utilityProvider: primaryUtility.name,
        utilityCompany: primaryUtility.utility,
        avgElectricRate: avgRate,
        rateStructure: rateData?.name || "Commercial",
      };
    } catch (error) {
      console.error("Utility API error:", error.message);

      // Fallback to state averages
      return this.getUtilityDataByState(location.state);
    }
  }

  /**
   * Fallback utility rates by state
   */
  getUtilityDataByState(state) {
    const stateRates = {
      TX: { provider: "Multiple (Deregulated)", rate: 0.11 },
      FL: { provider: "Florida Power & Light", rate: 0.12 },
      CA: { provider: "Multiple", rate: 0.19 },
      AZ: { provider: "APS / SRP", rate: 0.13 },
      NV: { provider: "NV Energy", rate: 0.13 },
      GA: { provider: "Georgia Power", rate: 0.11 },
      NC: { provider: "Duke Energy", rate: 0.11 },
      SC: { provider: "Duke Energy", rate: 0.11 },
    };

    const stateData = stateRates[state] || { provider: "Unknown", rate: 0.12 };

    return {
      utilityProvider: stateData.provider,
      avgElectricRate: stateData.rate,
    };
  }

  /**
   * Find contact information using Apollo.io or Hunter.io
   */
  async findContacts({ company, location }) {
    try {
      // Try Apollo.io first
      if (this.apolloKey) {
        return await this.findContactsApollo(company, location);
      }

      // Fallback to Hunter.io
      if (this.hunterKey) {
        return await this.findContactsHunter(company);
      }

      return {};
    } catch (error) {
      console.error("Contact search error:", error.message);
      return {};
    }
  }

  /**
   * Find contacts using Apollo.io
   */
  async findContactsApollo(company, location) {
    try {
      const response = await axios.post(
        "https://api.apollo.io/v1/mixed_people/search",
        {
          q_organization_name: company,
          person_titles: [
            "Property Manager",
            "Facilities Manager",
            "Operations Manager",
            "COO",
          ],
          page: 1,
          per_page: 5,
        },
        {
          headers: {
            "X-Api-Key": this.apolloKey,
            "Content-Type": "application/json",
          },
        },
      );

      const people = response.data.people || [];

      if (people.length > 0) {
        const primary = people[0];
        return {
          contactName: primary.name,
          contactTitle: primary.title,
          contactEmail: primary.email,
          contactPhone: primary.phone_numbers?.[0]?.sanitized_number,
          linkedInUrl: primary.linkedin_url,
          managementCompany: company,
        };
      }

      return {};
    } catch (error) {
      console.error("Apollo API error:", error.message);
      return {};
    }
  }

  /**
   * Find contacts using Hunter.io
   */
  async findContactsHunter(company) {
    try {
      // Get company domain
      const domainResponse = await axios.get(
        "https://api.hunter.io/v2/domain-search",
        {
          params: {
            company: company,
            api_key: this.hunterKey,
            limit: 5,
          },
        },
      );

      const emails = domainResponse.data.data.emails || [];

      // Find decision makers
      const decisionMaker =
        emails.find((e) =>
          ["property manager", "facilities", "operations"].some((title) =>
            e.position?.toLowerCase().includes(title),
          ),
        ) || emails[0];

      if (decisionMaker) {
        return {
          contactName: `${decisionMaker.first_name} ${decisionMaker.last_name}`,
          contactTitle: decisionMaker.position,
          contactEmail: decisionMaker.value,
          linkedInUrl: decisionMaker.linkedin,
          managementCompany: company,
        };
      }

      return {};
    } catch (error) {
      console.error("Hunter API error:", error.message);
      return {};
    }
  }

  /**
   * Get company information from Clearbit
   */
  async getCompanyInfo(companyName) {
    // This would integrate with Clearbit or similar service
    // For now, return basic structure
    return {
      name: companyName,
      type: "Property Management",
      employees: null,
      revenue: null,
      industry: "Real Estate",
    };
  }

  /**
   * Batch enrich multiple leads
   */
  async enrichLeads(leads, options = {}) {
    const { concurrency = 5, saveToFirestore = false } = options;

    console.log(`\n📊 Enriching ${leads.length} leads...`);

    const enrichedLeads = [];
    const batches = this.chunkArray(leads, concurrency);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\nBatch ${i + 1}/${batches.length}...`);

      const batchResults = await Promise.all(
        batch.map((lead) => this.enrichLead(lead)),
      );

      enrichedLeads.push(...batchResults);

      // Save to Firestore if enabled
      if (saveToFirestore) {
        await this.saveLeadsToFirestore(batchResults);
      }
    }

    return enrichedLeads;
  }

  /**
   * Save enriched leads to Firestore
   */
  async saveLeadsToFirestore(leads) {
    const db = getFirestore();
    const batch = db.batch();

    leads.forEach((lead) => {
      const docRef = db.collection("commercialLeads").doc();
      batch.set(docRef, {
        ...lead,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await batch.commit();
    console.log(`💾 Saved ${leads.length} leads to Firestore`);
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFile } = await import("fs/promises");

  const enricher = new LeadEnricher();

  // Load scraped leads
  const leadsFile = process.argv[2] || "loopnet-leads.json";
  const leadsData = await readFile(leadsFile, "utf-8");
  const leads = JSON.parse(leadsData);

  console.log(`📂 Loaded ${leads.length} leads from ${leadsFile}`);

  // Enrich leads
  const enrichedLeads = await enricher.enrichLeads(leads.slice(0, 50), {
    concurrency: 5,
    saveToFirestore: true,
  });

  console.log(
    `\n✅ Enrichment complete: ${enrichedLeads.length} leads enriched`,
  );
}
