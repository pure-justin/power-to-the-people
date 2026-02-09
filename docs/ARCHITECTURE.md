# SolarOS Architecture

## System Overview

```
Browser (React 19 + Vite 7)
    │
    ├── Firebase Auth (4 roles: admin, installer, sales, customer)
    ├── Firestore (25+ collections)
    └── Cloud Functions v1 (Node 22, TS 5) ── 100+ exported functions
            │
            ├── Stripe (subscriptions, checkout, billing portal)
            ├── Mercury (ACH invoicing, payment sync)
            ├── Twilio (SMS notifications, campaigns)
            ├── NREL (solar resource data)
            ├── Google Solar (rooftop analysis)
            ├── OpenEI (utility rates — free, no key)
            └── EagleView (roof measurement — STUB, needs API)
```

## Frontend Architecture

- **Framework**: React 19 + Vite 7 + React Router 7
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **3D**: Cesium + Resium (roof visualizer)
- **Code splitting**: All pages lazy-loaded via `React.lazy()` (initial bundle ~400KB)
- **Auth**: `AuthContext` wraps app, `AppShell` enforces role gates
- **Entry**: `src/App.jsx` — all 75 routes defined here

### Role-Based Access

| Role | Route Prefix | Description |
|------|-------------|-------------|
| (none) | `/` | Public pages — anyone can view |
| customer | `/portal/*` | Homeowner self-service |
| installer | `/dashboard/*` | Installer workspace |
| sales | `/sales/*` | Sales rep tools |
| admin | `/admin/*` | Platform admin |

## Backend Architecture

- **Runtime**: Firebase Cloud Functions v1 SDK, Node.js 22
- **Language**: TypeScript 5
- **Entry**: `functions/src/index.ts` — exports 100+ functions
- **Auth**: `onCall` functions verify Firebase Auth + role; HTTP APIs use API keys

### Function Types

| Type | Auth | Example |
|------|------|---------|
| `onCall` | Firebase Auth token | `createLead`, `createCheckoutSession` |
| `onRequest` | API key in header | `solarEquipment`, `marketplaceApi` |
| `trigger` | None (auto-fired) | `onProjectCreated`, `onSurveyApproved` |
| `pubsub` | None (scheduled) | `sendPaymentReminders`, `refreshSolarData` |

## Data Flow: Lead to Install

```
1. Lead Created (qualify form / webhook / admin)
2. Lead Scored (auto: address, savings, urgency)
3. Lead Assigned (sales rep / auto-assign)
4. Project Created (lead converts)
5. Survey → 6. CAD → 7. Permit → 8. Schedule → 9. Install → 10. Funding
   Each phase auto-triggers next via pipelineOrchestrator.ts
```

## Key Design Patterns

- **AI-first pipeline**: AI attempts each task → escalates to human on failure → learns from resolution
- **Service layer**: Frontend services (`src/services/*.js`) wrap Firestore/Functions calls
- **Shared UI**: `src/components/ui/` has reusable primitives (DataTable, FilterBar, MetricCard, etc.)
- **API marketplace**: External access via API keys with scopes, rate limits, usage metering

## Hosting

- **URL**: https://power-to-the-people-vpp.web.app
- **API**: https://us-central1-power-to-the-people-vpp.cloudfunctions.net
- **Firebase project**: `power-to-the-people-vpp`

---

*See [INDEX](./INDEX.md) for full navigation*
