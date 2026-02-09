# External Integrations

> Status and configuration for all external API integrations.

## Integration Status

| Integration | Status | Config Key | Backend File | Frontend Service |
|-------------|--------|-----------|-------------|-----------------|
| Stripe | DONE | `stripe.secret_key`, `stripe.webhook_secret` | `payments.ts` | `billingService.js` |
| Mercury | DONE | `mercury.api_token` | `mercuryInvoice.ts` | `invoiceService.js` |
| Twilio | DONE | `twilio.account_sid`, `twilio.auth_token`, `twilio.phone_number` | `smsNotifications.ts` | `smsService.js` |
| NREL | DONE | `nrel.api_key` | `dataRefresh.ts`, `solarDataApi.ts` | `solarApi.js` |
| Google Solar | DONE | `google.solar_api_key` | `solarDataApi.ts` | `solarApi.js` |
| OpenEI | DONE | (none — free) | `dataRefresh.ts` | `solarDataService.js` |
| EagleView | STUB | (none — needs API) | `eagleviewService.ts` | `eagleviewService.js` |

## Stripe

- **Mode**: Test (`sk_test_...`)
- **Features**: Subscriptions, checkout, billing portal, webhooks
- **Webhook URL**: `https://us-central1-power-to-the-people-vpp.cloudfunctions.net/stripeWebhook`
- **Events**: `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_*`
- **Tiers**: Starter ($79), Professional ($149), Enterprise ($299)
- **Backend**: `functions/src/payments.ts`
- **Frontend**: `src/services/billingService.js`

## Mercury (ACH Banking)

- **Account**: Agentic Labs LLC, Checking ••3334
- **Account ID**: `ecc22c2c-aabf-11f0-955b-13f894471589`
- **Features**: Create invoices, ACH payment, status sync (every 30 min)
- **Backend**: `functions/src/mercuryInvoice.ts`
- **Frontend**: `src/services/invoiceService.js`

## Twilio (SMS)

- **Features**: Auto-SMS on project events, manual send, bulk campaigns, payment reminders
- **Triggers**: Project created, status update, referral reward
- **Scheduled**: Daily payment reminders at 9 AM CST
- **Cost**: ~$0.0075/message
- **Backend**: `functions/src/smsNotifications.ts`
- **Frontend**: `src/services/smsService.js`

## NREL (Solar Resource)

- **Free API** with key
- **Provides**: Solar resource data (irradiance, capacity factors)
- **Used by**: Solar estimates, data refresh
- **Backend**: `functions/src/solarDataApi.ts` (estimate endpoint)
- **Refresh**: Weekly Sunday 2 AM CST via `dataRefresh.ts`

## Google Solar

- **Provides**: Rooftop solar analysis (panel count, annual energy, imagery)
- **Used by**: Solar estimates, qualify flow
- **Config key**: `google.solar_api_key`
- **Backend**: `functions/src/solarDataApi.ts`

## OpenEI

- **Free, no key needed**
- **Provides**: Utility rate structures
- **Marked as**: Always connected in config sync
- **Backend**: `functions/src/dataRefresh.ts`

## EagleView

- **Status**: STUB — returns mock data
- **Needs**: Real API credentials + implementation
- **TODO locations**: `functions/src/eagleviewService.ts:72,105`
- **Would provide**: Aerial imagery, roof measurements, obstruction detection
- **Backend**: `functions/src/eagleviewService.ts`
- **Frontend**: `src/services/eagleviewService.js`

## Config Sync

The `configSync.ts` Cloud Function bridges `firebase functions:config` with Firestore's `config` collection so the admin UI (`/admin/config`) can display integration status.

```bash
# Set config
firebase functions:config:set stripe.secret_key="sk_test_..." --project power-to-the-people-vpp

# Trigger sync (calls syncConfigStatus from admin UI)
# Visit /admin/config and click "Sync Status"
```

---

*See [INDEX](./INDEX.md) for full navigation*
