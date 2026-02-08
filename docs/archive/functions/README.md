# Power to the People - Cloud Functions

Firebase Cloud Functions for the Power to the People solar enrollment platform.

## Setup

```bash
cd functions
npm install
npm run build
```

## Development

```bash
# Watch mode (rebuild on changes)
npm run build:watch

# Test locally with Firebase Emulators
npm run serve

# View logs
npm run logs
```

## Deployment

```bash
# Deploy all functions
npm run deploy

# Deploy specific function
firebase deploy --only functions:createLead
```

## Environment Variables

Set these in Firebase Functions config:

```bash
# Browserless.io (for SMT scraping)
firebase functions:config:set browserless.url="wss://chrome.browserless.io"
firebase functions:config:set browserless.token="YOUR_TOKEN"

# Lead webhook API key
firebase functions:config:set lead.webhook_api_key="YOUR_SECRET_KEY"
```

Access in code:
```typescript
const BROWSERLESS_URL = process.env.BROWSERLESS_URL || functions.config().browserless?.url;
```

## Available Functions

### API Key Management

Complete API key system with usage tracking and rate limiting for developer platform.

#### `createApiKey` (callable)
Generate a new API key with custom scopes and rate limits.

**Input:**
```typescript
{
  name: string,
  description?: string,
  scopes: ApiKeyScope[],
  environment?: "development" | "production",
  expiresInDays?: number,
  rateLimit?: Partial<RateLimit>,
  allowedIps?: string[],
  allowedDomains?: string[]
}
```

**Output:**
```typescript
{
  success: true,
  apiKeyId: string,
  apiKey: string,  // Plain-text key - ONLY TIME IT'S SHOWN!
  keyPrefix: string,
  message: "Save this API key securely. It will not be shown again."
}
```

#### `validateApiKey` (callable)
Validates an API key and checks permissions.

#### `revokeApiKey` (callable)
Permanently disables an API key.

#### `rotateApiKey` (callable)
Generates a new API key while preserving settings.

#### `updateApiKey` (callable)
Updates API key settings (name, scopes, rate limits, etc).

#### `getApiKeyUsage` (callable)
Retrieves usage statistics and detailed request logs.

#### `cleanupApiKeys` (scheduled)
Automatically runs daily to expire old keys and clean up logs.

**Documentation:** See `src/apiKeys.test.md` for complete guide and `API_KEYS_README.md`

---

### Lead Management

#### `createLead` (callable)
Creates a new lead from form submission.

**Input:**
```typescript
{
  customerName: string,
  email: string,
  phone: string,
  address: string,
  city: string,
  state: string,
  zip: string,
  source?: "website" | "referral" | "ad" | "api" | "partner" | "event",
  systemSize?: number,
  batterySize?: number,
  annualKwh?: number,
  solarApiData?: any,
  utmSource?: string,
  utmMedium?: string,
  utmCampaign?: string
}
```

**Output:**
```typescript
{
  success: true,
  leadId: string,
  lead: Lead
}
```

#### `updateLead` (callable)
Updates lead status and details. Requires authentication.

**Input:**
```typescript
{
  leadId: string,
  updates: Partial<Lead>
}
```

#### `addLeadNote` (callable)
Adds a sales note to a lead. Requires authentication.

**Input:**
```typescript
{
  leadId: string,
  text: string,
  type?: "call" | "email" | "meeting" | "note"
}
```

#### `assignLead` (callable)
Assigns lead to a sales rep. Requires authentication.

**Input:**
```typescript
{
  leadId: string,
  assignToUserId: string,
  assignToName?: string
}
```

#### `recalculateLeadScores` (callable)
Batch recalculates scores for all leads. Admin only.

#### `leadWebhook` (HTTP)
HTTP endpoint for external lead submissions.

**Endpoint:** `https://REGION-PROJECT_ID.cloudfunctions.net/leadWebhook`

**Method:** POST

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Body:** Same as `createLead` input

### Smart Meter Texas

#### `fetchSmtUsage` (callable)
Fetches usage data from Smart Meter Texas using Puppeteer.

**Input:**
```typescript
{
  username: string,
  password: string,
  projectId?: string,
  customerId?: string
}
```

**Output:**
```typescript
{
  success: true,
  data: {
    esiid: string,
    monthlyUsage: Array<{month, year, kWh, date}>,
    annualKwh: number,
    totalKwh: number,
    monthsOfData: number,
    source: "smart_meter_texas",
    fetchedAt: string
  },
  savedTo: string
}
```

#### `smtWebhook` (HTTP)
HTTP endpoint for SMT data fetching.

## Firestore Schema

### Leads Collection

**Path:** `/leads/{leadId}`

**Schema:**
```typescript
interface Lead {
  // Identification
  id: string;
  customerName: string;
  email: string;
  phone: string;

  // Address
  address: string;
  city: string;
  state: string;
  zip: string;
  fullAddress?: string;

  // Status & Assignment
  status: "submitted" | "contacted" | "qualified" | "sold" | "lost";
  source: "website" | "referral" | "ad" | "api" | "partner" | "event";
  assignedTo?: string; // User ID
  assignedToName?: string;

  // Scoring (0-100)
  score: number;
  scoreBreakdown?: {
    propertyQuality: number;
    financialFit: number;
    urgency: number;
    engagement: number;
  };

  // Solar System Details
  systemSize?: number; // kW
  batterySize?: number; // kWh
  estimatedCost?: number;
  estimatedSavings?: number;
  monthlyPayment?: number;
  panelCount?: number;

  // Energy Data
  annualKwh?: number;
  monthlyKwh?: number;
  esiid?: string;

  // Solar API Data
  solarApiData?: {
    maxArrayPanels: number;
    maxArrayArea: number;
    maxSunshineHours: number;
    carbonOffset: number;
    buildingInsights?: any;
  };

  // Notes & History
  notes: Array<{
    id: string;
    text: string;
    author: string;
    authorName?: string;
    createdAt: Timestamp;
    type?: "call" | "email" | "meeting" | "note";
  }>;
  lastContactedAt?: Timestamp;
  qualifiedAt?: Timestamp;
  closedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  ipAddress?: string;
  userAgent?: string;

  // Marketing Attribution
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;

  // Flags
  isTest?: boolean;
  archived?: boolean;
}
```

### Lead Scoring Algorithm

Scores are calculated automatically based on:

1. **Property Quality** (up to 25 points)
   - Roof size (max panels > 20): +10
   - Sun exposure (>1500 hours/year): +10
   - System size (>7kW): +5

2. **Energy Usage** (up to 15 points)
   - High usage (>12,000 kWh/year): +10
   - Very high usage (>15,000 kWh/year): +5

3. **Contact Completeness** (up to 10 points)
   - Valid phone: +5
   - Valid email: +5

**Base Score:** 50 points

## Frontend Integration

### Creating a Lead

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createLead = httpsCallable(functions, 'createLead');

try {
  const result = await createLead({
    customerName: "John Doe",
    email: "john@example.com",
    phone: "5125551234",
    address: "123 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    source: "website"
  });

  console.log('Lead created:', result.data.leadId);
} catch (error) {
  console.error('Error:', error);
}
```

### Querying Leads

```javascript
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const db = getFirestore();

// Get all submitted leads, sorted by score
const q = query(
  collection(db, 'leads'),
  where('status', '==', 'submitted'),
  where('archived', '!=', true),
  orderBy('score', 'desc')
);

const snapshot = await getDocs(q);
const leads = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
```

### Real-time Lead Updates

```javascript
import { doc, onSnapshot } from 'firebase/firestore';

const leadRef = doc(db, 'leads', leadId);

const unsubscribe = onSnapshot(leadRef, (doc) => {
  const lead = doc.data();
  console.log('Lead updated:', lead.status, lead.score);
});

// Later: unsubscribe()
```

## Testing

### Local Testing with Emulators

```bash
# Start emulators
firebase emulators:start

# In another terminal, test functions
curl -X POST http://localhost:5001/PROJECT_ID/REGION/leadWebhook \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test User","email":"test@example.com",...}'
```

### Test Lead Scoring

```javascript
const recalculate = httpsCallable(functions, 'recalculateLeadScores');
await recalculate();
```

## Security

- Lead creation is open (public form submission)
- Reading/updating requires authentication
- Sales reps can only update assigned leads
- Admins have full access
- Webhook requires API key authentication

See `firestore.rules` for complete security rules.

## Monitoring

```bash
# View function logs
firebase functions:log

# View specific function
firebase functions:log --only createLead

# Follow logs in real-time
firebase functions:log --only createLead --limit 100
```

## Common Queries

### Get high-value leads
```javascript
query(
  collection(db, 'leads'),
  where('score', '>=', 80),
  where('status', '==', 'submitted'),
  orderBy('score', 'desc'),
  limit(50)
)
```

### Get my assigned leads
```javascript
query(
  collection(db, 'leads'),
  where('assignedTo', '==', currentUserId),
  where('status', 'in', ['contacted', 'qualified']),
  orderBy('updatedAt', 'desc')
)
```

### Get leads by source
```javascript
query(
  collection(db, 'leads'),
  where('source', '==', 'referral'),
  orderBy('createdAt', 'desc')
)
```
