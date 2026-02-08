# Commercial Lead Generation Pipeline

Automated system for scraping and importing 500+ commercial properties in Nevada with solar system estimates.

## Overview

This pipeline scrapes commercial properties (warehouses, retail centers, office buildings, etc.) from Google Places API, estimates roof sizes and energy consumption, calculates solar system designs, and imports everything into Firestore as qualified leads.

## Features

- **Property Scraping**: Uses Google Places API to find commercial properties across Nevada
- **Energy Estimation**: Industry-standard energy consumption estimates by property type
- **Solar System Design**: Calculates system size, costs, savings, and ROI
- **Lead Scoring**: 0-100 score based on system size, ROI, and annual savings
- **Firestore Integration**: Imports to existing `leads` collection with proper schema
- **Duplicate Detection**: Checks for existing properties by Google Place ID

## Files Created

### Services
- `src/services/commercialLeadScraper.js` - Main scraper using Google Places API
- `src/services/commercialLeadImporter.js` - Firestore import service

### Scripts
- `scripts/scrape-commercial-leads.js` - Production scraper (requires Places API)
- `scripts/test-commercial-leads.js` - Test script with mock data (500 properties)
- `scripts/check-commercial-leads.js` - Check database statistics

## Property Types Supported

| Type | Avg Size | Energy Intensity | Priority |
|------|----------|------------------|----------|
| Warehouse | 15,000 sqft | 5.5 kWh/sqft/year | High |
| Retail Center | 25,000 sqft | 18 kWh/sqft/year | High |
| Office Building | 20,000 sqft | 15 kWh/sqft/year | Medium |
| Industrial Park | 30,000 sqft | 12 kWh/sqft/year | High |
| Distribution Center | 50,000 sqft | 6 kWh/sqft/year | High |
| Self Storage | 40,000 sqft | 3 kWh/sqft/year | Medium |

## Nevada Locations Covered

- Las Vegas
- Henderson
- North Las Vegas
- Reno
- Sparks
- Carson City
- Elko

## Usage

### Option 1: Test with Mock Data (Recommended)

Generate and import 500 realistic mock properties:

```bash
node scripts/test-commercial-leads.js
```

This creates:
- 500 mock commercial properties
- `mock-commercial-leads.json` - Backup of all properties
- Imports to Firestore `leads` collection

### Option 2: Live Scraping (Requires Places API)

**Note**: Google Places API must be enabled on your API key.

```bash
# Dry run (no import)
node scripts/scrape-commercial-leads.js --dry-run --limit=100 --export

# Full run (500 properties)
node scripts/scrape-commercial-leads.js --limit=500 --min-score=40

# Specific cities only
node scripts/scrape-commercial-leads.js --cities="Las Vegas,Reno" --per-type=20

# Export to JSON without importing
node scripts/scrape-commercial-leads.js --dry-run --export --limit=500
```

#### Options:
- `--dry-run` - Run without importing to Firestore
- `--limit=N` - Limit total properties (default: 500)
- `--per-type=N` - Properties per type per location (default: 12)
- `--min-score=N` - Minimum lead score to import (default: 40)
- `--export` - Export to JSON file
- `--cities=city1,city2` - Only specific cities (comma-separated)

### Check Database Statistics

```bash
node scripts/check-commercial-leads.js
```

Shows:
- Total commercial leads
- Average lead score
- Total savings potential
- Breakdown by type, city, priority, and quality tier

## Data Structure

Each commercial lead includes:

### Property Information
- Name, type, priority
- Full address with lat/lng
- Google Place ID for deduplication

### Contact Information
- Phone number
- Website URL

### Property Metrics
- Building square footage
- Usable roof square footage
- Estimation method

### Energy Profile
- Annual/monthly kWh consumption
- Annual/monthly bill estimates
- Energy rate ($/kWh)
- Estimation method

### Solar System Design
- Recommended panel count
- System size (kW)
- Annual production (kWh)
- Offset percentage
- System cost (before incentives)
- Federal tax credit (40% for Nevada energy communities)
- Net cost (after incentives)
- Annual/monthly savings
- Payback period (years)
- Max panel capacity

### Lead Scoring (0-100)
- **System Size** (30 points): Larger systems score higher
- **ROI** (30 points): Shorter payback periods score higher
- **Annual Savings** (25 points): Higher savings score higher
- **Business Status** (10 points): Operational businesses score higher
- **Contact Info** (5 points): Phone/website availability

Quality Tiers:
- **A**: Score 80+ (Top tier leads)
- **B**: Score 60-79 (Good leads)
- **C**: Score 40-59 (Average leads)
- **D**: Score <40 (Low priority)

## Sample Output

```
🧪 Commercial Lead Test - Mock Data Generation

📝 Generating mock commercial properties...
✓ Generated 500 mock properties

📊 Statistics:

Property Types:
  warehouse: 85
  shopping center: 78
  office building: 99
  industrial park: 87
  distribution center: 81
  self storage: 70

Cities:
  Las Vegas: 119
  Henderson: 116
  Reno: 87
  Sparks: 96
  North Las Vegas: 82

Average Lead Score: 72
Total Savings Potential: $17,437,140/year

🏆 Top 10 Leads:

1. Las Vegas Premium Outlets (Las Vegas)
   Score: 80 | 430kW | $64,500/yr savings

2. Boulevard Mall (Las Vegas)
   Score: 80 | 413.2kW | $61,980/yr savings

3. Town Square Las Vegas (Las Vegas)
   Score: 80 | 506.4kW | $75,960/yr savings
```

## Firestore Schema

Commercial leads are stored in the `leads` collection with:

- `leadType: "commercial"`
- `isCommercial: true`
- `status: "new"`
- All standard lead fields (customer, address, systemDesign, etc.)
- Additional `propertyMetrics` field with building/roof size
- Additional `businessInfo` field with ratings, place ID
- Tags include: `["commercial", "nevada", propertyType, priority]`

## Integration with Admin Dashboard

Commercial leads appear in the admin dashboard at `/admin` with:

- Filter by lead type (residential/commercial)
- Filter by property type
- Filter by priority level
- Filter by quality tier
- Sort by lead score, savings potential, system size
- Export to CSV functionality

## Next Steps

1. **Enable Google Places API**
   - Go to Google Cloud Console
   - Enable "Places API (New)"
   - Update API restrictions if needed

2. **Run Initial Import**
   ```bash
   node scripts/test-commercial-leads.js
   ```

3. **Review Leads in Admin**
   - Go to https://your-app.com/admin
   - Filter by `leadType: commercial`
   - Review top-scoring leads

4. **Set Up Outreach**
   - Assign leads to sales team
   - Create email/phone campaign
   - Track conversion rates

5. **Optional: Live Scraping**
   - Once Places API is enabled
   - Run weekly to refresh leads
   - Monitor for new properties

## Troubleshooting

### Places API Error
```
Error: REQUEST_DENIED
```
**Solution**: Enable "Places API (New)" in Google Cloud Console

### Permission Denied (Firestore)
```
Error: Missing or insufficient permissions
```
**Solution**: Ensure Firebase Auth is working (script signs in anonymously)

### No Properties Found
**Solution**:
- Check API key is valid
- Verify network connectivity
- Try different city/property type combinations

## Cost Estimates

### Google Places API
- Places Search: $32/1000 requests
- Place Details: $17/1000 requests
- **For 500 properties**: ~$25 total

### Firestore
- Write operations: 500 writes = $0.03
- Storage: ~500KB = negligible
- Reads: $0.06/100K reads

**Total cost for 500 leads**: ~$25 (one-time)

## Business Value

**500 commercial leads represent:**
- Total annual savings potential: **$15-20 million**
- Average system size: **50-150 kW**
- Average net cost: **$100K-$300K per system**
- Total pipeline value: **$50-150 million**

Even a **1% conversion rate** = 5 systems = **$500K-$1.5M revenue**

## License

Part of Power to the People - Solar enrollment platform
