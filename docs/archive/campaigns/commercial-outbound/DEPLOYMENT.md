# Commercial Solar Campaign - Deployment Guide

## 🚀 Production Deployment Checklist

### 1. Firebase Setup

#### Create Firestore Indexes

The campaign requires several composite indexes. Create them via Firebase Console:

1. Go to https://console.firebase.google.com/project/power-to-the-people-vpp/firestore/indexes

2. Create these indexes manually:

**Index 1: Lead Enrichment Query**
```
Collection: commercial_leads
Fields:
  - enrichedWithUtilityData (Ascending)
  - enrichedWithROI (Ascending)
Query Scope: Collection
```

**Index 2: Email Campaign Query**
```
Collection: commercial_leads
Fields:
  - enrichedWithROI (Ascending)
  - leadPriority (Ascending)
  - emailSequence (Ascending)
Query Scope: Collection
```

**Index 3: Lead Scoring Query**
```
Collection: commercial_leads
Fields:
  - enrichedWithROI (Ascending)
  - leadScore (Descending)
Query Scope: Collection
```

**Index 4: Qualified Leads Query**
```
Collection: commercial_leads
Fields:
  - leadScore (Ascending)
  - emailsOpened (Ascending)
Query Scope: Collection
```

Or click these auto-generated links when you run the campaign:
- The error message will provide direct links to create required indexes
- Click the link and approve index creation
- Indexes typically take 2-5 minutes to build

#### Update Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Commercial leads - internal only
    match /commercial_leads/{leadId} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }

    // Campaign emails - internal only
    match /campaign_emails/{emailId} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }

    // Campaigns - internal only
    match /campaigns/{campaignId} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

### 2. SendGrid Configuration

#### Create SendGrid Account

1. Go to https://sendgrid.com/
2. Create account (free tier: 100 emails/day)
3. Upgrade to Essentials plan ($15/month, 50K emails/month)

#### Create API Key

1. Settings → API Keys → Create API Key
2. Name: "Commercial Solar Campaign"
3. Permissions: Full Access
4. Save API key securely

#### Domain Authentication

1. Settings → Sender Authentication → Authenticate Your Domain
2. Add DNS records provided by SendGrid:
   - CNAME records for domain verification
   - SPF, DKIM, DMARC records
3. Verify domain authentication

#### Configure Tracking

1. Settings → Tracking → Click Tracking: Enable
2. Settings → Tracking → Open Tracking: Enable
3. Settings → Suppression Management: Configure unsubscribe link

### 3. Environment Variables

Create `.env` file in `campaigns/commercial-outbound/`:

```bash
# SendGrid
SENDGRID_API_KEY="SG.xxxxxxxxxxxxx"

# Firebase (already configured via service account)
GOOGLE_APPLICATION_CREDENTIALS="../../../firebase-service-account.json"
```

### 4. Install Dependencies

```bash
cd /Users/admin/Projects/power-to-the-people/campaigns/commercial-outbound
npm install
```

### 5. Test Campaign (Dry Run)

```bash
# Generate 10 test leads and preview emails (no actual sending)
node campaign-orchestrator.js --launch --target=10 --dry-run
```

**Expected output:**
- ✅ 10 properties scraped
- ✅ 10 leads enriched with utility data
- ✅ 10 leads enriched with ROI calculations
- ✅ Email previews for hot leads
- ✅ No actual emails sent (dry-run mode)

### 6. Small Production Test

```bash
# Generate 50 test leads and send emails to hot leads
node campaign-orchestrator.js --launch --target=50

# Note: This uses TEST data (not real scraping)
# Emails will be sent for real (no --dry-run flag)
```

### 7. Full Production Launch

```bash
# Scrape 500 real properties and launch full campaign
node campaign-orchestrator.js --launch --target=500 --production
```

**This will:**
1. Scrape 500 commercial properties from LoopNet
2. Enrich all with utility rates
3. Calculate ROI for all
4. Send Email #1 to all hot leads (score ≥ 80)

**Timeline:**
- Scraping: ~2-4 hours (with rate limiting)
- Enrichment: ~10-20 minutes
- Email sending: ~5-10 minutes (1 email/second)

### 8. Set Up Daily Follow-Ups

Add to crontab (runs at 9 AM daily):

```bash
crontab -e
```

Add line:
```
0 9 * * * cd /Users/admin/Projects/power-to-the-people/campaigns/commercial-outbound && node campaign-orchestrator.js --follow-up >> /tmp/solar-campaign.log 2>&1
```

This automatically sends:
- Email #2 to hot leads (3 days after Email #1)
- Email #3 to hot leads (7 days after Email #2)
- Email #4 to hot leads (14 days after Email #3)
- Email #1 to warm leads
- Email #2 to warm leads

### 9. Monitor Campaign

#### View Statistics

```bash
node campaign-orchestrator.js --stats
```

Shows:
- Total leads by state and priority
- Average ROI and payback period
- Email statistics (sent, opened, clicked)
- Top 10 leads

#### View Qualified Leads

```bash
node campaign-orchestrator.js --qualified
```

Shows leads with:
- Score ≥ 65
- Opened emails ≥ 2 times
- Ready for sales follow-up

#### View Top Leads

```bash
node enrichment/roi-calculator-service.js --top --limit=50
```

### 10. SendGrid Dashboard Monitoring

Check SendGrid for real-time metrics:
- https://app.sendgrid.com/stats
- Open rate, click rate, bounce rate
- Spam reports, unsubscribes

**Good metrics:**
- Open rate: 20-30%
- Click rate: 5-10%
- Bounce rate: <5%
- Spam reports: <0.1%

## 🔧 Troubleshooting

### Index Creation Errors

**Issue:** Firestore index not found error

**Solution:**
1. Click the link in the error message
2. Approve index creation in Firebase Console
3. Wait 2-5 minutes for index to build
4. Re-run command

### SendGrid Rate Limiting

**Issue:** "Too many requests" from SendGrid

**Solution:**
- Free tier: 100 emails/day limit
- Upgrade to Essentials ($15/month) for 50K/month
- Add rate limiting (already implemented: 1 email/second)

### Email Deliverability Issues

**Issue:** Emails going to spam

**Solutions:**
1. ✅ Domain authentication (SPF, DKIM, DMARC)
2. ✅ Warm up domain (start with 10-20 emails/day, increase gradually)
3. ✅ Personalize emails (avoid generic templates)
4. ✅ Include unsubscribe link (required by CAN-SPAM)
5. ✅ Monitor spam complaints (<0.1% threshold)

### Firebase Authentication Errors

**Issue:** "Permission denied" errors

**Solution:**
- Verify `firebase-service-account.json` exists
- Check file path in code is correct
- Ensure service account has proper permissions

### Scraping Blocked

**Issue:** LoopNet blocking requests

**Solutions:**
1. Use test mode first: `--test` flag
2. Increase delays between requests
3. Use rotating proxies (not implemented yet)
4. Run overnight to avoid rate limits

## 📊 Expected Results (30 Days)

### Week 1
- ✅ 500 properties scraped
- ✅ 500 leads enriched
- ✅ 80-100 hot leads identified
- ✅ Email #1 sent to hot leads
- ✅ ~25% open rate
- ✅ 10-15 discovery call requests

### Week 2
- ✅ Email #2 sent to engaged leads
- ✅ Email #3 sent (case studies)
- ✅ ~20% reply rate
- ✅ 15-20 discovery calls booked

### Week 3-4
- ✅ Email #4 sent (final call)
- ✅ Email #1 sent to warm leads
- ✅ 50 qualified leads (10% conversion)
- ✅ 20+ discovery calls completed
- ✅ 5-10 proposals sent
- ✅ 2-5 signed contracts

### Revenue Projection
- Average system: 150 kW @ $2.50/watt = $375K
- 5 deals × $375K = **$1.875M pipeline**
- At 50% close rate = **$937K revenue**

## 🔒 Security & Compliance

### CAN-SPAM Compliance

All emails include:
- ✅ Accurate from address
- ✅ Clear subject lines
- ✅ Physical mailing address
- ✅ Unsubscribe link
- ✅ Processing opt-outs within 10 business days

### Data Privacy

- ✅ No storage of sensitive personal data
- ✅ Public business information only
- ✅ Opt-out mechanism
- ✅ CCPA compliance (California)

### Rate Limiting

- ✅ 1 email per second (SendGrid best practice)
- ✅ 2-4 seconds between scraping requests
- ✅ Respect robots.txt

## 📞 Support

### Issues or Questions?

- Email: justin@agntc.tech
- Check logs: `/tmp/solar-campaign.log`
- Firebase Console: https://console.firebase.google.com/project/power-to-the-people-vpp
- SendGrid Dashboard: https://app.sendgrid.com/

## 🎉 Success Metrics Dashboard

Track these KPIs weekly:

| Metric | Week 1 | Week 2 | Week 3 | Week 4 | Target |
|--------|--------|--------|--------|--------|--------|
| Properties Scraped | 500 | 500 | 500 | 500 | 500 |
| Hot Leads | 85 | 85 | 85 | 85 | 80+ |
| Emails Sent | 85 | 200 | 350 | 500 | 400+ |
| Email Opens | 21 | 50 | 88 | 125 | 100+ |
| Email Replies | 4 | 10 | 18 | 25 | 20+ |
| Discovery Calls | 8 | 15 | 20 | 25 | 20+ |
| Proposals Sent | 0 | 3 | 6 | 10 | 5+ |
| Qualified Leads | 12 | 28 | 42 | 50 | 50 |

---

**Ready to launch? Run the test campaign first, then go production! 🚀**
