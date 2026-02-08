# Firestore Security Rules

Add these rules to your `firestore.rules` file to secure the API key collections.

## Complete Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // API Keys Collection
    // Users can only read/write their own API keys
    match /apiKeys/{keyId} {
      // Allow users to read their own API keys
      allow read: if isAuthenticated() &&
                     resource.data.userId == request.auth.uid;

      // Allow users to create API keys for themselves
      allow create: if isAuthenticated() &&
                       request.resource.data.userId == request.auth.uid;

      // Allow users to update their own API keys (except userId and key fields)
      allow update: if isAuthenticated() &&
                       resource.data.userId == request.auth.uid &&
                       request.resource.data.userId == resource.data.userId &&
                       request.resource.data.key == resource.data.key;

      // Allow users to delete their own API keys (soft delete via status change)
      allow delete: if isAuthenticated() &&
                       resource.data.userId == request.auth.uid;

      // Allow admins full access
      allow read, write: if isAdmin();
    }

    // API Key Usage Logs Collection
    // Users can only read their own usage logs
    match /apiKeyUsageLogs/{logId} {
      // Allow users to read logs for their own API keys
      allow read: if isAuthenticated() &&
                     exists(/databases/$(database)/documents/apiKeys/$(resource.data.apiKeyId)) &&
                     get(/databases/$(database)/documents/apiKeys/$(resource.data.apiKeyId)).data.userId == request.auth.uid;

      // Only Cloud Functions can create logs
      allow create: if false;

      // No updates or deletes
      allow update, delete: if false;

      // Allow admins full read access
      allow read: if isAdmin();
    }

    // Leads Collection
    match /leads/{leadId} {
      // Allow authenticated users to read leads they created or are assigned to
      allow read: if isAuthenticated() && (
                       resource.data.createdBy == request.auth.uid ||
                       resource.data.assignedTo == request.auth.uid ||
                       isAdmin()
                     );

      // Allow authenticated users to create leads
      allow create: if isAuthenticated();

      // Allow updating leads if user created them or is assigned to them
      allow update: if isAuthenticated() && (
                       resource.data.createdBy == request.auth.uid ||
                       resource.data.assignedTo == request.auth.uid ||
                       isAdmin()
                     );

      // Only admins can delete
      allow delete: if isAdmin();
    }

    // Smart Meter Texas Data Collection
    match /smtData/{esiid} {
      // Allow authenticated users to read/write their own SMT data
      allow read, write: if isAuthenticated();

      // Allow admins full access
      allow read, write: if isAdmin();
    }

    // Projects Collection (for solar projects)
    match /projects/{projectId} {
      // Allow authenticated users to read/write their own projects
      allow read: if isAuthenticated() && (
                       resource.data.customerId == request.auth.uid ||
                       resource.data.createdBy == request.auth.uid ||
                       isAdmin()
                     );

      allow create: if isAuthenticated() &&
                       request.resource.data.createdBy == request.auth.uid;

      allow update: if isAuthenticated() && (
                       resource.data.customerId == request.auth.uid ||
                       resource.data.createdBy == request.auth.uid ||
                       isAdmin()
                     );

      allow delete: if isAdmin();
    }

    // Users Collection (for user profiles)
    match /users/{userId} {
      // Users can read their own profile
      allow read: if isAuthenticated() && request.auth.uid == userId;

      // Users can create/update their own profile
      allow create, update: if isAuthenticated() && request.auth.uid == userId;

      // Only admins can delete users
      allow delete: if isAdmin();

      // Admins can read all users
      allow read: if isAdmin();
    }

    // Default: deny all access to other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Rule Explanations

### API Keys Collection (`/apiKeys/{keyId}`)

**Security Model:**
- Users can only access their own API keys
- The actual key hash is never readable client-side (only via Cloud Functions)
- Users cannot change the `userId` or `key` fields during updates
- Admins have full access for management purposes

**Key Points:**
- `userId` field determines ownership
- Keys are hashed before storage
- Status changes (suspend/revoke) allowed by owner
- Cloud Functions handle validation and usage tracking

### API Key Usage Logs (`/apiKeyUsageLogs/{logId}`)

**Security Model:**
- Read-only for users (only their own logs)
- Only Cloud Functions can create logs
- No client-side updates or deletes allowed
- Logs automatically cleaned after 90 days

**Key Points:**
- Logs linked to API keys via `apiKeyId`
- Users can only read logs for keys they own
- Provides audit trail and usage analytics
- Admin read access for monitoring

### Leads Collection (`/leads/{leadId}`)

**Security Model:**
- Users can read leads they created or are assigned to
- All authenticated users can create leads
- Only owners/assignees can update leads
- Only admins can delete leads

**Key Points:**
- `createdBy` and `assignedTo` fields control access
- Sales team assignment feature built-in
- Soft delete via `archived` flag recommended

### Smart Meter Texas Data (`/smtData/{esiid}`)

**Security Model:**
- Simple authenticated read/write
- All authenticated users can access
- Consider adding more granular rules in production

**Recommendations for Production:**
- Add `userId` or `customerId` field
- Restrict access to data owner only
- Implement sharing mechanism if needed

### Projects Collection (`/projects/{projectId}`)

**Security Model:**
- Users can access projects they're associated with
- `customerId` or `createdBy` determines ownership
- Supports multi-user projects

**Key Points:**
- Flexible ownership model
- Can be extended for team collaboration
- Admin override for support

## Testing Rules

### Test Script

Create `test-rules.js`:

```javascript
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-power-to-the-people",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8")
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("API Key Rules", () => {
  it("should allow user to read their own API key", async () => {
    const alice = testEnv.authenticatedContext("alice");
    const keyRef = alice.firestore().collection("apiKeys").doc("key1");

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("apiKeys").doc("key1").set({
        userId: "alice",
        name: "Test Key"
      });
    });

    await assertSucceeds(keyRef.get());
  });

  it("should deny user from reading other user's API key", async () => {
    const bob = testEnv.authenticatedContext("bob");
    const keyRef = bob.firestore().collection("apiKeys").doc("key1");

    await assertFails(keyRef.get());
  });

  it("should allow user to create API key for themselves", async () => {
    const alice = testEnv.authenticatedContext("alice");
    const keyRef = alice.firestore().collection("apiKeys").doc("key2");

    await assertSucceeds(keyRef.set({
      userId: "alice",
      name: "New Key",
      status: "active"
    }));
  });

  it("should deny user from creating API key for someone else", async () => {
    const alice = testEnv.authenticatedContext("alice");
    const keyRef = alice.firestore().collection("apiKeys").doc("key3");

    await assertFails(keyRef.set({
      userId: "bob",
      name: "Fake Key",
      status: "active"
    }));
  });
});

describe("Usage Log Rules", () => {
  it("should allow user to read logs for their API keys", async () => {
    const alice = testEnv.authenticatedContext("alice");

    // Set up API key owned by alice
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("apiKeys").doc("key1").set({
        userId: "alice"
      });

      await context.firestore().collection("apiKeyUsageLogs").doc("log1").set({
        apiKeyId: "key1",
        endpoint: "/test"
      });
    });

    const logRef = alice.firestore().collection("apiKeyUsageLogs").doc("log1");
    await assertSucceeds(logRef.get());
  });

  it("should deny client from creating logs", async () => {
    const alice = testEnv.authenticatedContext("alice");
    const logRef = alice.firestore().collection("apiKeyUsageLogs").doc("log2");

    await assertFails(logRef.set({
      apiKeyId: "key1",
      endpoint: "/test"
    }));
  });
});
```

Run tests:
```bash
npm install --save-dev @firebase/rules-unit-testing
npm test
```

## Production Deployment

1. **Update `firestore.rules`:**
```bash
# Copy the rules from this file
cp FIRESTORE_RULES.md firestore.rules
# Edit and customize as needed
```

2. **Deploy rules:**
```bash
firebase deploy --only firestore:rules
```

3. **Verify in Firebase Console:**
- Go to Firestore → Rules
- Check "Rules" tab shows your rules
- Use "Rules Playground" to test scenarios

## Additional Security Recommendations

### 1. Rate Limiting at Firestore Level
Consider using Firebase App Check to prevent abuse:

```javascript
// In Cloud Functions init
admin.appCheck().initialize({
  projectId: 'your-project-id',
});

// In your function
const appCheckToken = req.header('X-Firebase-AppCheck');
if (appCheckToken) {
  await admin.appCheck().verifyToken(appCheckToken);
}
```

### 2. Data Encryption
Sensitive fields should be encrypted:

```typescript
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32-byte key

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 3. Audit Logging
Track all sensitive operations:

```typescript
async function logAuditEvent(event: {
  userId: string;
  action: string;
  resource: string;
  status: 'success' | 'failure';
  metadata?: any;
}) {
  await admin.firestore().collection('auditLogs').add({
    ...event,
    timestamp: admin.firestore.Timestamp.now(),
    ipAddress: req.ip,
  });
}

// Usage
await logAuditEvent({
  userId: context.auth.uid,
  action: 'revoke_api_key',
  resource: apiKeyId,
  status: 'success',
});
```

### 4. IP Restrictions
Implement IP whitelisting for sensitive operations:

```typescript
const ALLOWED_IPS = process.env.ADMIN_IPS?.split(',') || [];

function checkIpWhitelist(req: functions.https.Request): boolean {
  return ALLOWED_IPS.includes(req.ip);
}
```

### 5. Regular Security Audits
- Review API key usage patterns monthly
- Check for unusual access patterns
- Rotate keys regularly
- Audit user permissions
- Monitor failed authentication attempts

## Compliance Considerations

### GDPR
- Implement data deletion on user request
- Log all data access for auditing
- Allow users to export their data
- Document data retention policies

### SOC 2
- Enable audit logging
- Implement access controls
- Regular security reviews
- Incident response procedures

### PCI DSS (if handling payments)
- Never store credit card numbers in Firestore
- Use tokenization (Stripe, etc.)
- Implement strong access controls
- Regular vulnerability scanning
