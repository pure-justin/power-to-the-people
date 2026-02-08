# SolarOS Master Build Plan

> **Vision**: Fully automated solar installation pipeline — Survey → CAD → Permit → Schedule → Install → Fund
> **Core Pattern**: AI tries first → asks human when stuck → learns from human action
> **Human Flywheel**: Every human action inside the platform = training data for future automation

---

## Phase 0: AI Task Engine (Foundation — Build First)
**Why first**: Every other system uses this pattern. Build it once, use it everywhere.

### 0A. `aiTaskEngine` — Cloud Function + Firestore
- **Collection**: `ai_tasks`
- **Schema**:
  ```
  {
    id: string,
    type: "permit_submit" | "permit_check" | "cad_generate" | "photo_analyze" | "funding_submit" | "schedule_match" | "survey_process",
    projectId: string,
    status: "pending" | "ai_processing" | "ai_completed" | "ai_failed" | "human_needed" | "human_processing" | "human_completed" | "learning",
    aiAttempt: { startedAt, completedAt, result, confidence, error },
    humanFallback: { assignedTo, assignedAt, completedAt, action, notes },
    learningData: { aiInput, humanOutput, delta, trainable: boolean },
    retryCount: number,
    maxRetries: number,
    priority: 1-5,
    createdAt, updatedAt
  }
  ```
- **Functions**:
  - `createAiTask(type, projectId, input)` — Create task, AI attempts immediately
  - `processAiTask(taskId)` — AI execution engine (dispatches to type-specific handler)
  - `escalateToHuman(taskId, reason)` — Route to human queue with context
  - `completeHumanTask(taskId, result)` — Human completes, capture learning data
  - `getTaskQueue(filters)` — Query tasks by status/type/priority
  - `retryAiTask(taskId)` — Re-attempt with updated knowledge

### 0B. `humanQueue` — Human Task Dashboard
- **Frontend page**: `/dashboard/tasks` (installer), `/admin/tasks` (admin)
- **Features**:
  - Shows tasks AI couldn't handle, sorted by priority
  - Each task shows: what AI tried, why it failed, what's needed
  - Human completes task inside the platform (actions captured)
  - "Teach AI" button — mark solution as reusable pattern
  - Real-time notifications when new tasks arrive

### 0C. `learningService` — Capture & Apply Human Knowledge
- **Collection**: `ai_learnings`
- **Schema**:
  ```
  {
    id: string,
    taskType: string,
    context: { jurisdiction?, equipmentType?, projectType? },
    humanAction: string,        // What the human did
    humanInput: object,         // The actual data/decisions
    confidence: number,         // Starts at 0.5, increases with repeated patterns
    usageCount: number,         // How many times AI used this learning
    successCount: number,       // How many times it worked
    createdBy: string,
    createdAt, lastUsedAt
  }
  ```
- **Functions**:
  - `recordLearning(taskType, context, humanAction, input)` — Save pattern
  - `findRelevantLearnings(taskType, context)` — Query matching patterns
  - `updateLearningOutcome(learningId, success)` — Feedback loop
  - Before AI attempts any task, it queries learnings for matching patterns

---

## Phase 1: AHJ Database & Permit Knowledge Base
**Why second**: Permits are the #1 bottleneck. Build the knowledge base first.

### 1A. `ahjDatabase` — Authority Having Jurisdiction Registry
- **Collection**: `ahj_registry`
- **Schema**:
  ```
  {
    id: string,
    name: string,                    // "City of Austin Building Department"
    jurisdiction_type: "city" | "county" | "state",
    state: string,
    county: string,
    city: string,
    zip_codes: string[],             // All ZIP codes this AHJ covers
    contact: { phone, email, website, address },
    portal: {
      url: string,                   // Online submission portal
      type: "web_form" | "email" | "in_person" | "proprietary_software",
      automatable: boolean,          // Can we bot this?
      automation_script: string,     // Reference to Python script if automatable
      automation_confidence: number  // 0-1, how reliable is the bot
    },
    requirements: {
      structural_engineering: boolean,
      electrical_diagrams: boolean,
      site_plan: boolean,
      single_line_diagram: boolean,
      load_calculations: boolean,
      equipment_specs: boolean,
      hoa_approval: boolean,
      utility_approval: boolean,
      fire_department_review: boolean,
      custom_requirements: string[]
    },
    fees: {
      residential_solar_permit: number,
      commercial_solar_permit: number,
      electrical_permit: number,
      fee_calculation_method: string  // "flat" | "per_kw" | "valuation_based"
    },
    turnaround: {
      typical_days: number,
      expedited_available: boolean,
      expedited_fee: number,
      expedited_days: number
    },
    notes: string,
    last_verified: timestamp,
    verified_by: string,             // "ai" | userId
    data_source: string              // Where this data came from
  }
  ```
- **Data Population Strategy**:
  1. Seed from SolarAPP+ participating jurisdictions (free API)
  2. Scrape state/county building department websites (Apify actors)
  3. Cross-reference with NREL/OpenEI data
  4. Human verification fills gaps (learning system captures corrections)

### 1B. `permitSOP` — Standard Operating Procedures per AHJ
- **Collection**: `permit_sops`
- **Schema**:
  ```
  {
    id: string,
    ahjId: string,
    step_number: number,
    action: string,                  // "Navigate to portal" | "Fill form field" | "Upload document"
    details: string,                 // Human-readable instructions
    automation: {
      script_type: "puppeteer" | "api" | "email" | "manual",
      script_path: string,          // Path to automation script
      selector: string,             // CSS selector if web form
      field_mapping: object,        // Maps our data fields to their form fields
      wait_conditions: string[]     // What to wait for before next step
    },
    screenshots: string[],          // Reference screenshots for this step
    common_errors: [{ error, resolution }],
    last_successful_run: timestamp,
    success_rate: number
  }
  ```

### 1C. Permit Bot Framework
- **Python scripts** in `scripts/permit-bots/`
- **Base class**: `PermitBot` with common methods:
  - `login(portal_url, credentials)`
  - `fill_form(field_mapping, project_data)`
  - `upload_documents(documents[])`
  - `submit_and_capture_confirmation()`
  - `check_status(permit_number)`
  - `handle_error(error, escalate_to_human)`
- **Per-AHJ scripts** extend base class with jurisdiction-specific logic
- **SolarAPP+ integration** for participating jurisdictions (instant permits)

---

## Phase 2: Site Survey System
**Why third**: This is the entry point. Everything downstream depends on good survey data.

### 2A. `surveyService` — Survey Data Collection
- **Collection**: `site_surveys`
- **Schema**:
  ```
  {
    id: string,
    projectId: string,
    customerId: string,
    status: "draft" | "in_progress" | "submitted" | "ai_review" | "approved" | "revision_needed",
    property: {
      address: string,
      lat: number, lng: number,
      roof_type: "composite_shingle" | "tile" | "metal" | "flat" | "other",
      roof_age_years: number,
      roof_condition: "excellent" | "good" | "fair" | "poor",
      stories: number,
      square_footage: number,
      year_built: number
    },
    roof_measurements: {
      total_area_sqft: number,
      usable_area_sqft: number,     // After setbacks, obstructions
      pitch: number,                // Degrees
      azimuth: number,              // Compass direction
      planes: [{                    // Multiple roof planes
        id, area, pitch, azimuth, shading_factor
      }]
    },
    electrical: {
      panel_type: string,
      panel_amps: number,           // 100A, 200A, 400A
      main_breaker_amps: number,
      available_spaces: number,
      bus_bar_rating: number,
      panel_location: string,
      meter_type: string,           // "analog" | "digital" | "smart"
      service_voltage: number       // 120/240V typical
    },
    shading: {
      obstructions: [{              // Trees, chimneys, neighboring buildings
        type, direction, distance_ft, height_ft, seasonal_impact
      }],
      tsrf: number,                 // Total Solar Resource Fraction (0-1)
      annual_shading_loss: number   // Percentage
    },
    photos: [{
      id: string,
      type: "roof_overview" | "electrical_panel" | "meter" | "obstruction" | "attic" | "mounting_area",
      url: string,
      ai_analysis: {
        status: "pending" | "analyzed" | "flagged",
        findings: string[],
        measurements: object,
        confidence: number
      },
      uploaded_at: timestamp
    }],
    utility: {
      provider: string,
      account_number: string,
      avg_monthly_kwh: number,
      annual_kwh: number,
      avg_monthly_bill: number,
      rate_schedule: string,
      net_metering_eligible: boolean
    },
    ai_review: {
      design_ready: boolean,
      issues: string[],
      recommendations: string[],
      confidence: number,
      reviewed_at: timestamp
    },
    created_at, updated_at, submitted_at
  }
  ```

### 2B. Survey Frontend — Mobile-First Components
- **Customer self-service**: `/portal/survey` — guided step-by-step
  - Step 1: Address verification + satellite view
  - Step 2: Roof details (type, age, condition) with photo upload
  - Step 3: Electrical panel photos + details
  - Step 4: Shading assessment (photo-guided)
  - Step 5: Utility bill upload or manual entry
  - Step 6: Review & submit
- **Installer survey tool**: `/dashboard/survey/:projectId` — professional version
  - All customer fields + professional measurements
  - Compass/inclinometer integration (device sensors)
  - Real-time photo AI feedback ("panel photo looks good" / "retake — can't read breaker labels")

### 2C. EagleView Integration — Automated Roof Data
- **Why**: $15-40/report vs $150-300 for human site visit. Automates survey + CAD.
- **EagleView Connect API** provides:
  - Precise roof measurements (pitch, azimuth, area per facet)
  - 3D roof model with obstruction mapping
  - TSRF shade analysis (bankable quality)
  - Roof condition assessment
  - Setback calculations
- **Collection**: `eagleview_reports`
- **Schema**:
  ```
  {
    id: string,
    projectId: string,
    surveyId: string,
    orderId: string,                 // EagleView order reference
    status: "ordered" | "processing" | "delivered" | "failed",
    reportType: "SunSite" | "PremiumSunSite" | "InForm",
    address: string,
    cost: number,
    data: {
      roof_facets: [{                // Per roof facet
        id, area_sqft, pitch_deg, azimuth_deg,
        usable_area_sqft, tsrf, annual_solar_access,
        shade_profile: { monthly: number[] }  // 12 months
      }],
      total_roof_area: number,
      total_usable_area: number,
      obstructions: [{ type, location, dimensions }],
      three_d_model_url: string,
      shade_report_url: string,      // Bankable shade report PDF
      measurement_report_url: string
    },
    ordered_at: timestamp,
    delivered_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp
  }
  ```
- **Integration flow**:
  1. Customer enters address → check if NREL/Google Solar API has data
  2. If solar API data insufficient (low confidence, missing facets) → auto-order EagleView
  3. EagleView delivers → auto-populate survey fields + feed into CAD engine
  4. For PPA bankability: always use EagleView for shade report (finance companies require it)
- **Cost optimization**: Only order EagleView when needed (solar API fallback didn't work OR PPA requires bankable report)

### 2D. Survey AI Review
- When survey submitted → creates AI task (type: "survey_process")
- AI checks:
  - Are all required photos present and clear?
  - Do measurements make sense? (roof area vs satellite imagery)
  - Is electrical panel adequate for solar? (NEC 120% rule)
  - Any red flags? (old roof, small panel, heavy shading)
- If confidence > 0.85 → auto-approve, trigger CAD generation
- If confidence < 0.85 → human review queue

---

## Phase 3: CAD Auto-Generation
**Why fourth**: Directly consumes survey data, produces permit documents.

### 3A. `cadService` — Design Generation Engine
- **Collection**: `cad_designs`
- **Schema**:
  ```
  {
    id: string,
    projectId: string,
    surveyId: string,
    status: "generating" | "ai_complete" | "human_review" | "approved" | "revision",
    system_design: {
      total_kw: number,
      panel_count: number,
      panel_model: string,          // From equipment database
      inverter_model: string,
      battery_model: string,        // Optional
      mounting_type: "roof" | "ground" | "carport",
      panel_layout: [{              // Per roof plane
        plane_id, rows, columns, tilt, orientation, x_offset, y_offset
      }],
      string_configuration: [{      // Electrical stringing
        string_id, panel_count, voltage, current
      }],
      estimated_annual_kwh: number,
      offset_percentage: number     // % of customer usage covered
    },
    documents: {
      site_plan_url: string,
      single_line_diagram_url: string,
      structural_plan_url: string,
      equipment_spec_sheets: string[],
      load_calculations_url: string
    },
    compliance: {
      nec_compliant: boolean,
      setback_compliant: boolean,
      fire_code_compliant: boolean,
      structural_adequate: boolean,
      issues: string[]
    },
    ai_generation: {
      started_at, completed_at,
      model_version: string,
      confidence: number
    },
    human_review: {
      reviewer_id: string,
      reviewed_at: timestamp,
      changes_made: string[],
      approved: boolean
    },
    created_at, updated_at
  }
  ```

### 3B. Design Algorithm
- **Input**: Survey data + equipment database + AHJ requirements
- **Process**:
  1. Calculate optimal system size from usage data + roof area
  2. Select equipment (panels, inverter) based on compliance + performance
  3. Layout panels on roof planes (maximize production, respect setbacks)
  4. Calculate string configuration (voltage/current windows)
  5. Generate NEC-compliant electrical design
  6. Run structural load calculations
  7. Generate document package (SVG/PDF)
- **Output**: Permit-ready document package

### 3C. Design Review UI
- `/dashboard/designs/:projectId` — visual editor
- Shows panel layout on satellite image
- Drag-and-drop panel repositioning
- Real-time electrical calculations update
- "Approve" sends to permit submission
- All changes captured as learning data

---

## Phase 4: Permit Automation Pipeline
**Why fifth**: Most complex system, requires AHJ database + CAD documents.

### 4A. `permitService` — Permit Lifecycle Management
- **Collection**: `permits`
- **Schema**:
  ```
  {
    id: string,
    projectId: string,
    ahjId: string,
    type: "solar" | "electrical" | "building" | "hoa",
    status: "preparing" | "submitting" | "submitted" | "under_review" | "corrections_needed" | "approved" | "denied" | "expired",
    submission: {
      method: "solarapp" | "web_portal" | "email" | "in_person" | "mail",
      submitted_at: timestamp,
      submitted_by: "ai" | userId,
      confirmation_number: string,
      portal_reference: string,
      documents_submitted: string[]
    },
    review: {
      reviewer_name: string,
      comments: string[],
      corrections_requested: [{
        item: string,
        description: string,
        resolved: boolean,
        resolved_by: "ai" | userId,
        resolved_at: timestamp
      }]
    },
    approval: {
      approved_at: timestamp,
      permit_number: string,
      valid_until: timestamp,
      conditions: string[],
      inspection_required: boolean
    },
    fees: {
      amount: number,
      paid: boolean,
      paid_at: timestamp,
      payment_method: string,
      receipt_url: string
    },
    timeline: [{
      status: string,
      timestamp: timestamp,
      actor: "ai" | "human" | "ahj",
      notes: string
    }],
    ai_attempts: [{
      attempted_at: timestamp,
      action: string,
      result: "success" | "failure",
      error: string,
      screenshot_url: string
    }],
    created_at, updated_at
  }
  ```

### 4B. Permit Submission Flow
```
CAD Approved
  → AI Task: "permit_submit"
  → Check AHJ database for submission method
  → If SolarAPP+ jurisdiction: use API (instant)
  → If web portal + automatable: run Puppeteer bot
  → If web portal + not automatable: human queue (capture SOP)
  → If email/in-person: generate package + human queue
  → Track confirmation number
  → Schedule status checks
```

### 4C. Permit Status Monitor
- **Scheduled function**: `checkPermitStatuses` (runs every 4 hours)
- For each "submitted" or "under_review" permit:
  - If web portal: bot checks status page
  - If SolarAPP+: check API
  - Else: relies on human updates
- On status change → notify project team + update pipeline
- On "corrections_needed" → create AI task to resolve (or human fallback)

---

## Phase 5: Scheduling & Install Coordination

### 5A. `schedulingService` — Availability & Matching
- **Collection**: `schedule_slots`
- **Schema**:
  ```
  {
    id: string,
    installerId: string,
    date: string,                    // "2026-03-15"
    time_slots: [{
      start: "08:00", end: "12:00",
      status: "available" | "booked" | "blocked",
      projectId: string             // If booked
    }],
    crew_size: number,
    service_area_miles: number,
    equipment_available: string[]    // What they can install
  }
  ```
- **Collection**: `install_schedules`
- **Schema**:
  ```
  {
    id: string,
    projectId: string,
    permitId: string,
    installerId: string,
    date: string,
    time_window: { start, end },
    status: "proposed" | "customer_confirmed" | "installer_confirmed" | "both_confirmed" | "in_progress" | "completed" | "rescheduled" | "cancelled",
    crew: [{ name, role, phone }],
    equipment_checklist: [{ item, quantity, loaded: boolean }],
    customer_notifications: [{
      type: "confirmation" | "reminder" | "day_of" | "crew_en_route",
      sent_at: timestamp,
      channel: "sms" | "email" | "push"
    }],
    created_at, updated_at
  }
  ```

### 5B. Scheduling Flow
```
Permit Approved
  → AI Task: "schedule_match"
  → Find available installers (from marketplace bids or assigned)
  → Cross-reference customer availability preferences
  → Propose top 3 time slots to customer
  → Customer confirms via app/SMS
  → Installer confirms
  → Schedule locked → notifications begin
  → Day-of: crew tracking + customer updates
```

### 5C. Scheduling Frontend
- **Customer**: `/portal/schedule` — pick from proposed slots
- **Installer**: `/dashboard/schedule` — manage availability, view upcoming installs
- **Admin**: `/admin/schedule` — overview, conflict resolution
- Calendar view with drag-and-drop rescheduling

---

## Phase 6: Install QC — Real-Time Photo Analysis

### 6A. `photoAnalysisService` — AI Photo Processing
- **Collection**: `install_photos`
- **Schema**:
  ```
  {
    id: string,
    projectId: string,
    scheduleId: string,
    phase: "pre_install" | "mounting" | "wiring" | "panels" | "inverter" | "battery" | "final" | "inspection",
    photos: [{
      id: string,
      url: string,
      taken_at: timestamp,
      taken_by: string,
      gps: { lat, lng },
      ai_analysis: {
        status: "analyzing" | "pass" | "flag" | "fail",
        checks: [{
          check_type: "panel_alignment" | "wire_management" | "grounding" | "label_visible" | "torque_marking" | "flashing_seal",
          result: "pass" | "warning" | "fail",
          confidence: number,
          details: string,
          annotated_image_url: string    // AI-annotated version
        }],
        overall_score: number,           // 0-100
        blocking_issues: string[],       // Must fix before proceeding
        recommendations: string[],       // Suggestions, not blocking
        analyzed_at: timestamp
      }
    }],
    phase_status: "in_progress" | "passed" | "needs_rework" | "rework_complete",
    sign_off: {
      installer_signed: boolean,
      reviewer_signed: boolean,         // Remote QC reviewer
      customer_signed: boolean,
      signed_at: timestamp
    }
  }
  ```

### 6B. Photo Analysis Checks (by phase)
- **Mounting**: Rail alignment, lag bolt spacing, flashing seals
- **Wiring**: Wire management, conduit runs, junction boxes, labeling
- **Panels**: Alignment, spacing, clamp torque marks, no damage
- **Inverter**: Mounting height, clearance, disconnect visible, labels
- **Battery**: Indoor/outdoor compliance, clearance, ventilation
- **Final**: System labels, rapid shutdown, placards, meter

### 6C. Installer Mobile Experience
- `/dashboard/install/:projectId` — mobile-optimized
- Phase-by-phase checklist with photo requirements
- Camera opens with overlay guide ("Take photo of electrical panel from this angle")
- Real-time feedback: green check (pass), yellow warning, red fail
- Can't proceed to next phase until current phase passes
- "Request Review" button for edge cases → human queue

---

## Phase 7: Funding Automation

### 7A. `fundingService` — Documentation & Submission
- **Collection**: `funding_packages`
- **Schema**:
  ```
  {
    id: string,
    projectId: string,
    type: "lease" | "ppa" | "loan" | "cash" | "pace",
    provider: string,                  // "Sunrun", "Mosaic", "GoodLeap", etc.
    status: "preparing" | "documents_ready" | "submitted" | "under_review" | "approved" | "funded" | "rejected",
    documents: {
      contract_signed: boolean,
      permit_approved: boolean,
      install_photos_approved: boolean,
      inspection_passed: boolean,
      interconnection_approved: boolean,
      utility_pto: boolean            // Permission to Operate
    },
    submission: {
      method: "api" | "portal" | "email",
      submitted_at: timestamp,
      submitted_by: "ai" | userId,
      reference_number: string
    },
    funding_amount: number,
    milestone_payments: [{
      milestone: "contract" | "permit" | "install_complete" | "pto",
      amount: number,
      status: "pending" | "requested" | "paid",
      paid_at: timestamp
    }],
    created_at, updated_at
  }
  ```

### 7B. PPA/Lease Bankability Package
- **Why**: TPO (Third-Party Ownership) is now dominant post-ITC for residential. Every PPA/lease deal needs a bankable package that finance companies will fund against.
- **Collection**: `bankability_packages`
- **Schema**:
  ```
  {
    id: string,
    projectId: string,
    fundingPackageId: string,
    status: "generating" | "review" | "certified" | "submitted_to_funder",

    // Production estimate (bankable quality)
    production: {
      source: "pvwatts" | "sam" | "helioscope" | "eagleview",
      annual_kwh: number,
      monthly_kwh: number[],        // 12 months
      degradation_rate: number,     // Annual panel degradation (typically 0.5%)
      twenty_five_year_kwh: number[], // 25-year production forecast
      p50_estimate: number,         // 50th percentile production
      p90_estimate: number,         // 90th percentile (conservative, what banks use)
      weather_data_source: string,
      confidence_interval: number
    },

    // Shade analysis (MUST be bankable)
    shading: {
      source: "eagleview" | "aurora" | "manual",
      tsrf: number,                 // Total Solar Resource Fraction
      tof: number,                  // Tilt and Orientation Factor
      solar_access: number,         // Annual solar access %
      monthly_shade_loss: number[], // 12 months
      shade_report_url: string,     // PDF report (required by funders)
      methodology: string           // "fisheye" | "lidar" | "3d_model"
    },

    // Financial model
    financials: {
      system_cost: number,
      ppa_rate_per_kwh: number,     // $/kWh customer pays
      escalator: number,            // Annual rate increase (typically 1-2.9%)
      term_years: number,           // 20 or 25
      customer_year1_savings: number,
      customer_lifetime_savings: number,
      irr: number,                  // Internal rate of return for investor
      payback_period_years: number,
      lcoe: number                  // Levelized cost of energy
    },

    // Compliance for funding
    compliance: {
      equipment_warranty_valid: boolean,
      installer_certified: boolean,
      permit_approved: boolean,
      interconnection_approved: boolean,
      insurance_verified: boolean,
      itc_eligible: boolean,
      domestic_content_bonus: boolean,
      energy_community_bonus: boolean
    },

    // Document package
    documents: {
      shade_report: string,         // EagleView or equivalent
      production_estimate: string,  // P50/P90 report
      site_survey_report: string,
      equipment_spec_sheets: string[],
      permit_approval: string,
      install_photos_package: string,
      financial_model: string,
      customer_agreement: string
    },

    created_at, updated_at
  }
  ```
- **Bankability requirements by funder type**:
  - **Lease/PPA (Sunrun, Sunnova)**: Shade report, P90 production, equipment specs, permit
  - **Loan (Mosaic, GoodLeap, Sunlight)**: Credit check, system cost, production estimate
  - **PACE (Ygrene, Renovate America)**: Property value, improvement value, energy savings
  - All require: signed agreement, permit, install completion photos, interconnection

### 7C. Funding Flow
```
Install Complete + Photos Approved
  → AI Task: "funding_submit"
  → Compile document package (permit, photos, inspection, interconnection)
  → Match against funder's requirements checklist
  → If all documents ready: submit via funder's preferred method
  → If documents missing: create tasks to obtain missing items
  → Track funding status
  → On approval: trigger milestone payment release
```

---

## Phase 8: Interconnection & PTO

### 8A. `interconnectionService` — Utility Connection
- **Collection**: `interconnections`
- Submit interconnection applications to utilities
- Track Net Energy Metering (NEM) / Net Billing approval
- Monitor PTO (Permission to Operate) status
- Many utilities have online portals → bot opportunity

---

## Phase 9: Tax Credit Audit, Insurance & Marketplace
**Why this is the killer feature**: IRA Section 6418 made clean energy tax credits transferable. Currently, companies like Crux and Basis broker these deals — but NOBODY has the credit marketplace integrated into the platform that GENERATES and VERIFIES the credits. We control the entire chain: install verified on our platform → credit audited by our compliance engine → credit insured → listed on marketplace → buyer purchases with full audit trail. This makes SolarOS the most trusted platform for tax credit transactions on the planet.

### 9A. `taxCreditAuditService` — Credit Verification Engine
- **Collection**: `tax_credit_audits`
- **Schema**:
  ```
  {
    id: string,
    projectId: string,
    creditType: "itc_residential" | "itc_commercial" | "ptc" | "domestic_content_bonus" | "energy_community_bonus" | "low_income_bonus",
    baseRate: number,              // e.g., 30% for ITC
    bonuses: [{
      type: "domestic_content" | "energy_community" | "low_income" | "prevailing_wage",
      rate: number,                // Additional percentage
      qualified: boolean,
      evidence: string[],          // Document references proving qualification
      verifiedAt: timestamp,
      verifiedBy: "ai" | userId
    }],
    totalCreditRate: number,       // Base + all qualified bonuses
    systemCost: number,            // Eligible cost basis
    creditAmount: number,          // Dollar value of credit
    status: "draft" | "auditing" | "verified" | "certified" | "listed" | "sold" | "transferred" | "disputed",

    // Audit trail — EVERY piece of evidence
    auditChecks: [{
      checkType: string,           // "equipment_feoc" | "domestic_content_50pct" | "energy_community_census" | "prevailing_wage_records" | "install_completion" | "interconnection" | "pto"
      status: "pending" | "pass" | "fail" | "waived",
      evidence: {
        documentUrl: string,
        documentType: string,
        extractedData: object,     // AI-extracted relevant data
        verificationMethod: string // "automated" | "manual_review" | "third_party"
      },
      checkedAt: timestamp,
      checkedBy: "ai" | userId,
      notes: string
    }],

    // Equipment compliance (ties into existing compliance engine)
    equipmentCompliance: {
      allPanelsFeocCompliant: boolean,
      domesticContentPercentage: number,
      tariffExempt: boolean,
      equipmentIds: string[]       // References to solar_equipment collection
    },

    // Certification
    certification: {
      certifiedAt: timestamp,
      certifiedBy: string,         // Could be platform, could be third-party auditor
      certificateUrl: string,      // PDF certificate
      expiresAt: timestamp,
      revocable: boolean,
      revocationConditions: string[]
    },

    createdAt, updatedAt
  }
  ```

### 9B. `taxCreditInsuranceService` — Risk Assessment & Coverage
- **Collection**: `tax_credit_insurance`
- **Schema**:
  ```
  {
    id: string,
    auditId: string,
    projectId: string,
    creditAmount: number,

    // Risk scoring
    riskAssessment: {
      overallRisk: "low" | "medium" | "high",
      riskScore: number,           // 0-100 (lower = less risk)
      factors: [{
        factor: string,            // "equipment_origin_uncertain" | "prevailing_wage_documentation_incomplete" | etc.
        impact: "low" | "medium" | "high",
        mitigated: boolean,
        mitigation: string
      }],
      assessedAt: timestamp,
      assessedBy: "ai" | userId
    },

    // Insurance/guarantee
    coverage: {
      type: "platform_guarantee" | "third_party_insurance" | "escrow_backed",
      provider: string,
      coverageAmount: number,      // What we guarantee
      premium: number,             // Cost of insurance/guarantee
      premiumRate: number,         // As percentage of credit value
      termMonths: number,          // How long coverage lasts
      conditions: string[],        // What voids coverage
      policyUrl: string
    },

    status: "assessing" | "quoted" | "active" | "claimed" | "expired",
    createdAt, updatedAt
  }
  ```

### 9C. `taxCreditMarketplace` — Open Market for Credits
- **Collection**: `tax_credit_listings`
- **Schema**:
  ```
  {
    id: string,
    auditId: string,
    insuranceId: string,           // Optional but increases buyer confidence
    sellerId: string,              // Project owner or TPO company

    // Listing details
    listing: {
      creditType: string,
      creditAmount: number,        // Face value of credit
      askingPrice: number,         // What seller wants (typically 85-92 cents per dollar)
      discountRate: number,        // Percentage discount from face value
      minimumBid: number,          // Lowest acceptable price
      auctionStyle: "fixed_price" | "auction" | "negotiation",
      expiresAt: timestamp         // Listing expiration
    },

    // Verification level (higher = more buyer confidence = higher price)
    verificationLevel: {
      platformAudited: boolean,    // Our audit engine verified it
      thirdPartyAudited: boolean,  // External auditor confirmed
      insured: boolean,            // Insurance/guarantee attached
      escrowAvailable: boolean,    // Can use platform escrow
      level: 1 | 2 | 3 | 4        // Bronze/Silver/Gold/Platinum
    },

    // Project summary (anonymized until deal)
    projectSummary: {
      state: string,
      systemSizeKw: number,
      installDate: string,
      creditYear: number,          // Tax year the credit applies to
      equipmentOrigin: string,     // "US manufactured" | "compliant import"
      projectType: "residential" | "commercial" | "community"
    },

    status: "draft" | "active" | "under_offer" | "pending_transfer" | "sold" | "expired" | "withdrawn",

    // Offers/bids
    offers: [{
      id: string,
      buyerId: string,
      offerAmount: number,
      status: "pending" | "accepted" | "rejected" | "countered" | "expired",
      message: string,
      offeredAt: timestamp,
      respondedAt: timestamp
    }],

    createdAt, updatedAt
  }
  ```

- **Collection**: `tax_credit_transactions`
- **Schema**:
  ```
  {
    id: string,
    listingId: string,
    sellerId: string,
    buyerId: string,

    // Deal terms
    creditAmount: number,          // Face value
    salePrice: number,             // Actual price paid
    discountRate: number,          // Effective discount
    platformFee: number,           // Our cut
    platformFeeRate: number,       // As percentage

    // Transfer process (IRS Form 8978 / applicable forms)
    transfer: {
      status: "escrow_funded" | "documents_preparing" | "documents_signed" | "irs_filing" | "transfer_complete" | "disputed",
      escrowId: string,            // Mercury escrow reference
      documents: [{
        type: "purchase_agreement" | "transfer_election" | "irs_form" | "certification",
        url: string,
        signedBySeller: boolean,
        signedByBuyer: boolean,
        signedAt: timestamp
      }],
      irsFilingReference: string,
      completedAt: timestamp
    },

    // Payment (via Mercury ACH or Stripe)
    payment: {
      method: "ach" | "wire" | "stripe",
      toSeller: { amount, status, paidAt, reference },
      platformFee: { amount, status, collectedAt },
      escrowRelease: { amount, releasedAt, conditions_met: string[] }
    },

    timeline: [{
      event: string,
      timestamp: timestamp,
      actor: string,
      notes: string
    }],

    createdAt, updatedAt
  }
  ```

### 9D. Tax Credit Marketplace Frontend
- `/marketplace/credits` — Public listing of available credits (anonymized)
  - Filter by: credit type, state, size, price range, verification level
  - Sort by: price, size, verification level, expiration
- `/marketplace/credits/:id` — Credit detail page
  - Full audit report (verification checks, compliance, equipment)
  - Insurance/guarantee details
  - Make offer / Buy now
- `/dashboard/credits` — Seller dashboard
  - List credits from completed projects
  - Track offers and negotiations
  - View transaction history
  - Analytics: average sale price, time to sell
- `/portal/credits` — Buyer dashboard
  - Saved searches and alerts
  - Active offers
  - Purchased credits + transfer status
  - Tax documentation downloads
- `/admin/credits` — Admin oversight
  - All listings and transactions
  - Dispute resolution
  - Audit review queue
  - Platform revenue from fees

### 9E. Tax Credit Marketplace Flow
```
Install Complete + PTO Received
  → AI Task: "credit_audit"
  → Compliance engine verifies ALL equipment (FEOC, domestic content)
  → Verify energy community bonus eligibility (census tract check)
  → Verify prevailing wage compliance (if applicable)
  → Calculate total credit value (base + bonuses)
  → Generate audit certificate
  → Optional: AI risk assessment → insurance quote
  → Seller lists credit on marketplace
  → Buyers browse/search/bid
  → Deal agreed → escrow funded (Mercury ACH)
  → Documents generated + signed
  → IRS transfer election filed
  → Escrow released to seller
  → Platform fee collected
  → Transaction complete
```

### 9F. Why This Is Defensible
1. **Audit trail from day one** — We built the system that verified the install
2. **Equipment provenance** — Our equipment database knows exactly what was installed
3. **Compliance certainty** — Our FEOC/domestic content engine already validates this
4. **Photo evidence** — Our QC system has timestamped, geotagged, AI-analyzed install photos
5. **Permit verification** — We tracked the permit through our system
6. **Lower risk = higher prices** — Sellers get better prices because buyers trust our verification
7. **Platform fee model** — 1-3% of transaction value (industry standard is 2-5%)

---

## Build Order & Dependencies

```
Phase 0: AI Task Engine ──────────────────┐
  ├── 0A: Task Engine (backend)           │ FOUNDATION
  ├── 0B: Human Queue (frontend)          │ (build first)
  └── 0C: Learning Service                │
                                          │
Phase 1: AHJ Database ───────────────────┤
  ├── 1A: AHJ Registry + data population  │ KNOWLEDGE
  ├── 1B: Permit SOPs                     │ BASE
  └── 1C: Permit Bot Framework            │
                                          │
Phase 2: Site Survey ─────────────────────┤
  ├── 2A: Survey Service (backend)        │ PIPELINE
  ├── 2B: Survey Frontend (mobile-first)  │ ENTRY
  └── 2C: Survey AI Review                │ POINT
                                          │
Phase 3: CAD Generation ──────────────────┤
  ├── 3A: Design Engine                   │ DESIGN
  ├── 3B: Design Algorithm                │
  └── 3C: Design Review UI               │
                                          │
Phase 4: Permit Automation ───────────────┤
  ├── 4A: Permit Lifecycle                │ PERMITS
  ├── 4B: Submission Flow                 │ (biggest
  └── 4C: Status Monitor                  │  bottleneck)
                                          │
Phase 5: Scheduling ──────────────────────┤
  ├── 5A: Availability Matching           │ INSTALL
  ├── 5B: Scheduling Flow                 │ COORD
  └── 5C: Scheduling Frontend             │
                                          │
Phase 6: Install QC ──────────────────────┤
  ├── 6A: Photo Analysis Service          │ QUALITY
  ├── 6B: Analysis Checks                 │
  └── 6C: Installer Mobile UX            │
                                          │
Phase 7: Funding ─────────────────────────┤
  ├── 7A: Funding Service                 │ MONEY
  └── 7B: Funding Flow                    │
                                          │
Phase 8: Interconnection ─────────────────┤
  └── 8A: Utility PTO                       FINAL STEP
                                          │
Phase 9: Tax Credit Marketplace ──────────┘
  ├── 9A: Credit Audit Engine              KILLER
  ├── 9B: Insurance/Risk Assessment        FEATURE
  ├── 9C: Open Credit Marketplace          ($$$$)
  ├── 9D: Marketplace Frontend
  └── 9E: Transaction + Escrow Pipeline
```

## Code Standards for This Build

1. **Every function gets JSDoc comments** explaining what it does, its inputs, and outputs
2. **Every Firestore write includes `created_at` and `updated_at`** timestamps
3. **Every AI task follows the pattern**: attempt → succeed/fail → escalate if needed → learn
4. **Every service exports a clear API** with typed parameters
5. **Every frontend component has prop documentation**
6. **Error handling always includes**: what failed, why, and what to do about it
7. **No magic numbers** — constants defined and named
8. **Audit trail on everything** — who did what, when, why
