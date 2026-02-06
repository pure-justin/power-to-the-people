/**
 * Email Personalization Engine
 * Generates highly personalized outreach emails with ROI data
 */

const { getFirestore } = require("firebase-admin/firestore");
const sgMail = require("@sendgrid/mail");

class EmailEngine {
  constructor(sendgridApiKey) {
    this.db = getFirestore();
    if (sendgridApiKey) {
      sgMail.setApiKey(sendgridApiKey);
    }
    this.fromEmail = "solar@powertothepeopleenergy.com";
    this.fromName = "Power to the People Energy";
  }

  /**
   * Generate personalized email for a lead
   * @param {Object} lead - Lead data
   * @param {number} sequence - Email sequence number (1-5)
   */
  generateEmail(lead, sequence = 1) {
    const templates = {
      1: this.email1_Introduction,
      2: this.email2_ValueProposition,
      3: this.email3_CaseStudy,
      4: this.email4_Urgency,
      5: this.email5_Final,
    };

    const template = templates[sequence];
    if (!template) {
      throw new Error(`Invalid email sequence: ${sequence}`);
    }

    return template.call(this, lead);
  }

  /**
   * Email 1: Introduction with personalized ROI
   */
  email1_Introduction(lead) {
    const {
      propertyName,
      city,
      state,
      squareFootage,
      solarROI,
      estimatedAnnualSavings,
      systemSize,
    } = lead;

    const subject = `${propertyName}: Save $${Math.round(estimatedAnnualSavings / 1000)}k/year with solar`;

    const body = `Hi there,

I noticed ${propertyName} in ${city}, ${state} - a ${Math.round(squareFootage / 1000)}k sq ft ${lead.propertyType} building. Based on your location and building profile, I ran some numbers:

📊 Your Solar Opportunity:
• System Size: ${systemSize} kW commercial solar
• Annual Savings: $${estimatedAnnualSavings.toLocaleString()}
• ROI: ${solarROI.roi}% annually
• Payback Period: ${solarROI.paybackYears} years
• 25-Year Value: $${Math.round(solarROI.lifetimeValue / 1000)}k+

💰 After Federal ITC (30%) + MACRS depreciation, your net cost is just $${Math.round(solarROI.netCost / 1000)}k for a system that generates $${Math.round(estimatedAnnualSavings / 1000)}k in savings every year.

In ${state}, commercial properties like yours are perfect for solar:
• ${this.getStateIncentive(state)}
• Peak sun hours: ${this.getSunHours(state)}/day
• Utility rates trending up 3% annually

Would you be open to a 15-minute call this week to explore this further? I can show you:
• Detailed 25-year financial projections
• 3D roof visualization with panel layout
• Financing options (including $0 down)

Best time for a quick call?

Best regards,
${this.fromName}
${this.fromEmail}

P.S. I've reserved a preliminary analysis for ${propertyName}. Click here to view: [LINK]`;

    return {
      subject,
      body,
      tracking: {
        campaign: "commercial-q1-2026",
        sequence: 1,
        leadId: lead.id,
      },
    };
  }

  /**
   * Email 2: Value proposition with environmental impact
   */
  email2_ValueProposition(lead) {
    const { propertyName, solarROI, estimatedAnnualSavings } = lead;

    const subject = `${propertyName}: Beyond savings - hedging against energy costs`;

    const body = `Hi again,

Following up on my previous email about ${propertyName}'s solar potential.

Beyond the $${Math.round(estimatedAnnualSavings / 1000)}k in annual savings, here's what really matters:

🛡️ **Price Protection**
Utility rates in your area have increased ${this.getUtilityEscalation(lead.state)}% annually over the past 5 years. With solar, you lock in your energy costs for 25+ years.

Your projected savings with 3% annual utility rate increases:
• Years 1-5: $${Math.round((estimatedAnnualSavings * 5) / 1000)}k
• Years 6-10: $${Math.round((estimatedAnnualSavings * 5 * 1.15) / 1000)}k
• Years 11-15: $${Math.round((estimatedAnnualSavings * 5 * 1.32) / 1000)}k
• Total 25 years: $${Math.round(solarROI.lifetimeValue / 1000)}k+

🌍 **Environmental Leadership**
• ${Math.round(solarROI.co2Offset)} tons of CO2 offset over 25 years
• Equivalent to planting ${Math.round(solarROI.co2Offset * 40)} trees
• Builds brand value with sustainability-conscious tenants

📈 **Property Value Increase**
Commercial solar installations increase property values by 3-5% on average. For ${propertyName}, that's potential appreciation of $${Math.round((lead.squareFootage * 150 * 0.04) / 1000)}k+.

Interested in seeing the detailed analysis? I can send over:
1. Full financial model (25-year projections)
2. 3D visualization of your roof
3. Financing comparison (cash, loan, PPA, lease)

Reply with your preferred time for a brief call.

Best,
${this.fromName}`;

    return {
      subject,
      body,
      tracking: {
        campaign: "commercial-q1-2026",
        sequence: 2,
        leadId: lead.id,
      },
    };
  }

  /**
   * Email 3: Case study from similar property
   */
  email3_CaseStudy(lead) {
    const subject = `Case study: How a ${lead.propertyType} in ${lead.state} cut energy costs 85%`;

    const body = `Quick case study for you:

**${this.getCaseStudyName(lead.propertyType, lead.state)}**
• Type: ${lead.propertyType} (similar to ${lead.propertyName})
• Size: ${this.getSimilarSize(lead.squareFootage)} sq ft
• Location: ${lead.state}

Results after 12 months:
✅ 85% reduction in utility bills
✅ $${Math.round((lead.estimatedAnnualSavings * 0.85) / 1000)}k annual savings (exceeded projections)
✅ Positive PR coverage
✅ Tenant satisfaction up 15%

Their property manager told us: "The solar installation paid for itself in ${Math.max(3, Math.floor(lead.paybackYears - 0.5))} years. Best decision we made."

Your property has similar (or better) solar potential:
• Higher sun exposure: ${this.getSunHours(lead.state)} hours/day
• Better incentives: 30% Federal ITC + state credits
• Faster payback: ${lead.paybackYears} years

Want to discuss how we can replicate these results at ${lead.propertyName}?

Calendar link: [BOOK 15-MIN CALL]

Best,
${this.fromName}`;

    return {
      subject,
      body,
      tracking: {
        campaign: "commercial-q1-2026",
        sequence: 3,
        leadId: lead.id,
      },
    };
  }

  /**
   * Email 4: Urgency - ITC + depreciation deadline
   */
  email4_Urgency(lead) {
    const subject = `${lead.propertyName}: 30% ITC + accelerated depreciation won't last`;

    const body = `Important update on ${lead.propertyName}:

The current 30% Federal Investment Tax Credit (ITC) is scheduled to step down:
• 2026: 30% ✅ (current - act now!)
• 2027-2032: 26%
• 2033+: 22%

For your ${lead.systemSize} kW system, that's a difference of:
• 30% ITC: $${Math.round(lead.solarROI.incentives.federal / 1000)}k in credits
• 26% ITC: $${Math.round((lead.solarROI.installationCost * 0.26) / 1000)}k
• **You lose $${Math.round((lead.solarROI.incentives.federal - lead.solarROI.installationCost * 0.26) / 1000)}k by waiting**

Plus, MACRS 5-year accelerated depreciation ($${Math.round(lead.solarROI.incentives.depreciation / 1000)}k value) could also change with new tax legislation.

⏰ **Timeline to lock in 30% ITC:**
• Design & permitting: 4-6 weeks
• Installation: 6-8 weeks
• **Start by March 2026 to ensure completion in 2026 tax year**

We have installation capacity available for Q1/Q2 2026. After that, we're booking into Q4.

Can we schedule a call this week to discuss timeline? I can have your proposal ready in 48 hours.

Reply with your availability.

Best,
${this.fromName}
P.S. I've already done 80% of the work - your preliminary design is ready to review.`;

    return {
      subject,
      body,
      tracking: {
        campaign: "commercial-q1-2026",
        sequence: 4,
        leadId: lead.id,
      },
    };
  }

  /**
   * Email 5: Final attempt - breakup email
   */
  email5_Final(lead) {
    const subject = `Last email about ${lead.propertyName}'s solar opportunity`;

    const body = `Hi,

I've reached out a few times about the solar opportunity at ${lead.propertyName}. I don't want to be a pest, so this will be my last email.

Here's what's on the table:
• $${Math.round(lead.estimatedAnnualSavings / 1000)}k annual savings
• ${lead.solarROI.roi}% ROI
• $${Math.round(lead.solarROI.lifetimeValue / 1000)}k+ over 25 years

If now isn't the right time, I completely understand. A few common reasons I hear:

❓ "We're not sure about the investment"
   → We offer $0 down financing + PPAs (no upfront cost)

❓ "We need board approval"
   → I can provide a complete board presentation package

❓ "Our roof needs work first"
   → We partner with roofing contractors (often bundle the work)

❓ "Just not a priority right now"
   → Fair enough! I'll check back in 6 months

Would any of these apply to ${lead.propertyName}? Reply and let me know how I can help, or if you'd prefer I follow up in Q3 2026 instead.

Either way, thanks for your time.

Best regards,
${this.fromName}
${this.fromEmail}

P.S. If you know another property manager who might benefit, I'd appreciate an intro. Happy to share the referral savings.`;

    return {
      subject,
      body,
      tracking: {
        campaign: "commercial-q1-2026",
        sequence: 5,
        leadId: lead.id,
      },
    };
  }

  /**
   * Send email via SendGrid
   */
  async sendEmail(lead, sequence, dryRun = false) {
    const email = this.generateEmail(lead, sequence);

    // Placeholder for property manager email
    // In production, would have scraped/found their email
    const toEmail = lead.propertyManager?.email || `pm-${lead.id}@example.com`;

    const msg = {
      to: toEmail,
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject: email.subject,
      text: email.body,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
      customArgs: email.tracking,
    };

    if (dryRun) {
      console.log(`\n📧 [DRY RUN] Email ${sequence} for ${lead.propertyName}:`);
      console.log(`To: ${toEmail}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`\n${email.body}`);
      return { dryRun: true, email: msg };
    }

    try {
      await sgMail.send(msg);

      // Update lead engagement
      await this.db
        .collection("commercial_leads")
        .doc(lead.id)
        .update({
          "engagement.emailsSent": (lead.engagement?.emailsSent || 0) + 1,
          "engagement.lastContact": new Date().toISOString(),
          "engagement.lastEmail": sequence,
          updatedAt: new Date().toISOString(),
        });

      console.log(`✅ Sent email ${sequence} to ${toEmail}`);
      return { sent: true, email: msg };
    } catch (error) {
      console.error(`❌ Failed to send email to ${toEmail}:`, error.message);
      throw error;
    }
  }

  /**
   * Helper: Get state-specific incentive
   */
  getStateIncentive(state) {
    const incentives = {
      CA: "SGIP battery rebates + local incentives",
      AZ: "Equipment tax exemption",
      TX: "Property tax exemption for solar",
      FL: "Sales tax exemption",
      NV: "Solar incentive programs",
      NM: "Sustainable Building Tax Credit",
      GA: "Property tax exemption",
      NC: "State tax credits available",
      SC: "Various state incentives",
    };
    return incentives[state] || "State solar incentives available";
  }

  /**
   * Helper: Get sun hours by state
   */
  getSunHours(state) {
    const sunHours = {
      TX: 5.3,
      AZ: 6.5,
      CA: 5.8,
      FL: 5.2,
      NV: 6.2,
      NM: 6.4,
      GA: 5.0,
      NC: 4.9,
      SC: 5.1,
    };
    return sunHours[state] || 5.0;
  }

  /**
   * Helper: Get utility rate escalation
   */
  getUtilityEscalation(state) {
    return state === "CA" ? 4.5 : 3.2;
  }

  /**
   * Helper: Get case study name
   */
  getCaseStudyName(propertyType, state) {
    const names = {
      office: "Tech Office Plaza",
      retail: "Retail Shopping Center",
      industrial: "Industrial Distribution Center",
      warehouse: "Logistics Warehouse Facility",
      flex: "Flex Office Park",
      medical: "Medical Office Building",
    };
    return `${names[propertyType] || "Commercial Property"} - ${state}`;
  }

  /**
   * Helper: Get similar building size
   */
  getSimilarSize(sqft) {
    return Math.round(sqft / 10000) * 10000;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log("Usage:");
    console.log(
      "  node email-engine.js --preview --lead-id LEAD_ID --sequence 1",
    );
    console.log(
      "  node email-engine.js --send --lead-id LEAD_ID --sequence 1 [--dry-run]",
    );
    console.log(
      "  node email-engine.js --campaign --priority hot --sequence 1 [--dry-run]",
    );
    process.exit(0);
  }

  const engine = new EmailEngine(process.env.SENDGRID_API_KEY);

  if (args.includes("--preview")) {
    const leadId = args[args.indexOf("--lead-id") + 1];
    const sequence = parseInt(args[args.indexOf("--sequence") + 1]) || 1;

    const doc = await engine.db
      .collection("commercial_leads")
      .doc(leadId)
      .get();
    if (!doc.exists) {
      console.error("Lead not found");
      process.exit(1);
    }

    const email = engine.generateEmail(doc.data(), sequence);
    console.log("\n📧 Email Preview:");
    console.log(`Subject: ${email.subject}`);
    console.log(`\n${email.body}`);
  } else if (args.includes("--campaign")) {
    const priority = args[args.indexOf("--priority") + 1] || "hot";
    const sequence = parseInt(args[args.indexOf("--sequence") + 1]) || 1;
    const dryRun = args.includes("--dry-run");
    const limit = parseInt(args[args.indexOf("--limit") + 1]) || 50;

    console.log(`\n📧 Sending campaign emails:`);
    console.log(`   Priority: ${priority}`);
    console.log(`   Sequence: ${sequence}`);
    console.log(`   Dry run: ${dryRun}`);

    const snapshot = await engine.db
      .collection("commercial_leads")
      .where("priority", "==", priority)
      .where("engagement.lastEmail", "<", sequence)
      .limit(limit)
      .get();

    let sent = 0;
    for (const doc of snapshot.docs) {
      try {
        await engine.sendEmail(doc.data(), sequence, dryRun);
        sent++;
      } catch (error) {
        // Continue with next lead
      }
    }

    console.log(`\n✅ Campaign complete: ${sent}/${snapshot.size} emails sent`);
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EmailEngine;
