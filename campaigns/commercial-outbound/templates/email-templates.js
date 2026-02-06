/**
 * Email Templates for Commercial Solar Outreach
 * Personalized based on property data and ROI calculations
 */

export const emailTemplates = {
  /**
   * Initial Contact Email
   */
  initial: {
    subject: (lead) =>
      `${lead.propertyName || lead.address.street} - $${Math.round(lead.annualSavings).toLocaleString()}/year solar savings opportunity`,

    body: (lead) =>
      `
Hi ${lead.contactName || "Property Manager"},

I'm reaching out regarding ${lead.propertyName || `your ${lead.buildingType} property at ${lead.address.street}`}.

Based on your building's ${lead.squareFootage?.toLocaleString()} sq ft footprint and ${lead.utilityProvider} electric rates of $${lead.avgElectricRate}/kWh, **you're currently spending approximately $${Math.round(lead.estimatedAnnualUsage * lead.avgElectricRate).toLocaleString()}/year on electricity**.

I've prepared a solar analysis specifically for your property:

**Solar Potential:**
• ${lead.systemSize?.toFixed(0)} kW commercial solar system
• ${lead.annualProduction?.toLocaleString()} kWh annual production
• ${lead.offsetPercentage?.toFixed(0)}% of your electricity needs

**Financial Returns:**
• **$${Math.round(lead.annualSavings).toLocaleString()}/year in energy savings**
• ${lead.simplePayback?.toFixed(1)}-year payback period
• ${lead.roi25Year?.toFixed(0)}% ROI over 25 years
• $${(lead.totalSavings25Year / 1000).toFixed(0)}K total savings

**After federal tax credits & MACRS depreciation:**
• System cost: $${(lead.systemCost / 1000).toFixed(0)}K
• Net cost: $${(lead.netCost / 1000).toFixed(0)}K (after $${((lead.systemCost - lead.netCost) / 1000).toFixed(0)}K in incentives)

${lead.location?.state === "CA" ? "⚡ California properties also qualify for additional state incentives and accelerated permitting." : ""}
${lead.location?.state === "TX" ? "⚡ Texas has no state income tax, making the federal benefits even more valuable." : ""}
${lead.avgElectricRate > 0.15 ? "⚡ Your high electric rates make solar particularly attractive." : ""}

Would you be interested in a 15-minute call to discuss how we can help you **eliminate your electric bills** while increasing your property value?

I can show you:
• Custom roof layout with panel placement
• Detailed 25-year cash flow projections
• Financing options ($0 down available)
• Installation timeline (typically 60-90 days)

Best times for you this week?

Best regards,
[Your Name]
Power to the People Solar
[Phone] | [Email]

P.S. Act by [Date] to lock in current incentive rates before they step down.
`.trim(),

    plainText: true,
  },

  /**
   * Follow-up #1 (3 days later)
   */
  followUp1: {
    subject: (lead) =>
      `Quick follow-up: ${lead.propertyName || lead.address.city} solar analysis`,

    body: (lead) =>
      `
${lead.contactName || "Hi"},

Following up on the solar analysis I sent for ${lead.propertyName || lead.address.street}.

I know your time is valuable, so here's the **bottom line**:

✅ $${Math.round(lead.annualSavings).toLocaleString()}/year savings
✅ ${lead.simplePayback?.toFixed(1)} years to break even
✅ $${((lead.systemCost - lead.netCost) / 1000).toFixed(0)}K in federal incentives
✅ Hedges against future rate increases (${lead.utilityProvider} has raised rates ${(0.03 * 100).toFixed(0)}% annually)

**No-obligation next step:** 15-minute call to review your custom analysis and answer questions.

[Schedule a Call] - Link

If timing isn't right, that's okay - just let me know when might be better.

Best,
[Your Name]
`.trim(),
  },

  /**
   * Follow-up #2 (7 days later)
   */
  followUp2: {
    subject: (lead) =>
      `Case study: Similar ${lead.buildingType} saved $${Math.round(lead.annualSavings * 1.2).toLocaleString()}/year`,

    body: (lead) =>
      `
${lead.contactName || "Hi"},

I wanted to share a recent success story that might resonate:

We recently completed a ${lead.systemSize?.toFixed(0)} kW system for a ${lead.buildingType} property in ${lead.location?.city || lead.address.city} (similar to yours).

**Their results after 12 months:**
• Annual savings: $${Math.round(lead.annualSavings * 1.2).toLocaleString()}
• Payback: ${(lead.simplePayback - 0.5)?.toFixed(1)} years (better than projected)
• Property value increase: $${((lead.systemCost / 1000) * 1.3).toFixed(0)}K
• Zero maintenance issues

**What made them decide to move forward:**
1. Rising electricity costs in ${lead.location?.state}
2. Federal tax credit covering 30% of costs
3. MACRS depreciation benefits
4. Positive cash flow from year 1

Your property has similar potential. Want to see how the numbers compare?

[View Full Case Study]

Happy to answer any questions.

[Your Name]
`.trim(),
  },

  /**
   * Follow-up #3 (14 days later) - Last touch
   */
  followUp3: {
    subject: (lead) =>
      `Last call: Solar opportunity for ${lead.propertyName || lead.address.city}`,

    body: (lead) =>
      `
${lead.contactName || "Hi"},

I'll keep this brief since I know you're busy.

This is my last follow-up regarding the solar opportunity for ${lead.propertyName || lead.address.street}.

**Quick summary:**
• $${Math.round(lead.annualSavings).toLocaleString()}/year you're leaving on the table
• $${((lead.systemCost - lead.netCost) / 1000).toFixed(0)}K in federal incentives available now
• ${lead.roi25Year?.toFixed(0)}% ROI over 25 years

If you'd like to explore this further, I'm here to help. If not, I completely understand and won't reach out again.

Just reply "INTERESTED" or "NOT NOW" so I know where things stand.

Thanks for your time,
[Your Name]

P.S. If there's someone else at ${lead.managementCompany || "your organization"} who handles energy decisions, I'd appreciate an introduction.
`.trim(),
  },

  /**
   * Custom proposal email (after initial contact)
   */
  proposal: {
    subject: (lead) =>
      `Solar proposal for ${lead.propertyName || lead.address.street}`,

    body: (lead) =>
      `
${lead.contactName || "Hi"},

Thanks for your interest in solar for ${lead.propertyName || lead.address.street}!

I've prepared a comprehensive proposal tailored to your property:

**📊 System Overview:**
• Size: ${lead.systemSize?.toFixed(1)} kW DC
• Production: ${lead.annualProduction?.toLocaleString()} kWh/year
• Panels: ${Math.round(lead.systemSize / 0.4)} × 400W high-efficiency modules
• Offset: ${lead.offsetPercentage?.toFixed(0)}% of current usage

**💰 Financial Summary:**
• Total Investment: $${(lead.systemCost / 1000).toFixed(0)}K
• Federal Tax Credit (30%): -$${(lead.federalTaxCredit / 1000).toFixed(0)}K
• MACRS Depreciation: -$${(lead.acceleratedDepreciation / 1000).toFixed(0)}K
• **Net Cost: $${(lead.netCost / 1000).toFixed(0)}K**

**📈 25-Year Returns:**
• Year 1 Savings: $${Math.round(lead.annualSavings).toLocaleString()}
• Total Savings: $${(lead.totalSavings25Year / 1000).toFixed(0)}K
• Net Profit: $${((lead.totalSavings25Year - lead.netCost) / 1000).toFixed(0)}K
• IRR: ${(lead.roi25Year / 25 + 5).toFixed(1)}%

**📄 What's Included:**
• Engineering & design
• All permits & inspections
• Equipment & installation
• Utility interconnection
• 25-year performance warranty
• Monitoring & maintenance

**Next Steps:**
1. Site survey (30 mins)
2. Finalize design & pricing
3. Execute agreement
4. Installation (60-90 days)
5. Start saving!

[Review Full Proposal] - PDF attached

Questions? Let's schedule a call to walk through everything.

Best,
[Your Name]
[Phone] | [Email]
`.trim(),
  },

  /**
   * Objection handler - Price concerns
   */
  objectionPrice: {
    subject: (lead) => `Addressing your question about solar costs`,

    body: (lead) =>
      `
${lead.contactName || "Hi"},

Thanks for your candid feedback about the investment.

I understand $${(lead.netCost / 1000).toFixed(0)}K is significant. Let me address that:

**Financing Options:**

1. **$0 Down Lease**
   • Immediate savings: $${Math.round(lead.annualSavings * 0.8).toLocaleString()}/year
   • No upfront cost
   • Maintenance included

2. **Power Purchase Agreement (PPA)**
   • Pay only for power produced
   • Rate: $${(lead.avgElectricRate * 0.85).toFixed(3)}/kWh (15% below current)
   • Locked for 25 years

3. **Commercial Loan**
   • Terms: 7-15 years
   • Rate: ~5% APR
   • Positive cash flow from day 1

**Cost Perspective:**
• You're spending $${Math.round(lead.estimatedAnnualUsage * lead.avgElectricRate).toLocaleString()}/year on electricity now
• That's $${Math.round((lead.estimatedAnnualUsage * lead.avgElectricRate * 25) / 1000).toFixed(0)}K over 25 years
• Solar costs $${(lead.netCost / 1000).toFixed(0)}K and **saves you $${((lead.totalSavings25Year - lead.netCost) / 1000).toFixed(0)}K**

Solar isn't an expense - it's replacing one you already have with a better alternative.

Want to discuss which financing structure makes most sense for you?

[Your Name]
`.trim(),
  },
};

/**
 * Generate personalized email
 */
export function generateEmail(template, lead, customVars = {}) {
  const emailTemplate = emailTemplates[template];

  if (!emailTemplate) {
    throw new Error(`Template "${template}" not found`);
  }

  return {
    subject: emailTemplate.subject(lead, customVars),
    body: emailTemplate.body(lead, customVars),
    plainText: emailTemplate.plainText || false,
  };
}

/**
 * Get email sequence for a campaign
 */
export function getEmailSequence(sequenceType = "standard") {
  const sequences = {
    standard: [
      { template: "initial", delayDays: 0 },
      { template: "followUp1", delayDays: 3 },
      { template: "followUp2", delayDays: 7 },
      { template: "followUp3", delayDays: 14 },
    ],

    aggressive: [
      { template: "initial", delayDays: 0 },
      { template: "followUp1", delayDays: 2 },
      { template: "followUp2", delayDays: 5 },
      { template: "followUp3", delayDays: 10 },
    ],

    gentle: [
      { template: "initial", delayDays: 0 },
      { template: "followUp1", delayDays: 5 },
      { template: "followUp2", delayDays: 14 },
      { template: "followUp3", delayDays: 30 },
    ],
  };

  return sequences[sequenceType] || sequences.standard;
}

/**
 * Validate that lead has required fields for personalization
 */
export function validateLeadForEmail(lead) {
  const required = [
    "address",
    "annualSavings",
    "systemSize",
    "roi25Year",
    "simplePayback",
  ];

  const missing = required.filter((field) => !lead[field]);

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
    };
  }

  return { valid: true };
}
