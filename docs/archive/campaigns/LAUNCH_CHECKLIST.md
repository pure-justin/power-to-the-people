# 🚀 Commercial Outreach Campaign - Launch Checklist

## ✅ Pre-Launch Validation

**System Status:** ✅ ALL TESTS PASSING (7/7)

### Test Results
- ✅ ROI Calculator: 200kW system, $36K/year savings
- ✅ Lead Qualification: 80/100 (A - Excellent)
- ✅ Email Generation: Personalized templates working
- ✅ Lead Validation: All required fields present
- ✅ Email Sequences: 4 templates generated
- ✅ Financial Projections: $1.2M+ over 25 years
- ✅ Tax Benefits: 45% total incentives

## 📋 Launch Steps

### 1. Environment Setup ✓

```bash
# Install dependencies
npm install

# Run tests
node campaigns/commercial-outbound/test-system.js
```

**Expected Output:** ✅ All tests passed! System is ready to launch.

### 2. API Configuration

**Required (must have):**
- [ ] `VITE_GOOGLE_MAPS_API_KEY` - Get from: console.cloud.google.com
- [ ] `OUTREACH_FROM_EMAIL` - Your sending email address

**Optional (improves results):**
- [ ] `APOLLO_API_KEY` - $49/mo at app.apollo.io
- [ ] `HUNTER_API_KEY` - $49/mo at hunter.io
- [ ] `OPENEI_API_KEY` - Free at openei.org
- [ ] `GMAIL_USER` - Your Gmail address
- [ ] `GMAIL_APP_PASSWORD` - App password from Google

### 3. Test Campaign (Dry Run)

```bash
npm run campaign:test
```

**What this does:**
- Scrapes 10 test properties
- Enriches with solar data
- Calculates personalized ROI
- Shows sample emails (doesn't send)
- Saves data to `campaigns/commercial-outbound/data/`

**Review:**
- [ ] Check `scraped-leads-*.json` - Are properties valid?
- [ ] Check `enriched-leads-*.json` - Is data complete?
- [ ] Check `qualified-leads-*.json` - Are top leads good?

### 4. Deploy Cloud Functions

```bash
./campaigns/commercial-outbound/deploy.sh
```

**Deploys:**
- `processOutreach` - Hourly email scheduler
- `trackOpen` - Email open tracking
- `trackClick` - Link click tracking
- `unsubscribe` - Unsubscribe handler
- `getCampaignAnalytics` - Real-time stats

**Verify:**
- [ ] All functions deployed successfully
- [ ] Test tracking pixel: `curl https://[function-url]/trackOpen/test`
- [ ] Check Firebase Console for functions

### 5. Launch Campaign

```bash
# Full campaign: 500 leads → 50 qualified
npm run campaign:run -- --target 500 --qualified 50
```

**Monitor:**
- [ ] Watch console output for errors
- [ ] Check Firestore for lead creation
- [ ] Verify emails are scheduled
- [ ] Confirm no API rate limit errors

## 📊 Post-Launch Monitoring

### Day 1 - Immediate Checks
- [ ] Verify emails are sending (check `outreach` collection)
- [ ] Monitor open rate (target: 25%)
- [ ] Check bounce rate (should be <5%)
- [ ] Review any error logs

### Day 3 - Follow-up Analysis
- [ ] Review reply sentiment
- [ ] Identify hot leads (replies within 24h)
- [ ] Schedule meetings with interested leads
- [ ] Adjust subject lines if open rate <20%

### Week 1 - Optimization
- [ ] A/B test top performing subjects
- [ ] Review qualification scoring accuracy
- [ ] Refine email messaging based on feedback
- [ ] Scale to higher volume if results good

### Week 2 - Conversion Focus
- [ ] Track meeting → deal conversion
- [ ] Calculate actual vs projected ROI
- [ ] Build case studies from wins
- [ ] Expand to new markets

## 🎯 Success Metrics

### Target Performance (30 Days)
| Metric | Target | Status |
|--------|--------|--------|
| Properties Scraped | 500 | ⏳ |
| Enriched Successfully | 450 (90%) | ⏳ |
| Qualified Leads | 150 (30%) | ⏳ |
| Email Opens | 150 (25%) | ⏳ |
| Email Replies | 30 (5%) | ⏳ |
| Meetings Scheduled | 50 | ⏳ |
| Closed Deals | 5 (10%) | ⏳ |
| Revenue Generated | $2.25M | ⏳ |

### Red Flags 🚨
**Stop and investigate if:**
- Open rate <15% after 50 emails
- Bounce rate >10%
- Zero replies after 100 emails
- Complaint/spam rate >1%

## 🐛 Troubleshooting

### Issue: Emails not sending
**Check:**
1. Email credentials in `.env`
2. Gmail app password (not regular password)
3. Cloud Function logs: `firebase functions:log`
4. Firestore `outreach` collection status

**Fix:**
```bash
# Test email connection
node -e "console.log(process.env.GMAIL_USER)"
```

### Issue: Low open rates (<15%)
**Causes:**
- Spam folder delivery
- Poor subject lines
- Wrong send times

**Fixes:**
1. Set up SPF/DKIM/DMARC DNS records
2. Warm up domain (10/day for week 1)
3. A/B test subject lines
4. Send 9-11 AM local time

### Issue: API quota exceeded
**Services:**
- Google Maps/Solar: 25K requests/day free
- Apollo: 500 credits/month ($49 plan)
- Hunter: 500 searches/month ($49 plan)

**Fix:**
```bash
# Check API usage
# Google: console.cloud.google.com/apis/dashboard
# Apollo: app.apollo.io/#/settings/billing
# Hunter: hunter.io/api-usage
```

### Issue: Scraper blocked by LoopNet
**Symptoms:**
- 403 Forbidden errors
- CAPTCHA challenges
- Empty results

**Fixes:**
1. Add delays: `await scraper.delay(5000)`
2. Rotate user agents
3. Use residential proxies
4. Scrape during off-peak hours

## 💰 Cost Breakdown

### Per 500-Lead Campaign
- Google APIs: $50 (Maps + Solar)
- Contact enrichment: $100 (Apollo/Hunter)
- Email sending: $15 (SendGrid/SES)
- **Total: $165**

### ROI Calculation
- Cost per lead: $0.33
- Cost per qualified: $1.10
- Cost per deal: $33
- **Campaign ROI: 1,363,536%** 🚀

## 📞 Support & Resources

### Documentation
- **Full Guide:** `campaigns/commercial-outbound/README.md`
- **Quick Start:** `campaigns/QUICKSTART.md`
- **Summary:** `campaigns/CAMPAIGN_SUMMARY.md`
- **This Checklist:** `campaigns/LAUNCH_CHECKLIST.md`

### Getting Help
- **Email:** justin@agntc.tech
- **Logs:** `campaigns/commercial-outbound/data/*.log`
- **Firebase Console:** console.firebase.google.com
- **Test System:** `node campaigns/commercial-outbound/test-system.js`

### API Documentation
- Google Solar API: developers.google.com/maps/documentation/solar
- Apollo.io: apolloio.github.io/apollo-api-docs
- Hunter.io: hunter.io/api-documentation
- OpenEI: openei.org/services/doc/rest/util_rates

## 🎉 Ready to Launch?

### Final Checklist
- [ ] All tests passing (run `test-system.js`)
- [ ] Environment variables configured
- [ ] Dry run completed successfully
- [ ] Sample emails reviewed and approved
- [ ] Cloud Functions deployed
- [ ] Firebase collections indexed
- [ ] Monitoring dashboard ready
- [ ] Support contact available

**If all checked, you're ready! 🚀**

```bash
npm run campaign:run -- --target 500
```

**Expected Timeline:**
- Scraping: ~2 hours
- Enrichment: ~4 hours
- Email sending: 14 days (automated)
- Meetings: Days 7-21
- First deals: Days 14-30

---

**🎯 Goal: 50 qualified meetings → 5 closed deals → $2.25M revenue**

**Let's go! 🚀**
