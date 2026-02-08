import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from "../../services/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Link } from "react-router-dom";
import {
  Search,
  Store,
  Briefcase,
  Gavel,
  Users,
  Clock,
  DollarSign,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  Send,
  Award,
  Filter,
  Zap,
} from "lucide-react";

const functions = getFunctions(undefined, "us-central1");

const SERVICE_TYPE_LABELS = {
  cad_design: "CAD Design",
  engineering_stamp: "Engineering Stamp",
  permit_submission: "Permit Submission",
  site_survey: "Site Survey",
  hoa_approval: "HOA Approval",
  installation: "Installation",
  inspection: "Inspection",
  electrical: "Electrical",
  roofing: "Roofing",
  trenching: "Trenching",
  battery_install: "Battery Install",
  panel_upgrade: "Panel Upgrade",
  monitoring_setup: "Monitoring Setup",
  maintenance: "Maintenance",
  other: "Other",
};

const STATUS_COLORS = {
  open: "bg-emerald-100 text-emerald-700",
  assigned: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

const BID_STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function formatDate(ts) {
  if (!ts) return "N/A";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(val) {
  if (val == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(val);
}

// ---- Bid Submission Modal ----
function BidModal({ listing, onClose, onSubmitted }) {
  const [price, setPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [notes, setNotes] = useState("");
  const [certs, setCerts] = useState({
    nabcep: false,
    licensed_electrician: false,
    licensed_roofer: false,
    pe_stamp: false,
    osha_30: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const selectedCerts = Object.entries(certs)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const submitBidFn = httpsCallable(functions, "submitBid");
      await submitBidFn({
        listing_id: listing.id,
        price: parseFloat(price),
        timeline: timeline || null,
        notes,
        certifications: selectedCerts,
      });

      onSubmitted();
    } catch (err) {
      setError(err.message || "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Submit Bid</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-500">
          {SERVICE_TYPE_LABELS[listing.service_type] || listing.service_type}
          {listing.budget && (
            <span className="ml-2">
              | Budget: {formatCurrency(listing.budget.min)} -{" "}
              {formatCurrency(listing.budget.max)}
            </span>
          )}
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Your Price ($) *
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 500"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Timeline
            </label>
            <input
              type="text"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="e.g., 3-5 business days"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe your approach, experience, or any questions..."
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Certifications
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(certs).map(([key, checked]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setCerts((c) => ({ ...c, [key]: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">
                    {key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
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
              disabled={submitting || !price}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Bid
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Create Listing Modal ----
function CreateListingModal({ onClose, onCreated }) {
  const [serviceType, setServiceType] = useState("cad_design");
  const [requirements, setRequirements] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [state, setState] = useState("");
  const [systemSize, setSystemSize] = useState("");
  const [roofType, setRoofType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const createFn = httpsCallable(functions, "createMarketplaceListing");
      await createFn({
        service_type: serviceType,
        requirements,
        deliverables: deliverables
          ? deliverables.split("\n").filter(Boolean)
          : [],
        budget:
          budgetMin && budgetMax
            ? { min: parseFloat(budgetMin), max: parseFloat(budgetMax) }
            : null,
        deadline: deadline || null,
        project_context: {
          state: state || null,
          system_size_kw: systemSize ? parseFloat(systemSize) : null,
          roof_type: roofType || null,
        },
      });

      onCreated();
    } catch (err) {
      setError(err.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50">
      <div className="my-8 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Post New Job Listing
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
              Service Type *
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="input-field"
            >
              {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Requirements *
            </label>
            <textarea
              required
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={3}
              placeholder="Describe what you need done..."
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Deliverables (one per line)
            </label>
            <textarea
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              rows={2}
              placeholder="CAD plan set&#10;Structural analysis report"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Budget Min ($)
              </label>
              <input
                type="number"
                min="0"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="200"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Budget Max ($)
              </label>
              <input
                type="number"
                min="0"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="800"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="TX"
                maxLength={2}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                System kW
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={systemSize}
                onChange={(e) => setSystemSize(e.target.value)}
                placeholder="8.4"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Roof Type
              </label>
              <select
                value={roofType}
                onChange={(e) => setRoofType(e.target.value)}
                className="input-field"
              >
                <option value="">Any</option>
                <option value="composition">Composition</option>
                <option value="tile">Tile</option>
                <option value="metal">Metal</option>
                <option value="flat">Flat</option>
                <option value="cedar">Cedar</option>
              </select>
            </div>
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
              disabled={submitting || !requirements}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Post Listing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Listing Card ----
function ListingCard({ listing, onBid, isOwn }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              {SERVICE_TYPE_LABELS[listing.service_type] ||
                listing.service_type}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[listing.status] || "bg-gray-100 text-gray-600"}`}
            >
              {listing.status}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-700 line-clamp-2">
            {listing.requirements}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            {listing.project_context?.state && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {listing.project_context.state}
                {listing.project_context.jurisdiction &&
                  ` / ${listing.project_context.jurisdiction}`}
              </span>
            )}
            {listing.project_context?.system_size_kw && (
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {listing.project_context.system_size_kw} kW
              </span>
            )}
            {listing.budget && (
              <span className="inline-flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(listing.budget.min)} -{" "}
                {formatCurrency(listing.budget.max)}
              </span>
            )}
            {listing.deadline && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due {formatDate(listing.deadline)}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Gavel className="h-3 w-3" />
              {listing.bid_count || 0} bid{listing.bid_count !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
          {listing.status === "open" && !isOwn && (
            <button
              onClick={() => onBid(listing)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <Send className="h-3 w-3" />
              Submit Bid
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
        <div className="mt-4 border-t border-gray-100 pt-3">
          {listing.deliverables?.length > 0 && (
            <div className="mb-3">
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
                Deliverables
              </h4>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-gray-600">
                {listing.deliverables.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {listing.project_context && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
                Project Context
              </h4>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                {listing.project_context.roof_type && (
                  <span className="rounded bg-gray-100 px-2 py-0.5">
                    Roof: {listing.project_context.roof_type}
                  </span>
                )}
                {listing.project_context.panel_count && (
                  <span className="rounded bg-gray-100 px-2 py-0.5">
                    {listing.project_context.panel_count} panels
                  </span>
                )}
                {listing.project_context.stories && (
                  <span className="rounded bg-gray-100 px-2 py-0.5">
                    {listing.project_context.stories} story
                  </span>
                )}
                {listing.project_context.battery && (
                  <span className="rounded bg-gray-100 px-2 py-0.5">
                    Battery: Yes
                  </span>
                )}
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Posted {formatDate(listing.posted_at)}
          </p>
        </div>
      )}
    </div>
  );
}

// ---- Bid Review Panel ----
function BidReviewPanel({ listingId, onAccepted }) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    const loadBids = async () => {
      try {
        const q = query(
          collection(db, "marketplace_bids"),
          where("listing_id", "==", listingId),
          orderBy("price", "asc"),
        );
        const snap = await getDocs(q);
        setBids(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load bids:", err);
      } finally {
        setLoading(false);
      }
    };
    loadBids();
  }, [listingId]);

  const handleAccept = async (bidId) => {
    setAccepting(bidId);
    try {
      const acceptFn = httpsCallable(functions, "acceptBid");
      await acceptFn({ listing_id: listingId, bid_id: bidId });
      onAccepted();
    } catch (err) {
      console.error("Failed to accept bid:", err);
    } finally {
      setAccepting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading bids...
      </div>
    );
  }

  if (bids.length === 0) {
    return <p className="py-4 text-sm text-gray-400">No bids yet</p>;
  }

  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      <h4 className="text-xs font-semibold uppercase text-gray-400">
        Bids ({bids.length})
      </h4>
      {bids.map((bid) => (
        <div
          key={bid.id}
          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(bid.price)}
              {bid.timeline && (
                <span className="ml-2 text-xs text-gray-500">
                  | {bid.timeline}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {bid.bidder?.displayName || bid.bidder?.email || "Anonymous"}
              {bid.certifications?.length > 0 && (
                <span className="ml-1">
                  | {bid.certifications.length} cert(s)
                </span>
              )}
            </p>
            {bid.notes && (
              <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                {bid.notes}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${BID_STATUS_COLORS[bid.status] || "bg-gray-100 text-gray-600"}`}
            >
              {bid.status}
            </span>
            {bid.status === "pending" && (
              <button
                onClick={() => handleAccept(bid.id)}
                disabled={accepting === bid.id}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {accepting === bid.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                Accept
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Worker Card ----
function WorkerCard({ worker }) {
  return (
    <Link
      to={`/dashboard/workers/${worker.id}`}
      className="card block border border-gray-200 p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-gray-900">{worker.name}</h3>
          <p className="text-xs text-gray-500">{worker.email}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            worker.availability === "available"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {worker.availability || "N/A"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {(worker.skills || []).slice(0, 5).map((skill) => (
          <span
            key={skill}
            className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
          >
            {skill.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-400" />
          {worker.ratings?.overall ? worker.ratings.overall.toFixed(1) : "New"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="h-3 w-3" />
          {worker.completed_jobs || 0} jobs
        </span>
        {worker.service_areas?.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {worker.service_areas.slice(0, 3).join(", ")}
          </span>
        )}
      </div>
    </Link>
  );
}

// ---- Main Page ----
export default function DashboardMarketplace() {
  const { user } = useAuth();
  const [tab, setTab] = useState("browse");
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");

  // Worker filters
  const [workerSkillFilter, setWorkerSkillFilter] = useState("");
  const [workerStateFilter, setWorkerStateFilter] = useState("");

  // Modals
  const [bidListing, setBidListing] = useState(null);
  const [showCreateListing, setShowCreateListing] = useState(false);

  // Expanded listing for bid review
  const [reviewListingId, setReviewListingId] = useState(null);

  const loadBrowseListings = useCallback(async () => {
    setLoading(true);
    try {
      let q = query(
        collection(db, "marketplace_listings"),
        where("status", "==", statusFilter),
        orderBy("posted_at", "desc"),
        limit(50),
      );

      const snap = await getDocs(q);
      let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (serviceFilter !== "all") {
        data = data.filter((l) => l.service_type === serviceFilter);
      }

      setListings(data);
    } catch (err) {
      console.error("Failed to load listings:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceFilter]);

  const loadMyListings = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "marketplace_listings"),
        where("posted_by.userId", "==", user.uid),
        orderBy("posted_at", "desc"),
        limit(50),
      );
      const snap = await getDocs(q);
      setMyListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load my listings:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const loadMyBids = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "marketplace_bids"),
        where("bidder.userId", "==", user.uid),
        orderBy("submitted_at", "desc"),
        limit(50),
      );
      const snap = await getDocs(q);
      setMyBids(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load bids:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const searchFn = httpsCallable(functions, "searchWorkers");
      const result = await searchFn({
        skill: workerSkillFilter || undefined,
        state: workerStateFilter || undefined,
        availability: "available",
      });
      setWorkers(result.data.workers || []);
    } catch (err) {
      console.error("Failed to load workers:", err);
    } finally {
      setLoading(false);
    }
  }, [workerSkillFilter, workerStateFilter]);

  useEffect(() => {
    if (tab === "browse") loadBrowseListings();
    else if (tab === "my-listings") loadMyListings();
    else if (tab === "my-bids") loadMyBids();
    else if (tab === "workers") loadWorkers();
  }, [tab, loadBrowseListings, loadMyListings, loadMyBids, loadWorkers]);

  const filteredListings = useMemo(() => {
    if (!searchQuery) return listings;
    const s = searchQuery.toLowerCase();
    return listings.filter(
      (l) =>
        (l.requirements || "").toLowerCase().includes(s) ||
        (l.service_type || "").toLowerCase().includes(s) ||
        (l.project_context?.state || "").toLowerCase().includes(s),
    );
  }, [listings, searchQuery]);

  const tabs = [
    { id: "browse", label: "Browse Jobs", icon: Store },
    { id: "my-listings", label: "My Listings", icon: FileText },
    { id: "my-bids", label: "My Bids", icon: Gavel },
    { id: "workers", label: "Workers", icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
        <button
          onClick={() => setShowCreateListing(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Post Job
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Browse Jobs Tab */}
      {tab === "browse" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search listings..."
                className="input-field pl-9"
              />
            </div>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">All Services</option>
              {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-auto"
            >
              <option value="open">Open</option>
              <option value="assigned">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="py-12 text-center">
              <Store className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No listings found matching your filters
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onBid={setBidListing}
                  isOwn={listing.posted_by?.userId === user?.uid}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Listings Tab */}
      {tab === "my-listings" && (
        <div className="space-y-3">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : myListings.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                You haven't posted any listings yet
              </p>
              <button
                onClick={() => setShowCreateListing(true)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Post Your First Job
              </button>
            </div>
          ) : (
            myListings.map((listing) => (
              <div key={listing.id} className="card border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {SERVICE_TYPE_LABELS[listing.service_type] ||
                          listing.service_type}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[listing.status]}`}
                      >
                        {listing.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                      {listing.requirements}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span>
                        {listing.bid_count || 0} bid
                        {listing.bid_count !== 1 ? "s" : ""}
                      </span>
                      <span>Posted {formatDate(listing.posted_at)}</span>
                    </div>
                  </div>
                  {listing.bid_count > 0 && listing.status === "open" && (
                    <button
                      onClick={() =>
                        setReviewListingId(
                          reviewListingId === listing.id ? null : listing.id,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      <Gavel className="h-3 w-3" />
                      Review Bids
                    </button>
                  )}
                </div>

                {reviewListingId === listing.id && (
                  <BidReviewPanel
                    listingId={listing.id}
                    onAccepted={() => {
                      setReviewListingId(null);
                      loadMyListings();
                    }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* My Bids Tab */}
      {tab === "my-bids" && (
        <div className="space-y-3">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : myBids.length === 0 ? (
            <div className="py-12 text-center">
              <Gavel className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                You haven't submitted any bids yet
              </p>
              <button
                onClick={() => setTab("browse")}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Store className="h-4 w-4" />
                Browse Jobs
              </button>
            </div>
          ) : (
            myBids.map((bid) => (
              <div
                key={bid.id}
                className="card flex items-center justify-between border border-gray-200 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(bid.price)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${BID_STATUS_COLORS[bid.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {bid.status}
                    </span>
                  </div>
                  {bid.timeline && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      Timeline: {bid.timeline}
                    </p>
                  )}
                  {bid.notes && (
                    <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                      {bid.notes}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Submitted {formatDate(bid.submitted_at)}
                  </p>
                </div>
                <div>
                  {bid.status === "accepted" && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                  {bid.status === "rejected" && (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  {bid.status === "pending" && (
                    <Clock className="h-5 w-5 text-amber-400" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Workers Tab */}
      {tab === "workers" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={workerSkillFilter}
              onChange={(e) => setWorkerSkillFilter(e.target.value)}
              placeholder="Filter by skill..."
              className="input-field max-w-xs"
            />
            <input
              value={workerStateFilter}
              onChange={(e) => setWorkerStateFilter(e.target.value)}
              placeholder="State (e.g., TX)"
              maxLength={2}
              className="input-field w-24"
            />
            <button
              onClick={loadWorkers}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              <Filter className="h-4 w-4" />
              Search
            </button>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : workers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No workers found matching your criteria
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {workers.map((worker) => (
                <WorkerCard key={worker.id} worker={worker} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {bidListing && (
        <BidModal
          listing={bidListing}
          onClose={() => setBidListing(null)}
          onSubmitted={() => {
            setBidListing(null);
            loadBrowseListings();
          }}
        />
      )}
      {showCreateListing && (
        <CreateListingModal
          onClose={() => setShowCreateListing(false)}
          onCreated={() => {
            setShowCreateListing(false);
            if (tab === "my-listings") loadMyListings();
            else loadBrowseListings();
          }}
        />
      )}
    </div>
  );
}
