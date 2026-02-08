/**
 * DashboardFunding -- Funding status overview
 *
 * Displays funding packages, document readiness checklist, bankability
 * package status, milestone payments, and submission controls.
 */
import { useState, useEffect, useCallback } from "react";
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
  createFundingPackage,
  checkDocumentReadiness,
  submitFunding,
  requestMilestonePayment,
  getFundingByProject,
  generateBankabilityPackage,
  FUNDING_TYPES,
  REQUIRED_DOCUMENTS,
  FUNDING_STATUS_LABELS,
} from "../../services/fundingService";
import {
  DollarSign,
  FileCheck,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Plus,
  X,
  AlertCircle,
  FileText,
  TrendingUp,
  Banknote,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(val) {
  if (val == null || val === 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(val);
}

function formatDate(ts) {
  if (!ts) return "N/A";
  const d =
    typeof ts === "string"
      ? new Date(ts)
      : ts.toDate
        ? ts.toDate()
        : new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_COLORS = {
  preparing: "bg-gray-100 text-gray-600",
  documents_ready: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  under_review: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  funded: "bg-emerald-200 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

const MILESTONE_STATUS_COLORS = {
  pending: "bg-gray-100 text-gray-500",
  requested: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
};

// ─── Create Funding Package Modal ─────────────────────────────────────────────

function CreateFundingModal({ projects, onClose, onCreated }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [fundingType, setFundingType] = useState("ppa");
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createFundingPackage(
        projectId,
        fundingType,
        provider,
        amount ? parseFloat(amount) : undefined,
      );
      onCreated();
    } catch (err) {
      setError(err.message || "Failed to create funding package");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            New Funding Package
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Project *
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input-field"
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.customerName || p.id.slice(0, 12)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Funding Type *
            </label>
            <select
              value={fundingType}
              onChange={(e) => setFundingType(e.target.value)}
              className="input-field"
            >
              {Object.entries(FUNDING_TYPES).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Provider / Funder *
            </label>
            <input
              type="text"
              required
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g., Sunrun, GoodLeap, Mosaic"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Funding Amount ($)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25000"
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !provider || !projectId}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Package
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Document Readiness Checklist ─────────────────────────────────────────────

function DocumentChecklist({ packageId }) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await checkDocumentReadiness(packageId);
        setReadiness(result);
      } catch (err) {
        console.error("Failed to check readiness:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [packageId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking documents...
      </div>
    );
  }

  if (!readiness) return null;

  return (
    <div className="space-y-1.5">
      {REQUIRED_DOCUMENTS.map((doc) => {
        const isComplete = readiness.completed?.includes(doc.key);
        return (
          <div key={doc.key} className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300" />
            )}
            <span
              className={`text-sm ${isComplete ? "text-gray-700" : "text-gray-400"}`}
            >
              {doc.label}
            </span>
          </div>
        );
      })}
      <div className="mt-2">
        {readiness.ready ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            All documents ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            {readiness.missing?.length} document(s) missing
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Funding Package Card ─────────────────────────────────────────────────────

function FundingPackageCard({ pkg, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestingMilestone, setRequestingMilestone] = useState(null);
  const [generatingBank, setGeneratingBank] = useState(false);

  const handleSubmitFunding = async () => {
    setSubmitting(true);
    try {
      await submitFunding(pkg.id);
      onUpdated();
    } catch (err) {
      console.error("Submit funding failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestMilestone = async (milestone) => {
    setRequestingMilestone(milestone);
    try {
      await requestMilestonePayment(pkg.id, milestone);
      onUpdated();
    } catch (err) {
      console.error("Milestone request failed:", err);
    } finally {
      setRequestingMilestone(null);
    }
  };

  const handleGenerateBankability = async () => {
    setGeneratingBank(true);
    try {
      await generateBankabilityPackage(pkg.projectId, pkg.id);
      onUpdated();
    } catch (err) {
      console.error("Bankability generation failed:", err);
    } finally {
      setGeneratingBank(false);
    }
  };

  return (
    <div className="card border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[pkg.status] || "bg-gray-100 text-gray-600"}`}
            >
              {FUNDING_STATUS_LABELS[pkg.status] || pkg.status}
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {FUNDING_TYPES[pkg.type] || pkg.type}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {pkg.provider}
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            {pkg.funding_amount > 0 && (
              <span className="inline-flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(pkg.funding_amount)}
              </span>
            )}
            <span>Project: {pkg.projectId?.slice(0, 8)}...</span>
            <span>Created {formatDate(pkg.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Submit button — only show when documents are ready */}
          {(pkg.status === "preparing" || pkg.status === "documents_ready") && (
            <button
              onClick={handleSubmitFunding}
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
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            {expanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {/* Document readiness */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
              Document Readiness
            </h4>
            <DocumentChecklist packageId={pkg.id} />
          </div>

          {/* Milestone payments */}
          {pkg.milestone_payments?.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
                Milestone Payments
              </h4>
              <div className="space-y-2">
                {pkg.milestone_payments.map((ms, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${MILESTONE_STATUS_COLORS[ms.status] || "bg-gray-100 text-gray-500"}`}
                      >
                        {ms.status}
                      </span>
                      <span className="text-sm text-gray-700">
                        {ms.milestone?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ms.amount > 0 && (
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(ms.amount)}
                        </span>
                      )}
                      {ms.status === "pending" && pkg.status === "funded" && (
                        <button
                          onClick={() => handleRequestMilestone(ms.milestone)}
                          disabled={requestingMilestone === ms.milestone}
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          {requestingMilestone === ms.milestone ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Banknote className="h-3 w-3" />
                          )}
                          Request
                        </button>
                      )}
                      {ms.paid_at && (
                        <span className="text-xs text-gray-400">
                          Paid {formatDate(ms.paid_at)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bankability package generation */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-400">
                Bankability Package
              </h4>
              <p className="text-xs text-gray-500">
                P50/P90 estimates, financials, compliance
              </p>
            </div>
            <button
              onClick={handleGenerateBankability}
              disabled={generatingBank}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {generatingBank ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Package className="h-3 w-3" />
              )}
              Generate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardFunding() {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Load projects for the create modal
      const projectSnap = await getDocs(
        query(
          collection(db, "projects"),
          where("assignedTo", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(50),
        ),
      );
      const projectList = projectSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setProjects(projectList);

      // Load all funding packages for user's projects
      if (projectList.length > 0) {
        const projectIds = projectList.map((p) => p.id).slice(0, 30);
        const fundingSnap = await getDocs(
          query(
            collection(db, "funding_packages"),
            where("projectId", "in", projectIds),
            orderBy("created_at", "desc"),
          ),
        );
        setPackages(fundingSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } else {
        setPackages([]);
      }
    } catch (err) {
      console.error("Failed to load funding data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group packages by status
  const active = packages.filter((p) =>
    ["preparing", "documents_ready", "submitted", "under_review"].includes(
      p.status,
    ),
  );
  const completed = packages.filter((p) =>
    ["approved", "funded"].includes(p.status),
  );
  const rejected = packages.filter((p) => p.status === "rejected");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Funding</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            New Package
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="card border border-gray-200 p-3 text-center">
          <FileText className="mx-auto h-5 w-5 text-gray-400" />
          <p className="mt-1 text-lg font-bold text-gray-900">
            {packages.length}
          </p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="card border border-gray-200 p-3 text-center">
          <Clock className="mx-auto h-5 w-5 text-amber-400" />
          <p className="mt-1 text-lg font-bold text-gray-900">
            {active.length}
          </p>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
        <div className="card border border-gray-200 p-3 text-center">
          <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
          <p className="mt-1 text-lg font-bold text-gray-900">
            {completed.length}
          </p>
          <p className="text-xs text-gray-500">Funded</p>
        </div>
        <div className="card border border-gray-200 p-3 text-center">
          <TrendingUp className="mx-auto h-5 w-5 text-blue-500" />
          <p className="mt-1 text-lg font-bold text-gray-900">
            {formatCurrency(
              completed.reduce((sum, p) => sum + (p.funding_amount || 0), 0),
            )}
          </p>
          <p className="text-xs text-gray-500">Total Funded</p>
        </div>
      </div>

      {/* Package list */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="py-12 text-center">
          <DollarSign className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No funding packages yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Create First Package
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active packages first */}
          {active.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-500">
                Active ({active.length})
              </h2>
              <div className="space-y-3">
                {active.map((pkg) => (
                  <FundingPackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onUpdated={loadData}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-500">
                Funded ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map((pkg) => (
                  <FundingPackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onUpdated={loadData}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rejected */}
          {rejected.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-500">
                Rejected ({rejected.length})
              </h2>
              <div className="space-y-3">
                {rejected.map((pkg) => (
                  <FundingPackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onUpdated={loadData}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateFundingModal
          projects={projects}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
