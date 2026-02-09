# SolarOS Documentation Hub

> Navigate the entire project from here. Each doc is <200 lines for fast context loading.

## Quick Links

| Doc | What's In It |
|-----|-------------|
| [ARCHITECTURE](./ARCHITECTURE.md) | System overview, tech stack, data flow |
| [COMPONENTS](./COMPONENTS.md) | Shared UI component catalog (17 primitives + 22 domain) |
| [INTEGRATIONS](./INTEGRATIONS.md) | External APIs: Stripe, Mercury, Twilio, NREL, Google Solar, EagleView |
| [TODO Checklist](../TODO_MASTER_CHECKLIST.md) | Master task list with priorities |

## Pages by Section

| Section | Doc | Route Prefix | Pages | Role |
|---------|-----|-------------|-------|------|
| Admin | [pages/ADMIN](./pages/ADMIN.md) | `/admin/*` | 18 | admin |
| Dashboard | [pages/DASHBOARD](./pages/DASHBOARD.md) | `/dashboard/*` | 22 | installer |
| Portal | [pages/PORTAL](./pages/PORTAL.md) | `/portal/*` | 12 | customer |
| Sales | [pages/SALES](./pages/SALES.md) | `/sales/*` | 6 | sales |
| Public | [pages/PUBLIC](./pages/PUBLIC.md) | `/` | 17 | none |

## Backend Services

| Doc | What's In It |
|-----|-------------|
| [backend/SERVICES](./backend/SERVICES.md) | All 40+ Cloud Functions by module |
| [backend/FIRESTORE](./backend/FIRESTORE.md) | 25+ collections schema reference |

## Pipeline Phases

| Doc | What's In It |
|-----|-------------|
| [pipeline/PHASES](./pipeline/PHASES.md) | 9-phase pipeline: Survey to Tax Credits |

## Key Source Paths

```
src/pages/admin/       18 admin pages
src/pages/dashboard/   22 installer pages
src/pages/portal/      12 customer portal pages
src/pages/sales/        6 sales pages
src/pages/              17 public pages
src/components/ui/     17 UI primitives
src/components/        22 domain components
src/services/          34 frontend services
functions/src/         40+ backend modules
```

## Status Legend

Throughout these docs:
- `DONE` — Built and verified working
- `NEEDS TEST` — Built, not yet tested with real data
- `STUB` — Placeholder/mock implementation
- `TODO` — Not yet built
- `BLOCKED` — Waiting on external dependency

---

*Last updated: February 9, 2026*
