# Deployment Checklist - API Key Management System

Use this checklist to ensure proper deployment of the API key management system.

## ✅ Pre-Deployment

### Code Verification
- [x] TypeScript compiles without errors
- [x] All functions properly exported in index.ts
- [x] Core functions implemented:
  - [x] createApiKey
  - [x] validateApiKey
  - [x] revokeApiKey
  - [x] rotateApiKey
  - [x] updateApiKey
  - [x] getApiKeyUsage
  - [x] cleanupApiKeys
  - [x] validateApiKeyFromRequest
- [x] Example endpoints implemented:
  - [x] secureLeadWebhook
  - [x] secureSolarWebhook
  - [x] secureLeadQuery
- [x] Documentation complete

### Environment Setup
- [ ] Firebase project initialized
- [ ] Firebase CLI installed (`firebase --version`)
- [ ] Logged in to Firebase (`firebase login`)
- [ ] Project selected (`firebase use <project-id>`)

### Dependencies
```bash
cd functions
npm install

# Verify all dependencies installed
npm list firebase-functions
npm list firebase-admin
npm list puppeteer-core  # Already installed for smtConnector
```

## 🚀 Deployment Steps

### 1. Build TypeScript
```bash
cd /Users/admin/Projects/power-to-the-people/functions
npm run build
```

**Expected Output:**
```
> power-to-the-people-functions@1.0.0 build
> tsc
```

**Checkpoint:** ✅ No compilation errors

---

### 2. Deploy Cloud Functions

#### Option A: Deploy All Functions (Recommended for first deployment)
```bash
firebase deploy --only functions
```

#### Option B: Deploy API Key Functions Only
```bash
firebase deploy --only functions:createApiKey,functions:validateApiKey,functions:revokeApiKey,functions:rotateApiKey,functions:updateApiKey,functions:getApiKeyUsage,functions:cleanupApiKeys,functions:secureLeadWebhook,functions:secureSolarWebhook,functions:secureLeadQuery
```

**Expected Output:**
```
✔  functions: Finished running predeploy script.
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (X.XX KB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: creating Node.js 18 function createApiKey(us-central1)...
...
✔  Deploy complete!
```

**Checkpoint:** ✅ All functions deployed successfully

---

### 3. Verify Function Deployment

```bash
firebase functions:list | grep -E "createApiKey|validateApiKey|revokeApiKey"
```

**Expected Output:**
```
createApiKey(us-central1)
validateApiKey(us-central1)
revokeApiKey(us-central1)
rotateApiKey(us-central1)
updateApiKey(us-central1)
getApiKeyUsage(us-central1)
cleanupApiKeys(us-central1)
secureLeadWebhook(us-central1)
secureSolarWebhook(us-central1)
secureLeadQuery(us-central1)
```

**Checkpoint:** ✅ All functions visible in list

---

### 4. Deploy Firestore Security Rules

#### Create/Update firestore.rules

If you don't have a `firestore.rules` file, create one at project root:

```bash
cd /Users/admin/Projects/power-to-the-people
touch firestore.rules
```

Copy the rules from `functions/FIRESTORE_RULES.md` into `firestore.rules`.

#### Deploy Rules
```bash
firebase deploy --only firestore:rules
```

**Expected Output:**
```
=== Deploying to 'your-project'...

i  deploying firestore
i  firestore: reading indexes from firestore.indexes.json...
i  firestore: reading rules from firestore.rules...
✔  firestore: deployed rules firestore.rules successfully

✔  Deploy complete!
```

**Checkpoint:** ✅ Rules deployed successfully

---

### 5. Create Firestore Indexes

You'll need to create these indexes either manually or when Firebase prompts you.

#### Option A: Automatic (Recommended)
Wait for Firebase to prompt you with index creation URLs when you first query the data. Firebase will provide direct links.

#### Option B: Manual via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Firestore Database → Indexes → Composite

**Index 1: API Key Usage Logs**
- Collection ID: `apiKeyUsageLogs`
- Fields:
  - `apiKeyId` - Ascending
  - `timestamp` - Descending
- Query scope: Collection

**Index 2: API Keys by User and Status**
- Collection ID: `apiKeys`
- Fields:
  - `userId` - Ascending
  - `status` - Ascending
- Query scope: Collection

**Index 3: API Keys by Status and Expiration**
- Collection ID: `apiKeys`
- Fields:
  - `status` - Ascending
  - `expiresAt` - Ascending
- Query scope: Collection

**Checkpoint:** ✅ Indexes created and enabled

---

### 6. Test API Key Creation

#### Via Firebase Console

1. Go to Firebase Console → Functions
2. Find `createApiKey` function
3. Click on it → "Logs" tab → "Testing" tab (if available)
4. Or use Firebase CLI:

```bash
# Get a Firebase auth token
firebase login:ci

# Call the function (requires authenticated user)
# Note: You'll need to be authenticated via your app
```

#### Via JavaScript (Browser Console on Your App)

```javascript
// In your app with Firebase initialized
const functions = getFunctions();
const createApiKey = httpsCallable(functions, 'createApiKey');

createApiKey({
  name: "Test API Key",
  scopes: ["read_leads"],
  environment: "development"
}).then(result => {
  console.log("✅ API Key Created!");
  console.log("Key:", result.data.apiKey);
  console.log("Save this key!");
}).catch(error => {
  console.error("❌ Error:", error);
});
```

**Expected Output:**
```javascript
{
  success: true,
  apiKeyId: "abc123...",
  apiKey: "pk_test_a1b2c3d4e5f6...",  // 56 characters
  keyPrefix: "pk_test_a1b2c3d4...",
  message: "Save this API key securely. It will not be shown again."
}
```

**Checkpoint:** ✅ API key created successfully

---

### 7. Test API Key Usage

```bash
# Replace with your API key from step 6
API_KEY="pk_test_YOUR_KEY_HERE"
PROJECT_ID="your-project-id"

# Test the secure lead webhook
curl -X POST \
  "https://us-central1-${PROJECT_ID}.cloudfunctions.net/secureLeadWebhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "customerName": "Test User",
    "email": "test@example.com",
    "phone": "5555551234",
    "address": "123 Test St",
    "city": "Austin",
    "state": "TX",
    "zip": "78701"
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "leadId": "xyz789...",
  "message": "Lead created successfully",
  "usage": {
    "requestsThisHour": 1,
    "hourlyLimit": 100,
    "requestsThisDay": 1,
    "dailyLimit": 1000
  }
}
```

**Checkpoint:** ✅ API key authentication working

---

### 8. Test Rate Limiting

```bash
# Send 15 requests quickly (development limit is 10/minute)
for i in {1..15}; do
  curl -X POST \
    "https://us-central1-${PROJECT_ID}.cloudfunctions.net/secureLeadWebhook" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"customerName\":\"Test $i\",\"email\":\"test$i@example.com\",\"phone\":\"555000$i\",\"address\":\"123 Main\",\"city\":\"Austin\",\"state\":\"TX\",\"zip\":\"78701\"}"
  echo ""
done
```

**Expected:** First 10 succeed, 11+ should return:
```json
{
  "success": false,
  "error": "Rate limit: requests per minute exceeded"
}
```

**Checkpoint:** ✅ Rate limiting working correctly

---

### 9. Verify Firestore Data

1. Go to Firebase Console → Firestore Database
2. Check collections exist:
   - ✅ `apiKeys` - Should have your test key
   - ✅ `apiKeyUsageLogs` - Should have request logs
   - ✅ `leads` - Should have test leads created

3. Verify API key document:
   - Key field is hashed (not plain text)
   - Status is "active"
   - Usage stats are incrementing
   - Timestamps are present

**Checkpoint:** ✅ Data stored correctly

---

### 10. Test Scheduled Cleanup Function

The `cleanupApiKeys` function runs automatically at midnight. To test manually:

```bash
# Trigger the scheduled function manually
gcloud scheduler jobs run cleanupApiKeys \
  --location=us-central1 \
  --project=${PROJECT_ID}
```

Or wait for automatic execution and check logs:
```bash
firebase functions:log --only cleanupApiKeys
```

**Checkpoint:** ✅ Cleanup function configured

---

## 🔍 Verification Checklist

### Core Functionality
- [ ] ✅ API keys can be created
- [ ] ✅ API keys are hashed in storage
- [ ] ✅ API keys can authenticate requests
- [ ] ✅ Scopes are enforced
- [ ] ✅ Rate limiting works
- [ ] ✅ Usage is tracked
- [ ] ✅ Logs are created
- [ ] ✅ Keys can be revoked
- [ ] ✅ Keys can be rotated
- [ ] ✅ Keys can be updated

### Security
- [ ] ✅ Firestore rules deployed
- [ ] ✅ Users can only see their own keys
- [ ] ✅ Keys are hashed (not plain text)
- [ ] ✅ Unauthorized requests are rejected
- [ ] ✅ Invalid keys are rejected
- [ ] ✅ Rate limits are enforced

### Monitoring
- [ ] ✅ Function logs are visible
- [ ] ✅ Usage logs are created
- [ ] ✅ Errors are logged
- [ ] ✅ Firestore indexes are working

## 🎯 Post-Deployment

### Immediate Tasks
- [ ] Create production API keys
- [ ] Document API for partners
- [ ] Set up monitoring dashboard
- [ ] Configure alerts for rate limits
- [ ] Train team on key management

### This Week
- [ ] Build admin dashboard
- [ ] Integrate with existing endpoints
- [ ] Test with partner integrations
- [ ] Set up usage analytics
- [ ] Create partner onboarding docs

### This Month
- [ ] Review usage patterns
- [ ] Optimize rate limits
- [ ] Set up automated reporting
- [ ] Implement billing (if needed)
- [ ] Conduct security audit

## 🐛 Troubleshooting

### Functions Won't Deploy

**Error:** `Permission denied`
```bash
# Make sure you're logged in and have permissions
firebase login
firebase projects:list
firebase use <project-id>
```

**Error:** `TypeScript compilation failed`
```bash
cd functions
npm run build
# Fix any TypeScript errors shown
```

---

### API Key Creation Fails

**Error:** `Permission denied` or `Unauthenticated`
```bash
# Check if user is authenticated
# In browser console:
const user = getAuth().currentUser;
console.log(user);
```

**Error:** `Missing required fields`
```javascript
// Ensure all required fields are provided:
{
  name: "Required",
  scopes: ["at_least_one_required"],
  // Other fields optional
}
```

---

### Rate Limiting Not Working

**Issue:** Requests don't get rate limited

1. Check if usage stats are incrementing:
```javascript
// Get API key document from Firestore
// Check usageStats.requestsThisMinute field
```

2. Check system time is synchronized:
```bash
# Time-based counters rely on accurate timestamps
date
```

---

### Firestore Rules Blocking Access

**Error:** `Permission denied`

1. Verify rules are deployed:
```bash
firebase deploy --only firestore:rules
```

2. Test rules in Firebase Console:
   - Go to Firestore → Rules
   - Use "Rules Playground" to test access

3. Check user authentication:
```javascript
const user = getAuth().currentUser;
console.log("User UID:", user?.uid);
// User UID must match document's userId field
```

---

## 📊 Success Metrics

### After 24 Hours
- [ ] No deployment errors
- [ ] API keys created: > 0
- [ ] API requests made: > 0
- [ ] Rate limits working: Yes
- [ ] Security rules working: Yes
- [ ] No security violations: Yes

### After 1 Week
- [ ] Partner integrations tested
- [ ] Admin dashboard working
- [ ] Monitoring set up
- [ ] Team trained
- [ ] Documentation reviewed

### After 1 Month
- [ ] Usage patterns analyzed
- [ ] Rate limits optimized
- [ ] Partner feedback collected
- [ ] Security audit completed
- [ ] Performance benchmarked

## 🎓 Next Steps

1. **Read Documentation**
   - [ ] `API_KEY_SYSTEM.md` - Complete reference
   - [ ] `QUICK_START.md` - Getting started guide
   - [ ] `CLIENT_SDK_EXAMPLE.md` - Integration examples

2. **Build Dashboard**
   - [ ] Use React components from documentation
   - [ ] Display all user's API keys
   - [ ] Show usage statistics
   - [ ] Enable key management (create/revoke/rotate)

3. **Integrate with Existing Endpoints**
   - [ ] Add API key auth to other HTTP functions
   - [ ] Use `validateApiKeyFromRequest()` helper
   - [ ] See `secureLeadWebhook.ts` for examples

4. **Set Up Monitoring**
   - [ ] Firebase Console → Functions → Dashboard
   - [ ] Set up error alerts
   - [ ] Monitor rate limit hits
   - [ ] Track usage trends

5. **Partner Onboarding**
   - [ ] Create partner documentation
   - [ ] Set up self-service API key creation
   - [ ] Provide integration examples
   - [ ] Offer support channels

## ✅ Deployment Complete!

If all checkpoints passed:
- ✅ Code deployed
- ✅ Rules deployed
- ✅ Indexes created
- ✅ API keys working
- ✅ Security enforced
- ✅ Rate limiting active
- ✅ Logs being captured

**Status: Production Ready** 🚀

---

**Need Help?**
- Check `functions/API_KEY_SYSTEM.md` for detailed docs
- Review `functions/QUICK_START.md` for examples
- Check Firebase Console logs for errors
- Review source code in `functions/src/apiKeys.ts`
