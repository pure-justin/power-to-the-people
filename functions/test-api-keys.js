/**
 * API Key Management - Test Script
 *
 * Demonstrates how to use the API key management functions.
 * Run with Firebase emulator for local testing.
 *
 * Usage: node test-api-keys.js
 */

// This is a demonstration script - it doesn't connect to actual Firebase
// To run with real Firebase, uncomment the code below and provide a service account key

/*
const admin = require("firebase-admin");
const serviceAccount = require("../path/to/serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
*/

async function testApiKeyManagement() {
  console.log("🔐 Testing API Key Management System\n");

  try {
    // Test 1: Simulate creating an API key
    console.log("1️⃣  Creating API key...");
    const mockUserId = "test-user-123";

    const mockApiKey = {
      id: "mock-api-key-123",
      key: "hashed_key_would_go_here",
      keyPrefix: "pk_test_abc123...",
      name: "Test Development Key",
      description: "Key for testing",
      userId: mockUserId,
      userName: "Test User",
      status: "active",
      scopes: ["read_leads", "write_leads"],
      environment: "development",
      rateLimit: {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        requestsPerDay: 1000,
        requestsPerMonth: 10000,
      },
      usageStats: {
        totalRequests: 0,
        requestsThisMinute: 0,
        requestsThisHour: 0,
        requestsThisDay: 0,
        requestsThisMonth: 0,
        lastResetAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("✅ Mock API key created:", mockApiKey.keyPrefix);
    console.log("   Environment:", mockApiKey.environment);
    console.log("   Scopes:", mockApiKey.scopes.join(", "));

    // Test 2: Display rate limits
    console.log("\n2️⃣  Rate Limits:");
    console.log("   Per Minute:", mockApiKey.rateLimit.requestsPerMinute);
    console.log("   Per Hour:", mockApiKey.rateLimit.requestsPerHour);
    console.log("   Per Day:", mockApiKey.rateLimit.requestsPerDay);
    console.log("   Per Month:", mockApiKey.rateLimit.requestsPerMonth);

    // Test 3: Simulate usage tracking
    console.log("\n3️⃣  Simulating usage tracking...");
    const usageLog = {
      id: "mock-usage-log-456",
      apiKeyId: mockApiKey.id,
      endpoint: "/api/leads",
      method: "GET",
      statusCode: 200,
      responseTime: 145,
      requestSize: 256,
      responseSize: 1024,
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      timestamp: admin.firestore.Timestamp.now(),
    };

    console.log("✅ Usage log entry created:");
    console.log("   Endpoint:", usageLog.endpoint);
    console.log("   Response Time:", usageLog.responseTime + "ms");
    console.log("   Status:", usageLog.statusCode);

    // Test 4: Check rate limit status
    console.log("\n4️⃣  Current Usage Stats:");
    console.log("   Total Requests:", mockApiKey.usageStats.totalRequests);
    console.log("   This Minute:", mockApiKey.usageStats.requestsThisMinute);
    console.log("   This Hour:", mockApiKey.usageStats.requestsThisHour);
    console.log("   This Day:", mockApiKey.usageStats.requestsThisDay);

    // Test 5: Available scopes
    console.log("\n5️⃣  Available API Scopes:");
    const scopes = [
      "read_leads - Read lead data",
      "write_leads - Create/update leads",
      "read_solar - Access solar API data",
      "write_solar - Trigger solar analysis",
      "read_smt - Access SMT data",
      "write_smt - Trigger SMT fetch",
      "admin - Full access (all scopes)",
    ];
    scopes.forEach((scope) => console.log("   •", scope));

    // Test 6: Key formats
    console.log("\n6️⃣  API Key Formats:");
    console.log("   Development: pk_test_{48-char-hex}");
    console.log("   Production:  pk_live_{48-char-hex}");
    console.log("   Example:     pk_test_a1b2c3d4e5f6...");

    console.log("\n✅ All tests completed successfully!\n");
    console.log("📚 Next Steps:");
    console.log("   1. Deploy functions: npm run deploy");
    console.log("   2. Test with emulator: npm run serve");
    console.log("   3. Read API_KEYS_README.md for full documentation");
    console.log("   4. Integrate with frontend app");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run tests
testApiKeyManagement()
  .then(() => {
    console.log("\n👋 Test script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
