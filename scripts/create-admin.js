/**
 * Script to create an admin user in Firebase
 *
 * Usage:
 *   node scripts/create-admin.js <email> <password> <displayName>
 *
 * Example:
 *   node scripts/create-admin.js admin@example.com SecurePass123 "Admin User"
 *
 * This will:
 * 1. Create a new Firebase Auth user
 * 2. Add a user document in Firestore with role: 'admin'
 *
 * Note: You need to run this with Firebase Admin SDK credentials
 * For now, you can manually create the user via Firebase Console:
 * 1. Go to Firebase Console > Authentication
 * 2. Add user with email/password
 * 3. Go to Firestore > users collection
 * 4. Create document with the user's UID and add:
 *    {
 *      email: "admin@example.com",
 *      displayName: "Admin User",
 *      role: "admin",
 *      createdAt: [timestamp]
 *    }
 */

const admin = require("firebase-admin");
const path = require("path");

// Check if service account file exists
const serviceAccountPath = path.join(
  __dirname,
  "..",
  "agentic-labs-firebase-admin.json",
);

try {
  const serviceAccount = require(serviceAccountPath);

  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "agentic-labs",
  });

  const auth = admin.auth();
  const db = admin.firestore();

  // Get command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      "Usage: node create-admin.js <email> <password> [displayName]",
    );
    console.error(
      'Example: node create-admin.js admin@example.com SecurePass123 "Admin User"',
    );
    process.exit(1);
  }

  const [email, password, displayName = "Admin"] = args;

  async function createAdmin() {
    try {
      // Create user in Firebase Auth
      console.log(`Creating user: ${email}...`);
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
      });

      console.log(`✓ User created with UID: ${userRecord.uid}`);

      // Create user document in Firestore
      console.log("Creating Firestore document...");
      await db.collection("users").doc(userRecord.uid).set({
        email,
        displayName,
        role: "admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✓ Admin user created successfully!");
      console.log("\nAdmin credentials:");
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  Role: admin`);
      console.log("\nYou can now login at: http://localhost:5173/admin");

      process.exit(0);
    } catch (error) {
      console.error("Error creating admin:", error.message);

      if (error.code === "auth/email-already-exists") {
        console.log("\nUser already exists. Updating role to admin...");
        try {
          const user = await auth.getUserByEmail(email);
          await db.collection("users").doc(user.uid).set(
            {
              email,
              displayName,
              role: "admin",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          console.log("✓ User role updated to admin");
          process.exit(0);
        } catch (updateError) {
          console.error("Error updating user:", updateError.message);
          process.exit(1);
        }
      } else {
        process.exit(1);
      }
    }
  }

  createAdmin();
} catch (error) {
  if (error.code === "MODULE_NOT_FOUND") {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Firebase Admin SDK not configured");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nTo use this script:");
    console.log("1. Download service account key from Firebase Console");
    console.log("2. Save as: agentic-labs-firebase-admin.json");
    console.log(
      "3. Run: node scripts/create-admin.js <email> <password> [displayName]",
    );
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Manual Setup (Alternative)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n1. Firebase Console > Authentication > Users > Add user");
    console.log("   - Email: admin@example.com");
    console.log("   - Password: [your choice]");
    console.log("\n2. Firebase Console > Firestore > users collection");
    console.log('   - Click "Add document"');
    console.log("   - Document ID: [copy the UID from step 1]");
    console.log("   - Fields:");
    console.log('     • email (string): "admin@example.com"');
    console.log('     • displayName (string): "Admin User"');
    console.log('     • role (string): "admin"');
    console.log("     • createdAt (timestamp): [current time]");
    console.log("\n3. Login at: http://localhost:5173/admin");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } else {
    console.error("Error:", error.message);
  }
  process.exit(1);
}
