# Customer Portal Pages (`/portal/*`)

> 12 pages for homeowners/customers. Role: `customer`

## Page Map

| Route | Page Component | Source | Status |
|-------|---------------|--------|--------|
| `/portal` | PortalHome | `src/pages/portal/PortalHome.jsx` | NEEDS TEST |
| `/portal/project` | PortalProject | `src/pages/portal/PortalProject.jsx` | NEEDS TEST |
| `/portal/project/:id` | PortalProject | `src/pages/portal/PortalProject.jsx` | NEEDS TEST |
| `/portal/invoices` | PortalInvoices | `src/pages/portal/PortalInvoices.jsx` | NEEDS TEST |
| `/portal/referrals` | PortalReferrals | `src/pages/portal/PortalReferrals.jsx` | NEEDS TEST |
| `/portal/usage` | PortalUsage | `src/pages/portal/PortalUsage.jsx` | NEEDS TEST |
| `/portal/settings` | PortalSettings | `src/pages/portal/PortalSettings.jsx` | NEEDS TEST |
| `/portal/savings` | PortalSavings | `src/pages/portal/PortalSavings.jsx` | NEEDS TEST |
| `/portal/financing` | PortalFinancing | `src/pages/portal/PortalFinancing.jsx` | NEEDS TEST |
| `/portal/survey` | PortalSurvey | `src/pages/portal/PortalSurvey.jsx` | NEEDS TEST |
| `/portal/schedule` | PortalSchedule | `src/pages/portal/PortalSchedule.jsx` | NEEDS TEST |
| `/portal/tasks` | PortalTasks | `src/pages/portal/PortalTasks.jsx` | NEEDS TEST |
| `/portal/credits` | PortalCredits | `src/pages/portal/PortalCredits.jsx` | NEEDS TEST |

## Customer Journey

```
Qualify (public) → Signup → PortalHome → PortalProject → PortalSurvey
→ PortalSchedule → PortalInvoices → PortalUsage → PortalSavings
```

## Key Features by Page

| Page | What Customer Does |
|------|--------------------|
| PortalHome | View project status, next steps |
| PortalProject | Track installation progress |
| PortalSurvey | Submit DIY site survey (photos + measurements) |
| PortalSchedule | Pick installation time slot |
| PortalInvoices | View and pay invoices |
| PortalUsage | View energy usage (SMT integration) |
| PortalSavings | See savings from solar |
| PortalFinancing | Explore financing options |
| PortalReferrals | Share referral link, track rewards |
| PortalCredits | Browse tax credit marketplace |
| PortalTasks | View tasks assigned to them |
| PortalSettings | Update profile |

---

*See [INDEX](../INDEX.md) for full navigation*
