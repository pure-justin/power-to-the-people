/**
 * Commercial Property Scraper - LoopNet + CoStar Integration
 * Scrapes 500 commercial properties from sun-belt states
 */

import puppeteer from "puppeteer";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CommercialPropertyScraper {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 30000;
    this.db = null;
  }

  async initialize() {
    // Initialize Firebase
    try {
      const serviceAccountPath = path.join(
        __dirname,
        "../../../firebase-service-account.json",
      );
      initializeApp({
        credential: cert(serviceAccountPath),
      });
      this.db = getFirestore();
      console.log("✅ Firebase initialized");
    } catch (error) {
      if (error.code !== "app/duplicate-app") {
        throw error;
      }
      this.db = getFirestore();
    }

    // Initialize Puppeteer
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    );
  }

  /**
   * Scrape LoopNet for commercial properties
   */
  async scrapeLoopNet({
    state,
    city = null,
    buildingType = "office",
    minSize = 50000,
  }) {
    const searchUrl = this.buildLoopNetUrl({
      state,
      city,
      buildingType,
      minSize,
    });

    console.log(`🔍 LoopNet: ${buildingType} in ${city || state}...`);

    try {
      await this.page.goto(searchUrl, {
        waitUntil: "networkidle2",
        timeout: this.timeout,
      });

      await this.delay(2000);

      // Extract property listings
      const properties = await this.page.evaluate(() => {
        const cards = Array.from(
          document.querySelectorAll('[data-testid="listing-card"]') || [],
        );

        return cards
          .map((card) => {
            const titleEl = card.querySelector(
              'a[data-testid="listing-title"]',
            );
            const addressEl = card.querySelector(
              '[data-testid="listing-address"]',
            );
            const sizeEl = card.querySelector('[data-testid="listing-size"]');
            const priceEl = card.querySelector('[data-testid="listing-price"]');

            // Extract contact if available
            const contactEl = card.querySelector('[data-testid="broker-name"]');
            const phoneEl = card.querySelector('[data-testid="broker-phone"]');

            return {
              propertyName: titleEl?.textContent?.trim() || null,
              propertyUrl: titleEl?.href || null,
              address: addressEl?.textContent?.trim() || null,
              squareFootage: this.parseSquareFootage(
                sizeEl?.textContent?.trim(),
              ),
              price: priceEl?.textContent?.trim() || null,
              contactName: contactEl?.textContent?.trim() || null,
              contactPhone: phoneEl?.textContent?.trim() || null,
            };
          })
          .filter((p) => p.propertyUrl && p.squareFootage);
      });

      console.log(`   ✓ Found ${properties.length} properties`);

      return properties;
    } catch (error) {
      console.error(`   ❌ LoopNet error:`, error.message);
      return [];
    }
  }

  /**
   * Parse square footage from text
   */
  parseSquareFootage(text) {
    if (!text) return null;
    const match = text.match(/[\d,]+/);
    if (!match) return null;
    return parseInt(match[0].replace(/,/g, ""));
  }

  /**
   * Build LoopNet search URL
   */
  buildLoopNetUrl({ state, city, buildingType, minSize }) {
    const baseUrl = "https://www.loopnet.com/search/commercial-real-estate";
    const location = city ? `${city}-${state}` : state;

    const typeMap = {
      office: "office",
      retail: "retail",
      industrial: "industrial",
      warehouse: "industrial",
      flex: "flex",
    };

    const params = new URLSearchParams({
      sk: location,
      bb: typeMap[buildingType] || "office",
      smin: minSize,
    });

    return `${baseUrl}/${location}/?${params.toString()}`;
  }

  /**
   * Enrich property with detailed data
   */
  async enrichProperty(property) {
    if (!property.propertyUrl) return property;

    try {
      await this.page.goto(property.propertyUrl, {
        waitUntil: "networkidle2",
        timeout: this.timeout,
      });

      await this.delay(1500);

      const details = await this.page.evaluate(() => {
        const getValue = (selector) => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || null;
        };

        return {
          yearBuilt: getValue('[data-testid="year-built"]'),
          stories: getValue('[data-testid="stories"]'),
          parkingSpaces: getValue('[data-testid="parking"]'),
          propertyManager: getValue('[data-testid="property-manager"]'),
          managerPhone: getValue('[data-testid="manager-phone"]'),
          managerEmail: getValue('[data-testid="manager-email"]'),
        };
      });

      return { ...property, ...details };
    } catch (error) {
      console.error(`   ⚠️  Enrichment failed for ${property.propertyName}`);
      return property;
    }
  }

  /**
   * Save lead to Firestore
   */
  async saveLead(property, state) {
    const lead = {
      // Property details
      propertyName: property.propertyName,
      address: property.address || `${property.city}, ${state}`,
      city: property.city || null,
      state: state,
      zip: property.zip || null,
      squareFootage: property.squareFootage,
      buildingType: property.buildingType || "office",
      yearBuilt: property.yearBuilt || null,
      stories: property.stories || null,

      // Contact information
      contactName: property.contactName || property.propertyManager || null,
      contactPhone: property.contactPhone || property.managerPhone || null,
      contactEmail: property.managerEmail || null,

      // Source tracking
      source: "loopnet",
      sourceUrl: property.propertyUrl,
      scrapedAt: Timestamp.now(),

      // Campaign tracking
      campaignStatus: "new",
      emailSequence: 0,
      emailsSent: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      lastContactedAt: null,

      // Lead scoring (to be calculated)
      leadScore: null,
      leadPriority: null,

      // Solar data (to be enriched)
      utilityRate: null,
      estimatedSystemSize: null,
      estimatedAnnualSavings: null,
      estimatedROI: null,
      paybackPeriod: null,

      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    try {
      const docRef = await this.db.collection("commercial_leads").add(lead);
      return docRef.id;
    } catch (error) {
      console.error(`   ❌ Failed to save lead:`, error.message);
      return null;
    }
  }

  /**
   * Scrape target number of properties from sun-belt states
   */
  async scrapeSunBeltProperties(targetCount = 500) {
    await this.initialize();

    const sunBeltStates = [
      {
        state: "TX",
        cities: ["Austin", "Dallas", "Houston", "San Antonio", "Fort Worth"],
        targetPerState: 120,
      },
      {
        state: "AZ",
        cities: ["Phoenix", "Tucson", "Mesa", "Scottsdale"],
        targetPerState: 80,
      },
      {
        state: "CA",
        cities: ["Los Angeles", "San Diego", "Sacramento", "San Jose"],
        targetPerState: 100,
      },
      {
        state: "FL",
        cities: ["Miami", "Tampa", "Orlando", "Jacksonville"],
        targetPerState: 100,
      },
      {
        state: "NV",
        cities: ["Las Vegas", "Henderson", "Reno"],
        targetPerState: 50,
      },
      {
        state: "GA",
        cities: ["Atlanta", "Savannah", "Augusta"],
        targetPerState: 50,
      },
    ];

    const buildingTypes = ["office", "retail", "warehouse", "industrial"];

    let totalScraped = 0;
    const stats = {
      byState: {},
      byType: {},
      total: 0,
    };

    console.log(`\n🎯 Target: ${targetCount} commercial properties`);
    console.log(`📍 States: ${sunBeltStates.map((s) => s.state).join(", ")}\n`);

    for (const { state, cities, targetPerState } of sunBeltStates) {
      if (totalScraped >= targetCount) break;

      console.log(`\n📍 State: ${state} (target: ${targetPerState})`);
      stats.byState[state] = 0;

      const propertiesPerCity = Math.ceil(targetPerState / cities.length);

      for (const city of cities) {
        if (totalScraped >= targetCount) break;
        if (stats.byState[state] >= targetPerState) break;

        console.log(`\n   🏙️  City: ${city}`);

        for (const buildingType of buildingTypes) {
          if (totalScraped >= targetCount) break;
          if (stats.byState[state] >= targetPerState) break;

          const properties = await this.scrapeLoopNet({
            state,
            city,
            buildingType,
            minSize: 50000,
          });

          // Process each property
          for (const property of properties.slice(0, 3)) {
            // Limit per search
            if (totalScraped >= targetCount) break;
            if (stats.byState[state] >= targetPerState) break;

            // Enrich property data
            const enrichedProperty = await this.enrichProperty(property);

            // Save to Firestore
            enrichedProperty.city = city;
            enrichedProperty.buildingType = buildingType;

            const leadId = await this.saveLead(enrichedProperty, state);

            if (leadId) {
              totalScraped++;
              stats.byState[state]++;
              stats.byType[buildingType] =
                (stats.byType[buildingType] || 0) + 1;
              stats.total++;

              console.log(
                `      ✅ Saved: ${enrichedProperty.propertyName} (${enrichedProperty.squareFootage?.toLocaleString()} sqft) [${totalScraped}/${targetCount}]`,
              );
            }

            // Rate limiting (2-4 seconds between requests)
            await this.delay(2000 + Math.random() * 2000);
          }
        }
      }

      console.log(
        `\n   ✅ ${state} complete: ${stats.byState[state]} properties`,
      );
    }

    await this.close();

    return stats;
  }

  /**
   * Generate synthetic test leads (for development)
   */
  async generateTestLeads(count = 50) {
    await this.initialize();

    console.log(`\n🧪 Generating ${count} test leads...\n`);

    const states = ["TX", "AZ", "CA", "FL", "NV"];
    const cities = {
      TX: ["Austin", "Dallas", "Houston"],
      AZ: ["Phoenix", "Tucson"],
      CA: ["Los Angeles", "San Diego"],
      FL: ["Miami", "Tampa"],
      NV: ["Las Vegas"],
    };
    const buildingTypes = ["office", "retail", "warehouse", "industrial"];
    const names = [
      "Central Business Plaza",
      "Tech Park Center",
      "Downtown Commerce Building",
      "Sunset Business Park",
      "Metro Office Tower",
      "Innovation Hub",
    ];

    const stats = { total: 0, byState: {} };

    for (let i = 0; i < count; i++) {
      const state = states[Math.floor(Math.random() * states.length)];
      const city =
        cities[state][Math.floor(Math.random() * cities[state].length)];
      const buildingType =
        buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
      const name = names[Math.floor(Math.random() * names.length)];

      const property = {
        propertyName: `${name} ${i + 1}`,
        address: `${1000 + i} Main Street, ${city}, ${state}`,
        city,
        squareFootage: 50000 + Math.floor(Math.random() * 150000),
        buildingType,
        yearBuilt: 1990 + Math.floor(Math.random() * 30),
        stories: Math.floor(Math.random() * 10) + 1,
        contactName: `Property Manager ${i + 1}`,
        contactPhone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
        contactEmail: `manager${i + 1}@example.com`,
        propertyUrl: `https://loopnet.com/property/${i + 1}`,
      };

      await this.saveLead(property, state);

      stats.total++;
      stats.byState[state] = (stats.byState[state] || 0) + 1;

      console.log(
        `   ✅ [${i + 1}/${count}] ${property.propertyName} - ${city}, ${state}`,
      );

      await this.delay(100); // Quick delay for test data
    }

    console.log(`\n✅ Generated ${stats.total} test leads`);
    console.log(`📊 By state:`, stats.byState);

    return stats;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const mode = args.includes("--test") ? "test" : "production";
  const target =
    parseInt(args.find((a) => a.startsWith("--target="))?.split("=")[1]) || 500;

  const scraper = new CommercialPropertyScraper({ headless: true });

  console.log("🚀 Commercial Property Scraper");
  console.log("==============================\n");

  try {
    let stats;

    if (mode === "test") {
      console.log(`📊 Mode: TEST (generating synthetic data)`);
      stats = await scraper.generateTestLeads(target);
    } else {
      console.log(`📊 Mode: PRODUCTION (scraping real data)`);
      stats = await scraper.scrapeSunBeltProperties(target);
    }

    console.log(`\n✅ Scraping complete!`);
    console.log(`📊 Final stats:`, JSON.stringify(stats, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Scraping failed:`, error);
    process.exit(1);
  }
}
