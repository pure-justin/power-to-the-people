import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "../../services/firebase";
import {
  MessageSquare,
  Send,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
} from "lucide-react";

const SMS_COST = 0.0075;

export default function AdminSms() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    cost: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bulkMode, setBulkMode] = useState(false);
  const [smsForm, setSmsForm] = useState({ to: "", message: "" });
  const [bulkRecipients, setBulkRecipients] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const ref = collection(db, "smsLog");
      const snap = await getDocs(
        query(ref, orderBy("sentAt", "desc"), limit(500)),
      );
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLogs(items);

      const delivered = items.filter((l) => l.status === "delivered").length;
      const failed = items.filter(
        (l) => l.status === "failed" || l.status === "undelivered",
      ).length;
      const pending = items.filter(
        (l) =>
          l.status === "queued" ||
          l.status === "sent" ||
          l.status === "sending",
      ).length;
      setStats({
        total: items.length,
        delivered,
        failed,
        pending,
        cost: items.length * SMS_COST,
      });
    } catch (err) {
      console.error("Error loading SMS logs:", err);
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
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const statusIcon = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered")
      return <CheckCircle size={14} className="text-green-500" />;
    if (s === "failed" || s === "undelivered")
      return <XCircle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-amber-500" />;
  };

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered") return "bg-green-100 text-green-700";
    if (s === "failed" || s === "undelivered") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  };

  const filtered = logs.filter((l) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (l.to || "").includes(term) ||
      (l.message || "").toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === "all" || (l.status || "").toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const metricCards = [
    {
      label: "Total Sent",
      value: stats.total.toLocaleString(),
      icon: MessageSquare,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Delivered",
      value: stats.delivered.toLocaleString(),
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Failed",
      value: stats.failed.toLocaleString(),
      icon: XCircle,
      color: "bg-red-50 text-red-600",
    },
    {
      label: "Est. Cost",
      value: `$${stats.cost.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-amber-50 text-amber-600",
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
          {[1, 2, 3, 4, 5].map((i) => (
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

      {/* Compose Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Send size={20} className="text-emerald-500" />
            Compose SMS
          </h3>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={bulkMode}
              onChange={(e) => setBulkMode(e.target.checked)}
              className="rounded border-gray-300"
            />
            Bulk Mode
          </label>
        </div>

        {bulkMode ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipients (one per line)
              </label>
              <textarea
                value={bulkRecipients}
                onChange={(e) => setBulkRecipients(e.target.value)}
                placeholder={"+15551234567\n+15559876543"}
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {bulkRecipients
                  ? bulkRecipients.split("\n").filter((l) => l.trim()).length
                  : 0}{" "}
                recipients (max 100)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={smsForm.message}
                onChange={(e) =>
                  setSmsForm((p) => ({ ...p, message: e.target.value }))
                }
                placeholder="Type your message..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {smsForm.message.length}/160 characters
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              <Users size={16} />
              Send Bulk SMS
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={smsForm.to}
              onChange={(e) =>
                setSmsForm((p) => ({ ...p, to: e.target.value }))
              }
              placeholder="+15551234567"
              className="w-48 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <input
              type="text"
              value={smsForm.message}
              onChange={(e) =>
                setSmsForm((p) => ({ ...p, message: e.target.value }))
              }
              placeholder="Type your message..."
              className="flex-1 min-w-[240px] px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              <Send size={16} />
              Send
            </button>
          </div>
        )}
      </div>

      {/* Delivery Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-bold text-gray-900">Delivery Log</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search logs..."
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
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
              <option value="undelivered">Undelivered</option>
            </select>
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
          {filtered.length} message{filtered.length !== 1 ? "s" : ""}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No SMS logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    To
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Message
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    SID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Sent At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {l.to || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {l.message || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(l.status)}`}
                      >
                        {statusIcon(l.status)}
                        {l.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {l.sid ? l.sid.slice(-8) : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(l.sentAt)}
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
