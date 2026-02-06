# ⚡ Quick Start - Commercial Lead Pipeline

## 🚀 Generate Leads (5 seconds)

```bash
# Generate 500 leads with default settings
node scripts/automated-lead-pipeline.js

# That's it! ✨
```

## 📊 Common Commands

```bash
# Generate specific number
node scripts/automated-lead-pipeline.js --target=1000

# Only use generated data (no API)
node scripts/automated-lead-pipeline.js --mode=generate

# Only scrape real properties
node scripts/automated-lead-pipeline.js --mode=scrape

# Skip Firestore import
node scripts/automated-lead-pipeline.js --skip-firestore

# Validate exported data
node scripts/validate-leads.js commercial-leads-2026-02-06.json

# Schedule daily automated runs
node scripts/schedule-lead-pipeline.js --now
```

## 📁 Output Files

```bash
commercial-leads-2026-02-06.json    # 500 properties with full data
.lead-pipeline-state.json           # Scheduler state tracking
```

## 🎯 What You Get

**Per Lead:**
- Property name & type
- Full address with coordinates
- Contact info (phone/website)
- Building & roof size
- Energy consumption estimate
- Solar system design
- Financial analysis (ROI, savings, payback)
- Ownership estimate
- Market analysis
- Lead score & ranking

**500 Properties:**
- 113.7 MW total solar capacity
- $17M annual savings potential
- $284M system cost
- $114M tax credits
- 81% have phone numbers
- All data ready for CRM import

## 🏆 Lead Quality

- **Gold Tier** (61%): Excellent ROI, high priority
- **Silver Tier** (38%): Good ROI, medium priority
- **Bronze Tier** (1%): Fair ROI, lower priority

## ⚙️ Automation Setup

```bash
# Add to crontab for daily 2 AM runs
crontab -e

# Add this line:
0 2 * * * cd /path/to/power-to-the-people && node scripts/schedule-lead-pipeline.js --mode=cron

# Or run as daemon
node scripts/schedule-lead-pipeline.js --mode=daemon
```

## 🔧 Requirements

- Node.js installed
- `.env` file with Google Maps API key (optional, works without it)
- Firebase credentials (optional for import)

## 📊 Pipeline Flow

1. **Data Collection** - Scrape/generate properties
2. **Enrichment** - Add ownership, market data
3. **Scoring** - Rank leads by potential
4. **Export** - Create JSON backup
5. **Import** - Load to Firestore (optional)
6. **Report** - Statistics & top leads

## ⏱️ Typical Performance

- **Generation Mode**: < 1 second for 500 leads
- **Scrape Mode**: 10-30 minutes (API limits)
- **Hybrid Mode**: 5-15 minutes

## 🎓 Pro Tips

1. Start with `--mode=generate` to test quickly
2. Use `--skip-firestore` to export without DB import
3. Run `validate-leads.js` to check data quality
4. Schedule daily runs for fresh leads
5. Review top 50 Gold tier leads first

## 📚 Full Documentation

- **Complete Guide**: `LEAD_PIPELINE_GUIDE.md`
- **Implementation**: `PIPELINE_SUMMARY.md`
- **Project README**: `README.md`

## 🆘 Quick Troubleshooting

**API errors?** Use `--mode=generate`
**Memory issues?** Reduce `--target`
**Import fails?** Use `--skip-firestore`

---

## 🎯 Run It Now!

```bash
node scripts/automated-lead-pipeline.js
```

**Done in seconds. 500 leads ready.** ✨
