# Power to the People — Solar CRM

Full-stack solar CRM platform with subscription billing, API marketplace, lead management, referral tracking, SMS notifications, Mercury ACH invoicing, and 2026 compliance checking.

## Quick Start

```bash
# Frontend
npm install && npm run dev                    # React + Vite → http://localhost:5173

# Backend
cd functions && npm install && npm run build
firebase deploy --only functions --project power-to-the-people-vpp

# API Docs
npm run generate:docs                         # Generates manifest.json + openapi.yaml
open http://localhost:5173/api-docs            # Interactive Swagger UI
```

## Architecture

```
┌──────────────────┐      ┌─────────────────────────┐      ┌──────────────┐
│  React Frontend   │─────▶│  Firebase Cloud Functions │─────▶│   Firestore   │
│  Vite · port 5173 │      │  Node.js 22 · 50+ fns    │      │  15+ collections│
└──────────────────┘      └────────────┬────────────┘      └──────────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        ▼              ▼              ▼
                  ┌──────────┐  ┌──────────┐  ┌──────────┐
                  │  Stripe   │  │ Mercury  │  │  Twilio  │
                  │ Payments  │  │ ACH Bank │  │   SMS    │
                  └──────────┘  └──────────┘  └──────────┘
```

## Documentation

| Resource | Location | Description |
|----------|----------|-------------|
| **System Reference** | `CLAUDE.md` | Complete system map — every function, collection, integration, config |
| **API Spec** | `openapi.yaml` | OpenAPI 3.0 spec for HTTP endpoints (auto-generated) |
| **System Manifest** | `manifest.json` | Machine-readable function registry (auto-generated) |
| **Interactive Docs** | `/api-docs` | Swagger UI — browse and test API endpoints |
| **Source Code** | `functions/src/` | TypeScript source with JSDoc annotations (the source of truth) |

## Key Systems

- **Subscription Billing** — Stripe Checkout, 3 tiers ($79/$149/$299), usage metering, billing portal
- **Solar Data API** — Equipment, utilities, incentives, permits, compliance checks, estimates
- **Lead Management** — CRUD, scoring, assignment, webhooks, pipeline tracking
- **Mercury Invoicing** — ACH invoices to homeowners, auto-sync every 30 min
- **SMS Notifications** — Twilio-powered auto-notifications on project events
- **Referral System** — Tracking, commissions, weekly payout processing
- **API Key Management** — Scoped keys, rate limiting, usage logging, rotation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Cesium 3D, Google Solar API |
| Backend | Firebase Cloud Functions (Node.js 22, v1 SDK) |
| Database | Cloud Firestore |
| Payments | Stripe (subscriptions + one-time) |
| Banking | Mercury (ACH invoicing) |
| SMS | Twilio |
| Auth | Firebase Authentication + API keys |
| Hosting | Firebase Hosting |

## Project

- **Firebase:** `power-to-the-people-vpp`
- **App:** https://power-to-the-people-vpp.web.app
- **API:** https://us-central1-power-to-the-people-vpp.cloudfunctions.net

## Generating Docs

The documentation is **code-first** — the TypeScript source files with JSDoc annotations are the single source of truth. Everything else is derived:

```bash
npm run generate:docs
```

This reads `functions/src/*.ts`, parses JSDoc annotations, and produces:
- `manifest.json` — Machine-readable system map (every function, collection, integration)
- `openapi.yaml` — OpenAPI 3.0 spec for HTTP endpoints (rendered by Swagger UI)
