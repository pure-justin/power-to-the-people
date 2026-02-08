# Solar Installer Database - Quick Start Guide

Get up and running with the installer database in 5 minutes.

## 🚀 Quick Start

### 1. Run the Test (Verify Setup)

```bash
node scripts/test-installer-pipeline.js
```

**Expected output:**
```
✅ Generated 54 NABCEP installers
✅ Estimated size: medium, 30 employees
✅ Annual installs: 1350, Cumulative: 6750
✅ Generated ID: bright-sun-solar-energy-tx-austin
✅ All tests passed!
```

### 2. Scrape Installer Data

```bash
# Quick run (50 installers for testing)
npm run installers:scrape -- --target=50

# Full run (500 installers)
npm run installers:scrape

# Large run (1000 installers)
npm run installers:scrape:1000
```

**Output files:**
- `data/installers/installers-YYYY-MM-DD.json`
- `data/installers/installers-YYYY-MM-DD.csv`

### 3. Import to Firestore

```bash
npm run installers:import
```

**Creates:** `installers` collection in Firestore

### 4. Query the Data

```javascript
import { searchInstallers } from './src/services/installerApi';

// Get Texas installers
const { installers } = await searchInstallers({
  state: 'TX',
  maxResults: 20,
});

console.log(installers);
```

## 📊 Sample Queries

### Top Rated Installers
```javascript
import { getTopInstallers } from './src/services/installerApi';

const { installers } = await getTopInstallers('CA', 10);
```

### NABCEP Certified
```javascript
import { getNABCEPInstallers } from './src/services/installerApi';

const { installers } = await getNABCEPInstallers('TX', 50);
```

### By Company Size
```javascript
import { getInstallersBySize } from './src/services/installerApi';

// Get large installers
const { installers } = await getInstallersBySize('FL', 'large', 20);
```

### Search by Keywords
```javascript
import { searchInstallersByKeywords } from './src/services/installerApi';

const { installers } = await searchInstallersByKeywords(
  'residential solar',
  'TX'
);
```

### Get Statistics
```javascript
import { getInstallerStats } from './src/services/installerApi';

const { stats } = await getInstallerStats('TX');
// { total: 150, bySize: {...}, avgRating: 4.2, certified: 45 }
```

## 🎯 Use Cases

### Sales Outreach
```javascript
// Get installers with emails in Texas
const { installers } = await searchInstallers({
  state: 'TX',
  maxResults: 500,
});

const withEmails = installers.filter(i => i.email);
console.log(`Found ${withEmails.length} installers with emails`);

// Export to CSV for mail merge
// CSV already generated: data/installers/installers-YYYY-MM-DD.csv
```

### Partner Recruitment
```javascript
// Target high-volume installers
const { installers } = await getInstallersBySize('CA', 'large', 100);

// Filter by annual install volume
const highVolume = installers.filter(i => i.annualInstalls > 500);
```

### Market Analysis
```javascript
// Get coverage across multiple states
const states = ['TX', 'CA', 'FL', 'AZ', 'NV'];
const coverage = await Promise.all(
  states.map(state => getInstallerStats(state))
);

coverage.forEach(({ state, stats }) => {
  console.log(`${state}: ${stats.total} installers, avg rating: ${stats.avgRating}`);
});
```

## 📁 Data Schema

Each installer has:

```javascript
{
  id: 'bright-sun-solar-tx-austin',
  name: 'Bright Sun Solar',
  city: 'Austin',
  state: 'TX',
  address: '123 Main St, Austin, TX 78701',

  // Contact
  phone: '(512) 555-1234',
  email: 'info@brightsunsolar.com',
  website: 'https://brightsunsolar.com',

  // Reputation
  rating: 4.8,
  reviewCount: 250,
  googlePlaceId: 'ChIJ...',

  // Business
  certifications: ['NABCEP PV Installation Professional'],
  licenses: ['TX-TECL-12345'],
  serviceAreas: ['TX', 'OK'],
  companySize: 'medium',
  employeeEstimate: 30,

  // Volume
  annualInstalls: 450,
  cumulativeInstalls: 2250,

  // Social
  socialMedia: {
    facebook: 'https://facebook.com/brightsunsolar',
    linkedin: 'https://linkedin.com/company/bright-sun-solar'
  },

  // Metadata
  sources: ['nabcep', 'googleplaces', 'energysage'],
  searchKeywords: ['bright', 'sun', 'solar', 'austin', 'tx'],
  active: true,
  verified: false,
  featured: false,
}
```

## ⚙️ Configuration

### Enable/Disable Data Sources

Edit `scripts/installer-data-pipeline.js`:

```javascript
const DATA_SOURCES = {
  nabcep: { enabled: true },
  energySage: { enabled: true },
  solarReviews: { enabled: true },
  googlePlaces: { enabled: true },
};
```

### Add More States

Edit `scripts/installer-data-pipeline.js`:

```javascript
const TARGET_STATES = [
  { name: 'Texas', abbr: 'TX', priority: 1 },
  { name: 'Ohio', abbr: 'OH', priority: 2 }, // Add new states
  // ...
];
```

### Add More Cities

```javascript
const TARGET_CITIES = {
  TX: ['Houston', 'Dallas', 'Austin', 'San Antonio'],
  OH: ['Columbus', 'Cleveland', 'Cincinnati'], // Add new cities
  // ...
};
```

## 🔥 Firestore Setup

### Security Rules

Add to `firestore.rules`:

```
// Installers collection (read-only for authenticated users)
match /installers/{installerId} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.admin == true;
}
```

### Indexes

Create in Firebase Console:

1. `state` (ASC), `rating` (DESC)
2. `state` (ASC), `reviewCount` (DESC)
3. `state` (ASC), `companySize` (ASC), `rating` (DESC)
4. `certifications` (ARRAY_CONTAINS), `state` (ASC)
5. `active` (ASC), `rating` (DESC)

**URL:** https://console.firebase.google.com/project/power-to-the-people-vpp/firestore/indexes

## 📈 Performance Tips

### Rate Limiting
The scraper includes built-in delays:
- EnergySage: 1s between requests
- Solar Reviews: 1.5s between requests
- Google Places: 2s between cities

### Google Places Quota
- Free tier: 2500 requests/day
- Each city search = 1 request
- Each place detail = 1 request
- ~50-100 installers per state

### Scraping Speed
- 50 installers: ~2-3 minutes
- 500 installers: ~10-15 minutes
- 1000 installers: ~20-30 minutes

## 🐛 Troubleshooting

### Google Places API Error
```
Error: REQUEST_DENIED
```

**Fix:**
1. Check `.env` has `VITE_GOOGLE_MAPS_API_KEY`
2. Enable Places API in Google Cloud Console
3. Check API key restrictions

### Import Error
```
Error: Firebase not initialized
```

**Fix:**
1. Check `firebase-service-account.json` exists
2. Verify project ID: `power-to-the-people-vpp`

### No Data Scraped
```
Found 0 installers
```

**Fix:**
1. Check internet connection
2. Verify target URLs are accessible
3. Check for rate limiting (wait 1 hour)

## 📚 Full Documentation

See [INSTALLER_DATABASE_README.md](./INSTALLER_DATABASE_README.md) for complete documentation.

## 🎯 Next Steps

1. ✅ Run test script
2. ✅ Scrape 50 installers (test)
3. ✅ Import to Firestore
4. ✅ Query the data
5. 📊 Build sales dashboard
6. 📧 Export for email campaigns
7. 🤝 Set up partner outreach

## 💡 Pro Tips

- Start with small scrapes (50-100) to test
- Use CSV export for spreadsheet analysis
- Check Google Places quota before large runs
- Enrich data with manual research for top prospects
- Use `verified: true` flag for confirmed partners

## 📞 Support

Questions? Check the full docs or contact justin@agntc.tech
