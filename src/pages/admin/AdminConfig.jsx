import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
} from "../../services/firebase";
import {
  Settings,
  Webhook,
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  Clock,
  AlertTriangle,
  Search,
  ChevronDown,
  Activity,
  Server,
} from "lucide-react";

const INTEGRATIONS = [
  {
    key: "stripe",
    name: "Stripe",
    description: "Payment processing & subscriptions",
    configDoc: "stripe",
    requiredKeys: ["secret_key", "webhook_secret"],
  },
  {
    key: "twilio",
    name: "Twilio",
    description: "SMS notifications",
    configDoc: "twilio",
    requiredKeys: ["account_sid", "auth_token", "phone_number"],
  },
  {
    key: "mercury",
    name: "Mercury",
    description: "ACH banking & invoicing",
    configDoc: "mercury",
    requiredKeys: ["api_token"],
  },
  {
    key: "nrel",
    name: "NREL",
    description: "Solar resource data",
    configDoc: "nrel",
    requiredKeys: ["api_key"],
  },
  {
    key: "openei",
    name: "OpenEI",
    description: "Utility rate data",
    configDoc: "openei",
    requiredKeys: [],
  },
];

export default function AdminConfig() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [configDocs, setConfigDocs] = useState({});
  const [refreshLogs, setRefreshLogs] = useState([]);
  const [integrationHealth, setIntegrationHealth] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedConfig, setExpandedConfig] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all config docs
      const configs = {};
      try {
        const configRef = collection(db, "config");
        const configSnap = await getDocs(configRef);
        configSnap.docs.forEach((d) => {
          configs[d.id] = { id: d.id, ...d.data() };
        });
      } catch (e) {
        /* collection may not exist */
      }
      setConfigDocs(configs);

      // Load data refresh logs
      try {
        const logsRef = collection(db, "data_refresh_log");
        const logsSnap = await getDocs(
          query(logsRef, orderBy("timestamp", "desc"), limit(50)),
        );
        setRefreshLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setRefreshLogs([]);
      }

      // Check integration health based on config docs
      const health = {};
      INTEGRATIONS.forEach((integration) => {
        const configDoc = configs[integration.configDoc];
        if (!configDoc) {
          health[integration.key] = {
            status: "missing",
            message: "No config document found",
          };
        } else if (integration.requiredKeys.length === 0) {
          health[integration.key] = {
            status: "connected",
            message: "No credentials required",
          };
        } else {
          const missing = integration.requiredKeys.filter((k) => !configDoc[k]);
          if (missing.length === 0) {
            health[integration.key] = {
              status: "connected",
              message: "All credentials configured",
            };
          } else {
            health[integration.key] = {
              status: "partial",
              message: `Missing: ${missing.join(", ")}`,
            };
          }
        }
      });
      setIntegrationHealth(health);
    } catch (err) {
      console.error("Error loading config:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const statusColor = (status) => {
    if (status === "connected") return "bg-green-100 text-green-700";
    if (status === "partial") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const statusIcon = (status) => {
    if (status === "connected")
      return <CheckCircle size={14} className="text-green-500" />;
    if (status === "partial")
      return <AlertTriangle size={14} className="text-amber-500" />;
    return <XCircle size={14} className="text-red-500" />;
  };

  const logStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "success" || s === "completed")
      return "bg-green-100 text-green-700";
    if (s === "failed" || s === "error") return "bg-red-100 text-red-700";
    if (s === "running" || s === "in_progress")
      return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  };

  const connectedCount = Object.values(integrationHealth).filter(
    (h) => h.status === "connected",
  ).length;
  const partialCount = Object.values(integrationHealth).filter(
    (h) => h.status === "partial",
  ).length;
  const missingCount = Object.values(integrationHealth).filter(
    (h) => h.status === "missing",
  ).length;

  const configEntries = Object.entries(configDocs);
  const filteredConfigs = configEntries.filter(([key, val]) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      key.toLowerCase().includes(term) ||
      JSON.stringify(val).toLowerCase().includes(term)
    );
  });

  const metricCards = [
    {
      label: "Config Documents",
      value: configEntries.length,
      icon: Database,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Connected",
      value: connectedCount,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Partial",
      value: partialCount,
      icon: AlertTriangle,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Data Refreshes",
      value: refreshLogs.length,
      icon: RefreshCw,
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

      {/* Integration Health */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Webhook size={20} className="text-blue-500" />
          Integration Health
        </h3>
        <div className="space-y-3">
          {INTEGRATIONS.map((integration) => {
            const health = integrationHealth[integration.key] || {
              status: "missing",
              message: "Unknown",
            };
            return (
              <div
                key={integration.key}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      health.status === "connected"
                        ? "bg-green-50 text-green-600"
                        : health.status === "partial"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-red-50 text-red-600"
                    }`}
                  >
                    <Server size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {integration.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 hidden md:block">
                    {health.message}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${statusColor(health.status)}`}
                  >
                    {statusIcon(health.status)}
                    {health.status === "connected"
                      ? "Connected"
                      : health.status === "partial"
                        ? "Partial"
                        : "Missing"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Configuration Browser */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings size={20} className="text-gray-500" />
            System Configuration
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search config..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {filteredConfigs.length} document
          {filteredConfigs.length !== 1 ? "s" : ""}
        </p>

        {filteredConfigs.length === 0 ? (
          <div className="text-center py-16">
            <Database size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              No configuration documents found
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Config will appear after setup
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConfigs.map(([key, val]) => {
              const fields = Object.entries(val).filter(([k]) => k !== "id");
              const isExpanded = expandedConfig === key;
              return (
                <div
                  key={key}
                  className="border border-gray-100 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedConfig(isExpanded ? null : key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Database size={16} className="text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900 font-mono">
                        {key}
                      </span>
                      <span className="text-xs text-gray-400">
                        {fields.length} field{fields.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {fields.map(([k, v]) => (
                          <div key={k} className="bg-white rounded-lg p-3">
                            <span className="text-xs text-gray-500 font-medium font-mono">
                              {k}
                            </span>
                            <p className="text-gray-900 font-medium mt-1 truncate">
                              {typeof v === "boolean"
                                ? v
                                  ? "true"
                                  : "false"
                                : typeof v === "object"
                                  ? JSON.stringify(v).substring(0, 100)
                                  : String(v ?? "null")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Data Refresh Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-purple-500" />
          Data Refresh Log
        </h3>

        {refreshLogs.length === 0 ? (
          <div className="text-center py-16">
            <Clock size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No refresh logs found</p>
            <p className="text-sm text-gray-400 mt-1">
              Logs will appear after data imports
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Source
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Records
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Duration
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Timestamp
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refreshLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedLog(expandedLog === log.id ? null : log.id)
                    }
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {log.source || "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${logStatusBadge(log.status)}`}
                      >
                        {log.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {(
                        log.records_processed ||
                        log.recordsProcessed ||
                        0
                      ).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.duration
                        ? `${Math.round(log.duration / 1000)}s`
                        : log.durationMs
                          ? `${Math.round(log.durationMs / 1000)}s`
                          : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${
                          expandedLog === log.id ? "rotate-180" : ""
                        }`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Expanded Log Detail */}
            {expandedLog && (
              <div className="border-t border-gray-200 px-4 py-4 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {Object.entries(
                    refreshLogs.find((l) => l.id === expandedLog) || {},
                  )
                    .filter(([k]) => k !== "id")
                    .map(([k, v]) => (
                      <div key={k}>
                        <span className="text-xs text-gray-500 font-medium">
                          {k}
                        </span>
                        <p className="text-gray-900 font-medium truncate">
                          {typeof v === "boolean"
                            ? v
                              ? "Yes"
                              : "No"
                            : typeof v === "object"
                              ? JSON.stringify(v)
                              : String(v ?? "N/A")}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
