import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  createApiKey,
  revokeApiKey,
  rotateApiKey,
} from "../../services/apiKeyService";
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
  Plus,
  Copy,
  Check,
  X,
  AlertTriangle,
  ToggleRight,
  RefreshCw,
} from "lucide-react";

const AVAILABLE_SCOPES = [
  { value: "read_leads", label: "Read Leads", group: "Leads" },
  { value: "write_leads", label: "Write Leads", group: "Leads" },
  { value: "read_solar", label: "Read Solar Data", group: "Solar" },
  { value: "write_solar", label: "Write Solar Data", group: "Solar" },
  { value: "read_equipment", label: "Read Equipment", group: "Solar" },
  { value: "read_utilities", label: "Read Utilities", group: "Solar" },
  { value: "read_incentives", label: "Read Incentives", group: "Solar" },
  { value: "read_permits", label: "Read Permits", group: "Solar" },
  {
    value: "read_compliance",
    label: "Run Compliance Checks",
    group: "Compliance",
  },
  {
    value: "read_marketplace",
    label: "Read Marketplace",
    group: "Marketplace",
  },
  {
    value: "write_marketplace",
    label: "Write Marketplace",
    group: "Marketplace",
  },
  { value: "read_projects", label: "Read Projects", group: "Projects" },
  { value: "write_projects", label: "Write Projects", group: "Projects" },
  { value: "manage_webhooks", label: "Manage Webhooks", group: "Webhooks" },
  { value: "read_smt", label: "Read SMT Data", group: "SMT" },
  { value: "write_smt", label: "Write SMT Data", group: "SMT" },
  { value: "admin", label: "Full Admin Access", group: "Admin" },
];

function CreateKeyModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState("development");
  const [scopes, setScopes] = useState([
    "read_leads",
    "read_solar",
    "read_equipment",
  ]);
  const [creating, setCreating] = useState(false);

  const toggleScope = (scope) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate({ name, description, environment, scopes });
    } finally {
      setCreating(false);
    }
  };

  const scopeGroups = {};
  for (const scope of AVAILABLE_SCOPES) {
    if (!scopeGroups[scope.group]) scopeGroups[scope.group] = [];
    scopeGroups[scope.group].push(scope);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Create API Key
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 p-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Key Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Integration"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Environment
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setEnvironment("development")}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${environment === "development" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  Development
                </button>
                <button
                  onClick={() => setEnvironment("production")}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${environment === "production" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  Production
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Scopes
              </label>
              <div className="space-y-3">
                {Object.entries(scopeGroups).map(([group, groupScopes]) => (
                  <div key={group}>
                    <p className="mb-1 text-xs font-medium text-gray-500 uppercase">
                      {group}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {groupScopes.map((scope) => (
                        <button
                          key={scope.value}
                          onClick={() => toggleScope(scope.value)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${scopes.includes(scope.value) ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                        >
                          {scope.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || scopes.length === 0 || creating}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Key"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function NewKeyDisplay({ apiKey, onDismiss }) {
  const [copied, setCopied] = useState(false);
  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">
            Save your API key now
          </h3>
          <p className="mt-1 text-xs text-amber-700">
            This key will only be shown once. Copy it and store it securely.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-xs text-gray-900 border border-amber-200 break-all">
              {apiKey}
            </code>
            <button
              onClick={copyKey}
              className="rounded-lg bg-amber-600 px-3 py-2 text-white hover:bg-amber-700"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <button
            onClick={onDismiss}
            className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-900"
          >
            I have saved my key
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminApiKeys() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    revoked: 0,
    totalCalls: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateKey = async ({
    name,
    description,
    environment,
    scopes,
  }) => {
    try {
      const result = await createApiKey({
        name,
        description,
        scopes,
        environment,
      });
      if (result.success) {
        setNewKey(result.data.apiKey);
        setShowCreate(false);
        await loadData();
      } else {
        alert("Failed to create API key: " + result.error);
      }
    } catch (err) {
      alert("Failed to create API key: " + err.message);
    }
  };

  const handleRevoke = async (key) => {
    if (!confirm(`Revoke API key "${key.name || key.id}"? This is permanent.`))
      return;
    try {
      const result = await revokeApiKey(key.id);
      if (result.success) {
        setApiKeys((prev) =>
          prev.map((k) => (k.id === key.id ? { ...k, status: "revoked" } : k)),
        );
      }
    } catch (err) {
      alert("Failed to revoke: " + err.message);
    }
  };

  const handleRotate = async (key) => {
    if (
      !confirm(
        `Rotate "${key.name || key.id}"? Old key stops working immediately.`,
      )
    )
      return;
    try {
      const result = await rotateApiKey(key.id);
      if (result.success) {
        setNewKey(result.data.apiKey);
        setApiKeys((prev) =>
          prev.map((k) =>
            k.id === key.id ? { ...k, keyPrefix: result.data.keyPrefix } : k,
          ),
        );
      }
    } catch (err) {
      alert("Failed to rotate: " + err.message);
    }
  };

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
      {/* Create button + new key display */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Create Key
        </button>
      </div>

      {newKey && (
        <NewKeyDisplay apiKey={newKey} onDismiss={() => setNewKey(null)} />
      )}

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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(k.status || "active") === "active" && (
                          <>
                            <button
                              onClick={() => handleRotate(k)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                              title="Rotate key"
                            >
                              <RefreshCw className="h-3.5 w-3.5" /> Rotate
                            </button>
                            <button
                              onClick={() => handleRevoke(k)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              title="Revoke key"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Revoke
                            </button>
                          </>
                        )}
                        {(k.status || "") === "revoked" && (
                          <span className="text-xs text-gray-400">Revoked</span>
                        )}
                      </div>
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

      {/* Create modal */}
      {showCreate && (
        <CreateKeyModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateKey}
        />
      )}
    </div>
  );
}
