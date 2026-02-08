import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "../../services/firebase";
import {
  DollarSign,
  Users,
  FolderKanban,
  Activity,
  TrendingUp,
  ArrowRight,
  Clock,
} from "lucide-react";

const STATUS_ORDER = ["new", "qualified", "proposal", "won"];

export default function AdminOverview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mrr: 0,
    activeLeads: 0,
    projects: 0,
    apiCalls: 0,
  });
  const [funnel, setFunnel] = useState({
    new: 0,
    qualified: 0,
    proposal: 0,
    won: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch leads for funnel + activity
      const leadsRef = collection(db, "leads");
      const leadsSnap = await getDocs(
        query(leadsRef, orderBy("createdAt", "desc")),
      );
      const leads = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Build funnel counts
      const funnelCounts = { new: 0, qualified: 0, proposal: 0, won: 0 };
      leads.forEach((l) => {
        const s = (l.status || "new").toLowerCase();
        if (funnelCounts[s] !== undefined) funnelCounts[s]++;
      });
      setFunnel(funnelCounts);

      // Recent activity (last 10)
      setRecentActivity(leads.slice(0, 10));

      // Fetch subscriptions for MRR
      let mrr = 0;
      try {
        const subsRef = collection(db, "subscriptions");
        const subsSnap = await getDocs(
          query(subsRef, where("status", "==", "active")),
        );
        subsSnap.docs.forEach((d) => {
          const data = d.data();
          const tierPrices = {
            starter: 79,
            professional: 149,
            enterprise: 299,
          };
          mrr += tierPrices[data.tier] || 0;
        });
      } catch (e) {
        /* collection may not exist */
      }

      // Fetch projects count
      let projectCount = 0;
      try {
        const projRef = collection(db, "projects");
        const projSnap = await getDocs(projRef);
        projectCount = projSnap.size;
      } catch (e) {
        /* collection may not exist */
      }

      // Fetch API call count from usage_records
      let apiCalls = 0;
      try {
        const usageRef = collection(db, "usage_records");
        const usageSnap = await getDocs(usageRef);
        usageSnap.docs.forEach((d) => {
          apiCalls += d.data().api_call_count || 0;
        });
      } catch (e) {
        /* collection may not exist */
      }

      setMetrics({
        mrr,
        activeLeads: leads.filter(
          (l) => l.status !== "won" && l.status !== "lost",
        ).length,
        projects: projectCount,
        apiCalls,
      });
    } catch (err) {
      console.error("AdminOverview load error:", err);
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

  const statusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "won" || s === "active") return "bg-green-100 text-green-700";
    if (s === "qualified" || s === "proposal")
      return "bg-amber-100 text-amber-700";
    if (s === "lost" || s === "failed") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  const metricCards = [
    {
      label: "Monthly Recurring Revenue",
      value: `$${metrics.mrr.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Active Leads",
      value: metrics.activeLeads.toLocaleString(),
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Projects",
      value: metrics.projects.toLocaleString(),
      icon: FolderKanban,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "API Calls (All Time)",
      value: metrics.apiCalls.toLocaleString(),
      icon: Activity,
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-500" />
            Revenue Trend
          </h3>
          <div className="h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Revenue chart coming soon</p>
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Lead Funnel</h3>
          <div className="space-y-3">
            {STATUS_ORDER.map((stage, idx) => {
              const count = funnel[stage] || 0;
              const total =
                Object.values(funnel).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-gray-600 capitalize">
                    {stage}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2 text-xs font-bold text-white transition-all"
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    >
                      {count}
                    </div>
                  </div>
                  {idx < STATUS_ORDER.length - 1 && (
                    <ArrowRight
                      size={14}
                      className="text-gray-300 flex-shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={20} className="text-gray-400" />
          Recent Activity
        </h3>
        {recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <Activity size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentActivity.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {lead.customerName || lead.name || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {lead.email || "No email"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusColor(lead.status)}`}
                  >
                    {lead.status || "new"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(lead.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
