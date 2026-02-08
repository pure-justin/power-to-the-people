import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "../../services/firebase";
import {
  Users,
  DollarSign,
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

function MetricCard({ label, value, change, trend, icon: Icon, color }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="card-padded">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div
              className={`mt-1 flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-green-600" : "text-red-600"}`}
            >
              {trend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {change}%
            </div>
          )}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color] || colors.emerald}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function UsageGauge({ label, current, max, color = "emerald" }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const barColor =
    pct > 90 ? "bg-red-500" : pct > 75 ? "bg-amber-500" : `bg-${color}-500`;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {current.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    leads: 0,
    pipeline: 0,
    apiCalls: 0,
    compliance: 0,
  });
  const [usage, setUsage] = useState({ leads: 0, apiCalls: 0, compliance: 0 });
  const [limits, setLimits] = useState({
    leads: 50,
    apiCalls: 1000,
    compliance: 25,
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        // Fetch leads assigned to this installer
        const leadsQ = query(
          collection(db, "leads"),
          where("assignedTo", "==", user.uid),
          limit(100),
        );
        const leadsSnap = await getDocs(leadsQ);
        const leads = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const activeLeads = leads.filter(
          (l) => !["won", "lost"].includes(l.status),
        );
        const pipeline = leads
          .filter((l) =>
            ["proposal", "negotiation", "contract"].includes(l.status),
          )
          .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

        setMetrics({
          leads: activeLeads.length,
          pipeline,
          apiCalls: 0,
          compliance: 0,
        });
        setRecentLeads(leads.slice(0, 5));

        // Fetch subscription for limits
        const subQ = query(
          collection(db, "subscriptions"),
          where("userId", "==", user.uid),
          limit(1),
        );
        const subSnap = await getDocs(subQ);
        if (!subSnap.empty) {
          const sub = subSnap.docs[0].data();
          setLimits(
            sub.limits || { leads: 50, apiCalls: 1000, compliance: 25 },
          );
        }

        // Fetch usage for current month
        const month = new Date().toISOString().slice(0, 7);
        const usageQ = query(
          collection(db, "usage_records"),
          where("userId", "==", user.uid),
          where("month", "==", month),
          limit(1),
        );
        const usageSnap = await getDocs(usageQ);
        if (!usageSnap.empty) {
          const u = usageSnap.docs[0].data();
          setUsage({
            leads: u.lead_count || 0,
            apiCalls: u.api_call_count || 0,
            compliance: u.compliance_check_count || 0,
          });
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Leads"
          value={metrics.leads}
          icon={Users}
          color="emerald"
        />
        <MetricCard
          label="Pipeline Value"
          value={`$${metrics.pipeline.toLocaleString()}`}
          icon={DollarSign}
          color="blue"
        />
        <MetricCard
          label="API Calls"
          value={usage.apiCalls}
          icon={Activity}
          color="purple"
        />
        <MetricCard
          label="Compliance Checks"
          value={usage.compliance}
          icon={ShieldCheck}
          color="amber"
        />
      </div>

      {/* Usage Gauges */}
      <div className="card-padded">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Monthly Usage
        </h2>
        <div className="space-y-4">
          <UsageGauge label="Leads" current={usage.leads} max={limits.leads} />
          <UsageGauge
            label="API Calls"
            current={usage.apiCalls}
            max={limits.apiCalls}
            color="blue"
          />
          <UsageGauge
            label="Compliance Checks"
            current={usage.compliance}
            max={limits.compliance}
            color="amber"
          />
        </div>
      </div>

      {/* Recent Leads */}
      <div className="card">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
        </div>
        {recentLeads.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No leads yet. Create your first lead to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {lead.customerName || lead.name || "Unnamed"}
                  </p>
                  <p className="text-xs text-gray-500">{lead.email}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    lead.status === "new"
                      ? "bg-blue-100 text-blue-700"
                      : lead.status === "qualified"
                        ? "bg-emerald-100 text-emerald-700"
                        : lead.status === "won"
                          ? "bg-green-100 text-green-700"
                          : lead.status === "lost"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {lead.status || "new"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
