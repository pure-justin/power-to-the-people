# Leads Service - Quick Reference

## Import

```javascript
import {
  createLead,
  getLead,
  updateLead,
  updateLeadStatus,
  assignLead,
  addLeadNote,
  addLeadTags,
  getLeads,
  getLeadsByUserId,
  getLeadsByEmail,
  getRecentLeads,
  updateLeadProgress,
  buildLeadObject,
  LEAD_STATUS,
  CREDIT_SCORES,
  BILL_SOURCES,
} from './services/leadsService';
```

## Create a Lead

```javascript
// Build lead from form data
const leadData = buildLeadObject(formData, {
  billData: { monthlyUsageKwh: 1200, annualUsageKwh: 14400, ... },
  systemDesign: { panelCount: 24, systemSizeKw: 9.6, ... },
  energyCommunityResult: { isEnergyCommunity: true, msa: '...' },
  userId: currentUser?.uid,
  utilityBillUrl: 'https://storage.../bill.pdf',
  trackingData: {
    source: 'organic',
    campaign: 'summer-2024',
    landingPage: window.location.href,
  },
});

// Save to Firestore
const leadId = await createLead(leadData);
```

## Read Leads

```javascript
// Get single lead
const lead = await getLead('PTTP-ABC123-DEF456');

// Get all qualified leads
const qualified = await getLeads({
  status: 'qualified',
  limit: 50
});

// Get my assigned leads
const myLeads = await getLeads({
  assignedTo: currentUser.uid,
  status: 'contacted'
});

// Get leads by county
const austinLeads = await getLeads({
  county: 'Travis'
});

// Get energy community eligible
const bonusLeads = await getLeads({
  energyCommunityEligible: true
});

// Get customer's leads
const customerLeads = await getLeadsByUserId(userId);
// or
const customerLeads = await getLeadsByEmail('customer@example.com');

// Get recent hot leads (last 24 hours)
const hotLeads = await getRecentLeads(24);
```

## Update Leads

```javascript
// Update any fields
await updateLead(leadId, {
  status: 'contacted',
  assignedTo: adminUserId,
});

// Update status only
await updateLeadStatus(leadId, LEAD_STATUS.PROPOSAL_SENT);

// Assign to sales rep
await assignLead(leadId, salesRepUserId);

// Add a note
await addLeadNote(
  leadId,
  currentUser.uid,
  currentUser.displayName,
  'Called customer, very interested in 10kW system'
);

// Add tags
await addLeadTags(leadId, ['hot_lead', 'large_system']);

// Update progress milestone
await updateLeadProgress(leadId, 'proposalSent', true);
```

## Status Constants

```javascript
LEAD_STATUS.NEW                      // 'new'
LEAD_STATUS.QUALIFIED                // 'qualified'
LEAD_STATUS.CONTACTED                // 'contacted'
LEAD_STATUS.PROPOSAL_SENT            // 'proposal_sent'
LEAD_STATUS.SITE_VISIT_SCHEDULED     // 'site_visit_scheduled'
LEAD_STATUS.CONTRACT_SIGNED          // 'contract_signed'
LEAD_STATUS.CLOSED_WON              // 'closed_won'
LEAD_STATUS.CLOSED_LOST             // 'closed_lost'
```

## Credit Score Constants

```javascript
CREDIT_SCORES.EXCELLENT  // 'excellent'
CREDIT_SCORES.GOOD       // 'good'
CREDIT_SCORES.FAIR       // 'fair'
CREDIT_SCORES.POOR       // 'poor'
```

## Bill Source Constants

```javascript
BILL_SOURCES.UTILITY_BILL        // 'utility_bill'
BILL_SOURCES.SMART_METER_TEXAS   // 'smart_meter_texas'
BILL_SOURCES.ESTIMATED           // 'estimated'
```

## Query Filters

```javascript
getLeads({
  status: 'qualified',              // Filter by status
  assignedTo: userId,               // Filter by assignment
  energyCommunityEligible: true,    // Energy community filter
  county: 'Travis',                 // Geographic filter
  source: 'referral',               // Lead source
  limit: 50,                        // Max results
})
```

## Common Patterns

### Admin Dashboard - New Leads

```javascript
const newLeads = await getLeads({
  status: LEAD_STATUS.NEW,
  limit: 100
});

newLeads.forEach(lead => {
  console.log(`${lead.customer.firstName} ${lead.customer.lastName}`);
  console.log(`  County: ${lead.address.county}`);
  console.log(`  System: ${lead.systemDesign?.systemSizeKw}kW`);
  console.log(`  Bonus: ${lead.energyCommunity.eligible ? 'Yes' : 'No'}`);
});
```

### Customer Portal - My Projects

```javascript
const myProjects = await getLeadsByUserId(currentUser.uid);

myProjects.forEach(project => {
  console.log(`Project: ${project.id}`);
  console.log(`  Status: ${project.status}`);
  console.log(`  System: ${project.systemDesign?.systemSizeKw}kW`);
  console.log(`  Savings: $${project.systemDesign?.estimatedMonthlySavings}/mo`);
});
```

### Sales Rep - My Assigned Leads

```javascript
const myLeads = await getLeads({
  assignedTo: currentUser.uid,
  status: LEAD_STATUS.CONTACTED,
});

// Update a lead after call
await addLeadNote(
  leadId,
  currentUser.uid,
  currentUser.displayName,
  'Customer interested but wants to see neighbors installation first'
);

await updateLeadStatus(leadId, LEAD_STATUS.PROPOSAL_SENT);
await updateLeadProgress(leadId, 'proposalSent', true);
```

### Analytics - Lead Source Performance

```javascript
const sources = ['organic', 'referral', 'paid', 'direct'];

for (const source of sources) {
  const leads = await getLeads({ source });
  console.log(`${source}: ${leads.length} leads`);
}
```

## Data Structure Reference

### Minimal Lead (Required Fields Only)

```javascript
{
  id: 'PTTP-...',
  status: 'new',
  customer: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '(512) 555-1234',
    userId: null,
  },
  address: {
    street: '123 Main St',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    county: 'Travis',
    latitude: 30.2672,
    longitude: -97.7431,
    formattedAddress: '123 Main St, Austin, TX 78701',
  },
  qualification: {
    isHomeowner: true,
    creditScore: 'good',
    hasUtilityBill: false,
    utilityBillUrl: null,
  },
  energyCommunity: {
    eligible: false,
    msa: null,
    reason: null,
    bonusEligible: false,
  },
  // ... other fields default to null or []
}
```

## Error Handling

```javascript
try {
  const leadId = await createLead(leadData);
  console.log('Lead created:', leadId);
} catch (error) {
  if (error.code === 'permission-denied') {
    console.error('Security rules denied access');
  } else if (error.code === 'not-found') {
    console.error('Lead not found');
  } else {
    console.error('Error:', error.message);
  }
}
```

## Security Notes

- Customers can only read their own leads (by userId or email)
- Admins can read/write all leads
- Installers can read assigned leads and update specific fields
- Lead creation requires valid email and county
- Updates are validated by security rules

## Performance Tips

1. **Use limits** - Always set a `limit` for large queries
2. **Cache locally** - Store frequently accessed leads in state/localStorage
3. **Paginate** - For large result sets, implement cursor-based pagination
4. **Index aware** - All common queries are pre-indexed for speed
5. **Batch updates** - Use Firestore batch writes for multiple updates

## Firebase Console Links

- [All Leads](https://console.firebase.google.com/project/agentic-labs/firestore/data/leads)
- [Security Rules](https://console.firebase.google.com/project/agentic-labs/firestore/rules)
- [Indexes](https://console.firebase.google.com/project/agentic-labs/firestore/indexes)

## Support

See full documentation in:
- `firestore-schema.md` - Complete schema reference
- `FIRESTORE_SETUP.md` - Setup and deployment guide
- `scripts/README.md` - Scripts and maintenance
