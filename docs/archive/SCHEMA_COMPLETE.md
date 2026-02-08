# Firestore Schema Implementation - COMPLETE ✅

## What Was Created

### 1. Schema Documentation (`firestore-schema.md`)
Complete TypeScript-style documentation of the `leads` collection structure including:
- All fields with types and descriptions
- Nested objects (customer, address, qualification, etc.)
- Required indexes for efficient queries
- Security rules explanation
- Common query patterns

### 2. Leads Service (`src/services/leadsService.js`)
Comprehensive service layer with 20+ helper functions:
- **CRUD operations**: `createLead()`, `getLead()`, `updateLead()`
- **Status management**: `updateLeadStatus()`, constants for all statuses
- **Assignment**: `assignLead()` for admin workflow
- **Notes & Tags**: `addLeadNote()`, `addLeadTags()`, `removeLeadTags()`
- **Queries**: `getLeads()`, `getLeadsByEmail()`, `getRecentLeads()`
- **Progress tracking**: `updateLeadProgress()` for milestones
- **Builder**: `buildLeadObject()` to convert form data to lead schema
- **Migration**: `convertProjectToLead()` for backward compatibility

### 3. Security Rules (`firestore.rules`)
Production-ready security rules with:
- **Customer access**: Create leads, read their own by email/userId
- **Admin access**: Full read/write on all leads
- **Installer access**: Read assigned leads, update specific fields
- **Field-level protection**: Prevent unauthorized field updates
- **Helper functions**: `isAdmin()`, `isInstaller()`, etc.

### 4. Firestore Indexes (`firestore.indexes.json`)
10+ composite indexes for common queries:
- Status + createdAt
- AssignedTo + status + createdAt
- Energy community eligibility + createdAt
- County + createdAt
- Email + createdAt
- Tags (array-contains) + createdAt
- And more...

### 5. Migration Script (`scripts/migrate-projects-to-leads.cjs`)
Node.js script to migrate from legacy `projects` collection:
- Dry-run mode for safe testing
- Limit flag for incremental migration
- Duplicate detection and skipping
- Field validation and error handling
- Progress reporting and summary

### 6. Test Script (`scripts/test-leads.cjs`)
Automated testing of schema and operations:
- CRUD operation tests
- Common query tests
- Security rule validation
- Sample data generator

### 7. Setup Guide (`FIRESTORE_SETUP.md`)
Complete deployment and usage guide:
- Prerequisites and setup steps
- Deployment commands
- Testing procedures
- Common queries and use cases
- Cost optimization tips
- Troubleshooting guide

### 8. Scripts Documentation (`scripts/README.md`)
Developer guide for all scripts:
- Usage instructions
- Command examples
- Output explanations
- Common tasks
- Best practices

## Schema Overview

### Main Document Structure

```typescript
/leads/{leadId}
  ├── id: string                    // Project ID (PTTP-...)
  ├── status: string               // new | qualified | contacted | etc.
  ├── customer: {...}              // Name, email, phone, userId
  ├── address: {...}               // Full address with coords
  ├── qualification: {...}         // Homeowner, credit, bill status
  ├── energyCommunity: {...}       // IRS eligibility, MSA, bonus
  ├── billData: {...}              // Usage, rates, ESIID, historical
  ├── systemDesign: {...}          // Panels, sizing, costs, savings
  ├── smartMeterTexas: {...}       // SMT integration status
  ├── tracking: {...}              // Source, UTM, referral
  ├── progress: {...}              // Milestones with timestamps
  ├── notes: [...]                 // Admin notes array
  ├── assignedTo: string|null      // Admin/installer assignment
  ├── tags: [...]                  // Categorization tags
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

## How to Use

### 1. Deploy to Firebase (Required)

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Login
firebase login

# Initialize (if first time)
firebase init firestore

# Deploy security rules and indexes
firebase deploy --only firestore

# Wait 5-15 minutes for indexes to build
```

### 2. Download Service Account (For Scripts)

1. Go to [Firebase Console](https://console.firebase.google.com/project/agentic-labs/settings/serviceaccounts/adminsdk)
2. Click "Generate New Private Key"
3. Save as `agentic-labs-435536bc0091.json` in project root
4. **NEVER commit this file to git** (already in .gitignore)

### 3. Update Application Code

Replace existing project save logic with leads service:

```javascript
import { createLead, buildLeadObject } from './services/leadsService';

// In Qualify.jsx handleSubmit function
const leadData = buildLeadObject(formData, {
  billData,
  meterData,
  systemDesign,
  energyCommunityResult,
  userId: user?.uid,
  utilityBillUrl: billUrl,
  trackingData: {
    source: searchParams.get('utm_source') || 'direct',
    campaign: searchParams.get('utm_campaign'),
    landingPage: window.location.href,
  },
});

const leadId = await createLead(leadData);
```

### 4. Migrate Existing Data (Optional)

```bash
# Test with dry run
node scripts/migrate-projects-to-leads.cjs --dry-run

# Migrate first 10 for testing
node scripts/migrate-projects-to-leads.cjs --limit 10

# Full migration
node scripts/migrate-projects-to-leads.cjs
```

### 5. Test the Schema

```bash
# Run automated tests
node scripts/test-leads.cjs

# Verify in Firebase Console
open https://console.firebase.google.com/project/agentic-labs/firestore/data/leads
```

## Key Features

### 🎯 Lead Statuses
- `new` - Just submitted, awaiting review
- `qualified` - Passed qualification checks
- `contacted` - Sales rep reached out
- `proposal_sent` - Proposal delivered
- `site_visit_scheduled` - Site visit booked
- `contract_signed` - Customer signed
- `closed_won` - Installation complete
- `closed_lost` - Did not convert

### 📊 Progress Tracking
Built-in milestones with timestamps:
- `qualificationCompleted`
- `proposalSent` / `proposalSentAt`
- `siteVisitScheduled` / `siteVisitDate`
- `contractSigned` / `contractSignedAt`
- `installationCompleted` / `installationCompletedAt`

### 🏷️ Tagging System
Flexible categorization:
- `hot_lead`, `follow_up`, `price_sensitive`
- `energy_community_bonus`, `large_system`
- Custom tags per business needs

### 🔍 Powerful Queries
Pre-indexed queries for:
- All leads by status
- Assigned leads by user
- Geographic filtering by county
- Energy community eligibility
- Lead source attribution
- Recency (last 24h, 7d, etc.)

### 🔒 Security
- Customers can only read their own leads
- Admins have full access
- Installers can update assigned leads only
- Field-level update protection
- Firebase Auth integration

## Next Steps

1. ✅ Deploy security rules: `firebase deploy --only firestore:rules`
2. ✅ Deploy indexes: `firebase deploy --only firestore:indexes`
3. ⏳ Download service account JSON (for scripts)
4. ⏳ Update Qualify.jsx to use `createLead()`
5. ⏳ Test lead creation in development
6. ⏳ Migrate existing projects (if any)
7. ⏳ Build admin dashboard to view/manage leads

## Files Created

```
power-to-the-people/
├── firestore-schema.md                    # Schema documentation
├── firestore.rules                         # Security rules
├── firestore.indexes.json                  # Composite indexes
├── FIRESTORE_SETUP.md                      # Deployment guide
├── SCHEMA_COMPLETE.md                      # This file
├── src/services/
│   └── leadsService.js                    # Lead management service
└── scripts/
    ├── README.md                          # Scripts documentation
    ├── test-leads.cjs                     # Test script
    └── migrate-projects-to-leads.cjs      # Migration script
```

## Resources

- **Firebase Console**: https://console.firebase.google.com/project/agentic-labs
- **Firestore Data**: https://console.firebase.google.com/project/agentic-labs/firestore/data
- **Security Rules**: https://console.firebase.google.com/project/agentic-labs/firestore/rules
- **Indexes**: https://console.firebase.google.com/project/agentic-labs/firestore/indexes
- **Firestore Docs**: https://firebase.google.com/docs/firestore
- **Admin SDK**: https://firebase.google.com/docs/admin/setup

---

**Status**: ✅ Schema complete and ready for deployment!

**Estimated Time to Deploy**: 5 minutes + 10 minutes index build time

**Ready to go live? Run:**
```bash
firebase deploy --only firestore
```
