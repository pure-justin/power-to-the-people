#!/usr/bin/env node
/**
 * Campaign Orchestrator
 * Complete workflow for cold outbound campaign
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const LoopNetScraper = require("./scrapers/loopnet-scraper");
const UtilityRateService = require("./enrichment/utility-rates");
const ROICalculator = require("./enrichment/roi-calculator");
const LeadScorer = require("./enrichment/lead-scorer");
const EmailEngine = require("./outreach/email-engine");

class CampaignOrchestrator {
  constructor() {
    // Initialize Firebase
    if (!initializeApp.length) {
      initializeApp();
    }
    this.db = getFirestore();

    this.scraper = new LoopNetScraper();
    this.utilityService = new UtilityRateService();
    this.roiCalculator = new ROICalculator();
    this.scorer = new LeadScorer();
    this.emailEngine = new EmailEngine(process.env.SENDGRID_API_KEY);
  }

  /**
   * Run complete campaign workflow
   */
  async runFullCampaign(options = {}) {
    const {
      target = 500,
      states = ["TX", "AZ", "CA", "FL", "NV"],
      minSqft = 50000,
      dryRun = true,
    } = options;

    console.log("\n🚀 Starting Cold Outbound Campaign");
    console.log("=====================================\n");

    const stats = {
      scraped: 0,
      enriched: 0,
      scored: 0,
      emailsSent: 0,
      qualified: 0,
    };

    try {
      // PHASE 1: DATA COLLECTION
      console.log("📊 PHASE 1: Data Collection");
      console.log("----------------------------");

      for (const state of states) {
        const perState = Math.ceil(target / states.length);
        console.log(`\n🔍 Scraping ${perState} properties in ${state}...`);

        await this.scraper.scrapeProperties({
          state,
          minSqft,
          limit: perState,
        });

        stats.scraped += perState;
      }

      console.log(
        `\n✅ Phase 1 Complete: ${stats.scraped} properties scraped\n`,
      );

      // PHASE 2: ENRICHMENT
      console.log("🔋 PHASE 2: Data Enrichment");
      console.log("----------------------------\n");

      // Step 1: Utility rates
      console.log("💡 Enriching with utility rates...");
      const utilityEnriched = await this.utilityService.enrichLeads(
        stats.scraped,
      );
      stats.enriched = utilityEnriched;

      // Step 2: ROI calculations
      console.log("\n💰 Calculating solar ROI...");
      await this.roiCalculator.enrichLeads(stats.scraped);

      console.log(`\n✅ Phase 2 Complete: ${stats.enriched} leads enriched\n`);

      // PHASE 3: LEAD SCORING
      console.log("🎯 PHASE 3: Lead Scoring");
      console.log("----------------------------\n");

      const scoringResult = await this.scorer.scoreLeads(stats.scraped);
      stats.scored = scoringResult.count;

      console.log(`\n📊 Scoring Statistics:`);
      console.log(`   Average Score: ${scoringResult.avgScore}/100`);
      console.log(`   High Score: ${scoringResult.highScore}`);
      console.log(`   Low Score: ${scoringResult.lowScore}`);
      console.log(`\n✅ Phase 3 Complete: ${stats.scored} leads scored\n`);

      // Get priority breakdown
      const leadStats = await this.scorer.getStats();
      console.log("📈 Lead Distribution:");
      console.log(`   🔥 Hot (80+):    ${leadStats.byPriority.hot} leads`);
      console.log(`   🌡️  Warm (65-79): ${leadStats.byPriority.warm} leads`);
      console.log(`   📊 Medium (50-64): ${leadStats.byPriority.medium} leads`);
      console.log(`   ❄️  Cold (<50):   ${leadStats.byPriority.cold} leads\n`);

      // PHASE 4: OUTREACH
      console.log("📧 PHASE 4: Email Outreach");
      console.log("----------------------------\n");

      // Send first email to hot leads
      console.log("🔥 Sending Email #1 to HOT leads...");
      const hotLeads = await this.scorer.getLeadsByPriority("hot", 100);

      for (const lead of hotLeads) {
        try {
          await this.emailEngine.sendEmail(lead, 1, dryRun);
          stats.emailsSent++;
        } catch (error) {
          console.error(`Failed to send email to ${lead.id}`);
        }
      }

      console.log(`\n✅ Phase 4 Complete: ${stats.emailsSent} emails sent\n`);

      // PHASE 5: REPORTING
      console.log("📊 PHASE 5: Campaign Summary");
      console.log("----------------------------\n");

      const finalStats = await this.getCampaignStats();

      console.log("Campaign Results:");
      console.log(`   Total Leads: ${finalStats.total}`);
      console.log(`   Enriched: ${finalStats.enriched}`);
      console.log(`   Scored: ${finalStats.scored}`);
      console.log(`   Hot Leads: ${finalStats.hotLeads}`);
      console.log(`   Emails Sent: ${stats.emailsSent}`);
      console.log(`\n   Avg System Size: ${finalStats.avgSystemSize} kW`);
      console.log(
        `   Avg Annual Savings: $${Math.round(finalStats.avgAnnualSavings / 1000)}k`,
      );
      console.log(
        `   Total Market Value: $${Math.round(finalStats.totalMarketValue / 1000000)}M\n`,
      );

      // Save campaign record
      await this.saveCampaignRecord({
        name: "Commercial Sun-Belt Q1 2026",
        startDate: new Date().toISOString(),
        target,
        states,
        stats: finalStats,
        status: "active",
      });

      console.log("✅ Campaign launched successfully!\n");
      console.log("📈 Next Steps:");
      console.log("   1. Monitor email engagement (opens, clicks, replies)");
      console.log("   2. Send follow-up sequence (days 3, 7, 14, 21)");
      console.log("   3. Call high-engagement leads");
      console.log("   4. Track qualified leads in CRM\n");

      return stats;
    } catch (error) {
      console.error("\n❌ Campaign Error:", error);
      throw error;
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats() {
    const snapshot = await this.db.collection("commercial_leads").get();
    const leads = snapshot.docs.map((doc) => doc.data());
    const enrichedLeads = leads.filter((l) => l.solarROI);

    const stats = {
      total: leads.length,
      enriched: enrichedLeads.length,
      scored: leads.filter((l) => l.score).length,
      hotLeads: leads.filter((l) => l.priority === "hot").length,
      avgSystemSize: 0,
      avgAnnualSavings: 0,
      totalMarketValue: 0,
    };

    if (enrichedLeads.length > 0) {
      stats.avgSystemSize = Math.round(
        enrichedLeads.reduce((sum, l) => sum + l.systemSize, 0) /
          enrichedLeads.length,
      );
      stats.avgAnnualSavings = Math.round(
        enrichedLeads.reduce((sum, l) => sum + l.estimatedAnnualSavings, 0) /
          enrichedLeads.length,
      );
      stats.totalMarketValue = Math.round(
        enrichedLeads.reduce((sum, l) => sum + l.solarROI.lifetimeValue, 0),
      );
    }

    return stats;
  }

  /**
   * Save campaign record
   */
  async saveCampaignRecord(campaign) {
    const docRef = this.db.collection("campaigns").doc();
    await docRef.set({
      ...campaign,
      id: docRef.id,
      createdAt: new Date().toISOString(),
    });
    console.log(`💾 Campaign saved: ${docRef.id}\n`);
  }

  /**
   * Run daily follow-up workflow
   */
  async runDailyFollowUp() {
    console.log("\n📧 Running Daily Follow-Up Workflow\n");

    // Get leads due for follow-up
    const snapshot = await this.db
      .collection("commercial_leads")
      .where("engagement.lastEmail", "<", 5)
      .where("status", "!=", "unsubscribed")
      .get();

    const leads = snapshot.docs.map((doc) => doc.data());
    const now = new Date();

    for (const lead of leads) {
      const lastContact = new Date(lead.engagement?.lastContact || 0);
      const daysSince = (now - lastContact) / (1000 * 60 * 60 * 24);
      const lastEmail = lead.engagement?.lastEmail || 0;

      // Email sequence timing: Day 0, 3, 7, 14, 21
      const timing = [0, 3, 7, 14, 21];
      const nextEmailDay = timing[lastEmail + 1];

      if (daysSince >= nextEmailDay) {
        const nextSequence = lastEmail + 1;
        console.log(`📧 Sending email ${nextSequence} to ${lead.propertyName}`);

        try {
          await this.emailEngine.sendEmail(lead, nextSequence, false);
        } catch (error) {
          console.error(`Failed: ${error.message}`);
        }
      }
    }

    console.log("\n✅ Daily follow-up complete\n");
  }

  /**
   * Get qualified leads (engaged + high score)
   */
  async getQualifiedLeads() {
    const snapshot = await this.db
      .collection("commercial_leads")
      .where("score", ">=", 70)
      .where("engagement.emailsOpened", ">=", 2)
      .orderBy("score", "desc")
      .limit(100)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log("Campaign Orchestrator - Cold Outbound System\n");
    console.log("Usage:");
    console.log("  node campaign-orchestrator.js --launch [options]");
    console.log("  node campaign-orchestrator.js --follow-up");
    console.log("  node campaign-orchestrator.js --qualified");
    console.log("\nOptions:");
    console.log("  --target <number>    Target number of leads (default: 500)");
    console.log(
      "  --states <list>      Comma-separated states (default: TX,AZ,CA,FL,NV)",
    );
    console.log("  --dry-run            Test mode (no actual emails sent)");
    console.log("\nExamples:");
    console.log(
      "  node campaign-orchestrator.js --launch --target 500 --dry-run",
    );
    console.log(
      "  node campaign-orchestrator.js --launch --states TX,AZ --target 200",
    );
    console.log("  node campaign-orchestrator.js --follow-up");
    process.exit(0);
  }

  const orchestrator = new CampaignOrchestrator();

  if (args.includes("--launch")) {
    const target = parseInt(args[args.indexOf("--target") + 1]) || 500;
    const statesArg = args[args.indexOf("--states") + 1];
    const states = statesArg
      ? statesArg.split(",")
      : ["TX", "AZ", "CA", "FL", "NV"];
    const dryRun = args.includes("--dry-run");

    await orchestrator.runFullCampaign({
      target,
      states,
      minSqft: 50000,
      dryRun,
    });
  } else if (args.includes("--follow-up")) {
    await orchestrator.runDailyFollowUp();
  } else if (args.includes("--qualified")) {
    const qualified = await orchestrator.getQualifiedLeads();
    console.log(`\n🎯 Qualified Leads (${qualified.length}):\n`);
    qualified.forEach((lead, i) => {
      console.log(
        `${i + 1}. ${lead.propertyName} - ${lead.city}, ${lead.state}`,
      );
      console.log(
        `   Score: ${lead.score} | Opened: ${lead.engagement.emailsOpened} times`,
      );
      console.log(
        `   System: ${lead.systemSize}kW | Savings: $${Math.round(lead.estimatedAnnualSavings / 1000)}k/yr\n`,
      );
    });
  } else {
    console.log("Use --help for usage information");
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CampaignOrchestrator;
