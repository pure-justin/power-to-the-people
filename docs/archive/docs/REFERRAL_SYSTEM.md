# Referral System Documentation

## Overview

The Power to the People referral system is a comprehensive customer acquisition and retention tool that rewards users for referring friends and family. The system tracks referrals through multiple stages and provides financial incentives at key milestones.

## Features

### 1. **Referral Code Generation**
- Unique referral codes automatically generated for each user
- Format: `[FIRSTNAME][LAST_6_CHARS_OF_UID]` (e.g., `JOHN5X8K9Q`)
- Codes are created when user signs up
- Codes are permanent and tied to user account

### 2. **Referral Tracking**
- Real-time tracking of referral status
- Multi-stage funnel:
  - **Signed Up**: Referred user completes qualification form (0 earnings)
  - **Qualified**: Referred user approved for program (0 earnings)
  - **Site Survey**: Technician visits referred user's home ($50 earned)
  - **Installed**: Battery system installed at referred user's home ($450 earned)

### 3. **Earnings Structure**
- **Site Survey Completion**: $50
- **Installation Completion**: $450
- **Total Per Referral**: $500

### 4. **Milestone Rewards**
- 1st referral installed: First Referral Badge
- 5 referrals installed: $100 Bonus
- 10 referrals installed: Bronze Status
- 25 referrals installed: $500 Bonus
- 50 referrals installed: Silver Status
- 100 referrals installed: $2,000 Bonus

### 5. **Social Sharing**
- One-click sharing to:
  - Email
  - SMS
  - Facebook
  - Twitter
  - LinkedIn
  - Native mobile share
- Pre-written messages (short, medium, long)
- Custom message composer
- QR code generation for print materials

### 6. **Analytics Dashboard**
- Conversion funnel visualization
- Performance metrics:
  - Conversion rate (signup to qualified)
  - Install rate (qualified to installed)
  - Average earnings per referral
- Real-time progress tracking
- Milestone progress bars
- Weekly/monthly/all-time views

### 7. **Admin Management**
- View all referrals across all users
- Filter by status, search by name/email
- Update referral status
- Export referral data to CSV
- View top referrers leaderboard
- Track total payouts and pending earnings

## Architecture

### Firebase Collections

#### `referrals`
Stores referrer information and aggregate stats.

```javascript
{
  userId: string,
  referralCode: string,
  email: string,
  displayName: string,
  totalReferrals: number,
  qualifiedReferrals: number,
  installedReferrals: number,
  totalEarnings: number,
  pendingEarnings: number,
  paidEarnings: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `referralTracking`
Tracks individual referral records.

```javascript
{
  referrerId: string,
  referrerCode: string,
  referrerEmail: string,
  referredEmail: string,
  referredName: string,
  referredPhone: string,
  referredAddress: string,
  projectId: string,
  status: 'signed_up' | 'qualified' | 'site_survey' | 'installed',
  qualificationData: object,
  earnings: number,
  earningMilestones: {
    signup: { completed: boolean, amount: number, date: Date },
    qualified: { completed: boolean, amount: number, date: Date },
    siteSurvey: { completed: boolean, amount: number, date: Date },
    installed: { completed: boolean, amount: number, date: Date }
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `referralClicks`
Analytics tracking for referral link clicks.

```javascript
{
  referralCode: string,
  source: string, // 'facebook', 'twitter', 'email', 'direct'
  timestamp: timestamp,
  userAgent: string,
  referrer: string
}
```

#### `pendingNotifications`
Queue for email notifications (processed by batch job).

```javascript
{
  email: string,
  type: string, // 'referralSignup', 'referralQualified', etc.
  subject: string,
  body: string,
  sent: boolean,
  createdAt: timestamp
}
```

### Services

#### `referralService.js`
Core referral logic and Firestore operations.

**Key Functions:**
- `generateReferralCode(name, userId)` - Creates unique referral code
- `createReferralRecord(userId, userData)` - Initializes referrer account
- `getReferralData(userId)` - Fetches referrer stats
- `validateReferralCode(code)` - Checks if code is valid
- `trackReferral(referralCode, referredUserData)` - Records new referral
- `updateReferralStatus(trackingId, newStatus)` - Updates status and earnings
- `getUserReferrals(userId)` - Gets all referrals for a user
- `processReferralPayout(userId, amount)` - Initiates payout
- `getReferralLeaderboard(limitCount)` - Gets top referrers
- `generateReferralLink(referralCode)` - Creates shareable URL
- `getReferralAnalytics(userId)` - Calculates performance metrics

#### `referralNotificationService.js`
Email notification system for referral events.

**Email Templates:**
- `referralSignup` - New referral signed up
- `referralQualified` - Referral qualified for program
- `referralSiteSurvey` - Site survey completed ($50 earned)
- `referralInstalled` - Installation complete ($450 earned)
- `milestoneReached` - Milestone bonus unlocked
- `payoutProcessed` - Payout completed
- `weeklyDigest` - Weekly summary email

**Key Functions:**
- `sendReferralNotification(type, recipientEmail, data)` - Sends email
- `checkMilestones(userId, installedCount)` - Checks for milestone bonuses
- `notifyReferralStatusChange(...)` - Automated status notifications
- `sendWeeklyDigest(userId, referrerEmail, stats)` - Weekly summary
- `notifyPayoutProcessed(...)` - Payout confirmation
- `generateSocialContent(referralCode, platform)` - Social media posts
- `trackReferralClick(referralCode, source)` - Analytics tracking

### Components

#### `ReferralDashboard.jsx`
Enhanced analytics dashboard with:
- Timeframe selector (all time, month, week)
- Next milestone progress
- Conversion funnel visualization
- Performance metrics
- Quick stats breakdown

#### `ReferralSocialShare.jsx`
Comprehensive social sharing interface:
- Quick copy referral link
- Platform-specific share buttons
- Pre-written messages (3 lengths)
- Custom message composer
- QR code download

#### `ReferralAdminPanel.jsx`
Admin interface for managing referrals:
- Search and filter referrals
- Update referral status
- Export to CSV
- View top referrers
- Track total payouts

### Pages

#### `Referrals.jsx`
User-facing referral portal with tabs:
- **Overview**: Quick stats, earning breakdown, recent activity
- **Analytics**: Detailed dashboard with metrics
- **Share**: Social sharing tools
- **My Referrals**: Full table of all referrals
- **Leaderboard**: Top referrers ranking

#### `Admin.jsx` (Enhanced)
Added referrals tab to existing admin dashboard:
- View all system referrals
- Manage referral statuses
- Track earnings and payouts

## Integration

### Qualify Page Integration

The referral tracking is automatically integrated into the qualification flow:

1. User visits `/qualify?ref=JOHN5X8K9Q`
2. Referral code is captured from URL parameter
3. When user submits qualification form, referral is tracked:

```javascript
// In Qualify.jsx
const referralCode = new URLSearchParams(window.location.search).get('ref');

// On form submit
if (referralCode) {
  await trackReferral(referralCode, {
    email: formData.email,
    name: formData.name,
    phone: formData.phone,
    address: formData.address,
    projectId: projectId,
    qualificationData: formData
  });
}
```

### Status Updates

When admin updates project status, referral status should be updated:

```javascript
// Example integration in admin panel
import { updateReferralStatus } from '../services/referralService';

// When project moves to site survey
await updateReferralStatus(trackingId, 'site_survey');

// When installation completes
await updateReferralStatus(trackingId, 'installed');
```

## API Endpoints (Future)

For production deployment, consider creating Cloud Functions:

### `sendReferralEmail`
```javascript
exports.sendReferralEmail = functions.https.onCall(async (data, context) => {
  // Send email via SendGrid/Mailgun
  // Triggered by referralNotificationService
});
```

### `processReferralPayout`
```javascript
exports.processReferralPayout = functions.firestore
  .document('payouts/{payoutId}')
  .onCreate(async (snap, context) => {
    // Integrate with Stripe/PayPal for payouts
    // Update payout status
  });
```

### `generateReferralReport`
```javascript
exports.generateReferralReport = functions.https.onCall(async (data, context) => {
  // Generate PDF report of referral activity
  // Email to admin
});
```

## Security Rules

Add Firestore security rules to protect referral data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Referrals - users can only read their own
    match /referrals/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null &&
                     (request.auth.uid == userId ||
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // Referral tracking - users can read their referrals
    match /referralTracking/{trackingId} {
      allow read: if request.auth != null &&
                    (resource.data.referrerId == request.auth.uid ||
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow write: if request.auth != null &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Referral clicks - public read for analytics
    match /referralClicks/{clickId} {
      allow read, write: if true; // Public for tracking
    }
  }
}
```

## Testing

### Manual Testing Checklist

- [ ] Generate referral code on user signup
- [ ] Share referral link via email
- [ ] Share referral link via SMS
- [ ] Share referral link via social media
- [ ] Track referral when referred user signs up
- [ ] Update status to qualified
- [ ] Update status to site_survey (verify $50 earned)
- [ ] Update status to installed (verify $450 earned)
- [ ] Check milestone badge appears at 1st install
- [ ] Verify leaderboard updates correctly
- [ ] Export referrals to CSV
- [ ] Test QR code download
- [ ] Verify conversion funnel calculations
- [ ] Test admin panel status updates

### Automated Tests (Future)

```javascript
describe('Referral System', () => {
  test('generates unique referral code', () => {
    const code = generateReferralCode('John Doe', 'abc123xyz789');
    expect(code).toBe('JOHNYZ789');
  });

  test('tracks referral correctly', async () => {
    const result = await trackReferral('TEST123', {
      email: 'test@example.com',
      name: 'Test User',
      projectId: 'proj123'
    });
    expect(result.trackingId).toBeDefined();
  });

  test('calculates earnings correctly', async () => {
    await updateReferralStatus('track123', 'site_survey');
    const data = await getReferralData('user123');
    expect(data.pendingEarnings).toBe(50);
  });
});
```

## Future Enhancements

1. **Automated Email Notifications**
   - Set up SendGrid/Mailgun integration
   - Batch process pending notifications
   - Weekly digest emails

2. **Payment Integration**
   - Stripe Connect for payouts
   - Automatic payout threshold ($100 minimum)
   - Multiple payout methods (direct deposit, PayPal, check)

3. **Referral Tiers**
   - Bronze/Silver/Gold status levels
   - Higher earnings rates for top referrers
   - Exclusive perks and bonuses

4. **Advanced Analytics**
   - Geographic heat maps
   - Time-series charts
   - A/B testing for messaging
   - ROI calculations

5. **Gamification**
   - Achievement badges
   - Referral challenges/contests
   - Social proof ("10 people just earned $50!")

6. **Mobile App Integration**
   - Native share sheet support
   - Push notifications for status updates
   - In-app referral dashboard

7. **Marketing Tools**
   - Customizable landing pages
   - Personalized referral videos
   - Email templates for mass outreach

## Support

For questions or issues with the referral system:
- Technical issues: Check Firebase console logs
- Feature requests: Add to GitHub issues
- Payout questions: Contact finance team

## Changelog

### v1.0.0 (2026-02-06)
- Initial referral system implementation
- Referral code generation and tracking
- Earnings calculation and milestone rewards
- Social sharing components
- Analytics dashboard
- Admin management panel
- Email notification templates (pending Cloud Function deployment)
