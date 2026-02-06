#!/usr/bin/env node
/**
 * Campaign Orchestrator
 * Manages end-to-end commercial solar outreach campaign
 *
 * Usage:
 *   node campaign-orchestrator.js --launch --target=500 --dry-run
 *   node campaign-orchestrator.js --follow-up
 *   node campaign-orchestrator.js --stats
 */

import { CommercialPropertyScraper } from "./scrapers/commercial-property-scraper.js";
import { UtilityRateService } from "./enrichment/utility-rate-service.js";
import { ROICalculatorService } from "./enrichment/roi-calculator-service.js";
import { EmailEngine } from "./outreach/email-engine.js";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, cert } from "firebase-admin/app";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CampaignOrchestrator {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.db = null;

    this.scraper = new CommercialPropertyScraper({ headless: true });
    this.utilityService = new UtilityRateService();
    this.roiService = new ROICalculatorService();
    this.emailEngine = new EmailEngine({ dryRun: this.dryRun });

    this.initialize();
  }

  async initialize() {
    try {
      const serviceAccountPath = path.join(
        __dirname,
        "../../firebase-service-account.json",
      );
      initializeApp({
        credential: cert(serviceAccountPath),
      });
      this.db = getFirestore();
    } catch (error) {
      if (error.code !== "app/duplicate-app") {
        throw error;
      }
      this.db = getFirestore();
    }
  }

  /**
   * Launch complete campaign
   */
  async launchCampaign(options = {}) {
    const {
      target = 500,
      mode = "test", // test or production
    } = options;

    console.log("\n🚀 COMMERCIAL SOLAR CAMPAIGN LAUNCH");
    console.log("=".repeat(50));
    console.log(`Mode: ${mode.toUpperCase()}`);
    console.log(`Target: ${target} leads`);
    console.log(`Dry Run: ${this.dryRun ? "YES" : "NO"}`);
    console.log("=".repeat(50) + "\n");

    const results = {
      phase: null,
      scraped: 0,
      enrichedUtility: 0,
      enrichedROI: 0,
      emailsSent: 0,
      qualified: 0,
      hot: 0,
      warm: 0,
      medium: 0,
      cold: 0,
      errors: [],
    };

    try {
      // PHASE 1: Scrape properties
      results.phase = "scraping";
      console.log("📊 PHASE 1: Scraping Properties");
      console.log("-".repeat(50) + "\n");

      let scrapeStats;
      if (mode === "test") {
        scrapeStats = await this.scraper.generateTestLeads(target);
      } else {
        scrapeStats = await this.scraper.scrapeSunBeltProperties(target);
      }

      results.scraped = scrapeStats.total;
      console.log(`\n✅ Scraped ${results.scraped} properties\n`);

      // PHASE 2: Enrich with utility rates
      results.phase = "utility_enrichment";
      console.log("\n🔋 PHASE 2: Enriching with Utility Rates");
      console.log("-".repeat(50) + "\n");

      const utilityStats = await this.utilityService.enrichLeads(target);
      results.enrichedUtility = utilityStats.enriched;
      console.log(
        `✅ Enriched ${results.enrichedUtility} leads with utility data\n`,
      );

      // PHASE 3: Calculate ROI
      results.phase = "roi_calculation";
      console.log("\n💰 PHASE 3: Calculating Solar ROI");
      console.log("-".repeat(50) + "\n");

      const roiStats = await this.roiService.enrichLeads(target);
      results.enrichedROI = roiStats.enriched;

      // Get lead distribution
      const stats = await this.roiService.getStats();
      results.hot = stats.byPriority.hot;
      results.warm = stats.byPriority.warm;
      results.medium = stats.byPriority.medium;
      results.cold = stats.byPriority.cold;
      results.qualified = results.hot + results.warm;

      console.log(`\n✅ Calculated ROI for ${results.enrichedROI} leads`);
      console.log(`\n📊 Lead Distribution:`);
      console.log(`   🔥 Hot:    ${results.hot} (score ≥ 80)`);
      console.log(`   🌡️  Warm:   ${results.warm} (score 65-79)`);
      console.log(`   📊 Medium: ${results.medium} (score 50-64)`);
      console.log(`   ❄️  Cold:   ${results.cold} (score < 50)`);
      console.log(
        `\n🎯 ${results.qualified} qualified leads ready for outreach\n`,
      );

      // PHASE 4: Send initial emails to hot leads
      results.phase = "email_outreach";
      console.log("\n📧 PHASE 4: Email Outreach (Email #1)");
      console.log("-".repeat(50) + "\n");

      if (results.hot > 0) {
        const emailStats = await this.emailEngine.sendCampaignBatch({
          priority: "hot",
          sequenceNumber: 1,
          limit: results.hot,
        });
        results.emailsSent = emailStats.sent;
        console.log(`\n✅ Sent ${results.emailsSent} emails to hot leads\n`);
      } else {
        console.log("⚠️  No hot leads found, skipping email outreach\n");
      }

      // PHASE 5: Campaign summary
      console.log("\n🎉 CAMPAIGN LAUNCH COMPLETE");
      console.log("=".repeat(50));
      console.log(`✅ ${results.scraped} properties scraped`);
      console.log(
        `✅ ${results.enrichedUtility} leads enriched with utility data`,
      );
      console.log(
        `✅ ${results.enrichedROI} leads enriched with ROI calculations`,
      );
      console.log(`✅ ${results.emailsSent} emails sent`);
      console.log(`\n📊 Lead Breakdown:`);
      console.log(`   Hot:    ${results.hot}`);
      console.log(`   Warm:   ${results.warm}`);
      console.log(`   Medium: ${results.medium}`);
      console.log(`   Cold:   ${results.cold}`);
      console.log("=".repeat(50) + "\n");

      // Save campaign record
      await this.saveCampaign(results);

      return results;
    } catch (error) {
      console.error(
        `\n❌ Campaign failed in ${results.phase} phase:`,
        error.message,
      );
      results.errors.push({
        phase: results.phase,
        error: error.message,
      });
      return results;
    }
  }

  /**
   * Run daily follow-up emails
   */
  async runFollowUps() {
    console.log("\n📧 RUNNING FOLLOW-UP CAMPAIGNS");
    console.log("=".repeat(50) + "\n");

    const sequences = [
      { priority: "hot", sequence: 2, name: "Hot leads - Email #2" },
      { priority: "hot", sequence: 3, name: "Hot leads - Email #3" },
      { priority: "hot", sequence: 4, name: "Hot leads - Email #4" },
      { priority: "warm", sequence: 1, name: "Warm leads - Email #1" },
      { priority: "warm", sequence: 2, name: "Warm leads - Email #2" },
    ];

    const results = [];

    for (const { priority, sequence, name } of sequences) {
      console.log(`\n📧 ${name}`);
      console.log("-".repeat(50));

      const stats = await this.emailEngine.sendCampaignBatch({
        priority,
        sequenceNumber: sequence,
        limit: 100,
      });

      results.push({
        name,
        priority,
        sequence,
        sent: stats.sent,
        failed: stats.failed,
      });

      if (stats.sent > 0) {
        console.log(`✅ Sent ${stats.sent} emails\n`);
      } else {
        console.log(`⏭️  No leads ready for this sequence\n`);
      }
    }

    console.log("\n📊 FOLLOW-UP SUMMARY");
    console.log("=".repeat(50));
    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
    console.log(`Total emails sent: ${totalSent}`);
    results.forEach((r) => {
      if (r.sent > 0) {
        console.log(`   ${r.name}: ${r.sent}`);
      }
    });
    console.log("=".repeat(50) + "\n");

    return results;
  }

  /**
   * Get campaign statistics
   */
  async getStats() {
    console.log("\n📊 CAMPAIGN STATISTICS");
    console.log("=".repeat(50) + "\n");

    // Lead stats
    const totalLeads = await this.db
      .collection("commercial_leads")
      .count()
      .get();
    const enrichedLeads = await this.db
      .collection("commercial_leads")
      .where("enrichedWithROI", "==", true)
      .count()
      .get();

    console.log("📈 Lead Statistics:");
    console.log(`   Total leads: ${totalLeads.data().count}`);
    console.log(`   Enriched: ${enrichedLeads.data().count}`);

    // ROI stats
    const roiStats = await this.roiService.getStats();
    console.log(`\n💰 ROI Statistics:`);
    console.log(`   Average system size: ${roiStats.avgSystemSize} kW`);
    console.log(`   Average ROI: ${roiStats.avgROI}%`);
    console.log(`   Average payback: ${roiStats.avgPayback} years`);
    console.log(
      `   Total savings potential: $${Math.round(roiStats.totalSavingsPotential / 1000)}K/year`,
    );

    console.log(`\n🎯 Lead Priority Breakdown:`);
    console.log(`   🔥 Hot:    ${roiStats.byPriority.hot}`);
    console.log(`   🌡️  Warm:   ${roiStats.byPriority.warm}`);
    console.log(`   📊 Medium: ${roiStats.byPriority.medium}`);
    console.log(`   ❄️  Cold:   ${roiStats.byPriority.cold}`);

    console.log(`\n📍 By State:`);
    Object.entries(roiStats.byState).forEach(([state, data]) => {
      console.log(`   ${state}: ${data.count} leads, ${data.avgROI}% avg ROI`);
    });

    // Email stats
    const emailsSent = await this.db
      .collection("commercial_leads")
      .where("emailsSent", ">", 0)
      .count()
      .get();

    console.log(`\n📧 Email Statistics:`);
    console.log(`   Leads contacted: ${emailsSent.data().count}`);

    // Get top leads
    const topLeads = await this.roiService.getTopLeads(10);
    console.log(`\n🏆 Top 10 Leads:`);
    topLeads.forEach((lead, i) => {
      console.log(
        `\n   ${i + 1}. ${lead.propertyName} - ${lead.city}, ${lead.state}`,
      );
      console.log(`      Score: ${lead.leadScore} (${lead.leadPriority})`);
      console.log(
        `      System: ${lead.estimatedSystemSize}kW | ROI: ${lead.roi25Year}%`,
      );
      console.log(
        `      Annual Savings: $${Math.round(lead.estimatedAnnualSavings / 1000)}K`,
      );
      console.log(`      Emails sent: ${lead.emailsSent || 0}`);
    });

    console.log("\n" + "=".repeat(50) + "\n");

    return {
      leads: {
        total: totalLeads.data().count,
        enriched: enrichedLeads.data().count,
        contacted: emailsSent.data().count,
      },
      roi: roiStats,
      topLeads,
    };
  }

  /**
   * Get qualified leads (score ≥ 65, opened emails ≥ 2)
   */
  async getQualifiedLeads() {
    const snapshot = await this.db
      .collection("commercial_leads")
      .where("leadScore", ">=", 65)
      .where("emailsOpened", ">=", 2)
      .get();

    console.log(`\n🎯 QUALIFIED LEADS (${snapshot.size})`);
    console.log("=".repeat(50) + "\n");

    const leads = [];
    snapshot.forEach((doc) => {
      const lead = { id: doc.id, ...doc.data() };
      leads.push(lead);

      console.log(`${lead.propertyName} - ${lead.city}, ${lead.state}`);
      console.log(`   Score: ${lead.leadScore} | ROI: ${lead.roi25Year}%`);
      console.log(
        `   Emails: Sent ${lead.emailsSent}, Opened ${lead.emailsOpened}, Clicked ${lead.emailsClicked}`,
      );
      console.log(`   Contact: ${lead.contactName} - ${lead.contactEmail}\n`);
    });

    return leads;
  }

  /**
   * Save campaign record
   */
  async saveCampaign(results) {
    try {
      await this.db.collection("campaigns").add({
        type: "commercial_outreach",
        launchedAt: new Date(),
        results,
        dryRun: this.dryRun,
      });
    } catch (error) {
      console.error("Failed to save campaign record:", error.message);
    }
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const orchestrator = new CampaignOrchestrator({ dryRun });

  (async () => {
    try {
      if (args.includes("--launch")) {
        const target =
          parseInt(
            args.find((a) => a.startsWith("--target="))?.split("=")[1],
          ) || 500;
        const mode = args.includes("--production") ? "production" : "test";

        await orchestrator.launchCampaign({ target, mode });
      } else if (args.includes("--follow-up")) {
        await orchestrator.runFollowUps();
      } else if (args.includes("--stats")) {
        await orchestrator.getStats();
      } else if (args.includes("--qualified")) {
        await orchestrator.getQualifiedLeads();
      } else {
        console.log(`
🚀 Commercial Solar Campaign Orchestrator

Usage:
  --launch [--target=500] [--production] [--dry-run]
                              Launch complete campaign

  --follow-up [--dry-run]    Run daily follow-up emails

  --stats                     Show campaign statistics

  --qualified                 Show qualified leads ready for sales

Examples:
  # Launch test campaign with 50 test leads
  node campaign-orchestrator.js --launch --target=50 --dry-run

  # Launch production campaign with 500 real leads
  node campaign-orchestrator.js --launch --target=500 --production

  # Run daily follow-ups
  node campaign-orchestrator.js --follow-up

  # View statistics
  node campaign-orchestrator.js --stats

  # Get qualified leads
  node campaign-orchestrator.js --qualified
        `);
      }

      process.exit(0);
    } catch (error) {
      console.error("\n❌ Error:", error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}
