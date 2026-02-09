# Backend Services (`functions/src/`)

> 40+ TypeScript modules exporting 100+ Cloud Functions.

## Module Map

### Payment & Billing
| Module | Functions | Description |
|--------|----------|-------------|
| `payments.ts` | 7 | Stripe: checkout, subscriptions, billing portal, webhooks |
| `apiKeys.ts` | 7 | API key CRUD, validation, rate limiting, scopes |

### Lead Management
| Module | Functions | Description |
|--------|----------|-------------|
| `leads.ts` | 6 | Lead CRUD, scoring, assignment, webhook |
| `secureLeadWebhook.ts` | 3 | API-key-protected lead/solar webhooks |

### Invoicing & SMS
| Module | Functions | Description |
|--------|----------|-------------|
| `mercuryInvoice.ts` | 6 | Mercury ACH: create, cancel, sync invoices |
| `smsNotifications.ts` | 8 | Twilio: auto/manual/bulk SMS, reminders |

### Referrals
| Module | Functions | Description |
|--------|----------|-------------|
| `referrals.ts` | 5 | Referral tracking, stats, payouts |
| `referralWebhooks.ts` | 3 | HMAC-signed referral webhooks |

### Solar Data
| Module | Functions | Description |
|--------|----------|-------------|
| `solarDataApi.ts` | 6 | HTTP endpoints: equipment, utilities, incentives, permits, compliance, estimate |
| `dataRefresh.ts` | 2 | Weekly data refresh from OpenEI/NREL |
| `smtConnector.ts` | 2 | Smart Meter Texas usage data |

### SolarOS Pipeline (Phases 0-9)
| Module | Phase | Functions | Description |
|--------|-------|----------|-------------|
| `aiTaskEngine.ts` | 0 | 7 | AI-first task system with human fallback |
| `ahjDatabase.ts` | 1 | 9 | AHJ registry, permit SOPs, SolarAPP+ |
| `surveyService.ts` | 2 | 7 | Site survey CRUD, AI review |
| `cadService.ts` | 3 | 6 | CAD design generation, NEC compliance |
| `eagleviewService.ts` | 2-3 | 4 | Roof measurements (STUB) |
| `permitService.ts` | 4 | 8 | Permit lifecycle tracking |
| `schedulingService.ts` | 5 | 8 | Install scheduling, availability |
| `photoAnalysisService.ts` | 6 | 6 | Install photo QC, AI analysis |
| `fundingService.ts` | 7 | 7 | Funding packages, bankability |
| `taxCreditService.ts` | 9 | 18 | Tax credit audit, marketplace, escrow |

### Pipeline Engine
| Module | Functions | Description |
|--------|----------|-------------|
| `pipelineOrchestrator.ts` | 5 | Auto-triggers between phases |
| `pipelineAutoTasks.ts` | — | 10-task dependency chain |
| `projectPipeline.ts` | — | Stage management |

### Marketplace & HTTP APIs
| Module | Endpoints | Description |
|--------|----------|-------------|
| `marketplaceApi.ts` | 13 | Marketplace REST: listings, bids, workers |
| `projectApi.ts` | 8 | Project REST: pipeline, tasks, timeline |
| `webhookApi.ts` | 5 | Webhook CRUD + test delivery |
| `customerApi.ts` | 5 | Public: signup, survey, schedule |

### Internal Engines
| Module | Description |
|--------|-------------|
| `smartBidding.ts` | 7-factor bid scoring |
| `slaEngine.ts` | Strike system + reliability scoring |
| `locationMatching.ts` | Zip-to-coordinates, haversine matching |
| `complianceEngine.ts` | Equipment compliance checking |
| `financialEngine.ts` | Financial calculations |
| `proposalGenerator.ts` | Solar proposal generation |
| `documentService.ts` | HTML-to-PDF, e-signatures |
| `marketplace.ts` | Marketplace business logic |
| `marketplaceAutomation.ts` | Marketplace auto-actions |
| `configSync.ts` | Config bridge to Firestore |
| `corsConfig.ts` | CORS configuration |

## Stubs & TODOs

| File | Line | Issue |
|------|------|-------|
| `eagleviewService.ts` | 72, 105 | `// TODO: Replace with actual EagleView API call` |
| `documentService.ts` | 813 | `// TODO: Trigger actual email/SMS notification here` |

## Entry Point

All functions are re-exported from `functions/src/index.ts` (312 lines).

---

*See [INDEX](../INDEX.md) for full navigation*
