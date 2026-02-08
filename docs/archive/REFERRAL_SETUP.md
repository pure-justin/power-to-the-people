# Referral System Setup Guide

## Quick Start

The referral tracking system is fully implemented and ready to use. Here's how to get started:

### For Users

1. **Access Your Referral Dashboard**
   - Log in to your account at `/portal`
   - Click "Referrals" in the navigation
   - Your unique referral code will be displayed

2. **Share Your Link**
   - Copy your referral link
   - Share via email, SMS, or social media
   - Download QR code for print materials

3. **Track Your Earnings**
   - View real-time referral status
   - See conversion funnel and analytics
   - Monitor your progress toward milestones

### For Admins

1. **Access Admin Dashboard**
   - Navigate to `/admin`
   - Sign in with admin credentials
   - Click "Referrals" tab

2. **Manage Referrals**
   - View all referrals across system
   - Update referral status
   - Export data to CSV
   - Track total payouts

## Features Implemented

✅ **Referral Code Generation** - Automatic unique codes
✅ **Multi-Stage Tracking** - Signup → Qualified → Site Survey → Installed
✅ **Earnings Calculation** - $50 at site survey, $450 at installation
✅ **Milestone Rewards** - Bonuses at 1, 5, 10, 25, 50, 100 referrals
✅ **Social Sharing** - Email, SMS, Facebook, Twitter, LinkedIn
✅ **QR Code Generation** - Download for print materials
✅ **Analytics Dashboard** - Conversion funnel, metrics, timeframes
✅ **Admin Panel** - Full management interface
✅ **Leaderboard** - Top referrers ranking

## Next Steps (Production)

### 1. Email Notifications
Currently, email templates are defined but not sent. To enable:

```bash
# Deploy Cloud Function for sending emails
cd functions
npm install sendgrid
# Add SENDGRID_API_KEY to Firebase config
firebase deploy --only functions:sendReferralEmail
```

### 2. Payment Integration
To process payouts:

```bash
# Install Stripe
npm install stripe
# Configure Stripe webhook
# Deploy payout processing function
firebase deploy --only functions:processReferralPayout
```

### 3. Security Rules
Apply Firestore security rules from `docs/REFERRAL_SYSTEM.md`:

```bash
firebase deploy --only firestore:rules
```

## File Structure

```
src/
├── components/
│   ├── ReferralDashboard.jsx          # Analytics dashboard
│   ├── ReferralSocialShare.jsx        # Social sharing UI
│   └── ReferralAdminPanel.jsx         # Admin management
├── services/
│   ├── referralService.js             # Core referral logic
│   └── referralNotificationService.js # Email notifications
└── pages/
    ├── Referrals.jsx                  # User referral portal
    └── Admin.jsx                      # Admin dashboard (enhanced)

docs/
└── REFERRAL_SYSTEM.md                 # Complete documentation
```

## Integration with Qualify Flow

The referral system automatically tracks when someone signs up using a referral link:

```
User visits: /qualify?ref=JOHN5X8K9Q
              ↓
System captures referral code
              ↓
User completes qualification
              ↓
Referral tracked automatically
              ↓
Referrer sees "Signed Up" status
```

## Testing

1. **Create a test user account**
2. **Get their referral code** from `/referrals`
3. **Open incognito window** and visit `/qualify?ref=CODE`
4. **Complete qualification form**
5. **Check referrer's dashboard** - should show new referral
6. **As admin**, update status to test earnings

## Support

- Full documentation: `docs/REFERRAL_SYSTEM.md`
- Technical issues: Check Firebase console
- Feature requests: Add to project backlog

## Changelog

**2026-02-06** - Initial implementation
- Complete referral tracking system
- Social sharing components
- Analytics dashboard
- Admin management panel
- Email notification templates
