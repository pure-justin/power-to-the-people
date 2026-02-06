/**
 * Email Engine - SendGrid Integration
 * Manages automated email campaigns with tracking
 */

import sgMail from "@sendgrid/mail";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { initializeApp, cert } from "firebase-admin/app";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailEngine {
  constructor(options = {}) {
    this.sendGridApiKey =
      options.sendGridApiKey || process.env.SENDGRID_API_KEY;
    this.fromEmail = options.fromEmail || "solar@powertothepeople.solar";
    this.fromName = options.fromName || "Power to the People Solar";
    this.db = null;
    this.dryRun = options.dryRun || false;

    if (this.sendGridApiKey) {
      sgMail.setApiKey(this.sendGridApiKey);
    }

    this.initialize();
  }

  async initialize() {
    try {
      const serviceAccountPath = path.join(
        __dirname,
        "../../../firebase-service-account.json",
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
   * Email templates
   */
  getTemplates() {
    return {
      email1: {
        subject: (lead) =>
          `${lead.propertyName} - $${Math.round(lead.estimatedAnnualSavings / 1000)}K/year solar savings opportunity`,

        body: (lead) =>
          `
Hi ${lead.contactName || "Property Manager"},

I'm reaching out regarding ${lead.propertyName || `your ${lead.buildingType} property`} in ${lead.city}, ${lead.state}.

Based on your building's ${lead.squareFootage.toLocaleString()} sq ft footprint and ${lead.utilityName} electric rates of $${lead.utilityRate.toFixed(3)}/kWh, you're currently spending approximately **$${Math.round(lead.annualElectricityCost / 1000)}K/year** on electricity.

I've prepared a solar analysis specifically for your property:

**Solar Potential:**
• ${lead.estimatedSystemSize} kW commercial solar system
• ${lead.estimatedAnnualProduction.toLocaleString()} kWh annual production
• ${lead.solarOffsetPercentage}% of your electricity offset

**Financial Returns:**
• **$${Math.round(lead.estimatedAnnualSavings / 1000)}K/year in energy savings**
• ${lead.paybackPeriod} year payback period
• ${lead.roi25Year}% ROI over 25 years
• $${Math.round(lead.totalSavings25Year / 1000)}K total 25-year savings

**After federal tax credits & MACRS depreciation:**
• Gross system cost: $${Math.round(lead.estimatedSystemCost / 1000)}K
• Net cost: $${Math.round(lead.netSystemCost / 1000)}K (after $${Math.round(lead.federalTaxCredit / 1000)}K in federal incentives)

${lead.state === "CA" ? "⚡ California properties also qualify for additional state incentives and accelerated permitting.\n" : ""}${lead.state === "TX" ? "⚡ Texas has no state income tax, making federal benefits even more valuable.\n" : ""}${lead.utilityRate > 0.15 ? "⚡ Your high electric rates make solar particularly attractive.\n" : ""}
Would you be interested in a 15-minute call to discuss how we can help you **eliminate your electric bills** while increasing your property value?

I can show you:
• Custom roof layout with panel placement
• Detailed 25-year cash flow projections
• Financing options ($0 down available)
• Installation timeline (typically 60-90 days)

Best times for you this week?

Best regards,
Justin Belmont
Power to the People Solar
(555) 123-4567 | justin@powertothepeople.solar

P.S. Act soon to lock in current incentive rates before they step down.
        `.trim(),
      },

      email2: {
        subject: (lead) => `Quick follow-up: ${lead.city} solar analysis`,

        body: (lead) =>
          `
${lead.contactName || "Hi"},

Following up on the solar analysis I sent for ${lead.propertyName}.

I know your time is valuable, so here's the **bottom line**:

✅ $${Math.round(lead.estimatedAnnualSavings / 1000)}K/year savings
✅ ${lead.paybackPeriod} years to break even
✅ $${Math.round(lead.federalTaxCredit / 1000)}K in federal incentives
✅ Hedges against future rate increases (utilities raise rates ~3% annually)

**No-obligation next step:** 15-minute call to review your custom analysis and answer questions.

If timing isn't right, that's okay - just let me know when might be better.

Best,
Justin Belmont
Power to the People Solar
        `.trim(),
      },

      email3: {
        subject: (lead) =>
          `Case study: Similar ${lead.buildingType} saved $${Math.round((lead.estimatedAnnualSavings * 1.2) / 1000)}K/year`,

        body: (lead) =>
          `
${lead.contactName || "Hi"},

I wanted to share a recent success story that might resonate:

We recently completed a ${lead.estimatedSystemSize} kW system for a ${lead.buildingType} property in ${lead.city} (similar to yours).

**Their results after 12 months:**
• Annual savings: $${Math.round((lead.estimatedAnnualSavings * 1.2) / 1000)}K
• Payback: ${Math.max(lead.paybackPeriod - 0.5, 3)} years (better than projected)
• Property value increase: $${Math.round((lead.estimatedSystemCost * 1.3) / 1000)}K
• Zero maintenance issues

**What made them decide to move forward:**
1. Rising electricity costs in ${lead.state}
2. Federal tax credit covering 30% of costs
3. MACRS depreciation benefits
4. Positive cash flow from year 1

Your property has similar potential. Want to see how the numbers compare?

Happy to answer any questions.

Justin Belmont
Power to the People Solar
        `.trim(),
      },

      email4: {
        subject: (lead) =>
          `Last call: Solar opportunity for ${lead.propertyName}`,

        body: (lead) =>
          `
${lead.contactName || "Hi"},

I'll keep this brief since I know you're busy.

This is my last follow-up regarding the solar opportunity for ${lead.propertyName}.

**Quick summary:**
• $${Math.round(lead.estimatedAnnualSavings / 1000)}K/year you're leaving on the table
• $${Math.round(lead.federalTaxCredit / 1000)}K in federal incentives available now
• ${lead.roi25Year}% ROI over 25 years

If you'd like to explore this further, I'm here to help. If not, I completely understand and won't reach out again.

Just reply "INTERESTED" or "NOT NOW" so I know where things stand.

Thanks for your time,
Justin Belmont

P.S. If there's someone else at your organization who handles energy decisions, I'd appreciate an introduction.
        `.trim(),
      },

      email5: {
        subject: (lead) =>
          `Breakup email: Closing file for ${lead.propertyName}`,

        body: (lead) =>
          `
${lead.contactName || "Hi"},

I'm officially closing my file on ${lead.propertyName}.

No hard feelings - I know solar isn't for everyone, and timing matters.

If circumstances change down the road, feel free to reach out. I'll still have your analysis on file.

In the meantime, here's one thing you can do **for free** to reduce energy costs:
• Get a free energy audit from ${lead.utilityName}
• They often offer rebates for LED upgrades and HVAC improvements

Best of luck,
Justin Belmont
Power to the People Solar

P.S. My door's always open if you want to revisit this.
        `.trim(),
      },
    };
  }

  /**
   * Generate personalized email
   */
  generateEmail(lead, sequenceNumber) {
    const templates = this.getTemplates();
    const templateKey = `email${sequenceNumber}`;
    const template = templates[templateKey];

    if (!template) {
      throw new Error(`Template ${templateKey} not found`);
    }

    return {
      subject: template.subject(lead),
      body: template.body(lead),
    };
  }

  /**
   * Send email via SendGrid
   */
  async sendEmail(to, subject, body) {
    if (this.dryRun) {
      console.log(`\n📧 DRY RUN - Would send email:`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body preview: ${body.substring(0, 100)}...`);
      return { messageId: "dry-run", status: "sent" };
    }

    if (!this.sendGridApiKey) {
      throw new Error("SendGrid API key not configured");
    }

    const msg = {
      to,
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject,
      text: body,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    };

    try {
      const [response] = await sgMail.send(msg);
      return {
        messageId: response.headers["x-message-id"],
        status: "sent",
      };
    } catch (error) {
      console.error("SendGrid error:", error.response?.body || error.message);
      throw error;
    }
  }

  /**
   * Send campaign email to lead
   */
  async sendCampaignEmail(leadId, sequenceNumber) {
    try {
      const leadRef = this.db.collection("commercial_leads").doc(leadId);
      const leadDoc = await leadRef.get();

      if (!leadDoc.exists) {
        throw new Error(`Lead ${leadId} not found`);
      }

      const lead = leadDoc.data();

      // Check if lead has email
      if (!lead.contactEmail) {
        console.log(`   ⚠️  No email for ${lead.propertyName}`);
        return null;
      }

      // Generate email
      const email = this.generateEmail(lead, sequenceNumber);

      // Send email
      const result = await this.sendEmail(
        lead.contactEmail,
        email.subject,
        email.body,
      );

      // Update lead in Firestore
      await leadRef.update({
        emailSequence: sequenceNumber,
        emailsSent: FieldValue.increment(1),
        lastContactedAt: Timestamp.now(),
        lastEmailSentAt: Timestamp.now(),
        [`email${sequenceNumber}SentAt`]: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Log email sent
      await this.db.collection("campaign_emails").add({
        leadId,
        leadName: lead.propertyName,
        recipientEmail: lead.contactEmail,
        sequenceNumber,
        subject: email.subject,
        messageId: result.messageId,
        status: result.status,
        sentAt: Timestamp.now(),
      });

      return result;
    } catch (error) {
      console.error(`Error sending email to lead ${leadId}:`, error.message);
      return null;
    }
  }

  /**
   * Send campaign to leads by priority
   */
  async sendCampaignBatch(options = {}) {
    const { priority = "hot", sequenceNumber = 1, limit = 50 } = options;

    console.log(
      `\n📧 Sending email #${sequenceNumber} to ${priority} leads (limit: ${limit})`,
    );

    // Find leads for this email sequence
    let query = this.db
      .collection("commercial_leads")
      .where("enrichedWithROI", "==", true)
      .where("leadPriority", "==", priority)
      .where("emailSequence", "<", sequenceNumber)
      .limit(limit);

    // For email #2+, only send to leads who received previous email
    if (sequenceNumber > 1) {
      const daysAgo = this.getDelayForSequence(sequenceNumber);
      const cutoffDate = Timestamp.fromDate(
        new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      );

      query = query.where(`email${sequenceNumber - 1}SentAt`, "<=", cutoffDate);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log(`✅ No ${priority} leads ready for email #${sequenceNumber}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`Found ${snapshot.size} leads to email\n`);

    let sent = 0;
    let failed = 0;

    for (const doc of snapshot.docs) {
      const lead = doc.data();

      console.log(`   Processing: ${lead.propertyName} (${lead.contactEmail})`);

      const result = await this.sendCampaignEmail(doc.id, sequenceNumber);

      if (result) {
        sent++;
        console.log(`      ✅ Sent (Message ID: ${result.messageId})`);
      } else {
        failed++;
        console.log(`      ❌ Failed`);
      }

      // Rate limiting (1 email per second to avoid SendGrid throttling)
      await this.delay(1000);
    }

    console.log(`\n✅ Campaign batch complete:`);
    console.log(`   Sent: ${sent}/${snapshot.size}`);
    if (failed > 0) {
      console.log(`   Failed: ${failed}`);
    }

    return { sent, failed };
  }

  /**
   * Get delay in days for each sequence number
   */
  getDelayForSequence(sequenceNumber) {
    const delays = {
      1: 0, // Immediate
      2: 3, // 3 days after email 1
      3: 7, // 7 days after email 2
      4: 14, // 14 days after email 3
      5: 21, // 21 days after email 4
    };

    return delays[sequenceNumber] || 7;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const engine = new EmailEngine({ dryRun });

  (async () => {
    if (args.includes("--preview")) {
      const leadId = args
        .find((a) => a.startsWith("--lead-id="))
        ?.split("=")[1];
      const sequence =
        parseInt(
          args.find((a) => a.startsWith("--sequence="))?.split("=")[1],
        ) || 1;

      if (!leadId) {
        console.error("❌ --lead-id required for preview");
        process.exit(1);
      }

      const leadDoc = await engine.db
        .collection("commercial_leads")
        .doc(leadId)
        .get();
      if (!leadDoc.exists) {
        console.error(`❌ Lead ${leadId} not found`);
        process.exit(1);
      }

      const email = engine.generateEmail(leadDoc.data(), sequence);
      console.log("\n📧 EMAIL PREVIEW");
      console.log("=".repeat(50));
      console.log(`Subject: ${email.subject}\n`);
      console.log(email.body);
      console.log("=".repeat(50));
    } else if (args.includes("--campaign")) {
      const priority =
        args.find((a) => a.startsWith("--priority="))?.split("=")[1] || "hot";
      const sequence =
        parseInt(
          args.find((a) => a.startsWith("--sequence="))?.split("=")[1],
        ) || 1;
      const limit =
        parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1]) ||
        50;

      await engine.sendCampaignBatch({
        priority,
        sequenceNumber: sequence,
        limit,
      });
    } else {
      console.log(`
📧 Email Engine

Usage:
  --preview --lead-id=<ID> --sequence=<1-5>     Preview email for lead
  --campaign --priority=<hot|warm|medium|cold> --sequence=<1-5> [--limit=50] [--dry-run]
                                                 Send campaign batch

Examples:
  node email-engine.js --preview --lead-id=abc123 --sequence=1
  node email-engine.js --campaign --priority=hot --sequence=1 --limit=50 --dry-run
  node email-engine.js --campaign --priority=warm --sequence=2 --limit=100
      `);
    }

    process.exit(0);
  })();
}
