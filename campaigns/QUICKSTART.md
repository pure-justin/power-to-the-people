# Commercial Cold Outbound Campaign - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites

1. **Firebase Setup**
   ```bash
   # Already configured in /Users/admin/Projects/power-to-the-people/
   # Service account: firebase-service-account.json
   ```

2. **Environment Variables**
   ```bash
   cd campaigns
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   # Firebase (already configured via service account)
   GOOGLE_APPLICATION_CREDENTIALS=../firebase-service-account.json

   # SendGrid (for email delivery)
   SENDGRID_API_KEY=your_sendgrid_api_key

   # Optional: Twilio for SMS
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

## 🎯 Launch Your First Campaign (DRY RUN)

### Step 1: Scrape Properties (Sample Data)
```bash
node scrapers/loopnet-scraper.js --state TX --limit 50
```

Output:
```
🔍 Scraping TX commercial properties...
   Min sqft: 50,000
   Limit: 50
   ✓ Scraped 50/50 properties
✅ Successfully scraped 50 properties
```

### Step 2: Enrich with Utility Rates
```bash
node enrichment/utility-rates.js --enrich --batch-size 50
```

Output:
```
🔋 Enriching leads with utility rate data...
   ✓ Enriched 50/50 leads
✅ Enriched 50 leads with utility data
```

### Step 3: Calculate Solar ROI
```bash
node enrichment/roi-calculator.js --enrich --batch-size 50
```

Output:
```
💰 Calculating solar ROI for leads...
   ✓ Calculated ROI for 50/50 leads
✅ Calculated ROI for 50 leads
```

### Step 4: Score Leads
```bash
node enrichment/lead-scorer.js --score --batch-size 50
```

Output:
```
🎯 Scoring leads...
   ✓ Scored 50/50 leads
✅ Scored 50 leads

📊 Scoring Results:
{
  "count": 50,
  "avgScore": 78,
  "highScore": 95,
  "lowScore": 52,
  "median": 79
}
```

### Step 5: Preview Email
```bash
# Get a lead ID from Firestore
node enrichment/lead-scorer.js --list --priority hot --limit 1

# Preview email for that lead
node outreach/email-engine.js --preview --lead-id <LEAD_ID> --sequence 1
```

### Step 6: Launch Campaign (DRY RUN)
```bash
node campaign-orchestrator.js --launch --target 50 --states TX --dry-run
```

This will:
- ✅ Scrape 50 properties in TX
- ✅ Enrich with utility rates
- ✅ Calculate ROI for each property
- ✅ Score and prioritize leads
- ✅ Preview emails (won't actually send in dry-run mode)
- ✅ Generate campaign report

## 🔥 Launch REAL Campaign (500 Leads)

Once you've tested with dry-run:

```bash
node campaign-orchestrator.js --launch \
  --target 500 \
  --states TX,AZ,CA,FL,NV \
  --no-dry-run
```

This will:
1. **Scrape 500 commercial properties** across 5 sun-belt states
2. **Enrich** with utility rates and ROI calculations
3. **Score** and prioritize leads (hot/warm/medium/cold)
4. **Send Email #1** to all HOT leads (score ≥ 80)
5. **Save campaign** to Firestore

## 📧 Automated Follow-Up Sequences

Set up a cron job for daily follow-ups:

```bash
# Add to crontab (runs daily at 9am)
0 9 * * * cd /path/to/campaigns && node campaign-orchestrator.js --follow-up
```

Email sequence timing:
- **Day 0**: Introduction email (with personalized ROI)
- **Day 3**: Value proposition email
- **Day 7**: Case study email
- **Day 14**: Urgency email (ITC deadline)
- **Day 21**: Final breakup email

## 📊 Monitor Campaign Performance

### View Lead Statistics
```bash
node enrichment/lead-scorer.js --stats
```

Output:
```json
{
  "total": 500,
  "scored": 500,
  "byPriority": {
    "hot": 87,
    "warm": 143,
    "medium": 201,
    "cold": 69
  },
  "avgScore": 73,
  "topLeads": [...]
}
```

### View Qualified Leads
```bash
node campaign-orchestrator.js --qualified
```

Shows leads with:
- Score ≥ 70
- Opened emails ≥ 2 times

### Check ROI Statistics
```bash
node enrichment/roi-calculator.js --stats
```

## 🎨 Dashboard (Coming Soon)

React dashboard at `campaigns/dashboard/`:

```bash
cd dashboard
npm install
npm run dev
```

Features:
- Real-time lead list with filters
- Campaign metrics (open rate, click rate, response rate)
- Lead detail view with full ROI breakdown
- Email sequence timeline
- Export to CSV

## 🔍 Individual Commands

### Scraping
```bash
# Scrape specific state
node scrapers/loopnet-scraper.js --state AZ --min-sqft 75000 --limit 100

# View scraping stats
node scrapers/loopnet-scraper.js --stats
```

### Utility Rates
```bash
# Get rate for specific location
node enrichment/utility-rates.js --get-rate --state TX --zip 75001

# Enrich all leads
node enrichment/utility-rates.js --enrich --batch-size 100

# View utility stats
node enrichment/utility-rates.js --stats
```

### ROI Calculator
```bash
# Calculate ROI for all unenriched leads
node enrichment/roi-calculator.js --enrich

# View ROI statistics
node enrichment/roi-calculator.js --stats
```

### Lead Scoring
```bash
# Score all leads
node enrichment/lead-scorer.js --score

# List hot leads
node enrichment/lead-scorer.js --list --priority hot --limit 50

# List warm leads
node enrichment/lead-scorer.js --list --priority warm --limit 100
```

### Email Outreach
```bash
# Preview email
node outreach/email-engine.js --preview --lead-id <ID> --sequence 1

# Send campaign (dry run)
node outreach/email-engine.js --campaign --priority hot --sequence 1 --dry-run

# Send campaign (production)
node outreach/email-engine.js --campaign --priority hot --sequence 1 --limit 50
```

## 📈 Success Metrics

### Week 1 Goals:
- ✅ 500 properties scraped
- ✅ 100% enriched with ROI
- ✅ 80+ "hot" leads identified
- ✅ Email #1 sent to hot leads

### Week 2 Goals:
- ✅ 25% email open rate
- ✅ 15% link click rate
- ✅ 10+ discovery calls booked

### Week 3-4 Goals:
- ✅ 50 qualified leads (10% conversion)
- ✅ 20+ discovery calls completed
- ✅ 5+ proposals sent

## 🔧 Troubleshooting

### Firebase Connection Issues
```bash
# Check Firebase service account
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-service-account.json
node -e "const admin = require('firebase-admin'); admin.initializeApp(); console.log('✅ Firebase connected');"
```

### SendGrid Email Issues
```bash
# Test SendGrid API key
node -e "const sgMail = require('@sendgrid/mail'); sgMail.setApiKey(process.env.SENDGRID_API_KEY); console.log('✅ SendGrid configured');"
```

### View Firestore Data
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Open Firestore console
open https://console.firebase.google.com/project/power-to-the-people-vpp/firestore
```

## 🚨 Production Checklist

Before launching real campaign:

- [ ] SendGrid API key configured and verified
- [ ] Domain authentication set up in SendGrid
- [ ] Unsubscribe link working
- [ ] Test emails sent and received successfully
- [ ] Firestore security rules deployed
- [ ] Firestore indexes created
- [ ] Campaign tracking in place
- [ ] Daily follow-up cron job configured
- [ ] Monitoring/alerting set up

## 📞 Support

Questions? Email justin@agntc.tech
