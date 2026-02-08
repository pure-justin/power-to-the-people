# Referral Tracking System

Complete referral program implementation for Power to the People app with automatic tracking, earnings calculation, and admin management.

## Features

### 🎯 For Users
- **Unique Referral Codes**: Automatically generated when users sign up
- **Easy Sharing**: Copy referral links, share via email/SMS
- **Real-time Tracking**: See all your referrals and their status
- **Earnings Dashboard**: Track earnings across signup, site survey, and installation milestones
- **Leaderboard**: See top referrers and compete for rankings

### 💰 Earnings Structure
| Milestone | Amount | Description |
|-----------|--------|-------------|
| Signup | $0 | Friend completes qualification form |
| Site Survey | $50 | Technician visits their home |
| Installation | $450 | Battery system installed |
| **Total** | **$500** | Per completed installation |

### 🔧 For Admins
- **Referral Manager**: View all referrals in one dashboard
- **Status Updates**: Change referral status to trigger earnings
- **Analytics**: Real-time stats on total referrals, earnings, conversion rates
- **Search & Filter**: Find specific referrals quickly

## Architecture

### Database Collections

#### `referrals` Collection
Stores referrer information and aggregate stats.

```javascript
{
  userId: "user123",
  referralCode: "JOHN123456",
  email: "john@example.com",
  displayName: "John Smith",
  totalReferrals: 12,
  qualifiedReferrals: 8,
  installedReferrals: 3,
  totalEarnings: 1500,
  pendingEarnings: 500,
  paidEarnings: 1000,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `referralTracking` Collection
Tracks individual referrals and their progress.

```javascript
{
  referrerId: "user123",
  referrerCode: "JOHN123456",
  referrerEmail: "john@example.com",
  referredEmail: "jane@example.com",
  referredName: "Jane Doe",
  referredPhone: "(512) 555-1234",
  referredAddress: "123 Main St, Austin, TX",
  projectId: "PTTP-abc123",
  status: "qualified", // signed_up, qualified, site_survey, installed
  earnings: 50,
  earningMilestones: {
    signup: { completed: true, amount: 0, date: Timestamp },
    qualified: { completed: true, amount: 0, date: Timestamp },
    siteSurvey: { completed: true, amount: 50, date: Timestamp },
    installed: { completed: false, amount: 450, date: null }
  },
  qualificationData: { ... },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `payouts` Collection
Tracks payout requests and processing.

```javascript
{
  userId: "user123",
  amount: 500,
  status: "pending", // pending, processing, completed, failed
  method: "direct_deposit",
  requestedAt: Timestamp,
  processedAt: Timestamp
}
```

## Usage

### 1. User Flow

#### Get Referral Code
When a user creates an account, a referral code is automatically generated:
```javascript
import { createReferralRecord } from './services/referralService';

const referralCode = await createReferralRecord(userId, {
  email: user.email,
  displayName: user.displayName
});
// Returns: "JOHN123456"
```

#### Share Referral Link
```javascript
import { generateReferralLink } from './services/referralService';

const link = generateReferralLink(referralCode);
// Returns: "https://yourdomain.com/qualify?ref=JOHN123456"
```

#### Track Referral
When someone uses a referral link and completes qualification:
```javascript
import { trackReferral } from './services/referralService';

await trackReferral(referralCode, {
  email: "jane@example.com",
  name: "Jane Doe",
  phone: "(512) 555-1234",
  address: "123 Main St, Austin, TX",
  projectId: "PTTP-abc123",
  qualificationData: { ... }
});
```

### 2. Admin Flow

#### Update Referral Status
When a referral reaches a milestone:
```javascript
import { updateReferralStatus } from './services/referralService';

// Mark as qualified (no earnings yet)
await updateReferralStatus(trackingId, 'qualified');

// Site survey completed (+$50)
await updateReferralStatus(trackingId, 'site_survey');

// Installation completed (+$450)
await updateReferralStatus(trackingId, 'installed');
```

#### View All Referrals
```javascript
import { getUserReferrals } from './services/referralService';

const referrals = await getUserReferrals(userId);
```

#### Analytics
```javascript
import { getReferralAnalytics } from './services/referralService';

const analytics = await getReferralAnalytics(userId);
// Returns: conversion rates, status breakdown, recent referrals
```

## Components

### User-Facing Components

#### `<Referrals />` - Full Dashboard
Main referral dashboard with:
- Stats overview (earnings, referrals, conversion rate)
- Share section with copy link, email, SMS buttons
- Tabs: Overview, My Referrals, Leaderboard
- Referral code display

Usage:
```jsx
import Referrals from './pages/Referrals';

<Route path="/referrals" element={<Referrals />} />
```

#### `<ReferralWidget />` - Portal Widget
Compact widget for the customer portal:
- Quick stats display
- Referral code
- Copy link button
- Link to full dashboard

Usage:
```jsx
import ReferralWidget from './components/ReferralWidget';

<ReferralWidget />
```

### Admin Components

#### `<ReferralManager />` - Admin Dashboard
Full admin interface with:
- System-wide stats
- Search and filter
- Bulk status updates
- Referral table with all details

Usage:
```jsx
import ReferralManager from './components/ReferralManager';

// In admin page
<ReferralManager />
```

## API Reference

### `referralService.js`

#### `generateReferralCode(name, userId)`
Generates a unique referral code from name and user ID.

#### `createReferralRecord(userId, userData)`
Creates a new referral record for a user.

#### `getReferralData(userId)`
Gets referral data for a specific user.

#### `validateReferralCode(code)`
Validates a referral code and returns referrer info.

#### `trackReferral(referralCode, referredUserData)`
Tracks a new referral signup.

#### `updateReferralStatus(trackingId, newStatus)`
Updates referral status and calculates earnings.

#### `getUserReferrals(userId)`
Gets all referrals made by a user.

#### `processReferralPayout(userId, amount)`
Processes a payout request.

#### `getReferralLeaderboard(limitCount)`
Gets top referrers for leaderboard.

#### `generateReferralLink(referralCode)`
Generates a shareable referral link.

#### `getReferralAnalytics(userId)`
Gets detailed analytics for a user.

## Integration with Qualify Form

The qualification form automatically:
1. Detects `?ref=CODE` in URL
2. Validates the referral code
3. Shows referrer info if valid
4. Tracks the referral on form submission

Example URL: `https://yourdomain.com/qualify?ref=JOHN123456`

## Security

### Firestore Rules
Add the rules from `firestore-referral-rules.rules` to your Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

Key security features:
- Users can only read their own referral data
- Only admins can update referral status
- Referral tracking is append-only (no deletes)
- Payout records are protected

### Data Privacy
- Leaderboard anonymizes names (J***S.)
- Referral emails are only visible to admins
- Personal data is not exposed in public APIs

## Testing

### Test Referral Flow

1. Create a user account
2. Get referral code from `/referrals` page
3. Open incognito window with referral link
4. Complete qualification form
5. Check referral dashboard - should see new referral with "Signed Up" status

### Test Admin Flow

1. Log in as admin
2. Navigate to admin panel
3. Find the test referral
4. Update status to "site_survey"
5. Check referrer's earnings - should increase by $50
6. Update to "installed"
7. Earnings should increase by $450 (total $500)

## Deployment

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 2. Create Firestore Indexes
Create the following composite indexes in Firestore:

**referralTracking Collection:**
- `referrerId` (Ascending) + `createdAt` (Descending)
- `status` (Ascending) + `createdAt` (Descending)

**referrals Collection:**
- `installedReferrals` (Descending) + `qualifiedReferrals` (Descending)

### 3. Update Environment
No additional environment variables needed - uses existing Firebase config.

## Future Enhancements

### Planned Features
- [ ] Email notifications on referral milestones
- [ ] Automated payout processing via Stripe
- [ ] Social media sharing integration
- [ ] Referral contests and bonus campaigns
- [ ] Multi-tier referral programs
- [ ] Referral performance graphs
- [ ] CSV export of referral data

### Nice to Have
- [ ] QR code generation for referral links
- [ ] Custom referral code selection
- [ ] Referral landing page builder
- [ ] A/B testing for referral messaging
- [ ] Integration with CRM systems

## Support

For questions or issues:
1. Check the code comments in `src/services/referralService.js`
2. Review the component source code
3. Test in Firebase Emulator for debugging
4. Check Firestore console for data issues

## License

Part of the Power to the People app - Internal use only.
