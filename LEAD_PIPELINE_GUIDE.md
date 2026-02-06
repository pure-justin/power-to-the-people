# 🚀 Automated Commercial Lead Generation Pipeline

Complete automated system for generating 500+ commercial solar leads in Nevada with roof size, ownership data, and energy consumption estimates.

## 📋 Overview

This pipeline automatically:
- ✅ Scrapes 500+ commercial properties from Google Places API
- ✅ Generates realistic fallback data when API limits are hit
- ✅ Estimates roof size using property type heuristics
- ✅ Calculates energy consumption based on building type and size
- ✅ Estimates ownership information (corporate, private, REIT, government)
- ✅ Scores leads based on solar potential and ROI
- ✅ Enriches with market analysis and competitive insights
- ✅ Imports to Firestore with automatic deduplication
- ✅ Generates comprehensive reports

## 🎯 Property Types Covered

1. **Warehouses** - High priority, excellent solar ROI
2. **Retail Centers** - High priority, large roof space
3. **Office Buildings** - Medium priority, steady energy use
4. **Industrial Parks** - High priority, massive potential
5. **Distribution Centers** - High priority, huge roofs
6. **Self Storage** - Medium priority, low energy use

## 🗺️ Nevada Locations

- Las Vegas (7 zones)
- Henderson (3 zones)
- North Las Vegas (2 zones)
- Reno (3 zones)
- Sparks (2 zones)
- Carson City (2 zones)
- Elko (2 zones)

## 🚀 Quick Start

### Run Pipeline Immediately

```bash
# Generate 500 leads (hybrid mode: scrape + generate)
node scripts/automated-lead-pipeline.js

# Generate 1000 leads
node scripts/automated-lead-pipeline.js --target=1000

# Only scrape (no generation)
node scripts/automated-lead-pipeline.js --mode=scrape

# Only generate (no API calls)
node scripts/automated-lead-pipeline.js --mode=generate

# Skip Firestore import (export only)
node scripts/automated-lead-pipeline.js --skip-firestore
```

### Schedule Automated Runs

```bash
# Run immediately
node scripts/schedule-lead-pipeline.js --now

# Run as cron job (add to crontab)
0 2 * * * cd /path/to/project && node scripts/schedule-lead-pipeline.js --mode=cron

# Run as daemon (stays running)
node scripts/schedule-lead-pipeline.js --mode=daemon
```

## 📊 Pipeline Phases

### Phase 1: Data Collection
- Searches Google Places API for commercial properties
- Falls back to realistic data generation if needed
- Respects API rate limits with delays
- Deduplicates using place IDs

### Phase 2: Data Enrichment
- Estimates ownership type (corporate, private, REIT, government)
- Adds market analysis (demand, competition, incentives)
- Calculates competitive insights
- Enriches contact information

### Phase 3: Quality Scoring
- Scores leads 0-100 based on:
  - System size potential (0-30 points)
  - ROI/payback period (0-30 points)
  - Annual savings (0-25 points)
  - Business status (0-10 points)
  - Contact availability (0-5 points)
- Assigns quality tiers (Platinum, Gold, Silver, Bronze, Standard)
- Ranks all properties

### Phase 4: Export & Backup
- Exports to JSON: `commercial-leads-YYYY-MM-DD.json`
- Includes full property data and statistics
- Creates timestamped backups

### Phase 5: Firestore Import
- Imports to `leads` collection
- Automatic deduplication by place ID
- Batch processing (100 per batch)
- Error handling and retry logic

### Phase 6: Final Report
- Property type distribution
- City distribution
- Financial potential summary
- Top 10 highest value leads
- Database statistics

## 📈 Data Structure

Each lead includes:

```javascript
{
  propertyName: "Las Vegas Distribution Center",
  placeId: "ChIJ...",
  propertyType: "warehouse",
  priority: "high",

  address: {
    street: "1234 Commerce Blvd",
    city: "Las Vegas",
    state: "NV",
    postalCode: "89101",
    county: "Clark",
    latitude: 36.1699,
    longitude: -115.1398,
    formattedAddress: "..."
  },

  contact: {
    phone: "(702) 555-0123",
    website: "https://example.com"
  },

  metrics: {
    buildingSqFt: 50000,
    roofSqFt: 42500,
    estimationMethod: "heuristic"
  },

  energyProfile: {
    annualKwh: 275000,
    monthlyKwh: 22917,
    monthlyBill: 2750,
    annualBill: 33000,
    energyRate: 0.12,
    estimationMethod: "industry_average"
  },

  solarSystem: {
    recommendedPanels: 550,
    systemSizeKw: 220,
    annualProductionKwh: 275000,
    offsetPercentage: 100,
    systemCost: 550000,
    federalTaxCredit: 220000,
    netCost: 330000,
    annualSavings: 33000,
    monthlySavings: 2750,
    paybackYears: 10,
    maxPanelCapacity: 2428
  },

  ownership: {
    type: "Corporate",
    estimated: true,
    dataSource: "heuristic",
    verificationNeeded: true
  },

  marketAnalysis: {
    demand: "high",
    competition: "medium",
    incentives: "high"
  },

  competitiveInsights: {
    existingSolarInstallations: 2,
    nearbyProperties: 15,
    marketPenetration: 0.13
  },

  leadScore: 85,
  tier: "Platinum",
  rank: 1,
  businessStatus: "OPERATIONAL",
  rating: 4.5,
  reviewCount: 123,
  scrapedAt: "2026-02-06T..."
}
```

## 🎯 Lead Scoring System

### Score Breakdown (0-100 points)

**System Size (30 points)**
- \> 100 kW: 30 points
- 50-100 kW: 25 points
- 25-50 kW: 20 points
- < 25 kW: 10 points

**ROI/Payback (30 points)**
- < 5 years: 30 points
- 5-7 years: 25 points
- 7-10 years: 20 points
- \> 10 years: 10 points

**Annual Savings (25 points)**
- \> $50k: 25 points
- $25k-$50k: 20 points
- $10k-$25k: 15 points
- < $10k: 10 points

**Business Status (10 points)**
- Operational: 10 points
- Other: 5 points

**Contact Info (5 points)**
- Has phone or website: 5 points
- No contact: 0 points

### Quality Tiers
- **Platinum** (85-100): Highest priority, excellent ROI
- **Gold** (75-84): High priority, strong ROI
- **Silver** (60-74): Medium priority, good ROI
- **Bronze** (45-59): Lower priority, fair ROI
- **Standard** (0-44): Lowest priority, marginal ROI

## 🔄 Automated Scheduling

### Cron Setup (Recommended)

Add to crontab:
```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/power-to-the-people && node scripts/schedule-lead-pipeline.js --mode=cron >> logs/pipeline.log 2>&1

# Run weekly on Monday at 3 AM
0 3 * * 1 cd /path/to/power-to-the-people && node scripts/schedule-lead-pipeline.js --mode=cron --target=500 >> logs/pipeline.log 2>&1
```

### Schedule Configuration

Edit in `schedule-lead-pipeline.js`:
```javascript
schedule: {
  hour: 2,              // 2 AM daily
  dailyTarget: 100,     // 100 new leads per day
  weeklyTarget: 500,    // 500 total leads per week
}
```

### State Tracking

The scheduler maintains state in `.lead-pipeline-state.json`:
```json
{
  "lastRun": "2026-02-06T02:00:00.000Z",
  "totalLeadsGenerated": 1500,
  "totalRuns": 15,
  "lastWeekReset": "2026-02-03T00:00:00.000Z",
  "weeklyLeads": 300
}
```

## 📊 Output Files

### JSON Export
`commercial-leads-2026-02-06.json`
```json
{
  "exportDate": "2026-02-06T...",
  "totalProperties": 500,
  "statistics": { ... },
  "properties": [ ... ]
}
```

### Pipeline State
`.lead-pipeline-state.json` - Tracks scheduler history

## 🔧 Configuration

### API Keys Required
- `VITE_GOOGLE_MAPS_API_KEY` - Google Places API (scraping mode)

Add to `.env`:
```bash
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Rate Limiting
- Default: 300ms between requests
- Adjustable in `automated-lead-pipeline.js`:
  ```javascript
  delayBetweenRequests: 300 // ms
  ```

### Retry Logic
- Max retries: 3
- Exponential backoff: 1s, 2s, 3s
- Configurable in pipeline script

## 📈 Expected Results

### Typical Run (500 properties)
- **Time**: 10-30 minutes (depending on mode)
- **API Calls**: ~350 (scrape mode)
- **Generated**: 150-500 (hybrid mode)
- **Duplicates**: ~5-10%
- **Success Rate**: ~95%

### Financial Potential (500 properties)
- **Total System Cost**: ~$300M
- **Federal Tax Credits**: ~$120M
- **Total Annual Savings**: ~$15M
- **Average per Property**: ~$30k/year

## 🚨 Error Handling

### Common Issues

**API Rate Limits**
- Solution: Increase `delayBetweenRequests`
- Switch to `--mode=generate`

**Firestore Permission Errors**
- Solution: Check Firebase credentials
- Use `--skip-firestore` flag

**Memory Issues**
- Solution: Reduce `--target` size
- Process in smaller batches

## 📝 Advanced Usage

### Custom Property Types
Edit `commercialLeadScraper.js`:
```javascript
PROPERTY_TYPES.data_center = {
  keyword: "data center",
  avgSqFt: 100000,
  energyIntensity: 50,
  roofCoverage: 0.9,
  priority: "high"
}
```

### Custom Locations
Add to `NEVADA_LOCATIONS` array:
```javascript
{
  name: "Boulder City",
  center: { lat: 35.9786, lng: -114.8322 }
}
```

### Filter on Import
```javascript
import { importFilteredProperties } from "./commercialLeadImporter.js";

await importFilteredProperties(properties, {
  minLeadScore: 70,
  priorities: ["high"],
  propertyTypes: ["warehouse", "distribution_center"],
  cities: ["Las Vegas", "Henderson"]
});
```

## 🔍 Monitoring

### Check Pipeline Status
```bash
# View scheduler state
cat .lead-pipeline-state.json

# Check last export
ls -lh commercial-leads-*.json

# Count Firestore leads
# (Use Firebase console or admin SDK)
```

### Logs
```bash
# Create logs directory
mkdir -p logs

# Run with logging
node scripts/automated-lead-pipeline.js > logs/pipeline-$(date +%Y%m%d).log 2>&1
```

## 🎓 Best Practices

1. **Start Small**: Test with `--target=50` first
2. **Use Hybrid Mode**: Best balance of real data + coverage
3. **Schedule Off-Peak**: Run at 2-4 AM to avoid rate limits
4. **Monitor State**: Check `.lead-pipeline-state.json` regularly
5. **Backup Exports**: Archive JSON files before imports
6. **Review Top Leads**: Manually verify Platinum/Gold tier leads
7. **Update Enrichment**: Refresh ownership data quarterly

## 📞 Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review Firebase console for import errors
3. Verify API keys in `.env`
4. Check network connectivity for API calls

## 🚀 Next Steps

After generating leads:
1. Review top 50 in admin dashboard
2. Verify contact information
3. Research ownership details
4. Prioritize by tier
5. Begin outreach campaign
6. Track conversion rates

---

**Ready to generate leads?**

```bash
node scripts/automated-lead-pipeline.js
```

🎯 **Go get 'em!**
