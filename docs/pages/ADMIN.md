# Admin Pages (`/admin/*`)

> 18 pages for platform administration. Role: `admin`

## Page Map

| Route | Page Component | Source | Status |
|-------|---------------|--------|--------|
| `/admin/overview` | AdminOverview | `src/pages/admin/AdminOverview.jsx` | NEEDS TEST |
| `/admin/leads` | AdminLeads | `src/pages/admin/AdminLeads.jsx` | NEEDS TEST |
| `/admin/projects` | AdminProjects | `src/pages/admin/AdminProjects.jsx` | NEEDS TEST |
| `/admin/users` | AdminUsers | `src/pages/admin/AdminUsers.jsx` | NEEDS TEST |
| `/admin/billing` | AdminBilling | `src/pages/admin/AdminBilling.jsx` | NEEDS TEST |
| `/admin/invoices` | AdminInvoices | `src/pages/admin/AdminInvoices.jsx` | NEEDS TEST |
| `/admin/sms` | AdminSms | `src/pages/admin/AdminSms.jsx` | NEEDS TEST |
| `/admin/referrals` | AdminReferrals | `src/pages/admin/AdminReferrals.jsx` | NEEDS TEST |
| `/admin/api-keys` | AdminApiKeys | `src/pages/admin/AdminApiKeys.jsx` | NEEDS TEST |
| `/admin/solar-data` | AdminSolarData | `src/pages/admin/AdminSolarData.jsx` | DONE |
| `/admin/compliance` | AdminCompliance | `src/pages/admin/AdminCompliance.jsx` | DONE |
| `/admin/config` | AdminConfig | `src/pages/admin/AdminConfig.jsx` | DONE |
| `/admin/ava` | AdminAva | `src/pages/admin/AdminAva.jsx` | NEEDS TEST |
| `/admin/campaigns` | AdminCampaigns | `src/pages/admin/AdminCampaigns.jsx` | NEEDS TEST |
| `/admin/analytics` | AdminAnalytics | `src/pages/admin/AdminAnalytics.jsx` | NEEDS TEST |
| `/admin/tasks` | AdminTasks | `src/pages/admin/AdminTasks.jsx` | NEEDS TEST |
| `/admin/credits` | AdminCredits | `src/pages/admin/AdminCredits.jsx` | NEEDS TEST |
| `/admin/webhooks` | AdminWebhooks | `src/pages/admin/AdminWebhooks.jsx` | NEEDS TEST |

## Navigation

Admin pages use `AppShell` with sidebar navigation. Entry: `/admin` redirects to `/admin/overview`.

## Key Issues

- **AdminInvoices**: Revenue chart is placeholder (`{/* Revenue by Month Placeholder */}` at line 132)
- **AdminOverview**: May show stale/hardcoded aggregate metrics
- **AdminAnalytics**: Verify data is real, not hardcoded
- **AdminSms**: Test with real Twilio (costs $0.0075/msg)

## Recently Rebuilt

- `AdminSolarData` — Rich filters + DataTable + compliance summary (Feb 9)
- `AdminCompliance` — DataTable + FilterBar components (Feb 9)
- `AdminConfig` — Google Solar integration added (Feb 9)

## Dependencies

| Page | Backend Service | External API |
|------|----------------|-------------|
| AdminBilling | `payments.ts` | Stripe |
| AdminInvoices | `mercuryInvoice.ts` | Mercury |
| AdminSms | `smsNotifications.ts` | Twilio |
| AdminSolarData | `solarDataApi.ts` | NREL, Google Solar |
| AdminConfig | `configSync.ts` | All integrations |
| AdminApiKeys | `apiKeys.ts` | — |
| AdminLeads | `leads.ts` | — |

---

*See [INDEX](../INDEX.md) for full navigation*
