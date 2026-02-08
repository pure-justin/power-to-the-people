# Firestore Setup Guide

This guide walks through setting up the Firestore database for the Power to the People app.

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project: `agentic-labs`
- Admin access to Firebase Console

## 1. Deploy Security Rules

Deploy the security rules to protect your data:

```bash
# Login to Firebase
firebase login

# Initialize Firebase in project (if not already done)
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules
```

## 2. Deploy Firestore Indexes

Deploy the composite indexes for efficient queries:

```bash
firebase deploy --only firestore:indexes
```

**Note:** Index creation can take 5-15 minutes. Check progress in [Firebase Console](https://console.firebase.google.com/project/agentic-labs/firestore/indexes).

## 3. Migrate Existing Data (Optional)

If you have existing projects in the `projects` collection, migrate them to `leads`:

```bash
# Run migration script
node scripts/migrate-projects-to-leads.js
```

See `scripts/migrate-projects-to-leads.js` for details.

## 4. Verify Setup

Test the setup with these queries in Firebase Console:

### Test Query 1: Get all qualified leads
```
Collection: leads
Where: status == qualified
Order by: createdAt desc
Limit: 10
```

### Test Query 2: Get leads by county
```
Collection: leads
Where: address.county == Travis
Order by: createdAt desc
```

### Test Query 3: Get assigned leads
```
Collection: leads
Where: assignedTo == {userId}
Where: status == contacted
Order by: createdAt desc
```

## 5. Update Application Code

The app is already configured to use the leads service. No code changes needed.

### Import the service

```javascript
import {
  createLead,
  getLead,
  getLeads,
  updateLeadStatus,
  buildLeadObject,
} from './services/leadsService';
```

### Create a lead

```javascript
// In Qualify.jsx or wherever form submission happens
const leadData = buildLeadObject(formData, {
  billData,
  systemDesign,
  energyCommunityResult,
  userId: user?.uid,
  utilityBillUrl: billUrl,
  trackingData: {
    source: 'organic',
    landingPage: window.location.href,
  },
});

const leadId = await createLead(leadData);
```

### Query leads

```javascript
// Get all new leads
const newLeads = await getLeads({ status: 'new', limit: 50 });

// Get my assigned leads
const myLeads = await getLeads({
  assignedTo: currentUser.uid,
  status: 'contacted'
});

// Get recent hot leads
const hotLeads = await getRecentLeads(24); // last 24 hours
```

## Schema Overview

### Main Collections

1. **`/leads/{leadId}`** - Primary collection for all qualified leads
   - Contains customer info, address, qualifications, system design
   - Status: new → qualified → contacted → proposal_sent → closed_won/lost

2. **`/users/{userId}`** - Customer portal accounts
   - Linked to Firebase Auth
   - Contains profile info and preferences

3. **`/addressCache/{addressHash}`** - Solar design cache
   - Speeds up repeat lookups for same address
   - 30-day expiration

4. **`/projects/{projectId}`** - DEPRECATED (legacy)
   - Keep for backward compatibility
   - New code should use `/leads`

### Subcollections

- **`/users/{userId}/private/smt`** - Smart Meter Texas credentials
  - Encrypted storage for SMT login
  - Only accessible to user and Cloud Functions

## Security Model

### Customer Access
- Can create leads (qualification form)
- Can read their own leads (by userId or email)
- Can update their own user profile (limited fields)

### Admin Access
- Full read/write access to all leads
- Can assign leads to installers
- Can add notes and tags
- Can update lead status and progress

### Installer Access
- Can read assigned leads
- Can update notes and progress on assigned leads
- Cannot reassign leads

## Common Queries

### Admin Dashboard

```javascript
// Get all new leads awaiting contact
const newLeads = await getLeads({
  status: 'new',
  limit: 100
});

// Get leads by county for territory assignment
const travisLeads = await getLeads({
  county: 'Travis',
  status: 'qualified'
});

// Get energy community eligible leads (bonus ITC)
const bonusLeads = await getLeads({
  energyCommunityEligible: true
});
```

### Customer Portal

```javascript
// Get customer's projects
const myProjects = await getLeadsByUserId(currentUser.uid);
```

### Analytics

```javascript
// Get leads from last 7 days
const weeklyLeads = await getRecentLeads(24 * 7);

// Get leads by traffic source
const referralLeads = await getLeads({
  source: 'referral'
});
```

## Monitoring

### Key Metrics to Track

1. **Lead Volume**
   - New leads per day
   - Conversion rate by status

2. **Response Time**
   - Time from qualified → contacted
   - Average time to close

3. **Geographic Distribution**
   - Leads by county
   - Energy community eligibility rate

4. **Data Quality**
   - Percentage with utility bill data
   - SMT integration success rate

### Firebase Console Links

- [Firestore Data](https://console.firebase.google.com/project/agentic-labs/firestore/data)
- [Security Rules](https://console.firebase.google.com/project/agentic-labs/firestore/rules)
- [Indexes](https://console.firebase.google.com/project/agentic-labs/firestore/indexes)
- [Usage & Billing](https://console.firebase.google.com/project/agentic-labs/usage)

## Cost Optimization

### Reads
- Use cached designs when possible (addressCache)
- Implement pagination for large result sets
- Use realtime listeners sparingly (prefer one-time reads)

### Writes
- Batch related updates together
- Use transactions for atomic operations
- Minimize document size (keep < 1MB)

### Best Practices

1. **Index only what you query**
   - Review unused indexes regularly
   - Remove redundant indexes

2. **Cache aggressively**
   - Solar designs by address (30 days)
   - User profiles in localStorage
   - Static config data

3. **Paginate results**
   - Limit queries to 50-100 docs
   - Use cursor-based pagination for large lists

4. **Optimize document structure**
   - Denormalize for read performance
   - Keep frequently accessed data at top level
   - Use subcollections for large nested arrays

## Troubleshooting

### "Missing index" error

The error message will include a link to create the index. Click it or add to `firestore.indexes.json` and redeploy.

### Security rules denying access

Check the Firebase Console > Firestore > Rules tab. Use the Rules Playground to test rules with specific auth contexts.

### Slow queries

Check the query requires an index. Review [Indexes tab](https://console.firebase.google.com/project/agentic-labs/firestore/indexes) for build status.

### Data not appearing

1. Check security rules allow read access
2. Verify auth state (user logged in)
3. Check browser console for errors
4. Verify document exists in Firebase Console

## Support

- Firebase Documentation: https://firebase.google.com/docs/firestore
- Community: https://stackoverflow.com/questions/tagged/google-cloud-firestore
- Project CLAUDE.md for internal context
