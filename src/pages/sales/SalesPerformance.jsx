import { useState, useEffect, useMemo } from "react";
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
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Users,
  Award,
  ArrowRight,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

const STAGES_ORDERED = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-indigo-500" },
  { value: "qualified", label: "Qualified", color: "bg-emerald-500" },
  { value: "site_survey", label: "Site Survey", color: "bg-cyan-500" },
  { value: "proposal", label: "Proposal", color: "bg-amber-500" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-500" },
  { value: "contract", label: "Contract", color: "bg-purple-500" },
  { value: "won", label: "Won", color: "bg-green-500" },
  { value: "lost", label: "Lost", color: "bg-red-500" },
];

function StatCard({ label, value, subtitle, icon: Icon, color, trend }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
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

function FunnelBar({ label, count, total, color, pctOfPrevious }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-24 shrink-0 text-right">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{count} leads</p>
      </div>
      <div className="flex-1">
        <div className="h-8 overflow-hidden rounded-lg bg-gray-100">
          <div
            className={`flex h-full items-center rounded-lg ${color} px-3 text-xs font-medium text-white transition-all`}
            style={{ width: `${Math.max(pct, 2)}%` }}
          >
            {pct > 10 ? `${pct}%` : ""}
          </div>
        </div>
      </div>
      {pctOfPrevious !== undefined && (
        <div className="w-16 text-right">
          <span className="text-xs font-medium text-gray-500">
            {pctOfPrevious}%
          </span>
        </div>
      )}
    </div>
  );
}

export default function SalesPerformance() {
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState([]);
  const [allSalesLeads, setAllSalesLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all"); // "all" | "month" | "quarter"

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        // My leads
        const myQ = query(
          collection(db, "leads"),
          where("assignedTo", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1000),
        );
        const mySnap = await getDocs(myQ);
        setLeads(mySnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // All sales leads for leaderboard (best-effort, may fail if no index)
        try {
          const allQ = query(
            collection(db, "leads"),
            orderBy("createdAt", "desc"),
            limit(2000),
          );
          const allSnap = await getDocs(allQ);
          setAllSalesLeads(
            allSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          );
        } catch {
          // Leaderboard data unavailable; use own leads only
          setAllSalesLeads([]);
        }
      } catch (err) {
        console.error("Failed to load performance data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const [filters, setFilters] = useState({});

  // Leaderboard data from all sales leads
  const leaderboard = useMemo(() => {
    const salesRepMap = {};
    allSalesLeads.forEach((l) => {
      if (!l.assignedTo) return;
      if (!salesRepMap[l.assignedTo]) {
        salesRepMap[l.assignedTo] = { won: 0, total: 0, revenue: 0, name: "" };
      }
      salesRepMap[l.assignedTo].total++;
      if (l.status === "won") {
        salesRepMap[l.assignedTo].won++;
        salesRepMap[l.assignedTo].revenue += l.estimatedValue || 0;
      }
      if (l.assignedToName) {
        salesRepMap[l.assignedTo].name = l.assignedToName;
      }
    });

    return Object.entries(salesRepMap)
      .map(([uid, data]) => ({
        uid,
        name:
          data.name ||
          (uid === user?.uid ? profile?.displayName || "You" : "Rep"),
        won: data.won,
        total: data.total,
        revenue: data.revenue,
        rate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
        isMe: uid === user?.uid,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((rep, i) => ({ ...rep, rank: i + 1 }));
  }, [allSalesLeads, user, profile]);

  const leaderboardFilterDefs = useMemo(() => {
    const repNames = [...new Set(leaderboard.map((r) => r.name))].sort();
    return [
      {
        key: "rep",
        label: "Rep",
        options: repNames.map((n) => ({ value: n, label: n })),
      },
      {
        key: "rateRange",
        label: "Close Rate",
        options: [
          { value: "30+", label: "30%+" },
          { value: "15-29", label: "15-29%" },
          { value: "0-14", label: "Under 15%" },
        ],
      },
    ];
  }, [leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    let result = leaderboard;
    if (filters.rep) {
      result = result.filter((r) => r.name === filters.rep);
    }
    if (filters.rateRange) {
      result = result.filter((r) => {
        if (filters.rateRange === "30+") return r.rate >= 30;
        if (filters.rateRange === "15-29") return r.rate >= 15 && r.rate < 30;
        if (filters.rateRange === "0-14") return r.rate < 15;
        return true;
      });
    }
    return result;
  }, [leaderboard, filters]);

  const leaderboardColumns = useMemo(
    () => [
      {
        key: "rank",
        label: "#",
        sortable: false,
        render: (val) => (
          <span className="font-medium text-gray-500">{val}</span>
        ),
      },
      {
        key: "name",
        label: "Rep",
        sortable: true,
        render: (val, row) => (
          <span
            className={`font-medium ${row.isMe ? "text-emerald-700" : "text-gray-900"}`}
          >
            {val}
            {row.isMe && " (You)"}
          </span>
        ),
      },
      { key: "won", label: "Won", sortable: true },
      { key: "total", label: "Total", sortable: true },
      {
        key: "rate",
        label: "Rate",
        sortable: true,
        render: (val) => (
          <span
            className={`font-medium ${val >= 30 ? "text-green-600" : val >= 15 ? "text-amber-600" : "text-red-600"}`}
          >
            {val}%
          </span>
        ),
      },
      {
        key: "revenue",
        label: "Revenue",
        sortable: true,
        render: (val) => (
          <span className="font-medium text-gray-900">
            ${val.toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-56 rounded-lg bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-gray-100" />
        <div className="h-48 rounded-xl bg-gray-100" />
      </div>
    );
  }

  // Filter by time range
  let filteredLeads = leads;
  if (timeRange !== "all") {
    const now = new Date();
    let start;
    if (timeRange === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1);
    }
    filteredLeads = leads.filter((l) => {
      const created = l.createdAt?.toDate ? l.createdAt.toDate() : null;
      return created && created >= start;
    });
  }

  // Stats
  const total = filteredLeads.length;
  const won = filteredLeads.filter((l) => l.status === "won");
  const lost = filteredLeads.filter((l) => l.status === "lost");
  const closed = won.length + lost.length;
  const closeRate = closed > 0 ? Math.round((won.length / closed) * 100) : 0;
  const totalRevenue = won.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  const avgDealSize =
    won.length > 0 ? Math.round(totalRevenue / won.length) : 0;

  // Avg days to close
  const daysToClose = won
    .map((l) => {
      const created = l.createdAt?.toDate ? l.createdAt.toDate() : null;
      const updated = l.updatedAt?.toDate ? l.updatedAt.toDate() : null;
      if (!created || !updated) return null;
      return Math.round(
        (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
      );
    })
    .filter((d) => d !== null);
  const avgDaysToClose =
    daysToClose.length > 0
      ? Math.round(daysToClose.reduce((a, b) => a + b, 0) / daysToClose.length)
      : 0;

  // Funnel
  const stageCounts = STAGES_ORDERED.map((stage) => ({
    ...stage,
    count: filteredLeads.filter((l) => l.status === stage.value).length,
  }));

  // Running totals for funnel: count leads that reached at least this stage
  const stageIndex = {};
  STAGES_ORDERED.forEach((s, i) => {
    stageIndex[s.value] = i;
  });
  const funnelData = STAGES_ORDERED.slice(0, -1).map((stage, i) => {
    // Leads that are at this stage or beyond
    const reachedCount = filteredLeads.filter(
      (l) => (stageIndex[l.status] ?? 0) >= i,
    ).length;
    const prevCount =
      i === 0
        ? total
        : filteredLeads.filter((l) => (stageIndex[l.status] ?? 0) >= i - 1)
            .length;
    const convRate =
      prevCount > 0 ? Math.round((reachedCount / prevCount) * 100) : 0;
    return {
      ...stage,
      count: reachedCount,
      pctOfPrevious: i > 0 ? convRate : undefined,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Sales Performance
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your conversion metrics and pipeline analysis.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {[
            { value: "all", label: "All Time" },
            { value: "quarter", label: "Quarter" },
            { value: "month", label: "Month" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                timeRange === opt.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Close Rate"
          value={`${closeRate}%`}
          subtitle={`${won.length} won / ${closed} closed`}
          icon={Target}
          color="emerald"
        />
        <StatCard
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          subtitle={`${won.length} deals won`}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          label="Avg Deal Size"
          value={`$${avgDealSize.toLocaleString()}`}
          subtitle="per closed deal"
          icon={BarChart3}
          color="purple"
        />
        <StatCard
          label="Avg Days to Close"
          value={avgDaysToClose || "--"}
          subtitle="from lead to won"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Wins vs Losses */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-padded">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Deals Won</p>
              <p className="text-xl font-bold text-green-600">{won.length}</p>
            </div>
          </div>
        </div>
        <div className="card-padded">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Deals Lost</p>
              <p className="text-xl font-bold text-red-600">{lost.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="card-padded">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Conversion Funnel
          </h2>
          <span className="text-sm text-gray-400">{total} total leads</span>
        </div>
        <div className="space-y-3">
          {funnelData.map((stage) => (
            <FunnelBar
              key={stage.value}
              label={stage.label}
              count={stage.count}
              total={total}
              color={stage.color}
              pctOfPrevious={stage.pctOfPrevious}
            />
          ))}
        </div>
      </div>

      {/* Stage Distribution */}
      <div className="card-padded">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Current Stage Distribution
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {stageCounts.map((stage) => (
            <div
              key={stage.value}
              className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
            >
              <span className={`h-3 w-3 rounded-full ${stage.color}`} />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {stage.label}
                </p>
                <p className="text-lg font-bold text-gray-900">{stage.count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Sales Leaderboard
            </h2>
          </div>
          <FilterBar
            filters={leaderboardFilterDefs}
            activeFilters={filters}
            onChange={setFilters}
          />
          <DataTable
            columns={leaderboardColumns}
            data={filteredLeaderboard}
            emptyMessage="No reps match the selected filters."
          />
        </div>
      )}
    </div>
  );
}
