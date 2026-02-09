# SolarOS Pipeline Phases

> The full solar installation pipeline: 10 phases from AI task engine to tax credits.

## Phase Overview

```
Phase 0: AI Task Engine (brain)
Phase 1: AHJ Database (knowledge)
Phase 2: Site Survey ──→ Phase 3: CAD Design ──→ Phase 4: Permits
Phase 5: Scheduling ──→ Phase 6: Install QC ──→ Phase 7: Funding
Phase 8: Interconnection/PTO ──→ Phase 9: Tax Credit Marketplace
```

## Detailed Phase Status

### Phase 0: AI Task Engine
- **Backend**: `aiTaskEngine.ts` (7 functions) — DONE
- **Frontend**: `DashboardTasks`, `AdminTasks`, `PortalTasks` — NEEDS TEST
- **Data**: `ai_tasks`, `ai_learnings` collections
- **Pattern**: AI attempts → escalate to human → capture learning
- **TODO**: Test full lifecycle: create → AI attempt → escalate → resolve → learning

### Phase 1: AHJ Database & Permits Knowledge
- **Backend**: `ahjDatabase.ts` (9 functions) — DONE
- **Frontend**: No dedicated admin UI — TODO
- **Data**: 106 city + 50 state jurisdictions seeded
- **TODO**: Expand to 500+ jurisdictions
- **TODO**: SolarAPP+ API integration
- **TODO**: Admin AHJ management page

### Phase 2: Site Survey
- **Backend**: `surveyService.ts` (7 functions) — DONE
- **Frontend**: `PortalSurvey` (customer), `DashboardSurvey` (installer) — NEEDS TEST
- **Integrations**: EagleView (STUB), photo upload
- **TODO**: Test full survey submission with photos
- **TODO**: EagleView real API integration

### Phase 3: CAD Design Generation
- **Backend**: `cadService.ts` (6 functions) — DONE
- **Frontend**: `DashboardDesigns` — NEEDS TEST
- **TODO**: Test design generation from survey data
- **TODO**: Verify NEC compliance checks
- **TODO**: Verify document package generation

### Phase 4: Permit Automation
- **Backend**: `permitService.ts` (8 functions) — DONE
- **Frontend**: `DashboardPermits` — NEEDS TEST
- **TODO**: Test permit create → submit → track flow
- **TODO**: Build permit bot framework (Python scripts)
- **TODO**: SolarAPP+ integration for instant permits

### Phase 5: Scheduling
- **Backend**: `schedulingService.ts` (8 functions) — DONE
- **Frontend**: `DashboardSchedule`, `PortalSchedule` — NEEDS TEST
- **TODO**: Test availability → propose → confirm → notify flow

### Phase 6: Install QC
- **Backend**: `photoAnalysisService.ts` (6 functions) — DONE
- **Frontend**: `DashboardInstall` — NEEDS TEST
- **TODO**: Test photo upload → AI analysis → pass/fail → sign-off
- **TODO**: Verify AI photo analysis isn't stub

### Phase 7: Funding
- **Backend**: `fundingService.ts` (7 functions) — DONE
- **Frontend**: `DashboardFunding` — NEEDS TEST
- **TODO**: Test create package → check readiness → submit → track

### Phase 8: Interconnection & PTO
- **Backend**: NOT BUILT
- **Frontend**: NOT BUILT
- **TODO**: Create `interconnectionService.ts`
- **TODO**: Utility interconnection application tracking
- **TODO**: PTO (Permission to Operate) status monitoring

### Phase 9: Tax Credit Marketplace
- **Backend**: `taxCreditService.ts` (18 functions) — DONE
- **Frontend**: `CreditMarketplace`, `CreditDetail`, `DashboardCredits`, `PortalCredits`, `AdminCredits` — NEEDS TEST
- **TODO**: Test full audit → list → offer → transfer → escrow flow

## Pipeline Orchestrator

`pipelineOrchestrator.ts` has 5 trigger functions that auto-advance phases:
- `onSurveyApproved` → triggers CAD generation
- `onDesignApproved` → triggers permit submission
- `onPermitApproved` → triggers scheduling
- (+ 2 more)

**TODO**: Test end-to-end: Survey approved → auto-triggers CAD → permit → schedule → install → funding

## What's Missing

1. **Phase 8** (Interconnection/PTO) — No backend or frontend
2. **Permit bot framework** — Python scripts not created
3. **Admin AHJ management page** — No CRUD UI for AHJ registry
4. **Admin schedule overview** — No calendar/conflict resolution view

---

*See [INDEX](../INDEX.md) for full navigation*
