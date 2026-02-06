# 📊 Commercial Lead Generation Scripts

Complete toolkit for generating, managing, and validating commercial solar leads in Nevada.

## 📁 Available Scripts

### 🚀 Main Pipeline
**`automated-lead-pipeline.js`** - Complete lead generation pipeline
- Scrapes/generates 500+ commercial properties
- Enriches with ownership, market data, competitive insights
- Scores and ranks leads by potential
- Exports to JSON and imports to Firestore
- Generates comprehensive reports

### ⏰ Scheduler
**`schedule-lead-pipeline.js`** - Automated scheduling system
- Run as cron job or daemon
- Tracks state between runs
- Prevents duplicate runs
- Weekly target management

### ✅ Validation
**`validate-leads.js`** - Data validation and statistics
- Validates JSON structure
- Generates detailed statistics
- Ranks top leads
- Financial analysis

### 🧪 Legacy Test Scripts
**`test-commercial-leads.js`** - Original test script (still works)
**`scrape-commercial-leads.js`** - Standalone scraper
**`generate-commercial-leads.js`** - Standalone generator

## 🎯 Quick Commands

### Using Node Directly

```bash
# Generate 500 leads (default)
node scripts/automated-lead-pipeline.js

# Custom target
node scripts/automated-lead-pipeline.js --target=1000

# Mode options
node scripts/automated-lead-pipeline.js --mode=generate  # No API calls
node scripts/automated-lead-pipeline.js --mode=scrape    # Only API
node scripts/automated-lead-pipeline.js --mode=hybrid    # Both (default)

# Skip Firestore
node scripts/automated-lead-pipeline.js --skip-firestore

# Validate results
node scripts/validate-leads.js commercial-leads-2026-02-06.json

# Schedule automated runs
node scripts/schedule-lead-pipeline.js --now
```

### Using NPM Scripts

```bash
# Generate leads (full pipeline)
npm run leads:generate

# Quick test (100 leads, no DB)
npm run leads:quick

# Scrape real properties
npm run leads:scrape

# Validate exported data
npm run leads:validate commercial-leads-2026-02-06.json

# Schedule runs
npm run leads:schedule -- --now
```

## 📊 Script Details

### automated-lead-pipeline.js

**Purpose**: Complete end-to-end pipeline for commercial lead generation

**Features**:
- Hybrid data collection (scrape + generate)
- Intelligent estimation algorithms
- Data enrichment (ownership, market, competition)
- Lead scoring and ranking
- JSON export with timestamps
- Firestore import with deduplication
- Comprehensive reporting

**Phases**:
1. Data Collection - Scrape/generate properties
2. Data Enrichment - Add ownership, market analysis
3. Quality Scoring - Score and rank leads
4. Export & Backup - Create JSON files
5. Firestore Import - Load to database
6. Final Report - Statistics and rankings

**Options**:
- `--target=N` - Number of properties (default: 500)
- `--mode=MODE` - Data source: hybrid, scrape, generate (default: hybrid)
- `--skip-firestore` - Skip database import

**Output**:
- `commercial-leads-YYYY-MM-DD.json` - Timestamped export

**Example**:
```bash
node scripts/automated-lead-pipeline.js --target=1000 --mode=hybrid
```

---

### schedule-lead-pipeline.js

**Purpose**: Automated scheduling for lead generation

**Features**:
- Cron job mode (run once)
- Daemon mode (persistent process)
- State tracking between runs
- Weekly target management
- Duplicate prevention

**Configuration**:
```javascript
schedule: {
  hour: 2,              // 2 AM daily
  dailyTarget: 100,     // 100 new leads per day
  weeklyTarget: 500,    // 500 total leads per week
}
```

**State File**: `.lead-pipeline-state.json`
```json
{
  "lastRun": "2026-02-06T02:00:00.000Z",
  "totalLeadsGenerated": 1500,
  "totalRuns": 15,
  "weeklyLeads": 300
}
```

**Modes**:
- `--mode=cron` - Run once (for crontab)
- `--mode=daemon` - Run continuously
- `--now` - Run immediately

**Cron Setup**:
```bash
# Daily at 2 AM
0 2 * * * cd /path/to/project && node scripts/schedule-lead-pipeline.js --mode=cron

# Weekly on Monday at 3 AM
0 3 * * 1 cd /path/to/project && node scripts/schedule-lead-pipeline.js --mode=cron
```

---

### validate-leads.js

**Purpose**: Comprehensive data validation and statistics

**Features**:
- JSON structure validation
- Data completeness checks
- Property distributions
- Financial analysis
- Contact coverage stats
- Top lead rankings

**Validation Checks**:
1. ✅ Export date present
2. ✅ Property count matches
3. ✅ Valid array structure
4. ✅ Required fields present
5. ✅ Data type consistency
6. ✅ Coordinate validity
7. ✅ Financial calculations
8. ✅ Lead score ranges
9. ✅ Tier assignments
10. ✅ Complete addresses

**Statistics Generated**:
- Property type distribution
- City/county breakdown
- Priority levels
- Quality tiers
- Lead score analysis
- Building size stats
- Solar system capacity
- Financial potential
- Contact coverage
- Ownership analysis
- Market demand
- Top 20 leads

**Usage**:
```bash
node scripts/validate-leads.js commercial-leads-2026-02-06.json
```

## 📈 Data Flow

```
Google Places API ──┐
                    ├──> Scraper ──┐
                    │              │
Mock Generator ─────┘              ├──> Enrichment ──> Scoring ──> Export ──> Firestore
                                   │
Estimation Algorithms ─────────────┘
```

## 🎯 Use Cases

### Daily Automated Generation
```bash
# Add to crontab
0 2 * * * cd /path/to/project && node scripts/schedule-lead-pipeline.js --mode=cron >> logs/leads.log 2>&1
```

### Quick Test Run
```bash
npm run leads:quick
```

### Production Data Collection
```bash
# Full scrape with Firestore import
node scripts/automated-lead-pipeline.js --mode=scrape --target=1000
```

### Data Quality Check
```bash
node scripts/validate-leads.js commercial-leads-2026-02-06.json
```

### Generate for Specific Region
Edit `NEVADA_LOCATIONS` in `commercialLeadScraper.js`, then:
```bash
node scripts/automated-lead-pipeline.js --mode=generate
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Rate Limiting
Edit in `automated-lead-pipeline.js`:
```javascript
delayBetweenRequests: 300 // ms between API calls
```

### Property Types
Edit in `commercialLeadScraper.js`:
```javascript
PROPERTY_TYPES.data_center = {
  keyword: "data center",
  avgSqFt: 100000,
  energyIntensity: 50,
  roofCoverage: 0.9,
  priority: "high"
}
```

### Locations
Edit in `commercialLeadScraper.js`:
```javascript
NEVADA_LOCATIONS.push({
  name: "Boulder City",
  center: { lat: 35.9786, lng: -114.8322 }
})
```

## 📊 Output Format

### JSON Export Structure
```json
{
  "exportDate": "2026-02-06T...",
  "totalProperties": 500,
  "statistics": {
    "scraped": 0,
    "generated": 500,
    "enriched": 500,
    "totalSavingsPotential": 17052420
  },
  "properties": [
    {
      "propertyName": "...",
      "placeId": "...",
      "propertyType": "...",
      "address": { ... },
      "contact": { ... },
      "metrics": { ... },
      "energyProfile": { ... },
      "solarSystem": { ... },
      "ownership": { ... },
      "marketAnalysis": { ... },
      "leadScore": 80,
      "tier": "Gold"
    }
  ]
}
```

## 🏆 Lead Scoring

**Criteria** (0-100 points):
- System Size (30): > 100kW = 30pts
- ROI (30): < 5 years = 30pts
- Savings (25): > $50k/yr = 25pts
- Status (10): Operational = 10pts
- Contact (5): Phone/website = 5pts

**Tiers**:
- Platinum (85-100): Highest priority
- Gold (75-84): High priority
- Silver (60-74): Medium priority
- Bronze (45-59): Lower priority
- Standard (0-44): Lowest priority

## 🚨 Error Handling

### Common Issues

**API Rate Limits**
```bash
# Solution: Increase delay or use generate mode
node scripts/automated-lead-pipeline.js --mode=generate
```

**Firestore Permission Errors**
```bash
# Solution: Skip Firestore
node scripts/automated-lead-pipeline.js --skip-firestore
```

**Memory Issues**
```bash
# Solution: Reduce target
node scripts/automated-lead-pipeline.js --target=250
```

**Invalid JSON Export**
```bash
# Solution: Validate with
node scripts/validate-leads.js <filename>
```

## 📊 Performance

### Generation Mode (--mode=generate)
- **500 leads**: < 1 second
- **1000 leads**: < 2 seconds
- **Memory**: ~200 MB
- **API calls**: 0

### Scrape Mode (--mode=scrape)
- **500 leads**: 10-30 minutes
- **API calls**: ~350 (Places + Details)
- **Rate limit**: 300ms between requests
- **Memory**: ~300 MB

### Hybrid Mode (--mode=hybrid)
- **500 leads**: 5-15 minutes
- **API calls**: ~175
- **Fallback**: Generates remainder
- **Memory**: ~250 MB

## 📚 Related Documentation

- **Full Guide**: `../LEAD_PIPELINE_GUIDE.md`
- **Quick Start**: `../QUICK_START.md`
- **Summary**: `../PIPELINE_SUMMARY.md`
- **Admin Guide**: `../ADMIN_QUICK_REFERENCE.md`

## 🎓 Best Practices

1. **Test First**: Use `--mode=generate --skip-firestore` for testing
2. **Validate Data**: Always run `validate-leads.js` on exports
3. **Backup Exports**: Archive JSON files before imports
4. **Schedule Wisely**: Run during off-peak hours (2-4 AM)
5. **Monitor State**: Check `.lead-pipeline-state.json` regularly
6. **Review Leads**: Manually verify top tier leads
7. **Update Quarterly**: Refresh ownership and contact data

## 🆘 Support

For issues:
1. Check script output for error messages
2. Run validation script on exports
3. Verify `.env` configuration
4. Check Firestore permissions
5. Review logs in `logs/` directory

## ✅ Testing

```bash
# Quick test (no DB)
npm run leads:quick

# Validate test output
node scripts/validate-leads.js commercial-leads-2026-02-06.json

# Full test with DB (dry run)
node scripts/automated-lead-pipeline.js --target=10
```

---

**Ready to generate leads?**

```bash
npm run leads:generate
```

🚀 **Go build that pipeline!**
