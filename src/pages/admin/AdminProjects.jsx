import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
} from "../../services/firebase";
import { FolderKanban, Search, PieChart } from "lucide-react";

export default function AdminProjects() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const ref = collection(db, "projects");
      const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (p.customerName || "").toLowerCase().includes(term) ||
      (p.installer || "").toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Status distribution
  const statusCounts = {};
  projects.forEach((p) => {
    const s = p.status || "unknown";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    const map = {
      submitted: "bg-blue-100 text-blue-700",
      reviewing: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      scheduled: "bg-purple-100 text-purple-700",
      completed: "bg-emerald-100 text-emerald-800",
      cancelled: "bg-red-100 text-red-700",
      in_progress: "bg-cyan-100 text-cyan-700",
    };
    return map[s] || "bg-gray-100 text-gray-600";
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <PieChart size={20} className="text-purple-500" />
          Status Distribution
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className="text-center p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
              onClick={() =>
                setStatusFilter(statusFilter === status ? "all" : status)
              }
            >
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold capitalize mb-2 ${statusBadge(status)}`}
              >
                {status}
              </span>
              <p className="text-2xl font-extrabold text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search projects..."
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
            {Object.keys(statusCounts).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {filtered.length} project{filtered.length !== 1 ? "s" : ""}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <FolderKanban size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No projects found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Project
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Installer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    System Size
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {p.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {p.customerName || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {p.installer || "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(p.status)}`}
                      >
                        {p.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {p.systemSize ? `${p.systemSize} kW` : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(p.createdAt)}
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
