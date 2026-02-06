# Lead System Implementation Summary

## ✅ Completed

A complete Firestore-based lead management system with Cloud Functions backend.

## 📁 Files Created

### Backend (Cloud Functions)
- `functions/src/leads.ts` - Lead management Cloud Functions
- `functions/src/index.ts` - Functions entry point
- `functions/package.json` - Dependencies
- `functions/tsconfig.json` - TypeScript config
- `functions/README.md` - Complete documentation
- `functions/SCHEMA.md` - Schema reference

### Frontend Integration
- `src/types/lead.ts` - TypeScript types (shared)
- `src/services/leadService.js` - Frontend API wrapper

### Configuration
- `firebase.json` - Firebase project config
- `firestore.rules` - Security rules (updated)
- `firestore.indexes.json` - Query indexes (updated)

## 🎯 Features Implemented

### Lead Schema
Complete lead data structure with:
- ✅ Customer identification (name, email, phone)
- ✅ Full address (street, city, state, zip)
- ✅ Status tracking (submitted → contacted → qualified → sold/lost)
- ✅ Lead source (website, referral, ad, api, partner, event)
- ✅ AI scoring (0-100 with breakdown)
- ✅ Solar system details (size, battery, cost, savings)
- ✅ Energy data (annual/monthly kWh, ESIID)
- ✅ Sales notes with timestamps
- ✅ Marketing attribution (UTM params)
- ✅ Assignment to sales reps
- ✅ Comprehensive timestamps (created, updated, contacted, qualified, closed)

### Cloud Functions (6 total)

#### Callable Functions
1. **createLead** - Create new lead from form submission
2. **updateLead** - Update lead status and details (auth required)
3. **addLeadNote** - Add sales notes (auth required)
4. **assignLead** - Assign lead to sales rep (auth required)
5. **recalculateLeadScores** - Batch rescore all leads (admin only)

#### HTTP Endpoints
6. **leadWebhook** - External lead submission API (with API key auth)

### AI Lead Scoring
Automatic scoring algorithm based on:
- **Property Quality** (25 pts): Roof size, sun exposure, system capacity
- **Energy Usage** (15 pts): Annual consumption indicators
- **Contact Info** (10 pts): Valid phone and email
- **Base Score**: 50 points

Score ranges:
- 75-100: High-value (hot)
- 50-74: Medium-value (warm)
- 0-49: Low-value (cold)

### Security Rules
- ✅ Public lead creation (form submission)
- ✅ Users can read their own leads
- ✅ Sales reps can read all leads
- ✅ Assigned reps can update their leads
- ✅ Admins have full access
- ✅ Webhook requires API key

### Database Indexes
Optimized for common queries:
- ✅ Leads by status + created date
- ✅ Leads by score (descending)
- ✅ Leads by assignment + status
- ✅ Leads by source
- ✅ Archived status filtering

## 🚀 Usage Examples

### Creating a Lead (Frontend)
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

console.log('Lead created:', result.leadId);
console.log('Score:', result.lead.score); // e.g., 85
```

### Querying Leads
```javascript
import { getHighValueLeads, getLeadsByStatus } from './services/leadService';

// Get hot leads
const { leads } = await getHighValueLeads(50);

// Get all submitted leads
const { leads } = await getLeadsByStatus('submitted', 100);
```

### Real-time Updates
```javascript
import { subscribeLead } from './services/leadService';

const unsubscribe = subscribeLead(leadId, (data) => {
  if (data.success) {
    console.log('Lead updated:', data.lead.status, data.lead.score);
  }
});

// Later: unsubscribe()
```

### Updating Lead
```javascript
import { updateLead, addLeadNote } from './services/leadService';

// Change status
await updateLead(leadId, {
  status: "contacted",
  assignedTo: userId
});

// Add note
await addLeadNote(leadId, "Scheduled site visit for Friday", "call");
```

## 🔧 Next Steps

### 1. Deploy Functions
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 2. Deploy Rules & Indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 3. Set Environment Variables
```bash
# For SMT connector
firebase functions:config:set browserless.url="wss://chrome.browserless.io"
firebase functions:config:set browserless.token="YOUR_TOKEN"

# For webhook API
firebase functions:config:set lead.webhook_api_key="YOUR_SECRET_KEY"
```

### 4. Test Locally
```bash
cd functions
npm run serve  # Starts Firebase emulators

# In another terminal, test function
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/leadWebhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"customerName":"Test User","email":"test@example.com",...}'
```

### 5. Frontend Integration
Update your qualification form (`src/pages/Qualify.jsx` or `Success.jsx`) to use the lead service:

```javascript
import { createLead } from '../services/leadService';

async function handleSubmit(formData) {
  const result = await createLead({
    customerName: formData.name,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    city: formData.city,
    state: formData.state,
    zip: formData.zip,
    source: 'website',
    systemSize: solarData?.systemSize,
    annualKwh: solarData?.annualKwh,
    solarApiData: solarData?.apiResponse
  });

  if (result.success) {
    console.log('Lead created with ID:', result.leadId);
    console.log('Lead score:', result.lead.score);
    // Navigate to success page or show confirmation
  }
}
```

## 📊 Admin Dashboard (Future)
You can build an admin dashboard to:
- View all leads in a table
- Filter by status, score, source
- Assign leads to sales reps
- Add notes and update status
- View score breakdown
- Track conversion rates

Example query for dashboard:
```javascript
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const q = query(
  collection(db, 'leads'),
  where('archived', '!=', true),
  orderBy('score', 'desc')
);

onSnapshot(q, (snapshot) => {
  const leads = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  setLeads(leads);
});
```

## 🔐 Security Considerations
- ✅ Public form submissions are allowed (no auth)
- ✅ Authenticated users required for updates
- ✅ Sales reps can only update assigned leads
- ✅ Admins bypass all restrictions
- ✅ Webhook requires API key header
- ✅ Rate limiting recommended for production
- ✅ Input sanitization in Cloud Functions

## 📈 Monitoring
```bash
# View function logs
firebase functions:log

# View specific function
firebase functions:log --only createLead

# Follow logs
firebase functions:log --only createLead --limit 100
```

## 🧪 Testing
```javascript
// Test lead creation
const testLead = await createLead({
  customerName: "Test User",
  email: "test@example.com",
  phone: "5555555555",
  address: "123 Test St",
  city: "Austin",
  state: "TX",
  zip: "78701",
  source: "website",
  isTest: true  // Mark as test lead
});

// Test score calculation
const highScoreLead = await createLead({
  ...testLead,
  systemSize: 10,
  annualKwh: 18000,
  solarApiData: {
    maxArrayPanels: 30,
    maxSunshineHours: 1900
  }
});
console.log('High score lead:', highScoreLead.lead.score); // Should be 80+
```

## 📚 Documentation
- Full schema: `functions/SCHEMA.md`
- API reference: `functions/README.md`
- TypeScript types: `src/types/lead.ts`
- Service methods: `src/services/leadService.js`

## ✨ Key Benefits
1. **Automatic Scoring** - AI-driven lead prioritization
2. **Real-time Updates** - Firestore listeners for live data
3. **Scalable** - Firebase handles all infrastructure
4. **Flexible** - Easy to add custom fields
5. **Secure** - Granular security rules
6. **Trackable** - Complete audit trail with timestamps
7. **Extensible** - Webhook for external integrations

## 🎉 Success!
Your lead management system is now fully implemented and ready to deploy!
