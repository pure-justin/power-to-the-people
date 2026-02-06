# Solar Installer Database Pipeline

Automated data pipeline to scrape, enrich, and import 500+ solar installers into Firestore for sales outreach.

## Overview

This system collects comprehensive installer data from multiple sources:
- ✅ **NABCEP** - Certified installer directory
- ✅ **EnergySage** - Solar marketplace listings
- ✅ **Solar Reviews** - Customer review platform
- ✅ **Google Places API** - Business listings with reviews

## Data Fields

Each installer record includes:

### Basic Information
- `id` - Unique identifier
- `name` - Company name
- `city` - Primary city
- `state` - State abbreviation (TX, CA, etc.)
- `address` - Full street address

### Contact Information
- `phone` - Primary phone number
- `email` - Primary email (extracted from website)
- `website` - Company website URL
- `socialMedia` - Social profiles (Facebook, Twitter, LinkedIn, Instagram)

### Reputation & Reviews
- `rating` - Average rating (1-5 stars)
- `reviewCount` - Total number of reviews
- `googlePlaceId` - Google Places ID for API queries

### Business Details
- `certifications` - Array of certifications (NABCEP, etc.)
- `licenses` - State/local contractor licenses
- `serviceAreas` - Array of states/regions served
- `companySize` - Category: small/medium/large
- `employeeEstimate` - Estimated employee count

### Installation Volume
- `annualInstalls` - Estimated annual installations
- `cumulativeInstalls` - Total lifetime installations

### Data Quality
- `sources` - Array of data sources (nabcep, energysage, etc.)
- `searchKeywords` - Full-text search terms
- `verified` - Manual verification status
- `active` - Active listing status
- `featured` - Featured listing status

## Quick Start

### 1. Scrape Installer Data

```bash
# Scrape 500 installers (default)
npm run installers:scrape

# Scrape specific target count
npm run installers:scrape:500
npm run installers:scrape:1000

# Custom target
node scripts/installer-data-pipeline.js --target=750
```

**Output:**
- `data/installers/installers-YYYY-MM-DD.json` - Full JSON data
- `data/installers/installers-YYYY-MM-DD.csv` - CSV for spreadsheet import

### 2. Import to Firestore

```bash
# Import latest scrape
npm run installers:import

# Import specific file
node scripts/import-installers-to-firestore.js data/installers/installers-2026-02-06.json
```

**Creates collection:** `installers`

## Usage Examples

### Search by Location

```javascript
import { searchInstallers } from './src/services/installerApi';

// Get installers in Texas
const { installers } = await searchInstallers({
  state: 'TX',
  maxResults: 50,
  sortBy: 'rating',
});

// Get installers in specific city
const { installers } = await searchInstallers({
  state: 'CA',
  city: 'San Francisco',
  minRating: 4.0,
  maxResults: 20,
});
```

### Filter by Certifications

```javascript
import { getNABCEPInstallers } from './src/services/installerApi';

// Get NABCEP certified installers
const { installers } = await getNABCEPInstallers('TX', 50);
```

### Filter by Company Size

```javascript
import { getInstallersBySize } from './src/services/installerApi';

// Get large installers in California
const { installers } = await getInstallersBySize('CA', 'large', 30);
```

### Search by Keywords

```javascript
import { searchInstallersByKeywords } from './src/services/installerApi';

// Full-text search
const { installers } = await searchInstallersByKeywords(
  'residential solar installation',
  'TX',
  20
);
```

### Get Statistics

```javascript
import { getInstallerStats } from './src/services/installerApi';

// Get state statistics
const { stats } = await getInstallerStats('TX');
// Returns: { total, bySize, avgRating, totalReviews, certified }
```

## API Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `searchInstallers(options)` | Advanced search with filters | state, city, minRating, certifications, companySize, maxResults, sortBy |
| `getInstaller(id)` | Get single installer by ID | installerId |
| `getTopInstallers(state, count)` | Get top-rated installers | state, count (default: 10) |
| `getInstallersByServiceArea(state, city)` | Get installers serving area | state, city (optional) |
| `getNABCEPInstallers(state, count)` | Get certified installers | state, count (default: 50) |
| `getInstallersBySize(state, size, count)` | Filter by company size | state, size (small/medium/large), count |
| `getInstallerStats(state)` | Get aggregated statistics | state |
| `searchInstallersByKeywords(keywords, state, count)` | Full-text search | keywords, state (optional), count |

## Data Sources Configuration

Edit `scripts/installer-data-pipeline.js` to enable/disable sources:

```javascript
const DATA_SOURCES = {
  nabcep: {
    enabled: true,
  },
  energySage: {
    enabled: true,
  },
  solarReviews: {
    enabled: true,
  },
  googlePlaces: {
    enabled: true, // Requires VITE_GOOGLE_MAPS_API_KEY
  },
};
```

## Target States

Current priority states (edit in `installer-data-pipeline.js`):

**Priority 1 (High Volume):**
- Texas (TX)
- California (CA)
- Florida (FL)

**Priority 2 (Medium Volume):**
- Arizona (AZ)
- Nevada (NV)
- New York (NY)
- New Jersey (NJ)
- Massachusetts (MA)

**Priority 3 (Growing Markets):**
- Colorado (CO)
- North Carolina (NC)

## Firestore Indexes

After importing, create these composite indexes in Firebase Console:

```
Collection: installers
1. state (ASC), rating (DESC)
2. state (ASC), reviewCount (DESC)
3. state (ASC), companySize (ASC), rating (DESC)
4. certifications (ARRAY_CONTAINS), state (ASC)
5. active (ASC), rating (DESC)
```

**Index URL:** https://console.firebase.google.com/project/power-to-the-people-vpp/firestore/indexes

## Data Enrichment

The pipeline automatically enriches installer data with:

### Company Size Estimation
Based on:
- Review count (proxy for customer volume)
- Service area coverage
- Industry averages

Categories:
- **Small**: 1-10 employees (typical: 5-10 reviews)
- **Medium**: 11-50 employees (typical: 100+ reviews)
- **Large**: 50+ employees (typical: 500+ reviews)

### Installation Volume Estimation
Formula:
```
Annual Installs = (Employee Count × 0.6 × 75)
  - 60% of employees are installers
  - 75 systems per installer per year (industry avg)

Cumulative Installs = max(Annual × Years in Business, Review Count)
```

### Email Extraction
Attempts to extract email from:
1. Website mailto: links
2. Contact page text
3. Footer/header content

Filters out:
- example.com emails
- Service provider emails (sentry.io, google.com, etc.)

### Social Media Discovery
Searches company website for:
- Facebook/Instagram profiles
- Twitter/X accounts
- LinkedIn company pages

## Sales Outreach Use Cases

### 1. Cold Email Campaigns
Export installers with email addresses:
```javascript
const { installers } = await searchInstallers({
  state: 'TX',
  maxResults: 500,
});

const withEmails = installers.filter(i => i.email);
// Export to CSV for mail merge
```

### 2. Partner Program Recruitment
Target large installers:
```javascript
const { installers } = await getInstallersBySize('CA', 'large', 100);
// High-volume installers for strategic partnerships
```

### 3. Regional Sales Territory Planning
Get coverage stats:
```javascript
const states = ['TX', 'CA', 'FL', 'AZ'];
const coverage = await Promise.all(
  states.map(state => getInstallerStats(state))
);
// Analyze market density and opportunity
```

### 4. Lead Nurturing by Certification
Target quality-focused installers:
```javascript
const { installers } = await getNABCEPInstallers('NY', 100);
// NABCEP certified = quality-focused, good partners
```

## Rate Limiting & Ethics

The scraper includes built-in rate limiting:
- **EnergySage**: 1 second delay between requests
- **Solar Reviews**: 1.5 second delay
- **Google Places API**: 2 second delay between cities, 100ms between places

**Important Notes:**
- Respect robots.txt and terms of service
- Use public data only (no login required)
- Add delays between requests
- Don't overwhelm source servers
- Use data ethically for B2B sales only

## Troubleshooting

### Google Places API Errors

**Error: `REQUEST_DENIED`**
- Check API key in `.env`: `VITE_GOOGLE_MAPS_API_KEY`
- Enable Places API in Google Cloud Console
- Check API key restrictions

**Error: `OVER_QUERY_LIMIT`**
- Daily quota exceeded (2500 free requests/day)
- Upgrade to paid tier or wait 24 hours

### EnergySage/Solar Reviews 404s

These directories use city-specific URLs. If a city page doesn't exist:
- The scraper will log the error and continue
- This is normal - not all cities have directory pages

### Import Failures

**Error: `Firebase not initialized`**
- Check `firebase-service-account.json` exists in project root
- Verify service account has Firestore write permissions

**Error: `Permission denied`**
- Update Firestore rules to allow writes from service account
- Or run import with admin SDK (already configured)

## Performance

**Scraping Speed:**
- ~50-100 installers/minute (with rate limiting)
- Full 500 installer scrape: 10-15 minutes
- 1000 installers: 20-30 minutes

**Firestore Import:**
- Batch writes of 500 documents
- 1000 installers import: ~30 seconds

## Data Quality

**Expected Quality Metrics:**
- 90%+ have phone numbers
- 50-70% have websites
- 20-40% have email addresses
- 80%+ have ratings/reviews (from Google/SR)
- 100% have location data

**Data Deduplication:**
The pipeline automatically deduplicates by:
- Company name + State + City
- Merges data from multiple sources
- Keeps best quality contact info

## Future Enhancements

Potential improvements:
- [ ] Real NABCEP API integration (when available)
- [ ] State contractor license database scrapers
- [ ] LinkedIn company profile enrichment
- [ ] Email verification API integration
- [ ] Phone number validation
- [ ] Better Business Bureau ratings
- [ ] Automatic data refresh pipeline (weekly)
- [ ] Installer outreach tracking system

## License

For internal Power to the People use only. Scraped data should be used ethically for B2B sales outreach and partnership development.

## Support

For issues or questions:
1. Check logs in `data/installers/`
2. Review Firebase Console for import errors
3. Check API quotas (Google Places)
4. Contact: justin@agntc.tech
