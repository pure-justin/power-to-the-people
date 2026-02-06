#!/usr/bin/env node
/**
 * Test SendGrid Configuration
 * Sends a test email to verify SendGrid is working
 */

import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, ".env") });

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL =
  process.env.OUTREACH_FROM_EMAIL || "justin@powertothepeople.solar";
const TEST_TO_EMAIL = process.argv[2] || "justin@agntc.tech";

async function testSendGrid() {
  console.log("\n🧪 Testing SendGrid Configuration");
  console.log("=".repeat(50));

  // Check if API key is set
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY === "") {
    console.error("\n❌ SENDGRID_API_KEY not set in .env file");
    console.log("\n📝 To fix:");
    console.log(
      "1. Get API key from: https://app.sendgrid.com/settings/api_keys",
    );
    console.log("2. Add to .env file: SENDGRID_API_KEY=SG.xxxxxxxx");
    console.log("3. Run this script again\n");
    process.exit(1);
  }

  console.log(`✅ API Key: ${SENDGRID_API_KEY.substring(0, 10)}...`);
  console.log(`✅ From: ${FROM_EMAIL}`);
  console.log(`✅ To: ${TEST_TO_EMAIL}`);

  // Configure SendGrid
  sgMail.setApiKey(SENDGRID_API_KEY);

  // Create test email
  const msg = {
    to: TEST_TO_EMAIL,
    from: FROM_EMAIL,
    subject: "🔆 SendGrid Test - Commercial Solar Campaign",
    text: `
This is a test email from the Commercial Solar Campaign system.

If you're seeing this, SendGrid is configured correctly!

System Details:
- Campaign: Commercial Sun-Belt Q1 2026
- Target: 500 commercial properties
- Goal: 50 qualified leads in 30 days

Next steps:
1. ✅ SendGrid is working
2. Create Firestore indexes
3. Run test campaign (--dry-run)
4. Launch production campaign

---
Power to the People Solar
justin@powertothepeople.solar
    `.trim(),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🔆 SendGrid Test Email</h2>
        <p><strong>Success!</strong> This email was sent via SendGrid from the Commercial Solar Campaign system.</p>

        <h3>Campaign Overview</h3>
        <ul>
          <li><strong>Target:</strong> 500 commercial properties in sun-belt states</li>
          <li><strong>Goal:</strong> 50 qualified leads in 30 days</li>
          <li><strong>Method:</strong> Personalized ROI calculations + automated email sequences</li>
        </ul>

        <h3>Next Steps</h3>
        <ol>
          <li>✅ SendGrid configured</li>
          <li>Create Firestore indexes</li>
          <li>Run test campaign with <code>--dry-run</code></li>
          <li>Launch production campaign</li>
        </ol>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Power to the People Solar</strong><br>
          Commercial Solar Solutions<br>
          justin@powertothepeople.solar
        </p>
      </div>
    `,
  };

  try {
    console.log("\n📤 Sending test email...");
    const response = await sgMail.send(msg);

    console.log("\n✅ Email sent successfully!");
    console.log(`✅ Status Code: ${response[0].statusCode}`);
    console.log(`✅ Message ID: ${response[0].headers["x-message-id"]}`);
    console.log(`\n📬 Check your inbox at: ${TEST_TO_EMAIL}`);
    console.log("=".repeat(50));
    console.log("\n✅ SendGrid is ready to use!\n");
  } catch (error) {
    console.error("\n❌ Failed to send email");
    console.error("Error:", error.message);

    if (error.response) {
      console.error("Response:", JSON.stringify(error.response.body, null, 2));
    }

    console.log("\n🔧 Troubleshooting:");
    console.log('1. Verify API key has "Mail Send" permission');
    console.log("2. Check from email is verified in SendGrid");
    console.log("3. See SENDGRID_SETUP.md for detailed help\n");

    process.exit(1);
  }
}

testSendGrid();
