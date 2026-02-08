# Referral System - Quick Start Guide

## ⚡ 5-Minute Setup

The referral tracking system is **fully implemented** and ready to deploy. Follow these steps to get started.

## 🎯 What You Get

- **$500 per successful referral** ($50 site survey + $450 installation)
- **Milestone bonuses** (up to $2,000 at 100 installs)
- **Real-time tracking** dashboard
- **Social sharing** tools (email, SMS, social media, QR codes)
- **Admin panel** for status management
- **Analytics** & leaderboard

---

## 📋 Pre-Launch Checklist

### 1. Deploy Firestore Security Rules (5 min)

```bash
# Navigate to Firebase Console
# https://console.firebase.google.com

# Go to: Firestore Database > Rules
# Replace with contents of: firestore.rules

# Or deploy via CLI:
firebase deploy --only firestore:rules
```

### 2. Create Composite Indexes (2 min)

Go to Firebase Console > Firestore > Indexes and create:

**Index 1: Leaderboard**
- Collection: `referrals`
- Fields: `installedReferrals` (desc), `qualifiedReferrals` (desc)

**Index 2: User Referrals**
- Collection: `referralTracking`
- Fields: `referrerId` (asc), `createdAt` (desc)

### 3. Create Admin Account (2 min)

```bash
node scripts/create-admin.js
# Enter email and password when prompted
```

---

## 🧪 Testing Flow (10 min)

### Test 1: Create Referral Code

1. Visit `http://localhost:5178/portal`
2. Sign in with test account
3. Click "Referrals" in nav
4. ✅ Verify your referral code appears (e.g., `JOHN5X8K9Q`)
5. ✅ Copy your referral link

### Test 2: Track a Referral

1. Open incognito window
2. Visit your referral link: `/qualify?ref=JOHN5X8K9Q`
3. Complete qualification form
4. ✅ Return to your referrals dashboard
5. ✅ Verify new referral appears with "Signed Up" status

### Test 3: Update Status & Earnings

1. Sign in as admin: `http://localhost:5178/admin`
2. Click "Referrals" tab
3. Find your test referral
4. Click "Update" button
5. Change status to "Site Survey"
6. ✅ Verify $50 added to earnings
7. Change status to "Installed"
8. ✅ Verify $450 added (total $500)

### Test 4: Social Sharing

1. Go to `/referrals` > "Share" tab
2. Click "Email" button
3. ✅ Verify email client opens with pre-written message
4. Click "Download QR Code"
5. ✅ Verify QR code PNG downloads

---

## 🚀 Go Live Checklist

### Before Launch

- [ ] Deploy Firestore rules
- [ ] Create composite indexes
- [ ] Test complete referral flow
- [ ] Create promotional materials (social posts, email templates)
- [ ] Brief customer support team
- [ ] Set up monitoring alerts (optional)

### Launch Day

- [ ] Announce program via email to existing customers
- [ ] Post on social media
- [ ] Add "Refer & Earn" button to portal navigation
- [ ] Monitor first referrals closely

### Week 1

- [ ] Check conversion rates daily
- [ ] Respond to referrer questions
- [ ] Fix any bugs discovered
- [ ] Celebrate first milestone achievements!

---

## 📊 Key Metrics to Track

| Metric | Target | Formula |
|--------|--------|---------|
| Conversion Rate | 50%+ | (Qualified / Total Signups) × 100 |
| Install Rate | 40%+ | (Installed / Qualified) × 100 |
| Avg Earnings | $300+ | Total Earnings / Total Referrals |
| Active Referrers | 20%+ | Users with 1+ referrals / Total Users |

---

## 🎨 Customization Options

### Change Referral Rewards

Edit `src/services/referralService.js`:

```javascript
earningMilestones: {
  siteSurvey: { completed: false, amount: 75, date: null }, // Changed from $50
  installed: { completed: false, amount: 500, date: null }, // Changed from $450
}
```

### Update Milestone Bonuses

Edit `src/components/ReferralDashboard.jsx`:

```javascript
const milestones = [
  { count: 1, reward: 'First Referral Badge', icon: Gift },
  { count: 5, reward: '$150 Bonus', icon: DollarSign }, // Changed from $100
  { count: 10, reward: 'Bronze Status', icon: Award },
  // ...
];
```

### Customize Social Messages

Edit `src/components/ReferralSocialShare.jsx`:

```javascript
const defaultMessages = {
  short: `Your custom SMS message here: ${referralLink}`,
  medium: `Your custom email message...`,
  long: `Your custom social media post...`,
};
```

---

## 🔧 Troubleshooting

### Referral Not Tracking

**Symptom**: Referred user completes form but doesn't appear in referrals dashboard

**Solution**:
1. Check browser console for errors
2. Verify referral code in URL: `/qualify?ref=CODE`
3. Ensure Firestore rules allow `referralTracking` creation
4. Check `referralTracking` collection in Firebase console

### Earnings Not Calculating

**Symptom**: Status updates but earnings don't increase

**Solution**:
1. Check `earningMilestones` object in `referralTracking` document
2. Verify milestone wasn't already completed
3. Check admin has proper permissions
4. Review `updateReferralStatus()` function for errors

### QR Code Not Downloading

**Symptom**: QR code button doesn't work

**Solution**:
1. Check internet connection (uses external API: qrserver.com)
2. Try different browser
3. Check browser popup/download settings
4. Manually copy link and generate QR at qr-code-generator.com

### Email Notifications Not Sending

**Symptom**: Users not receiving status update emails

**Note**: Email notifications require Cloud Functions (optional feature)

**Solution**:
1. Deploy Cloud Functions (see `REFERRAL_SYSTEM_SETUP.md`)
2. Configure SendGrid API key
3. Check `pendingNotifications` collection for queued emails
4. For now, notifications are logged to console (check browser devtools)

---

## 📚 Additional Resources

- **Full Documentation**: `docs/REFERRAL_SYSTEM.md`
- **Setup Guide**: `docs/REFERRAL_SYSTEM_SETUP.md`
- **Flow Diagrams**: `docs/REFERRAL_FLOW_DIAGRAM.md`
- **Test Script**: `test-referral-system.js`

---

## 🎯 Success Tips

### For Maximum Referrals

1. **Make it visible**: Add "Refer & Earn" prominently in navigation
2. **Celebrate wins**: Post leaderboard publicly
3. **Remind users**: Weekly digest emails
4. **Lower friction**: One-click sharing is key
5. **Provide value**: Make messages personal, not spammy

### For Best Conversion Rates

1. **Follow up quickly**: Respond to signups within 24 hours
2. **Clear communication**: Set expectations for each step
3. **Remove barriers**: Make qualification easy
4. **Build trust**: Show social proof and testimonials
5. **Deliver value**: Ensure great customer experience

---

## 💡 Pro Tips

- **Boost early adopters**: Offer 2x rewards for first 50 referrals
- **Seasonal campaigns**: Holiday bonuses, summer specials
- **Referral contests**: Monthly prizes for top referrers
- **Partner sharing**: B2B referral partnerships
- **Community building**: Create Facebook group for referrers

---

## 🆘 Need Help?

- **Technical Issues**: Check Firebase console logs
- **Feature Requests**: Create GitHub issue
- **Urgent Problems**: Contact development team

---

**Ready to launch? The system is waiting for you! 🚀**

Last Updated: February 6, 2026
Version: 1.0.0
