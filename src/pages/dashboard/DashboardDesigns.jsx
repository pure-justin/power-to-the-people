/**
 * DashboardDesigns -- Design Management Dashboard
 *
 * Shows all CAD designs with:
 *   - System specs summary (kW, panels, inverter, battery)
 *   - Status badges (generating, ai_complete, human_review, approved)
 *   - Compliance checklist (NEC, setbacks, fire code, structural)
 *   - Document package links
 *   - Approve / Request Changes actions
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "../../services/firebase";
import { approveDesign } from "../../services/cadService";
import {
  Layout,
  Zap,
  Sun,
  Battery,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Cpu,
  User,
  Shield,
  ThumbsUp,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  generating: "bg-blue-100 text-blue-700",
  ai_complete: "bg-indigo-100 text-indigo-700",
  human_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  revision: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS = {
  generating: "Generating",
  ai_complete: "AI Complete",
  human_review: "Human Review",
  approved: "Approved",
  revision: "Revision",
};

const STATUS_ICONS = {
  generating: Loader2,
  ai_complete: Cpu,
  human_review: User,
  approved: CheckCircle2,
  revision: AlertTriangle,
};

const MOUNTING_LABELS = {
  roof: "Roof Mount",
  ground: "Ground Mount",
  carport: "Carport",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return "N/A";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatKw(kw) {
  if (!kw) return "0 kW";
  return `${kw} kW`;
}

// ─── Compliance Checklist ───────────────────────────────────────────────────────

function ComplianceChecklist({ compliance }) {
  if (!compliance) return null;

  const items = [
    {
      key: "nec_compliant",
      label: "NEC Code",
      value: compliance.nec_compliant,
    },
    {
      key: "setback_compliant",
      label: "Setbacks",
      value: compliance.setback_compliant,
    },
    {
      key: "fire_code_compliant",
      label: "Fire Code",
      value: compliance.fire_code_compliant,
    },
    {
      key: "structural_adequate",
      label: "Structural",
      value: compliance.structural_adequate,
    },
  ];

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2 text-xs">
          {item.value ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-400" />
          )}
          <span
            className={
              item.value ? "text-gray-700" : "text-red-600 font-medium"
            }
          >
            {item.label}
          </span>
        </div>
      ))}
      {compliance.issues?.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {compliance.issues.map((issue, i) => (
            <p key={i} className="text-xs text-red-500">
              - {issue}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Design Card ────────────────────────────────────────────────────────────────

function DesignCard({ design, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState(null);

  const sys = design.system_design || {};
  const StatusIcon = STATUS_ICONS[design.status] || Layout;

  const handleApprove = async () => {
    setError(null);
    setApproving(true);
    try {
      await approveDesign(design.id);
      onRefresh();
    } catch (err) {
      setError(err.message || "Failed to approve design");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="card border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Status + Specs Header */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[design.status] || "bg-gray-100 text-gray-600"}`}
            >
              <StatusIcon
                className={`h-3 w-3 ${design.status === "generating" ? "animate-spin" : ""}`}
              />
              {STATUS_LABELS[design.status] || design.status}
            </span>
            {sys.mounting_type && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {MOUNTING_LABELS[sys.mounting_type] || sys.mounting_type}
              </span>
            )}
          </div>

          {/* System specs summary */}
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-400">System Size</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatKw(sys.total_kw)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Panels</p>
              <p className="text-sm font-semibold text-gray-900">
                {sys.panel_count || 0}
                {sys.panel_model && (
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    ({sys.panel_model})
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Inverter</p>
              <p className="text-sm font-semibold text-gray-900">
                {sys.inverter_model || "TBD"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Battery</p>
              <p className="text-sm font-semibold text-gray-900">
                {sys.battery_model || "None"}
              </p>
            </div>
          </div>

          {/* Production estimate */}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            {sys.estimated_annual_kwh > 0 && (
              <span className="inline-flex items-center gap-1">
                <Sun className="h-3 w-3" />
                {sys.estimated_annual_kwh.toLocaleString()} kWh/yr
              </span>
            )}
            {sys.offset_percentage > 0 && (
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {sys.offset_percentage}% offset
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created {formatDate(design.created_at)}
            </span>
          </div>

          {error && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1 text-xs text-red-700">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
          {(design.status === "ai_complete" ||
            design.status === "human_review") && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {approving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ThumbsUp className="h-3 w-3" />
              )}
              Approve
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            {expanded ? (
              <>
                Less <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Details <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-3">
          {/* Compliance Checklist */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
              Compliance
            </h4>
            <ComplianceChecklist compliance={design.compliance} />
          </div>

          {/* String Configuration */}
          {sys.string_configuration?.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
                String Configuration
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sys.string_configuration.map((str, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-xs"
                  >
                    <p className="font-medium text-gray-700">
                      String {str.string_id || i + 1}
                    </p>
                    <p className="text-gray-500">
                      {str.panel_count} panels | {str.voltage}V | {str.current}A
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Panel Layout */}
          {sys.panel_layout?.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
                Panel Layout
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sys.panel_layout.map((plane, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-xs"
                  >
                    <p className="font-medium text-gray-700">
                      Plane {plane.plane_id || i + 1}
                    </p>
                    <p className="text-gray-500">
                      {plane.rows}x{plane.columns} | Tilt {plane.tilt} |{" "}
                      {plane.orientation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
              Documents
            </h4>
            <div className="flex flex-wrap gap-2">
              {design.documents?.site_plan_url && (
                <a
                  href={design.documents.site_plan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                >
                  <FileText className="h-3 w-3" />
                  Site Plan
                </a>
              )}
              {design.documents?.single_line_diagram_url && (
                <a
                  href={design.documents.single_line_diagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                >
                  <FileText className="h-3 w-3" />
                  Single Line
                </a>
              )}
              {design.documents?.structural_plan_url && (
                <a
                  href={design.documents.structural_plan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                >
                  <FileText className="h-3 w-3" />
                  Structural
                </a>
              )}
              {design.documents?.load_calculations_url && (
                <a
                  href={design.documents.load_calculations_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                >
                  <FileText className="h-3 w-3" />
                  Load Calc
                </a>
              )}
              {!design.documents?.site_plan_url &&
                !design.documents?.single_line_diagram_url &&
                !design.documents?.structural_plan_url && (
                  <span className="text-xs text-gray-400">
                    No documents uploaded yet
                  </span>
                )}
            </div>
          </div>

          {/* AI Generation Info */}
          {design.ai_generation && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              {design.ai_generation.model_version && (
                <span>Model: {design.ai_generation.model_version}</span>
              )}
              {design.ai_generation.confidence > 0 && (
                <span>
                  Confidence:{" "}
                  {Math.round(design.ai_generation.confidence * 100)}%
                </span>
              )}
              {design.ai_generation.completed_at && (
                <span>
                  Generated {formatDate(design.ai_generation.completed_at)}
                </span>
              )}
            </div>
          )}

          {/* Human Review History */}
          {design.human_review?.changes_made?.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
                Review History
              </h4>
              <div className="space-y-1">
                {design.human_review.changes_made.map((change, i) => (
                  <p key={i} className="text-xs text-gray-500">
                    {formatDate(change.changed_at)} - Modified:{" "}
                    {change.fields?.join(", ")}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function DashboardDesigns() {
  useAuth();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadDesigns = useCallback(async () => {
    setLoading(true);
    try {
      let q;
      if (statusFilter !== "all") {
        q = query(
          collection(db, "cad_designs"),
          where("status", "==", statusFilter),
          orderBy("created_at", "desc"),
          limit(50),
        );
      } else {
        q = query(
          collection(db, "cad_designs"),
          orderBy("created_at", "desc"),
          limit(50),
        );
      }

      const snap = await getDocs(q);
      setDesigns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load designs:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const filteredDesigns = useMemo(() => {
    if (!searchQuery) return designs;
    const s = searchQuery.toLowerCase();
    return designs.filter(
      (d) =>
        (d.projectId || "").toLowerCase().includes(s) ||
        (d.system_design?.panel_model || "").toLowerCase().includes(s) ||
        (d.system_design?.inverter_model || "").toLowerCase().includes(s),
    );
  }, [designs, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = designs.length;
    const approved = designs.filter((d) => d.status === "approved").length;
    const reviewing = designs.filter(
      (d) => d.status === "ai_complete" || d.status === "human_review",
    ).length;
    const totalKw = designs.reduce(
      (sum, d) => sum + (d.system_design?.total_kw || 0),
      0,
    );
    return {
      total,
      approved,
      reviewing,
      totalKw: Math.round(totalKw * 100) / 100,
    };
  }, [designs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Designs</h1>
        <button
          onClick={loadDesigns}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-gray-500">Total Designs</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-emerald-600">Approved</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">
            {stats.approved}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-amber-600">Needs Review</p>
          <p className="mt-1 text-xl font-bold text-amber-700">
            {stats.reviewing}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-blue-600">Total Capacity</p>
          <p className="mt-1 text-xl font-bold text-blue-700">
            {stats.totalKw} kW
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project, panel, or inverter..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Statuses</option>
          <option value="generating">Generating</option>
          <option value="ai_complete">AI Complete</option>
          <option value="human_review">Human Review</option>
          <option value="approved">Approved</option>
          <option value="revision">Revision</option>
        </select>
      </div>

      {/* Design List */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div className="py-12 text-center">
          <Layout className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            No designs found matching your filters
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDesigns.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              onRefresh={loadDesigns}
            />
          ))}
        </div>
      )}
    </div>
  );
}
