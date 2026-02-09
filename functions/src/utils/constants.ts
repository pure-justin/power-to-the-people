/**
 * Shared Constants - SolarOS Cloud Functions
 *
 * Centralized constants used across multiple modules to avoid duplication.
 * Previously duplicated in marketplace.ts, marketplaceApi.ts, projectPipeline.ts,
 * and projectApi.ts.
 */

// ─── Service Types ──────────────────────────────────────────────────────────────

/** Valid service types for marketplace listings and pipeline tasks. */
export const SERVICE_TYPES = [
  "cad_design",
  "engineering_stamp",
  "permit_submission",
  "site_survey",
  "hoa_approval",
  "installation",
  "inspection",
  "electrical",
  "roofing",
  "trenching",
  "battery_install",
  "panel_upgrade",
  "monitoring_setup",
  "maintenance",
  "other",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// ─── Pipeline Stages ────────────────────────────────────────────────────────────

/** Ordered pipeline stages for solar project lifecycle. */
export const PIPELINE_STAGES = [
  "lead",
  "qualified",
  "proposal",
  "sold",
  "survey",
  "design",
  "engineering",
  "permit_submitted",
  "permit_approved",
  "scheduled",
  "installing",
  "inspection",
  "pto_submitted",
  "pto_approved",
  "activated",
  "monitoring",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number] | "cancelled";

// ─── Stage-to-Phase Mapping ─────────────────────────────────────────────────────

/** Maps each pipeline stage to its parent phase for grouping/reporting. */
export const STAGE_TO_PHASE: Record<string, string> = {
  lead: "acquisition",
  qualified: "acquisition",
  proposal: "sales",
  sold: "sales",
  survey: "pre_construction",
  design: "pre_construction",
  engineering: "pre_construction",
  permit_submitted: "pre_construction",
  permit_approved: "pre_construction",
  scheduled: "construction",
  installing: "construction",
  inspection: "construction",
  pto_submitted: "activation",
  pto_approved: "activation",
  activated: "activation",
  monitoring: "activation",
};
