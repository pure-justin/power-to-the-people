# API Quick Reference

## 🔗 Base URLs
- **Cloud Functions:** `https://us-central1-power-to-the-people-vpp.cloudfunctions.net`
- **Netlify Functions:** `https://power-to-the-people-vpp.web.app/.netlify/functions`
- **Interactive Docs:** `https://power-to-the-people-vpp.web.app/api-docs`

## 🔑 Authentication
```bash
Authorization: Bearer pk_test_your_api_key_here
```

## 📱 Common Endpoints

### Utility Bill Scanning
```bash
POST /.netlify/functions/scan-bill
# Extract bill data from images (no auth required)
```

### Leads
```bash
POST /createLead              # Create new lead
POST /updateLead              # Update lead status
POST /leadWebhook             # External webhook (API key required)
```

### Referrals
```bash
POST /referralStatusWebhook   # Update referral status ($50-$450 rewards)
GET  /referralStatsWebhook    # Get referral statistics
POST /referralBulkUpdateWebhook  # Bulk update referrals
```

### SMS
```bash
POST /sendCustomSMS           # Send single SMS (admin only)
POST /sendBulkSMS             # Send bulk SMS (max 100)
GET  /getSmsStats             # Get SMS usage stats
```

### API Keys
```bash
POST /createApiKey            # Create new API key
POST /validateApiKey          # Validate key & check permissions
POST /revokeApiKey            # Revoke key
POST /rotateApiKey            # Rotate key (new key, same ID)
GET  /getApiKeyUsage          # Get usage statistics
```

## 📊 Rate Limits
- **Dev:** 10/min, 100/hour, 1K/day, 10K/month
- **Prod:** 60/min, 1K/hour, 10K/day, 100K/month

## 💰 Referral Rewards
- `signed_up` → $0
- `qualified` → $0
- `site_survey` → $50
- `installed` → $450

## 🔐 API Key Scopes
- `read_leads`, `write_leads`
- `read_solar`, `write_solar`
- `read_smt`, `write_smt`
- `admin` (full access)

## 📦 Downloads
- [OpenAPI Spec](/public/api-spec.json)
- [Postman Collection](/public/postman-collection.json)

## 🧪 Test Credentials
- **URL:** https://power-to-the-people-vpp.web.app/admin
- **Email:** justin@agntc.tech
- **Password:** Solar2026!

## ⚡ Quick Start
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createLead = httpsCallable(functions, 'createLead');

const result = await createLead({
  name: 'John Smith',
  email: 'john@example.com',
  phone: '+15125550100',
  address: '123 Solar St, Austin, TX',
  annualUsageKwh: 12000
});
```

## ❌ Error Codes
- `200` OK
- `400` Bad Request
- `401` Unauthorized (invalid API key)
- `403` Forbidden (insufficient permissions)
- `404` Not Found
- `429` Rate Limit Exceeded
- `500` Internal Server Error
