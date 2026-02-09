# SolarOS Investor Pitch Deck -- Slide-by-Slide Outline

> **Prepared**: February 8, 2026
> **For**: VFC Cohort 6 application, VC outreach, accelerator applications
> **Format**: 10-12 slides, PDF. Design: clean, data-driven, dark theme with solar/green accents.
> **Build with**: Figma, Google Slides, or Keynote. Export as PDF.

---

## Slide 1: COVER

**SolarOS**
*The Operating System for Solar Installation*

- Tagline: "Automating Solar Deployment from Permit to Power"
- Company: Agentic Labs LLC
- Date: February 2026
- Logo / visual: Solar panel grid pattern with circuit-board motif

---

## Slide 2: CREDIBILITY SLIDE (The Founder Story)

> "I run a $100M/year solar company covering most of Texas. I built the tool I wish existed."
> -- Justin Griffith, CEO, Pure Energy & Founder, SolarOS

- **Pure Energy**: One of Texas's largest residential solar installation companies
- **Peak Revenue**: $100M/year
- **Installations**: Thousands across dozens of Texas jurisdictions
- **Experience**: 10+ years in solar operations

*Visual: Professional headshot. Pure Energy operations photo if available.*

**Key message**: This is not a founder who read about the problem. He lived it at scale.

---

## Slide 3: THE PROBLEM

**Solar's deployment speed crisis is not about the panels.**

Left column -- "Hardware costs have fallen 90%":
- Panel costs: < $0.30/watt
- Inverter costs: down 60%
- Battery costs: down 80%

Right column -- "Soft costs have NOT":
- Permitting: $0.24/watt (adds $1,920 per 8kW system)
- 30,000+ jurisdictions, each with different rules
- 20+ hours of paperwork per project
- Soft costs now > 50% of total residential solar cost (NREL)

Bottom stat bar:
- **Average permitting timeline**: 2-8 weeks (some jurisdictions: months)
- **Permitting automation demand**: Up 52% (industry surveys)

*Visual: Chart showing hardware cost declining while soft costs remain flat or increase.*

---

## Slide 4: THE 2026 INFLECTION

**January 1, 2026 changed everything.**

| What Happened | Impact |
|--------------|--------|
| Residential ITC expired | Margins squeezed; every dollar of soft cost matters more |
| Tariffs up to 3,400% on SE Asian panels | Equipment compliance nightmare |
| FEOC regulations expanded | New verification burdens on batteries + inverters |
| TPO shift (lease/PPA now dominant) | Every residential deal requires commercial-grade compliance |
| Net metering to net billing | Utility rate intelligence now critical |

**Result**: Installers must do more work, under more complex rules, with less margin, faster than ever.

**The companies that solve soft costs win. Everyone else goes out of business.**

*Visual: Timeline showing pre-2026 vs. post-2026 complexity.*

---

## Slide 5: THE SOLUTION

**SolarOS: One platform. Every jurisdiction. Getting smarter with every project.**

Four pillars (with icons):

1. **National Permit Intelligence**
   - 106 jurisdictions across all 50 states
   - Fees, timelines, requirements, portal URLs, PE stamp thresholds
   - Auto-updated from primary sources

2. **AI Compliance Engine**
   - Domestic content verification (50% US threshold)
   - FEOC screening (no China/Russia/NK/Iran components)
   - Tariff-safe equipment validation
   - 72+ equipment products tracked

3. **Self-Learning AI Task Engine**
   - AI attempts every task first
   - Escalates to humans when uncertain
   - Learns from every human action
   - Gets smarter with every project

4. **API Marketplace**
   - 6 RESTful endpoints (equipment, utilities, incentives, permits, compliance, estimates)
   - Stripe subscription billing ($79-$299/mo)
   - Designed for integration with Aurora, Enerflo, OpenSolar

*Visual: Architecture diagram showing the flow.*

---

## Slide 6: HOW IT WORKS (Product Demo)

**Screenshots of the working platform** (take from https://power-to-the-people-vpp.web.app)

Show 4-5 screenshots:
1. **Dashboard** -- Project overview with pipeline stages
2. **Permit Lookup** -- Jurisdiction search showing requirements, fees, timelines
3. **Compliance Check** -- Equipment verification with FEOC/domestic content results
4. **Solar Estimate** -- Production estimate with incentive stacking
5. **API Documentation** -- Swagger UI showing endpoints

Bottom: "Live at https://power-to-the-people-vpp.web.app"

*This slide proves: it's not a pitch -- it's a working product.*

---

## Slide 7: CLIMATE IMPACT

**Every month of permitting delay = 338 kg CO2 per project.**

*Calculation (show briefly):*
- 8 kW avg system x 10,500 kWh/year x 0.386 kg CO2/kWh (EPA eGRID)
- = 4,053 kg CO2/year offset per system
- = 338 kg CO2/month

**At Scale:**

| Metric | Year 1 | Year 3 | Year 5 |
|--------|--------|--------|--------|
| Projects accelerated | 1,000 | 10,000 | 50,000 |
| Avg. time saved | 3 weeks | 4 weeks | 6 weeks |
| Annual CO2 impact | 242 MT | 3,227 MT | 24,200 MT |
| **Lifetime CO2 impact** | **101K MT** | **1.01M MT** | **5.07M MT** |

**Indirect**: Reducing soft costs by $0.10-0.15/watt makes solar viable for ~2M additional US households.

*Visual: Growing CO2 impact chart with milestone markers.*

---

## Slide 8: MARKET OPPORTUNITY

**TAM / SAM / SOM**

- **TAM: $4.2 Billion** -- Total US solar soft costs (permitting, compliance, customer acquisition, labor management)
- **SAM: $1.2 Billion** -- Permitting and compliance software/services for residential + commercial solar
- **SOM: $12 Million** -- 1% permit processing market share in Year 3

**Solar Software Market Context** (source: Global Growth Insights, Business Research Insights):
- Global solar software market: $263B in 2026, growing at 5.96% CAGR
- Automation demand up 59%; customer preference for automated permitting documentation up 52%
- Aurora Solar holds ~18% market share in design -- no dominant player in compliance/permitting

**Why Now:**
1. 2026 ITC expiration created compliance complexity overnight
2. SolarAPP+ proves market wants automation (500+ jurisdictions adopted)
3. TPO shift = every deal needs commercial compliance verification
4. AI maturity reached the threshold for document/compliance automation
5. Installer margin squeeze makes soft cost reduction existential

**Competitive Landscape:**

| Competitor | Focus | Gap SolarOS Fills |
|-----------|-------|-------------------|
| SolarAPP+ (NREL) | Standardized permitting | Requires jurisdiction adoption; standard residential only |
| Symbium | Government-side permitting | Municipal-facing; 39 jurisdictions; no compliance |
| Aurora/Lyra | Design + proposal | Closed ecosystem; no compliance engine |
| GreenLancer | Human permit engineering | $300-500/permit; manual; doesn't scale |

**SolarOS is the only platform combining national permit intelligence + real-time compliance + self-learning AI in an open API.**

---

## Slide 9: TRACTION

**Built. Deployed. Data-Rich. Revenue-Ready.**

| Metric | Value |
|--------|-------|
| Jurisdictions in permit database | 106 across all 50 states |
| State-level permit documents | 50 |
| Incentive programs tracked | 190+ |
| Utility rate profiles | 485+ |
| Equipment products tracked | 72+ (with compliance scoring) |
| Energy community counties | 147+ |
| Live API endpoints | 6 |
| Subscription tiers | 3 ($79 / $149 / $299 per month) |
| Payment processing | Stripe (live) |
| Banking/invoicing | Mercury ACH (live) |
| SMS notifications | Twilio (live) |
| First customer | Pure Energy ($100M/yr solar company) |

*Visual: Map of US showing jurisdiction coverage. Dashboard screenshot.*

---

## Slide 10: BUSINESS MODEL

**SaaS + API Marketplace + Per-Permit Processing**

| Revenue Stream | Price | Target |
|---------------|-------|--------|
| Starter Subscription | $79/month | Small installers (< 50 projects/yr) |
| Professional Subscription | $149/month | Mid-size installers, regional EPCs |
| Enterprise Subscription | $299/month | National installers, developers, financiers |
| API Pay-As-You-Go | $2-25/call | Platform integrators (Aurora, Enerflo, OpenSolar) |
| Per-Permit Processing | $150-300/permit | Full-service automation (vs. $300-500 at GreenLancer) |

**Unit Economics:**
- Gross margin: 85%+ (software)
- Target CAC: $200-400
- Target LTV/CAC: 15:1+
- Monthly churn target: < 5%

**Year 1 Revenue Target: $590K ARR**
- API subscriptions: $240K
- Compliance check fees: $150K
- Per-permit processing: $100K
- Enterprise licensing: $100K

---

## Slide 11: TEAM

**Justin Griffith -- Founder & CEO**

- CEO & Owner, Pure Energy -- one of Texas's largest residential solar companies
- Peak annual revenue: $100M
- Thousands of installations across dozens of Texas jurisdictions
- Built SolarOS as sole technical founder using AI-augmented development
- Deep relationships with permitting offices, installers, and equipment distributors
- Built-in first customer: Pure Energy provides immediate pilot deployment

**AI-Augmented Development**
- Claude Code (Anthropic) + custom AI agent system (Ava)
- Solo founder operating at 10-person team velocity
- Same AI-human collaboration pattern that powers SolarOS product

**Planned Hires (with seed funding):**
1. Solar industry BD / partnerships lead (Q2 2026)
2. Full-stack engineer with fintech experience (Q3 2026)
3. Compliance / regulatory specialist (Q4 2026)

---

## Slide 12: THE ASK

**Seeking: Seed Investment**
**VFC Ask: $50K non-dilutive (Cohort 6)**

**Use of Funds:**

| Category | % | Purpose |
|----------|---|---------|
| Engineering | 40% | SolarAPP+ integration, jurisdiction expansion, mobile app |
| Go-to-Market | 30% | First pilot customers, NY market entry, content marketing |
| Operations | 20% | Infrastructure, data quality, legal |
| Community | 10% | Community solar partnerships, LMI program integration |

**Milestones with VFC funding:**
1. Expand NY jurisdictions from 5 to 25+
2. First 5 paying customers (installer subscribers)
3. SolarAPP+ API integration (automated permit submission)
4. Investor showcase at Climate Week NYC (September 2026)
5. Seed round preparation ($1.5-2M target)

---

## Slide 13 (Optional): NEW YORK STATE ALIGNMENT

**SolarOS directly supports New York's climate goals.**

1. **CLCPA**: NY needs ~20 GW solar to meet targets (currently ~6 GW). Permitting automation accelerates deployment.
2. **RAPID Act**: SolarOS complements large-scale siting reform by automating residential/commercial permitting.
3. **NY-Sun**: Low-income solar programs benefit from reduced soft costs.
4. **Fastest baseline**: NY has 25-day average approval. SolarOS helps maintain and extend this lead.
5. **5 NY jurisdictions already in database**: New York City, Buffalo, Rochester, Syracuse, Albany.

---

## DESIGN NOTES

### Color Palette
- Primary: Deep navy (#1a1a2e) or dark charcoal (#0f0f0f)
- Accent: Solar gold (#f0a500) or clean green (#00c853)
- Text: White (#ffffff) on dark backgrounds
- Data: Teal (#00bcd4) for charts

### Typography
- Headers: Inter Bold or Montserrat Bold
- Body: Inter Regular or Source Sans Pro
- Numbers/Stats: Mono font for impact (JetBrains Mono or SF Mono)

### Visual Guidelines
- Use real screenshots, not mockups
- Data-heavy slides: use tables and simple charts, not paragraph text
- One key stat per slide dominates visually
- Minimal text -- this is a presentation, not a document
- Include solar imagery only if it adds context (not stock photos of panels)

### Slide Dimensions
- Standard: 16:9 widescreen
- Export as PDF for email/upload
- Also export as individual PNGs for social media use

---

## PITCH DECK VARIANTS

### Variant A: VFC / NYSERDA Focus (10 slides)
Omit optional NY slide (fold into main narrative). Emphasize climate impact, NYS alignment, and $50K use of funds. This is the version for the F6S submission.

### Variant B: VC Investor Focus (12 slides)
Include market opportunity detail, competitive moat analysis, and financial projections. Larger ask ($1.5-2M seed). For Congruent, Blue Bear, Energize outreach.

### Variant C: Climate Fintech Focus (12 slides)
Emphasize tax equity compliance, TPO automation, and Section 6418 marketplace opportunity. For New Energy Nexus Climate Fintech Accelerator.

### Variant D: Equity / Impact Focus (12 slides)
Lead with community impact, LMI access, community solar, and energy justice. For Elemental Impact application.

---

*Outline prepared February 8, 2026. Create PDF using these slides before submitting VFC application on F6S.*
