import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, query, where, getDocs } from "../../services/firebase";
import {
  CreditCard,
  DollarSign,
  TrendingDown,
  Users,
  BarChart3,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

export default function AdminBilling() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [mrr, setMrr] = useState(0);
  const [tierDistribution, setTierDistribution] = useState({});
  const [filters, setFilters] = useState({});

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
  const canceledSubs = subscriptions.filter(
    (s) => s.status === "canceled" || s.status === "cancelled",
  ).length;
  const churnRate =
    subscriptions.length > 0
      ? Math.round((canceledSubs / subscriptions.length) * 100)
      : 0;

  const filterDefs = useMemo(() => {
    const statuses = [
      ...new Set(subscriptions.map((s) => s.status).filter(Boolean)),
    ].sort();
    const tiers = [
      ...new Set(subscriptions.map((s) => s.tier).filter(Boolean)),
    ].sort();
    return [
      { key: "status", label: "Status", options: statuses },
      { key: "tier", label: "Tier", options: tiers },
    ];
  }, [subscriptions]);

  const filtered = useMemo(() => {
    let result = subscriptions;
    if (filters.status)
      result = result.filter((s) => s.status === filters.status);
    if (filters.tier) result = result.filter((s) => s.tier === filters.tier);
    return result;
  }, [subscriptions, filters]);

  const columns = useMemo(
    () => [
      {
        key: "userId",
        label: "User",
        sortable: true,
        render: (val, row) => (
          <span className="font-semibold text-gray-900">
            {row.email || val || row.id}
          </span>
        ),
      },
      {
        key: "tier",
        label: "Tier",
        sortable: true,
        render: (val) => (
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${tierBadge(val)}`}
          >
            {val || "N/A"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val) => (
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(val)}`}
          >
            {val || "unknown"}
          </span>
        ),
      },
      {
        key: "currentPeriodEnd",
        label: "Next Billing",
        sortable: true,
        render: (val, row) => (
          <span className="text-gray-400">
            {formatDate(val || row.nextBilling)}
          </span>
        ),
      },
    ],
    [],
  );

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
          <p className="text-3xl font-extrabold text-gray-900">{churnRate}%</p>
          <p className="text-sm text-gray-500 mt-1">
            {canceledSubs} canceled of {subscriptions.length}
          </p>
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">All Subscriptions</h3>
          <span className="text-sm text-gray-400">
            {filtered.length} results
          </span>
        </div>

        <FilterBar
          filters={filterDefs}
          activeFilters={filters}
          onChange={setFilters}
        />

        <div className="mt-4">
          <DataTable
            columns={columns}
            data={filtered}
            emptyMessage="No subscriptions found. Subscriptions appear when users sign up via Stripe."
          />
        </div>
      </div>
    </div>
  );
}
