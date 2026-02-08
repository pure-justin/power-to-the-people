# Power to the People -- Solar CRM

> Full-stack solar CRM with subscription billing, API marketplace, lead management,
> referral tracking, SMS notifications, ACH invoicing, and compliance checking.

## Quick Start

```bash
npm install && npm run dev          # Frontend: React + Vite on port 5173
cd functions && npm install && npm run build  # Backend: Firebase Cloud Functions
firebase deploy --only functions --project power-to-the-people-vpp
```

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│   React Frontend    │────>│   Firebase Cloud Fns      │────>│    Firestore    │
│  (Vite, port 5173)  │     │  (Node.js 22, v1 SDK)     │     │ (25+ collections)│
└─────────────────────┘     └──────────┬───────────────┘     └─────────────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        v              v              v
                  ┌──────────┐  ┌──────────┐  ┌──────────┐
                  │  Stripe   │  │ Mercury  │  │  Twilio  │
                  │ Payments  │  │ Banking  │  │   SMS    │
                  └──────────┘  └──────────┘  └──────────┘
```

## Cloud Functions Registry

### Payment & Billing
| Function | Type | Auth | Description |
|----------|------|------|-------------|
| createCheckoutSession | onCall | firebase | Create Stripe Checkout for subscription signup |
| createBillingPortalSession | onCall | firebase | Stripe self-service portal |
| getSubscriptionStatus | onCall | firebase | Current tier, usage, limits |
| createSubscription | onCall | firebase | Direct subscription creation (with payment method) |
| updateSubscription | onCall | firebase | Upgrade/downgrade tier (with proration) |
| cancelSubscription | onCall | firebase | Cancel subscription (immediate or at period end) |
| stripeWebhook | onRequest POST | stripe_signature | Webhook for subscription lifecycle events |

### Solar Data API (HTTP endpoints, API-key protected)
| Function | Type | Auth | Scope | Billing | Description |
|----------|------|------|-------|---------|-------------|
| solarEquipment | onRequest GET | api_key | read_equipment | api_call | Query equipment database |
| solarUtilities | onRequest GET | api_key | read_utilities | api_call | Query utility rates |
| solarIncentives | onRequest GET | api_key | read_incentives | api_call | Query incentive programs |
| solarPermits | onRequest GET | api_key | read_permits | api_call | Query permit requirements |
| solarComplianceCheck | onRequest POST | api_key | read_compliance | compliance_check | Compound compliance report |
| solarEstimate | onRequest POST | api_key | read_solar | api_call | Full solar estimate |

### Lead Management
| Function | Type | Auth | Billing | Description |
|----------|------|------|---------|-------------|
| createLead | onCall | firebase | lead | Create new solar lead |
| updateLead | onCall | firebase | none | Update lead data |
| addLeadNote | onCall | firebase | none | Add note to lead |
| assignLead | onCall | firebase | none | Assign lead to installer |
| recalculateLeadScores | onCall | firebase | none | Recalculate all lead scores |
| leadWebhook | onRequest POST | api_key | lead | External lead ingestion |

### API Key Management
| Function | Type | Auth | Description |
|----------|------|------|-------------|
| createApiKey | onCall | firebase | Generate new API key |
| validateApiKey | onCall | none | Validate key + check rate limits |
| revokeApiKey | onCall | firebase | Permanently disable key |
| rotateApiKey | onCall | firebase | Generate new key, same ID |
| updateApiKey | onCall | firebase | Update settings/scopes |
| getApiKeyUsage | onCall | firebase | Usage stats + logs |
| cleanupApiKeys | pubsub | none | Daily cleanup of expired keys |
| validateApiKeyFromRequest | helper (exported) | none | Validate API key from HTTP request header |

### Mercury Invoicing (ACH)
| Function | Type | Auth | Description |
|----------|------|------|-------------|
| createMercuryCustomer | onCall | admin | Create AR customer linked to lead |
| createMercuryInvoice | onCall | admin | Create ACH invoice via Mercury API |
| getMercuryInvoice | onCall | admin | Get invoice details from Mercury |
| listMercuryInvoices | onCall | admin | List invoices with status/limit filters |
| cancelMercuryInvoice | onCall | admin | Cancel invoice in Mercury + Firestore |
| syncInvoiceStatus | pubsub (every 30 min) | none | Sync unpaid/processing invoices from Mercury |

### SMS Notifications (Twilio)
| Function | Type | Auth | Description |
|----------|------|------|-------------|
| smsOnProjectCreated | trigger (projects onCreate) | none | Auto-SMS on new project + admin alert |
| onProjectStatusUpdate | trigger (projects onUpdate) | none | Auto-SMS on status change |
| onReferralReward | trigger (referrals onUpdate) | none | Auto-SMS on referral reward earned |
| sendCustomSMS | onCall | admin | Send custom SMS to single recipient |
| sendBulkSMS | onCall | admin | Bulk SMS campaign (max 100 recipients) |
| sendPaymentReminders | pubsub (daily 9 AM CST) | none | Payment reminder SMS for due-in-1-3-days |
| getSmsStats | onCall | firebase | SMS usage statistics (last 30 days) |
| twilioStatusCallback | onRequest POST | none | Twilio delivery status webhooks |

### Referral System
| Function | Type | Auth | Description |
|----------|------|------|-------------|
| onProjectCreated | trigger (projects onCreate) | none | Auto-create referral on project |
| onProjectUpdated | trigger (projects onUpdate) | none | Update referral on project change |
| updateReferralStatusHttp | onRequest | admin | HTTP referral status update |
| getReferralStats | onCall | firebase | Referral statistics |
| processWeeklyPayouts | pubsub | none | Weekly referral payout processing |

### Referral Webhooks
| Function | Type | Auth | Description |
|----------|------|------|-------------|
| referralStatusWebhook | onRequest POST | api_key (HMAC) | External referral status update |
| referralBulkUpdateWebhook | onRequest POST | api_key (HMAC) | Bulk referral status update |
| referralStatsWebhook | onRequest GET | api_key (HMAC) | Referral stats query |

### Secure Webhooks (API key protected)
| Function | Type | Auth | Description |
|----------|------|------|-------------|
| secureLeadWebhook | onRequest POST | api_key | Secure lead ingestion |
| secureSolarWebhook | onRequest POST | api_key | Secure solar data webhook |
| secureLeadQuery | onRequest GET | api_key | Secure lead query |

### Data & SMT
| Function | Type | Auth | Description |
|----------|------|------|-------------|
| refreshSolarData | pubsub (Sundays 2 AM CST) | none | Scheduled solar data refresh from OpenEI/NREL |
| triggerDataRefresh | onCall | admin | Manual data refresh trigger |
| fetchSmtUsage | onCall | firebase | Fetch Smart Meter Texas usage data |
| smtWebhook | onRequest POST | none | SMT data webhook |

## Firestore Collections

| Collection | Description | Key Fields |
|------------|-------------|------------|
| subscriptions | Stripe subscription records | userId, tier, status, limits, stripeSubscriptionId |
| usage_records | Monthly usage per user | userId, month, api_call_count, lead_count, compliance_check_count |
| leads | Solar leads | customerName, email, phone, address, score, status, assignedTo |
| commercial_leads | Cold outbound campaign leads | engagement, status, notes, propertyManager |
| invoices | Mercury ACH invoices | mercuryInvoiceId, leadId, amount, status, dueDate |
| apiKeys | API key management | key (hashed), scopes, rateLimit, usageStats, status |
| apiKeyUsageLogs | API usage audit log | apiKeyId, endpoint, method, statusCode, timestamp |
| solar_equipment | Panel/inverter/battery database | type, manufacturer, feoc_compliant, domestic_content_compliant |
| solar_utility_rates | Utility rates by state/zip | state, zip_codes, utility_name, has_net_metering |
| solar_incentives | Solar incentive programs | state, incentive_type, status, sector |
| solar_permits | Permit requirements | state, jurisdiction_id, county |
| solar_tpo_providers | Third-party ownership providers | states, provider_name |
| solar_finance_products | Solar finance products | (auth required) |
| referrals | Referral tracking | referrerId, projectId, status, commission |
| referralTracking | Referral status tracking | referrerId, status |
| referralClicks | Referral click analytics | (public write) |
| projects | Solar installation projects | leadId, status, systemSize, installer, phone |
| users | User profiles + roles | email, role, name |
| smsLog | SMS delivery log | to, message, sid, status, sentAt |
| addressCache | Geocoding cache | (public read) |
| analytics | Admin analytics | (admin only) |
| config | System configuration | (auth read, admin write) |
| data_refresh_log | Data refresh audit log | source, status, records_processed |
| ava_conversations | Ava messaging | messages subcollection |
| campaigns | Campaign tracking | (admin only) |
| utility_rates | Cached utility rates | (public read) |
| email_templates | Email templates | (public read) |
| pendingNotifications | Email queue | (admin only) |
| payouts | Referral payouts | userId, amount |

## Billing System

### Subscription Tiers (Stripe test mode)
| Tier | Price | Leads/mo | API Calls/mo | Compliance/mo | Price ID |
|------|-------|----------|--------------|---------------|----------|
| Starter | $79 | 50 | 1,000 | 25 | price_1SyMrCQhgZdyZ7qRyWDGrr9U |
| Professional | $149 | 200 | 10,000 | 200 | price_1SyMrEQhgZdyZ7qRYLfqv0Ds |
| Enterprise | $299 | Unlimited | 100,000 | Unlimited | price_1SyMrFQhgZdyZ7qRcQk9fAqh |

### Pay-As-You-Go (future)
| Product | Price | Price ID |
|---------|-------|----------|
| Solar Lead | $5/each | price_1SyMrGQhgZdyZ7qRixVanOLJ |
| API Call Pack (1000) | $25/pack | price_1SyMrHQhgZdyZ7qRfeQQUUI6 |
| Compliance Check | $2/each | price_1SyMrIQhgZdyZ7qRZKDhbgKL |

### Usage Metering Flow
```
API Request --> validateApiKeyFromRequest() --> recordAndCheckUsage()
                                                        |
                                              +---------+-----------+
                                              |  checkUsageLimit()  | <-- reads subscriptions + usage_records
                                              |  recordUsage()      | <-- increments usage_records
                                              +---------------------+
```

## External Integrations

### Stripe (Payments)
- **Mode:** Test (sk_test_...)
- **Config:** `stripe.secret_key`, `stripe.webhook_secret`
- **Webhook:** https://us-central1-power-to-the-people-vpp.cloudfunctions.net/stripeWebhook
- **Events handled:** customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed, checkout.session.completed

### Mercury (ACH Banking)
- **Base URL:** https://api.mercury.com/api/v1
- **Account:** Agentic Labs LLC, Checking ••3334
- **Account ID:** ecc22c2c-aabf-11f0-955b-13f894471589
- **Config:** `mercury.api_token`

### Twilio (SMS)
- **Config:** `twilio.account_sid`, `twilio.auth_token`, `twilio.phone_number`
- **SMS cost estimate:** $0.0075/message

## Firebase Config
```bash
# View all config
firebase functions:config:get --project power-to-the-people-vpp

# Set config
firebase functions:config:set stripe.secret_key="sk_test_..." --project power-to-the-people-vpp
```

## API Authentication
```
# API key format (generated by createApiKey)
Authorization: Bearer pk_test_[48 hex chars]   (development)
Authorization: Bearer pk_live_[48 hex chars]   (production)

# Rate limits (production)
60/min, 1,000/hr, 10,000/day, 100,000/month

# Rate limits (development)
10/min, 100/hr, 1,000/day, 10,000/month
```

## API Key Scopes
| Scope | Description |
|-------|-------------|
| read_leads | Read lead data |
| write_leads | Create/update leads |
| read_solar | Access solar API data |
| write_solar | Trigger solar analysis |
| read_smt | Access SMT data |
| write_smt | Trigger SMT fetch |
| read_equipment | Access equipment database |
| read_utilities | Access utility rate data |
| read_incentives | Access incentive programs |
| read_permits | Access permit requirements |
| read_compliance | Run compliance checks |
| admin | Full access |

## File Structure
```
solar-crm/
├── CLAUDE.md                  <-- This file (system reference)
├── package.json               <-- Frontend dependencies + scripts
├── firestore.rules            <-- Firestore security rules (25+ collections)
├── firestore.indexes.json     <-- Firestore composite indexes
├── firebase.json              <-- Firebase hosting/functions config
├── .firebaserc                <-- Firebase project alias
├── functions/
│   ├── src/
│   │   ├── index.ts           <-- Function registry (all exports)
│   │   ├── payments.ts        <-- Stripe subscriptions, checkout, billing, usage metering
│   │   ├── apiKeys.ts         <-- API key CRUD, validation, rate limiting, scopes
│   │   ├── solarDataApi.ts    <-- Solar data HTTP endpoints (6 endpoints)
│   │   ├── leads.ts           <-- Lead management CRUD + webhook
│   │   ├── mercuryInvoice.ts  <-- Mercury ACH invoicing (customer + invoice CRUD + sync)
│   │   ├── smsNotifications.ts <-- Twilio SMS (triggers + manual + bulk + reminders)
│   │   ├── referrals.ts       <-- Referral system (triggers + stats + payouts)
│   │   ├── referralWebhooks.ts <-- Referral webhooks (HMAC-signed)
│   │   ├── secureLeadWebhook.ts <-- API-key-protected webhook endpoints
│   │   ├── smtConnector.ts    <-- Smart Meter Texas integration
│   │   ├── dataRefresh.ts     <-- Solar data refresh from OpenEI/NREL (scheduled + manual)
│   │   └── examples/          <-- Example code
│   └── package.json           <-- Backend deps: firebase-admin, firebase-functions, stripe, twilio, puppeteer-core
├── scripts/
│   ├── automated-lead-pipeline.js   <-- Lead generation pipeline
│   ├── installer-data-pipeline.js   <-- Installer scraping pipeline
│   ├── import-installers-to-firestore.js
│   ├── importSolarData.ts           <-- Solar data import
│   ├── create-admin.js              <-- Create admin user
│   ├── validate-leads.js
│   └── ...
├── campaigns/
│   └── commercial-outbound/   <-- Commercial cold outbound campaign system
├── public/
│   ├── api-docs/
│   │   └── index.html         <-- Swagger UI
│   └── api-spec.json          <-- API spec (Postman collection also available)
├── src/                       <-- React frontend (JSX)
│   ├── App.jsx
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   └── styles/
├── data/                      <-- Local data files
├── scan-bill-service/         <-- Bill scanning service
├── smt-connector/             <-- SMT standalone connector
└── docs/
    └── archive/               <-- 69 legacy docs (preserved, do not delete)
```

## Development

```bash
# Frontend
npm run dev                    # Vite dev server on port 5173
npm run build                  # Production build to dist/

# Backend
cd functions && npm run build  # Compile TypeScript
firebase deploy --only functions --project power-to-the-people-vpp

# Lead pipelines
npm run leads:generate         # Full automated lead pipeline
npm run leads:scrape           # Scrape mode
npm run leads:quick            # Quick 100 leads (skip Firestore)
npm run leads:validate         # Validate existing leads

# Installer pipelines
npm run installers:scrape      # Scrape installer data
npm run installers:scrape:500  # Scrape 500 installers
npm run installers:scrape:1000 # Scrape 1000 installers
npm run installers:import      # Import to Firestore

# Campaigns
npm run campaign:run           # Run commercial outbound campaign
npm run campaign:dryrun        # Dry run (no sends)
npm run campaign:test          # Test with 10 targets

# View API docs
open http://localhost:5173/api-docs
```

## URLs
- **App:** https://power-to-the-people-vpp.web.app
- **API Base:** https://us-central1-power-to-the-people-vpp.cloudfunctions.net
- **Firebase Console:** https://console.firebase.google.com/project/power-to-the-people-vpp
- **Stripe Dashboard:** https://dashboard.stripe.com/test

## Tech Stack
- **Frontend:** React 19, Vite 7, React Router 7, Cesium + Resium (3D), Lucide icons
- **Backend:** Firebase Cloud Functions v1 SDK, Node.js 22, TypeScript 5
- **Database:** Firestore
- **Payments:** Stripe (subscriptions + checkout + billing portal)
- **Banking:** Mercury API (ACH invoicing)
- **SMS:** Twilio
- **Auth:** Firebase Auth (roles: admin, installer, sales, user)
- **Hosting:** Firebase Hosting
