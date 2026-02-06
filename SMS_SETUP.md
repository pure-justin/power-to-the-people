# SMS Notification Integration Setup

## Overview
SMS notifications are fully implemented and ready to deploy. The system uses Twilio to send automated SMS notifications for:
- New enrollments/leads
- Application status updates
- Referral rewards
- Installation scheduling
- Payment reminders

## Prerequisites
1. Twilio account with phone number
2. Firebase project with Cloud Functions enabled
3. Admin access to Firebase console

## Setup Steps

### 1. Get Twilio Credentials
Sign up for Twilio at https://console.twilio.com and get:
- Account SID
- Auth Token
- Phone Number

### 2. Configure Firebase Functions

Create `functions/.env` file:
```bash
cd functions
cat > .env << 'EOF'
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
ADMIN_PHONE=+15551234567
EOF
```

Or set Firebase config:
```bash
firebase functions:config:set \
  twilio.account_sid="YOUR_ACCOUNT_SID" \
  twilio.auth_token="YOUR_AUTH_TOKEN" \
  twilio.phone_number="+15551234567" \
  admin.phone="+15551234567"
```

### 3. Build and Deploy Functions
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 4. Test SMS Integration
```bash
cd functions
SEND_TEST_SMS=true TEST_PHONE_NUMBER=+15551234567 node test-sms.js
```

## Available Functions

### Firestore Triggers (Automatic)
- `smsOnProjectCreated` - Sends confirmation when new project is created
- `onProjectStatusUpdate` - Sends updates when project status changes
- `onReferralReward` - Sends notification when referral reward is earned

### HTTP Callable (Admin Only)
- `sendCustomSMS(phone, message)` - Send custom SMS to one recipient
- `sendBulkSMS(recipients[], message)` - Send to multiple recipients (max 100)
- `getSmsStats()` - Get usage statistics

### Scheduled Functions
- `sendPaymentReminders` - Runs daily at 9 AM Central Time

### Webhooks
- `twilioStatusCallback` - Receives delivery status updates from Twilio

## Admin Panel Usage

Access the SMS panel at: https://power-to-the-people-vpp.web.app/admin

Features:
- Send single SMS
- Send bulk SMS (up to 100 recipients)
- Pre-built message templates
- Usage statistics and cost tracking
- Real-time delivery status

## SMS Templates

Pre-configured templates for:
1. **Enrollment Confirmation** - Sent automatically on new enrollment
2. **Application Approved** - Sent when status changes to "approved"
3. **Referral Reward** - Sent when referral earns reward
4. **Installation Scheduled** - Sent when installation date is confirmed
5. **Payment Reminder** - Sent 1-3 days before payment due

## Cost Tracking

SMS logs are stored in Firestore `smsLog` collection with:
- Recipient phone number
- Message content
- Twilio message SID
- Delivery status
- Error messages (if any)
- Timestamp

Estimated cost: ~$0.0075 per SMS

## Security

- All SMS functions require authentication
- Custom/bulk SMS requires admin role
- Phone numbers are formatted and validated
- Message length limited to 160 characters
- Bulk sends limited to 100 recipients per call

## Troubleshooting

### "Twilio client not initialized"
- Check that environment variables are set correctly
- Verify Firebase config: `firebase functions:config:get`
- Rebuild functions: `npm run build`

### SMS not sending
- Check Twilio console for errors
- Verify phone number format (+1XXXXXXXXXX for US)
- Check Firestore `smsLog` collection for error messages
- Ensure Twilio account has sufficient balance

### Trial Account Limitations
If using Twilio trial:
- Can only send to verified phone numbers
- Messages include "Sent from a Twilio Trial account" prefix
- Limited to 3 unique numbers over trial period

## Testing

Test locally:
```bash
cd functions
node test-sms.js
```

Test with Cloud Functions:
```bash
# Send test SMS via Admin panel
# or use Firebase console to trigger manually
```

## Monitoring

View logs:
```bash
firebase functions:log --only smsOnProjectCreated,onProjectStatusUpdate
```

Check Firestore collections:
- `smsLog` - All SMS activity with delivery status
- `projects` - Tracks which notifications were sent

## Next Steps

1. Configure Twilio credentials (see step 2 above)
2. Deploy functions: `firebase deploy --only functions`
3. Test with a real enrollment
4. Monitor `smsLog` collection for delivery status
5. Set up Twilio status callback URL in Twilio console (optional):
   - URL: `https://us-central1-power-to-the-people-vpp.cloudfunctions.net/twilioStatusCallback`
   - Method: POST
   - Events: Delivered, Failed, Undelivered
