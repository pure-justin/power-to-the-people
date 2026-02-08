import { useState, useEffect, useCallback } from "react";
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
  addDoc,
  serverTimestamp,
} from "../../services/firebase";
import {
  Search,
  Plus,
  X,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Filter,
  SortAsc,
  Calendar,
  DollarSign,
  User,
  Star,
} from "lucide-react";

const STAGES = [
  {
    value: "new",
    label: "New",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  {
    value: "contacted",
    label: "Contacted",
    color: "bg-indigo-100 text-indigo-700",
    dot: "bg-indigo-500",
  },
  {
    value: "qualified",
    label: "Qualified",
    color: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  {
    value: "site_survey",
    label: "Site Survey",
    color: "bg-cyan-100 text-cyan-700",
    dot: "bg-cyan-500",
  },
  {
    value: "proposal",
    label: "Proposal",
    color: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  {
    value: "negotiation",
    label: "Negotiation",
    color: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  {
    value: "contract",
    label: "Contract",
    color: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
  {
    value: "won",
    label: "Won",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "lost",
    label: "Lost",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
];

function LeadDetailDrawer({ lead, onClose, onUpdate }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  if (!lead) return null;

  const stage = STAGES.find((s) => s.value === lead.status) || STAGES[0];

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const leadRef = doc(db, "leads", lead.id);
      const notes = [...(lead.notes || [])];
      notes.push({
        text: note,
        createdAt: new Date().toISOString(),
        author: "sales",
      });
      await updateDoc(leadRef, { notes, updatedAt: serverTimestamp() });
      onUpdate({ ...lead, notes });
      setNote("");
    } catch (err) {
      console.error("Failed to add note:", err);
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

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {lead.customerName || lead.name || "Lead Details"}
              </h2>
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${stage.color}`}
              >
                {stage.label}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-4 border-b -mb-px">
            {["details", "notes", "history"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 pb-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Contact</h3>
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600"
                  >
                    <Mail className="h-4 w-4" /> {lead.email}
                  </a>
                )}
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600"
                  >
                    <Phone className="h-4 w-4" /> {lead.phone}
                  </a>
                )}
                {lead.address && (
                  <p className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" /> {lead.address}
                  </p>
                )}
              </div>

              {/* Score */}
              {lead.score !== undefined && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Lead Score
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
                      <span
                        className={`text-xl font-bold ${
                          lead.score >= 80
                            ? "text-green-600"
                            : lead.score >= 60
                              ? "text-emerald-600"
                              : lead.score >= 40
                                ? "text-amber-600"
                                : "text-red-600"
                        }`}
                      >
                        {lead.score}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {lead.grade || "Ungraded"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {lead.score >= 80
                          ? "Hot lead"
                          : lead.score >= 60
                            ? "Warm lead"
                            : lead.score >= 40
                              ? "Cool lead"
                              : "Cold lead"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Estimated Value */}
              {lead.estimatedValue && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">
                    Estimated Value
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    ${lead.estimatedValue.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Status Pipeline */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Move to Stage
                </h3>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => updateStatus(s.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        lead.status === s.value
                          ? s.color + " ring-2 ring-offset-1"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="btn-primary flex-1 justify-center gap-2 text-sm"
                  >
                    <Phone className="h-4 w-4" /> Call
                  </a>
                )}
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="btn-secondary flex-1 justify-center gap-2 text-sm"
                  >
                    <Mail className="h-4 w-4" /> Email
                  </a>
                )}
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                  placeholder="Add a note..."
                  className="input-field flex-1"
                />
                <button
                  onClick={addNote}
                  disabled={saving || !note.trim()}
                  className="btn-primary px-3"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {(lead.notes || [])
                  .slice()
                  .reverse()
                  .map((n, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600"
                    >
                      <p>{n.text}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleString()
                          : ""}
                        {n.author ? ` - ${n.author}` : ""}
                      </p>
                    </div>
                  ))}
                {(!lead.notes || lead.notes.length === 0) && (
                  <p className="py-8 text-center text-sm text-gray-400">
                    No notes yet. Add one above.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <p className="font-medium">Lead Created</p>
                <p className="text-xs text-gray-400">
                  {lead.createdAt?.toDate
                    ? lead.createdAt.toDate().toLocaleString()
                    : "Unknown"}
                </p>
              </div>
              {lead.updatedAt && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                  <p className="font-medium">Last Updated</p>
                  <p className="text-xs text-gray-400">
                    {lead.updatedAt?.toDate
                      ? lead.updatedAt.toDate().toLocaleString()
                      : "Unknown"}
                  </p>
                </div>
              )}
              {lead.source && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                  <p className="font-medium">Source</p>
                  <p className="text-xs text-gray-400">{lead.source}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SalesLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "kanban"

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
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLeads(data);
        setFilteredLeads(data);
      } catch (err) {
        console.error("Failed to load leads:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    let filtered = leads;
    if (statusFilter !== "all") {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          (l.customerName || l.name || "").toLowerCase().includes(s) ||
          (l.email || "").toLowerCase().includes(s) ||
          (l.phone || "").includes(s) ||
          (l.address || "").toLowerCase().includes(s),
      );
    }
    setFilteredLeads(filtered);
  }, [leads, search, statusFilter]);

  const handleLeadUpdate = (updated) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
  };

  const getStageStyle = (status) => {
    const stage = STAGES.find((s) => s.value === status);
    return stage?.color || "bg-gray-100 text-gray-700";
  };

  const getStageDot = (status) => {
    const stage = STAGES.find((s) => s.value === status);
    return stage?.dot || "bg-gray-400";
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 rounded-lg bg-gray-100" />
          <div className="h-10 w-28 rounded-lg bg-gray-100" />
        </div>
        <div className="h-10 w-full rounded-lg bg-gray-100" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
          <p className="text-sm text-gray-500">
            {leads.length} total leads assigned to you
          </p>
        </div>
        <button className="btn-primary gap-2">
          <Plus className="h-4 w-4" /> Add Lead
        </button>
      </div>

      {/* Kanban Stage Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter("all")}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({leads.length})
        </button>
        {STAGES.map((s) => {
          const count = leads.filter((l) => l.status === s.value).length;
          return (
            <button
              key={s.value}
              onClick={() =>
                setStatusFilter(statusFilter === s.value ? "all" : s.value)
              }
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s.value
                  ? s.color + " ring-2 ring-offset-1"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="input-field pl-9"
          />
        </div>
        <span className="text-sm text-gray-500">
          {filteredLeads.length} results
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Name
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-500 sm:table-cell">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Stage
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-500 md:table-cell">
                  Score
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-500 lg:table-cell">
                  Value
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-500 lg:table-cell">
                  Created
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">
                          {lead.customerName || lead.name || "Unnamed"}
                        </p>
                        <p className="truncate text-xs text-gray-500 sm:hidden">
                          {lead.email || lead.phone || ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="min-w-0">
                      <p className="truncate text-gray-600">
                        {lead.email || "--"}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {lead.phone || ""}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStageStyle(lead.status)}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${getStageDot(lead.status)}`}
                      />
                      {STAGES.find((s) => s.value === lead.status)?.label ||
                        lead.status ||
                        "New"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {lead.score !== undefined ? (
                      <span
                        className={`font-medium ${
                          lead.score >= 80
                            ? "text-green-600"
                            : lead.score >= 60
                              ? "text-emerald-600"
                              : lead.score >= 40
                                ? "text-amber-600"
                                : "text-red-600"
                        }`}
                      >
                        {lead.score}
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {lead.estimatedValue ? (
                      <span className="font-medium text-gray-700">
                        ${lead.estimatedValue.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                    {lead.createdAt?.toDate
                      ? lead.createdAt.toDate().toLocaleDateString()
                      : "--"}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    {search || statusFilter !== "all"
                      ? "No leads match your filters."
                      : "No leads assigned yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
        />
      )}
    </div>
  );
}
