# Pro-Solar Government Programs - Comprehensive 2026 Report

**Last Updated:** February 8, 2026
**Research Status:** Active programs verified against current legislation including the One Big Beautiful Bill Act (OBBBA) signed July 4, 2025

---

## Table of Contents

1. [Federal Tax Incentives](#1-federal-tax-incentives-2026-status)
2. [DOE Solar Programs](#2-doe-solar-programs)
3. [EPA Programs](#3-epa-programs)
4. [USDA Programs](#4-usda-programs)
5. [State-Level Programs](#5-state-level-pro-solar-programs)
6. [Utility Programs](#6-utility-programs)
7. [Financing Programs](#7-financing-programs)
8. [Key Deadlines Summary](#8-key-deadlines-summary)

---

## 1. Federal Tax Incentives (2026 Status)

### Critical Context: OBBBA Impact

The "One Big Beautiful Bill Act" (OBBBA), signed into law on July 4, 2025, significantly altered the federal solar incentive landscape:
- **Residential ITC (Section 25D)**: Officially ended December 31, 2025. Homeowners purchasing with cash or loans NO LONGER qualify for the 30% tax credit.
- **Commercial ITC (Section 48/48E)**: Accelerated phase-out for projects beginning construction after July 5, 2026. Projects must be placed in service by end of 2027.
- **Foreign Entity Restrictions**: Starting 2026, no "specified foreign entity" (SFE) or "foreign-influenced entity" (FIE) can claim 45Y, 48E, or 45X credits.

Sources: [SEIA - OBBBA Provisions](https://seia.org/research-resources/clean-energy-provisions-big-beautiful-bill/), [Solar.com - Senate OBBBA Text](https://www.solar.com/learn/senate-releases-updated-one-big-beautiful-bill-text-what-it-means-for-solar/), [Kirkland & Ellis - OBBBA Changes](https://www.kirkland.com/publications/kirkland-alert/2025/08/one-big-beautiful-bill-act-brings-big-changes-to-green-energy-tax-credits)

---

### 1.1 Investment Tax Credit (ITC) - Section 48/48E

**Status: ACTIVE for commercial; ENDED for residential**

| Category | Rate | Status |
|----------|------|--------|
| Residential (25D) | 0% | Expired 12/31/2025 |
| Commercial base credit | 6% | Active through 2027 |
| Commercial with PWA | 30% | Active through 2027 |
| TPO residential (lease/PPA) | 30% | Active via 48E through 2027 |

**Key Deadlines:**
- Projects must begin construction by **July 4, 2026** (12 months post-OBBBA enactment)
- Projects must be placed in service by **December 31, 2027**
- Safe harbor by **July 3, 2026** extends installation timeline through 2030

**TPO Exception (Critical for Solar CRM):** The business-claimed 48E tax credit for residential solar leases, PPAs, and prepaid solar products remains in effect through end of 2027. In TPO arrangements, the leasing company claims the credit and the homeowner benefits from lower payments.

Sources: [SEIA - Solar ITC](https://seia.org/solar-investment-tax-credit/), [Paradise Energy - 2026 Solar Tax Credit](https://www.paradisesolarenergy.com/blog/how-does-the-solar-tax-credit-work/), [Good Energy Solutions - Commercial 2026](https://goodenergysolutions.com/commercial-solar-tax-credits-2026-federal-incentives-for-businesses/)

---

### 1.2 Domestic Content Bonus (+10%)

**Status: ACTIVE and MANDATORY for Direct Pay starting 2026**

- Increases ITC by 10 percentage points (from 30% to 40% for qualifying projects)
- For the ITC, the bonus increases the value by one-third
- **Critical 2026 change:** Direct payment recipients that begin construction in 2026 or later **must** meet domestic content requirements. No refundable credit will be permitted for non-compliant projects beginning construction in 2026+.

**Requirements:**
- Steel/iron: 100% manufactured in the US
- Manufactured products: Cost of US-manufactured components must meet threshold percentages (increasing over time)
- Solar components: Cells, modules, inverters, racking must meet applicable thresholds

**Relevance for Solar CRM:** Equipment compliance tracking (`domestic_content_compliant` field) is now mandatory for any commercial project seeking direct pay.

Sources: [Treasury - Domestic Content Guidance](https://home.treasury.gov/news/press-releases/jy2788), [Congress.gov - Domestic Content Requirements](https://www.congress.gov/crs-product/R48358)

---

### 1.3 Energy Community Bonus (+10%)

**Status: ACTIVE**

- Additional 10% ITC (2% for base credit) for projects in qualifying "energy communities"
- Available for projects placed in service after December 31, 2022

**Qualifying Locations:**
1. **Brownfield sites** (EPA-designated)
2. **Coal community census tracts** - tracts where a coal mine closed after 12/31/1999 or a coal-fired power plant retired after 12/31/2009, plus any adjoining tracts
3. **Fossil fuel employment areas** - areas with significant employment or tax revenue related to extraction, processing, transport, or storage of coal, oil, or natural gas (current or historical since 12/31/1999)

**Tool:** IRS Energy Community Tax Credit Bonus interactive map available at [energycommunities.gov](https://energycommunities.gov)

Sources: [EPA - IRA Provisions](https://www.epa.gov/green-power-markets/summary-inflation-reduction-act-provisions-related-renewable-energy), [McGuireWoods - IRA Solar Credits](https://www.mcguirewoods.com/client-resources/alerts/2023/2/inflation-reduction-act-extends-and-modifies-tax-credits-for-solar-projects/)

---

### 1.4 Low-Income Community Bonus (+10-20%)

**Status: ACTIVE - 2026 Applications open February 2, 2026**

| Facility Category | Bonus | 2026 Capacity Available |
|-------------------|-------|------------------------|
| Located in low-income community | +10% | 643,560.93 MW |
| Located on Indian Land | +10% | Allocated from annual pool |
| Qualified low-income residential building project | +20% | Allocated from annual pool |
| Qualified low-income economic benefit project | +20% | Allocated from annual pool |

**Program Details:**
- Annual capacity limitation of 1.8 GW divided across categories
- Applies to solar and wind projects under 5 MW
- Applications open **February 2, 2026** through **August 7, 2026**
- Initial 30-day period (through March 4, 2026): all applications treated as submitted simultaneously
- After March 4: considered on rolling basis if capacity remains

**Application Portal:** [DOE Low-Income Communities Bonus Credit](https://eco.energy.gov/licbonus/s/)

Sources: [IRS - Low-Income Communities Bonus](https://www.irs.gov/credits-deductions/clean-electricity-low-income-communities-bonus-credit-amount-program), [Treasury - First Year Analysis](https://home.treasury.gov/news/featured-stories/analysis-of-the-first-year-of-the-low-income-communities-bonus-credit-program-building-an-inclusive-and-affordable-clean-energy-economy)

---

### 1.5 Prevailing Wage & Apprenticeship (PWA) Requirements

**Status: REQUIRED for full credit on projects >= 1 MW**

**Credit Multiplier:** Meeting PWA requirements increases base credits by 5x (e.g., 6% base -> 30% ITC)

**Prevailing Wage Requirements:**
- Must pay DOL-determined prevailing wages for all construction, alteration, and repair work
- Applies during construction AND for 5 years after placed in service (for ITC) or 10 years (for PTC)
- Cure provision available for good-faith failures (back pay + penalty)

**Apprenticeship Requirements:**
- 15% of total labor hours must be performed by registered apprentices (for construction beginning 2024+)
- Must maintain applicable apprentice-to-journeyworker ratios
- Good faith effort exception if qualified apprentices are unavailable

**Exceptions:**
- Projects under 1 MW AC are exempt
- Projects beginning construction before January 29, 2023 are exempt

Sources: [IRS - PWA Requirements](https://www.irs.gov/credits-deductions/prevailing-wage-and-apprenticeship-requirements), [SEIA - PWA](https://seia.org/prevailing-wage-apprenticeships/), [Plante Moran - PWA Guide](https://www.plantemoran.com/explore-our-thinking/insight/2025/01/prevailing-wage-requirements-for-bonus-ira-energy-tax-credits)

---

### 1.6 Section 45X Advanced Manufacturing Production Tax Credit

**Status: ACTIVE through 2029 (phasedown begins 2030)**

**Eligible Solar Components & Credit Amounts:**
| Component | Credit Amount |
|-----------|--------------|
| Solar-grade polysilicon | $3/kg |
| Solar wafers | Per-wafer credit based on size |
| Solar cells | Per-watt credit |
| Solar modules | Per-watt credit |
| Inverters (various types) | Per-watt credit (varies by type) |
| Torque tubes | Per-kg credit |
| Structural fasteners | Per-kg credit |
| Polymeric backsheets | Per-sq-meter credit |

**2026 Changes:**
- Foreign entity restrictions take effect: no SFE or FIE can claim 45X credits
- Material assistance cost ratio requirements increase (battery components: 60% in 2026)

**Phase-Down Schedule:**
| Year | Credit Value |
|------|-------------|
| Through 2029 | 100% |
| 2030 | 75% |
| 2031 | 50% |
| 2032 | 25% |
| 2033+ | 0% |

Sources: [Congress.gov - Section 45X](https://www.congress.gov/crs-product/IF12809), [Crux Climate - 45X Guide](https://www.cruxclimate.com/insights/45x-tax-credit), [SunHub - 45X Transfers](https://www.sunhub.com/blog/45x-tax-credit-solar-manufacturing/)

---

### 1.7 Direct Pay / Transferability / Elective Pay

**Status: ACTIVE with restrictions**

**Elective Pay (Direct Pay):**
- Available to tax-exempt entities: nonprofits, state/local governments, tribal governments, rural electric co-ops, TVA, Alaska Native Corporations
- Available through **December 31, 2027**
- **Critical 2026 change:** Projects beginning construction on/after January 1, 2026 that do NOT meet domestic content requirements receive **0% credit via direct pay** (complete disqualification)
- Systems under 1 MW: tax-exempt entities receive 100% of the 30% credit
- Systems 1 MW+: Must meet domestic content to receive any credit via direct pay

**Transferability:**
- Allows for-profit entities to sell tax credits to unrelated third-party buyers for cash
- Available to any taxpayer that is NOT an "applicable entity" (i.e., not tax-exempt)
- Credits can be transferred for ITC, PTC, 45X, and other IRA credits
- Buyer pays cash for the credit (typically 90-95 cents per dollar of credit)

Sources: [IRS - Elective Pay and Transferability](https://www.irs.gov/credits-deductions/elective-pay-and-transferability), [Reunion Infra - Direct Pay & Domestic Content](https://www.reunioninfra.com/insights/direct-pay-and-domestic-content)

---

## 2. DOE Solar Programs

### 2.1 Solar Energy Technologies Office (SETO)

**Status: ACTIVE but reduced budget**

SETO supports R&D to make American-made solar technology affordable and its supply chain secure.

**Research Areas:**
- Photovoltaics (PV)
- Concentrating solar-thermal power (CSP)
- Systems integration
- Manufacturing and competitiveness
- Soft costs reduction
- Solar workforce development

**Funding:** Approximately $200 million annually through FY2026 (part of a $1 billion multi-year appropriation).

**Current Funding Opportunities:** Subscribe to SETO newsletter at [energy.gov/eere/solar](https://www.energy.gov/eere/solar/solar-energy-technologies-office)

Sources: [DOE - SETO](https://www.energy.gov/eere/solar/solar-energy-technologies-office), [DOE - SETO Goals](https://www.energy.gov/eere/solar/goals-solar-energy-technologies-office)

---

### 2.2 National Community Solar Partnership+ (NCSP+)

**Status: ACTIVE**

Expanded from the original NCSP to include:
- Community solar
- Residential and distributed rooftop solar plus storage
- Commercial solar projects
- Emphasis on low-income and disadvantaged communities

**Key Initiative:** Community Power Accelerator Prize - $10 million prize competition for new and emerging solar developers, community organizations, local governments, and tribal organizations.

**Market Data:** U.S. community solar market has 9.4 GW cumulatively installed. Expected to add 6.8+ GW over the next 5 years.

Sources: [DOE - Community Solar](https://www.energy.gov/communitysolar/community-solar), [DOE - About NCSP](https://www.energy.gov/communitysolar/about-national-community-solar-partnership)

---

### 2.3 SolarAPP+ (Solar Automated Permit Processing)

**Status: ACTIVE - Growing adoption**

- Free software for city/county permitting departments
- As of late 2023: 97 local governments publicly launched, 70+ piloting, 149+ testing/onboarding
- Reduces permitting process by ~14.5 business days
- Includes solar-plus-storage pilot program
- 18,906 permits processed in 2023 across 150 local governments
- SolarAPP+ permits account for ~43% of all permits in participating jurisdictions

**California Mandate:** Senate Bill 379 requires adoption of automated solar permitting platforms. CalAPP dashboard updated January 8, 2026.

**SolarAPP+ Prize:** $1 million program - $15,000 awards to local governments that adopt/pilot SolarAPP+ within 5 months.

Sources: [DOE - SolarAPP+](https://www.energy.gov/eere/solar/streamlining-solar-permitting-solarapp), [NREL - SolarAPP+ Growth](https://www.nlr.gov/news/detail/program/2024/automated-permitting-with-solarapp-grew-in-2023), [SEIA - SolarAPP+](https://seia.org/solarapp/)

---

### 2.4 Perovskite & Next-Gen Solar Programs

**Status: ACTIVE R&D**

- DOE announced $20 million for perovskite solar PV technologies
- Additional $36 million for perovskite and CdTe solar technologies
- Target: Develop hybrid tandem technology targets by end of 2026
- Projects range from $4.7M to $7M for perovskite-silicon tandem cells

**Research Focus:**
- Perovskite efficiency and stability improvements
- Manufacturing at scale and throughput
- Encapsulation approaches
- Tandem thin-film technologies (perovskite-on-silicon)

Sources: [DOE - Perovskite Solar Cells](https://www.energy.gov/eere/solar/perovskite-solar-cells), [DOE - $20M Perovskite Announcement](https://www.energy.gov/articles/department-energy-announces-20-million-advance-perovskite-solar-technologies)

---

### 2.5 Solar Workforce Development Programs

**Status: ACTIVE**

**Solar Training Network:**
- Addresses need for high-quality, accessible training in solar installation
- Established under Solar Training and Education for Professionals (STEP) funding

**Solar Ready Vets Network:**
- Connects veterans, transitioning service members, and military spouses with solar careers
- Career training, professional development, and employment opportunities

**Workforce Growth Need:** Solar workforce must grow from ~346,000 workers (2022) to 500,000-1.5 million by 2035.

**DOE Funding:** $10 million dedicated for solar workforce development.

Sources: [DOE - Solar Workforce Development](https://www.energy.gov/eere/solar/solar-workforce-development), [DOE - Solar Ready Vets](https://www.energy.gov/eere/solar/solar-ready-vets-network), [DOE - Solar Training Network](https://www.energy.gov/eere/solar/solar-training-network)

---

## 3. EPA Programs

### 3.1 Solar for All ($7B from GGRF)

**Status: TERMINATED (Repealed July 2025)**

- Original: $7 billion for zero-emissions technologies in low-income communities
- 49 state-level awards totaling ~$5.5B across 36 states
- 6 tribal awards totaling $500M+
- 5 multistate awards totaling ~$1B

**What Happened:** Section 119-21, signed July 4, 2025, repealed the Greenhouse Gas Reduction Fund and rescinded unobligated funds. EPA Administrator Zeldin issued termination memoranda to all grant recipients on August 7, 2025.

**Note:** Some previously obligated funds may still be in dispute. D.C. District Court issued a temporary restraining order in March 2025 enjoining EPA from terminating $20B in NCIF/CCIA grants. Legal challenges continue.

Sources: [EPA - GGRF](https://www.epa.gov/aboutepa/greenhouse-gas-reduction-fund), [EPA OIG - Solar for All Audit](https://www.epa.gov/office-inspector-general/report-audit-epas-greenhouse-gas-reduction-fund-solar-all-program)

---

### 3.2 Greenhouse Gas Reduction Fund (GGRF) Recipients

**Status: LARGELY TERMINATED / IN LITIGATION**

The $27 billion GGRF was divided into:
- **$14B National Clean Investment Fund (NCIF)** - Terminated
- **$6B Clean Communities Investment Accelerator (CCIA)** - Terminated
- **$7B Solar for All** - Repealed

**Court Status:** D.C. District Court temporary restraining order prevents EPA from transferring grant funds out of awardee accounts. Litigation ongoing.

Sources: [Columbia Climate Law Blog - GGRF](https://blogs.law.columbia.edu/climatechange/2025/04/02/epas-attacks-on-greenhouse-gas-reduction-fund-and-the-fate-of-iras-green-banks/)

---

### 3.3 Clean Energy Accelerator Programs

**Status: UNCERTAIN / LITIGATION**

Originally funded through GGRF to establish:
- National clean financing institutions
- Community lender hubs in low-income/disadvantaged communities
- State and regional green banks

**Current Reality:** The intended "national green bank" structure through GGRF has been largely dismantled. However, existing state-level green banks (Connecticut, New York, etc.) continue to operate independently.

Sources: [EPA - Green Banks](https://www.epa.gov/statelocalenergy/green-banks)

---

## 4. USDA Programs

### 4.1 Rural Energy for America Program (REAP)

**Status: FUNDED but with policy shifts**

**Funding:** Multi-year NOFO covering FY2025-2027. Hundreds of millions per year nationally.

| Funding Source | Maximum Grant | Cost Share |
|---------------|--------------|------------|
| Farm Bill / base funds | $1,000,000 | Up to 25% |
| IRA REAP funds | $1,000,000 | Up to 50% |

**Eligibility:**
- Agricultural producers
- Rural small businesses
- Renewable energy systems including solar
- Energy efficiency improvements

**2026 Policy Changes:**
- Grant applications in holding pattern due to backlog and policy shifts
- Guaranteed loans still available
- USDA implementing direction to "disincentivize solar panels on productive farmland"
- Ground-mounted solar systems >50kW face restrictions on loan guarantees and deprioritization in grants
- Roof-mounted and smaller systems remain eligible

**Application Window:** FY2026 grant cycle expected to open October 1, 2026 (delayed from original July-September 2025 window).

Sources: [USDA - REAP](https://www.rd.usda.gov/inflation-reduction-act/rural-energy-america-program-reap), [Solora Solar - REAP 2026](https://solorasolar.com/commercial/usda-reap-grant-2026/), [TPI Efficiency - REAP Status](https://tpiefficiency.com/reap-status-for-2026-jan-2026-update/)

---

### 4.2 Rural Energy Savings Program (RESP)

**Status: ACTIVE**

- **Lender:** USDA Rural Utilities Service (RUS)
- **Borrowers:** Rural electric cooperatives and other rural utilities
- **Interest Rate:** 0% to the utility
- **Term:** Up to 20 years
- **Applications:** Accepted on a first-come, first-served basis until funding depleted

**Eligible Uses:**
- Building envelope upgrades
- On-grid and off-grid renewable energy systems (including solar)
- Lighting, water, and waste efficiency
- Permanently installed energy storage devices
- Beneficial electrification projects

**How It Works:** USDA lends at 0% to rural utilities, who then re-lend to their customers for energy efficiency and renewable energy projects.

Sources: [USDA - RESP](https://www.rd.usda.gov/programs-services/electric-programs/rural-energy-savings-program), [EESI - RESP](https://www.eesi.org/Rural-Energy-Savings-Program)

---

### 4.3 Electric Infrastructure Loan & Loan Guarantee Program

**Status: ACTIVE**

- $2.2 billion supporting 39 projects in 21 states
- Finances generation, transmission, and distribution facilities
- Includes demand side management, energy conservation, and renewable energy systems
- On-grid and off-grid solar systems eligible

**Note:** Ground-mounted solar >50kW faces new restrictions under current policy direction.

Sources: [USDA - Electric Infrastructure Loans](https://www.rd.usda.gov/programs-services/electric-programs/electric-infrastructure-loan-loan-guarantee-program)

---

## 5. State-Level Pro-Solar Programs

### 5.1 Renewable Portfolio Standards (RPS) with Solar Carve-Outs

**30+ states have RPS programs; 16+ have solar-specific carve-outs**

| State | RPS Target | Solar Carve-Out | Notes |
|-------|-----------|-----------------|-------|
| California | 100% by 2045 | Integrated | Largest solar market |
| New York | 70% by 2030 | Yes | Aggressive targets |
| New Jersey | 50% by 2030 | Yes (SuSI/TREC) | Strong solar market |
| Massachusetts | 35% by 2030 | Yes (SMART) | SREC/SMART program |
| Maryland | 50% by 2030 | Yes (SREC) | Active SREC market |
| Illinois | 40% by 2030 | Yes | Adjustable Block Program |
| Colorado | 30% by 2020 (IOUs) | Yes | Community solar leader |
| Minnesota | 31.5% by 2030 | Yes | Community solar pioneer |
| Delaware | 40% by 2035 | Yes (SREC) | Active program |
| Pennsylvania | 8% by 2021 | Yes (SREC) | Low targets |
| Virginia | 100% by 2050 | Yes | Growing market |
| North Carolina | 12.5% by 2021 | Yes | Utility rebates |
| Ohio | ELIMINATED 2026 | Formerly yes | RPS eliminated by legislation |

**Comprehensive resource:** [DSIRE](https://www.dsireusa.org/) - Database of State Incentives for Renewables & Efficiency

Sources: [NREL - RPS Basics](https://www.nrel.gov/state-local-tribal/basics-portfolio-standards), [EPA - SREC Markets](https://www.epa.gov/greenpower/state-solar-renewable-energy-certificate-markets)

---

### 5.2 SREC/TREC Programs (Active Markets)

| State | Program | Approximate Value per MWh | Notes |
|-------|---------|--------------------------|-------|
| New Jersey | TREC/SuSI | $91.20 (residential), $152 (commercial) | Fixed-price TRECs |
| Massachusetts | SMART | Performance-based $/kWh | 10-year (residential), 20-year (commercial) |
| Maryland | SREC | Market-determined | Active market |
| Delaware | SREC | Market-determined | Active market |
| Pennsylvania | SREC | Market-determined | Lower values |
| Virginia | SREC | Market-determined | Growing program |
| Washington DC | SREC | Market-determined (historically high) | Strong market |
| Ohio | SREC | N/A | Program eliminated 2026 |

Sources: [EcoWatch - SRECs 2026](https://www.ecowatch.com/solar/solar-renewable-energy-credits), [SRECTrade - Markets](https://www.srectrade.com/markets/rps/srec/), [EnergySage - NJ TRECs](https://www.energysage.com/solar/srecs/nj-trecs-solar-incentive/)

---

### 5.3 State Rebate Programs (Still Active in 2026)

| State | Program | Amount | Notes |
|-------|---------|--------|-------|
| **California** | DAC-SASH | $3/watt (up to 5 kW) | Low-income, disadvantaged communities |
| **California** | SGIP | $200/kWh (storage) | Battery storage focus |
| **California** | New LMI program | $280M pool | 50% upfront for eligible customers |
| **New York** | NY-Sun Megawatt Block | ~$1,380 avg savings | Upstate block CLOSED 12/17/2025 |
| **New York** | Affordable Solar | Additional incentives | <80% AMI households |
| **Massachusetts** | SMART 3.0 | Performance-based $/kWh | 600 MW capacity for 2026 |
| **Massachusetts** | State tax credit | 15% up to $1,000 | State income tax credit |
| **New Jersey** | SuSI Program | Up to $90/MWh x 15 years | Successor Solar Incentive |
| **North Carolina** | Duke Energy Progress rebate | $250/kW | Utility-specific |
| **North Carolina** | TVA incentive | $1,000 flat | Post-installation payment |
| **Illinois** | Adjustable Block Program | Varies by block | Solar+storage eligible |
| **Connecticut** | Smart-E Loan | 4.49-6.99% APR | Green Bank administered |

Sources: [Solar.com - Incentives by State 2026](https://www.solar.com/learn/solar-rebates-by-state/), [EcoWatch - Top 9 States 2026](https://www.ecowatch.com/solar/incentives), [EnergySage - CA Incentives](https://www.energysage.com/local-data/solar-rebates-incentives/ca/)

---

### 5.4 Community Solar Programs by State

**24 states + DC have enabling legislation; 41 states have at least one project online.**

**Top 4 States (>75% of total market):**
1. Florida
2. New York
3. Massachusetts
4. Minnesota

**Notable 2026 Developments:**
- **Colorado:** SB24-207 Community Solar Modernization Act (effective 2026):
  - Max size increased to 5 MW
  - 51% capacity must serve LMI subscribers
  - Minimum 25% bill discount for LMI
  - Utilities must offer 100 MW of community solar
- **Minnesota:** Largest community solar program via Xcel Energy Solar*Rewards
- **New York:** Extensive community solar through NY-Sun

**Market Size:** 9.4 GW cumulative (through Q3 2025); expected to add 6.8+ GW over next 5 years.

Sources: [DOE - Community Solar Basics](https://www.energy.gov/eere/solar/community-solar-basics), [ILSR - Community Solar Tracker](https://ilsr.org/article/energy-democracy/community-solar-tracker/), [SEIA - Community Solar](https://seia.org/initiatives/community-solar/)

---

### 5.5 Low-Income Solar Programs by State

**Federal Programs Supporting State Low-Income Solar:**

| Program | FY2026 Funding | Focus |
|---------|---------------|-------|
| LIHEAP | $4.05 billion | Heating/cooling/weatherization |
| WAP (Weatherization) | $329 million | ~$6,500/housing unit |

**LIHEAP-Solar Pathway:** States can transfer up to 25% of LIHEAP funds to weatherization programming that includes solar as an eligible measure.

**State-Specific Programs:**
- **California:** DAC-SASH ($3/watt), SGIP Equity ($850/kWh), SGIP Equity Resilience ($1,000/kWh)
- **Connecticut:** Green Bank + PosiGen low-income solar lease (~$500/year savings, 1,300+ participants)
- **New York:** NY-Sun Affordable Solar (additional incentives for <80% AMI)
- **Massachusetts:** SMART 3.0 has elevated incentives for low-income installations
- **Colorado:** Community solar 51% LMI requirement (2026)
- **Illinois:** Solar for All programs through Adjustable Block Program

Sources: [Low-Income Solar Policy Guide](https://www.lowincomesolar.org/toolbox/federal-energy-assistance-programs/), [Utility Dive - Energy Assistance 2026](https://www.utilitydive.com/news/federal-energy-assistance-programs-survive-budget-gauntlet/811389/)

---

### 5.6 Solarize Campaigns

**Status: ACTIVE nationwide (grassroots, not government-mandated)**

Solarize campaigns are community-organized group purchasing programs that achieve 25-35% cost reductions through bulk buying power.

**Key Features:**
- 3-6 month campaign duration
- RFP process to select installer
- Tiered pricing (more participants = lower price)
- Education-focused outreach
- Both rooftop and community solar variants

**Active/Notable Programs:**
- **New York:** NYSERDA-supported Solarize program
- **Connecticut:** Multiple active campaigns
- **Massachusetts:** EnergySage-facilitated campaigns
- **Nationwide:** Solar CrowdSource platform (solarcrowdsource.com)

Sources: [NYSERDA - Solarize](https://www.nyserda.ny.gov/All-Programs/NY-Sun/Communities-and-Local-Governments/Solarize), [NREL - Solarize Guidebook](https://docs.nrel.gov/docs/fy12osti/54738.pdf), [Solar CrowdSource](https://www.solarcrowdsource.com/)

---

### 5.7 Property Tax Exemptions

**36 states + DC + Puerto Rico offer solar property tax exemptions.**

This means the added home value from a solar installation is excluded from property tax assessments.

**Notable States:** Arizona, California, Colorado, Connecticut, Florida, Hawaii, Illinois, Iowa, Kansas, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oregon, Pennsylvania, Rhode Island, South Carolina, Tennessee, Texas, Vermont, Virginia, Washington, West Virginia, Wisconsin.

Sources: [SEIA - Solar Tax Exemptions](https://seia.org/solar-tax-exemptions/), [EcoWatch - Solar Tax Exemptions 2026](https://www.ecowatch.com/solar/solar-tax-exemptions)

---

### 5.8 Sales Tax Exemptions

**25 states offer solar sales tax exemptions** (plus 5 states with no sales tax).

Potential savings: 2.9% to 9.5% of installation cost (depending on state sales tax rate).

**States with Solar Sales Tax Exemption:** Arizona, Colorado, Connecticut, Florida, Idaho, Iowa, Maine, Maryland, Massachusetts, Minnesota, Nevada, New Jersey, New Mexico, New York, North Carolina, Ohio, Pennsylvania, Rhode Island, South Carolina, Vermont, Virginia, Washington, and others.

**States with No Sales Tax:** Alaska, Delaware, Montana, New Hampshire, Oregon.

Sources: [SEIA - Solar Tax Exemptions](https://seia.org/solar-tax-exemptions/), [SolarReviews - Tax Exemptions](https://www.solarreviews.com/blog/sales-and-solar-property-tax-exemptions)

---

## 6. Utility Programs

### 6.1 Virtual Power Plant (VPP) Programs

**Status: RAPIDLY EXPANDING - 37.5 GW capacity in North America (2025)**

| Utility/Program | State | Capacity/Details | Compensation |
|-----------------|-------|-----------------|--------------|
| Green Mountain Power | Vermont | VPP pilot | Saved ratepayers ~$3M (summer 2025) |
| National Grid ConnectedSolutions | MA | Demand response | Up to $275/kW annually |
| Eversource ConnectedSolutions | MA | Demand response | Up to $275/kW annually |
| Rhode Island Energy | RI | ConnectedSolutions | Up to $225/kW annually |
| Dominion Energy | VA | VPP pilot (up to 450 MW) | Under development |
| PG&E | CA | Battery aggregation | Bill credits |
| APS (Arizona) | AZ | Battery program | Incentive payments |
| Colorado (new 2026) | CO | First state VPP program | Performance-based tariff |
| NJ Garden State Energy Storage | NJ | Statewide program | $150-$300/year |
| ERCOT DER Pilot | TX | Grid export compensation | Per-event payments |

**2026 Developments:**
- Colorado approved state's first VPP program - standing up in 2026
- Illinois legislation targeting 3 GW grid-scale battery storage by 2030 + VPP programs
- New Jersey governor ordered acceleration of VPP programs
- Lunar Energy raised $232M for VPP software platform

Sources: [DOE - VPP Projects](https://www.energy.gov/edf/virtual-power-plants-projects), [Sol-Ark - Aggregator Programs](https://www.sol-ark.com/solar-power-aggregator-programs-get-paid-to-support-the-grid/), [Pew - VPPs](https://www.pew.org/en/research-and-analysis/articles/2025/12/22/virtual-power-plants-powering-the-grid-from-your-neighborhood)

---

### 6.2 Demand Response Programs

**Key Programs Compensating Solar+Battery Homeowners:**

| Program | Location | Compensation | Requirements |
|---------|----------|--------------|-------------|
| ConnectedSolutions | MA, RI | $225-$275/kW/year | Battery storage required |
| SGIP + DR events | CA | $850-$1,000/kWh + event payments | Battery storage required |
| Garden State Energy Storage | NJ | $150-$300/year | Battery + utility enrollment |
| ERCOT DER Pilot | TX | Event-based payments | Solar/battery export capability |
| APS Storage Rewards | AZ | Annual payments | Battery enrollment |

Sources: [Sol-Ark - Aggregator Programs](https://sol-ark.com/news/solar-power-aggregator-programs-get-paid-to-support-the-grid/), [PowerLutions - NJ Battery Program](https://powerlutions.com/new-jersey/the-2026-new-jersey-home-battery-program-what-homeowners-need-to-know/)

---

### 6.3 Time-of-Use (TOU) Rate Optimization

**Key Markets for Solar+Battery Arbitrage:**
- **California:** Largest TOU differential. NBT export rates ~$0.08/kWh vs. peak import $0.40-0.55/kWh
- **Texas (ERCOT):** Real-time pricing creates significant arbitrage opportunities
- **Arizona:** APS/SRP TOU rates with strong peak/off-peak differentials
- **Hawaii:** High electricity costs make storage arbitrage highly valuable

**2026 Trends:**
- AI algorithms predicting weather/usage for automated charge/discharge
- Automated TOU arbitrage without user intervention
- U.S. battery storage capacity expected to triple by end of 2028

Sources: [Aurora Solar - Energy Arbitrage](https://help.aurorasolar.com/hc/en-us/articles/28998198908563-Understanding-Storage-Modeling-for-Energy-Arbitrage)

---

### 6.4 Battery Storage Incentives

| Program | State | Amount | Eligibility |
|---------|-------|--------|------------|
| **SGIP** | CA | $200/kWh (general), $850/kWh (equity), $1,000/kWh (equity resilience) | All solar customers with battery |
| **New LMI Battery Program** | CA | $280M pool, 50% upfront | Low-income residents |
| **ConnectedSolutions** | MA, RI | $225-$275/kW/year | Battery storage owners |
| **Garden State Energy Storage** | NJ | $150-$300/year + rebates | Homeowners with battery |
| **NYSERDA Battery Incentives** | NY | Varies by program | Solar+storage systems |
| **IL Battery Storage** | IL | Part of clean energy bill | VPP participation |

Sources: [EcoFlow - SGIP 2026 Guide](https://www.ecoflow.com/us/blog/sgip-california-rebate-guide), [PowerFlex - Storage Incentives by State](https://www.powerflex.com/blog/battery-storage-incentives-by-state)

---

## 7. Financing Programs

### 7.1 PACE (Property Assessed Clean Energy)

**Status: 38+ states with enabling legislation; 30+ states with active C-PACE programs**

**Key Features:**
- 100% financing of project costs
- Repayment via property tax assessment
- Long-term (up to 30 years)
- Transfers with property sale
- No upfront cost to property owner

**Program Types:**
| Type | Target | Active States |
|------|--------|--------------|
| C-PACE (Commercial) | Commercial/multifamily | 30+ states + DC |
| R-PACE (Residential) | Homeowners | Primarily California; limited elsewhere |

**Notable Programs:**
- **Connecticut Green Bank C-PACE:** 100% financing for non-residential buildings
- **Minnesota C-PACE (MinnPACE):** Commercial buildings, multifamily (5+ units), nonprofits
- **California R-PACE:** Largest residential PACE market nationally

Sources: [EPA - Commercial PACE](https://www.epa.gov/statelocalenergy/commercial-property-assessed-clean-energy), [PACENation](https://www.pacenation.org/)

---

### 7.2 Green Banks by State

| State | Green Bank | Key Solar Programs |
|-------|-----------|-------------------|
| **Connecticut** | CT Green Bank (est. 2011) | Smart-E Loans (4.49-6.99% APR), C-PACE, PosiGen LMI lease |
| **New York** | NY Green Bank (est. 2013) | $1B+ deployed, solar financing |
| **California** | CA Infrastructure Bank (IBank) | CLEEN program |
| **Colorado** | Colorado Clean Energy Fund | Residential & commercial solar |
| **Maryland** | Montgomery County Green Bank | Local solar financing |
| **Michigan** | Michigan Saves | Solar loans |
| **Rhode Island** | RI Infrastructure Bank | C-PACE, solar financing |
| **Nevada** | Nevada Clean Energy Fund | Solar for LMI |
| **Hawaii** | Hawaii Green Infrastructure Authority | GEMS program |
| **DC** | DC Green Bank | Solar for All (local) |
| **New Jersey** | NJ Infrastructure Bank | Clean energy financing |

Sources: [EPA - Green Banks](https://www.epa.gov/statelocalenergy/green-banks), [CT Green Bank](https://www.ctgreenbank.com/), [Low-Income Solar Policy Guide - Green Banks](https://www.lowincomesolar.org/toolbox/green-banks/)

---

### 7.3 On-Bill Financing Programs

Utilities that allow customers to finance solar through their utility bill:

- **Hawaii:** GEMS (Green Energy Money $aver) through Hawaii Green Infrastructure Authority
- **New York:** On-bill recovery programs through NYSERDA
- **California:** Various utility-administered programs
- **Multiple states:** Rural electric cooperatives offering on-bill repayment through RESP-funded programs

---

### 7.4 FHA PowerSaver Loan Program

**Status: ACTIVE (limited availability)**

| Feature | Detail |
|---------|--------|
| Max Loan | $25,000 |
| Max Term | 20 years |
| FHA Insurance | Up to 90% of loan amount |
| Min Credit Score | 660 |
| Max DTI | 45% |
| Max CLTV | 100% |
| Property Type | Owner-occupied, 1-unit, principal residence |

**Eligible Uses:** Solar PV, solar thermal, insulation, geothermal, other energy improvements.

Sources: [FHA Solar Loan Program](https://www.fhasolarloanprogram.com/), [DOE - PowerSaver Opportunities](https://www.energy.gov/eere/better-buildings-residential-network/articles/opportunities-through-powersaver-loan-program)

---

## 8. Key Deadlines Summary

| Deadline | Program | Action Required |
|----------|---------|----------------|
| **Feb 2, 2026** | Low-Income Community Bonus Credit | Applications open |
| **Mar 4, 2026** | Low-Income Community Bonus Credit | End of initial 30-day equal-treatment period |
| **Jul 3, 2026** | Commercial ITC Safe Harbor | Last day to begin construction for extended timeline |
| **Jul 4, 2026** | Commercial ITC (48E) | Accelerated phase-out begins for new projects |
| **Aug 7, 2026** | Low-Income Community Bonus Credit | Application deadline |
| **Oct 1, 2026** | USDA REAP | Expected FY2026 grant application window opens |
| **Dec 31, 2027** | Commercial ITC / TPO Residential | Projects must be placed in service |
| **Dec 31, 2027** | Elective Pay / Direct Pay | Last year available for tax-exempt entities |
| **Dec 31, 2029** | Section 45X Manufacturing Credit | Full credit value ends |
| **Rolling** | USDA RESP | First-come, first-served until funding depleted |
| **Rolling** | USDA REAP Loans | Guaranteed loans still available |
| **Annual** | MA SMART 3.0 | Annual capacity blocks and rate resets |

---

## Net Metering / Net Billing Landscape

**Status: Transitioning from net metering to net billing nationwide**

| State | Policy | Export Rate | Notes |
|-------|--------|-------------|-------|
| California | Net Billing Tariff (NBT) | ~$0.08/kWh (ACC rates) | 75% reduction from NEM 2.0; CPUC 3-year review after April 2026 |
| NEM 2.0 grandfathered | Retail rate | ~$0.30-0.35/kWh | 20-year grandfathering from PTO date |
| Most other states | Net metering (various) | Near-retail to avoided cost | Ongoing reforms in many states |

---

## Summary: What Matters Most for a Solar CRM in 2026

1. **TPO is king for residential:** With the residential ITC gone, lease/PPA products that leverage the commercial 48E credit are the primary path for homeowner savings
2. **Safe harbor deadline July 3, 2026:** Commercial projects should begin construction ASAP
3. **Domestic content is mandatory for direct pay:** Track equipment compliance (`domestic_content_compliant`, `feoc_compliant`) in the CRM
4. **State programs are the new differentiator:** SREC/TREC, SMART, SGIP, ConnectedSolutions, and state tax credits vary enormously and drive deal economics
5. **VPP/DR revenue streams:** Battery storage incentives are a significant value-add for solar+storage proposals
6. **Low-income adders:** 10-20% bonus credits available with capacity-limited applications (act fast)
7. **Community solar expansion:** Growing market opportunity, especially with Colorado's 2026 modernization
8. **REAP for rural:** Up to 50% cost share for qualifying agricultural/rural business projects

---

*This report was compiled from public sources including DOE, EPA, USDA, IRS, SEIA, NREL, DSIRE, and state agency websites. Program details are subject to legislative and regulatory changes. Always verify current status before relying on any specific program for business decisions.*
