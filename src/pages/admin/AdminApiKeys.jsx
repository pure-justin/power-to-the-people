import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
} from "../../services/firebase";
import { Key, Activity, Shield, BarChart3 } from "lucide-react";

export default function AdminApiKeys() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState([]);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const ref = collection(db, "apiKeys");
      const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
      setApiKeys(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "Never";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    const map = {
      active: "bg-green-100 text-green-700",
      revoked: "bg-red-100 text-red-700",
      expired: "bg-gray-100 text-gray-500",
      suspended: "bg-amber-100 text-amber-700",
    };
    return map[s] || "bg-gray-100 text-gray-600";
  };

  const getKeyPrefix = (key) => {
    if (!key) return "pk_***";
    if (typeof key === "string" && key.length > 12) {
      return key.substring(0, 12) + "...";
    }
    return key;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-3" />
          ))}
        </div>
      </div>
    );
  }

  const activeKeys = apiKeys.filter((k) => k.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Keys
            </span>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Key size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {apiKeys.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">{activeKeys} active</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Usage Breakdown
            </span>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="h-8 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
            <p className="text-xs text-gray-400">Coming soon</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Rate Limit Monitor
            </span>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
              <Shield size={20} />
            </div>
          </div>
          <div className="h-8 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
            <p className="text-xs text-gray-400">Coming soon</p>
          </div>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">All API Keys</h3>

        {apiKeys.length === 0 ? (
          <div className="text-center py-16">
            <Key size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No API keys found</p>
            <p className="text-sm text-gray-400 mt-1">
              API keys will appear here when created
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Key Prefix
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Scopes
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Last Used
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {apiKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">
                        {getKeyPrefix(k.keyPrefix || k.key || k.id)}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {k.userId || k.email || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(k.status)}`}
                      >
                        {k.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {Array.isArray(k.scopes) ? k.scopes.length : 0} scopes
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(k.lastUsed)}
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
    </div>
  );
}
