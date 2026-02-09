import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
  limit,
} from "../../services/firebase";
import {
  Key,
  Activity,
  Shield,
  Search,
  CheckCircle,
  XCircle,
  BarChart3,
} from "lucide-react";

export default function AdminApiKeys() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    revoked: 0,
    totalCalls: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const keysRef = collection(db, "apiKeys");
      const keysSnap = await getDocs(
        query(keysRef, orderBy("createdAt", "desc")),
      );
      const keys = keysSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setApiKeys(keys);

      // Fetch recent usage logs
      try {
        const logsRef = collection(db, "apiKeyUsageLogs");
        const logsSnap = await getDocs(
          query(logsRef, orderBy("timestamp", "desc"), limit(100)),
        );
        setUsageLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        /* collection may not exist */
      }

      const active = keys.filter((k) => k.status === "active").length;
      const revoked = keys.filter((k) => k.status === "revoked").length;
      const totalCalls = keys.reduce(
        (sum, k) => sum + ((k.usageStats && k.usageStats.totalCalls) || 0),
        0,
      );

      setStats({ total: keys.length, active, revoked, totalCalls });
    } catch (err) {
      console.error("Error loading API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "Never";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "bg-green-100 text-green-700";
    if (s === "revoked") return "bg-red-100 text-red-700";
    if (s === "expired") return "bg-gray-100 text-gray-600";
    return "bg-amber-100 text-amber-700";
  };

  const filtered = apiKeys.filter((k) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (k.name || "").toLowerCase().includes(term) ||
      (k.userId || "").toLowerCase().includes(term) ||
      (k.email || "").toLowerCase().includes(term) ||
      (k.id || "").toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === "all" || (k.status || "").toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Scope usage breakdown
  const scopeCounts = {};
  apiKeys.forEach((k) => {
    (k.scopes || []).forEach((s) => {
      scopeCounts[s] = (scopeCounts[s] || 0) + 1;
    });
  });
  const topScopes = Object.entries(scopeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxScopeCount = topScopes.length > 0 ? topScopes[0][1] : 1;

  const metricCards = [
    {
      label: "Total Keys",
      value: stats.total.toLocaleString(),
      icon: Key,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Active",
      value: stats.active.toLocaleString(),
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Revoked",
      value: stats.revoked.toLocaleString(),
      icon: XCircle,
      color: "bg-red-50 text-red-600",
    },
    {
      label: "Total API Calls",
      value: stats.totalCalls.toLocaleString(),
      icon: Activity,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-3" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {m.label}
              </span>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.color}`}
              >
                <m.icon size={20} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Scope Usage Breakdown */}
      {topScopes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-500" />
            Scope Usage
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topScopes.map(([scope, count]) => (
              <div key={scope} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-mono truncate">
                  {scope}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${(count / maxScopeCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Keys Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-bold text-gray-900">All API Keys</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search keys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {filtered.length} key{filtered.length !== 1 ? "s" : ""}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Key size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No API keys found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Scopes
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Calls
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Rate Limit
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((k) => (
                  <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Key size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">
                          {k.name || k.id.slice(0, 12)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {k.email ||
                        (k.userId ? k.userId.slice(0, 12) + "..." : "N/A")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(k.scopes || []).slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono"
                          >
                            {s}
                          </span>
                        ))}
                        {(k.scopes || []).length > 3 && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                            +{k.scopes.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {(
                        (k.usageStats && k.usageStats.totalCalls) ||
                        0
                      ).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {k.rateLimit || "60"}/min
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(k.status)}`}
                      >
                        {k.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(k.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Usage Logs */}
      {usageLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-purple-500" />
            Recent API Usage
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Key
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Endpoint
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Method
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usageLogs.slice(0, 20).map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">
                      {log.apiKeyId ? log.apiKeyId.slice(0, 12) + "..." : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.endpoint || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono font-bold">
                        {log.method || "GET"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-bold ${(log.statusCode || 200) < 400 ? "text-green-600" : "text-red-600"}`}
                      >
                        {log.statusCode || 200}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
