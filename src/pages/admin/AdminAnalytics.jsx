import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, getDocs, query, limit } from "../../services/firebase";
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Users,
  Layers,
  RefreshCw,
  Target,
  DollarSign,
  Clock,
  Award,
} from "lucide-react";

const FUNNEL_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];

const STAGE_COLORS = {
  new: "bg-gray-400",
  contacted: "bg-blue-400",
  qualified: "bg-emerald-400",
  proposal: "bg-amber-400",
  won: "bg-green-500",
  lost: "bg-red-400",
};

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load leads
      try {
        const ref = collection(db, "leads");
        const snap = await getDocs(query(ref, limit(2000)));
        setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setLeads([]);
      }

      // Load projects for revenue analytics
      try {
        const ref = collection(db, "projects");
        const snap = await getDocs(query(ref, limit(1000)));
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setProjects([]);
      }
    } catch (err) {
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Conversion funnel
  const stageCounts = {};
  FUNNEL_STAGES.forEach((s) => {
    stageCounts[s] = 0;
  });
  leads.forEach((l) => {
    const s = (l.status || "new").toLowerCase();
    if (stageCounts[s] !== undefined) stageCounts[s]++;
  });
  const total = leads.length || 1;

  // Lead source breakdown
  const sourceCounts = {};
  leads.forEach((l) => {
    const source = (l.source || l.leadSource || "direct").toLowerCase();
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxSourceCount = topSources.length > 0 ? topSources[0][1] : 1;

  // Geographic distribution
  const stateCounts = {};
  leads.forEach((l) => {
    const state = (l.state || l.address_state || "").toUpperCase();
    if (state) {
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    }
  });
  const topStates = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxStateCount = topStates.length > 0 ? topStates[0][1] : 1;

  // City distribution (secondary geo)
  const cityCounts = {};
  leads.forEach((l) => {
    const city = l.city || l.address_city || "";
    if (city) {
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    }
  });
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCityCount = topCities.length > 0 ? topCities[0][1] : 1;

  // Cohort analysis -- leads by month
  const cohortCounts = {};
  leads.forEach((l) => {
    let date = null;
    if (l.createdAt) {
      date = l.createdAt.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
    }
    if (date && !isNaN(date.getTime())) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!cohortCounts[key]) {
        cohortCounts[key] = { total: 0, won: 0, lost: 0, active: 0 };
      }
      cohortCounts[key].total++;
      const status = (l.status || "").toLowerCase();
      if (status === "won") cohortCounts[key].won++;
      else if (status === "lost") cohortCounts[key].lost++;
      else cohortCounts[key].active++;
    }
  });
  const cohortEntries = Object.entries(cohortCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12); // Last 12 months
  const maxCohortTotal =
    cohortEntries.length > 0
      ? Math.max(...cohortEntries.map(([, v]) => v.total))
      : 1;

  // Score distribution
  const scoreRanges = [
    { label: "0-20", min: 0, max: 20, count: 0 },
    { label: "21-40", min: 21, max: 40, count: 0 },
    { label: "41-60", min: 41, max: 60, count: 0 },
    { label: "61-80", min: 61, max: 80, count: 0 },
    { label: "81-100", min: 81, max: 100, count: 0 },
  ];
  leads.forEach((l) => {
    const score = l.score || l.leadScore || 0;
    const range = scoreRanges.find((r) => score >= r.min && score <= r.max);
    if (range) range.count++;
  });
  const maxScoreCount = Math.max(...scoreRanges.map((r) => r.count), 1);

  // Conversion rate
  const wonCount = stageCounts["won"] || 0;
  const lostCount = stageCounts["lost"] || 0;
  const conversionRate =
    wonCount + lostCount > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : 0;

  // Average lead score
  const avgScore =
    leads.length > 0
      ? Math.round(
          leads.reduce((sum, l) => sum + (l.score || l.leadScore || 0), 0) /
            leads.length,
        )
      : 0;

  // Revenue from projects
  const totalRevenue = projects.reduce(
    (sum, p) => sum + (p.contractAmount || p.systemCost || 0),
    0,
  );

  const metricCards = [
    {
      label: "Total Leads",
      value: leads.length.toLocaleString(),
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: Target,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Avg Lead Score",
      value: avgScore,
      icon: Award,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Pipeline Value",
      value: `$${(totalRevenue / 1000).toFixed(0)}k`,
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
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-48" />
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-48" />
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

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            Conversion Funnel
          </h3>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        <div className="space-y-3">
          {FUNNEL_STAGES.map((stage) => {
            const count = stageCounts[stage] || 0;
            const pct = Math.round((count / total) * 100);
            const barWidth = Math.max(pct, 3);
            const barColor = STAGE_COLORS[stage] || "bg-emerald-400";
            return (
              <div key={stage} className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium text-gray-600 capitalize text-right">
                  {stage}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full flex items-center px-3 transition-all`}
                    style={{ width: `${barWidth}%` }}
                  >
                    <span className="text-xs font-bold text-white whitespace-nowrap">
                      {count} ({pct}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead Source Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-500" />
            Lead Source Breakdown
          </h3>
          {topSources.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">No source data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topSources.map(([source, count]) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-600 capitalize truncate text-right">
                      {source}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full flex items-center px-2"
                        style={{
                          width: `${Math.max((count / maxSourceCount) * 100, 8)}%`,
                        }}
                      >
                        <span className="text-xs font-bold text-white whitespace-nowrap">
                          {count}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-red-500" />
            Geographic Distribution
          </h3>
          {topStates.length === 0 ? (
            <div className="text-center py-12">
              <MapPin size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">
                No location data available
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topStates.map(([state, count]) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={state} className="flex items-center gap-3">
                    <span className="w-12 text-sm font-bold text-gray-700 text-right">
                      {state}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full flex items-center px-2"
                        style={{
                          width: `${Math.max((count / maxStateCount) * 100, 8)}%`,
                        }}
                      >
                        <span className="text-xs font-bold text-white whitespace-nowrap">
                          {count}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead Score Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award size={20} className="text-purple-500" />
            Lead Score Distribution
          </h3>
          <div className="space-y-3">
            {scoreRanges.map((range) => {
              const pct =
                leads.length > 0
                  ? Math.round((range.count / leads.length) * 100)
                  : 0;
              return (
                <div key={range.label} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium text-gray-600 text-right">
                    {range.label}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full flex items-center px-2"
                      style={{
                        width: `${Math.max((range.count / maxScoreCount) * 100, 5)}%`,
                      }}
                    >
                      <span className="text-xs font-bold text-white whitespace-nowrap">
                        {range.count}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-emerald-500" />
            Top Cities
          </h3>
          {topCities.length === 0 ? (
            <div className="text-center py-12">
              <MapPin size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">No city data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCities.map(([city, count]) => (
                <div key={city} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-gray-600 truncate text-right">
                    {city}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full flex items-center px-2"
                      style={{
                        width: `${Math.max((count / maxCityCount) * 100, 8)}%`,
                      }}
                    >
                      <span className="text-xs font-bold text-white whitespace-nowrap">
                        {count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cohort Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Layers size={20} className="text-purple-500" />
          Cohort Analysis
          <span className="text-sm font-normal text-gray-400">(by month)</span>
        </h3>

        {cohortEntries.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">
              No time-based data available
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Month
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    New Leads
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Won
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Lost
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Active
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Win Rate
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cohortEntries.map(([month, data]) => {
                  const winRate =
                    data.won + data.lost > 0
                      ? Math.round((data.won / (data.won + data.lost)) * 100)
                      : 0;
                  return (
                    <tr
                      key={month}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {month}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {data.total}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">
                          {data.won}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold">
                          {data.lost}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
                          {data.active}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-bold ${
                            winRate >= 50
                              ? "text-green-600"
                              : winRate >= 25
                                ? "text-amber-600"
                                : "text-gray-400"
                          }`}
                        >
                          {winRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{
                              width: `${(data.total / maxCohortTotal) * 100}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
