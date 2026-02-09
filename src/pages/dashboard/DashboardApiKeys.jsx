import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  createApiKey,
  revokeApiKey,
  rotateApiKey,
  listApiKeys,
} from "../../services/apiKeyService";
import {
  Key,
  Plus,
  Copy,
  Check,
  X,
  AlertTriangle,
  ToggleRight,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

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
  { value: "read_smt", label: "Read SMT Data", group: "SMT" },
  { value: "write_smt", label: "Write SMT Data", group: "SMT" },
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

  // Group scopes
  const scopeGroups = {};
  for (const scope of AVAILABLE_SCOPES) {
    if (!scopeGroups[scope.group]) scopeGroups[scope.group] = [];
    scopeGroups[scope.group].push(scope);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
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
                className="input-field"
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
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Environment
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setEnvironment("development")}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    environment === "development"
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Development
                </button>
                <button
                  onClick={() => setEnvironment("production")}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    environment === "production"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
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
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            scopes.includes(scope.value)
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
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
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
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
            <code className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-xs text-gray-900 border border-amber-200">
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

export default function DashboardApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [filters, setFilters] = useState({});

  const loadKeys = async () => {
    try {
      const result = await listApiKeys();
      if (result.success) {
        setKeys(result.data.keys);
      } else {
        console.error("Failed to load API keys:", result.error);
      }
    } catch (err) {
      console.error("Failed to load API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadKeys();
  }, [user]);

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
        // Backend returns { apiKeyId, apiKey, keyPrefix, message }
        setNewKey(result.data.apiKey);
        setShowCreate(false);
        // Reload keys from Firestore to get the server-created record
        await loadKeys();
      } else {
        console.error("Failed to create API key:", result.error);
        alert("Failed to create API key: " + result.error);
      }
    } catch (err) {
      console.error("Failed to create API key:", err);
      alert("Failed to create API key: " + err.message);
    }
  };

  const handleRevoke = async (key) => {
    if (!confirm(`Revoke API key "${key.name}"? This action is permanent.`))
      return;
    try {
      const result = await revokeApiKey(key.id);
      if (result.success) {
        setKeys((prev) =>
          prev.map((k) => (k.id === key.id ? { ...k, status: "revoked" } : k)),
        );
      } else {
        console.error("Failed to revoke key:", result.error);
      }
    } catch (err) {
      console.error("Failed to revoke key:", err);
    }
  };

  const handleRotate = async (key) => {
    if (
      !confirm(
        `Rotate API key "${key.name}"? The old key will stop working immediately.`,
      )
    )
      return;
    try {
      const result = await rotateApiKey(key.id);
      if (result.success) {
        // Show the new key in the one-time display
        setNewKey(result.data.apiKey);
        // Update the prefix in the local list
        setKeys((prev) =>
          prev.map((k) =>
            k.id === key.id ? { ...k, keyPrefix: result.data.keyPrefix } : k,
          ),
        );
      } else {
        console.error("Failed to rotate key:", result.error);
        alert("Failed to rotate key: " + result.error);
      }
    } catch (err) {
      console.error("Failed to rotate key:", err);
    }
  };

  const filterDefs = useMemo(() => {
    const statuses = [...new Set(keys.map((k) => k.status || "active"))].map(
      (s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }),
    );
    const environments = [
      ...new Set(keys.map((k) => k.environment).filter(Boolean)),
    ].map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }));
    const defs = [{ key: "status", label: "Status", options: statuses }];
    if (environments.length > 0) {
      defs.push({
        key: "environment",
        label: "Environment",
        options: environments,
      });
    }
    return defs;
  }, [keys]);

  const filtered = useMemo(() => {
    let result = keys;
    if (filters.status) {
      result = result.filter((k) => (k.status || "active") === filters.status);
    }
    if (filters.environment) {
      result = result.filter((k) => k.environment === filters.environment);
    }
    return result;
  }, [keys, filters]);

  const columns = useMemo(
    () => [
      {
        key: "keyPrefix",
        label: "Key",
        sortable: true,
        render: (val) => (
          <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
            {val || "pk_..."}
          </code>
        ),
      },
      {
        key: "name",
        label: "Name",
        sortable: true,
        render: (val, row) => (
          <span className="font-medium text-gray-900">
            {val || "Unnamed"}
            {row.environment && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  row.environment === "production"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {row.environment === "production" ? "prod" : "dev"}
              </span>
            )}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              val === "active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {val || "active"}
          </span>
        ),
      },
      {
        key: "scopes",
        label: "Scopes",
        sortable: false,
        render: (val) => (
          <div className="flex flex-wrap gap-1">
            {(val || []).slice(0, 3).map((scope) => (
              <span
                key={scope}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
              >
                {scope}
              </span>
            ))}
            {(val || []).length > 3 && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                +{val.length - 3}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "lastUsed",
        label: "Last Used",
        sortable: true,
        render: (val) => (
          <span className="text-gray-500 text-xs">
            {val?.toDate
              ? val.toDate().toLocaleDateString()
              : val
                ? new Date(val).toLocaleDateString()
                : "Never"}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (val) => (
          <span className="text-gray-500 text-xs">
            {val?.toDate
              ? val.toDate().toLocaleDateString()
              : val
                ? new Date(val).toLocaleDateString()
                : "N/A"}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_val, row) => (
          <div className="flex items-center gap-1">
            {(row.status || "active") === "active" && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRotate(row);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  title="Rotate key (generate new value)"
                >
                  <Key className="h-3.5 w-3.5" />
                  Rotate
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevoke(row);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  title="Revoke key permanently"
                >
                  <ToggleRight className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </>
            )}
            {row.status === "revoked" && (
              <span className="text-xs text-gray-400">Revoked</span>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="h-16 rounded-xl bg-gray-100" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary gap-2"
        >
          <Plus className="h-4 w-4" /> Create Key
        </button>
      </div>

      {/* New key display */}
      {newKey && (
        <NewKeyDisplay apiKey={newKey} onDismiss={() => setNewKey(null)} />
      )}

      {/* Filters */}
      <FilterBar
        filters={filterDefs}
        activeFilters={filters}
        onChange={setFilters}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No API keys yet. Create one to get started."
      />

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
