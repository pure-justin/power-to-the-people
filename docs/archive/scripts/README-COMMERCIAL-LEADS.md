# Commercial Lead Generation System

## Quick Start

### Generate 500 Properties (Default)
```bash
node scripts/generate-commercial-leads.js --limit=500 --min-score=40 --export
```

### Generate Custom Amount
```bash
# Generate 100 properties
node scripts/generate-commercial-leads.js --limit=100 --export

# Generate 1000 properties
node scripts/generate-commercial-leads.js --limit=1000 --export
```

### Dry Run (No Database Import)
```bash
node scripts/generate-commercial-leads.js --limit=500 --dry-run --export
```

### Verify Database Contents
```bash
node scripts/verify-leads.js
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--limit=N` | Total number of properties to generate | 500 |
| `--min-score=N` | Minimum lead score for import | 40 |
| `--export` | Export to JSON file | false |
| `--dry-run` | Skip Firestore import | false |

## Output Files

### JSON Export
**Filename:** `commercial-leads-YYYY-MM-DD.json`
**Location:** Project root directory
**Format:** Firestore-ready JSON with full property data

Example:
```json
{
  "exportDate": "2026-02-06T18:25:22.034Z",
  "totalProperties": 500,
  "properties": [
    {
      "id": "COMM-MLB87U2Q-LW1PLL",
      "leadType": "commercial",
      "propertyName": "Las Vegas Plaza",
      "propertyType": "shopping center",
      "leadScore": 80,
      "systemDesign": {
        "systemSizeKw": 416.8,
        "annualSavings": 62520
      }
      // ... full property data
    }
  ]
}
```

## Property Types

1. **Warehouse** - Large storage facilities with minimal HVAC
2. **Shopping Center** - Retail complexes with high energy use
3. **Office Building** - Commercial office spaces
4. **Industrial Park** - Manufacturing and tech facilities
5. **Distribution Center** - Fulfillment and logistics hubs
6. **Self Storage** - Storage unit facilities with low energy use

## Nevada Locations

- Las Vegas (6 zones)
- Henderson (3 zones)
- North Las Vegas (2 zones)
- Reno (3 zones)
- Sparks (2 zones)
- Carson City (2 zones)
- Elko (2 zones)

## Data Quality Metrics

Each generated property includes:

✅ Unique business name (realistic patterns)
✅ Complete Nevada address with real postal codes
✅ GPS coordinates (zone-distributed)
✅ Phone number (80% coverage, NV area codes)
✅ Website URL (40% coverage)
✅ Building size (15k-50k sqft by type)
✅ Roof square footage (65-95% coverage)
✅ Energy consumption estimate
✅ Current electric bill estimate
✅ Solar system design (panels, kW, cost)
✅ ROI analysis (savings, payback period)
✅ Lead score (0-100, multi-factor)
✅ Quality tier (A/B/C/D)

## Lead Scoring Algorithm

**Total: 100 points**

### System Size (30 points)
- 100+ kW: 30 points
- 50-100 kW: 25 points
- 25-50 kW: 20 points
- <25 kW: 10 points

### ROI/Payback (30 points)
- <5 years: 30 points
- 5-7 years: 25 points
- 7-10 years: 20 points
- 10+ years: 10 points

### Annual Savings (25 points)
- >$50k/yr: 25 points
- $25k-$50k/yr: 20 points
- $10k-$25k/yr: 15 points
- <$10k/yr: 10 points

### Business Status (10 points)
- Operational: 10 points
- Other: 5 points

### Contact Info (5 points)
- Has phone or website: 5 points
- No contact: 0 points

## Pipeline Architecture

```
┌─────────────────────────────────────────┐
│  Commercial Lead Generator              │
│  (commercialLeadGenerator.js)           │
│                                         │
│  • Generate property names              │
│  • Create addresses & coordinates       │
│  • Calculate energy profiles            │
│  • Design solar systems                 │
│  • Score leads                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Export to JSON                         │
│  (commercial-leads-YYYY-MM-DD.json)     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Commercial Lead Importer               │
│  (commercialLeadImporter.js)            │
│                                         │
│  • Convert to Firestore format          │
│  • Check for duplicates                 │
│  • Batch import (100 at a time)         │
│  • Generate statistics                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Firestore Database                     │
│  Collection: leads                      │
│  Document Type: commercial              │
└─────────────────────────────────────────┘
```

## Firestore Integration

### Database: `agentic-labs`
### Collection: `leads`
### Document ID Format: `COMM-{TIMESTAMP}-{RANDOM}`

Example: `COMM-MLB87U2Q-LW1PLL`

### Query Examples

**Get all commercial leads:**
```javascript
const leadsRef = collection(db, 'leads');
const q = query(leadsRef, where('leadType', '==', 'commercial'));
const snapshot = await getDocs(q);
```

**Get high-priority leads:**
```javascript
const q = query(
  leadsRef,
  where('leadType', '==', 'commercial'),
  where('priority', '==', 'high'),
  where('leadScore', '>=', 70)
);
```

**Get by property type:**
```javascript
const q = query(
  leadsRef,
  where('propertyType', '==', 'shopping center')
);
```

## Troubleshooting

### Permission Denied Errors
If you see `permission-denied` errors when importing:

1. Check Firebase auth status:
```javascript
// The system auto-signs in anonymously
// Wait for auth to complete before querying
```

2. Verify Firestore rules allow writes to `leads` collection

3. Use `--dry-run` to test without database access

### No Properties Generated
Check command line arguments:
```bash
# Correct
node scripts/generate-commercial-leads.js --limit=500

# Incorrect (missing =)
node scripts/generate-commercial-leads.js --limit 500
```

### Import Stalled
The import runs synchronously and can take 30-60 seconds for 500 properties.
Use JSON export as backup:
```bash
node scripts/generate-commercial-leads.js --limit=500 --export --dry-run
```

## Customization

### Add New Property Types

Edit `src/services/commercialLeadGenerator.js`:

```javascript
const PROPERTY_TYPES = {
  your_new_type: {
    keyword: "your type",
    avgSqFt: 20000,
    energyIntensity: 12,  // kWh/sqft/year
    roofCoverage: 0.75,   // 75% usable
    priority: "high",
    namePatterns: [
      "{city} Your Type Center",
      // ... more patterns
    ]
  }
};
```

### Add New Cities

```javascript
const NEVADA_LOCATIONS = [
  {
    name: "Your City",
    center: { lat: 36.1699, lng: -115.1398 },
    zones: [
      { name: "Downtown", offset: { lat: 0, lng: 0 } },
      { name: "North", offset: { lat: 0.05, lng: 0 } },
    ]
  }
];
```

### Adjust Lead Scoring

Modify the `calculateLeadScore()` function to change point allocations.

## Best Practices

1. **Always use --export** for backup
2. **Start with --dry-run** to preview data
3. **Use --limit=100** for testing
4. **Review JSON before importing** large batches
5. **Keep exported files** for audit trail
6. **Monitor Firestore quota** when importing

## Support

- Generator Service: `src/services/commercialLeadGenerator.js`
- Importer Service: `src/services/commercialLeadImporter.js`
- Pipeline Script: `scripts/generate-commercial-leads.js`
- Verification: `scripts/verify-leads.js`

## License

Part of Power to the People solar enrollment platform.
