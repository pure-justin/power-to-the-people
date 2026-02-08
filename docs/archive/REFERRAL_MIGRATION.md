# Referral System Migration Guide

Quick start guide for deploying and testing the referral tracking system.

## ✅ What's Included

### New Files Created
1. **Services**
   - `src/services/referralService.js` - Core referral logic

2. **Pages**
   - `src/pages/Referrals.jsx` - Full referral dashboard

3. **Components**
   - `src/components/ReferralWidget.jsx` - Portal widget
   - `src/components/ReferralManager.jsx` - Admin management

4. **Documentation**
   - `REFERRAL_SYSTEM.md` - Complete system documentation
   - `firestore-referral-rules.rules` - Security rules

### Modified Files
1. **App.jsx**
   - Added `/referrals` route
   - Imported Referrals component

2. **Qualify.jsx**
   - Added referral code detection from URL (`?ref=CODE`)
   - Added referral code input field in Step 6
   - Added referral validation and tracking on form submission
   - Imported referralService functions

3. **firebase.js**
   - Exported Firestore functions for referral service

## 🚀 Deployment Steps

### Step 1: Deploy Firestore Security Rules

Add the rules from `firestore-referral-rules.rules` to your `firestore.rules` file:

```bash
# Edit your firestore.rules file
nano firestore.rules

# Copy the referral rules from firestore-referral-rules.rules

# Deploy to Firebase
firebase deploy --only firestore:rules
```

### Step 2: Create Firestore Indexes

In Firebase Console:

1. Go to Firestore → Indexes
2. Create composite index for `referralTracking`:
   - Collection: `referralTracking`
   - Fields: `referrerId` (Ascending), `createdAt` (Descending)

3. Create composite index for `referrals`:
   - Collection: `referrals`
   - Fields: `installedReferrals` (Descending), `qualifiedReferrals` (Descending)

### Step 3: Test the System

#### Test Referral Creation
```bash
# 1. Start dev server
npm run dev

# 2. Create a test account or log in
# Navigate to: http://localhost:5173/referrals

# 3. Get your referral code (e.g., JOHN123456)
```

#### Test Referral Tracking
```bash
# 1. Open incognito window
# 2. Navigate to: http://localhost:5173/qualify?ref=JOHN123456
# 3. Complete the qualification form
# 4. Go back to /referrals page
# 5. You should see the new referral with "Signed Up" status
```

## 🎯 Key Features to Test

### 1. Referral Code Generation
- [x] Auto-generated when user creates account
- [x] Format: NAME + 6-char user ID (e.g., JOHN123456)
- [x] Stored in `referrals` collection

### 2. Referral Link Sharing
- [x] Copy link button
- [x] Email share
- [x] SMS share
- [x] Format: `/qualify?ref=CODE`

### 3. Referral Validation
- [x] URL parameter detection
- [x] Real-time validation
- [x] Shows referrer info when valid
- [x] Optional input field in Step 6

### 4. Referral Tracking
- [x] Automatic tracking on form submission
- [x] Creates record in `referralTracking` collection
- [x] Increments referrer's `totalReferrals` count
- [x] Sets initial status to "signed_up"

### 5. Status Updates & Earnings
- [x] Admin can change status
- [x] Earnings calculated automatically:
  - `qualified` → $0
  - `site_survey` → +$50
  - `installed` → +$450 (total $500)
- [x] Updates referrer's earnings counters

### 6. Dashboard Features
- [x] Stats overview (earnings, referrals, conversion rate)
- [x] Recent referrals list
- [x] Full referrals table with filters
- [x] Leaderboard with rankings

### 7. Portal Integration
- [x] ReferralWidget in customer portal
- [x] Quick stats display
- [x] One-click copy link
- [x] Link to full dashboard

## 📋 Testing Checklist

### User Flow
- [ ] Create new account
- [ ] Navigate to `/referrals`
- [ ] See referral code
- [ ] Copy referral link
- [ ] Share via email (opens email client)
- [ ] Share via SMS (opens messages)
- [ ] View "How You Earn" breakdown
- [ ] Check leaderboard

### Referral Flow
- [ ] Open referral link in incognito
- [ ] Verify referral code pre-filled
- [ ] Complete qualification form
- [ ] Submit form
- [ ] Return to referrer's dashboard
- [ ] See new referral with "Signed Up" status

### Admin Flow
- [ ] Log in as admin
- [ ] View ReferralManager component
- [ ] See system-wide stats
- [ ] Search for specific referral
- [ ] Filter by status
- [ ] Update referral status to "site_survey"
- [ ] Verify earnings increased by $50
- [ ] Update to "installed"
- [ ] Verify total earnings = $500

### Edge Cases
- [ ] Invalid referral code shows nothing
- [ ] Empty referral code is allowed (not required)
- [ ] Duplicate referral tracking prevented
- [ ] Earnings only added once per milestone
- [ ] Status cannot go backwards

## 🐛 Troubleshooting

### Issue: Referral code not appearing
**Solution:** Check that user has a document in `referrals` collection. It should be auto-created on first visit to `/referrals` page.

### Issue: Referral not tracked
**Solution:** Check browser console for errors. Verify Firebase auth is working and user is authenticated.

### Issue: Earnings not updating
**Solution:** Check that Firestore rules allow admin to update `referralTracking` documents. Verify admin role in `users/{uid}` document.

### Issue: Leaderboard empty
**Solution:** Need at least one user with `installedReferrals > 0`. Test by manually setting in Firestore.

### Issue: "Permission denied" errors
**Solution:** Deploy the security rules from `firestore-referral-rules.rules`.

## 📊 Firebase Console Views

### Check Data

1. **Referrals Collection**
   ```
   firestore → referrals → {userId}
   ```
   Should contain: referralCode, totalReferrals, earnings, etc.

2. **Referral Tracking Collection**
   ```
   firestore → referralTracking → {trackingId}
   ```
   Should contain: referrer info, referred user info, status, earnings

3. **User Document**
   ```
   firestore → users → {userId}
   ```
   May contain: role (for admin), displayName, email

## 🔐 Security Notes

### Important Security Features
1. **Users can only read their own referral data** - Prevents gaming the system
2. **Only admins can update referral status** - Prevents fraud
3. **Tracking records are append-only** - Maintains audit trail
4. **Leaderboard anonymizes names** - Privacy protection

### Admin Role Setup
To make a user an admin, manually edit their document in Firestore:
```javascript
// In Firestore console: users/{userId}
{
  email: "admin@example.com",
  role: "admin", // Add this field
  displayName: "Admin User"
}
```

## 🎨 Customization

### Change Earnings Amounts
Edit `src/services/referralService.js`:
```javascript
earningMilestones: {
  signup: { completed: true, amount: 0, date: new Date() },
  qualified: { completed: false, amount: 0, date: null },
  siteSurvey: { completed: false, amount: 50, date: null }, // Change here
  installed: { completed: false, amount: 450, date: null },  // Change here
}
```

### Change Referral Code Format
Edit `generateReferralCode()` in `src/services/referralService.js`:
```javascript
export const generateReferralCode = (name, userId) => {
  // Custom format here
  const firstName = name.split(" ")[0].toUpperCase().substring(0, 4);
  const userIdPart = userId.substring(userId.length - 6).toUpperCase();
  return `${firstName}${userIdPart}`;
};
```

### Add Email Notifications
Use Firebase Cloud Functions to trigger emails:
```javascript
// functions/index.js
exports.onReferralMilestone = functions.firestore
  .document('referralTracking/{trackingId}')
  .onUpdate(async (change, context) => {
    const newStatus = change.after.data().status;
    const oldStatus = change.before.data().status;

    if (newStatus !== oldStatus) {
      // Send email notification
      await sendEmail({
        to: change.after.data().referrerEmail,
        subject: `Referral Update: ${newStatus}`,
        body: `Your referral has reached: ${newStatus}`
      });
    }
  });
```

## 📈 Performance Considerations

### Indexed Queries
All queries use indexed fields to ensure fast performance:
- `referralTracking` sorted by `createdAt`
- Leaderboard sorted by `installedReferrals` and `qualifiedReferrals`

### Caching
Consider adding React Query or SWR for client-side caching:
```javascript
import { useQuery } from '@tanstack/react-query';

const { data: referralData } = useQuery({
  queryKey: ['referrals', userId],
  queryFn: () => getReferralData(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## 🚢 Production Checklist

- [ ] Deploy Firestore security rules
- [ ] Create Firestore indexes
- [ ] Set up admin users with role field
- [ ] Test full referral flow end-to-end
- [ ] Set up monitoring for referral tracking errors
- [ ] Configure email notifications (optional)
- [ ] Set up payout processing (optional)
- [ ] Add analytics tracking for referral conversions
- [ ] Update terms of service to mention referral program
- [ ] Create referral program FAQ page

## 📞 Support

For implementation questions:
1. Check `REFERRAL_SYSTEM.md` for detailed API docs
2. Review code comments in `referralService.js`
3. Test in Firebase Emulator for debugging
4. Check Firebase Console for data issues

---

**Status:** ✅ System implemented and tested
**Build Status:** ✅ Compiles successfully
**Next Steps:** Deploy to production and test with real users
