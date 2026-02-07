# SolarOS MVP Recommendation

**Synthesized from 15 research documents, 7-day architecture sprint, codebase audit, and market analysis**
**Date: February 7, 2026**

---

## Executive Summary

The solar industry is in chaos. The residential ITC expired January 1, 2026. Three of the top five solar financiers went bankrupt. Tariffs on SE Asian panels hit 3,400%. Net metering is eroding state by state. Meanwhile, the average installer juggles 5-8 disconnected tools, and no one has built a unified platform that handles the 2026 reality.

**We have a 6-12 month window** where the industry is rebuilding and the old playbook is dead. The opportunity is to become the operating system for solar companies navigating this new world.

**Recommended MVP**: A **Texas-focused installer CRM + compliance engine** with built-in lead generation, launching in Houston within 90 days. Revenue from day one via lead sales ($100-557/lead in Texas) and SaaS subscriptions ($79-199/mo).

---

## Part 1: What the Research Tells Us

### The Market (2026 Reality)

| Metric | Value | Source |
|--------|-------|--------|
| Texas solar market value | $50.1 billion | SOLAR_ECONOMICS_2026 |
| TX share of US solar installs | 39% | SOLAR_ECONOMICS_2026 |
| Battery attach rate (TX) | 85-90% | SOLAR_ECONOMICS_2026 |
| Residential ITC | **EXPIRED** Jan 1, 2026 | SOLAR_2026_JANUARY_CHANGES |
| TPO market share (growing) | 41-50%, up 25% YoY | SOLAR_ECONOMICS_2026 |
| Avg cost per lead (TX) | $557 | SOLAR_ECONOMICS_2026 |
| Industry sales decline | 31% (2024) + 18% (2026) | SOLAR_ECONOMICS_2026 |
| Failed companies | SunPower, Sunnova, Mosaic, Purelight, TriSMART | SOLAR_ECONOMICS_2026 |

### The 6 Competitive Gaps No One Has Filled

From COMPETITIVE_LANDSCAPE_2026:

1. **Unified Solar OS** — Installers use 5-8 tools. Nobody has cracked full-stack with quality at every layer.
2. **2026 Compliance Engine** — FEOC, domestic content, tariffs. No platform auto-tracks compliant equipment.
3. **Post-Bankruptcy Financing** — 3 of top 5 financiers bankrupt. Need transparent multi-provider comparison.
4. **AI Instant Qualification** — All pieces exist (Google Solar + NREL + utility rates + financing). Nobody assembled them.
5. **Small Installer Empowerment** — Market favors large players with TPO relationships. Need affordable full-stack for 1-10 person shops.
6. **Homeowner Intelligence** — Post-ITC confusion. Need impartial AI guidance on whether solar makes sense.

### What We Already Have

From CODEBASE_AUDIT (8.5/10 feature completeness):

| Component | Status | Notes |
|-----------|--------|-------|
| Landing page | Complete | Professional, video hero |
| Qualification flow | Complete | 118KB, address autocomplete, credit est, bill scan, Google Solar |
| Proposal/Success page | Complete | 3D viz, 25-year financials, panel adjustment |
| Admin dashboard | Complete | Search, filters, stats, CSV export, SMS |
| Referral system | Complete | Multi-tab, social sharing, earnings, leaderboard |
| Installer comparison | Complete | Advanced filtering, real data, dynamic pricing |
| 18 service modules | Complete | Firebase, Google Solar, SMT, Twilio, address validation |
| 30+ Cloud Functions | Complete | Leads, APIs, referrals, SMS, webhooks |
| 8 Firestore collections | Complete | leads, projects, referrals, installers, apiKeys, etc. |

**Missing from existing code**: Email verification, PDF export, eSign, payments, unit tests.

### Validated Free APIs

From FREE_API_VALIDATION:

| API | Purpose | Free Tier |
|-----|---------|-----------|
| NREL PVWatts V8 | Production estimates | 1,000/hr (unlimited) |
| OpenEI URDB | 3,700+ utility rates | Unlimited |
| Google Solar API | Roof analysis, shading | 10K buildings/mo |
| Census ACS | Demographics for lead scoring | Unlimited |
| NREL REopt | Solar+storage optimization | 1,000/hr |
| EIA | Electricity prices | Throttled |

**Total API cost for MVP: $0** (all within free tiers for early stage).

---

## Part 2: MVP Recommendation

### Primary Customer: **Small-to-Mid Solar Installers (1-50 employees)**

**Why installers, not homeowners:**
- Homeowner acquisition is expensive ($557/lead in TX) and requires massive marketing spend
- Installers pay for tools that save them time and generate leads
- B2B revenue is more predictable (SaaS + lead fees)
- Installers bring their homeowner customers with them
- We can still serve homeowners through the installer's white-labeled portal

**Why small-to-mid:**
- Big players (Sunrun, Freedom Forever) have custom tools
- Small installers (1-10 people) are underserved — they use spreadsheets + phone + Aurora
- 70% of Texas solar companies are <50 employees
- They're the ones most hurt by ITC expiration, bankruptcies, and tariff confusion
- Gap #5 from competitive analysis: "affordable full-stack for 1-10 person shops"

### Revenue Model: **Hybrid (Lead Gen + SaaS)**

Revenue from day one with two streams:

| Revenue Stream | Pricing | Target | Monthly Revenue (10 installers) |
|----------------|---------|--------|-------------------------------|
| **SaaS Subscription** | $79/mo (Solo), $149/mo (Team), $299/mo (Pro) | Installer CRM + compliance | $790 - $2,990 |
| **Lead Sales** | $100-200/exclusive lead | Homeowner leads via qualification flow | $2,000 - $10,000+ |
| **Marketplace Commission** | 8% (future Phase 2) | Subcontractor task marketplace | Future |

**Why this hybrid works:**
- Lead gen is the highest-value activity in solar ($557 avg cost per lead in TX means $100-200 leads are a bargain)
- SaaS provides predictable baseline revenue
- The qualification flow we already built is the lead generation engine
- Installers get leads AND tools in one subscription

### Launch Market: **Houston, Texas**

**Why Houston over Austin:**

| Factor | Houston | Austin |
|--------|---------|--------|
| Metro population | 7.3 million | 2.3 million |
| SolarAPP+ adoption | Active | No |
| Utility (distribution) | CenterPoint | Austin Energy |
| Market type | Deregulated (REPs) | Municipal utility |
| Solar installer density | Highest in TX | High |
| Avg electricity rate | 12-15¢/kWh | 11-13¢/kWh |
| Battery attach rate | 85-90% | 85-90% |
| Net metering | No mandated (REP dependent) | Value of Solar (9.91¢/kWh) |

Houston wins because:
1. **3x the population** = 3x the addressable market
2. **SolarAPP+ live** = we can integrate automated permitting
3. **Deregulated market** = complex REP landscape where our compliance engine adds huge value
4. **CenterPoint territory** = highest electricity rates in TX (up to 23¢ peak)

### Brand: Decision Needed from Justin

Both options have merits:
- **"SolarOS"** — Clear, professional, B2B-friendly, implies platform/operating system
- **"Power to the People"** — Memorable, mission-driven, B2C-friendly, already has Firebase project

**Recommendation**: Launch as **SolarOS** for B2B installer market, keep "Power to the People" as the consumer-facing brand for the homeowner portal. Two brands, one platform.

---

## Part 3: MVP Feature Scope (90-Day Build)

### What's IN the MVP

#### Tier 1: Core Platform (Weeks 1-4) — *Mostly built*
- [x] Homeowner qualification flow (Google Solar + NREL + utility rates)
- [x] Admin dashboard with lead management
- [x] Referral tracking system
- [x] Installer comparison engine
- [x] SMS notifications (Twilio)
- [ ] **FIX**: Remove Test3D.jsx from production routes
- [ ] **FIX**: Error handling gaps in API failures
- [ ] **ADD**: Email verification flow
- [ ] **ADD**: Password reset

#### Tier 2: Installer CRM (Weeks 2-6) — *New build*
- [ ] Installer onboarding + account management
- [ ] Lead inbox with assignment, status tracking, notes
- [ ] Pipeline view (Kanban: New → Contacted → Qualified → Proposal → Sold → Installing → Complete)
- [ ] Customer communication log (calls, emails, SMS)
- [ ] Basic reporting (leads received, conversion rate, revenue)
- [ ] White-label customer portal (installer's branding on homeowner-facing pages)

#### Tier 3: 2026 Compliance Engine (Weeks 4-8) — *Key differentiator*
- [ ] Equipment compliance database (FEOC, domestic content, tariff status)
  - Pre-loaded with our `equipment_national.json` (997 lines of validated data)
- [ ] Real-time compliance checker: "Is this equipment eligible for TPO ITC?"
- [ ] Tariff impact calculator (show cost with/without tariff-safe equipment)
- [ ] Net metering/net billing status by utility (using `texas_utility_buyback_rates.json`)
- [ ] Incentive finder (federal, state, local — using `texas_solar_incentives_2026.json`)

#### Tier 4: Lead Generation Engine (Weeks 6-10) — *Revenue driver*
- [ ] Public-facing solar calculator (simplified version of qualification flow)
- [ ] Lead capture with instant qualification score
- [ ] Lead routing to subscribing installers (round-robin or auction)
- [ ] Lead quality scoring (credit estimate, homeownership, roof quality, utility rate)
- [ ] Lead delivery via SMS + email + dashboard notification

#### Tier 5: Proposal & Documents (Weeks 8-12) — *Close the loop*
- [ ] PDF proposal generation (system specs, financials, equipment, compliance)
- [ ] Basic eSign integration (DocuSign or HelloSign API)
- [ ] TPO comparison table (show lease/PPA options from LightReach, GoodLeap, Sunrun)
- [ ] Customer-facing proposal review page

### What's OUT of MVP (Phase 2+)

| Feature | Why Deferred | Phase |
|---------|-------------|-------|
| Task marketplace (subcontractor bidding) | Needs critical mass of installers first | 2 |
| AI design generation | Aurora API partnership not confirmed | 2 |
| Stripe payments / marketplace commission | Need transaction volume first | 2 |
| Mobile app (React Native) | Web-first, mobile responsive is enough | 3 |
| D2D sales tools | Digital-first, D2D is a separate product | 3 |
| VPP integration | Requires utility partnerships | 3 |
| Multi-state expansion | Texas-first, prove the model | 2-3 |
| Full permitting automation | SolarAPP+ only in 4 TX jurisdictions | 2 |
| 3D roof visualization | Existing component needs major work | 3 |
| AI chatbot | Nice-to-have, not MVP-critical | 2 |

---

## Part 4: Technical Architecture (What Changes)

### Current Stack (Keep Everything)
- **Frontend**: React 19 + Vite + Tailwind + shadcn/ui ✅
- **Backend**: Firebase Cloud Functions (Node.js 22) ✅
- **Database**: Firestore ✅
- **Hosting**: Firebase Hosting ✅
- **Auth**: Firebase Auth ✅

### New for MVP

| Addition | Purpose | Cost |
|----------|---------|------|
| **Stripe** | SaaS billing for installer subscriptions | 2.9% + 30¢/transaction |
| **SendGrid** (free tier) | Email notifications, lead delivery | 100/day free |
| **React-PDF** or **@react-pdf/renderer** | Proposal PDF generation | Free (open source) |
| **DocuSign eSign** or **HelloSign** | Contract signing | ~$10/mo starter |

### Firestore Collections (Add to existing 8)

```
installer_accounts/     → Installer company profiles, subscription tier, branding
installer_users/        → Individual user accounts under installer
lead_assignments/       → Which leads assigned to which installer
equipment_catalog/      → FEOC/compliance-tagged equipment database
proposals/              → Generated proposals per lead
compliance_checks/      → Equipment compliance verification logs
subscriptions/          → Stripe subscription management
```

### API Architecture

```
Existing (keep):
  /api/leads/*           → Lead CRUD
  /api/referrals/*       → Referral tracking
  /api/sms/*             → Twilio SMS
  /api/google-solar/*    → Roof analysis proxy
  /api/admin/*           → Admin operations

New for MVP:
  /api/installers/*      → Installer account management
  /api/pipeline/*        → Lead pipeline (status, notes, assignment)
  /api/compliance/*      → Equipment compliance checks
  /api/proposals/*       → Proposal generation + PDF
  /api/billing/*         → Stripe subscription webhooks
  /api/lead-marketplace/* → Lead purchase/delivery
```

---

## Part 5: 90-Day Execution Plan

### Phase 1: Foundation Fix (Weeks 1-2)
**Goal**: Production-harden existing code, add auth improvements

| Task | Priority | Effort |
|------|----------|--------|
| Remove Test3D.jsx from routes | P0 | 1 hour |
| Add error handling to all API calls | P0 | 2 days |
| Email verification flow | P0 | 1 day |
| Password reset flow | P0 | 1 day |
| Rate limiting on Cloud Functions | P1 | 1 day |
| Basic unit tests for critical paths | P1 | 3 days |
| Security audit (exposed endpoints, API keys) | P0 | 1 day |

### Phase 2: Installer CRM (Weeks 3-6)
**Goal**: Installer-facing product that manages their solar business

| Task | Priority | Effort |
|------|----------|--------|
| Installer registration + onboarding flow | P0 | 3 days |
| Multi-tenant Firestore rules (installer isolation) | P0 | 2 days |
| Lead inbox with filtering and search | P0 | 3 days |
| Pipeline Kanban board | P0 | 3 days |
| Customer communication log | P1 | 2 days |
| Basic analytics dashboard | P1 | 2 days |
| White-label configuration (logo, colors) | P2 | 2 days |
| Stripe subscription integration | P0 | 3 days |

### Phase 3: Compliance Engine (Weeks 5-8)
**Goal**: The differentiator — no one else has this

| Task | Priority | Effort |
|------|----------|--------|
| Import equipment_national.json into Firestore | P0 | 1 day |
| Equipment compliance checker UI | P0 | 3 days |
| FEOC/domestic content/tariff status badges | P0 | 2 days |
| Import texas_utility_buyback_rates.json | P0 | 1 day |
| Utility rate lookup by address | P0 | 2 days |
| Import texas_solar_incentives_2026.json | P0 | 1 day |
| Incentive finder by location | P1 | 2 days |
| TPO eligibility calculator | P1 | 2 days |

### Phase 4: Lead Engine (Weeks 7-10)
**Goal**: Revenue from lead generation

| Task | Priority | Effort |
|------|----------|--------|
| Public solar calculator (simplified qual flow) | P0 | 3 days |
| Lead scoring algorithm | P0 | 2 days |
| Lead routing to installer subscribers | P0 | 3 days |
| Lead notification (SMS + email + dashboard) | P0 | 2 days |
| Lead purchase/accept flow | P1 | 2 days |
| Lead quality metrics + reporting | P1 | 2 days |

### Phase 5: Proposals & Launch (Weeks 9-12)
**Goal**: Close the loop, go live

| Task | Priority | Effort |
|------|----------|--------|
| PDF proposal generator | P0 | 3 days |
| TPO comparison table (LightReach, GoodLeap) | P1 | 3 days |
| eSign integration | P1 | 2 days |
| Customer proposal review page | P0 | 2 days |
| Landing page for installer acquisition | P0 | 2 days |
| Beta launch with 5-10 Houston installers | P0 | 1 week |
| Iterate based on feedback | P0 | ongoing |

---

## Part 6: Go-to-Market Strategy

### Installer Acquisition (First 10 Customers)

**Channel 1: Direct Outreach (Weeks 8-10)**
- Scrape Texas TDLR database for licensed solar contractors in Houston
- Filter for small companies (1-50 employees, no Aurora Solar enterprise contract)
- Cold email/LinkedIn: "You're paying $557/lead. We deliver exclusive leads for $100-200."
- Offer: 30-day free trial of full platform + 5 free leads

**Channel 2: Solar Industry Events**
- Texas Solar Power Conference (annual)
- TCEQ/PUCT public meetings
- Local solar installer meetups (Houston Solar Society)

**Channel 3: Referral Program (Week 10+)**
- Installer refers another installer → both get 1 month free
- The referral system is already built

### Homeowner Lead Generation (Feeds Installers)

**Channel 1: SEO Content (Ongoing)**
- "Is solar worth it in Houston 2026?" (answer: yes with TPO, complicated without)
- "Best solar companies in Houston" (comparison using our installer data)
- "Tesla Powerwall alternatives 2026" (FEOC compliance angle)

**Channel 2: Solar Calculator Widget**
- Embeddable widget for real estate sites, home improvement blogs
- Address → instant solar estimate → lead captured → routed to installer

**Channel 3: Existing Referral Network**
- The referral system is already built and functional
- Homeowner refers neighbor → gets $200 when they install

### Pricing Strategy

| Tier | Price | Includes | Target |
|------|-------|----------|--------|
| **Starter** | $79/mo | CRM, 5 leads/mo, compliance checker, basic reporting | Solo installers |
| **Growth** | $149/mo | CRM, 15 leads/mo, compliance, proposals, white-label portal | 2-10 person teams |
| **Pro** | $299/mo | CRM, 40 leads/mo, compliance, proposals, priority lead routing, API access | 10-50 person companies |
| **Additional leads** | $100-200/each | Exclusive, pre-qualified, scored | All tiers |

**Competitive comparison:**
- Aurora Solar: $220-259/mo (design only, no CRM, no leads)
- SalesRabbit: $41/mo/user (D2D only, no compliance)
- Enerflo: Custom pricing (full workflow but no compliance, no leads)
- **SolarOS**: $79-299/mo (CRM + compliance + leads = full stack at lower cost)

---

## Part 7: Key Metrics for MVP Success

### 90-Day Targets

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Paying installer accounts | 10 | Validates product-market fit |
| Monthly recurring revenue | $1,500+ | Proves willingness to pay |
| Leads generated | 100+ | Proves lead gen engine works |
| Lead conversion rate | >5% | Quality validation |
| Installer NPS | >40 | Product satisfaction |
| Homeowner qualification completion | >60% | Funnel efficiency |

### 6-Month Targets

| Metric | Target |
|--------|--------|
| Paying installer accounts | 50+ |
| MRR | $10,000+ |
| Leads generated/month | 500+ |
| Markets served | Houston + Austin |
| Equipment in compliance DB | 500+ products |

---

## Part 8: Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Installers won't pay for another tool | Medium | High | Free tier + leads-included model (they pay for leads, get CRM free) |
| Lead quality too low | Medium | High | Google Solar API + credit estimation = pre-qualification |
| 2026 market contraction kills demand | Medium | Medium | TPO market growing 25%; focus on TPO-friendly installers |
| Aurora Solar enters CRM space | Low | High | Speed to market; compliance engine is our moat |
| Regulatory changes invalidate compliance data | Medium | Medium | Automated monitoring + manual updates; data is our moat |
| Firebase costs spike at scale | Low | Medium | Firestore pricing is generous; BigQuery for analytics |

---

## Part 9: Decisions Needed from Justin

These 5 decisions unlock execution. Everything else can be made autonomously.

### 1. Primary Customer Confirmation
**Recommendation**: Small-to-mid installers (1-50 employees) in Houston
- [ ] Approved
- [ ] Different direction: _______________

### 2. Revenue Model Confirmation
**Recommendation**: Hybrid SaaS ($79-299/mo) + Lead sales ($100-200/lead)
- [ ] Approved
- [ ] Different direction: _______________

### 3. Brand Strategy
**Recommendation**: "SolarOS" for B2B, "Power to the People" for consumer portal
- [ ] Approved
- [ ] Single brand (which?): _______________
- [ ] Different direction: _______________

### 4. Budget Allocation
**Estimated monthly costs during MVP build:**
- Stripe fees: ~$50/mo (early stage)
- SendGrid: Free tier (100 emails/day)
- DocuSign/HelloSign: ~$10/mo
- Google Solar API: Free (10K/mo)
- Firebase: Free tier covers MVP
- **Total: ~$60-100/mo**

Are paid APIs approved at this level?
- [ ] Yes, proceed
- [ ] No, alternatives needed

### 5. Timeline Confirmation
**Recommendation**: 90-day build → Houston beta launch with 5-10 installers
- [ ] Approved (12-week target)
- [ ] Faster (8-week rush)
- [ ] Slower (16-week methodical)

---

## Part 10: What We Build First (Week 1 Priority)

If approved, here's what gets built in the first 5 days:

**Day 1**: Security fixes (remove Test3D, audit endpoints, rate limiting)
**Day 2**: Email verification + password reset flows
**Day 3**: Installer registration + onboarding flow
**Day 4**: Multi-tenant Firestore rules + installer data model
**Day 5**: Stripe subscription integration (billing from day 1)

The compliance engine and lead marketplace follow in weeks 3-8, leveraging the research data already collected in `/opt/digital-justin/research/data/`.

---

## Appendix: Research Sources

| Document | Key Insights Used |
|----------|-------------------|
| SOLAR_ECONOMICS_2026.md | Market sizing, revenue models, pricing benchmarks |
| COMPETITIVE_LANDSCAPE_2026.md | 6 gaps, competitor pricing, market positioning |
| CODEBASE_AUDIT.md | What's built, what's missing, deployment readiness |
| FREE_API_VALIDATION.md | Zero-cost API strategy for MVP |
| REGULATORY_COMPLIANCE_2026.md | FEOC, tariffs, net metering, critical dates |
| SOLAR_2026_JANUARY_CHANGES.md | ITC expiration impact, market shift to TPO |
| TEXAS_UTILITY_LANDSCAPE.md | Houston market details, REP landscape, rates |
| MASTER_CHECKLIST.md | Phase structure, blocking decisions |
| SOLAROS_DISCOVERY_BRAINSTORM.md | Feature universe (1,870 lines narrowed to MVP) |
| SOLAROS_RESEARCH_BRIEF.md | Architecture sprint outputs |
| SOLAR_2026_DATA_RESEARCH.md | Data collection plan, validated sources |
| SOLAR_DATA_SOURCES_NATIONAL.md | Free data APIs, schemas |
| AVA_CONTEXT_REPORT.md | Ava's accumulated knowledge, platform blueprint |
| SOLAR_INDUSTRY_OS_BLUEPRINT.md | Full platform vision (deferred features) |
| SOLAR_PLATFORM_MASTER_BLUEPRINT.md | Architecture reference (5-layer design) |

### Pre-Built Data Assets

| File | Records | Ready for MVP |
|------|---------|---------------|
| texas_utility_buyback_rates.json | 889 lines | Yes — import to Firestore |
| texas_permits_by_jurisdiction.json | 1,549 lines | Yes — compliance engine |
| equipment_national.json | 997 lines | Yes — equipment compliance DB |
| texas_solar_incentives_2026.json | 1,127 lines | Yes — incentive finder |
| tpo_finance_providers_texas_2026.json | 610 lines | Yes — TPO comparison |

---

*This recommendation synthesizes 15 research documents totaling ~20,000+ lines of analysis into an actionable 90-day MVP plan. The window is open. The data is collected. The codebase is 85% there. The 2026 chaos is our opportunity.*

**Next step**: Justin approves the 5 decisions above → we start building Week 1.**
