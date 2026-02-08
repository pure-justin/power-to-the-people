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
  TrendingUp,
  TrendingDown,
  Target,
  Phone,
  CalendarPlus,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const ACTIVE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "site_survey",
  "proposal",
  "negotiation",
  "contract",
];

const PIPELINE_STAGES = ["proposal", "negotiation", "contract"];

function MetricCard({ label, value, subtitle, icon: Icon, color }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="card-padded">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
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

export default function SalesHome() {
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "leads"),
          where("assignedTo", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(500),
        );
        const snap = await getDocs(q);
        setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("SalesHome load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayLeads = leads.filter((l) => {
    const created = l.createdAt?.toDate ? l.createdAt.toDate() : null;
    return created && created >= todayStart;
  });

  const activeLeads = leads.filter((l) => ACTIVE_STAGES.includes(l.status));
  const pipelineLeads = leads.filter((l) => PIPELINE_STAGES.includes(l.status));
  const pipelineValue = pipelineLeads.reduce(
    (sum, l) => sum + (l.estimatedValue || 0),
    0,
  );

  const wonLeads = leads.filter((l) => l.status === "won");
  const lostLeads = leads.filter((l) => l.status === "lost");
  const closedTotal = wonLeads.length + lostLeads.length;
  const closeRate =
    closedTotal > 0 ? Math.round((wonLeads.length / closedTotal) * 100) : 0;

  const needsFollowUp = leads.filter((l) => {
    if (["won", "lost"].includes(l.status)) return false;
    const updated = l.updatedAt?.toDate
      ? l.updatedAt.toDate()
      : l.createdAt?.toDate
        ? l.createdAt.toDate()
        : null;
    if (!updated) return false;
    const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 3;
  });

  const quickActions = [
    { label: "Log a Call", icon: Phone, href: "#" },
    { label: "Schedule Visit", icon: CalendarPlus, href: "#" },
    { label: "Create Proposal", icon: FileText, href: "#" },
    { label: "View Pipeline", icon: Target, href: "#" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.displayName || user?.displayName || "Sales"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here is your sales overview for today.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Today's New Leads"
          value={todayLeads.length}
          subtitle={`${activeLeads.length} active total`}
          icon={Users}
          color="emerald"
        />
        <MetricCard
          label="Pipeline Value"
          value={`$${pipelineValue.toLocaleString()}`}
          subtitle={`${pipelineLeads.length} deals in pipeline`}
          icon={DollarSign}
          color="blue"
        />
        <MetricCard
          label="Close Rate"
          value={`${closeRate}%`}
          subtitle={`${wonLeads.length} won / ${closedTotal} closed`}
          icon={Target}
          color="purple"
        />
        <MetricCard
          label="Needs Follow-Up"
          value={needsFollowUp.length}
          subtitle="No activity in 3+ days"
          icon={Clock}
          color={needsFollowUp.length > 5 ? "red" : "amber"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="card-padded">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <action.icon className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-gray-700">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stage Breakdown */}
        <div className="card-padded">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Pipeline Stages
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "New",
                value: "new",
                color: "bg-blue-500",
              },
              {
                label: "Contacted",
                value: "contacted",
                color: "bg-indigo-500",
              },
              {
                label: "Qualified",
                value: "qualified",
                color: "bg-emerald-500",
              },
              {
                label: "Site Survey",
                value: "site_survey",
                color: "bg-cyan-500",
              },
              {
                label: "Proposal",
                value: "proposal",
                color: "bg-amber-500",
              },
              {
                label: "Negotiation",
                value: "negotiation",
                color: "bg-orange-500",
              },
              {
                label: "Contract",
                value: "contract",
                color: "bg-purple-500",
              },
            ].map((stage) => {
              const count = leads.filter(
                (l) => l.status === stage.value,
              ).length;
              const max = Math.max(
                ...ACTIVE_STAGES.map(
                  (s) => leads.filter((l) => l.status === s).length,
                ),
                1,
              );
              const pct = Math.round((count / max) * 100);
              return (
                <div key={stage.value}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{stage.label}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${stage.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
          <a
            href="/sales/leads"
            className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        {leads.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No leads assigned yet. New leads will appear here.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {leads.slice(0, 8).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {lead.customerName || lead.name || "Unnamed"}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {lead.email || lead.phone || "No contact info"}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  {lead.estimatedValue ? (
                    <span className="text-xs font-medium text-gray-500">
                      ${lead.estimatedValue.toLocaleString()}
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      lead.status === "won"
                        ? "bg-green-100 text-green-700"
                        : lead.status === "lost"
                          ? "bg-red-100 text-red-700"
                          : lead.status === "new"
                            ? "bg-blue-100 text-blue-700"
                            : lead.status === "qualified"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {lead.status || "new"}
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
