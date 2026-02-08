import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, query, where, getDocs } from "../../services/firebase";
import {
  CreditCard,
  DollarSign,
  TrendingDown,
  Users,
  BarChart3,
} from "lucide-react";

export default function AdminBilling() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [mrr, setMrr] = useState(0);
  const [tierDistribution, setTierDistribution] = useState({});

  const tierPrices = { starter: 79, professional: 149, enterprise: 299 };

  useEffect(() => {
    loadBilling();
  }, []);

  const loadBilling = async () => {
    try {
      setLoading(true);
      const ref = collection(db, "subscriptions");
      const snap = await getDocs(ref);
      const subs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubscriptions(subs);

      // Calculate MRR
      let total = 0;
      const tiers = {};
      subs.forEach((s) => {
        if (s.status === "active") {
          total += tierPrices[s.tier] || 0;
        }
        const t = s.tier || "unknown";
        tiers[t] = (tiers[t] || 0) + 1;
      });
      setMrr(total);
      setTierDistribution(tiers);
    } catch (err) {
      console.error("Error loading billing:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  const statusBadge = (status) => {
    const map = {
      active: "bg-green-100 text-green-700",
      trialing: "bg-blue-100 text-blue-700",
      past_due: "bg-red-100 text-red-700",
      canceled: "bg-gray-100 text-gray-500",
      cancelled: "bg-gray-100 text-gray-500",
      incomplete: "bg-amber-100 text-amber-700",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  const tierBadge = (tier) => {
    const map = {
      starter: "bg-gray-100 text-gray-700",
      professional: "bg-blue-100 text-blue-700",
      enterprise: "bg-purple-100 text-purple-700",
    };
    return map[tier] || "bg-gray-100 text-gray-600";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    );
  }

  const activeSubs = subscriptions.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              MRR
            </span>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            ${mrr.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {activeSubs} active subscriptions
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Subscribers
            </span>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {subscriptions.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">{activeSubs} active</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Churn Rate
            </span>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="h-8 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
            <p className="text-xs text-gray-400">Calculating...</p>
          </div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-purple-500" />
          Tier Distribution
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {["starter", "professional", "enterprise"].map((tier) => (
            <div
              key={tier}
              className="text-center p-4 rounded-lg border border-gray-100"
            >
              <span
                className={`inline-block px-3 py-1 rounded-md text-xs font-semibold capitalize mb-3 ${tierBadge(tier)}`}
              >
                {tier}
              </span>
              <p className="text-2xl font-extrabold text-gray-900">
                {tierDistribution[tier] || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ${tierPrices[tier]}/mo each
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          All Subscriptions
        </h3>

        {subscriptions.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tier
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Next Billing
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {s.userId || s.email || s.id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${tierBadge(s.tier)}`}
                      >
                        {s.tier || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(s.status)}`}
                      >
                        {s.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(s.currentPeriodEnd || s.nextBilling)}
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
