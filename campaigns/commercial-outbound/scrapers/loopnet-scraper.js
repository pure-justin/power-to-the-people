/**
 * LoopNet Commercial Property Scraper
 * Uses Puppeteer to scrape commercial property listings
 */

import puppeteer from "puppeteer";
import { writeFile } from "fs/promises";

export class LoopNetScraper {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 30000;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    );
  }

  /**
   * Search for commercial properties in target markets
   */
  async searchProperties(params) {
    const {
      state,
      city = null,
      buildingType = "office", // office, retail, industrial, warehouse
      minSize = 10000, // sq ft
      maxSize = 100000,
    } = params;

    console.log(`🔍 Searching LoopNet: ${buildingType} in ${city || state}...`);

    const searchUrl = this.buildSearchUrl({
      state,
      city,
      buildingType,
      minSize,
      maxSize,
    });

    try {
      await this.page.goto(searchUrl, {
        waitUntil: "networkidle2",
        timeout: this.timeout,
      });

      // Wait for listings to load
      await this.page
        .waitForSelector(".placard", { timeout: 10000 })
        .catch(() => null);

      // Extract property cards
      const properties = await this.page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(".placard"));

        return cards
          .map((card) => {
            const titleEl = card.querySelector(".placard-title a");
            const addressEl = card.querySelector(".property-address");
            const sizeEl = card.querySelector(".property-size");
            const priceEl = card.querySelector(".property-price");

            return {
              propertyName: titleEl?.textContent?.trim() || null,
              propertyUrl: titleEl?.href || null,
              address: addressEl?.textContent?.trim() || null,
              size: sizeEl?.textContent?.trim() || null,
              price: priceEl?.textContent?.trim() || null,
            };
          })
          .filter((p) => p.propertyUrl);
      });

      console.log(`✅ Found ${properties.length} properties on page 1`);

      return properties;
    } catch (error) {
      console.error(`❌ Error searching LoopNet:`, error.message);
      return [];
    }
  }

  /**
   * Get detailed property information
   */
  async getPropertyDetails(propertyUrl) {
    try {
      await this.page.goto(propertyUrl, {
        waitUntil: "networkidle2",
        timeout: this.timeout,
      });

      await this.page
        .waitForSelector(".property-data", { timeout: 5000 })
        .catch(() => null);

      const details = await this.page.evaluate(() => {
        const getValue = (label) => {
          const el = Array.from(
            document.querySelectorAll(".property-fact"),
          ).find((e) => e.textContent.includes(label));
          return el?.querySelector(".value")?.textContent?.trim() || null;
        };

        return {
          propertyName: document
            .querySelector("h1.property-title")
            ?.textContent?.trim(),
          address: {
            street: getValue("Address"),
            city: getValue("City"),
            state: getValue("State"),
            zip: getValue("ZIP Code"),
          },
          buildingType: getValue("Property Type"),
          squareFootage: getValue("Building Size"),
          yearBuilt: getValue("Year Built"),
          stories: getValue("Stories"),
          lotSize: getValue("Lot Size"),
          parking: getValue("Parking"),

          // Contact Information
          listingAgent: document
            .querySelector(".listing-agent-name")
            ?.textContent?.trim(),
          listingCompany: document
            .querySelector(".listing-company")
            ?.textContent?.trim(),
          phone: document.querySelector(".listing-phone")?.textContent?.trim(),

          // Owner/Manager (if available)
          ownerInfo: document.querySelector(".owner-info")?.textContent?.trim(),

          description: document
            .querySelector(".property-description")
            ?.textContent?.trim(),
        };
      });

      return details;
    } catch (error) {
      console.error(`❌ Error getting property details:`, error.message);
      return null;
    }
  }

  /**
   * Build search URL from parameters
   */
  buildSearchUrl({ state, city, buildingType, minSize, maxSize }) {
    const baseUrl = "https://www.loopnet.com/search";
    const params = new URLSearchParams();

    // Location
    if (city && state) {
      params.append("sk", `${city}-${state}`);
    } else {
      params.append("sk", state);
    }

    // Property type mapping
    const typeMap = {
      office: "office",
      retail: "retail",
      industrial: "industrial",
      warehouse: "industrial",
      multifamily: "multifamily",
    };
    params.append("bb", typeMap[buildingType] || "office");

    // Size filters
    if (minSize) params.append("smin", minSize);
    if (maxSize) params.append("smax", maxSize);

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Scrape multiple pages of results
   */
  async scrapeMarket({
    state,
    cities = [],
    buildingTypes = ["office"],
    targetCount = 100,
  }) {
    await this.initialize();

    const allProperties = [];

    for (const buildingType of buildingTypes) {
      // If no cities specified, search state-wide
      const locations = cities.length > 0 ? cities : [null];

      for (const city of locations) {
        if (allProperties.length >= targetCount) break;

        const properties = await this.searchProperties({
          state,
          city,
          buildingType,
          minSize: 10000,
          maxSize: 200000,
        });

        // Get details for each property
        for (const prop of properties.slice(0, 5)) {
          // Limit to avoid overload
          if (allProperties.length >= targetCount) break;

          const details = await this.getPropertyDetails(prop.propertyUrl);
          if (details) {
            allProperties.push({
              ...prop,
              ...details,
              source: "loopnet",
              sourceUrl: prop.propertyUrl,
              scrapedAt: new Date().toISOString(),
            });
          }

          // Rate limiting
          await this.delay(2000 + Math.random() * 2000);
        }
      }
    }

    await this.close();

    return allProperties;
  }

  /**
   * Scrape sun-belt states for commercial properties
   */
  async scrapeSunBeltStates(targetCount = 500) {
    const sunBeltStates = [
      { state: "TX", cities: ["Austin", "Dallas", "Houston", "San Antonio"] },
      { state: "FL", cities: ["Miami", "Tampa", "Orlando", "Jacksonville"] },
      { state: "AZ", cities: ["Phoenix", "Tucson", "Mesa"] },
      { state: "CA", cities: ["Los Angeles", "San Diego", "San Francisco"] },
      { state: "NV", cities: ["Las Vegas", "Reno"] },
      { state: "GA", cities: ["Atlanta", "Savannah"] },
      { state: "NC", cities: ["Charlotte", "Raleigh"] },
      { state: "SC", cities: ["Charleston", "Columbia"] },
    ];

    const buildingTypes = ["office", "retail", "warehouse", "industrial"];
    const allLeads = [];

    for (const { state, cities } of sunBeltStates) {
      if (allLeads.length >= targetCount) break;

      console.log(`\n📍 Scraping ${state}...`);

      const stateLeads = await this.scrapeMarket({
        state,
        cities,
        buildingTypes,
        targetCount: Math.ceil(targetCount / sunBeltStates.length),
      });

      allLeads.push(...stateLeads);
      console.log(`✅ ${state}: ${stateLeads.length} properties scraped`);
    }

    return allLeads;
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
  const scraper = new LoopNetScraper({ headless: true });

  console.log("🚀 Starting LoopNet scraper...\n");

  const leads = await scraper.scrapeSunBeltStates(500);

  console.log(`\n✅ Scraping complete: ${leads.length} total leads`);

  // Save to file
  const filename = `loopnet-leads-${new Date().toISOString().split("T")[0]}.json`;
  await writeFile(filename, JSON.stringify(leads, null, 2));

  console.log(`💾 Saved to ${filename}`);
}
