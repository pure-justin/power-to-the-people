# 🚀 Campaign Launch Instructions

Complete guide to launch the commercial solar cold outbound campaign targeting 500 property managers.

## ⚡ Quick Start (10 minutes)

### Step 1: Get SendGrid API Key (3 minutes)

1. **Create account**: https://signup.sendgrid.com/
2. **Get API key**: https://app.sendgrid.com/settings/api_keys
   - Click "Create API Key"
   - Name: "Commercial Solar Campaign"
   - Permission: **Full Access**
   - Copy the key (starts with `SG.`)

3. **Add to .env file**:
```bash
# Edit the .env file
nano .env

# Add your SendGrid API key:
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

4. **Test SendGrid**:
```bash
node test-sendgrid.js
```

You should see:
```
✅ Email sent successfully!
✅ Check your inbox at: justin@agntc.tech
```

### Step 2: Create Firestore Indexes (5 minutes)

The Firestore indexes are already being created in the background. To check status:

```bash
gcloud firestore indexes composite list --project=power-to-the-people-vpp
```

Wait until all indexes show `state: READY`. This typically takes 2-5 minutes.

Or just click this link and create them manually:
https://console.firebase.google.com/project/power-to-the-people-vpp/firestore/indexes

### Step 3: Run Test Campaign (2 minutes)

```bash
# Test with 10 leads in dry-run mode (no emails sent)
node campaign-orchestrator.js --launch --target=10 --dry-run
```

Expected output:
```
✅ Scraped 10 properties
✅ Enriched 10 leads with utility data
✅ Enriched 10 leads with ROI
✅ Found 8 hot leads
✅ [DRY RUN] Would send 8 emails
```

## 🚀 Production Launch

### Small Test (50 Leads)

```bash
# Generate 50 test leads and send real emails
node campaign-orchestrator.js --launch --target=50
```

This will:
- Generate 50 test commercial properties
- Enrich all with utility rates
- Calculate solar ROI for each
- Send Email #1 to hot leads (score ≥ 80)
- Store all data in Firestore

**Time:** ~5 minutes

### Full Production (500 Leads)

```bash
# Scrape 500 real properties and launch full campaign
node campaign-orchestrator.js --launch --target=500 --production
```

This will:
- Scrape 500 real commercial properties from LoopNet
- Enrich with real utility rate data
- Calculate personalized ROI for each property
- Score and prioritize leads
- Send Email #1 to all hot leads
- Store in Firestore for follow-ups

**Time:** 2-4 hours (scraping is rate-limited)

## 📊 Monitor Campaign

### View Statistics

```bash
node campaign-orchestrator.js --stats
```

Shows:
- Total leads by state and priority
- Average ROI and payback period
- Email statistics (sent, opened, clicked)
- Top 10 leads by score

### View Qualified Leads

```bash
node campaign-orchestrator.js --qualified
```

Shows leads ready for sales follow-up:
- Lead score ≥ 65
- Opened emails ≥ 2 times
- Contact information
- ROI summary

### View Top Leads

```bash
node enrichment/roi-calculator-service.js --top --limit=50
```

## 🔄 Automated Follow-Ups

Set up daily automated follow-ups (runs at 9 AM):

```bash
# Add to crontab
crontab -e

# Add this line:
0 9 * * * cd /Users/admin/Projects/power-to-the-people/campaigns/commercial-outbound && node campaign-orchestrator.js --follow-up >> /tmp/solar-campaign.log 2>&1
```

This automatically sends:
- **Email #2** (Day 3): Follow-up with additional savings details
- **Email #3** (Day 7): Case study of similar property
- **Email #4** (Day 14): Final call to action
- **Warm leads**: Start email sequence for warm leads

## 📈 Expected Results (30 Days)

| Week | Action | Expected Result |
|------|--------|-----------------|
| **Week 1** | Scrape 500 properties<br>Send Email #1 to hot leads | 80-100 hot leads identified<br>25% open rate (~20-25 opens)<br>5% reply rate (~4-5 replies) |
| **Week 2** | Send Email #2-3 to engaged leads | Additional 10-15 discovery calls<br>15-20 total qualified leads |
| **Week 3** | Send Email #4<br>Start warm lead sequence | 30-40 qualified leads<br>10-15 discovery calls booked |
| **Week 4** | Complete follow-ups<br>Sales outreach | **50 qualified leads**<br>20+ discovery calls<br>5-10 proposals sent |

## 💰 Revenue Projection

- **Average system**: 150 kW × $2.50/watt = **$375K**
- **50 qualified leads** → 20 discovery calls → 10 proposals → **5 deals**
- **5 deals × $375K** = **$1.875M pipeline**
- **At 50% close rate** = **$937K revenue**

## 🎯 Success Metrics

Monitor these KPIs:

| Metric | Target | How to Check |
|--------|--------|--------------|
| **Properties Scraped** | 500 | `--stats` |
| **Hot Leads** | 80+ | `--stats` |
| **Emails Sent** | 400+ | `--stats` |
| **Email Open Rate** | 20%+ | SendGrid dashboard |
| **Email Click Rate** | 5%+ | SendGrid dashboard |
| **Reply Rate** | 5%+ | Track manually |
| **Discovery Calls** | 20+ | Track manually |
| **Qualified Leads** | 50 | `--qualified` |

## 🔧 Troubleshooting

### Firestore Index Errors

**Problem:** "The query requires an index"

**Solution:**
1. Click the link in the error message
2. Or run: `./setup-firestore-indexes.sh`
3. Wait 2-5 minutes for indexes to build
4. Re-run the command

### SendGrid Errors

**Problem:** "Unauthorized" or "Forbidden"

**Solution:**
1. Verify API key is correct in `.env`
2. Check API key has "Mail Send" permission
3. Run `node test-sendgrid.js` to test

**Problem:** Emails going to spam

**Solution:**
1. Set up domain authentication in SendGrid
2. Warm up domain (start with 10-20 emails/day)
3. See `SENDGRID_SETUP.md` for detailed guide

### Scraping Issues

**Problem:** LoopNet blocking requests

**Solution:**
1. Use test mode first: `--target=50` (without `--production`)
2. Production scraping uses rate limiting (2-4 sec delays)
3. Run overnight to avoid peak traffic

## 📁 Files Reference

| File | Purpose |
|------|---------|
| `campaign-orchestrator.js` | Main orchestration script |
| `run-campaign.js` | Alternative simple launcher |
| `scrapers/commercial-property-scraper.js` | LoopNet scraper |
| `enrichment/utility-rate-service.js` | Utility rate lookup |
| `enrichment/roi-calculator-service.js` | Solar ROI calculator |
| `outreach/email-engine.js` | SendGrid email sender |
| `templates/email-templates.js` | Email templates |
| `.env` | Configuration (API keys) |

## 🔐 Security & Compliance

### CAN-SPAM Compliance

All emails include:
- ✅ Accurate sender information
- ✅ Clear subject lines
- ✅ Physical mailing address
- ✅ Unsubscribe link
- ✅ Honor opt-outs within 10 days

### Data Privacy

- ✅ Public business information only
- ✅ No personal consumer data
- ✅ Opt-out mechanism
- ✅ B2B outreach (commercial properties)

## 📞 Support

Questions or issues?

- Email: justin@agntc.tech
- Logs: `/tmp/solar-campaign.log`
- Firebase Console: https://console.firebase.google.com/project/power-to-the-people-vpp
- SendGrid Dashboard: https://app.sendgrid.com/

## ✅ Pre-Launch Checklist

Before launching to 500 leads:

- [ ] SendGrid API key configured in `.env`
- [ ] Test email sent successfully (`node test-sendgrid.js`)
- [ ] Firestore indexes created and ready
- [ ] Test campaign run successfully (10 leads, dry-run)
- [ ] Small production test (50 leads) completed
- [ ] Email deliverability looks good (check SendGrid dashboard)
- [ ] From email matches domain you want to use
- [ ] Unsubscribe mechanism tested
- [ ] Discovery call booking process ready

## 🎉 Ready to Launch!

Once all checks pass, run the full production campaign:

```bash
node campaign-orchestrator.js --launch --target=500 --production
```

Then sit back and watch the qualified leads roll in! 🚀

---

**Built for Power to the People Solar - Let's make renewable energy accessible to everyone!**
