/**
 * Lead Types - Shared between frontend and backend
 *
 * These types match the Firestore schema defined in functions/src/leads.ts
 */

/**
 * Lead status enum - tracks progress through sales funnel
 */
export enum LeadStatus {
  SUBMITTED = "submitted",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  SOLD = "sold",
  LOST = "lost",
}

/**
 * Lead source - where the lead came from
 */
export enum LeadSource {
  WEBSITE = "website",
  REFERRAL = "referral",
  AD = "ad",
  API = "api",
  PARTNER = "partner",
  EVENT = "event",
}

/**
 * Sales note interface - for team comments
 */
export interface SalesNote {
  id: string;
  text: string;
  author: string;
  authorName?: string;
  createdAt: Date | { seconds: number; nanoseconds: number };
  type?: "call" | "email" | "meeting" | "note";
}

/**
 * Score breakdown for transparency
 */
export interface ScoreBreakdown {
  propertyQuality: number;
  financialFit: number;
  urgency: number;
  engagement: number;
}

/**
 * Solar API cached data
 */
export interface SolarApiData {
  maxArrayPanels: number;
  maxArrayArea: number;
  maxSunshineHours: number;
  carbonOffset: number;
  buildingInsights?: any;
}

/**
 * Complete lead schema
 */
export interface Lead {
  // Identification
  id: string;
  customerName: string;
  email: string;
  phone: string;

  // Address
  address: string;
  city: string;
  state: string;
  zip: string;
  fullAddress?: string;

  // Status & Assignment
  status: LeadStatus;
  source: LeadSource;
  assignedTo?: string;
  assignedToName?: string;

  // Scoring (AI-driven)
  score: number;
  scoreBreakdown?: ScoreBreakdown;

  // Solar System Details
  systemSize?: number;
  batterySize?: number;
  estimatedCost?: number;
  estimatedSavings?: number;
  monthlyPayment?: number;
  panelCount?: number;

  // Energy Data
  annualKwh?: number;
  monthlyKwh?: number;
  esiid?: string;

  // Solar API Data
  solarApiData?: SolarApiData;

  // Notes & History
  notes: SalesNote[];
  lastContactedAt?: Date | { seconds: number; nanoseconds: number };
  qualifiedAt?: Date | { seconds: number; nanoseconds: number };
  closedAt?: Date | { seconds: number; nanoseconds: number };

  // Metadata
  createdAt: Date | { seconds: number; nanoseconds: number };
  updatedAt: Date | { seconds: number; nanoseconds: number };
  createdBy?: string;
  ipAddress?: string;
  userAgent?: string;

  // Marketing Attribution
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;

  // Flags
  isTest?: boolean;
  archived?: boolean;
}

/**
 * Input for creating a new lead
 */
export interface CreateLeadInput {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  source?: LeadSource;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  systemSize?: number;
  batterySize?: number;
  annualKwh?: number;
  solarApiData?: SolarApiData;
}

/**
 * Helper to convert Firestore timestamps to Dates
 */
export function convertTimestamps(lead: any): Lead {
  return {
    ...lead,
    createdAt: lead.createdAt?.toDate
      ? lead.createdAt.toDate()
      : lead.createdAt,
    updatedAt: lead.updatedAt?.toDate
      ? lead.updatedAt.toDate()
      : lead.updatedAt,
    lastContactedAt: lead.lastContactedAt?.toDate
      ? lead.lastContactedAt.toDate()
      : lead.lastContactedAt,
    qualifiedAt: lead.qualifiedAt?.toDate
      ? lead.qualifiedAt.toDate()
      : lead.qualifiedAt,
    closedAt: lead.closedAt?.toDate ? lead.closedAt.toDate() : lead.closedAt,
    notes:
      lead.notes?.map((note: any) => ({
        ...note,
        createdAt: note.createdAt?.toDate
          ? note.createdAt.toDate()
          : note.createdAt,
      })) || [],
  };
}

/**
 * Status display helpers
 */
export const STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.SUBMITTED]: "New Lead",
  [LeadStatus.CONTACTED]: "Contacted",
  [LeadStatus.QUALIFIED]: "Qualified",
  [LeadStatus.SOLD]: "Sold",
  [LeadStatus.LOST]: "Lost",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.SUBMITTED]: "blue",
  [LeadStatus.CONTACTED]: "yellow",
  [LeadStatus.QUALIFIED]: "purple",
  [LeadStatus.SOLD]: "green",
  [LeadStatus.LOST]: "gray",
};

/**
 * Score level helpers
 */
export function getScoreLevel(score: number): "high" | "medium" | "low" {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export const SCORE_COLORS = {
  high: "green",
  medium: "yellow",
  low: "red",
};
