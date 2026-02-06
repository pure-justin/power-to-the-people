# Firestore Schema Documentation

## Collections Overview

```
/leads/{leadId}
/smtData/{esiid}
/projects/{projectId}
/users/{userId}
  /private/smt
/addressCache/{addressHash}
/analytics/{document}
/config/{document}
```

## Leads Collection

**Collection:** `leads`

### Schema Definition

```typescript
interface Lead {
  // === IDENTIFICATION ===
  id: string;                    // Document ID
  customerName: string;          // Full name
  email: string;                 // Email (lowercase, trimmed)
  phone: string;                 // Phone (digits only)

  // === ADDRESS ===
  address: string;               // Street address
  city: string;                  // City
  state: string;                 // State abbreviation (TX, CA, etc.)
  zip: string;                   // ZIP code
  fullAddress?: string;          // Complete formatted address

  // === STATUS & ASSIGNMENT ===
  status: LeadStatus;            // Current status
  source: LeadSource;            // How they found us
  assignedTo?: string;           // User ID of assigned sales rep
  assignedToName?: string;       // Display name of assignee

  // === AI SCORING (0-100) ===
  score: number;                 // Overall lead quality score
  scoreBreakdown?: {
    propertyQuality: number;     // Roof quality, sun exposure
    financialFit: number;        // Financial indicators
    urgency: number;             // Timeline signals
    engagement: number;          // Response rate
  };

  // === SOLAR SYSTEM DETAILS ===
  systemSize?: number;           // kW (e.g., 8.5)
  batterySize?: number;          // kWh (e.g., 13.5 for Powerwall)
  estimatedCost?: number;        // Total project cost (USD)
  estimatedSavings?: number;     // Annual savings (USD)
  monthlyPayment?: number;       // Estimated loan payment
  panelCount?: number;           // Number of panels

  // === ENERGY DATA ===
  annualKwh?: number;            // Annual usage (kWh)
  monthlyKwh?: number;           // Average monthly (kWh)
  esiid?: string;                // Smart Meter Texas ID

  // === SOLAR API CACHE ===
  solarApiData?: {
    maxArrayPanels: number;      // Max panels that fit
    maxArrayArea: number;        // m² of roof space
    maxSunshineHours: number;    // Annual sunshine hours
    carbonOffset: number;        // kg CO2/year offset
    buildingInsights?: any;      // Full API response
  };

  // === NOTES & HISTORY ===
  notes: SalesNote[];            // Array of sales team notes
  lastContactedAt?: Timestamp;   // Last outreach
  qualifiedAt?: Timestamp;       // When qualified
  closedAt?: Timestamp;          // When sold/lost

  // === METADATA ===
  createdAt: Timestamp;          // Lead created
  updatedAt: Timestamp;          // Last modified
  createdBy?: string;            // User ID who created
  ipAddress?: string;            // IP (spam prevention)
  userAgent?: string;            // Browser info

  // === MARKETING ATTRIBUTION ===
  utmSource?: string;            // UTM source
  utmMedium?: string;            // UTM medium
  utmCampaign?: string;          // UTM campaign
  referrer?: string;             // Referrer URL

  // === FLAGS ===
  isTest?: boolean;              // Test lead (exclude from reports)
  archived?: boolean;            // Soft delete
}

interface SalesNote {
  id: string;                    // Unique note ID
  text: string;                  // Note content
  author: string;                // User ID
  authorName?: string;           // Display name
  createdAt: Timestamp;          // When added
  type?: "call" | "email" | "meeting" | "note";
}
```

### Enums

```typescript
enum LeadStatus {
  SUBMITTED = "submitted",       // New lead from form
  CONTACTED = "contacted",       // Sales team reached out
  QUALIFIED = "qualified",       // Passed qualification
  SOLD = "sold",                 // Deal closed
  LOST = "lost",                 // Did not convert
}

enum LeadSource {
  WEBSITE = "website",           // Organic form submission
  REFERRAL = "referral",         // Customer referral
  AD = "ad",                     // Paid advertising
  API = "api",                   // External API
  PARTNER = "partner",           // Partner network
  EVENT = "event",               // Trade show, etc.
}
```

### Example Document

```javascript
{
  id: "abc123",
  customerName: "Jane Smith",
  email: "jane@example.com",
  phone: "5125551234",
  address: "456 Solar Ave",
  city: "Austin",
  state: "TX",
  zip: "78701",
  fullAddress: "456 Solar Ave, Austin, TX 78701",

  status: "contacted",
  source: "website",
  assignedTo: "user_xyz",
  assignedToName: "Bob Sales",

  score: 85,
  scoreBreakdown: {
    propertyQuality: 90,
    financialFit: 80,
    urgency: 75,
    engagement: 95
  },

  systemSize: 8.5,
  batterySize: 13.5,
  estimatedCost: 28500,
  estimatedSavings: 2400,
  monthlyPayment: 185,
  panelCount: 22,

  annualKwh: 14200,
  monthlyKwh: 1183,

  solarApiData: {
    maxArrayPanels: 32,
    maxArrayArea: 58.5,
    maxSunshineHours: 1847,
    carbonOffset: 8500
  },

  notes: [
    {
      id: "note1",
      text: "Called customer, very interested. Scheduling site visit.",
      author: "user_xyz",
      authorName: "Bob Sales",
      createdAt: Timestamp,
      type: "call"
    }
  ],

  lastContactedAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,

  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: "solar-2024-q1",

  isTest: false,
  archived: false
}
```

## Indexes

The following Firestore indexes are configured:

### Lead Queries

```javascript
// Get leads by status
leads
  .where("status", "==", "submitted")
  .orderBy("createdAt", "desc")

// Get high-value leads
leads
  .where("score", ">=", 75)
  .where("status", "==", "submitted")
  .orderBy("score", "desc")

// Get assigned leads
leads
  .where("assignedTo", "==", userId)
  .where("status", "in", ["contacted", "qualified"])
  .orderBy("updatedAt", "desc")

// Get leads by source
leads
  .where("source", "==", "referral")
  .orderBy("createdAt", "desc")

// Get archived status
leads
  .where("archived", "!=", true)
  .where("status", "==", "submitted")
  .orderBy("archived")
  .orderBy("score", "desc")
```

## Security Rules

### Lead Rules

```javascript
// Anyone can create (public form)
allow create: if true;

// Users can read their own leads
allow read: if isSignedIn() && (
  resource.data.createdBy == request.auth.uid ||
  resource.data.email == request.auth.token.email
);

// Sales reps can read all leads
allow read: if isAdminOrInstaller();

// Admins can write all leads
allow write: if isAdmin();

// Assigned reps can update their leads
allow update: if isSignedIn() &&
  resource.data.assignedTo == request.auth.uid &&
  request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(['status', 'notes', 'updatedAt', 'lastContactedAt',
              'qualifiedAt', 'closedAt', 'score', 'scoreBreakdown']);
```

## Lead Scoring Algorithm

Scores are calculated automatically on creation and when relevant fields update.

### Base Score: 50 points

### Property Quality (+25 max)
- ✅ **+10** if `maxArrayPanels > 20`
- ✅ **+10** if `maxSunshineHours > 1500`
- ✅ **+5** if `systemSize > 7` kW

### Energy Usage (+15 max)
- ✅ **+10** if `annualKwh > 12000`
- ✅ **+5** if `annualKwh > 15000`

### Contact Info (+10 max)
- ✅ **+5** if valid phone (10+ digits)
- ✅ **+5** if valid email (contains @)

### Score Ranges
- **75-100**: High-value lead (hot)
- **50-74**: Medium-value lead (warm)
- **0-49**: Low-value lead (cold)

## Usage Examples

### Creating a Lead

```javascript
import { createLead } from './services/leadService';

const result = await createLead({
  customerName: "John Doe",
  email: "john@example.com",
  phone: "5125551234",
  address: "123 Main St",
  city: "Austin",
  state: "TX",
  zip: "78701",
  source: "website",
  systemSize: 8.5,
  annualKwh: 14000
});

console.log('Lead ID:', result.leadId);
console.log('Score:', result.lead.score);
```

### Querying Leads

```javascript
import { getHighValueLeads, subscribeLead } from './services/leadService';

// Get high-value leads
const { leads } = await getHighValueLeads(50);
console.log(`Found ${leads.length} hot leads`);

// Subscribe to real-time updates
const unsubscribe = subscribeLead(leadId, (data) => {
  if (data.success) {
    console.log('Lead updated:', data.lead.status);
  }
});
```

### Updating Lead Status

```javascript
import { updateLead, addLeadNote } from './services/leadService';

// Update status
await updateLead(leadId, {
  status: "contacted",
  assignedTo: userId
});

// Add note
await addLeadNote(leadId, "Called customer, scheduling site visit", "call");
```

## Cloud Functions

### Callable Functions

| Function | Auth Required | Purpose |
|----------|---------------|---------|
| `createLead` | No | Create new lead |
| `updateLead` | Yes | Update lead |
| `addLeadNote` | Yes | Add sales note |
| `assignLead` | Yes | Assign to rep |
| `recalculateLeadScores` | Yes (Admin) | Batch rescore |

### HTTP Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/leadWebhook` | POST | API Key | External integrations |
| `/smtWebhook` | POST | Optional | Fetch SMT data |

## Best Practices

### Data Validation
- ✅ Always trim and lowercase emails
- ✅ Strip non-digits from phone numbers
- ✅ Validate required fields before submission
- ✅ Use enums for status and source

### Performance
- ✅ Use indexes for all query patterns
- ✅ Limit query results (50-100 max)
- ✅ Subscribe only to active views
- ✅ Unsubscribe when component unmounts

### Security
- ✅ Never expose admin functions publicly
- ✅ Validate auth tokens server-side
- ✅ Rate-limit public endpoints
- ✅ Sanitize user input
- ✅ Use API keys for webhooks

### Scoring
- ✅ Recalculate scores when solar data updates
- ✅ Use scoreBreakdown for transparency
- ✅ Periodically batch-recalculate all scores
- ✅ Log score changes for ML training

## Migration & Maintenance

### Adding New Fields
1. Update TypeScript interface in `functions/src/leads.ts`
2. Update frontend types in `src/types/lead.ts`
3. Update security rules if field needs protection
4. Add index if field will be queried
5. Deploy functions and rules together

### Backfilling Data
```javascript
// Use recalculateLeadScores for batch updates
const recalculate = httpsCallable(functions, 'recalculateLeadScores');
await recalculate();
```

### Archiving Old Leads
```javascript
// Soft delete by setting archived flag
await updateLead(leadId, { archived: true });

// Queries automatically exclude archived leads
const leads = await getLeadsByStatus('submitted'); // archived=false implicit
```
