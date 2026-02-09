import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
} from "../../services/firebase";
import { Search, PieChart } from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

export default function AdminProjects() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});

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

  // Status distribution
  const statusCounts = useMemo(() => {
    const counts = {};
    projects.forEach((p) => {
      const s = p.status || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const filterDefs = useMemo(() => {
    const statuses = [
      ...new Set(projects.map((p) => p.status || "unknown").filter(Boolean)),
    ].sort();
    const installers = [
      ...new Set(projects.map((p) => p.installer).filter(Boolean)),
    ].sort();
    return [
      { key: "status", label: "Status", options: statuses },
      { key: "installer", label: "Installer", options: installers },
    ];
  }, [projects]);

  const filtered = useMemo(() => {
    let result = projects;
    // Text search
    const term = searchTerm.toLowerCase();
    if (term) {
      result = result.filter(
        (p) =>
          (p.customerName || "").toLowerCase().includes(term) ||
          (p.installer || "").toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term),
      );
    }
    // FilterBar filters
    if (filters.status) {
      result = result.filter((p) => (p.status || "unknown") === filters.status);
    }
    if (filters.installer) {
      result = result.filter((p) => p.installer === filters.installer);
    }
    return result;
  }, [projects, searchTerm, filters]);

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "Project",
        sortable: true,
        render: (val) => (
          <span className="font-semibold text-gray-900">{val}</span>
        ),
      },
      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (val) => <span className="text-gray-600">{val || "N/A"}</span>,
      },
      {
        key: "installer",
        label: "Installer",
        sortable: true,
        render: (val) => (
          <span className="text-gray-600">{val || "Unassigned"}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val) => (
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(val)}`}
          >
            {val || "unknown"}
          </span>
        ),
      },
      {
        key: "systemSize",
        label: "System Size",
        sortable: true,
        render: (val) => (
          <span className="text-gray-700">{val ? `${val} kW` : "N/A"}</span>
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (val) => (
          <span className="text-gray-400">{formatDate(val)}</span>
        ),
      },
    ],
    [],
  );

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
                setFilters((prev) =>
                  prev.status === status
                    ? { ...prev, status: undefined }
                    : { ...prev, status },
                )
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
        </div>

        <FilterBar
          filters={filterDefs}
          activeFilters={filters}
          onChange={setFilters}
        />

        <p className="text-sm text-gray-500 my-4">
          {filtered.length} project{filtered.length !== 1 ? "s" : ""}
        </p>

        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No projects found. Try adjusting your search or filters."
        />
      </div>
    </div>
  );
}
