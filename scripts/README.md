# Firestore Scripts

Node.js scripts for managing the Firestore database.

## Prerequisites

Install Firebase Admin SDK:

```bash
npm install firebase-admin
```

Ensure the service account JSON exists in project root:
```
agentic-labs-435536bc0091.json
```

## Scripts

### 1. Test Leads Schema

Tests the leads collection schema with sample data.

```bash
node scripts/test-leads.js
```

**What it does:**
- Creates a test lead with complete data
- Tests CRUD operations (Create, Read, Update, Delete)
- Runs common queries (by status, county, energy community)
- Validates schema structure

**Output:**
```
✓ Firebase Admin initialized

============================================================
TEST 1: CRUD Operations
============================================================

1. Creating test lead...
   ✓ Created lead: PTTP-TEST-123456

2. Reading lead...
   ✓ Read lead: Test Customer
   ✓ Email: test-123456@example.com
   ✓ County: Travis

3. Updating lead status...
   ✓ Updated status to: contacted

4. Cleaning up test lead...
   ✓ Deleted test lead

✅ CRUD test passed!
```

### 2. Migrate Projects to Leads

Migrates data from legacy `projects` collection to new `leads` collection.

```bash
# Dry run (preview only)
node scripts/migrate-projects-to-leads.js --dry-run

# Migrate first 10 (for testing)
node scripts/migrate-projects-to-leads.js --limit 10

# Full migration
node scripts/migrate-projects-to-leads.js
```

**What it does:**
- Fetches all projects from Firestore
- Converts each project to lead format
- Validates required fields
- Writes to leads collection
- Skips duplicates
- Provides detailed summary

**Output:**
```
============================================================
MIGRATION: Projects → Leads
============================================================
Mode: LIVE (will write to Firestore)
============================================================

📥 Fetching projects from Firestore...
✓ Found 47 projects to migrate

🔄 Starting migration...

  ✓ Migrated: PTTP-ABC123-DEF456
  ✓ Migrated: PTTP-GHI789-JKL012
  ⏭️  Skipping PTTP-MNO345-PQR678 (already exists in leads)

============================================================
MIGRATION SUMMARY
============================================================
Total projects: 47
✓ Migrated: 47
✗ Errors: 0
============================================================

✓ Migration complete!
```

### 3. Firebase Deployment

Not a script, but use Firebase CLI to deploy:

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes

# Deploy both
firebase deploy --only firestore
```

## Common Tasks

### Check Firestore Status

```bash
# Login to Firebase
firebase login

# Check current project
firebase projects:list

# Use correct project
firebase use agentic-labs
```

### View Indexes

Check index build status:
```bash
firebase firestore:indexes
```

Or visit: https://console.firebase.google.com/project/agentic-labs/firestore/indexes

### Test Security Rules

Use Firebase Emulator Suite:

```bash
# Start emulators
firebase emulators:start

# Run tests against emulators
npm test
```

### Manual Data Inspection

Use Firebase Console:
- Data: https://console.firebase.google.com/project/agentic-labs/firestore/data
- Rules: https://console.firebase.google.com/project/agentic-labs/firestore/rules
- Indexes: https://console.firebase.google.com/project/agentic-labs/firestore/indexes

### Backup Data

```bash
# Export entire database
gcloud firestore export gs://agentic-labs-backups/$(date +%Y%m%d)

# Export specific collection
gcloud firestore export gs://agentic-labs-backups/leads-$(date +%Y%m%d) \
  --collection-ids=leads
```

### Restore Data

```bash
# Import from backup
gcloud firestore import gs://agentic-labs-backups/20260206
```

## Troubleshooting

### "Cannot find module 'firebase-admin'"

Install Firebase Admin SDK:
```bash
npm install firebase-admin
```

### "PERMISSION_DENIED" errors

1. Check you're using correct service account
2. Verify service account has Firestore Admin role
3. Try re-downloading service account JSON from Firebase Console

### "FAILED_PRECONDITION: The query requires an index"

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

Wait 5-15 minutes for indexes to build.

### Scripts timeout

Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" node scripts/migrate-projects-to-leads.js
```

## Best Practices

1. **Always dry-run first** - Test migrations with `--dry-run` flag
2. **Test with limits** - Use `--limit 10` to test on small dataset
3. **Backup before migration** - Export data before major changes
4. **Monitor costs** - Check Firebase usage after bulk operations
5. **Index management** - Remove unused indexes to reduce costs

## Support

- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
- Firestore Documentation: https://firebase.google.com/docs/firestore
- Project Documentation: See `FIRESTORE_SETUP.md` and `firestore-schema.md`
