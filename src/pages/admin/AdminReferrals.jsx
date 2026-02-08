import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
} from "../../services/firebase";
import {
  Gift,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  Search,
  Settings,
} from "lucide-react";

export default function AdminReferrals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [commissionSettings, setCommissionSettings] = useState({
    rate: 250,
    minProjectValue: 10000,
    payoutSchedule: "weekly",
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    totalCommission: 0,
    pendingPayout: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch referrals
      const refCol = collection(db, "referrals");
      const refSnap = await getDocs(
        query(refCol, orderBy("createdAt", "desc")),
      );
      const items = refSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReferrals(items);

      // Fetch payouts
      try {
        const payCol = collection(db, "payouts");
        const paySnap = await getDocs(
          query(payCol, orderBy("createdAt", "desc")),
        );
        setPayouts(paySnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        /* collection may not exist */
      }

      // Fetch config for commission settings
      try {
        const configCol = collection(db, "config");
        const configSnap = await getDocs(configCol);
        configSnap.docs.forEach((d) => {
          const data = d.data();
          if (d.id === "referrals" || data.referralRate) {
            setCommissionSettings((prev) => ({
              ...prev,
              rate: data.referralRate || data.rate || prev.rate,
              minProjectValue: data.minProjectValue || prev.minProjectValue,
              payoutSchedule: data.payoutSchedule || prev.payoutSchedule,
            }));
          }
        });
      } catch (e) {
        /* config may not exist */
      }

      const pending = items.filter((r) => r.status === "pending").length;
      const totalCommission = items.reduce(
        (sum, r) => sum + (r.commission || 0),
        0,
      );
      const pendingPayout = items
        .filter((r) => r.status === "approved" || r.status === "completed")
        .reduce((sum, r) => sum + (r.commission || 0), 0);

      setStats({
        total: items.length,
        pending,
        totalCommission,
        pendingPayout,
      });
    } catch (err) {
      console.error("Error loading referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    const map = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      paid: "bg-emerald-100 text-emerald-700",
      rejected: "bg-red-100 text-red-700",
      expired: "bg-gray-100 text-gray-500",
    };
    return map[s] || "bg-gray-100 text-gray-600";
  };

  const filtered = referrals.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (r.referrerId || "").toLowerCase().includes(term) ||
      (r.referrerName || "").toLowerCase().includes(term) ||
      (r.referredName || "").toLowerCase().includes(term) ||
      (r.projectId || "").toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === "all" || (r.status || "").toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const metricCards = [
    {
      label: "Total Referrals",
      value: stats.total.toLocaleString(),
      icon: Gift,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Pending Review",
      value: stats.pending.toLocaleString(),
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Total Commission",
      value: formatCurrency(stats.totalCommission),
      icon: DollarSign,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Pending Payout",
      value: formatCurrency(stats.pendingPayout),
      icon: TrendingUp,
      color: "bg-blue-50 text-blue-600",
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

      {/* Commission Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings size={20} className="text-gray-400" />
            Commission Settings
          </h3>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-sm text-emerald-600 font-medium hover:text-emerald-700"
          >
            {showSettings ? "Hide" : "Edit"}
          </button>
        </div>
        {showSettings ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commission per Referral ($)
              </label>
              <input
                type="number"
                value={commissionSettings.rate}
                onChange={(e) =>
                  setCommissionSettings((p) => ({
                    ...p,
                    rate: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Project Value ($)
              </label>
              <input
                type="number"
                value={commissionSettings.minProjectValue}
                onChange={(e) =>
                  setCommissionSettings((p) => ({
                    ...p,
                    minProjectValue: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payout Schedule
              </label>
              <select
                value={commissionSettings.payoutSchedule}
                onChange={(e) =>
                  setCommissionSettings((p) => ({
                    ...p,
                    payoutSchedule: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex gap-6 text-sm text-gray-600">
            <span>
              Rate: <strong>${commissionSettings.rate}</strong>/referral
            </span>
            <span>
              Min Value:{" "}
              <strong>
                ${commissionSettings.minProjectValue.toLocaleString()}
              </strong>
            </span>
            <span>
              Payout:{" "}
              <strong className="capitalize">
                {commissionSettings.payoutSchedule}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Payout Queue */}
      {payouts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-green-500" />
            Recent Payouts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.slice(0, 10).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {p.userId || p.userName || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(p.status)}`}
                      >
                        {p.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Referral Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-bold text-gray-900">All Referrals</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search referrals..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {filtered.length} referral{filtered.length !== 1 ? "s" : ""}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Gift size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No referrals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Referrer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Referred
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Project
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Commission
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
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {r.referrerName || r.referrerId || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.referredName || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {r.projectId ? r.projectId.slice(0, 8) + "..." : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">
                      {formatCurrency(r.commission)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(r.status)}`}
                      >
                        {r.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(r.createdAt)}
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
