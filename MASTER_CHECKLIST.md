# Solar Platform - Master Research & Planning Checklist
## Coordinated between Claude Code + Ava | Created 2026-02-07

---

## PHASE 0: INTELLIGENCE GATHERING (In Progress)

### Market & Regulatory Research
- [x] 2026 regulatory landscape - ITC expiration, OBBBA, tariffs
- [ ] Competitive analysis - every solar platform/marketplace
- [ ] TPO provider landscape - lease/PPA dealer programs & APIs
- [ ] Equipment availability post-tariffs - who can supply what
- [ ] Utility rate database - net metering/billing policies by state
- [ ] Revenue model validation - what makes money fastest
- [ ] Free data sources audit - NREL, DSIRE, OpenEI, Census, permits
- [ ] Battery storage economics - 2026 ROI models
- [ ] Legal/compliance - TCPA, FTC, state licensing, data privacy
- [ ] Go-to-market strategy - Texas first, then expansion
- [ ] AI/automation opportunities unique to platform

### Technical Audit
- [ ] Codebase audit - what works, what's broken in solar-crm
- [ ] Firebase project status - Firestore schema, Cloud Functions, rules
- [ ] API integrations status - Google Solar, SMT, Twilio, etc.
- [ ] Deployment status - Firebase hosting, Netlify, Vercel configs
- [ ] Test coverage and reliability

---

## PHASE 1: PRODUCT-MARKET FIT DECISIONS

### Core Questions to Answer
- [ ] Who is our PRIMARY customer? (Homeowner vs Installer vs Sales Rep)
- [ ] What's the ONE feature that generates revenue in 30 days?
- [ ] Lease/PPA marketplace vs Lead Gen vs SaaS CRM - which first?
- [ ] Texas-only MVP or national from day 1?
- [ ] B2B (sell to installers) vs B2C (sell to homeowners) vs B2B2C?

### Revenue Model Analysis
- [ ] Lead generation pricing model (cost per lead by quality tier)
- [ ] SaaS subscription model (installer CRM monthly fee)
- [ ] Marketplace commission model (% of closed deal)
- [ ] API monetization model (developer platform)
- [ ] Referral/affiliate model (TPO provider commissions)

### Competitor Gap Analysis
- [ ] EnergySage weaknesses we can exploit
- [ ] What installers hate about current platforms
- [ ] What homeowners can't find anywhere
- [ ] Underserved geographic markets
- [ ] Features no one has built yet

---

## PHASE 2: MVP DEFINITION

### Must-Have for Launch (30-day target)
- [ ] Define exact feature set for MVP
- [ ] Define target user persona
- [ ] Define launch market (zip codes)
- [ ] Define success metrics (leads, signups, revenue)
- [ ] Technical architecture for MVP (trim the fat)

### Critical Path Features
- [ ] Instant solar calculator (address → estimate)
- [ ] Lead capture and routing
- [ ] Installer directory/marketplace
- [ ] Basic financing comparison (loan vs lease vs PPA)
- [ ] Admin dashboard for lead management

### Nice-to-Have (Post-MVP)
- [ ] 3D roof visualization (Cesium - already built)
- [ ] Battery calculator
- [ ] D2D sales tools
- [ ] API portal for developers
- [ ] MCP server for AI agents
- [ ] Referral system (already built)

---

## PHASE 3: TECHNICAL EXECUTION

### Backend (Firebase)
- [ ] Finalize Firestore schema for MVP
- [ ] Cloud Functions - which ones are needed for MVP?
- [ ] Auth flow - Firebase Auth setup
- [ ] Security rules audit
- [ ] API rate limiting and key management

### Frontend (React/Vite)
- [ ] Strip unused features for clean MVP
- [ ] Mobile-responsive design
- [ ] Performance optimization
- [ ] SEO for organic lead gen
- [ ] Landing page optimization for conversion

### Integrations
- [ ] Google Solar API - verify working
- [ ] Utility rate data integration
- [ ] TPO provider API connections
- [ ] Payment processing (Stripe)
- [ ] Email/SMS notifications

### DevOps
- [ ] CI/CD pipeline
- [ ] Staging vs production environments
- [ ] Domain and SSL setup
- [ ] Monitoring and error tracking
- [ ] Analytics (conversion tracking)

---

## PHASE 4: GO-TO-MARKET

### Supply Side (Installers)
- [ ] Installer onboarding flow
- [ ] Value proposition for installers
- [ ] Pricing for installer subscriptions/leads
- [ ] Territory/zip code management
- [ ] Quality scoring system

### Demand Side (Homeowners)
- [ ] SEO strategy for "solar [city]" keywords
- [ ] Content marketing plan
- [ ] Social media presence
- [ ] Paid acquisition channels (Google Ads, Facebook)
- [ ] Referral program launch

### Partnerships
- [ ] TPO provider partnerships (Sunrun, Sunnova, Palmetto)
- [ ] Finance partner integrations (GoodLeap, Mosaic)
- [ ] Utility data partnerships
- [ ] Real estate agent partnerships (solar adds home value)
- [ ] Builder/new construction partnerships

---

## PHASE 5: SCALE & DIFFERENTIATION

### AI-Native Features
- [ ] AI sales agent for homeowner qualification
- [ ] Automated proposal generation
- [ ] Predictive lead scoring
- [ ] Dynamic pricing optimization
- [ ] Chatbot for instant quotes
- [ ] AI-powered permit packet assembly

### Data Moat
- [ ] Build proprietary installer quality database
- [ ] Aggregate utility rate data nationally
- [ ] Track equipment pricing and availability
- [ ] Monitor policy changes by jurisdiction
- [ ] Build solar production benchmarks by region

### Platform Play
- [ ] API for third-party developers
- [ ] MCP server for AI agent ecosystem
- [ ] Widget embeds for installer websites
- [ ] White-label options for large installers
- [ ] Integration marketplace

---

## ASSIGNMENTS

| Area | Owner | Status |
|------|-------|--------|
| Market research | Claude Code | In Progress |
| Regulatory research | Claude Code | In Progress |
| Competitive analysis | Claude Code | In Progress |
| Codebase audit | Claude Code | In Progress |
| Solar mission strategy | Ava | Active |
| Lead gen pipeline | Ava | Stuck (code gen) |
| Installer acquisition | Ava | Stuck (needs real outreach) |
| Code development | Claude Code + Ava | Pending audit |

---

## KEY DECISIONS NEEDED FROM JUSTIN

1. **Primary customer**: Homeowners, installers, or both?
2. **Revenue model priority**: Lead gen, SaaS, or marketplace?
3. **Launch market**: Texas-only or broader?
4. **Brand**: "Power to the People" or "SolarOS" or new?
5. **Budget**: Any paid APIs/services approved? (Google Solar API, Twilio, etc.)
6. **Timeline**: Hard deadline for MVP launch?
7. **D2D strategy**: Build D2D tools now or focus on digital?

---

*Last updated: 2026-02-07 by Claude Code*
*Next update: After all research agents complete*
