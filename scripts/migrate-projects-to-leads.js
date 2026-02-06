/**
 * Migration Script: Projects → Leads
 *
 * Migrates data from legacy `projects` collection to new `leads` collection.
 * Run this once after deploying the new schema.
 *
 * Usage:
 *   node scripts/migrate-projects-to-leads.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without writing to Firestore
 *   --limit N    Only migrate N documents (for testing)
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
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
  console.log("✓ Firebase Admin initialized");
} catch (error) {
  console.error("✗ Failed to initialize Firebase Admin");
  console.error(
    "  Make sure agentic-labs-435536bc0091.json exists in project root",
  );
  process.exit(1);
}

const db = getFirestore();

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;

console.log("\n" + "=".repeat(60));
console.log("MIGRATION: Projects → Leads");
console.log("=".repeat(60));
console.log(
  `Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE (will write to Firestore)"}`,
);
if (limit) console.log(`Limit: ${limit} documents`);
console.log("=".repeat(60) + "\n");

/**
 * Convert project document to lead format
 */
function convertProjectToLead(projectData) {
  return {
    id: projectData.id,
    status: projectData.status === "qualified" ? "qualified" : "new",

    customer: {
      firstName: projectData.customer?.firstName || "",
      lastName: projectData.customer?.lastName || "",
      email: projectData.customer?.email || "",
      phone: projectData.customer?.phone || "",
      userId: projectData.customer?.userId || null,
    },

    address: {
      street: projectData.address?.street || "",
      city: projectData.address?.city || "",
      state: projectData.address?.state || "TX",
      postalCode: projectData.address?.postalCode || "",
      county: projectData.address?.county || "",
      latitude: projectData.address?.latitude || 0,
      longitude: projectData.address?.longitude || 0,
      formattedAddress: projectData.address
        ? `${projectData.address.street}, ${projectData.address.city}, ${projectData.address.state} ${projectData.address.postalCode}`
        : "",
    },

    qualification: projectData.qualification || {
      isHomeowner: true,
      creditScore: "good",
      hasUtilityBill: false,
      utilityBillUrl: null,
    },

    energyCommunity: projectData.energyCommunity || {
      eligible: false,
      msa: null,
      reason: null,
      bonusEligible: false,
    },

    billData: projectData.billData || null,

    systemDesign: projectData.systemDesign || null,

    smartMeterTexas: projectData.smartMeterTexas || {
      linked: false,
      method: null,
      fetchedAt: null,
      autoFetchEnabled: false,
    },

    tracking: projectData.tracking || {
      source: "direct",
      medium: null,
      campaign: null,
      referralCode: null,
      utmParams: null,
      landingPage: "",
      userAgent: "",
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
    tags: [],

    // Preserve original timestamps if they exist
    createdAt: projectData.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Main migration function
 */
async function migrate() {
  try {
    // Get all projects
    console.log("📥 Fetching projects from Firestore...");
    const projectsRef = db.collection("projects");
    let query = projectsRef.orderBy("createdAt", "desc");

    if (limit) {
      query = query.limit(limit);
    }

    const projectsSnapshot = await query.get();
    const totalProjects = projectsSnapshot.size;

    console.log(`✓ Found ${totalProjects} projects to migrate\n`);

    if (totalProjects === 0) {
      console.log("No projects to migrate. Exiting.");
      return;
    }

    // Check if leads already exist
    const leadsRef = db.collection("leads");
    const existingLeadsSnapshot = await leadsRef.limit(1).get();

    if (!existingLeadsSnapshot.empty && !isDryRun) {
      console.warn("⚠️  WARNING: leads collection already contains data");
      console.warn("   This migration will add to existing leads.");
      console.warn(
        "   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n",
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Migrate each project
    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log("🔄 Starting migration...\n");

    for (const projectDoc of projectsSnapshot.docs) {
      const projectData = projectDoc.data();
      const projectId = projectDoc.id;

      try {
        // Convert to lead format
        const leadData = convertProjectToLead({
          id: projectId,
          ...projectData,
        });

        // Validate required fields
        if (!leadData.customer.email) {
          throw new Error("Missing required field: customer.email");
        }

        if (!leadData.address.county) {
          console.warn(
            `  ⚠️  ${projectId}: Missing county, setting to "Unknown"`,
          );
          leadData.address.county = "Unknown";
        }

        if (isDryRun) {
          // Dry run: just log what would happen
          console.log(`  [DRY RUN] Would migrate: ${projectId}`);
          console.log(
            `    Customer: ${leadData.customer.firstName} ${leadData.customer.lastName}`,
          );
          console.log(`    Email: ${leadData.customer.email}`);
          console.log(`    County: ${leadData.address.county}`);
        } else {
          // Live run: write to Firestore
          const leadRef = leadsRef.doc(projectId);

          // Check if lead already exists
          const existingLead = await leadRef.get();
          if (existingLead.exists) {
            console.log(
              `  ⏭️  Skipping ${projectId} (already exists in leads)`,
            );
            migratedCount++; // Count as migrated
            continue;
          }

          await leadRef.set(leadData);
          console.log(`  ✓ Migrated: ${projectId}`);
        }

        migratedCount++;
      } catch (error) {
        errorCount++;
        errors.push({ projectId, error: error.message });
        console.error(`  ✗ Error migrating ${projectId}: ${error.message}`);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total projects: ${totalProjects}`);
    console.log(`✓ Migrated: ${migratedCount}`);
    console.log(`✗ Errors: ${errorCount}`);
    console.log("=".repeat(60) + "\n");

    if (errors.length > 0) {
      console.log("ERRORS:");
      errors.forEach(({ projectId, error }) => {
        console.log(`  ${projectId}: ${error}`);
      });
      console.log("");
    }

    if (isDryRun) {
      console.log("✓ Dry run complete. No changes were made to Firestore.");
      console.log("  Run without --dry-run to perform actual migration.\n");
    } else {
      console.log("✓ Migration complete!\n");
      console.log("Next steps:");
      console.log("  1. Verify leads in Firebase Console");
      console.log("  2. Test queries with new leads collection");
      console.log("  3. Update app code to use leads instead of projects");
      console.log(
        "  4. After verification, consider archiving projects collection\n",
      );
    }
  } catch (error) {
    console.error("\n✗ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
