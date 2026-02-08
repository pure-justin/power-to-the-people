import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
} from "../../services/firebase";
import {
  Search,
  Filter,
  Download,
  Users,
  BarChart3,
  UserPlus,
} from "lucide-react";

export default function AdminLeads() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [assignTo, setAssignTo] = useState("");

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const leadsRef = collection(db, "leads");
      const snap = await getDocs(query(leadsRef, orderBy("createdAt", "desc")));
      setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = leads.filter((l) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (l.customerName || l.name || "").toLowerCase().includes(term) ||
      (l.email || "").toLowerCase().includes(term) ||
      (l.phone || "").includes(term);
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadge = (status) => {
    const s = (status || "new").toLowerCase();
    const colors = {
      new: "bg-blue-100 text-blue-700",
      qualified: "bg-amber-100 text-amber-700",
      proposal: "bg-purple-100 text-purple-700",
      won: "bg-green-100 text-green-700",
      lost: "bg-red-100 text-red-700",
      contacted: "bg-cyan-100 text-cyan-700",
    };
    return colors[s] || "bg-gray-100 text-gray-600";
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  const handleExportCSV = () => {
    const rows = [
      ["Name", "Email", "Phone", "Status", "Score", "Assigned To", "Created"],
      ...filtered.map((l) => [
        l.customerName || l.name || "",
        l.email || "",
        l.phone || "",
        l.status || "new",
        l.score || 0,
        l.assignedTo || "",
        formatDate(l.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filtered.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filtered.map((l) => l.id));
    }
  };

  // Score histogram data
  const scoreRanges = [
    { label: "0-20", min: 0, max: 20 },
    { label: "21-40", min: 21, max: 40 },
    { label: "41-60", min: 41, max: 60 },
    { label: "61-80", min: 61, max: 80 },
    { label: "81-100", min: 81, max: 100 },
  ];
  const scoreCounts = scoreRanges.map(
    (r) =>
      leads.filter((l) => (l.score || 0) >= r.min && (l.score || 0) <= r.max)
        .length,
  );
  const maxScoreCount = Math.max(...scoreCounts, 1);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-3" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Histogram */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-500" />
          Lead Score Distribution
        </h3>
        <div className="flex items-end gap-3 h-32">
          {scoreRanges.map((r, i) => (
            <div
              key={r.label}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs font-bold text-gray-700">
                {scoreCounts[i]}
              </span>
              <div
                className="w-full bg-blue-400 rounded-t-md transition-all"
                style={{
                  height: `${(scoreCounts[i] / maxScoreCount) * 100}%`,
                  minHeight: scoreCounts[i] > 0 ? "8px" : "2px",
                }}
              />
              <span className="text-xs text-gray-500">{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          {selectedLeads.length > 0 && (
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">Bulk Assign ({selectedLeads.length})</option>
              <option value="unassigned">Unassign</option>
            </select>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {filtered.length} lead{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No leads found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedLeads.length === filtered.length &&
                        filtered.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Score
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Assigned To
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(l.id)}
                        onChange={() => toggleSelect(l.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {l.customerName || l.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {l.email || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {l.phone || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(l.status)}`}
                      >
                        {l.status || "new"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-gray-900">
                        {l.score || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {l.assignedTo || "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(l.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
