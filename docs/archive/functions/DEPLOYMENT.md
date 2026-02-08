# Deployment Guide - API Key Management System

Complete guide for deploying the API key management Cloud Functions.

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project configured
- Node.js 18+ installed
- Admin credentials (for testing)

## Quick Deploy

```bash
cd functions
npm install
npm run build
npm run deploy
```

## Step-by-Step Deployment

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

This compiles TypeScript files from `src/` to `lib/`.

### 3. Test Locally (Optional but Recommended)

```bash
npm run serve
```

This starts Firebase emulators on:
- Functions: http://localhost:5001
- Firestore: http://localhost:8080

### 4. Deploy All Functions

```bash
npm run deploy
```

Or use Firebase CLI directly:

```bash
firebase deploy --only functions
```

### 5. Deploy Specific Functions

Deploy only API key functions:

```bash
firebase deploy --only functions:createApiKey,functions:validateApiKey,functions:revokeApiKey,functions:rotateApiKey,functions:updateApiKey,functions:getApiKeyUsage,functions:cleanupApiKeys
```

## Deployed Functions

After deployment, you'll have these Cloud Functions:

### API Key Management
- `createApiKey` - Create new API keys
- `validateApiKey` - Validate and check permissions
- `revokeApiKey` - Revoke keys permanently
- `rotateApiKey` - Generate new key (same settings)
- `updateApiKey` - Update key settings
- `getApiKeyUsage` - Get usage statistics
- `cleanupApiKeys` - Scheduled cleanup (runs daily)

### Lead Management (existing)
- `createLead`
- `updateLead`
- `addLeadNote`
- `assignLead`
- `recalculateLeadScores`
- `leadWebhook`

### SMT Connector (existing)
- `fetchSmtUsage`
- `smtWebhook`

## Function URLs

After deployment, Firebase will provide URLs like:

```
https://us-central1-YOUR_PROJECT.cloudfunctions.net/createApiKey
https://us-central1-YOUR_PROJECT.cloudfunctions.net/validateApiKey
...
```

## Firestore Security Rules

Add these rules to `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // API Keys - only owners can read/write
    match /apiKeys/{keyId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    // API Key Usage Logs - only owners can read
    match /apiKeyUsageLogs/{logId} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions can write
    }

    // Leads - authenticated users can read/write their own
    match /leads/{leadId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
    }

    // Projects - authenticated users can read/write their own
    match /projects/{projectId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // SMT Data - authenticated users only
    match /smtData/{esiid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

## Environment Variables

Set environment variables for Cloud Functions:

```bash
# Set Browserless token for SMT connector
firebase functions:config:set browserless.token="YOUR_TOKEN"

# View current config
firebase functions:config:get

# Deploy config changes
firebase deploy --only functions
```

## Monitoring

### View Logs

```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only createApiKey

# Follow logs in real-time
firebase functions:log --follow
```

### Firebase Console

- Go to [Firebase Console](https://console.firebase.google.com)
- Select your project
- Navigate to:
  - **Functions → Dashboard**: View invocations, errors, execution time
  - **Functions → Logs**: Real-time logs with filters
  - **Firestore → Data**: View apiKeys and apiKeyUsageLogs collections

## Testing Deployment

### Test with cURL

```bash
# Get function URL from Firebase Console or deployment output
FUNCTION_URL="https://us-central1-YOUR_PROJECT.cloudfunctions.net"

# Test createApiKey (requires Firebase Auth token)
curl -X POST $FUNCTION_URL/createApiKey \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{
    "data": {
      "name": "Test Key",
      "scopes": ["read_leads"],
      "environment": "development"
    }
  }'
```

### Test with Firebase SDK

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createKey = httpsCallable(functions, 'createApiKey');

const result = await createKey({
  name: "Test Key",
  scopes: ["read_leads"],
  environment: "development"
});

console.log(result.data);
```

## Troubleshooting

### Build Errors

If TypeScript compilation fails:

1. Check `tsconfig.json` settings
2. Ensure all imports use `firebase-functions/v1`
3. Run `npm install` to update dependencies

```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment Errors

**"Billing account not configured"**
- Enable billing on Firebase project
- Upgrade to Blaze plan (pay-as-you-go)

**"Insufficient permissions"**
- Ensure you're logged in: `firebase login`
- Check project: `firebase use --add`

**"Function deployment failed"**
- Check logs: `firebase functions:log`
- Verify function names in `index.ts`
- Ensure all exports are valid

### Runtime Errors

**"Invalid API key format"**
- Key must match: `pk_(live|test)_[a-f0-9]{48}`

**"Rate limit exceeded"**
- Wait for counter reset (minute/hour/day)
- Or increase rate limits for the key

**"Permission denied"**
- Check Firestore security rules
- Verify user authentication
- Ensure key owner matches

## Performance Optimization

### Function Configuration

Adjust memory and timeout in source code:

```typescript
export const myFunction = functions
  .runWith({
    timeoutSeconds: 60,    // Default: 60, Max: 540
    memory: "512MB"        // Options: 128MB, 256MB, 512MB, 1GB, 2GB, 4GB, 8GB
  })
  .https.onCall(async (data, context) => {
    // ...
  });
```

### Cold Start Optimization

- Keep functions warm with scheduled pings
- Minimize dependencies
- Use lighter packages when possible

### Cost Optimization

- Monitor function invocations
- Set up billing alerts
- Use appropriate memory allocation
- Consider using scheduled functions instead of always-on listeners

## Scheduled Functions

The `cleanupApiKeys` function runs automatically:

- **Schedule**: Daily at midnight (CST)
- **Actions**:
  - Mark expired keys as `EXPIRED`
  - Delete logs older than 90 days
- **Edit schedule** in `apiKeys.ts`:

```typescript
.pubsub.schedule("0 0 * * *")  // cron format
.timeZone("America/Chicago")
```

## Rollback

If you need to rollback to a previous version:

```bash
# List recent deployments
firebase functions:list

# Rollback specific function
firebase deploy --only functions:createApiKey --version PREVIOUS_VERSION

# Rollback all functions
firebase deploy --only functions --version PREVIOUS_VERSION
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy-functions.yml`:

```yaml
name: Deploy Cloud Functions

on:
  push:
    branches:
      - main
    paths:
      - 'functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd functions
          npm ci

      - name: Build
        run: |
          cd functions
          npm run build

      - name: Deploy to Firebase
        run: |
          npm install -g firebase-tools
          firebase deploy --only functions --token ${{ secrets.FIREBASE_TOKEN }}
```

Generate token:

```bash
firebase login:ci
# Save the token as GitHub secret: FIREBASE_TOKEN
```

## Production Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] TypeScript compiles without errors
- [ ] Environment variables set
- [ ] Firestore security rules deployed
- [ ] Billing enabled and alerts configured
- [ ] Monitoring dashboard set up
- [ ] Error tracking configured (Sentry, etc.)
- [ ] API keys rotated and secured
- [ ] Documentation updated
- [ ] Team notified of deployment

## Post-Deployment

1. **Test all endpoints** with production data
2. **Monitor logs** for first 24 hours
3. **Check performance metrics** in Firebase Console
4. **Verify scheduled functions** execute correctly
5. **Update frontend** to use production URLs
6. **Document** any issues or learnings

## Support

- Firebase Docs: https://firebase.google.com/docs/functions
- Stack Overflow: Tag `google-cloud-functions`
- Firebase Support: https://firebase.google.com/support

## Version History

- **v1.0.0** (2025-02-06)
  - Initial release
  - API key management system
  - Usage tracking and rate limiting
  - Scheduled cleanup
