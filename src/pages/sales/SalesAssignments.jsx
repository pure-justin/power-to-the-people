import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  updateDoc,
  serverTimestamp,
} from "../../services/firebase";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  PhoneCall,
  FileText,
  Plus,
} from "lucide-react";

const ACTIVE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "site_survey",
  "proposal",
  "negotiation",
  "contract",
];

const STAGE_LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  site_survey: "Site Survey",
  proposal: "Proposal",
  negotiation: "Negotiation",
  contract: "Contract",
};

const STAGE_COLORS = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-indigo-100 text-indigo-700",
  qualified: "bg-emerald-100 text-emerald-700",
  site_survey: "bg-cyan-100 text-cyan-700",
  proposal: "bg-amber-100 text-amber-700",
  negotiation: "bg-orange-100 text-orange-700",
  contract: "bg-purple-100 text-purple-700",
};

function getTimeSince(date) {
  if (!date) return "Unknown";
  const now = Date.now();
  const ts = date instanceof Date ? date.getTime() : date.toDate().getTime();
  const diffMs = now - ts;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function getUrgency(lead) {
  if (lead.status === "new") return "high";
  const updated = lead.updatedAt?.toDate
    ? lead.updatedAt.toDate()
    : lead.createdAt?.toDate
      ? lead.createdAt.toDate()
      : null;
  if (!updated) return "medium";
  const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 7) return "overdue";
  if (daysSince > 3) return "high";
  if (daysSince > 1) return "medium";
  return "low";
}

function LeadCard({ lead, onSelect }) {
  const urgency = getUrgency(lead);
  const lastActivity = lead.updatedAt || lead.createdAt;
  const lastNote =
    lead.notes && lead.notes.length > 0
      ? lead.notes[lead.notes.length - 1]
      : null;

  return (
    <div
      onClick={() => onSelect(lead)}
      className={`card-padded cursor-pointer transition-all hover:shadow-md ${
        urgency === "overdue"
          ? "border-l-4 border-l-red-500"
          : urgency === "high"
            ? "border-l-4 border-l-amber-500"
            : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {lead.customerName || lead.name || "Unnamed"}
            </h3>
            {urgency === "overdue" && (
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.status] || "bg-gray-100 text-gray-700"}`}
            >
              {STAGE_LABELS[lead.status] || lead.status}
            </span>
            {lead.score !== undefined && (
              <span className="font-medium">Score: {lead.score}</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
      </div>

      {/* Contact Info */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {lead.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" /> {lead.phone}
          </span>
        )}
        {lead.email && (
          <span className="flex items-center gap-1 truncate">
            <Mail className="h-3 w-3" /> {lead.email}
          </span>
        )}
        {lead.address && (
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3" /> {lead.address}
          </span>
        )}
      </div>

      {/* Last Activity + Next Action */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {lastActivity ? getTimeSince(lastActivity) : "No activity"}
        </span>
        {lastNote && (
          <span className="flex items-center gap-1 truncate text-xs text-gray-400">
            <MessageSquare className="h-3 w-3" />
            <span className="max-w-[180px] truncate">{lastNote.text}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function ActionDrawer({ lead, onClose, onUpdate }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const addNoteAndLog = async (actionType) => {
    setSaving(true);
    try {
      const leadRef = doc(db, "leads", lead.id);
      const notes = [...(lead.notes || [])];
      const text = note.trim()
        ? `[${actionType}] ${note}`
        : `[${actionType}] Action logged`;
      notes.push({
        text,
        createdAt: new Date().toISOString(),
        author: "sales",
        type: actionType,
      });
      await updateDoc(leadRef, { notes, updatedAt: serverTimestamp() });
      onUpdate({ ...lead, notes });
      setNote("");
    } catch (err) {
      console.error("Failed to log action:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      const leadRef = doc(db, "leads", lead.id);
      await updateDoc(leadRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      onUpdate({ ...lead, status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const nextStageIndex = ACTIVE_STAGES.indexOf(lead.status);
  const nextStage =
    nextStageIndex >= 0 && nextStageIndex < ACTIVE_STAGES.length - 1
      ? ACTIVE_STAGES[nextStageIndex + 1]
      : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {lead.customerName || lead.name || "Lead"}
            </h2>
            <p className="text-sm text-gray-500">
              {STAGE_LABELS[lead.status] || lead.status}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Quick Contact Actions */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  onClick={() => addNoteAndLog("call")}
                  className="btn-primary justify-center gap-2 text-sm"
                >
                  <PhoneCall className="h-4 w-4" /> Call
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  onClick={() => addNoteAndLog("email")}
                  className="btn-secondary justify-center gap-2 text-sm"
                >
                  <Mail className="h-4 w-4" /> Email
                </a>
              )}
              <button
                onClick={() => addNoteAndLog("visit")}
                className="btn-secondary justify-center gap-2 text-sm"
              >
                <MapPin className="h-4 w-4" /> Site Visit
              </button>
              <button
                onClick={() => addNoteAndLog("proposal")}
                className="btn-secondary justify-center gap-2 text-sm"
              >
                <FileText className="h-4 w-4" /> Proposal
              </button>
            </div>
          </div>

          {/* Advance Stage */}
          {nextStage && (
            <div>
              <button
                onClick={() => updateStatus(nextStage)}
                className="w-full rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-100"
              >
                <ArrowUpRight className="mr-1 inline h-4 w-4" />
                Advance to {STAGE_LABELS[nextStage]}
              </button>
            </div>
          )}

          {/* Add Note */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">Add Note</h3>
            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNoteAndLog("note")}
                placeholder="What happened?"
                className="input-field flex-1"
              />
              <button
                onClick={() => addNoteAndLog("note")}
                disabled={saving}
                className="btn-primary px-3"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Contact History */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              Contact History
            </h3>
            <div className="space-y-2">
              {(lead.notes || [])
                .slice()
                .reverse()
                .map((n, i) => {
                  const isAction = n.text?.startsWith("[");
                  return (
                    <div key={i} className="rounded-lg bg-gray-50 p-3 text-sm">
                      <p className="text-gray-600">{n.text}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleString()
                          : ""}
                      </p>
                    </div>
                  );
                })}
              {(!lead.notes || lead.notes.length === 0) && (
                <p className="py-6 text-center text-sm text-gray-400">
                  No contact history yet.
                </p>
              )}
            </div>
          </div>

          {/* Mark Lost */}
          <div className="border-t pt-4">
            <button
              onClick={() => updateStatus("lost")}
              className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              Mark as Lost
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SalesAssignments() {
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [sortBy, setSortBy] = useState("urgency"); // "urgency" | "newest" | "score"
  const [showFilter, setShowFilter] = useState("active"); // "active" | "all" | "overdue"

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "leads"),
          where("assignedTo", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(500),
        );
        const snap = await getDocs(q);
        setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load assignments:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleUpdate = (updated) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
  };

  // Filter
  let displayLeads = leads;
  if (showFilter === "active") {
    displayLeads = leads.filter((l) => ACTIVE_STAGES.includes(l.status));
  } else if (showFilter === "overdue") {
    displayLeads = leads.filter((l) => getUrgency(l) === "overdue");
  }

  // Sort
  displayLeads = [...displayLeads].sort((a, b) => {
    if (sortBy === "urgency") {
      const urgencyOrder = { overdue: 0, high: 1, medium: 2, low: 3 };
      return (
        (urgencyOrder[getUrgency(a)] ?? 4) - (urgencyOrder[getUrgency(b)] ?? 4)
      );
    }
    if (sortBy === "score") {
      return (b.score || 0) - (a.score || 0);
    }
    // newest
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return bTime - aTime;
  });

  const activeCount = leads.filter((l) =>
    ACTIVE_STAGES.includes(l.status),
  ).length;
  const overdueCount = leads.filter((l) => getUrgency(l) === "overdue").length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Leads assigned to you with contact history and next actions.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={() => setShowFilter("active")}
          className={`card-padded text-left transition-colors ${showFilter === "active" ? "ring-2 ring-emerald-500" : ""}`}
        >
          <p className="text-sm text-gray-500">Active Leads</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{activeCount}</p>
        </button>
        <button
          onClick={() => setShowFilter("overdue")}
          className={`card-padded text-left transition-colors ${showFilter === "overdue" ? "ring-2 ring-red-500" : ""}`}
        >
          <p className="text-sm text-gray-500">Overdue (7+ days)</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{overdueCount}</p>
        </button>
        <button
          onClick={() => setShowFilter("all")}
          className={`card-padded text-left transition-colors ${showFilter === "all" ? "ring-2 ring-gray-500" : ""}`}
        >
          <p className="text-sm text-gray-500">Total Assigned</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {leads.length}
          </p>
        </button>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Sort by:</span>
        {[
          { value: "urgency", label: "Urgency" },
          { value: "newest", label: "Newest" },
          { value: "score", label: "Score" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
              sortBy === opt.value
                ? "bg-emerald-100 text-emerald-700"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400">
          {displayLeads.length} leads
        </span>
      </div>

      {/* Lead Cards */}
      {displayLeads.length === 0 ? (
        <div className="card-padded py-12 text-center">
          <User className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {showFilter === "overdue"
              ? "No overdue leads. You are on top of things."
              : "No leads assigned to you yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onSelect={setSelectedLead} />
          ))}
        </div>
      )}

      {/* Action Drawer */}
      {selectedLead && (
        <ActionDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
