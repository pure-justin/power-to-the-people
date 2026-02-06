#!/usr/bin/env node
/**
 * Test Campaign Workflow
 * Quick test with 10 sample leads
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const LoopNetScraper = require("./scrapers/loopnet-scraper");
const UtilityRateService = require("./enrichment/utility-rates");
const ROICalculator = require("./enrichment/roi-calculator");
const LeadScorer = require("./enrichment/lead-scorer");
const EmailEngine = require("./outreach/email-engine");

async function testWorkflow() {
  console.log("\n🧪 Testing Campaign Workflow");
  console.log("============================\n");

  // Initialize Firebase with service account
  try {
    const serviceAccountPath = path.join(
      __dirname,
      "../firebase-service-account.json",
    );
    initializeApp({
      credential: cert(serviceAccountPath),
    });
    console.log("✅ Firebase initialized\n");
  } catch (error) {
    if (error.code === "app/duplicate-app") {
      console.log("✅ Firebase already initialized\n");
    } else {
      console.error("❌ Firebase initialization failed:", error.message);
      console.log("\n📝 Make sure firebase-service-account.json exists at:");
      console.log(
        "   /Users/admin/Projects/power-to-the-people/firebase-service-account.json\n",
      );
      process.exit(1);
    }
  }

  const scraper = new LoopNetScraper();
  const utilityService = new UtilityRateService();
  const roiCalculator = new ROICalculator();
  const scorer = new LeadScorer();
  const emailEngine = new EmailEngine(process.env.SENDGRID_API_KEY);

  try {
    // 1. Scrape 10 test leads
    console.log("📊 Step 1: Scraping 10 test leads...");
    await scraper.scrapeProperties({
      state: "TX",
      minSqft: 50000,
      limit: 10,
    });
    console.log("✅ Scraped 10 leads\n");

    // 2. Enrich with utility rates
    console.log("🔋 Step 2: Enriching with utility rates...");
    await utilityService.enrichLeads(10);
    console.log("✅ Enriched with utility data\n");

    // 3. Calculate ROI
    console.log("💰 Step 3: Calculating solar ROI...");
    await roiCalculator.enrichLeads(10);
    console.log("✅ Calculated ROI\n");

    // 4. Score leads
    console.log("🎯 Step 4: Scoring leads...");
    const scoringResult = await scorer.scoreLeads(10);
    console.log(`✅ Scored ${scoringResult.count} leads`);
    console.log(`   Average Score: ${scoringResult.avgScore}/100`);
    console.log(`   High Score: ${scoringResult.highScore}\n`);

    // 5. Get stats
    console.log("📊 Step 5: Getting statistics...");
    const stats = await scorer.getStats();
    console.log("Lead Distribution:");
    console.log(`   🔥 Hot:    ${stats.byPriority.hot}`);
    console.log(`   🌡️  Warm:   ${stats.byPriority.warm}`);
    console.log(`   📊 Medium: ${stats.byPriority.medium}`);
    console.log(`   ❄️  Cold:   ${stats.byPriority.cold}\n`);

    // 6. Preview top lead email
    const topLeads = stats.topLeads.slice(0, 1);
    if (topLeads.length > 0) {
      const topLead = topLeads[0];
      console.log("📧 Step 6: Previewing email for top lead...");
      console.log(`   Property: ${topLead.propertyName}`);
      console.log(`   Score: ${topLead.score}`);
      console.log(`   System Size: ${topLead.systemSize} kW`);
      console.log(
        `   Annual Savings: $${Math.round(topLead.annualSavings / 1000)}k\n`,
      );

      // Get full lead data
      const db = getFirestore();
      const leadDoc = await db
        .collection("commercial_leads")
        .doc(topLead.id)
        .get();
      if (leadDoc.exists) {
        const email = emailEngine.generateEmail(leadDoc.data(), 1);
        console.log("--- EMAIL PREVIEW ---");
        console.log(`Subject: ${email.subject}`);
        console.log("\nBody:");
        console.log(email.body);
        console.log("--- END EMAIL ---\n");
      }
    }

    console.log("✅ Test workflow complete!\n");
    console.log("📈 Next steps:");
    console.log("   1. Review leads in Firestore");
    console.log("   2. Configure SendGrid API key");
    console.log("   3. Run full campaign with --launch\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

testWorkflow();
