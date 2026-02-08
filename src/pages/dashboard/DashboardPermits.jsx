/**
 * DashboardPermits -- Permit Tracking Dashboard
 *
 * Shows all permits the installer has access to, with:
 *   - Status badges color-coded by lifecycle state
 *   - Timeline view of permit events
 *   - Correction tracking with resolve actions
 *   - Filter by status, type, and project
 *   - Submit, check status, and view document actions
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
import {
  submitPermit,
  updatePermitStatus,
  resolveCorrection,
} from "../../services/permitService";
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  FileText,
  Building2,
  Zap,
  Home,
  Shield,
  Search,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────────

const PERMIT_TYPE_LABELS = {
  solar: "Solar",
  electrical: "Electrical",
  building: "Building",
  hoa: "HOA",
};

const PERMIT_TYPE_ICONS = {
  solar: Zap,
  electrical: Zap,
  building: Building2,
  hoa: Home,
};

const STATUS_COLORS = {
  preparing: "bg-gray-100 text-gray-700",
  submitting: "bg-blue-100 text-blue-700",
  submitted: "bg-indigo-100 text-indigo-700",
  under_review: "bg-amber-100 text-amber-700",
  corrections_needed: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS = {
  preparing: "Preparing",
  submitting: "Submitting",
  submitted: "Submitted",
  under_review: "Under Review",
  corrections_needed: "Corrections Needed",
  approved: "Approved",
  denied: "Denied",
  expired: "Expired",
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

function formatDateTime(ts) {
  if (!ts) return "N/A";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Timeline Component ─────────────────────────────────────────────────────────

function PermitTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return <p className="text-xs text-gray-400">No timeline events</p>;
  }

  return (
    <div className="space-y-2">
      {timeline.map((entry, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <div
              className={`h-2 w-2 rounded-full ${
                entry.status === "approved"
                  ? "bg-emerald-500"
                  : entry.status === "denied"
                    ? "bg-red-500"
                    : entry.status === "corrections_needed"
                      ? "bg-orange-500"
                      : "bg-blue-500"
              }`}
            />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-700">
              {STATUS_LABELS[entry.status] || entry.status}
              <span className="ml-2 font-normal text-gray-400">
                ({entry.actor})
              </span>
            </p>
            <p className="text-xs text-gray-500">{entry.notes}</p>
            <p className="text-xs text-gray-400">
              {formatDateTime(entry.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Corrections Panel ──────────────────────────────────────────────────────────

function CorrectionsPanel({ permit, onResolved }) {
  const corrections = permit.review?.corrections_requested || [];
  const [resolving, setResolving] = useState(null);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState(null);

  if (corrections.length === 0) {
    return <p className="text-xs text-gray-400">No corrections requested</p>;
  }

  const handleResolve = async (correctionId) => {
    if (!resolution.trim()) return;
    setError(null);
    setResolving(correctionId);

    try {
      await resolveCorrection(permit.id, correctionId, resolution);
      setResolution("");
      setResolving(null);
      onResolved();
    } catch (err) {
      setError(err.message || "Failed to resolve correction");
      setResolving(null);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}
      {corrections.map((c) => (
        <div
          key={c.id}
          className={`rounded-lg border p-3 ${c.resolved ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-orange-50"}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{c.item}</p>
              <p className="text-xs text-gray-600">{c.description}</p>
            </div>
            {c.resolved ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
            )}
          </div>
          {c.resolved && c.resolution && (
            <p className="mt-1 text-xs text-emerald-700">
              Resolved: {c.resolution}
            </p>
          )}
          {!c.resolved && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={resolving === c.id ? resolution : ""}
                onChange={(e) => {
                  setResolving(c.id);
                  setResolution(e.target.value);
                }}
                onFocus={() => setResolving(c.id)}
                placeholder="Describe resolution..."
                className="input-field flex-1 text-xs"
              />
              <button
                onClick={() => handleResolve(c.id)}
                disabled={resolving === c.id && !resolution.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {resolving === c.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                Resolve
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Permit Card ────────────────────────────────────────────────────────────────

function PermitCard({ permit, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const TypeIcon = PERMIT_TYPE_ICONS[permit.type] || FileCheck;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await submitPermit(permit.id);
      onRefresh();
    } catch (err) {
      setError(err.message || "Failed to submit permit");
    } finally {
      setSubmitting(false);
    }
  };

  const unresolvedCorrections = (
    permit.review?.corrections_requested || []
  ).filter((c) => !c.resolved).length;

  return (
    <div className="card border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              <TypeIcon className="h-3 w-3" />
              {PERMIT_TYPE_LABELS[permit.type] || permit.type}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[permit.status] || "bg-gray-100 text-gray-600"}`}
            >
              {STATUS_LABELS[permit.status] || permit.status}
            </span>
            {unresolvedCorrections > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                <AlertTriangle className="h-3 w-3" />
                {unresolvedCorrections} correction
                {unresolvedCorrections !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              AHJ: {permit.ahjId || "Unknown"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created {formatDate(permit.created_at)}
            </span>
            {permit.approval?.permit_number && (
              <span className="inline-flex items-center gap-1">
                <Shield className="h-3 w-3" />#{permit.approval.permit_number}
              </span>
            )}
            {permit.submission?.submitted_at && (
              <span className="inline-flex items-center gap-1">
                <Send className="h-3 w-3" />
                Submitted {formatDate(permit.submission.submitted_at)}
              </span>
            )}
          </div>

          {error && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1 text-xs text-red-700">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
          {(permit.status === "preparing" ||
            permit.status === "corrections_needed") && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Submit
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
          {/* Timeline */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
              Timeline
            </h4>
            <PermitTimeline timeline={permit.timeline} />
          </div>

          {/* Corrections */}
          {(permit.review?.corrections_requested || []).length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
                Corrections
              </h4>
              <CorrectionsPanel permit={permit} onResolved={onRefresh} />
            </div>
          )}

          {/* Approval Details */}
          {permit.status === "approved" && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
                Approval
              </h4>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                {permit.approval?.permit_number && (
                  <span className="rounded bg-emerald-50 px-2 py-0.5">
                    Permit #{permit.approval.permit_number}
                  </span>
                )}
                {permit.approval?.valid_until && (
                  <span className="rounded bg-gray-100 px-2 py-0.5">
                    Valid until {permit.approval.valid_until}
                  </span>
                )}
                {permit.approval?.inspection_required && (
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                    Inspection Required
                  </span>
                )}
              </div>
              {permit.approval?.conditions?.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-xs text-gray-500">
                  {permit.approval.conditions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Fees */}
          {permit.fees?.amount > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                Fee: ${permit.fees.amount}
                {permit.fees.paid ? (
                  <span className="ml-1 text-emerald-600">(Paid)</span>
                ) : (
                  <span className="ml-1 text-amber-600">(Unpaid)</span>
                )}
              </span>
            </div>
          )}

          {/* Documents */}
          {permit.submission?.documents_submitted?.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
                Documents
              </h4>
              <div className="flex flex-wrap gap-1">
                {permit.submission.documents_submitted.map((doc, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    <FileText className="h-3 w-3" />
                    {doc}
                  </span>
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

export default function DashboardPermits() {
  const { user } = useAuth();
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadPermits = useCallback(async () => {
    setLoading(true);
    try {
      let q;
      if (statusFilter !== "all") {
        q = query(
          collection(db, "permits"),
          where("status", "==", statusFilter),
          orderBy("created_at", "desc"),
          limit(100),
        );
      } else {
        q = query(
          collection(db, "permits"),
          orderBy("created_at", "desc"),
          limit(100),
        );
      }

      const snap = await getDocs(q);
      let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (typeFilter !== "all") {
        data = data.filter((p) => p.type === typeFilter);
      }

      setPermits(data);
    } catch (err) {
      console.error("Failed to load permits:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadPermits();
  }, [loadPermits]);

  const filteredPermits = useMemo(() => {
    if (!searchQuery) return permits;
    const s = searchQuery.toLowerCase();
    return permits.filter(
      (p) =>
        (p.ahjId || "").toLowerCase().includes(s) ||
        (p.projectId || "").toLowerCase().includes(s) ||
        (p.approval?.permit_number || "").toLowerCase().includes(s),
    );
  }, [permits, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = permits.length;
    const approved = permits.filter((p) => p.status === "approved").length;
    const pending = permits.filter((p) =>
      ["preparing", "submitting", "submitted", "under_review"].includes(
        p.status,
      ),
    ).length;
    const needsAction = permits.filter(
      (p) => p.status === "corrections_needed",
    ).length;
    return { total, approved, pending, needsAction };
  }, [permits]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Permits</h1>
        <button
          onClick={loadPermits}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-gray-500">Total</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-emerald-600">Approved</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">
            {stats.approved}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-blue-600">In Progress</p>
          <p className="mt-1 text-xl font-bold text-blue-700">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-orange-600">Needs Action</p>
          <p className="mt-1 text-xl font-bold text-orange-700">
            {stats.needsAction}
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
            placeholder="Search by AHJ, project, or permit #..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Statuses</option>
          <option value="preparing">Preparing</option>
          <option value="submitting">Submitting</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="corrections_needed">Corrections Needed</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Types</option>
          <option value="solar">Solar</option>
          <option value="electrical">Electrical</option>
          <option value="building">Building</option>
          <option value="hoa">HOA</option>
        </select>
      </div>

      {/* Permit List */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : filteredPermits.length === 0 ? (
        <div className="py-12 text-center">
          <FileCheck className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            No permits found matching your filters
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPermits.map((permit) => (
            <PermitCard
              key={permit.id}
              permit={permit}
              onRefresh={loadPermits}
            />
          ))}
        </div>
      )}
    </div>
  );
}
