# Firestore Schema Documentation

## Collections

### `leads` Collection

Stores all lead data from the qualification form. Each lead represents a potential customer who has completed the enrollment process.

**Collection Path:** `/leads/{leadId}`

#### Document Structure

```typescript
{
  // Document ID: Auto-generated project ID (e.g., PTTP-ABC123-XYZ789)

  // Core metadata
  id: string;                    // Same as document ID
  createdAt: Timestamp;          // When lead was created
  updatedAt: Timestamp;          // Last modification time
  status: string;                // 'new' | 'qualified' | 'contacted' | 'proposal_sent' | 'closed_won' | 'closed_lost'

  // Customer information
  customer: {
    firstName: string;           // Required
    lastName: string;            // Required
    email: string;               // Required, validated
    phone: string;               // Optional, formatted (XXX) XXX-XXXX
    userId: string | null;       // Firebase Auth UID if account created
  };

  // Property address
  address: {
    street: string;              // Required, full street address
    city: string;                // Required
    state: string;               // Required, 2-letter code (TX)
    postalCode: string;          // Required, 5-digit ZIP
    county: string;              // Required for energy community check
    latitude: number;            // Required, decimal degrees
    longitude: number;           // Required, decimal degrees
    formattedAddress: string;    // Full formatted address string
  };

  // Qualification criteria
  qualification: {
    isHomeowner: boolean;        // Required, must be true
    creditScore: string;         // 'excellent' | 'good' | 'fair' | 'poor'
    hasUtilityBill: boolean;     // Whether bill was uploaded/scanned
    utilityBillUrl: string | null; // Storage URL for uploaded bill
  };

  // Energy community eligibility (IRS Section 48)
  energyCommunity: {
    eligible: boolean;           // Federal energy community status
    msa: string | null;          // Metropolitan Statistical Area name
    reason: string | null;       // Reason for eligibility/ineligibility
    bonusEligible: boolean;      // Eligible for 10% ITC bonus
  };

  // Utility bill data
  billData: {
    source: string;              // 'utility_bill' | 'smart_meter_texas' | 'estimated'
    provider: string | null;     // Utility provider name
    esiid: string | null;        // Electric Service Identifier (Texas)
    accountNumber: string | null;

    // Usage data
    monthlyUsageKwh: number;     // Average monthly usage
    annualUsageKwh: number;      // Total annual usage
    monthlyBillAmount: number | null; // Average monthly bill

    // Rate information
    energyRate: number | null;   // ¢/kWh
    hasTimeOfUse: boolean;       // Time-of-use rate plan

    // Scan metadata
    isEstimated: boolean;        // Whether data was estimated
    estimateMethod: string | null; // 'home_profile' | 'average' if estimated
    scanConfidence: number | null; // 0-1 confidence score for OCR

    // Historical data (if from Smart Meter Texas)
    historicalData: Array<{
      month: string;             // YYYY-MM format
      usageKwh: number;
      cost: number | null;
    }> | null;
  };

  // Solar system design
  systemDesign: {
    // System sizing
    recommendedPanelCount: number;
    systemSizeKw: number;        // DC capacity
    annualProductionKwh: number;
    offsetPercentage: number;    // % of usage covered (target 100%)

    // Financial estimates
    estimatedCost: number;       // Before incentives
    federalTaxCredit: number;    // 30% or 40% with energy community bonus
    netCost: number;             // After federal incentive
    estimatedMonthlySavings: number;
    estimatedAnnualSavings: number;
    paybackPeriodYears: number;

    // Roof analysis (from Google Solar API)
    roofSegmentCount: number | null;
    maxPanelCapacity: number | null;
    solarPotentialKwh: number | null;
    sunshineHoursPerYear: number | null;

    // Panel layout data
    panels: Array<{
      lat: number;
      lng: number;
      orientation: string;       // 'LANDSCAPE' | 'PORTRAIT'
      azimuth: number;           // Degrees from north
      pitch: number;             // Roof pitch in degrees
      annualKwh: number;         // Individual panel production
    }> | null;
  };

  // Smart Meter Texas integration
  smartMeterTexas: {
    linked: boolean;             // Whether SMT account is linked
    method: string | null;       // 'quick' | 'download' | 'register'
    fetchedAt: Timestamp | null; // When data was fetched
    autoFetchEnabled: boolean;   // Enable auto-fetch in portal
  };

  // Lead source & tracking
  tracking: {
    source: string;              // 'organic' | 'referral' | 'paid' | 'direct'
    medium: string | null;       // Marketing medium
    campaign: string | null;     // Campaign name
    referralCode: string | null; // Referral code if applicable
    utmParams: object | null;    // Full UTM parameters
    landingPage: string;         // URL where user started
    userAgent: string;           // Browser/device info
  };

  // Application progress
  progress: {
    qualificationCompleted: boolean;
    proposalSent: boolean;
    proposalSentAt: Timestamp | null;
    siteVisitScheduled: boolean;
    siteVisitDate: Timestamp | null;
    contractSigned: boolean;
    contractSignedAt: Timestamp | null;
    installationScheduled: boolean;
    installationDate: Timestamp | null;
    installationCompleted: boolean;
    installationCompletedAt: Timestamp | null;
  };

  // Admin notes
  notes: Array<{
    id: string;
    authorId: string;            // Admin user ID
    authorName: string;
    text: string;
    createdAt: Timestamp;
  }> | [];

  // Assignment
  assignedTo: string | null;     // Admin user ID
  assignedAt: Timestamp | null;

  // Tags for categorization
  tags: string[];                // ['hot_lead', 'follow_up', 'price_sensitive', etc.]
}
```

#### Indexes Required

```javascript
// Compound indexes for common queries
leads: {
  fields: ['status', 'createdAt (desc)'],
  fields: ['assignedTo', 'status', 'createdAt (desc)'],
  fields: ['energyCommunity.eligible', 'status', 'createdAt (desc)'],
  fields: ['tracking.source', 'createdAt (desc)'],
  fields: ['address.county', 'createdAt (desc)'],
  fields: ['customer.email', 'createdAt (desc)'],
}
```

#### Security Rules

```javascript
match /leads/{leadId} {
  // Public can create (from qualification form)
  allow create: if request.auth != null &&
                   request.resource.data.customer.email is string &&
                   request.resource.data.address.county is string;

  // Users can read their own leads
  allow read: if request.auth != null &&
                 resource.data.customer.userId == request.auth.uid;

  // Admins can read/write all leads
  allow read, write: if request.auth != null &&
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';

  // Allow updates to assigned leads by the assignee
  allow update: if request.auth != null &&
                   resource.data.assignedTo == request.auth.uid;
}
```

---

### `projects` Collection

**DEPRECATED** - Being migrated to `leads` collection. Current code still uses this for backward compatibility.

---

### `addressCache` Collection

Caches solar system designs by address to avoid redundant Google Solar API calls.

**Collection Path:** `/addressCache/{addressHash}`

```typescript
{
  // Document ID: Hash of normalized address

  // Cached design data
  systemDesign: object;          // Full system design from Google Solar API
  billData: object | null;       // Associated bill data
  latitude: number;
  longitude: number;

  // Cache metadata
  cachedAt: Timestamp;           // Cache creation time
  hitCount: number;              // Number of times cache was used
  lastAccessedAt: Timestamp;     // Last time cache was read

  // Cache expires after 30 days
}
```

---

### `users` Collection

Stores customer portal accounts.

**Collection Path:** `/users/{userId}`

```typescript
{
  // Document ID: Firebase Auth UID

  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string | null;

  // User role
  role: string;                  // 'customer' | 'admin' | 'installer'

  // Associated data
  esiid: string | null;          // Electric Service ID (Texas)
  smtLinked: boolean;            // Smart Meter Texas account linked

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;

  // Preferences
  notifications: {
    email: boolean;
    sms: boolean;
  };
}
```

#### Subcollection: `/users/{userId}/private/smt`

Stores encrypted Smart Meter Texas credentials (accessible only to user and Cloud Functions).

```typescript
{
  username: string;              // SMT username
  password: string;              // SMT password (encrypted in production)
  esiid: string;
  linkedAt: Timestamp;
  unlinked: boolean | null;
  unlinkedAt: Timestamp | null;
}
```

---

## Common Queries

### Admin Dashboard

```javascript
// Get all new leads
db.collection('leads')
  .where('status', '==', 'new')
  .orderBy('createdAt', 'desc')
  .limit(50);

// Get my assigned leads
db.collection('leads')
  .where('assignedTo', '==', userId)
  .where('status', 'in', ['qualified', 'contacted', 'proposal_sent'])
  .orderBy('createdAt', 'desc');

// Get hot leads (created in last 24h)
db.collection('leads')
  .where('createdAt', '>=', yesterday)
  .orderBy('createdAt', 'desc');
```

### Customer Portal

```javascript
// Get customer's projects
db.collection('leads')
  .where('customer.userId', '==', userId)
  .orderBy('createdAt', 'desc');
```

### Analytics

```javascript
// Leads by county
db.collection('leads')
  .where('address.county', '==', 'Travis')
  .where('createdAt', '>=', startDate)
  .orderBy('createdAt', 'desc');

// Leads by source
db.collection('leads')
  .where('tracking.source', '==', 'referral')
  .orderBy('createdAt', 'desc');

// Energy community eligible leads
db.collection('leads')
  .where('energyCommunity.eligible', '==', true)
  .orderBy('createdAt', 'desc');
```
