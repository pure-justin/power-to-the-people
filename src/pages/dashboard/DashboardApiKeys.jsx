import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  limit,
} from "../../services/firebase";
import {
  Key,
  Plus,
  Copy,
  Check,
  X,
  Shield,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  ToggleLeft,
  ToggleRight,
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
  { value: "read_smt", label: "Read SMT Data", group: "SMT" },
  { value: "write_smt", label: "Write SMT Data", group: "SMT" },
];

function CreateKeyModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState("dev");
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
                  onClick={() => setEnvironment("dev")}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    environment === "dev"
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Development
                </button>
                <button
                  onClick={() => setEnvironment("prod")}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    environment === "prod"
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

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "apiKeys"),
          where("userId", "==", user.uid),
          limit(100),
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => {
          const aTime = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);
          const bTime = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);
          return bTime - aTime;
        });
        setKeys(data);
      } catch (err) {
        console.error("Failed to load API keys:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleCreateKey = async ({
    name,
    description,
    environment,
    scopes,
  }) => {
    // Generate a key prefix for display (the real key comes from Cloud Function)
    const prefix = environment === "prod" ? "pk_live_" : "pk_test_";
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const fullKey = prefix + randomHex;

    const keyDoc = {
      userId: user.uid,
      name,
      description,
      environment,
      scopes,
      keyPrefix: fullKey.slice(0, 12) + "...",
      status: "active",
      createdAt: serverTimestamp(),
      lastUsed: null,
      usageStats: { total: 0, month: 0 },
    };

    try {
      const docRef = await addDoc(collection(db, "apiKeys"), keyDoc);
      const newKeyData = { id: docRef.id, ...keyDoc, createdAt: new Date() };
      setKeys((prev) => [newKeyData, ...prev]);
      setNewKey(fullKey);
      setShowCreate(false);
    } catch (err) {
      console.error("Failed to create API key:", err);
    }
  };

  const toggleKeyStatus = async (key) => {
    const newStatus = key.status === "active" ? "revoked" : "active";
    try {
      await updateDoc(doc(db, "apiKeys", key.id), { status: newStatus });
      setKeys((prev) =>
        prev.map((k) => (k.id === key.id ? { ...k, status: newStatus } : k)),
      );
    } catch (err) {
      console.error("Failed to update key:", err);
    }
  };

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

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Key
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Scopes
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Last Used
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Created
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
                      {key.keyPrefix || "pk_..."}
                    </code>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {key.name || "Unnamed"}
                    {key.environment && (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                          key.environment === "prod"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {key.environment}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        key.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {key.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(key.scopes || []).slice(0, 3).map((scope) => (
                        <span
                          key={scope}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                        >
                          {scope}
                        </span>
                      ))}
                      {(key.scopes || []).length > 3 && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                          +{key.scopes.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {key.lastUsed?.toDate
                      ? key.lastUsed.toDate().toLocaleDateString()
                      : key.lastUsed
                        ? new Date(key.lastUsed).toLocaleDateString()
                        : "Never"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {key.createdAt?.toDate
                      ? key.createdAt.toDate().toLocaleDateString()
                      : key.createdAt
                        ? new Date(key.createdAt).toLocaleDateString()
                        : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleKeyStatus(key)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                        key.status === "active"
                          ? "text-red-600 hover:bg-red-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                      title={
                        key.status === "active"
                          ? "Revoke key"
                          : "Reactivate key"
                      }
                    >
                      {key.status === "active" ? (
                        <>
                          <ToggleRight className="h-3.5 w-3.5" />
                          Revoke
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-3.5 w-3.5" />
                          Activate
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <Key className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2">
                      No API keys yet. Create one to get started.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
