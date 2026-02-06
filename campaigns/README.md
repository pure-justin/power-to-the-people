# Commercial Cold Outbound Campaign System

## Overview
Automated cold outbound campaign targeting 500 commercial property managers in sun-belt states with personalized solar ROI calculations.

## Architecture

```
Data Sources → Scraper → Enrichment → ROI Engine → Personalization → Outreach → CRM
    ↓            ↓           ↓            ↓              ↓             ↓        ↓
LoopNet      Puppeteer   Utility    Solar Calc    Email Gen     SendGrid  Firebase
CoStar       MCP         Rates API   Building     Templates     Twilio    Firestore
```

## Campaign Workflow

1. **Data Collection** (Week 1)
   - Scrape 500+ commercial properties from LoopNet/CoStar
   - Target: Office buildings, retail centers, warehouses 50k+ sqft
   - Sun-belt states: TX, AZ, CA, FL, NV, NM, GA, NC, SC

2. **Enrichment** (Week 1-2)
   - Fetch local utility rates by zip code
   - Calculate building-specific solar ROI
   - Score leads based on potential value
   - Find contact information for property managers

3. **Outreach** (Week 2-3)
   - Personalized email sequences (5 touchpoints)
   - Follow-up calls for engaged leads
   - LinkedIn connection requests

4. **Qualification** (Week 3-4)
   - Track engagement (opens, clicks, replies)
   - Schedule discovery calls
   - Move qualified leads to CRM
   - Goal: 50 qualified leads in 30 days (10% conversion)

## Tech Stack

- **Scraping**: Puppeteer MCP server
- **Backend**: Node.js + Firebase Functions
- **Database**: Firestore
- **Email**: SendGrid API
- **SMS**: Twilio API
- **ROI Calc**: Google Solar API + utility rate APIs
- **Dashboard**: React + Firebase Hosting

## Directory Structure

```
campaigns/
├── scrapers/
│   ├── loopnet-scraper.js      # LoopNet property scraper
│   ├── costar-scraper.js       # CoStar scraper
│   └── contact-finder.js       # Find property manager contacts
├── enrichment/
│   ├── utility-rates.js        # Fetch utility rates by location
│   ├── roi-calculator.js       # Calculate solar ROI
│   └── lead-scorer.js          # Score and prioritize leads
├── outreach/
│   ├── email-engine.js         # Personalized email generation
│   ├── sendgrid-client.js      # Email delivery
│   ├── twilio-client.js        # SMS follow-ups
│   └── templates/              # Email templates
├── dashboard/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LeadList.jsx
│   │   │   ├── CampaignStats.jsx
│   │   │   └── OutreachSequence.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       └── LeadDetail.jsx
│   └── package.json
└── functions/
    ├── index.js                # Firebase Functions
    └── package.json
```

## Data Models

### Lead Document
```javascript
{
  id: "lead_xxx",
  propertyName: "Sunset Plaza",
  address: "123 Main St, Phoenix, AZ 85001",
  squareFootage: 125000,
  propertyType: "office",
  annualElectricBill: 150000,
  utilityRate: 0.12,
  estimatedSolarCost: 450000,
  estimatedAnnualSavings: 105000,
  roi: 4.3,
  paybackPeriod: 4.3,
  incentives: ["ITC", "IRA"],
  score: 92,
  status: "new",
  propertyManager: {
    name: "John Smith",
    email: "john@property.com",
    phone: "+1234567890",
    linkedin: "linkedin.com/in/johnsmith"
  },
  engagement: {
    emailsSent: 1,
    emailsOpened: 1,
    linksClicked: 0,
    lastContact: "2026-02-06T10:00:00Z"
  },
  createdAt: "2026-02-06T09:00:00Z",
  updatedAt: "2026-02-06T10:00:00Z"
}
```

### Campaign Document
```javascript
{
  id: "campaign_xxx",
  name: "Commercial Sun-Belt Q1 2026",
  target: 500,
  reached: 245,
  qualified: 32,
  startDate: "2026-02-06",
  endDate: "2026-03-06",
  status: "active",
  metrics: {
    emailsSent: 245,
    emailOpenRate: 0.32,
    clickRate: 0.18,
    responseRate: 0.09,
    qualifiedRate: 0.13
  }
}
```

## API Keys Required

Add to Firebase config:
- `SENDGRID_API_KEY` - Email delivery
- `TWILIO_ACCOUNT_SID` - SMS
- `TWILIO_AUTH_TOKEN` - SMS
- `GOOGLE_MAPS_API_KEY` - Geocoding
- `GOOGLE_SOLAR_API_KEY` - Solar calculations
- `OPENAI_API_KEY` - Email personalization

## Usage

### 1. Scrape Properties
```bash
node campaigns/scrapers/loopnet-scraper.js --state TX --min-sqft 50000 --limit 100
```

### 2. Enrich Leads
```bash
node campaigns/enrichment/roi-calculator.js --batch-size 50
```

### 3. Launch Campaign
```bash
node campaigns/outreach/email-engine.js --campaign-id campaign_xxx --dry-run false
```

### 4. Monitor Dashboard
```bash
cd campaigns/dashboard
npm run dev
```

## Success Metrics

- **Target**: 500 properties scraped
- **Enrichment**: 100% with ROI calculations
- **Outreach**: 80%+ email delivery rate
- **Engagement**: 25%+ open rate, 15%+ click rate
- **Qualified**: 50+ leads (10% conversion)
- **Timeline**: 30 days

## Compliance

- CAN-SPAM compliant (unsubscribe link)
- GDPR ready (data deletion on request)
- Opt-out honoring within 24 hours
- B2B outreach (commercial properties only)
