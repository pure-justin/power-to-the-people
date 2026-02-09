# SolarOS Master Checklist — February 9, 2026

> Comprehensive audit of what's built, what's broken, and what's next.
> Generated from full codebase analysis of 75 pages, 38 components, 40+ backend files, 100+ Cloud Functions.

---

## Project Stats

| Category | Count |
|----------|-------|
| Frontend Pages | 75 |
| UI Components | 38 |
| Backend Files | 40+ |
| Exported Functions | 100+ |
| Frontend Services | 34 |
| Firestore Collections | 25+ |
| External Integrations | 7 (Stripe, Mercury, Twilio, NREL, OpenEI, Google Solar, EagleView) |

---

## PRIORITY 1: Critical Fixes & Polish (Do Now)

### 1.1 Backend TODOs (Stubbed Code)
- [ ] **EagleView API integration** — `functions/src/eagleviewService.ts:72,105` has `// TODO: Replace with actual EagleView API call` — currently returns mock data
- [ ] **Document notification sending** — `functions/src/documentService.ts:813` has `// TODO: Trigger actual email/SMS notification here`
- [ ] **Referral email notifications** — `src/services/referralNotificationService.js:160` has `// TODO: Implement actual email sending via Cloud Function`

### 1.2 UI Placeholder Sections
- [x] **AdminInvoices revenue chart** — ~~line 132 placeholder~~ DONE: Real bar chart from invoice data
- [ ] **SalesTerritory map** — `LeadMapPlaceholder` component at line 60 — needs real map (Google Maps MCP available)

### 1.3 Deploy Google Solar Config
- [x] **Deploy functions** — syncConfigStatus redeployed, full deploy in progress
- [ ] **Verify Google Solar** shows "Connected" on `/admin/config` after sync

---

## PRIORITY 2: UX & Navigation Cleanup

### 2.1 Navigation & Information Architecture
- [x] **Add Help/FAQ page** — `/help` — comprehensive FAQ, role guides, feature grid, contact section
- [ ] **Add contextual help tooltips** — on complex pages (Compliance, Equipment, API Keys)
- [ ] **Breadcrumbs** — admin/dashboard/portal sections lack breadcrumb navigation
- [ ] **Empty state improvements** — many pages show generic "No data" — should guide users on what to do

### 2.2 Admin Section UX
- [ ] **AdminOverview** — verify it shows real aggregate metrics, not stale data
- [ ] **AdminLeads** — test search, filtering, sorting with real lead data
- [x] **AdminProjects** — ✅ DONE (DataTable/FilterBar upgrade)
- [x] **AdminUsers** — ✅ DONE (DataTable/FilterBar + role editor modal)
- [x] **AdminBilling** — ✅ DONE (fixed hooks crash + DataTable/FilterBar upgrade)
- [x] **AdminInvoices** — ✅ DONE (real revenue chart + DataTable/FilterBar)
- [x] **AdminSms** — ✅ DONE (DataTable/FilterBar upgrade)
- [x] **AdminReferrals** — ✅ DONE (DataTable/FilterBar upgrade)
- [x] **AdminApiKeys** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **AdminSolarData** — ✅ DONE (just rebuilt with filters + DataTable)
- [ ] **AdminCompliance** — ✅ DONE (just rebuilt with DataTable + FilterBar)
- [ ] **AdminConfig** — ✅ DONE (added Google Solar integration)
- [ ] **AdminAva** — verify Ava conversation display and task queue
- [x] **AdminCampaigns** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **AdminAnalytics** — verify analytics data is real, not hardcoded
- [ ] **AdminTasks** — verify AI task queue displays correctly
- [x] **AdminCredits** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **AdminWebhooks** — verify webhook CRUD and test delivery

### 2.3 Portal (Customer) UX
- [ ] **PortalHome** — verify customer dashboard shows their project status
- [ ] **PortalProject** — test project detail view with real project
- [x] **PortalInvoices** — ✅ DONE (DataTable/FilterBar upgrade)
- [x] **PortalReferrals** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **PortalUsage** — verify energy usage display (SMT integration)
- [ ] **PortalSettings** — verify profile update works
- [ ] **PortalSavings** — verify savings calculator with real rates
- [ ] **PortalFinancing** — verify financing options display
- [ ] **PortalSurvey** — test full survey submission flow (multi-step)
- [ ] **PortalSchedule** — verify scheduling slot selection
- [ ] **PortalTasks** — verify task queue for customer actions
- [x] **PortalCredits** — ✅ DONE (DataTable/FilterBar upgrade)

### 2.4 Dashboard (Installer) UX
- [ ] **DashboardHome** — verify installer metrics are real
- [x] **DashboardLeads** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **DashboardProjects** — test project list and detail view
- [ ] **DashboardProjectDetail** — verify full project detail with pipeline
- [x] **DashboardCompliance** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **DashboardEstimates** — test solar estimate generation
- [x] **DashboardInvoices** — ✅ DONE (DataTable/FilterBar upgrade)
- [x] **DashboardApiKeys** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **DashboardBilling** — verify billing/subscription display
- [x] **DashboardReferrals** — ✅ DONE (DataTable/FilterBar upgrade)
- [x] **DashboardEquipment** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **DashboardTasks** — verify AI task queue
- [ ] **DashboardSurvey** — test professional survey tool
- [ ] **DashboardPermits** — verify permit tracking
- [ ] **DashboardDesigns** — verify CAD design display
- [ ] **DashboardSchedule** — test availability management
- [ ] **DashboardInstall** — test install photo QC flow
- [ ] **DashboardFunding** — verify funding package management
- [x] **DashboardCredits** — ✅ DONE (DataTable/FilterBar upgrade)
- [x] **DashboardDocuments** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **DashboardMarketplace** — test marketplace listing/bidding
- [ ] **DashboardWorkerProfile** — verify worker profile display

### 2.5 Sales Section UX
- [ ] **SalesHome** — verify sales dashboard metrics
- [x] **SalesLeads** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **SalesAssignments** — verify assignment management
- [x] **SalesPerformance** — ✅ DONE (DataTable/FilterBar upgrade)
- [ ] **SalesProposals** — test proposal generation
- [ ] **SalesTerritory** — implement real map (replace placeholder)

### 2.6 Public Pages UX
- [ ] **Home** — verify hero, features, CTA all look professional
- [ ] **Qualify** — test full qualification flow end-to-end
- [ ] **Pricing** — verify pricing tiers match Stripe config
- [ ] **About** — verify company info is accurate
- [ ] **Features** — verify feature descriptions match actual capabilities
- [ ] **Contact** — test contact form submission
- [ ] **API Docs** — verify Swagger/API docs are complete and accurate
- [ ] **Solar States** — test state-by-state solar data pages
- [ ] **CreditMarketplace** — test public credit listing browse
- [ ] **InstallerComparison** — verify comparison tool works

---

## PRIORITY 3: Data Quality & Integration Testing

### 3.1 Firestore Data Verification
- [ ] **solar_equipment** — verify 72+ products have complete compliance fields
- [ ] **solar_utility_rates** — verify 485+ profiles have state, rate, net metering
- [ ] **solar_incentives** — verify 190+ programs are current (not expired)
- [ ] **solar_permits** — verify 106+ jurisdictions have requirements filled
- [ ] **solar_permits_states** — verify 50 state-level docs
- [ ] **leads** — verify lead scoring algorithm works correctly
- [ ] **users** — verify role-based access control works

### 3.2 External API Integration Testing
- [ ] **Stripe** — test checkout flow, subscription management, webhook handling
- [ ] **Mercury** — test invoice creation, ACH payment, status sync
- [ ] **Twilio** — test SMS sending (payment reminders, status updates)
- [ ] **NREL** — test solar resource data API calls
- [ ] **Google Solar** — test rooftop analysis with real addresses
- [ ] **EagleView** — BLOCKED (needs real API credentials + implementation)

### 3.3 API Endpoint Testing
- [ ] Test all 6 solar data API endpoints with real API key
- [ ] Test marketplace API endpoints (13 endpoints)
- [ ] Test project pipeline API endpoints (8 endpoints)
- [ ] Test customer API endpoints (signup, survey, schedule)
- [ ] Test webhook delivery system

---

## PRIORITY 4: SolarOS Pipeline Completeness (Master Plan Phases)

### Phase 0: AI Task Engine
- [x] Backend: `aiTaskEngine.ts` — 7 exported functions
- [ ] Frontend: `DashboardTasks` + `AdminTasks` + `PortalTasks` pages exist — verify they work
- [ ] Learning service: `ai_learnings` collection — verify capture/recall works
- [ ] Test: Create task → AI attempts → escalate to human → complete → learning captured

### Phase 1: AHJ Database & Permits Knowledge
- [x] Backend: `ahjDatabase.ts` — 9 exported functions
- [x] Data: 106 city + 50 state jurisdictions seeded
- [ ] Frontend: No dedicated AHJ management page — need admin UI
- [ ] Data quality: Verify automation_confidence and portal URLs are populated
- [ ] Expand to 500+ jurisdictions (currently 106)
- [ ] SolarAPP+ API integration — check participating jurisdictions

### Phase 2: Site Survey
- [x] Backend: `surveyService.ts` — 7 exported functions
- [x] Frontend: `PortalSurvey` (customer) + `DashboardSurvey` (installer)
- [ ] Test: Full survey submission flow with photo upload
- [ ] EagleView integration for automated roof data (needs API)
- [ ] AI review of survey data (confidence scoring)

### Phase 3: CAD Generation
- [x] Backend: `cadService.ts` — 6 exported functions
- [x] Frontend: `DashboardDesigns`
- [ ] Test: Generate design from survey data
- [ ] Verify NEC compliance checks
- [ ] Verify document package generation (site plan, single-line diagram)

### Phase 4: Permit Automation
- [x] Backend: `permitService.ts` — 8 exported functions
- [x] Frontend: `DashboardPermits`
- [ ] Test: Create permit → submit → track status
- [ ] Permit bot framework — Python scripts not yet created
- [ ] SolarAPP+ integration for instant permits

### Phase 5: Scheduling
- [x] Backend: `schedulingService.ts` — 8 exported functions
- [x] Frontend: `DashboardSchedule` + `PortalSchedule`
- [ ] Test: Set availability → propose → confirm → notifications

### Phase 6: Install QC
- [x] Backend: `photoAnalysisService.ts` — 6 exported functions
- [x] Frontend: `DashboardInstall`
- [ ] Test: Photo upload → AI analysis → pass/fail → sign-off
- [ ] AI photo analysis — verify it actually analyzes (may be stub)

### Phase 7: Funding
- [x] Backend: `fundingService.ts` — 7 exported functions
- [x] Frontend: `DashboardFunding`
- [ ] Test: Create package → check readiness → submit → track

### Phase 8: Interconnection & PTO
- [ ] **NOT BUILT** — no `interconnectionService.ts` in backend
- [ ] Need: Utility interconnection application tracking
- [ ] Need: PTO (Permission to Operate) status monitoring

### Phase 9: Tax Credit Marketplace
- [x] Backend: `taxCreditService.ts` — 18 exported functions
- [x] Frontend: `CreditMarketplace`, `CreditDetail`, `DashboardCredits`, `PortalCredits`, `AdminCredits`
- [ ] Test: Full audit → list → offer → transfer → escrow flow

### Pipeline Orchestrator
- [x] Backend: `pipelineOrchestrator.ts` — 5 trigger functions
- [ ] Test: Survey approved → auto-triggers CAD → permit → schedule → install → funding

---

## PRIORITY 5: Missing Features & Enhancements

### 5.1 Not Yet Built
- [ ] **Interconnection/PTO service** (Phase 8 of master plan)
- [ ] **Permit bot framework** (Python scripts in scripts/permit-bots/)
- [ ] **Real-time notifications** (push notifications, in-app)
- [ ] **Admin AHJ management page** (CRUD for AHJ registry)
- [ ] **Admin schedule overview** (conflict resolution, calendar view)
- [ ] **Compliance engine** (`complianceEngine.ts` exists but check if fully wired)
- [ ] **Help/FAQ system** for end users

### 5.2 Enhancement Opportunities
- [ ] **Mobile responsiveness** — audit all pages on mobile viewport
- [ ] **Loading states** — ensure all pages have proper skeleton loaders
- [ ] **Error boundaries** — per-section error handling (not just global)
- [ ] **Accessibility** — ARIA labels, keyboard navigation, color contrast
- [ ] **Performance** — lazy load heavy components (maps, charts, 3D)
- [ ] **SEO** — meta tags, og:image, structured data for public pages
- [ ] **PWA** — service worker for offline installer mobile experience
- [ ] **Dark mode** — (low priority but nice-to-have)

### 5.3 Security Hardening
- [ ] **Firestore rules audit** — verify all 25+ collections have proper rules
- [ ] **API rate limiting** — verify rate limits are enforced
- [ ] **Input validation** — verify all forms sanitize input
- [ ] **CORS** — verify only allowed origins can call functions
- [ ] **Secret scanning** — verify no API keys in source code
- [ ] **Auth session management** — verify token refresh, logout cleanup

---

## PRIORITY 6: Business & GTM (from Session Status Feb 8)

### Funding Applications (Deadline-Critical)
- [ ] **VFC (F6S)** — $50K — DEADLINE FEB 20 — draft complete, needs human submission
- [ ] **Blue Bear Capital** — VC — submit via deal form
- [ ] **Congruent Ventures** — VC — send email with Template 3
- [ ] **Cleantech Open** — $150K — registration by Feb 27, $30 fee
- [ ] **Elemental Impact** — $3M — needs 3+ FTEs
- [ ] **CalSEED** — $700K — needs California registered agent
- [ ] **New Energy Nexus** — accelerator — email Luna Zhang or Austin Lu

### Marketing & PR
- [ ] **PR/Marketing Bot** — automate social media, press, content (use Ava infra)
- [ ] **Pitch deck** — 10 slides, PDF
- [ ] **2-minute video pitch** — for VFC/F6S
- [ ] **Platform screenshots** — 4-5 shots of working app
- [ ] **Social proof strategy** — execute 12-month plan from `social-proof-strategy.md`

---

## Component Usage Audit (Unused Components to Consider Removing)

These components exist but should verify they're actually imported/used:
- `AdminAnalytics.jsx` (component, not page — may duplicate page)
- `ApiPlayground.jsx`
- `BidComparison.jsx`
- `NotificationPreferences.jsx`
- `ProductionChart.jsx`
- `RoofVisualizer.jsx` / `RoofVisualizer3D.jsx`

These UI components should be adopted more widely:
- `Badge.jsx`, `ComplianceBadge.jsx` — use instead of inline badge markup
- `ConfirmDialog.jsx` — use for destructive actions
- `CurrencyDisplay.jsx` — use for consistent money formatting
- `EmptyState.jsx` — use for all empty data states
- `GaugeMeter.jsx` — use in dashboards
- `KanbanBoard.jsx` — use for pipeline visualization
- `LoadingSkeleton.jsx` — use instead of custom skeleton markup
- `MetricCard.jsx` — standardize all metric cards
- `Modal.jsx` — use for all modals
- `SearchInput.jsx` — use instead of inline search inputs
- `Tabs.jsx` — use for all tab interfaces
- `Timeline.jsx` — use for project timelines
- `Toast.jsx` — use for notifications

---

## Quick Reference: File Counts by Section

```
src/pages/admin/      18 pages  (admin dashboard)
src/pages/dashboard/  22 pages  (installer dashboard)
src/pages/portal/     12 pages  (customer portal)
src/pages/sales/       6 pages  (sales dashboard)
src/pages/marketplace/ 2 pages  (credit marketplace)
src/pages/ (root)     13 pages  (public)
src/components/       21 domain components
src/components/ui/    17 UI primitives
src/services/         34 service files
src/hooks/             1 hook (useGoogleMaps)
src/contexts/          1 context (AuthContext)
functions/src/        40+ backend files
```

---

*Generated February 9, 2026 by full codebase audit*
