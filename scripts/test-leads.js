/**
 * Test Script: Leads Schema
 *
 * Tests the leads collection schema by creating sample data
 * and running common queries.
 *
 * Usage:
 *   node scripts/test-leads.js
 */

const { initializeApp, cert } = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");
const path = require("path");

// Initialize Firebase Admin
const serviceAccountPath = path.join(
  __dirname,
  "..",
  "agentic-labs-435536bc0091.json",
);

try {
  const serviceAccount = require(serviceAccountPath);
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "agentic-labs",
  });
  console.log("✓ Firebase Admin initialized\n");
} catch (error) {
  console.error("✗ Failed to initialize Firebase Admin");
  console.error(
    "  Make sure agentic-labs-435536bc0091.json exists in project root",
  );
  process.exit(1);
}

const db = getFirestore();

/**
 * Create a sample lead for testing
 */
function createSampleLead() {
  return {
    id: `PTTP-TEST-${Date.now()}`,
    status: "qualified",

    customer: {
      firstName: "Test",
      lastName: "Customer",
      email: `test-${Date.now()}@example.com`,
      phone: "(512) 555-1234",
      userId: null,
    },

    address: {
      street: "123 Solar Lane",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      county: "Travis",
      latitude: 30.2672,
      longitude: -97.7431,
      formattedAddress: "123 Solar Lane, Austin, TX 78701",
    },

    qualification: {
      isHomeowner: true,
      creditScore: "excellent",
      hasUtilityBill: true,
      utilityBillUrl: "https://storage.googleapis.com/test/bill.pdf",
    },

    energyCommunity: {
      eligible: true,
      msa: "Austin-Round Rock-Georgetown, TX",
      reason:
        "Non-Metropolitan Statistical Area (non-MSA) with fossil fuel employment share > 25%",
      bonusEligible: true,
    },

    billData: {
      source: "utility_bill",
      provider: "Austin Energy",
      esiid: "10123456789012345",
      accountNumber: "12345678",

      monthlyUsageKwh: 1200,
      annualUsageKwh: 14400,
      monthlyBillAmount: 168.5,

      energyRate: 14.0,
      hasTimeOfUse: false,

      isEstimated: false,
      estimateMethod: null,
      scanConfidence: 0.95,

      historicalData: [
        { month: "2024-01", usageKwh: 1100, cost: 154.0 },
        { month: "2024-02", usageKwh: 1000, cost: 140.0 },
        { month: "2024-03", usageKwh: 1150, cost: 161.0 },
      ],
    },

    systemDesign: {
      recommendedPanelCount: 24,
      systemSizeKw: 9.6,
      annualProductionKwh: 14400,
      offsetPercentage: 1.0,

      estimatedCost: 28800,
      federalTaxCredit: 11520, // 40% with energy community bonus
      netCost: 17280,
      estimatedMonthlySavings: 168.5,
      estimatedAnnualSavings: 2022,
      paybackPeriodYears: 8.5,

      roofSegmentCount: 2,
      maxPanelCapacity: 32,
      solarPotentialKwh: 19200,
      sunshineHoursPerYear: 2650,

      panels: [
        {
          lat: 30.2672,
          lng: -97.7431,
          orientation: "LANDSCAPE",
          azimuth: 180,
          pitch: 20,
          annualKwh: 600,
        },
      ],
    },

    smartMeterTexas: {
      linked: false,
      method: null,
      fetchedAt: null,
      autoFetchEnabled: false,
    },

    tracking: {
      source: "organic",
      medium: null,
      campaign: null,
      referralCode: null,
      utmParams: null,
      landingPage: "https://power-to-the-people.com",
      userAgent: "Mozilla/5.0 Test Browser",
    },

    progress: {
      qualificationCompleted: true,
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

    notes: [],
    assignedTo: null,
    assignedAt: null,
    tags: ["test"],

    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Test CRUD operations
 */
async function testCRUD() {
  console.log("=".repeat(60));
  console.log("TEST 1: CRUD Operations");
  console.log("=".repeat(60) + "\n");

  const sampleLead = createSampleLead();
  const leadId = sampleLead.id;

  try {
    // CREATE
    console.log("1. Creating test lead...");
    const leadRef = db.collection("leads").doc(leadId);
    await leadRef.set(sampleLead);
    console.log(`   ✓ Created lead: ${leadId}\n`);

    // READ
    console.log("2. Reading lead...");
    const leadSnap = await leadRef.get();
    if (leadSnap.exists) {
      const data = leadSnap.data();
      console.log(
        `   ✓ Read lead: ${data.customer.firstName} ${data.customer.lastName}`,
      );
      console.log(`   ✓ Email: ${data.customer.email}`);
      console.log(`   ✓ County: ${data.address.county}\n`);
    } else {
      throw new Error("Lead not found after creation");
    }

    // UPDATE
    console.log("3. Updating lead status...");
    await leadRef.update({
      status: "contacted",
      updatedAt: FieldValue.serverTimestamp(),
    });
    const updatedSnap = await leadRef.get();
    console.log(`   ✓ Updated status to: ${updatedSnap.data().status}\n`);

    // DELETE (cleanup)
    console.log("4. Cleaning up test lead...");
    await leadRef.delete();
    console.log(`   ✓ Deleted test lead\n`);

    console.log("✅ CRUD test passed!\n");
    return leadId;
  } catch (error) {
    console.error("❌ CRUD test failed:", error.message);
    throw error;
  }
}

/**
 * Test common queries
 */
async function testQueries() {
  console.log("=".repeat(60));
  console.log("TEST 2: Common Queries");
  console.log("=".repeat(60) + "\n");

  try {
    // Query 1: Get all qualified leads
    console.log("1. Query: Get qualified leads");
    const qualifiedQuery = await db
      .collection("leads")
      .where("status", "==", "qualified")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    console.log(`   ✓ Found ${qualifiedQuery.size} qualified leads\n`);

    // Query 2: Get leads by county
    console.log("2. Query: Get leads by county (Travis)");
    const countyQuery = await db
      .collection("leads")
      .where("address.county", "==", "Travis")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    console.log(`   ✓ Found ${countyQuery.size} leads in Travis County\n`);

    // Query 3: Get energy community eligible leads
    console.log("3. Query: Get energy community eligible leads");
    const ecQuery = await db
      .collection("leads")
      .where("energyCommunity.eligible", "==", true)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    console.log(`   ✓ Found ${ecQuery.size} energy community eligible leads\n`);

    console.log("✅ Query test passed!\n");
  } catch (error) {
    console.error("❌ Query test failed:", error.message);
    if (error.message.includes("index")) {
      console.error("\n⚠️  Missing index! Deploy indexes with:");
      console.error("   firebase deploy --only firestore:indexes\n");
    }
    throw error;
  }
}

/**
 * Test security (would need client SDK for full test)
 */
async function testSecurity() {
  console.log("=".repeat(60));
  console.log("TEST 3: Security Rules (Admin SDK bypass)");
  console.log("=".repeat(60) + "\n");

  console.log("ℹ️  Admin SDK bypasses security rules");
  console.log("   To test security, use Firebase Emulator Suite:");
  console.log("   firebase emulators:start\n");

  console.log("✅ Security test skipped (admin access)\n");
}

/**
 * Run all tests
 */
async function runTests() {
  console.log("\n🧪 FIRESTORE SCHEMA TESTS\n");

  try {
    await testCRUD();
    await testQueries();
    await testSecurity();

    console.log("=".repeat(60));
    console.log("✅ ALL TESTS PASSED");
    console.log("=".repeat(60) + "\n");

    console.log("Next steps:");
    console.log(
      "  1. Deploy security rules: firebase deploy --only firestore:rules",
    );
    console.log(
      "  2. Deploy indexes: firebase deploy --only firestore:indexes",
    );
    console.log("  3. Update app code to use leadsService.js");
    console.log("  4. Test in development environment\n");

    process.exit(0);
  } catch (error) {
    console.error("\n=".repeat(60));
    console.error("❌ TESTS FAILED");
    console.error("=".repeat(60));
    console.error("Error:", error.message);
    console.error("");
    process.exit(1);
  }
}

// Run tests
runTests();
