# Property Address Enrichment APIs - Comprehensive Research

**Date**: 2026-02-08
**Purpose**: Identify all APIs and data sources to enrich a US street address with property and solar-related data for SolarOS CRM.

---

## Table of Contents
1. [Google Solar API](#1-google-solar-api)
2. [NREL PVWatts / Solar Resource APIs](#2-nrel-pvwatts--solar-resource-apis)
3. [Census Bureau Geocoder](#3-census-bureau-geocoder)
4. [FEMA National Flood Hazard Layer](#4-fema-national-flood-hazard-layer)
5. [OpenEI Utility Rate Database](#5-openei-utility-rate-database)
6. [EIA Electric Retail Service Territories](#6-eia-electric-retail-service-territories)
7. [Geocodio](#7-geocodio)
8. [Smarty (SmartyStreets)](#8-smarty-smartystreets)
9. [ATTOM Data Solutions](#9-attom-data-solutions)
10. [CoreLogic](#10-corelogic)
11. [RentCast](#11-rentcast)
12. [Regrid](#12-regrid)
13. [LightBox](#13-lightbox)
14. [Zillow / Bridge Interactive](#14-zillow--bridge-interactive)
15. [Aurora Solar](#15-aurora-solar)
16. [Nearmap](#16-nearmap)
17. [Melissa Data](#17-melissa-data)
18. [Estated (now ATTOM)](#18-estated-now-attom)
19. [HomeSage.ai](#19-homesageai)
20. [Precisely](#20-precisely)
21. [Implementation Strategy](#implementation-strategy)

---

## 1. Google Solar API

**Provider**: Google Maps Platform
**Website**: https://developers.google.com/maps/documentation/solar
**Category**: Solar-Specific (Roof Analysis + Solar Potential)

### Data Provided
- Roof segment analysis (area, pitch/tilt, azimuth/orientation per segment)
- Solar panel configurations (optimal layout, count, positions)
- Annual sunshine hours per roof segment
- Shade analysis (monthly and annual irradiance)
- Carbon offset potential
- Financial analysis (cost savings estimates for various purchasing methods)
- Imagery quality indicator
- Imagery date and processing date
- Building center coordinates, bounding box
- Postal code, administrative area, statistical area
- Roof satellite imagery (via Data Layers endpoint)
- DSM (Digital Surface Model) data
- RGB imagery
- Annual/monthly flux maps
- Hourly shade data

### Pricing
- **Building Insights**: FREE up to 10,000 calls/month, then tiered pay-as-you-go (~$0.10-$0.75/call depending on volume)
- **Data Layers**: FREE up to 1,000 calls/month, then tiered pricing
- $200/month Google Maps credit was replaced with free usage thresholds as of March 2025

### Authentication
- Google Cloud API key or OAuth 2.0 token
- Must enable Solar API in Google Cloud Console
- Must enable billing on Google Cloud project

### Rate Limits
- 600 queries per minute (both endpoints)
- Daily quota configurable in Cloud Console

### Coverage
- National US coverage (99% of US buildings per Google)
- Expanding internationally (40+ countries as of 2025)
- Some rural/remote areas may have lower imagery quality

### Data Freshness
- Imagery updated periodically (not real-time); most imagery is 1-3 years old
- Building insights derived from aerial/satellite imagery

### Sample API Call
```bash
curl "https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=37.4450&location.longitude=-122.1390&key=YOUR_API_KEY"
```

### Integration Complexity: **Easy**
- RESTful JSON API
- Well-documented with code samples
- Python, Node.js, Java client libraries available

### RECOMMENDATION: **MUST USE - Priority 1**
This is the single most valuable API for a solar CRM. Free tier of 10,000 building insights/month is extremely generous for a startup. Provides roof analysis, shade data, and solar potential in one call. We already have Google Maps set up.

---

## 2. NREL PVWatts / Solar Resource APIs

**Provider**: National Renewable Energy Laboratory (NREL)
**Website**: https://developer.nrel.gov/docs/solar/
**Category**: Solar Resource Data (FREE)

### Data Provided
- **PVWatts V8**: Estimated annual/monthly solar energy production (kWh) for a PV system at any location
- **Solar Resource API**: GHI, DNI, DHI, tilt irradiance by month
- **Solar Dataset Query**: Access to TMY (Typical Meteorological Year) data
- Bifacial module modeling
- Custom system parameters (tilt, azimuth, losses, module type, array type)

### Pricing
- **100% FREE** with NREL API key
- No per-request costs

### Authentication
- NREL Developer API key (free registration at developer.nrel.gov)

### Rate Limits
- 1,000 requests/hour per API key
- Can request higher limits

### Coverage
- All 50 US states + territories
- Uses 2020 TMY data from NSRDB

### Data Freshness
- TMY data based on 2020 weather data
- Updated periodically with new NSRDB releases

### Sample API Call
```bash
curl "https://developer.nrel.gov/api/pvwatts/v8.json?api_key=YOUR_KEY&lat=33.749&lon=-84.388&system_capacity=4&azimuth=180&tilt=20&array_type=1&module_type=1&losses=14"
```

### Integration Complexity: **Easy**
- Simple REST API with JSON responses
- Already integrated via NREL MCP server

### RECOMMENDATION: **MUST USE - Priority 1**
Already integrated. Free. Essential for production estimates. Complements Google Solar API.

---

## 3. Census Bureau Geocoder

**Provider**: US Census Bureau
**Website**: https://geocoding.geo.census.gov/geocoder/
**Category**: Geocoding + Census Geography (FREE)

### Data Provided
- **Geocoding**: Lat/lng coordinates from street address
- **Census Tract number** (critical for energy community lookup)
- Census Block, Block Group
- County FIPS code
- State FIPS code
- Congressional District
- State Legislative Districts (upper and lower)
- Census Designated Places
- County Subdivisions
- Incorporated Places
- Combined Statistical Areas
- Urban Areas / Urbanized Areas
- Metropolitan/Micropolitan Statistical Areas

### Pricing
- **100% FREE** - no API key required
- No usage limits published (but be reasonable)

### Authentication
- None required

### Rate Limits
- Not officially documented; batch mode supports up to 10,000 addresses per upload
- Reasonable use expected

### Coverage
- All US states, Puerto Rico, US Island Areas

### Data Freshness
- Based on decennial census and American Community Survey updates
- Geographic boundaries updated annually

### Sample API Call
```bash
# Single address geocode with geographies
curl "https://geocoding.geo.census.gov/geocoder/geographies/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC&zip=20500&benchmark=Public_AR_Current&vintage=Current_Current&format=json"

# Coordinates to census tract
curl "https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=-77.0365&y=38.8977&benchmark=Public_AR_Current&vintage=Current_Current&format=json"
```

### Integration Complexity: **Easy**
- Simple REST API, JSON response
- No authentication needed
- Well-documented

### RECOMMENDATION: **MUST USE - Priority 1**
Free and essential. Census tract number is CRITICAL for energy community tax credit eligibility lookup. This is a non-negotiable integration.

---

## 4. FEMA National Flood Hazard Layer

**Provider**: Federal Emergency Management Agency (FEMA)
**Website**: https://www.fema.gov/flood-maps/national-flood-hazard-layer
**Category**: Flood Risk (FREE)

### Data Provided
- Flood zone designation (A, AE, AH, AO, V, VE, X, etc.)
- Base Flood Elevation (BFE)
- FIRM panel information
- Flood insurance rate map data
- Community information
- LOMR (Letter of Map Revision) data

### Pricing
- **FREE** via FEMA NFHL GIS web services (REST/WMS/WFS)
- OpenFEMA API is also free, no key required
- Third-party services (National Flood Data, LightBox) are paid

### Authentication
- FEMA direct services: None required
- OpenFEMA API: No subscription or API key needed

### Rate Limits
- Not officially documented for GIS services
- OpenFEMA has reasonable use guidelines

### Coverage
- National coverage where FIRM maps exist (~98% of US)
- Some areas may have outdated or preliminary maps

### Data Freshness
- Maps updated as LOMRs are issued
- Some panels may be decades old; ongoing modernization

### Sample API Call
```
# FEMA NFHL REST Service (ArcGIS MapServer)
https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?where=1%3D1&geometry=-84.388,33.749&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=*&f=json

# OpenFEMA API (general disaster data)
https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=state%20eq%20'TX'
```

### Integration Complexity: **Medium**
- GIS-based (ArcGIS REST services) - need spatial query knowledge
- Requires coordinate-based lookups (geocode first)
- Response format is GIS-specific

### RECOMMENDATION: **SHOULD USE - Priority 2**
Free and useful for risk assessment. Flood zone info adds value for property evaluation and insurance considerations. Medium complexity due to GIS query format.

---

## 5. OpenEI Utility Rate Database

**Provider**: NREL / Department of Energy
**Website**: https://openei.org/wiki/Utility_Rate_Database
**Category**: Utility Rates (FREE)

### Data Provided
- Utility company name and ID for a given location
- Residential, commercial, industrial electricity rates ($/kWh)
- Detailed rate structures (TOU, tiered, demand charges)
- Rate schedule names and descriptions
- Utility contact information
- Approved/pending rate changes

### Pricing
- **100% FREE**
- No API key required for OpenEI web services
- NREL developer key works but is optional

### Authentication
- None required (OpenEI web services)
- Optional NREL API key for developer.nrel.gov endpoints

### Rate Limits
- Not strictly documented; reasonable use expected

### Coverage
- 3,700+ US utilities
- National coverage

### Data Freshness
- Community-maintained database
- Updated as utilities file new rate structures
- Latest zip-code dataset: 2023

### Sample API Call
```bash
# Get utility rates by zip code
curl "https://api.openei.org/utility_rates?version=8&format=json&api_key=DEMO_KEY&address=78205"

# Get utility rates by lat/lng
curl "https://developer.nrel.gov/api/utility_rates/v3.json?api_key=YOUR_KEY&lat=33.749&lon=-84.388"
```

### Integration Complexity: **Easy**
- Simple REST API
- JSON response
- Already leveraged for utility data collection

### RECOMMENDATION: **MUST USE - Priority 1**
Free, national coverage, and essential for solar savings calculations. Already being used.

---

## 6. EIA Electric Retail Service Territories

**Provider**: US Energy Information Administration
**Website**: https://atlas.eia.gov/datasets/f4cd55044b924fed9bc8b64022966097
**Category**: Utility Territory Maps (FREE)

### Data Provided
- Electric utility service territory boundaries (GIS polygons)
- Utility name and ID
- Utility type (IOU, cooperative, municipal)
- State
- Average consumption data by utility (at utility level, not address level)

### Pricing
- **100% FREE** via EIA open data / ArcGIS services

### Authentication
- EIA API key (free) for data API
- ArcGIS services: none required

### Rate Limits
- Not strictly documented

### Coverage
- National US coverage

### Data Freshness
- Updated annually with EIA-861 data

### Sample API Call
```bash
# EIA API v2
curl "https://api.eia.gov/v2/electricity/retail-sales/data/?api_key=YOUR_KEY&frequency=annual&data[0]=revenue&data[1]=sales&data[2]=customers&facets[stateid][]=TX"
```

### Integration Complexity: **Medium**
- GIS data requires spatial queries for territory lookup
- EIA API is straightforward for aggregate data
- Does NOT provide per-address consumption data

### RECOMMENDATION: **SHOULD USE - Priority 2**
Good supplementary data for utility identification. OpenEI is easier for utility lookups; EIA adds territory boundaries and aggregate stats.

---

## 7. Geocodio

**Provider**: Dotsquare LLC
**Website**: https://www.geocod.io/
**Category**: Geocoding + Data Enrichment

### Data Provided
- Address validation and standardization
- Lat/lng geocoding
- **Census tract, block, block group** (as append field)
- Congressional districts
- State legislative districts
- School districts
- Timezone
- ACS (American Community Survey) demographics
- Residential/commercial indicator (via USPS data)

### Pricing
- **FREE**: 2,500 lookups/day (no credit card required)
- **Pay-as-you-go**: $1.00/1,000 lookups (as of Feb 2026)
- No monthly subscription required
- Batch geocoding included

### Authentication
- API key (free registration)

### Rate Limits
- Free tier: 2,500/day
- Paid: based on plan

### Coverage
- US and Canadian addresses

### Data Freshness
- Continuously updated from multiple sources
- Census data follows ACS release schedule

### Sample API Call
```bash
curl "https://api.geocod.io/v1.7/geocode?q=1109+N+Highland+St+Arlington+VA&fields=census2020,cd,stateleg&api_key=YOUR_KEY"
```

### Integration Complexity: **Easy**
- Excellent documentation
- REST API with JSON
- Data append fields are simple parameters

### RECOMMENDATION: **STRONG RECOMMEND - Priority 1**
Better than Census Bureau geocoder for our needs. Combines geocoding + census tract + demographics in ONE call. Free tier of 2,500/day is sufficient for startup. $1/1000 is very cheap when scaling. Best bang-for-buck geocoding service.

---

## 8. Smarty (SmartyStreets)

**Provider**: Smarty
**Website**: https://www.smarty.com/
**Category**: Address Validation

### Data Provided
- Address validation and standardization (CASS-certified)
- USPS deliverability status
- Residential vs commercial delivery indicator (RBDI)
- Vacancy indicator
- Lat/lng geocoding (ZIP+4 level)
- County name and FIPS
- Congressional district
- Time zone
- Carrier route, delivery point barcode

### Pricing
- **FREE**: 250 lookups/month
- Paid plans scale from there
- Reverse geocoding starts at $54/month for 25,000 lookups

### Authentication
- Auth ID + Auth Token

### Rate Limits
- Based on plan tier

### Coverage
- US addresses (international available separately)

### Data Freshness
- Updated monthly with USPS data

### Sample API Call
```bash
curl "https://us-street.api.smarty.com/street-address?auth-id=YOUR_ID&auth-token=YOUR_TOKEN&street=1600+Pennsylvania+Ave&city=Washington&state=DC&zipcode=20500"
```

### Integration Complexity: **Easy**
- Well-documented REST API
- Multiple SDKs available

### RECOMMENDATION: **OPTIONAL - Priority 3**
Geocodio provides similar data at better pricing. Smarty's only advantage is CASS certification, which matters for mailing but not for solar CRM.

---

## 9. ATTOM Data Solutions

**Provider**: ATTOM (acquired Estated)
**Website**: https://www.attomdata.com/solutions/property-data-api/
**Documentation**: https://api.developer.attomdata.com/docs
**Category**: Comprehensive Property Data (Enterprise)

### Data Provided
- **Ownership**: Owner name, owner-occupied status, mailing address, ownership type
- **Property Details**: Year built, square footage, lot size, bedrooms, bathrooms, stories, building type, construction materials, heating/cooling type, roof type, pool
- **Valuation**: AVM (Automated Valuation Model), tax assessed value, market value
- **Tax Data**: Annual tax amount, tax year, tax delinquency
- **Deed/Sales History**: Sale date, price, mortgage amount, lender, deed type (up to 40 years)
- **Building Permits**: Permit type, date, description, status, value
- **HOA Data**: HOA name, fees, management company
- **Hazard Risk**: Flood zone, earthquake, wildfire, hail, wind, tornado risk scores
- **Foreclosure/Distressed**: Pre-foreclosure, auction, REO status
- **Schools**: Nearby school ratings and districts
- **Census**: Tract, block group, demographics

### Pricing
- **Enterprise pricing**: Custom quotes, typically starting ~$500/month
- Billed per "API Report" produced (not per call)
- Volume discounts available
- Navigator tool: $79/month (limited, web-only)

### Authentication
- API key (apikey header)

### Rate Limits
- Based on contract

### Coverage
- **155M+ US properties**
- National coverage across 3,200 counties

### Data Freshness
- Updated monthly/quarterly depending on data type
- Tax data updated annually
- Sales data near real-time

### Sample API Call
```bash
curl -H "apikey: YOUR_KEY" "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address1=1600+Pennsylvania+Ave&address2=Washington+DC+20500"
```

### Integration Complexity: **Medium**
- REST API with JSON
- Multiple endpoints for different data categories
- Good documentation and Postman collection

### RECOMMENDATION: **FUTURE USE - Priority 3**
Most comprehensive property data available but expensive for a startup. Implement after product-market fit when per-lead economics justify the cost. Consider for premium features.

---

## 10. CoreLogic

**Provider**: CoreLogic
**Website**: https://www.corelogic.com/360-property-data/api-data/
**Category**: Enterprise Property Data

### Data Provided
- Property characteristics (similar to ATTOM)
- Automated Valuation Models (AVM)
- Ownership records and history
- Mortgage and lien data
- MLS listing data (via Trestle platform)
- Insurance replacement cost estimates
- Natural hazard risk data
- Construction cost data

### Pricing
- **Enterprise-only**: No public pricing
- Individual API calls range $0.005 - $11.50 depending on endpoint
- Annual commitment typically required
- Estimated starting at $1,000+/month

### Authentication
- OAuth 2.0

### Rate Limits
- Contract-based

### Coverage
- National US (~150M+ properties)

### Data Freshness
- Varies by product; generally monthly updates

### Integration Complexity: **Medium-Hard**
- OAuth flow more complex
- Multiple product lines with different APIs

### RECOMMENDATION: **NOT RECOMMENDED for now - Priority 4**
Too expensive and complex for our stage. ATTOM or RentCast provide similar data at lower cost/complexity.

---

## 11. RentCast

**Provider**: RentCast
**Website**: https://www.rentcast.io/api
**Documentation**: https://developers.rentcast.io/
**Category**: Property Data (Affordable)

### Data Provided
- **Property records**: Bedrooms, bathrooms, square footage, lot size, year built, stories
- **Property features**: Architecture type, parking, pool, cooling/heating, construction materials
- **Owner info**: Owner name, type, mailing address, owner-occupied status
- **HOA fees**
- **Sale history**: Last sold date/price, transaction history
- **Valuations**: Home value estimates, price per sq ft
- **Rent estimates**: Fair market rent by bedroom count
- **Market data**: Price/rent statistics, days on market, listings count
- **Comparables**: Similar properties nearby

### Pricing
- **FREE**: 50 API calls/month
- Paid plans scale with volume (no published per-call rate, but affordable)
- No long-term contracts
- Month-to-month billing

### Authentication
- API key (X-Api-Key header)

### Rate Limits
- Based on plan tier

### Coverage
- **140M+ US property records**
- National coverage

### Data Freshness
- Updated regularly from county assessor records
- Market data updated frequently

### Sample API Call
```bash
curl -H "X-Api-Key: YOUR_KEY" "https://api.rentcast.io/v1/properties?address=1600+Pennsylvania+Ave+NW&city=Washington&state=DC&zipCode=20500"
```

### Integration Complexity: **Easy**
- Clean REST API
- Good documentation
- Simple API key auth

### RECOMMENDATION: **STRONG RECOMMEND - Priority 2**
Best price-to-value ratio for property data. 140M records, owner info, HOA, sale history, valuations -- all for much less than ATTOM/CoreLogic. Free tier lets us prototype. Ideal for our stage.

---

## 12. Regrid

**Provider**: Regrid (formerly Loveland Technologies)
**Website**: https://regrid.com/api
**Category**: Parcel Data + Boundaries

### Data Provided
- **Parcel boundaries** (polygons)
- Parcel number (APN)
- Owner name and mailing address
- Tax assessed value
- Land use / zoning code
- Lot size (acreage/sq ft)
- Year built
- Building square footage
- Address standardization
- County and state FIPS

### Pricing
- **Typeahead API**: $0.001/request
- **Self-serve API plans**: Available at app.regrid.com/api/plans (specific tiers not publicly listed)
- **Enterprise/Nationwide license**: Starting at $80K/year
- Custom quotes available

### Authentication
- API token

### Rate Limits
- Plan-dependent

### Coverage
- **155M+ US parcels** across all counties
- Canadian coverage expanding

### Data Freshness
- Rolling monthly updates

### Sample API Call
```bash
curl -H "Token: YOUR_TOKEN" "https://app.regrid.com/api/v2/parcels/address?query=1600+Pennsylvania+Ave+NW+Washington+DC"
```

### Integration Complexity: **Medium**
- REST API with GeoJSON responses
- Parcel boundary data can be complex to work with
- Good documentation

### RECOMMENDATION: **FUTURE USE - Priority 3**
Parcel boundaries and zoning data are valuable for advanced features (setback analysis, lot visualization). Too expensive at enterprise tier; explore self-serve plans. Lower priority than property characteristics.

---

## 13. LightBox

**Provider**: LightBox (formerly Digital Map Products)
**Website**: https://www.lightboxre.com/data/lightbox-apis/
**Category**: Enterprise Property + Zoning

### Data Provided
- **Parcel data**: 155M+ records, boundaries, ownership, tax attributes
- **Zoning data**: Zoning districts, setback requirements, FAR, building height limits
- **Building structures**: Building footprints, structure attributes
- **Geocoding**: Address matching and standardization
- **Flood data**: NFHL flood zone via LightBox API wrapper
- **Land use**: Current and historical

### Pricing
- **Enterprise-only**: Custom quotes
- Available via bulk data, API, or LightBox Vision platform
- Estimated $1,000+/month minimum

### Authentication
- API key / OAuth

### Coverage
- National US coverage
- Zoning: Top 50 MSAs at parcel level

### Integration Complexity: **Medium-Hard**

### RECOMMENDATION: **NOT RECOMMENDED for now - Priority 4**
Enterprise pricing. Zoning data limited to top 50 MSAs. Regrid or county assessor data are better alternatives for our stage.

---

## 14. Zillow / Bridge Interactive

**Provider**: Zillow Group
**Website**: https://www.bridgeinteractive.com/
**Category**: Real Estate Listings + Property Data

### Data Provided
- Property records (148M properties across 3,200 counties)
- Tax assessments
- Transaction records
- Zestimates (Zillow's AVM)
- Public records data
- MLS listing data (requires MLS authorization)
- Property photos

### Pricing
- **Not publicly available**
- Requires MLS authorization for listing data
- Bridge API requires approval process

### Authentication
- Bridge API credentials (requires application and MLS approval)

### Coverage
- 148M+ US properties
- MLS data varies by market

### Integration Complexity: **Hard**
- Requires MLS relationships
- Approval process is lengthy
- Data use restrictions

### RECOMMENDATION: **NOT RECOMMENDED - Priority 5**
Too complex to access. MLS approval process is designed for brokerages, not SaaS companies. RentCast or ATTOM provide similar property data without the gatekeeping.

---

## 15. Aurora Solar

**Provider**: Aurora Solar
**Website**: https://docs.aurorasolar.com/
**Category**: Solar Design + Roof Analysis (Premium)

### Data Provided
- AI-powered roof measurement and segmentation
- 3D roof modeling
- Shade analysis (with LIDAR data)
- Solar panel placement optimization
- Performance simulation (energy production)
- Fire pathway placement
- Irradiance analysis
- Bill savings calculation
- Proposal generation

### Pricing
- **Subscription-based**: Aurora is a full solar design platform
- AI Roof consumes credits per project
- API access typically included with Aurora subscription
- Estimated $200-500+/month depending on plan
- Per-project credits for AI features

### Authentication
- Aurora API key (requires Aurora account)

### Coverage
- National US + expanding internationally

### Integration Complexity: **Medium**
- Well-documented REST API
- Webhook support for async operations
- Requires Aurora subscription

### RECOMMENDATION: **FUTURE USE - Priority 3**
Full-featured solar design platform with great API. But it's a competitor/complement to our own design tools. Consider integrating if we want to offer Aurora-quality designs. Google Solar API covers basic needs for free.

---

## 16. Nearmap

**Provider**: Nearmap
**Website**: https://www.nearmap.com/solutions/solar
**Category**: Aerial Imagery + Roof Measurement

### Data Provided
- High-resolution aerial imagery (5.5cm GSD)
- AI-powered roof measurements (area, pitch, material, condition)
- 3D roof models
- Tree coverage analysis
- Building footprints
- Change detection (before/after imagery)
- Solar panel detection (existing installations)
- Roof obstruction identification

### Pricing
- **Enterprise subscription**: Custom quotes
- Estimated $5,000+/year for API access
- Per-property pricing for transactional use possible

### Authentication
- API key with subscription

### Coverage
- ~90% of US urban population
- Updated 2-3x per year in covered areas

### Data Freshness
- Updated multiple times per year in major metros
- Some areas less frequently

### Integration Complexity: **Medium**
- Multiple APIs (WMS, Tile, AI Feature, Coverage)
- Good documentation

### RECOMMENDATION: **FUTURE USE - Priority 3**
Premium imagery and AI roof analysis. Valuable for detecting existing solar installations and roof condition. Too expensive for startup phase. Google Solar API covers basic roof analysis for free.

---

## 17. Melissa Data

**Provider**: Melissa (Data Quality Solutions)
**Website**: https://www.melissa.com/
**Category**: Address Validation + Enrichment

### Data Provided
- CASS-certified address validation
- Address standardization (USPS format)
- Residential vs commercial delivery indicator (RBDI)
- Apartment/suite append
- Lat/lng geocoding
- Move tracking (NCOA)
- Phone/email append
- Demographic data

### Pricing
- **Varies by product**: $0.03/checkout (Shopify); enterprise from free trial to $12,600
- Per-transaction pricing for API use
- Volume discounts available

### Authentication
- License key

### Coverage
- 240+ countries (we only need US)

### Integration Complexity: **Easy**
- REST API with multiple SDKs

### RECOMMENDATION: **NOT NEEDED - Priority 4**
Geocodio or Smarty cover address validation at lower cost. Melissa adds value for phone/email enrichment but that's not our primary need.

---

## 18. Estated (now ATTOM)

**Provider**: Estated (acquired by ATTOM Data Solutions)
**Website**: https://estated.com/ (redirects to ATTOM)
**Category**: Property Data

### Data Provided
- ~150 property data points per record
- Market assessment / valuation
- Owner details
- Up to 40 years of sale/mortgage history
- Parcel boundary coordinates
- Building characteristics

### Pricing
- Previously started at ~$179/month
- Now merged into ATTOM's pricing structure

### RECOMMENDATION: **MERGED INTO ATTOM - See #9**
Estated was acquired by ATTOM. Use ATTOM API for this data.

---

## 19. HomeSage.ai

**Provider**: HomeSage.ai
**Website**: https://homesage.ai/
**Category**: AI Property Analysis (Affordable Alternative)

### Data Provided
- Property details and characteristics
- AI-driven investment analysis
- Renovation cost estimates
- Flip ROI predictions
- Price flexibility scoring
- Market insights
- Comparable property analysis

### Pricing
- **Starting at $100/month** (significantly cheaper than ATTOM at ~$500+)
- Developer-friendly pricing
- No long-term contracts

### Authentication
- API key

### Coverage
- US properties

### Integration Complexity: **Easy**

### RECOMMENDATION: **WORTH EVALUATING - Priority 3**
Affordable alternative to ATTOM for property valuation and analysis. AI-driven insights could add value. Worth a trial for investment analysis features.

---

## 20. Precisely

**Provider**: Precisely (formerly Pitney Bowes Software & Data)
**Website**: https://developer.precisely.com/
**Category**: Enterprise Property + Location Data

### Data Provided
- Property attributes and boundaries
- Geocoding and address verification
- Insurance risk data
- Demographics
- Points of interest

### Pricing
- **Enterprise-only**: Custom quotes
- AWS Marketplace listings available

### RECOMMENDATION: **NOT RECOMMENDED - Priority 5**
Enterprise-only, expensive, and other providers cover the same data at lower cost.

---

## Implementation Strategy

### Phase 1: FREE APIs (Implement Now)

These APIs are free and provide critical data. Implementation should start immediately.

| API | Data | Cost | Priority |
|-----|------|------|----------|
| **Google Solar API** | Roof analysis, solar potential, shade | FREE (10K/mo) | P1 |
| **NREL PVWatts** | Energy production estimates | FREE | P1 |
| **Census Bureau Geocoder** | Census tract (energy community) | FREE | P1 |
| **OpenEI Utility Rates** | Utility name, rates | FREE | P1 |
| **FEMA NFHL** | Flood zone | FREE | P2 |
| **EIA Service Territories** | Utility identification | FREE | P2 |
| **Geocodio** | Geocoding + census + demographics | FREE (2,500/day) | P1 |

**Total Cost: $0/month** for up to ~10,000 property lookups/month

### Phase 2: Affordable Paid APIs (Implement at Scale)

These are affordable and add significant value once we have paying customers.

| API | Data | Cost | Priority |
|-----|------|------|----------|
| **RentCast** | Property details, owner, HOA, value | $TBD (50 free/mo) | P2 |
| **Geocodio (paid)** | Higher volume geocoding | $1/1,000 lookups | P2 |
| **Smarty** | CASS-certified validation | $TBD | P3 |

**Estimated Cost: $50-200/month** at moderate volume

### Phase 3: Enterprise APIs (Implement at Product-Market Fit)

These are expensive but provide the deepest data. Wait until revenue justifies the cost.

| API | Data | Cost | Priority |
|-----|------|------|----------|
| **ATTOM** | Comprehensive property data | ~$500+/mo | P3 |
| **Aurora Solar** | Professional solar design | ~$200-500/mo | P3 |
| **Nearmap** | Premium aerial imagery, existing solar detection | ~$5,000+/yr | P3 |
| **Regrid** | Parcel boundaries, zoning | Custom | P3 |

### Data Coverage Matrix

| Data Point | Phase 1 (Free) | Phase 2 (Affordable) | Phase 3 (Enterprise) |
|------------|----------------|---------------------|---------------------|
| Address validation | Geocodio | Smarty (CASS) | Melissa |
| Lat/lng coordinates | Census/Geocodio | Geocodio | - |
| Census tract | Census/Geocodio | Geocodio | ATTOM |
| Roof area/pitch/orientation | Google Solar | Google Solar | Aurora/Nearmap |
| Solar potential (kWh) | Google Solar + NREL | Google Solar + NREL | Aurora |
| Shade analysis | Google Solar | Google Solar | Aurora/Nearmap |
| Roof satellite imagery | Google Solar (Data Layers) | Google Solar | Nearmap |
| Home ownership/owner name | - | RentCast | ATTOM |
| Property value | - | RentCast | ATTOM/CoreLogic |
| Year built/sq ft/beds/baths | - | RentCast | ATTOM |
| HOA membership | - | RentCast | ATTOM |
| Utility company | OpenEI | OpenEI | EIA |
| Electricity rate | OpenEI | OpenEI | - |
| Est. electricity consumption | NREL (estimate) | - | ATTOM |
| Existing solar (yes/no) | Google Solar (partial) | - | Nearmap |
| Flood zone | FEMA NFHL | FEMA NFHL | LightBox |
| Lot size | - | RentCast | Regrid |
| Tree coverage/shading | Google Solar (shade data) | - | Nearmap |
| Building permits | - | - | ATTOM |
| Zoning | - | - | LightBox/Regrid |
| Historic district | - | - | County data |
| Parcel boundaries | - | - | Regrid |

### Recommended API Call Sequence

When a user enters an address, make these calls in order:

```
1. Geocodio (geocode + census tract + demographics)     -- FREE
2. Google Solar API Building Insights (roof + solar)     -- FREE
3. OpenEI Utility Rates (utility + rates)                -- FREE
4. NREL PVWatts (production estimate)                    -- FREE
5. FEMA NFHL (flood zone)                               -- FREE
6. [Phase 2] RentCast (property details + owner)         -- PAID
7. [Phase 2] Google Solar Data Layers (imagery)          -- FREE (1K/mo)
```

This sequence provides a comprehensive property profile for $0/call in Phase 1.

---

## Key Takeaways

1. **We can launch with $0/month in API costs** using Google Solar API, NREL, Census, OpenEI, FEMA, and Geocodio free tiers
2. **Google Solar API is the crown jewel** -- 10K free building insights/month with roof analysis, solar potential, and shade data
3. **Geocodio is the best geocoding choice** -- combines geocoding + census tract + demographics in one call, 2,500 free/day
4. **RentCast is the best affordable property data provider** -- 140M records at a fraction of ATTOM/CoreLogic cost
5. **ATTOM/CoreLogic/Nearmap are enterprise-tier** -- defer until revenue justifies $500+/month spend
6. **Census tract from Geocodio/Census API enables energy community tax credit lookup** -- critical for 2026 solar economics
