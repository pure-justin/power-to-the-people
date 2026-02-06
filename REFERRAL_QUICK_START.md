# 🚀 Referral System - Quick Start Guide

## For Users

### How to Share Your Referral Link

1. **Get Your Link**
   ```
   Visit: https://yourdomain.com/referrals
   Click "Copy Link" button
   Your link: https://yourdomain.com/qualify?ref=YOURCODE
   ```

2. **Share It**
   - **Email**: Click "Email" button for pre-formatted message
   - **Text**: Click "Text" button to send via SMS
   - **Social**: Copy and paste to Facebook, Twitter, etc.
   - **Direct**: Copy link and share anywhere

3. **Track Your Earnings**
   ```
   Dashboard shows:
   - Total referrals
   - Qualified referrals  
   - Installed systems
   - Total earnings ($$$)
   - Pending payout
   ```

### How You Earn

| Step | Action | You Earn |
|------|--------|----------|
| 1️⃣ | Friend signs up | $0 |
| 2️⃣ | Site survey scheduled | **$50** |
| 3️⃣ | System installed | **$450** |
| 💰 | **Total per referral** | **$500** |

### When You Get Paid

- **Minimum**: $100 pending earnings
- **When**: Automatic payouts every Monday
- **Method**: Direct deposit (setup in portal)
- **Timeline**: 3-5 business days

## For Developers

### Quick Setup (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Deploy Cloud Functions
cd functions
npm run build
firebase deploy --only functions

# 3. Deploy Firestore rules
firebase deploy --only firestore:rules

# 4. Configure webhook secrets
firebase functions:config:set webhook.secret="$(openssl rand -hex 32)"
firebase functions:config:set webhook.api_key="$(openssl rand -hex 32)"

# 5. Test it
npm run dev
# Visit http://localhost:5174/referrals
```

### Add Referral to Signup Form

```javascript
import { validateReferralCode, trackReferral } from './services/referralService';

// 1. Get referral code from URL
const urlParams = new URLSearchParams(window.location.search);
const referralCode = urlParams.get('ref');

// 2. Validate code (optional - show referrer name)
if (referralCode) {
  const referrer = await validateReferralCode(referralCode);
  if (referrer) {
    console.log(`Referred by ${referrer.displayName}`);
  }
}

// 3. Track referral on signup
await trackReferral(referralCode, {
  email: userEmail,
  name: userName,
  phone: userPhone,
  address: userAddress,
  projectId: projectId,
});
```

### Display User Dashboard

```jsx
import ReferralDashboard from './components/ReferralDashboard';

function ReferralsPage() {
  const user = getCurrentUser();
  
  return (
    <div>
      <h1>Referral Program</h1>
      <ReferralDashboard userId={user.uid} />
    </div>
  );
}
```

### Webhook Integration

```bash
# Update referral status from external system
curl -X POST https://us-central1-agentic-labs.cloudfunctions.net/referralStatusWebhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: YOUR_SIGNATURE" \
  -d '{
    "projectId": "PTTP-xxx",
    "status": "installed"
  }'
```

### Generate Webhook Signature

```javascript
const crypto = require('crypto');

function generateWebhookSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

const signature = generateWebhookSignature(
  { projectId: 'PTTP-xxx', status: 'installed' },
  'your-webhook-secret'
);
```

## For Admins

### View System Stats

```javascript
import { getReferralStats } from 'firebase/functions';

const functions = getFunctions();
const getStats = httpsCallable(functions, 'getReferralStats');

const { data } = await getStats();
console.log(data);
// {
//   totalReferrers: 150,
//   totalReferrals: 1200,
//   totalEarnings: 125000,
//   pendingPayouts: 15000,
//   statusCounts: { ... }
// }
```

### Manually Update Referral Status

```javascript
import { updateReferralStatus } from 'firebase/functions';

const functions = getFunctions();
const updateStatus = httpsCallable(functions, 'updateReferralStatusHttp');

await updateStatus({
  trackingId: 'abc123',
  newStatus: 'installed'
});
```

### Process Payouts

Automatic: Every Monday at 9am CT

Manual:
```bash
firebase functions:shell
> processWeeklyPayouts()
```

## Common Tasks

### Check Firestore Data

```bash
# Open Firebase Console
open https://console.firebase.google.com/project/agentic-labs/firestore

# Collections:
- referrals          # User referral records
- referralTracking   # Individual tracking
- payouts            # Payment records
- pendingNotifications  # Notification queue
```

### View Logs

```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only referralStatusWebhook

# Real-time
firebase functions:log --follow
```

### Test Locally

```bash
# Run test suite
node test-referral-system.js

# Start dev server
npm run dev

# Open referrals page
open http://localhost:5174/referrals
```

## Troubleshooting

### Referral Code Invalid
```
✅ Check code exists in Firestore `referrals` collection
✅ Codes are case-sensitive (JOHN123 ≠ john123)
✅ User account must be active
```

### Earnings Not Updating
```
✅ Check Cloud Functions logs: firebase functions:log
✅ Verify project status matches expected milestone
✅ Ensure referralTracking has correct projectId
✅ Milestone can only be completed once
```

### Webhook Fails
```
✅ Verify X-Webhook-Signature header is present
✅ Check signature matches payload + secret
✅ Review webhookLogs collection in Firestore
✅ Try with development mode (no signature)
```

## Resources

- **Full Docs**: See `REFERRAL_SYSTEM.md`
- **Deployment**: See `REFERRAL_DEPLOYMENT.md`
- **Summary**: See `REFERRAL_SYSTEM_SUMMARY.md`
- **Support**: Check Firebase Console → Functions → Logs

## Reward Milestones

```
📝 Sign Up          →  $0    (friend completes form)
                    ↓
✅ Qualified         →  $0    (meets requirements)
                    ↓
🏠 Site Survey      →  $50   (technician visit)
                    ↓
⚡ Installed        →  $450  (system goes live)
                    ↓
💰 TOTAL: $500
```

---

**Need Help?**
- Review logs: `firebase functions:log`
- Check Firestore data in Firebase Console
- See detailed docs: `REFERRAL_SYSTEM.md`
