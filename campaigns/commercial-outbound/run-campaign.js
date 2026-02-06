#!/usr/bin/env node

/**
 * Commercial Outbound Campaign - Master Orchestration Script
 *
 * This script runs the complete campaign pipeline:
 * 1. Scrape properties from LoopNet
 * 2. Enrich leads with solar potential and ROI
 * 3. Calculate ROI and qualification scores
 * 4. Create campaign and schedule outreach
 * 5. Monitor and report progress
 *
 * Usage:
 *   node run-campaign.js --target 500 --states TX,FL,AZ,CA
 */

import { program } from "commander";
import { LoopNetScraper } from "./scrapers/loopnet-scraper.js";
import { LeadEnricher } from "./enrichment/lead-enricher.js";
import { CommercialSolarROI } from "./roi-calculator.js";
import OutreachScheduler from "./outreach-scheduler.js";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { writeFile } from "fs/promises";

// Initialize Firebase
initializeApp({
  credential: applicationDefault(),
  projectId: "power-to-the-people-vpp",
});

const db = getFirestore();

class CampaignOrchestrator {
  constructor(options = {}) {
    this.targetLeads = options.targetLeads || 500;
    this.targetQualified = options.targetQualified || 50;
    this.states = options.states || [
      "TX",
      "FL",
      "AZ",
      "CA",
      "NV",
      "GA",
      "NC",
      "SC",
    ];
    this.dryRun = options.dryRun || false;

    this.stats = {
      scraped: 0,
      enriched: 0,
      qualified: 0,
      scheduled: 0,
      errors: 0,
    };
  }

  /**
   * Run complete campaign pipeline
   */
  async run() {
    console.log("🚀 Starting Commercial Outbound Campaign\n");
    console.log(
      `Target: ${this.targetLeads} leads → ${this.targetQualified} qualified\n`,
    );

    try {
      // Step 1: Scrape properties
      console.log("📊 STEP 1: Scraping Properties\n");
      const scrapedLeads = await this.scrapeProperties();

      // Step 2: Enrich leads
      console.log("\n📊 STEP 2: Enriching Leads\n");
      const enrichedLeads = await this.enrichLeads(scrapedLeads);

      // Step 3: Calculate ROI
      console.log("\n📊 STEP 3: Calculating ROI\n");
      const qualifiedLeads = await this.calculateROI(enrichedLeads);

      // Step 4: Create campaign
      console.log("\n📊 STEP 4: Creating Campaign\n");
      const campaign = await this.createCampaign(qualifiedLeads);

      // Step 5: Schedule outreach
      console.log("\n📊 STEP 5: Scheduling Outreach\n");
      await this.scheduleOutreach(campaign.id, qualifiedLeads);

      // Print summary
      this.printSummary(campaign);

      return campaign;
    } catch (error) {
      console.error("\n❌ Campaign failed:", error);
      throw error;
    }
  }

  /**
   * Step 1: Scrape properties
   */
  async scrapeProperties() {
    const scraper = new LoopNetScraper({ headless: true });

    const leads = await scraper.scrapeSunBeltStates(this.targetLeads);

    this.stats.scraped = leads.length;

    // Save raw data
    const filename = `data/scraped-leads-${new Date().toISOString().split("T")[0]}.json`;
    await writeFile(filename, JSON.stringify(leads, null, 2));

    console.log(`✅ Scraped ${leads.length} properties`);
    console.log(`💾 Saved to ${filename}`);

    return leads;
  }

  /**
   * Step 2: Enrich leads
   */
  async enrichLeads(leads) {
    const enricher = new LeadEnricher();

    const enriched = await enricher.enrichLeads(leads, {
      concurrency: 5,
      saveToFirestore: !this.dryRun,
    });

    this.stats.enriched = enriched.length;

    // Save enriched data
    const filename = `data/enriched-leads-${new Date().toISOString().split("T")[0]}.json`;
    await writeFile(filename, JSON.stringify(enriched, null, 2));

    console.log(`✅ Enriched ${enriched.length} leads`);
    console.log(`💾 Saved to ${filename}`);

    return enriched;
  }

  /**
   * Step 3: Calculate ROI and qualify leads
   */
  async calculateROI(leads) {
    const calculator = new CommercialSolarROI();

    const leadsWithROI = calculator.batchCalculateROI(leads);

    // Filter qualified leads (score >= 50)
    const qualified = leadsWithROI.filter((l) => l.qualificationScore >= 50);

    // Sort by score
    qualified.sort((a, b) => b.qualificationScore - a.qualificationScore);

    this.stats.qualified = qualified.length;

    // Save qualified leads
    const filename = `data/qualified-leads-${new Date().toISOString().split("T")[0]}.json`;
    await writeFile(filename, JSON.stringify(qualified, null, 2));

    console.log(
      `✅ Qualified ${qualified.length} leads (${((qualified.length / leads.length) * 100).toFixed(1)}%)`,
    );
    console.log(`💾 Saved to ${filename}`);

    // Print top 10
    console.log("\n🏆 Top 10 Qualified Leads:");
    qualified.slice(0, 10).forEach((lead, i) => {
      console.log(`\n${i + 1}. ${lead.propertyName || lead.address?.street}`);
      console.log(
        `   Score: ${lead.qualificationScore}/100 (${lead.qualificationTier})`,
      );
      console.log(
        `   ROI: ${lead.roi25Year?.toFixed(0)}% | Payback: ${lead.simplePayback?.toFixed(1)}y`,
      );
      console.log(`   Savings: $${lead.annualSavings?.toLocaleString()}/year`);
    });

    return qualified;
  }

  /**
   * Step 4: Create campaign
   */
  async createCampaign(leads) {
    const scheduler = new OutreachScheduler();

    const campaign = await scheduler.createCampaign({
      name: `Sun Belt Commercial - ${new Date().toISOString().split("T")[0]}`,
      description: "Cold outreach to commercial properties in sun-belt states",
      type: "email",
      status: "active",
      targetStates: this.states,
      targetBuildingTypes: ["office", "retail", "warehouse", "industrial"],
      minSquareFootage: 10000,
      minSolarCapacity: 50,
      targetLeads: this.targetLeads,
      targetQualified: this.targetQualified,
      targetCloseRate: 0.1, // 10%
      sequenceType: "standard",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    console.log(`✅ Campaign created: ${campaign.id}`);

    return campaign;
  }

  /**
   * Step 5: Schedule outreach
   */
  async scheduleOutreach(campaignId, leads) {
    if (this.dryRun) {
      console.log("🔵 Dry run mode - skipping actual scheduling");
      return;
    }

    // Save leads to Firestore and get IDs
    const batch = db.batch();
    const leadIds = [];

    for (const lead of leads) {
      const docRef = db.collection("commercialLeads").doc();
      batch.set(docRef, {
        ...lead,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      leadIds.push(docRef.id);
    }

    await batch.commit();
    console.log(`✅ Saved ${leadIds.length} leads to Firestore`);

    // Schedule email sequence
    const scheduler = new OutreachScheduler();
    await scheduler.addLeadsToCampaign(campaignId, leadIds);

    this.stats.scheduled = leadIds.length;

    console.log(`✅ Scheduled outreach for ${leadIds.length} leads`);
  }

  /**
   * Print campaign summary
   */
  printSummary(campaign) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 CAMPAIGN SUMMARY");
    console.log("=".repeat(60));
    console.log(`\nCampaign ID: ${campaign.id}`);
    console.log(`Campaign Name: ${campaign.name}`);
    console.log(`\nLead Funnel:`);
    console.log(`  Scraped:    ${this.stats.scraped}`);
    console.log(`  Enriched:   ${this.stats.enriched}`);
    console.log(
      `  Qualified:  ${this.stats.qualified} (${((this.stats.qualified / this.stats.scraped) * 100).toFixed(1)}%)`,
    );
    console.log(`  Scheduled:  ${this.stats.scheduled}`);
    console.log(`\nProjected Results (30 days):`);
    console.log(
      `  Open Rate:    25% (~${Math.round(this.stats.scheduled * 0.25)} opens)`,
    );
    console.log(
      `  Reply Rate:   5% (~${Math.round(this.stats.scheduled * 0.05)} replies)`,
    );
    console.log(`  Meetings:     50 qualified leads`);
    console.log(`  Close Rate:   10% (5 deals)`);
    console.log(`\nAverage Deal Value:`);
    console.log(`  System Size:  150 kW`);
    console.log(`  Revenue:      $450,000 per deal`);
    console.log(`  Total:        $2,250,000 in 30 days`);
    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Campaign launched successfully!\n");
  }
}

// CLI
program
  .name("run-campaign")
  .description("Run commercial solar outreach campaign")
  .option("-t, --target <number>", "Target number of leads", parseInt, 500)
  .option("-q, --qualified <number>", "Target qualified leads", parseInt, 50)
  .option("-s, --states <states>", "Comma-separated state codes", "TX,FL,AZ,CA")
  .option("-d, --dry-run", "Dry run mode (no emails sent)", false)
  .parse();

const options = program.opts();

// Convert states string to array
options.states = options.states.split(",");

// Run campaign
const orchestrator = new CampaignOrchestrator({
  targetLeads: options.target,
  targetQualified: options.qualified,
  states: options.states,
  dryRun: options.dryRun,
});

orchestrator.run().catch(console.error);
