# Installer Dashboard Pages (`/dashboard/*`)

> 22 pages for solar installers. Role: `installer`

## Page Map

| Route | Page Component | Source | Status |
|-------|---------------|--------|--------|
| `/dashboard` | DashboardHome | `src/pages/dashboard/DashboardHome.jsx` | NEEDS TEST |
| `/dashboard/leads` | DashboardLeads | `src/pages/dashboard/DashboardLeads.jsx` | NEEDS TEST |
| `/dashboard/projects` | DashboardProjects | `src/pages/dashboard/DashboardProjects.jsx` | NEEDS TEST |
| `/dashboard/projects/:projectId` | DashboardProjectDetail | `src/pages/dashboard/DashboardProjectDetail.jsx` | NEEDS TEST |
| `/dashboard/compliance` | DashboardCompliance | `src/pages/dashboard/DashboardCompliance.jsx` | NEEDS TEST |
| `/dashboard/estimates` | DashboardEstimates | `src/pages/dashboard/DashboardEstimates.jsx` | NEEDS TEST |
| `/dashboard/invoices` | DashboardInvoices | `src/pages/dashboard/DashboardInvoices.jsx` | NEEDS TEST |
| `/dashboard/api-keys` | DashboardApiKeys | `src/pages/dashboard/DashboardApiKeys.jsx` | NEEDS TEST |
| `/dashboard/billing` | DashboardBilling | `src/pages/dashboard/DashboardBilling.jsx` | NEEDS TEST |
| `/dashboard/referrals` | DashboardReferrals | `src/pages/dashboard/DashboardReferrals.jsx` | NEEDS TEST |
| `/dashboard/equipment` | DashboardEquipment | `src/pages/dashboard/DashboardEquipment.jsx` | NEEDS TEST |
| `/dashboard/tasks` | DashboardTasks | `src/pages/dashboard/DashboardTasks.jsx` | NEEDS TEST |
| `/dashboard/survey/:projectId` | DashboardSurvey | `src/pages/dashboard/DashboardSurvey.jsx` | NEEDS TEST |
| `/dashboard/permits` | DashboardPermits | `src/pages/dashboard/DashboardPermits.jsx` | NEEDS TEST |
| `/dashboard/designs` | DashboardDesigns | `src/pages/dashboard/DashboardDesigns.jsx` | NEEDS TEST |
| `/dashboard/schedule` | DashboardSchedule | `src/pages/dashboard/DashboardSchedule.jsx` | NEEDS TEST |
| `/dashboard/install` | DashboardInstall | `src/pages/dashboard/DashboardInstall.jsx` | NEEDS TEST |
| `/dashboard/funding` | DashboardFunding | `src/pages/dashboard/DashboardFunding.jsx` | NEEDS TEST |
| `/dashboard/credits` | DashboardCredits | `src/pages/dashboard/DashboardCredits.jsx` | NEEDS TEST |
| `/dashboard/documents` | DashboardDocuments | `src/pages/dashboard/DashboardDocuments.jsx` | NEEDS TEST |
| `/dashboard/marketplace` | DashboardMarketplace | `src/pages/dashboard/DashboardMarketplace.jsx` | NEEDS TEST |
| `/dashboard/workers/:workerId` | DashboardWorkerProfile | `src/pages/dashboard/DashboardWorkerProfile.jsx` | NEEDS TEST |

## Pipeline Flow (Installer Workflow)

The dashboard maps to the SolarOS pipeline phases:

```
DashboardLeads → DashboardProjects → DashboardSurvey → DashboardDesigns
→ DashboardPermits → DashboardSchedule → DashboardInstall → DashboardFunding
```

## Key Pages by Pipeline Phase

| Phase | Page | Backend |
|-------|------|---------|
| 0. Tasks | DashboardTasks | `aiTaskEngine.ts` |
| 2. Survey | DashboardSurvey | `surveyService.ts` |
| 3. CAD | DashboardDesigns | `cadService.ts` |
| 4. Permits | DashboardPermits | `permitService.ts` |
| 5. Schedule | DashboardSchedule | `schedulingService.ts` |
| 6. Install | DashboardInstall | `photoAnalysisService.ts` |
| 7. Funding | DashboardFunding | `fundingService.ts` |
| 9. Credits | DashboardCredits | `taxCreditService.ts` |

---

*See [INDEX](../INDEX.md) for full navigation*
