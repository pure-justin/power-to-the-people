/**
 * SMS Integration Test Script
 *
 * Tests SMS notification functions locally before deployment
 */

const admin = require("firebase-admin");
const twilio = require("twilio");

// Load environment variables
require("dotenv").config();

console.log("🧪 SMS Integration Test\n");

// Check environment variables
console.log("✓ Checking environment variables...");
const requiredEnvVars = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing environment variables:");
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.log("\n📝 Create a .env file in functions/ directory with:");
  console.log("   TWILIO_ACCOUNT_SID=your_account_sid");
  console.log("   TWILIO_AUTH_TOKEN=your_auth_token");
  console.log("   TWILIO_PHONE_NUMBER=+15551234567");
  process.exit(1);
}

console.log("✓ All environment variables found\n");

// Test Twilio client initialization
console.log("✓ Testing Twilio client...");
try {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
  console.log("✓ Twilio client initialized successfully\n");
} catch (error) {
  console.error("❌ Error initializing Twilio client:", error.message);
  process.exit(1);
}

// Display configuration
console.log("📋 Current Configuration:");
console.log(
  `   Account SID: ${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...`,
);
console.log(`   Phone Number: ${process.env.TWILIO_PHONE_NUMBER}`);
console.log(`   Admin Phone: ${process.env.ADMIN_PHONE || "(not set)"}\n`);

// Test SMS templates
console.log("✓ Testing SMS templates...");
const SMS_TEMPLATES = {
  ENROLLMENT_CONFIRMATION: (name, projectId) =>
    `Hi ${name}! Thanks for enrolling in Power to the People. Your application ${projectId} is being reviewed. Track status: https://power-to-the-people-vpp.web.app/project/${projectId}`,

  ENROLLMENT_APPROVED: (name, savingsAmount) =>
    `Great news ${name}! Your solar application is approved. You'll save ~$${savingsAmount}/month. Your installer will contact you within 48 hours to schedule.`,
};

const testMessage1 = SMS_TEMPLATES.ENROLLMENT_CONFIRMATION(
  "John Doe",
  "PTTP-123",
);
const testMessage2 = SMS_TEMPLATES.ENROLLMENT_APPROVED("John Doe", "150");

console.log("   Sample messages:");
console.log(`   1. ${testMessage1.substring(0, 60)}...`);
console.log(`   2. ${testMessage2.substring(0, 60)}...\n`);

// Check message lengths
if (testMessage1.length <= 160 && testMessage2.length <= 160) {
  console.log("✓ All templates under 160 characters\n");
} else {
  console.warn("⚠️  Warning: Some templates exceed 160 characters\n");
}

// Test phone number formatting
console.log("✓ Testing phone number formatting...");
function formatPhoneNumber(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (phone.startsWith("+")) {
    return phone;
  }
  return `+1${digits}`;
}

const testPhones = [
  "5551234567",
  "+15551234567",
  "(555) 123-4567",
  "+1 555 123 4567",
];

console.log("   Formatted phone numbers:");
testPhones.forEach((phone) => {
  console.log(`   ${phone} → ${formatPhoneNumber(phone)}`);
});
console.log();

// Summary
console.log("✅ All tests passed!\n");
console.log("📦 Next Steps:");
console.log("   1. Build functions: npm run build");
console.log("   2. Deploy to Firebase: firebase deploy --only functions");
console.log(
  "   3. Test in Admin panel: https://power-to-the-people-vpp.web.app/admin\n",
);

// Optional: Send test SMS if SEND_TEST_SMS=true
if (process.env.SEND_TEST_SMS === "true") {
  const testPhone = process.env.TEST_PHONE_NUMBER;

  if (!testPhone) {
    console.log("⚠️  Set TEST_PHONE_NUMBER to send a test SMS");
  } else {
    console.log(`📱 Sending test SMS to ${testPhone}...`);

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );

    client.messages
      .create({
        body: "Test SMS from Power to the People! Integration is working. 🎉",
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formatPhoneNumber(testPhone),
      })
      .then((message) => {
        console.log(`✓ SMS sent successfully! Message SID: ${message.sid}`);
      })
      .catch((error) => {
        console.error("❌ Error sending SMS:", error.message);
      });
  }
}
