# Commercial Solar Outbound Campaign System

Complete automated cold outreach system for targeting 500+ commercial properties with personalized solar ROI calculations.

## 🎯 Goal

**Populate database with 50 qualified commercial solar leads in 30 days** through automated scraping, enrichment, and personalized outreach.

## 📊 System Overview

```
LoopNet/CoStar → Scraper → Enrichment → ROI Calculator → Email Sequences → Qualified Leads
   (500 leads)              (Solar data)   (Personalized)    (Automated)      (50 leads)
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd campaigns/commercial-outbound
npm install puppeteer axios nodemailer firebase-admin commander
```

### 2. Set Environment Variables

Create `.env`:

```bash
# Google APIs
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Email APIs
APOLLO_API_KEY=your_apollo_key         # For contact enrichment
HUNTER_API_KEY=your_hunter_key         # Backup contact enrichment
OPENEI_API_KEY=your_openei_key         # Utility rate data

# Email Provider
OUTREACH_FROM_EMAIL=solar@yourdomain.com
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password
```

### 3. Run Campaign

```bash
# Dry run (no emails sent)
node run-campaign.js --dry-run

# Full campaign
node run-campaign.js --target 500 --qualified 50 --states TX,FL,AZ,CA
```

## 📁 Project Structure

```
campaigns/commercial-outbound/
├── schema.js                    # Firestore data schemas
├── scrapers/
│   └── loopnet-scraper.js      # LoopNet property scraper
├── enrichment/
│   └── lead-enricher.js        # Lead enrichment service
├── roi-calculator.js            # Commercial solar ROI engine
├── templates/
│   └── email-templates.js      # Personalized email templates
├── outreach-scheduler.js        # Automated outreach system
├── run-campaign.js             # Master orchestration script
└── README.md
```

## 🔧 Components

### 1. Property Scraper

Scrapes commercial properties from LoopNet/CoStar:

```javascript
import { LoopNetScraper } from './scrapers/loopnet-scraper.js';

const scraper = new LoopNetScraper({ headless: true });
const leads = await scraper.scrapeSunBeltStates(500);

// Output: propertyName, address, squareFootage, buildingType, etc.
```

**Target Markets:**
- Texas (Austin, Dallas, Houston, San Antonio)
- Florida (Miami, Tampa, Orlando, Jacksonville)
- Arizona (Phoenix, Tucson)
- California (Los Angeles, San Diego, San Francisco)
- Nevada, Georgia, North Carolina, South Carolina

### 2. Lead Enrichment

Enriches scraped data with:
- Geocoding (Google Maps API)
- Solar potential (Google Solar API)
- Utility provider & rates (OpenEI API)
- Contact information (Apollo.io / Hunter.io)
- Company details

```javascript
import { LeadEnricher } from './enrichment/lead-enricher.js';

const enricher = new LeadEnricher();
const enriched = await enricher.enrichLeads(leads, {
  concurrency: 5,
  saveToFirestore: true
});
```

### 3. ROI Calculator

Calculates personalized financial projections:

```javascript
import { CommercialSolarROI } from './roi-calculator.js';

const calculator = new CommercialSolarROI();
const roi = calculator.calculateROI(property);

// Returns:
// - systemSize, annualProduction, annualSavings
// - simplePayback, roi25Year, npv25Year
// - systemCost, netCost (after incentives)
// - qualificationScore (0-100)
```

**Incentives Included:**
- 30% Federal ITC (Investment Tax Credit)
- State tax credits (NY, MA, NJ, CA, MD)
- MACRS 5-year depreciation (21% corporate tax rate)
- Local utility rebates

### 4. Email Personalization

5 email templates with dynamic personalization:

1. **Initial Contact** - Personalized ROI analysis
2. **Follow-up #1** (Day 3) - Bottom-line savings
3. **Follow-up #2** (Day 7) - Case study
4. **Follow-up #3** (Day 14) - Last call
5. **Proposal** - Detailed system proposal

```javascript
import { generateEmail } from './templates/email-templates.js';

const email = generateEmail('initial', lead);

// Subject: "123 Main St - $45,000/year solar savings opportunity"
// Body: Personalized with property-specific ROI data
```

### 5. Outreach Scheduler

Automated email sequences with tracking:

```javascript
import OutreachScheduler from './outreach-scheduler.js';

const scheduler = new OutreachScheduler({
  emailProvider: 'gmail',
  fromEmail: 'solar@yourdomain.com'
});

// Create campaign
const campaign = await scheduler.createCampaign({
  name: 'Sun Belt Commercial Q1 2026',
  sequenceType: 'standard'
});

// Add leads and schedule emails
await scheduler.addLeadsToCampaign(campaign.id, leadIds);
```

**Features:**
- Automated scheduling (9 AM local time)
- Open/click tracking
- Reply detection & sentiment analysis
- Unsubscribe handling
- Campaign analytics

## 📊 Firestore Schema

### Collections

**commercialLeads**
```javascript
{
  propertyName: string,
  address: { street, city, state, zip },
  location: { lat, lng },
  buildingType: string,
  squareFootage: number,
  solarCapacity: number,
  annualProduction: number,
  utilityProvider: string,
  avgElectricRate: number,
  systemCost: number,
  netCost: number,
  annualSavings: number,
  roi25Year: number,
  simplePayback: number,
  qualificationScore: number,
  contactName: string,
  contactEmail: string,
  status: 'new' | 'enriched' | 'qualified' | 'contacted' | 'engaged'
}
```

**campaigns**
```javascript
{
  name: string,
  status: 'draft' | 'active' | 'paused' | 'completed',
  targetStates: string[],
  emailsSent: number,
  emailsOpened: number,
  emailsReplied: number,
  qualifiedLeads: number
}
```

**outreach**
```javascript
{
  campaignId: string,
  leadId: string,
  type: 'email',
  step: number,
  template: string,
  status: 'scheduled' | 'sent' | 'opened' | 'replied',
  scheduledFor: timestamp,
  sentAt: timestamp,
  personalizedRoi: { annualSavings, payback, roi }
}
```

## 🔥 Firebase Cloud Functions

Deploy automated processing:

```bash
cd functions
npm install

# Deploy
firebase deploy --only functions:processOutreach
firebase deploy --only functions:trackOpen
firebase deploy --only functions:trackClick
```

**Functions:**
- `processOutreach` - Scheduled (runs hourly), sends pending emails
- `trackOpen` - HTTP endpoint, tracks email opens
- `trackClick` - HTTP endpoint, tracks link clicks
- `unsubscribe` - HTTP endpoint, handles unsubscribes
- `getCampaignAnalytics` - HTTP endpoint, returns campaign stats

## 📈 Expected Results (30 Days)

| Metric | Target | Rate |
|--------|--------|------|
| **Properties Scraped** | 500 | 100% |
| **Enriched with Data** | 500 | 100% |
| **Qualified (Score ≥50)** | 150 | 30% |
| **Emails Sent** | 600 | 4× sequence |
| **Email Opens** | 150 | 25% |
| **Email Replies** | 30 | 5% |
| **Qualified Meetings** | 50 | 10% |
| **Closed Deals** | 5 | 10% |

**Revenue Projection:**
- Average deal: 150 kW × $3,000/kW = $450,000
- 5 deals × $450,000 = **$2,250,000**

## 🎯 Lead Qualification Scoring

Scores from 0-100 based on:

**ROI (40 points)**
- >200% ROI: 40 pts
- >150% ROI: 35 pts
- >100% ROI: 30 pts

**Payback Period (30 points)**
- <5 years: 30 pts
- <7 years: 25 pts
- <10 years: 20 pts

**System Size (15 points)**
- >250 kW: 15 pts
- >100 kW: 12 pts
- >50 kW: 8 pts

**Electric Rate (15 points)**
- >$0.15/kWh: 15 pts
- >$0.12/kWh: 12 pts
- >$0.10/kWh: 8 pts

**Tiers:**
- A (80-100): Excellent - Hot leads
- B (65-79): Good - High priority
- C (50-64): Fair - Standard follow-up
- D (35-49): Poor - Low priority
- F (<35): Not qualified

## 📧 Email Sequences

### Standard Sequence (14 days)

| Day | Template | Subject Line | Goal |
|-----|----------|-------------|------|
| 0 | Initial | "$45K/year savings opportunity" | Hook with data |
| 3 | Follow-up #1 | "Quick follow-up: solar analysis" | Reinforce value |
| 7 | Follow-up #2 | "Case study: Similar property saved $50K" | Social proof |
| 14 | Follow-up #3 | "Last call: Solar opportunity" | Final push |

### Aggressive Sequence (10 days)

Days: 0, 2, 5, 10

### Gentle Sequence (30 days)

Days: 0, 5, 14, 30

## 🔍 Tracking & Analytics

### Campaign Dashboard

View real-time metrics:

```bash
curl "https://us-central1-power-to-the-people-vpp.cloudfunctions.net/getCampaignAnalytics?campaignId=YOUR_CAMPAIGN_ID"
```

Returns:
```json
{
  "emailsSent": 150,
  "emailsOpened": 38,
  "emailsClicked": 12,
  "emailsReplied": 8,
  "qualifiedLeads": 15,
  "metrics": {
    "openRate": "25.3%",
    "clickRate": "8.0%",
    "replyRate": "5.3%",
    "conversionRate": "10.0%"
  }
}
```

## 🛠️ Troubleshooting

### Scraper Issues

**Problem:** LoopNet blocks requests

**Solution:**
```javascript
// Add delays and rotate user agents
await scraper.delay(3000 + Math.random() * 2000);
```

### Enrichment Failures

**Problem:** Google Solar API quota exceeded

**Solution:**
```javascript
// Implement exponential backoff
const enricher = new LeadEnricher({ maxRetries: 3, backoffMs: 1000 });
```

### Email Delivery

**Problem:** Emails going to spam

**Solutions:**
1. Set up SPF, DKIM, DMARC records
2. Warm up email domain (start with 10/day)
3. Use professional email service (SendGrid, AWS SES)
4. Personalize emails (avoid spam trigger words)

## 📝 Best Practices

### Data Quality

1. **Verify contact emails** - Use email verification API
2. **Validate phone numbers** - Check format and carrier
3. **Remove duplicates** - Dedupe by property address
4. **Update stale data** - Re-scrape every 90 days

### Outreach Timing

1. **Send 9-11 AM local time** - Best open rates
2. **Tuesday-Thursday** - Avoid Mondays and Fridays
3. **Avoid holidays** - Check business calendar
4. **Respect time zones** - Use property location

### Compliance

1. **CAN-SPAM Act** - Include unsubscribe link
2. **GDPR** - Get consent for EU properties
3. **Do Not Call** - Check DNC registry for calls
4. **Privacy Policy** - Link to your privacy policy

## 🚨 Limitations & Notes

1. **Scraping**: LoopNet/CoStar may block aggressive scraping. Use proxies and rate limiting.

2. **Contact Data**: Apollo.io and Hunter.io require paid API keys. Budget ~$200/month.

3. **Email Sending**: Gmail has daily limits (500/day). Use SendGrid ($15/month) for higher volume.

4. **Solar API**: Google Solar API has usage limits. Request quota increase for production.

5. **Manual Review**: Always review top leads manually before high-touch outreach.

## 📚 Additional Resources

- [Google Solar API Docs](https://developers.google.com/maps/documentation/solar)
- [OpenEI Utility Rate API](https://openei.org/services/doc/rest/util_rates/)
- [Apollo.io API](https://apolloio.github.io/apollo-api-docs/)
- [Hunter.io API](https://hunter.io/api-documentation/v2)
- [CAN-SPAM Compliance](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

## 🤝 Support

Questions? Contact:
- Email: justin@agntc.tech
- GitHub Issues: [Create Issue](https://github.com/your-repo/issues)

---

**Built with ❤️ for Power to the People Solar**
