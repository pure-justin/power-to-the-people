# SMS Integration - Quick Reference Card

## 🚀 Quick Start

### 1. Set Twilio Credentials
```bash
firebase functions:config:set twilio.account_sid="ACxxxxx"
firebase functions:config:set twilio.auth_token="your_token"
firebase functions:config:set twilio.phone_number="+15551234567"
firebase functions:config:set admin.phone="+15559876543"
```

### 2. Deploy Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

### 3. Test via Admin Panel
```
https://power-to-the-people-vpp.web.app/admin → SMS tab
```

## 📱 Automatic SMS Triggers

| Trigger | When | Message |
|---------|------|---------|
| **New Enrollment** | Project created | "Hi {name}! Thanks for enrolling..." |
| **Approved** | Status → approved | "Great news! Your application is approved..." |
| **Pending Info** | Status → pending_info | "Your application needs additional info..." |
| **Installation Scheduled** | Status → installation_scheduled | "Installation scheduled for {date}..." |
| **Installed** | Status → installed | "Congrats! Your {size}kW system is installed..." |
| **Referral Reward** | Referral earns reward | "You earned ${amount}! {friend} enrolled..." |
| **Payment Reminder** | Daily at 9 AM | "Reminder: ${amount} payment due {date}..." |

## 🎯 Admin Functions

### Send Single SMS
```javascript
import { sendCustomSMS } from '../services/smsService';

await sendCustomSMS('+15551234567', 'Your custom message here');
```

### Send Bulk SMS
```javascript
import { sendBulkSMS } from '../services/smsService';

const phones = ['+15551234567', '+15559876543'];
const result = await sendBulkSMS(phones, 'Message to all');
// Returns: { total: 2, successful: 2, failed: 0 }
```

### Get Statistics
```javascript
import { getSmsStats } from '../services/smsService';

const stats = await getSmsStats();
// Returns: { total: 150, successful: 148, failed: 2, estimatedCost: "1.13", period: "Last 30 days" }
```

## 📋 Available Templates

```javascript
import { SMS_TEMPLATES } from '../services/smsService';

SMS_TEMPLATES.enrollmentConfirmation("John", "PTTP-123");
SMS_TEMPLATES.enrollmentApproved("John", "150");
SMS_TEMPLATES.referralReward("John", "500", "Sarah");
SMS_TEMPLATES.installationScheduled("John", "March 15", "SolarCo");
SMS_TEMPLATES.paymentReminder("John", "150.00", "March 1");
```

## 🛠 Helper Functions

```javascript
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  isValidMessageLength
} from '../services/smsService';

// Format phone number
formatPhoneNumber('5551234567');        // → '+15551234567'
formatPhoneNumber('+1 (555) 123-4567'); // → '+15551234567'

// Validate
isValidPhoneNumber('+15551234567');     // → true
isValidMessageLength('Hello world');    // → true (≤160 chars)
```

## 🗂 Firestore Collections

### `smsLog` - All sent messages
```javascript
{
  to: "+15551234567",
  message: "Hi there!...",
  sid: "SMxxxx",           // Twilio message ID
  status: "sent",
  deliveryStatus: "delivered",
  sentAt: Timestamp,
  errorCode: null,
  errorMessage: null
}
```

## 💰 Cost Tracking

- **Per SMS**: ~$0.0075
- **1,000 msgs/mo**: ~$7.50
- **10,000 msgs/mo**: ~$75.00

View real-time costs in Admin → SMS → Statistics

## 🔒 Security

- ✅ Admin authentication required
- ✅ Phone number validation
- ✅ Bulk sending limited to 100/call
- ✅ All activity logged
- ✅ Credentials encrypted at rest

## 🐛 Debugging

### Check function logs
```bash
firebase functions:log --only smsOnProjectCreated
```

### Check Firestore logs
Query `smsLog` collection for errors:
```javascript
db.collection('smsLog')
  .where('error', '!=', null)
  .orderBy('failedAt', 'desc')
  .limit(10)
```

### Test Twilio credentials
```bash
# In functions directory
node -e "const twilio = require('twilio'); const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN); client.messages.create({body: 'Test', from: process.env.TWILIO_PHONE_NUMBER, to: '+15551234567'}).then(m => console.log(m.sid));"
```

## 📞 Common Issues

| Issue | Solution |
|-------|----------|
| SMS not sending | Check `firebase functions:config:get` |
| Invalid number | Must be +1 format for US |
| Function not deployed | Run `npm run build && firebase deploy --only functions` |
| Unauthorized error | Ensure user has admin role in Firestore |

## 🎨 Admin Panel Features

### Tabs
- **Send Single**: One-off messages
- **Bulk Send**: Up to 100 recipients
- **Templates**: Pre-built messages
- **Statistics**: Usage metrics

### Stats Display
- Total sent (30 days)
- Success/failure rate
- Estimated cost
- Active triggers

## 🔗 Useful URLs

- **Admin Panel**: https://power-to-the-people-vpp.web.app/admin
- **Twilio Console**: https://console.twilio.com
- **Function Logs**: https://console.firebase.google.com/project/power-to-the-people-vpp/functions/logs

---

**Need Help?** Check `SMS_INTEGRATION_SETUP.md` for full documentation
