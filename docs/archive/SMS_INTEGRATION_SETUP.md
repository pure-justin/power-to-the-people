# SMS Notification Integration - Setup Guide

Complete SMS notification system for Power to the People using Twilio.

## Features Implemented

### 1. Automated SMS Triggers
- **Enrollment Confirmation**: Sent when customer completes enrollment
- **Application Status Updates**: Sent when status changes (approved, pending, installed)
- **Referral Rewards**: Sent when customer earns referral bonus
- **Installation Scheduling**: Sent when installation date is confirmed
- **Payment Reminders**: Daily scheduled job for upcoming payments

### 2. Admin Functions
- **Send Custom SMS**: Send one-off messages to customers
- **Bulk SMS**: Send messages to up to 100 recipients at once
- **SMS Statistics**: View delivery metrics and costs
- **Template Library**: Pre-built message templates

### 3. Tracking & Logging
- All SMS messages logged to Firestore (`smsLog` collection)
- Delivery status tracking via Twilio webhooks
- Cost monitoring and usage statistics

## Setup Instructions

### Step 1: Twilio Account Setup

1. Create a Twilio account at https://www.twilio.com/console
2. Get your credentials from the Twilio Console:
   - Account SID
   - Auth Token
   - Phone Number (purchase a phone number in Twilio)

### Step 2: Configure Firebase Functions

#### Option A: Using Firebase CLI (Recommended for Production)

```bash
cd /Users/admin/Projects/power-to-the-people/functions

# Set Twilio credentials
firebase functions:config:set twilio.account_sid="YOUR_ACCOUNT_SID"
firebase functions:config:set twilio.auth_token="YOUR_AUTH_TOKEN"
firebase functions:config:set twilio.phone_number="+15551234567"

# Set admin phone for notifications
firebase functions:config:set admin.phone="+15559876543"

# View current config
firebase functions:config:get
```

#### Option B: Using Environment Variables (For Local Testing)

Create a `.env` file in the `functions/` directory:

```bash
# functions/.env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
ADMIN_PHONE=+15559876543
```

### Step 3: Build and Deploy Functions

```bash
cd /Users/admin/Projects/power-to-the-people/functions

# Install dependencies (already done)
npm install

# Build TypeScript
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

### Step 4: Configure Twilio Webhook (Optional)

To receive delivery status updates:

1. Go to Twilio Console → Phone Numbers → Active Numbers
2. Click on your phone number
3. Under "Messaging", set "Status Callback URL" to:
   ```
   https://us-central1-power-to-the-people-vpp.cloudfunctions.net/twilioStatusCallback
   ```

### Step 5: Test the Integration

#### Test Single SMS (via Admin Panel)

1. Navigate to https://power-to-the-people-vpp.web.app/admin
2. Sign in with admin credentials
3. Click the "SMS" tab
4. Send a test message to your phone

#### Test Automated Triggers

Create a test project to trigger enrollment SMS:

```bash
# In Firestore console, create a document in `projects` collection
{
  "firstName": "Test",
  "lastName": "User",
  "phone": "+15551234567",
  "systemSize": 10.5,
  "city": "Austin",
  "status": "pending"
}
```

This should automatically send an enrollment confirmation SMS.

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_auth_token` |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number | `+15551234567` |
| `ADMIN_PHONE` | Admin phone for notifications | `+15559876543` |

## Firebase Functions Deployed

| Function Name | Type | Description |
|---------------|------|-------------|
| `smsOnProjectCreated` | Firestore Trigger | Sends SMS on new project creation |
| `onProjectStatusUpdate` | Firestore Trigger | Sends SMS on status change |
| `onReferralReward` | Firestore Trigger | Sends SMS when referral reward earned |
| `sendCustomSMS` | HTTP Callable | Admin function to send custom SMS |
| `sendBulkSMS` | HTTP Callable | Admin function to send bulk SMS |
| `getSmsStats` | HTTP Callable | Get SMS usage statistics |
| `sendPaymentReminders` | Scheduled | Daily job at 9 AM CST |
| `twilioStatusCallback` | HTTP Request | Webhook for delivery status |

## SMS Templates

All templates are defined in `functions/src/smsNotifications.ts`:

```typescript
ENROLLMENT_CONFIRMATION: (name, projectId) =>
  `Hi ${name}! Thanks for enrolling. Track status: https://.../${projectId}`

ENROLLMENT_APPROVED: (name, savingsAmount) =>
  `Great news ${name}! Your application is approved. Save ~$${savingsAmount}/month.`

REFERRAL_REWARD: (name, amount, friendName) =>
  `${name}, you earned $${amount}! ${friendName} enrolled using your code.`

// ... more templates
```

## Firestore Collections

### `smsLog` Collection

Stores all sent SMS messages:

```typescript
{
  to: "+15551234567",
  message: "Hi there! Thanks for enrolling...",
  sid: "SMxxxxxxxxxxxx",  // Twilio message ID
  status: "sent",
  deliveryStatus: "delivered", // Updated via webhook
  sentAt: Timestamp,
  errorCode: null,
  errorMessage: null
}
```

## Cost Estimation

- SMS cost: ~$0.0075 per message
- 1,000 messages/month = ~$7.50
- 10,000 messages/month = ~$75

The admin panel shows real-time cost tracking for the last 30 days.

## Troubleshooting

### Issue: SMS not sending

1. Check Twilio credentials are set:
   ```bash
   firebase functions:config:get
   ```

2. Check function logs:
   ```bash
   firebase functions:log --only smsOnProjectCreated
   ```

3. Verify phone number format (must start with +1 for US)

### Issue: Functions not deploying

1. Ensure you're authenticated:
   ```bash
   firebase login
   ```

2. Check project is correct:
   ```bash
   firebase use power-to-the-people-vpp
   ```

3. Build TypeScript first:
   ```bash
   npm run build
   ```

### Issue: "Twilio client not initialized"

This means environment variables aren't set. Use either:
- `firebase functions:config:set` for production
- `.env` file for local development

## Using VaultDev

If you have Twilio credentials in VaultDev:

```bash
# Check if Twilio keys exist
grep -i twilio ~/Documents/VaultDev/.env

# Inject to current machine
cd ~/Documents/VaultDev
./scripts/inject_env.sh mac-studio

# Then set in Firebase
firebase functions:config:set twilio.account_sid="$(grep TWILIO_ACCOUNT_SID ~/.env | cut -d '=' -f2)"
firebase functions:config:set twilio.auth_token="$(grep TWILIO_AUTH_TOKEN ~/.env | cut -d '=' -f2)"
firebase functions:config:set twilio.phone_number="$(grep TWILIO_PHONE_NUMBER ~/.env | cut -d '=' -f2)"
```

## Next Steps

1. **Set up Twilio account and get credentials**
2. **Configure Firebase Functions with credentials**
3. **Deploy functions to production**
4. **Test SMS sending via admin panel**
5. **Monitor usage and costs via admin dashboard**

## Admin Panel Usage

### Send Single SMS
1. Go to Admin → SMS tab
2. Enter phone number and message
3. Click "Send SMS"

### Send Bulk SMS
1. Go to Admin → SMS → Bulk Send tab
2. Enter phone numbers (one per line or comma-separated)
3. Enter message (max 160 characters)
4. Click "Send Bulk SMS"

### View Templates
- Pre-built templates with variable placeholders
- Click "Use" to load template into message field
- Replace placeholders like {name}, {amount}, etc.

### View Statistics
- Total messages sent (last 30 days)
- Success/failure rates
- Estimated costs
- Active notification types

## Security Notes

- All SMS functions require admin authentication
- Phone numbers are validated and formatted
- Bulk sending limited to 100 recipients per call
- All SMS activity logged to Firestore
- Twilio credentials stored in Firebase Functions config (encrypted at rest)

## Support

For issues or questions:
1. Check function logs: `firebase functions:log`
2. Check Firestore `smsLog` collection for error details
3. Verify Twilio console for delivery status
4. Review this documentation

---

**Status**: SMS integration fully implemented and ready for deployment
**Last Updated**: 2026-02-06
