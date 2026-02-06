# Referral System - Setup & Deployment Guide

## 🚀 Quick Start

The referral system is **fully implemented** and ready to use. This guide covers deployment and configuration.

## 📋 Prerequisites

- Firebase project set up
- Firestore database created
- Admin account created (use `scripts/create-admin.js`)

## 🔥 Firestore Security Rules

Add these rules to your Firebase console (`Firestore Database > Rules`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null &&
                     (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }

    // Referrals - users can only read their own
    match /referrals/{userId} {
      allow read: if request.auth != null &&
                     (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null &&
                     (request.auth.uid == userId || isAdmin());
      allow create: if request.auth != null;
    }

    // Referral tracking - users can read their referrals
    match /referralTracking/{trackingId} {
      allow read: if request.auth != null &&
                    (resource.data.referrerId == request.auth.uid || isAdmin());
      allow write: if isAdmin();
      allow create: if true; // Allow anonymous creation during signup
    }

    // Referral clicks - public for tracking
    match /referralClicks/{clickId} {
      allow read, write: if true;
    }

    // Pending notifications - admin only
    match /pendingNotifications/{notificationId} {
      allow read, write: if isAdmin();
    }

    // Payouts - users can read their own
    match /payouts/{payoutId} {
      allow read: if request.auth != null &&
                    (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if isAdmin();
    }

    // Projects - users can read their own
    match /projects/{projectId} {
      allow read: if request.auth != null &&
                    (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if isAdmin();
      allow create: if true; // Allow anonymous creation during qualification
    }
  }
}
```

## 📊 Firestore Indexes

Create these composite indexes in Firebase console (`Firestore Database > Indexes`):

### Index 1: Referral Leaderboard
- Collection: `referrals`
- Fields:
  - `installedReferrals` (Descending)
  - `qualifiedReferrals` (Descending)
- Query scope: Collection

### Index 2: Referral Tracking by User
- Collection: `referralTracking`
- Fields:
  - `referrerId` (Ascending)
  - `createdAt` (Descending)
- Query scope: Collection

### Index 3: Top Referrers by Earnings
- Collection: `referrals`
- Fields:
  - `totalEarnings` (Descending)
- Query scope: Collection

## 🧪 Testing the System

### 1. Create a Test Referrer Account

```bash
# Create admin account first (if not exists)
node scripts/create-admin.js

# Then create a test user account via the UI at /portal
```

### 2. Get Your Referral Code

1. Sign in at `/portal`
2. Navigate to `/referrals`
3. Your code will be displayed at the top (format: `JOHN5X8K9Q`)

### 3. Test the Referral Flow

1. Copy your referral link (e.g., `https://localhost:5178/qualify?ref=JOHN5X8K9Q`)
2. Open in incognito/private browser window
3. Complete the qualification form
4. Check `/admin` > Referrals tab to see the tracked referral
5. Update status to test earnings:
   - `qualified` → +$0
   - `site_survey` → +$50
   - `installed` → +$450

### 4. Run Automated Tests

```bash
node test-referral-system.js
```

Expected output:
```
🧪 Testing Referral System...

✅ Test 1: Generate Referral Code
✅ Test 2: Create Referral Record
✅ Test 3: Validate Referral Code
✅ Test 4: Track Referral
✅ Test 5: Update Status to Qualified
✅ Test 6: Update Status to Site Survey
✅ Test 7: Update Status to Installed
✅ Test 8: Analytics Calculation
✅ Test 9: Milestone Tracking
✅ Test 10: Referral Link Generation

🎉 All Tests Passed!
```

## 🎯 Features Checklist

- [x] Referral code generation
- [x] Referral link sharing (email, SMS, social media)
- [x] Referral tracking (signup → qualified → site survey → installed)
- [x] Earnings calculation ($50 + $450 = $500 per referral)
- [x] Analytics dashboard with conversion funnel
- [x] Milestone rewards (1, 5, 10, 25, 50, 100 referrals)
- [x] Leaderboard
- [x] Admin panel for managing referrals
- [x] CSV export
- [x] QR code generation
- [x] Social sharing templates
- [ ] Email notifications (requires Cloud Functions - see below)
- [ ] Automated payouts (requires payment integration)

## 📧 Email Notifications Setup (Optional)

Email notifications are prepared but require Cloud Functions deployment.

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Functions

```bash
cd ~/Projects/power-to-the-people
firebase init functions
# Choose JavaScript/TypeScript
# Install dependencies
```

### Step 3: Create Email Function

Create `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();
sgMail.setApiKey(functions.config().sendgrid.key);

exports.sendReferralEmail = functions.firestore
  .document('pendingNotifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();

    if (notification.sent) return;

    try {
      await sgMail.send({
        to: notification.email,
        from: 'noreply@powertothepeopleapp.com',
        subject: notification.subject,
        text: notification.body,
      });

      await snap.ref.update({ sent: true });
      console.log('Email sent to:', notification.email);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  });
```

### Step 4: Configure SendGrid

```bash
# Get SendGrid API key from https://sendgrid.com
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
```

### Step 5: Deploy

```bash
firebase deploy --only functions
```

## 💳 Payment Integration (Optional)

For automated payouts, integrate Stripe Connect:

### Step 1: Create Stripe Account

1. Sign up at https://stripe.com
2. Get API keys from Dashboard > Developers > API keys

### Step 2: Add Stripe to Functions

```javascript
const stripe = require('stripe')(functions.config().stripe.secret);

exports.processReferralPayout = functions.firestore
  .document('payouts/{payoutId}')
  .onCreate(async (snap, context) => {
    const payout = snap.data();

    try {
      // Create Stripe payout
      const transfer = await stripe.transfers.create({
        amount: payout.amount * 100, // Convert to cents
        currency: 'usd',
        destination: payout.stripeAccountId,
      });

      await snap.ref.update({
        status: 'completed',
        stripeTransferId: transfer.id,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      await snap.ref.update({ status: 'failed', error: error.message });
    }
  });
```

## 🔗 Integration with Existing Flow

### Qualify Page

Referral tracking is **already integrated** in `src/pages/Qualify.jsx`:

```javascript
// Referral code is captured from URL parameter
const referralCode = searchParams.get('ref');

// On form submission
if (referralCode) {
  await trackReferral(referralCode, {
    email: formData.email,
    name: `${formData.firstName} ${formData.lastName}`,
    phone: formData.phone,
    address: formData.address,
    projectId: projectId,
    qualificationData: formData
  });
}
```

### Admin Panel

Admins can update referral status from `/admin` > Referrals tab:

1. View all referrals
2. Filter by status
3. Search by name/email
4. Update status (triggers earnings calculation)
5. Export to CSV

### Portal Integration

Add referral link to customer portal:

```jsx
// In src/pages/Portal.jsx
<Link to="/referrals">
  <Gift size={20} />
  Refer & Earn
</Link>
```

## 📈 Analytics & Reporting

### User Dashboard

Users can view at `/referrals`:
- Total earnings (pending + paid)
- Number of referrals by status
- Conversion rate
- Next milestone progress
- Recent referrals
- Leaderboard position

### Admin Dashboard

Admins can view at `/admin` > Referrals:
- Total system referrals
- Total payouts
- Pending payouts
- Conversion funnel
- Top referrers
- Export all data to CSV

## 🐛 Troubleshooting

### Referral Not Tracking

1. Check browser console for errors
2. Verify Firebase connection
3. Ensure referral code is valid (exists in `referrals` collection)
4. Check Firestore rules allow anonymous writes to `referralTracking`

### Earnings Not Updating

1. Verify status update completed (check Firestore)
2. Check `earningMilestones` in tracking document
3. Ensure milestone hasn't already been completed
4. Check admin permissions

### QR Code Not Downloading

1. Check internet connection (uses external API)
2. Verify referral code is valid
3. Check browser download settings

## 🚨 Security Considerations

1. **Rate Limiting**: Add Firebase App Check to prevent abuse
2. **Duplicate Detection**: System automatically prevents duplicate referrals
3. **Fraud Detection**: Monitor for suspicious patterns (same IP, rapid signups)
4. **Payout Verification**: Require manual approval for large payouts

## 📱 Mobile Integration

For mobile app integration:

```swift
// iOS - Deep Link Handler
func application(_ application: UIApplication,
                continue userActivity: NSUserActivity,
                restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    guard let url = userActivity.webpageURL else { return false }

    // Extract referral code from URL
    if let ref = URLComponents(url: url, resolvingAgainstBaseURL: true)?
        .queryItems?.first(where: { $0.name == "ref" })?.value {
        UserDefaults.standard.set(ref, forKey: "referralCode")
    }

    return true
}
```

## 🎉 Launch Checklist

Before launching the referral program:

- [ ] Test complete flow (signup → installed)
- [ ] Configure Firestore security rules
- [ ] Create composite indexes
- [ ] Set up email notifications (optional)
- [ ] Configure payment system (optional)
- [ ] Create promotional materials
- [ ] Train support team on referral system
- [ ] Monitor analytics daily
- [ ] Set up fraud detection alerts

## 📞 Support

For issues or questions:
- Technical: Check Firebase console logs
- Feature requests: Create GitHub issue
- Urgent: Contact admin team

## 🔄 Updates & Maintenance

### Weekly Tasks
- Review pending payouts
- Check for stuck referrals
- Monitor conversion rates
- Update leaderboard

### Monthly Tasks
- Analyze referral performance
- Optimize messaging templates
- Review fraud patterns
- Plan milestone bonuses

---

**Last Updated**: February 6, 2026
**Version**: 1.0.0
**Status**: ✅ Production Ready
