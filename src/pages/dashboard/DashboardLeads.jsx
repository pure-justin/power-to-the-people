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
  Filter,
  ChevronDown,
  X,
  MessageSquare,
  Phone,
  Mail,
} from "lucide-react";

const STAGES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700" },
  {
    value: "contacted",
    label: "Contacted",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    value: "qualified",
    label: "Qualified",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "site_survey",
    label: "Site Survey",
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    value: "proposal",
    label: "Proposal",
    color: "bg-amber-100 text-amber-700",
  },
  {
    value: "negotiation",
    label: "Negotiation",
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "contract",
    label: "Contract",
    color: "bg-purple-100 text-purple-700",
  },
  { value: "won", label: "Won", color: "bg-green-100 text-green-700" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700" },
];

function LeadDrawer({ lead, onClose, onUpdate }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const leadRef = doc(db, "leads", lead.id);
      const notes = lead.notes || [];
      notes.push({
        text: note,
        createdAt: new Date().toISOString(),
        author: "installer",
      });
      await updateDoc(leadRef, { notes });
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
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {lead.customerName || lead.name || "Lead Details"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Contact Info */}
          <div className="space-y-2">
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
              <p className="text-sm text-gray-500">{lead.address}</p>
            )}
          </div>

          {/* Score */}
          {lead.score !== undefined && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Score:</span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  lead.score >= 80
                    ? "bg-green-100 text-green-700"
                    : lead.score >= 60
                      ? "bg-emerald-100 text-emerald-700"
                      : lead.score >= 40
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                }`}
              >
                {lead.score} ({lead.grade || "N/A"})
              </span>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
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

          {/* Notes */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
            <div className="space-y-2 mb-3">
              {(lead.notes || []).map((n, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600"
                >
                  <p>{n.text}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                  </p>
                </div>
              ))}
              {(!lead.notes || lead.notes.length === 0) && (
                <p className="text-sm text-gray-400">No notes yet</p>
              )}
            </div>
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
                disabled={saving}
                className="btn-primary px-3"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DashboardLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "leads"),
          where("assignedTo", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(200),
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
          (l.phone || "").includes(s),
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-64 rounded-lg bg-gray-100" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <button className="btn-primary gap-2">
          <Plus className="h-4 w-4" /> Add Lead
        </button>
      </div>

      {/* Filters */}
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All stages</option>
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          {filteredLeads.length} leads
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
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Phone
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Score
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {lead.customerName || lead.name || "Unnamed"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStageStyle(lead.status)}`}
                    >
                      {lead.status || "new"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.score ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {lead.createdAt?.toDate
                      ? lead.createdAt.toDate().toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    {search || statusFilter !== "all"
                      ? "No leads match your filters"
                      : "No leads yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
        />
      )}
    </div>
  );
}
