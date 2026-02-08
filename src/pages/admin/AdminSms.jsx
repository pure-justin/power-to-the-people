import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
} from "../../services/firebase";
import { MessageSquare, Send, DollarSign, BarChart3 } from "lucide-react";

const SMS_COST = 0.0075;

export default function AdminSms() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [smsLogs, setSmsLogs] = useState([]);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadSmsLogs();
  }, []);

  const loadSmsLogs = async () => {
    try {
      setLoading(true);
      const ref = collection(db, "smsLog");
      const snap = await getDocs(query(ref, orderBy("sentAt", "desc")));
      setSmsLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading SMS logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!to || !message) return;
    setSending(true);
    // Placeholder - would call sendCustomSMS cloud function
    setTimeout(() => {
      setSending(false);
      setTo("");
      setMessage("");
    }, 1000);
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

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    const map = {
      delivered: "bg-green-100 text-green-700",
      sent: "bg-blue-100 text-blue-700",
      queued: "bg-amber-100 text-amber-700",
      failed: "bg-red-100 text-red-700",
      undelivered: "bg-red-100 text-red-700",
    };
    return map[s] || "bg-gray-100 text-gray-600";
  };

  const totalCost = smsLogs.length * SMS_COST;
  const deliveredCount = smsLogs.filter((s) => s.status === "delivered").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-40" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Composer */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-500" />
          SMS Composer
        </h3>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              {message.length}/160 characters
            </p>
          </div>
          <button
            type="submit"
            disabled={sending || !to || !message}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {sending ? "Sending..." : "Send SMS"}
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Messages
            </span>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <MessageSquare size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {smsLogs.length}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cost Tracker
            </span>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            ${totalCost.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">${SMS_COST}/message</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Delivery Rate
            </span>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="h-8 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
            <p className="text-xs text-gray-400">
              {smsLogs.length > 0
                ? `${Math.round((deliveredCount / smsLogs.length) * 100)}% delivered`
                : "No data"}
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Delivery Log</h3>

        {smsLogs.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              No SMS messages sent yet
            </p>
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
                    Sent At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {smsLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {log.to || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {log.message || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(log.status)}`}
                      >
                        {log.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(log.sentAt)}
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
