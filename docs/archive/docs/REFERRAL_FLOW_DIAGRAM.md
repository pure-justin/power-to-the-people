# Referral System Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     REFERRAL TRACKING SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   CUSTOMER       │         │    DATABASE       │         │     ADMIN        │
│   PORTAL         │────────▶│   (Firestore)     │◀────────│   DASHBOARD      │
│   /referrals     │         │                   │         │   /admin         │
└──────────────────┘         └──────────────────┘         └──────────────────┘
       │                             │                             │
       │                             │                             │
       ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│ - View Stats     │         │ Collections:     │         │ - View All       │
│ - Share Link     │         │  • referrals     │         │ - Update Status  │
│ - Track Progress │         │  • referralTrack.│         │ - Export CSV     │
│ - Earn Rewards   │         │  • referralClicks│         │ - Manage Payouts │
└──────────────────┘         │  • notifications │         └──────────────────┘
                              └──────────────────┘
                                      │
                                      │
                                      ▼
                              ┌──────────────────┐
                              │ EMAIL SERVICE    │
                              │ (Cloud Function) │
                              │                  │
                              │ - SendGrid API   │
                              │ - Auto Notify    │
                              └──────────────────┘
```

---

## Customer Journey Flow

```
NEW CUSTOMER (Referrer)
│
├─ Step 1: SIGN UP
│  │ • Completes qualification form
│  │ • Account created in Firebase Auth
│  └─▶ Referral code auto-generated: JOHN5X8K9Q
│
├─ Step 2: ACCESS REFERRAL PORTAL
│  │ • Clicks "Referrals" in navigation
│  │ • Views dashboard: 0 referrals, $0 earned
│  └─▶ Sees referral link: /qualify?ref=JOHN5X8K9Q
│
├─ Step 3: SHARE REFERRAL LINK
│  │ • Clicks "Share" tab
│  │ • Chooses platform (email/SMS/social)
│  │ • Pre-written message auto-populated
│  └─▶ Sends to friends/family
│
└─ Step 4: TRACK & EARN
   │ • Friend signs up → "Signed Up" badge appears
   │ • Friend qualified → "Qualified" badge updates
   │ • Site survey done → $50 earned! 💰
   │ • Installation done → $450 earned! 🎉
   └─▶ Total: $500 per referral


REFERRED CUSTOMER
│
├─ Step 1: RECEIVES LINK
│  │ • Friend shares: /qualify?ref=JOHN5X8K9Q
│  │ • Clicks link
│  └─▶ Lands on qualification form
│
├─ Step 2: COMPLETES FORM
│  │ • Fills out home info
│  │ • Uploads utility bill
│  │ • Submits application
│  └─▶ Referral tracked automatically
│     └─▶ Referrer notified: "New signup!"
│
├─ Step 3: GETS QUALIFIED
│  │ • Admin reviews application
│  │ • Approves for program
│  └─▶ Status: "Qualified"
│     └─▶ Referrer notified: "Your friend qualified!"
│
├─ Step 4: SITE SURVEY
│  │ • Technician visits home
│  │ • Confirms installation feasibility
│  └─▶ Status: "Site Survey"
│     └─▶ Referrer earns $50
│     └─▶ Email sent: "You earned $50!"
│
└─ Step 5: INSTALLATION
   │ • Battery system installed
   │ • Goes live on VPP
   └─▶ Status: "Installed"
      └─▶ Referrer earns $450
      └─▶ Email sent: "You earned $450!"
```

---

## Data Flow Diagram

```
USER SHARES LINK
       │
       ▼
/qualify?ref=JOHN5X8K9Q
       │
       ├─▶ URL parameter captured
       │
       ▼
REFERRED USER SIGNS UP
       │
       ├─▶ Form submitted with referral code
       │
       ▼
trackReferral() CALLED
       │
       ├─▶ Validates referral code
       │   └─▶ Query: referrals collection
       │       └─▶ Find user with code JOHN5X8K9Q
       │
       ├─▶ Creates tracking record
       │   └─▶ Write to: referralTracking collection
       │       • referrerId: user123
       │       • referredEmail: friend@example.com
       │       • status: "signed_up"
       │       • earnings: 0
       │
       └─▶ Updates referrer stats
           └─▶ Increment: referrals.totalReferrals + 1


ADMIN UPDATES STATUS
       │
       ▼
updateReferralStatus(trackingId, "site_survey")
       │
       ├─▶ Gets current tracking record
       │   └─▶ Read: referralTracking/tracking123
       │
       ├─▶ Checks milestone completion
       │   └─▶ if (!milestones.siteSurvey.completed)
       │       • Mark completed
       │       • earningsToAdd = $50
       │
       ├─▶ Updates tracking record
       │   └─▶ Write: referralTracking/tracking123
       │       • status: "site_survey"
       │       • earnings: 50
       │       • milestones.siteSurvey.completed: true
       │
       ├─▶ Updates referrer earnings
       │   └─▶ Increment: referrals/user123
       │       • pendingEarnings + 50
       │       • totalEarnings + 50
       │
       └─▶ Sends notification
           └─▶ Create: pendingNotifications
               • email: john@example.com
               • type: "referralSiteSurvey"
               • subject: "🏆 You Earned $50!"
```

---

## Component Interaction Map

```
REFERRALS PAGE (/referrals)
│
├─ Tab 1: OVERVIEW
│  │
│  ├─▶ Quick Stats Cards
│  │   • Total Earnings ($XXX)
│  │   • Total Referrals (XX)
│  │   • Installed (XX)
│  │   • Conversion Rate (XX%)
│  │
│  ├─▶ Earning Breakdown
│  │   • Step 1: Sign Up → $0
│  │   • Step 2: Site Survey → $50
│  │   • Step 3: Installed → $450
│  │
│  └─▶ Recent Referrals List
│      • Last 5 referrals with status
│
├─ Tab 2: ANALYTICS (ReferralDashboard)
│  │
│  ├─▶ Timeframe Selector
│  │   • All Time / Month / Week
│  │
│  ├─▶ Next Milestone Card
│  │   • Progress bar (60% to 10 installs)
│  │   • Reward display ($100 Bonus)
│  │
│  ├─▶ Conversion Funnel
│  │   • Signed Up: 50 (100%)
│  │   • Qualified: 40 (80%)
│  │   • Site Survey: 30 (60%)
│  │   • Installed: 25 (50%)
│  │
│  └─▶ Performance Metrics
│      • Conversion Rate: 80%
│      • Install Rate: 62%
│      • Avg Earnings: $350
│
├─ Tab 3: SHARE (ReferralSocialShare)
│  │
│  ├─▶ Referral Link Display
│  │   • Copy button (one-click)
│  │
│  ├─▶ Social Platform Buttons
│  │   • Email, SMS, Facebook
│  │   • Twitter, LinkedIn, More
│  │
│  ├─▶ Pre-written Messages
│  │   • Short (SMS): 100 chars
│  │   • Medium (Email): 200 chars
│  │   • Long (Social): 500 chars
│  │   • Each with copy button
│  │
│  ├─▶ Custom Message Composer
│  │   • Textarea for custom text
│  │   • Copy, Email, SMS buttons
│  │
│  └─▶ QR Code Download
│      • Generate QR from link
│      • Download as PNG
│
├─ Tab 4: MY REFERRALS
│  │
│  └─▶ Referrals Table
│      • Name, Email, Phone
│      • Status badge
│      • Earnings ($XX)
│      • Date signed up
│
└─ Tab 5: LEADERBOARD
   │
   └─▶ Top Referrers List
       • Rank (1-10)
       • Name (anonymized)
       • Total referrals
       • Total earnings


ADMIN DASHBOARD (/admin)
│
├─ Tab: REFERRALS (ReferralAdminPanel)
│  │
│  ├─▶ Stats Overview Cards
│  │   • Total Referrals
│  │   • Installed Systems
│  │   • Total Paid Out
│  │   • Pending Payouts
│  │
│  ├─▶ Search & Filter Bar
│  │   • Search by name/email
│  │   • Filter by status
│  │   • Export CSV button
│  │
│  ├─▶ Referrals Table
│  │   • Referrer info
│  │   • Referred customer info
│  │   • Status badge
│  │   • Earnings
│  │   • Update button
│  │
│  ├─▶ Status Update Modal
│  │   • Current status display
│  │   • 4 status buttons
│  │   • Earnings preview
│  │
│  └─▶ Top Referrers Section
│      • Rank
│      • Referral code
│      • Installs + earnings
```

---

## Earnings Calculation Flow

```
NEW REFERRAL CREATED
│
├─ Initial State:
│  • status: "signed_up"
│  • earnings: $0
│  • milestones: all false
│
│
ADMIN UPDATES: status → "qualified"
│
├─ Calculation:
│  • Check: milestones.qualified.completed? NO
│  • Amount: $0 (no payment for qualification)
│  • Update: status = "qualified"
│
│
ADMIN UPDATES: status → "site_survey"
│
├─ Calculation:
│  • Check: milestones.siteSurvey.completed? NO
│  • Amount: $50
│  • Update:
│    - status = "site_survey"
│    - earnings = $50
│    - milestones.siteSurvey.completed = true
│    - milestones.siteSurvey.date = now
│  • Increment:
│    - referrer.pendingEarnings + 50
│    - referrer.totalEarnings + 50
│  • Notify: referralSiteSurvey email
│
│
ADMIN UPDATES: status → "installed"
│
├─ Calculation:
│  • Check: milestones.installed.completed? NO
│  • Amount: $450
│  • Update:
│    - status = "installed"
│    - earnings = $500 (cumulative)
│    - milestones.installed.completed = true
│    - milestones.installed.date = now
│  • Increment:
│    - referrer.pendingEarnings + 450
│    - referrer.totalEarnings + 450
│    - referrer.installedReferrals + 1
│  • Check Milestone Bonus:
│    - if (installedReferrals == 1) → First Badge
│    - if (installedReferrals == 5) → $100 bonus
│    - if (installedReferrals == 10) → Bronze Status
│    - etc.
│  • Notify: referralInstalled email
│
│
└─ Final State:
   • status: "installed"
   • earnings: $500
   • referrer.totalEarnings: increased
   • referrer.pendingEarnings: awaiting payout
```

---

## Email Notification Timeline

```
EVENT: Referred user signs up
  │
  ├─▶ Trigger: trackReferral()
  └─▶ Email: "New Referral Signed Up!"
      • Subject: 🎉 New Referral Signed Up!
      • To: referrer@example.com
      • Body: "Great news! [Name] just signed up..."


EVENT: Admin marks qualified
  │
  ├─▶ Trigger: updateReferralStatus("qualified")
  └─▶ Email: "Your Referral Qualified!"
      • Subject: 💰 Your Referral Qualified!
      • To: referrer@example.com
      • Body: "Excellent news! [Name] has been qualified..."


EVENT: Site survey completed
  │
  ├─▶ Trigger: updateReferralStatus("site_survey")
  ├─▶ Earnings: +$50
  └─▶ Email: "You Earned $50!"
      • Subject: 🏆 You Earned $50!
      • To: referrer@example.com
      • Body: "Congratulations! [Name] completed site survey..."


EVENT: Installation completed
  │
  ├─▶ Trigger: updateReferralStatus("installed")
  ├─▶ Earnings: +$450
  ├─▶ Check Milestone
  └─▶ Email: "Installation Complete - $450!"
      • Subject: 🎊 Installation Complete - You Earned $450!
      • To: referrer@example.com
      • Body: "Amazing news! [Name]'s battery installed..."


EVENT: Milestone reached (if applicable)
  │
  ├─▶ Trigger: checkMilestones(userId, installedCount)
  └─▶ Email: "Milestone Unlocked!"
      • Subject: 🏅 Milestone Unlocked: 10 Installs!
      • To: referrer@example.com
      • Body: "You've reached Bronze Status + $100 bonus..."


SCHEDULED: Weekly digest (every Monday)
  │
  ├─▶ Trigger: Cron job
  └─▶ Email: "Your Weekly Summary"
      • Subject: 📊 Your Weekly Referral Summary
      • To: all active referrers
      • Body: "New referrals: 3, Earnings: $150..."
```

---

## Security & Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                     FIRESTORE SECURITY RULES                  │
└─────────────────────────────────────────────────────────────┘

/referrals/{userId}
│
├─ READ: User can read their own record
│  • if (request.auth.uid == userId)
│
└─ WRITE: User can update their own, Admin can update any
   • if (request.auth.uid == userId) OR
   • if (getUserRole() == 'admin')


/referralTracking/{trackingId}
│
├─ READ: Referrer or Admin can read
│  • if (resource.data.referrerId == request.auth.uid) OR
│  • if (getUserRole() == 'admin')
│
└─ WRITE: Admin only
   • if (getUserRole() == 'admin')


/referralClicks/{clickId}
│
└─ READ/WRITE: Public (for analytics)
   • allow read, write: if true


/pendingNotifications/{notificationId}
│
└─ READ/WRITE: Admin only
   • if (getUserRole() == 'admin')
```

---

## Testing Scenarios

```
TEST 1: New user signs up
│
├─ Setup: Create new user account
├─ Action: Complete registration
└─ Verify:
   ✓ Referral code generated
   ✓ referrals document created
   ✓ Code is unique format: NAME + 6 chars


TEST 2: User shares link
│
├─ Setup: Log in as existing user
├─ Action: Click share buttons
└─ Verify:
   ✓ Email client opens with message
   ✓ SMS app opens with message
   ✓ Social platform share dialog appears
   ✓ QR code downloads as PNG


TEST 3: Referred user signs up
│
├─ Setup: Visit /qualify?ref=TEST123
├─ Action: Complete qualification form
└─ Verify:
   ✓ URL parameter captured
   ✓ referralTracking record created
   ✓ referrals.totalReferrals incremented
   ✓ Status shows "Signed Up"


TEST 4: Admin updates to site survey
│
├─ Setup: Log in as admin
├─ Action: Update referral status
└─ Verify:
   ✓ Status updates to "Site Survey"
   ✓ Earnings increase by $50
   ✓ referrer.pendingEarnings incremented
   ✓ Milestone completion marked


TEST 5: Milestone reached
│
├─ Setup: User with 4 installs
├─ Action: 5th referral installed
└─ Verify:
   ✓ Status badge updates
   ✓ Earnings include $100 bonus
   ✓ Milestone card shows next goal
   ✓ Progress bar updates


TEST 6: Export CSV
│
├─ Setup: Admin with multiple referrals
├─ Action: Click "Export CSV"
└─ Verify:
   ✓ CSV file downloads
   ✓ All columns present
   ✓ Data matches dashboard
   ✓ Filtered results reflected
```

---

This visual guide shows how all components, data flows, and user interactions work together in the referral system.
