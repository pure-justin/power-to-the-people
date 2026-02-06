/**
 * Commercial Outbound Campaign - Firestore Schema
 *
 * Collections:
 * - commercialLeads: Scraped property data
 * - campaigns: Campaign configurations
 * - outreach: Individual outreach attempts
 * - responses: Lead responses and engagement
 */

export const LEAD_STATUS = {
  NEW: "new",
  ENRICHED: "enriched",
  QUALIFIED: "qualified",
  CONTACTED: "contacted",
  ENGAGED: "engaged",
  QUALIFIED_OPPORTUNITY: "qualified_opportunity",
  DISQUALIFIED: "disqualified",
};

export const OUTREACH_STATUS = {
  SCHEDULED: "scheduled",
  SENT: "sent",
  OPENED: "opened",
  CLICKED: "clicked",
  REPLIED: "replied",
  BOUNCED: "bounced",
  UNSUBSCRIBED: "unsubscribed",
};

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
};

/**
 * Commercial Lead Document
 * Collection: commercialLeads
 */
export const commercialLeadSchema = {
  // Property Information
  propertyName: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    county: String,
  },
  location: {
    lat: Number,
    lng: Number,
  },

  // Building Details
  buildingType: String, // office, retail, warehouse, industrial, multifamily
  squareFootage: Number,
  yearBuilt: Number,
  stories: Number,

  // Solar Potential
  roofArea: Number, // sq ft
  solarCapacity: Number, // kW
  annualProduction: Number, // kWh

  // Financial Data
  estimatedAnnualUsage: Number, // kWh
  utilityProvider: String,
  avgElectricRate: Number, // $/kWh
  estimatedAnnualBill: Number, // $

  // ROI Calculations
  systemCost: Number,
  federalTaxCredit: Number, // ITC
  stateTaxCredit: Number,
  netCost: Number,
  annualSavings: Number,
  simplePayback: Number, // years
  roi25Year: Number, // %
  npv25Year: Number, // $

  // Property Manager/Owner Info
  ownerName: String,
  ownerType: String, // individual, REIT, fund, corporation
  managementCompany: String,
  contactName: String,
  contactTitle: String,
  contactEmail: String,
  contactPhone: String,
  linkedInUrl: String,

  // Lead Source
  source: String, // loopnet, costar, manual
  sourceUrl: String,
  scrapedAt: Date,

  // Lead Qualification
  status: String, // LEAD_STATUS enum
  qualificationScore: Number, // 0-100
  qualificationReasons: [String],
  disqualificationReason: String,

  // Campaign Tracking
  assignedCampaigns: [String], // campaign IDs
  lastContactDate: Date,
  nextFollowUpDate: Date,
  totalTouchpoints: Number,

  // Metadata
  createdAt: Date,
  updatedAt: Date,
  createdBy: String,
  tags: [String],
  notes: String,
};

/**
 * Campaign Document
 * Collection: campaigns
 */
export const campaignSchema = {
  name: String,
  description: String,
  type: String, // email, phone, linkedin, multi-channel
  status: String, // CAMPAIGN_STATUS enum

  // Targeting
  targetStates: [String],
  targetBuildingTypes: [String],
  minSquareFootage: Number,
  maxSquareFootage: Number,
  minSolarCapacity: Number,

  // Goals
  targetLeads: Number,
  targetQualified: Number,
  targetCloseRate: Number,

  // Outreach Configuration
  emailSequence: [
    {
      step: Number,
      delayDays: Number,
      subject: String,
      template: String,
      sendTime: String, // "9:00 AM"
    },
  ],

  // Performance Metrics
  leadsTargeted: Number,
  emailsSent: Number,
  emailsOpened: Number,
  emailsClicked: Number,
  emailsReplied: Number,
  qualifiedLeads: Number,

  // Financial Projections
  projectedRevenue: Number,
  costPerLead: Number,
  budgetSpent: Number,

  // Dates
  startDate: Date,
  endDate: Date,
  createdAt: Date,
  updatedAt: Date,
  createdBy: String,
};

/**
 * Outreach Document
 * Collection: outreach
 */
export const outreachSchema = {
  campaignId: String,
  leadId: String,

  // Outreach Details
  type: String, // email, phone, linkedin
  step: Number, // sequence position

  // Email Details
  subject: String,
  body: String,
  fromEmail: String,
  toEmail: String,

  // Personalization
  personalizedRoi: {
    annualSavings: Number,
    simplePayback: Number,
    roi25Year: Number,
    netCost: Number,
  },

  // Status
  status: String, // OUTREACH_STATUS enum
  scheduledFor: Date,
  sentAt: Date,
  openedAt: Date,
  clickedAt: Date,
  repliedAt: Date,

  // Tracking
  emailId: String, // from email service
  trackingPixelUrl: String,
  trackingLinks: [String],

  // Response
  responseText: String,
  sentiment: String, // positive, neutral, negative

  // Metadata
  createdAt: Date,
  updatedAt: Date,
};

/**
 * Response Document
 * Collection: responses
 */
export const responseSchema = {
  leadId: String,
  campaignId: String,
  outreachId: String,

  // Response Details
  type: String, // email, phone, form
  text: String,
  sentiment: String, // positive, neutral, negative, interested, not_interested

  // Qualification
  isQualified: Boolean,
  qualificationNotes: String,
  nextSteps: String,

  // Follow-up
  followUpRequired: Boolean,
  followUpDate: Date,
  assignedTo: String,

  // Metadata
  receivedAt: Date,
  createdAt: Date,
  updatedAt: Date,
};
