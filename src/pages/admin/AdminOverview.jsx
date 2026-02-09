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
  TrendingDown,
  ArrowRight,
  Clock,
  ShoppingCart,
  HardHat,
  Star,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Gavel,
  CheckCircle2,
  XCircle,
  Timer,
  Zap,
  ChevronDown,
  Award,
  Target,
  BarChart3,
} from "lucide-react";

// Full 10-stage pipeline used by projects
const PIPELINE_STAGES = [
  { value: "lead", label: "Lead" },
  { value: "qualified", label: "Qualified" },
  { value: "sold", label: "Sold" },
  { value: "survey", label: "Survey" },
  { value: "design", label: "Design" },
  { value: "permit_submitted", label: "Permit" },
  { value: "installing", label: "Install" },
  { value: "inspection", label: "Inspection" },
  { value: "pto_submitted", label: "PTO" },
  { value: "activated", label: "Complete" },
];

// Gradient colors for the funnel
const FUNNEL_COLORS = [
  "bg-emerald-500",
  "bg-emerald-400",
  "bg-green-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
];

function formatTimestamp(ts) {
  if (!ts) return "N/A";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "N/A";
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isThisMonth(ts) {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
}

function isToday(ts) {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isThisWeek(ts) {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  return d >= weekAgo;
}

// --- Skeleton Loader ---
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

function SkeletonBlock({ height = "h-64" }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-6 animate-pulse ${height}`}
    />
  );
}

export default function AdminOverview() {
  useAuth();
  const [loading, setLoading] = useState(true);

  // KPI state
  const [kpi, setKpi] = useState({
    totalProjects: 0,
    activeListings: 0,
    workersRegistered: 0,
    revenueMtd: 0,
    projectsTrend: 0,
    listingsTrend: 0,
    workersTrend: 0,
    revenueTrend: 0,
  });

  // Pipeline funnel
  const [pipelineCounts, setPipelineCounts] = useState({});

  // Marketplace activity
  const [marketplace, setMarketplace] = useState({
    openListings: 0,
    bidsToday: 0,
    bidsWeek: 0,
    bidsMonth: 0,
    avgBidScore: 0,
    jobsCompletedMonth: 0,
    avgTimeToFill: 0,
  });

  // Worker leaderboard
  const [topWorkers, setTopWorkers] = useState([]);

  // SLA summary
  const [sla, setSla] = useState({
    activeViolations: 0,
    suspendedWorkers: 0,
    autoRequeued: 0,
    avgCompliance: 0,
  });

  // Recent activity feed
  const [activityFeed, setActivityFeed] = useState([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadKpiAndPipeline(),
        loadMarketplace(),
        loadWorkers(),
        loadSla(),
        loadActivityFeed(),
      ]);
    } catch (err) {
      console.error("AdminOverview load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- KPI + Pipeline ---
  const loadKpiAndPipeline = async () => {
    // Projects
    let projects = [];
    try {
      const projRef = collection(db, "projects");
      const projSnap = await getDocs(projRef);
      projects = projSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      /* collection may not exist */
    }

    // Pipeline counts
    const counts = {};
    PIPELINE_STAGES.forEach((s) => (counts[s.value] = 0));
    // Also count statuses that map to our stages but use different names
    const stageMap = {
      lead: "lead",
      new: "lead",
      qualified: "qualified",
      proposal: "qualified",
      sold: "sold",
      survey: "survey",
      design: "design",
      engineering: "design",
      permit_submitted: "permit_submitted",
      permit_approved: "permit_submitted",
      scheduled: "installing",
      installing: "installing",
      inspection: "inspection",
      pto_submitted: "pto_submitted",
      pto_approved: "pto_submitted",
      activated: "activated",
      monitoring: "activated",
      complete: "activated",
      completed: "activated",
    };
    projects.forEach((p) => {
      const raw = (p.status || p.pipeline_stage || "lead").toLowerCase();
      const mapped = stageMap[raw] || "lead";
      if (counts[mapped] !== undefined) counts[mapped]++;
    });
    setPipelineCounts(counts);

    // Revenue MTD
    const now = new Date();
    const mtdRevenue = projects
      .filter((p) => {
        if (!p.contractAmount && !p.systemCost) return false;
        const ts = p.sold_at || p.createdAt;
        return isThisMonth(ts);
      })
      .reduce((sum, p) => sum + (p.contractAmount || p.systemCost || 0), 0);

    // Count projects from last month for trend
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthProjects = projects.filter((p) => {
      const ts = p.createdAt;
      if (!ts) return false;
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }).length;
    const thisMonthProjects = projects.filter((p) =>
      isThisMonth(p.createdAt),
    ).length;
    const projectsTrend =
      lastMonthProjects > 0
        ? Math.round(
            ((thisMonthProjects - lastMonthProjects) / lastMonthProjects) * 100,
          )
        : thisMonthProjects > 0
          ? 100
          : 0;

    // Marketplace listings count for KPI
    let activeListings = 0;
    let allListings = [];
    try {
      const listRef = collection(db, "marketplace_listings");
      const listSnap = await getDocs(listRef);
      allListings = listSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      activeListings = allListings.filter((l) => l.status === "open").length;
    } catch (e) {
      /* collection may not exist */
    }

    // Listings trend: compare this month vs last month new listings
    const lastMonthListings = allListings.filter((l) => {
      const ts = l.created_at || l.createdAt;
      if (!ts) return false;
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }).length;
    const thisMonthListings = allListings.filter((l) =>
      isThisMonth(l.created_at || l.createdAt),
    ).length;
    const listingsTrend =
      lastMonthListings > 0
        ? Math.round(
            ((thisMonthListings - lastMonthListings) / lastMonthListings) * 100,
          )
        : thisMonthListings > 0
          ? 100
          : 0;

    // Workers count
    let workersCount = 0;
    let allWorkers = [];
    try {
      const wRef = collection(db, "workers");
      const wSnap = await getDocs(wRef);
      allWorkers = wSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      workersCount = allWorkers.length;
    } catch (e) {
      /* collection may not exist */
    }

    // Workers trend: compare this month vs last month new registrations
    const lastMonthWorkers = allWorkers.filter((w) => {
      const ts = w.createdAt || w.created_at;
      if (!ts) return false;
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }).length;
    const thisMonthWorkers = allWorkers.filter((w) =>
      isThisMonth(w.createdAt || w.created_at),
    ).length;
    const workersTrend =
      lastMonthWorkers > 0
        ? Math.round(
            ((thisMonthWorkers - lastMonthWorkers) / lastMonthWorkers) * 100,
          )
        : thisMonthWorkers > 0
          ? 100
          : 0;

    // Revenue trend: compare this month vs last month
    const lastMonthRevenue = projects
      .filter((p) => {
        if (!p.contractAmount && !p.systemCost) return false;
        const ts = p.sold_at || p.createdAt;
        if (!ts) return false;
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d >= lastMonthStart && d <= lastMonthEnd;
      })
      .reduce((sum, p) => sum + (p.contractAmount || p.systemCost || 0), 0);
    const revenueTrend =
      lastMonthRevenue > 0
        ? Math.round(((mtdRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : mtdRevenue > 0
          ? 100
          : 0;

    setKpi({
      totalProjects: projects.length,
      activeListings,
      workersRegistered: workersCount,
      revenueMtd: mtdRevenue,
      projectsTrend,
      listingsTrend,
      workersTrend,
      revenueTrend,
    });
  };

  // --- Marketplace Activity ---
  const loadMarketplace = async () => {
    let listings = [];
    let bids = [];

    try {
      const listRef = collection(db, "marketplace_listings");
      const listSnap = await getDocs(listRef);
      listings = listSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      /* collection may not exist */
    }

    try {
      const bidRef = collection(db, "marketplace_bids");
      const bidSnap = await getDocs(bidRef);
      bids = bidSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      /* collection may not exist */
    }

    const openListings = listings.filter((l) => l.status === "open").length;
    const bidsToday = bids.filter((b) =>
      isToday(b.created_at || b.createdAt),
    ).length;
    const bidsWeek = bids.filter((b) =>
      isThisWeek(b.created_at || b.createdAt),
    ).length;
    const bidsMonth = bids.filter((b) =>
      isThisMonth(b.created_at || b.createdAt),
    ).length;

    // Average bid score
    const scoredBids = bids.filter((b) => b.score != null);
    const avgBidScore =
      scoredBids.length > 0
        ? Math.round(
            scoredBids.reduce((sum, b) => sum + (b.score || 0), 0) /
              scoredBids.length,
          )
        : 0;

    // Jobs completed this month
    const jobsCompletedMonth = listings.filter(
      (l) =>
        l.status === "completed" && isThisMonth(l.completed_at || l.updatedAt),
    ).length;

    // Average time to fill (open to assigned, in days)
    const filledListings = listings.filter(
      (l) =>
        (l.status === "assigned" || l.status === "completed") &&
        l.created_at &&
        (l.assigned_at || l.accepted_at),
    );
    let avgTimeToFill = 0;
    if (filledListings.length > 0) {
      const totalDays = filledListings.reduce((sum, l) => {
        const created = l.created_at?.toDate
          ? l.created_at.toDate()
          : new Date(l.created_at);
        const assigned = (l.assigned_at || l.accepted_at)?.toDate
          ? (l.assigned_at || l.accepted_at).toDate()
          : new Date(l.assigned_at || l.accepted_at);
        const diffDays = Math.max(0, (assigned - created) / 86400000);
        return sum + diffDays;
      }, 0);
      avgTimeToFill = Math.round((totalDays / filledListings.length) * 10) / 10;
    }

    setMarketplace({
      openListings,
      bidsToday,
      bidsWeek,
      bidsMonth,
      avgBidScore,
      jobsCompletedMonth,
      avgTimeToFill,
    });
  };

  // --- Worker Leaderboard ---
  const loadWorkers = async () => {
    try {
      const wRef = collection(db, "workers");
      const wSnap = await getDocs(wRef);
      const workers = wSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Sort by rating (highest first)
      const sorted = workers
        .map((w) => ({
          id: w.id,
          name: w.name || "Unknown Worker",
          rating: w.ratings?.overall || w.avg_rating || 0,
          jobsCompleted: w.completed_jobs || w.jobs_completed || 0,
          reliabilityScore: w.reliability_score ?? 100,
          avgBidScore: w.avg_bid_score ?? 0,
        }))
        .sort(
          (a, b) => b.rating - a.rating || b.jobsCompleted - a.jobsCompleted,
        )
        .slice(0, 10);

      setTopWorkers(sorted);
    } catch (e) {
      setTopWorkers([]);
    }
  };

  // --- SLA Summary ---
  const loadSla = async () => {
    let activeViolations = 0;
    let suspendedWorkers = 0;
    let autoRequeued = 0;
    let avgCompliance = 0;

    // SLA violations
    try {
      const vRef = collection(db, "sla_violations");
      const vSnap = await getDocs(query(vRef, where("resolved", "==", false)));
      activeViolations = vSnap.size;
    } catch (e) {
      // Try without filter if index missing
      try {
        const vRef = collection(db, "sla_violations");
        const vSnap = await getDocs(vRef);
        activeViolations = vSnap.docs.filter((d) => !d.data().resolved).length;
      } catch (e2) {
        /* collection may not exist */
      }
    }

    // Suspended workers
    try {
      const wRef = collection(db, "workers");
      const wSnap = await getDocs(wRef);
      const allWorkers = wSnap.docs.map((d) => d.data());
      suspendedWorkers = allWorkers.filter(
        (w) => w.status === "suspended" || w.status === "deactivated",
      ).length;

      // Average compliance (reliability score across all workers)
      const withScore = allWorkers.filter((w) => w.reliability_score != null);
      avgCompliance =
        withScore.length > 0
          ? Math.round(
              withScore.reduce(
                (sum, w) => sum + (w.reliability_score || 0),
                0,
              ) / withScore.length,
            )
          : 100;
    } catch (e) {
      /* collection may not exist */
    }

    // Auto-requeued tasks this month
    try {
      const listRef = collection(db, "marketplace_listings");
      const listSnap = await getDocs(listRef);
      autoRequeued = listSnap.docs.filter((d) => {
        const data = d.data();
        return data.requeued && isThisMonth(data.requeued_at || data.updatedAt);
      }).length;
    } catch (e) {
      /* collection may not exist */
    }

    setSla({ activeViolations, suspendedWorkers, autoRequeued, avgCompliance });
  };

  // --- Activity Feed ---
  const loadActivityFeed = async () => {
    const events = [];

    // Recent projects
    try {
      const projRef = collection(db, "projects");
      const projSnap = await getDocs(
        query(projRef, orderBy("createdAt", "desc"), limit(10)),
      );
      projSnap.docs.forEach((d) => {
        const data = d.data();
        events.push({
          id: `proj-${d.id}`,
          type: "project",
          description: `New project: ${data.customerName || data.name || "Unknown"}`,
          detail: data.status ? `Status: ${data.status}` : null,
          timestamp: data.createdAt,
          icon: "project",
        });
      });
    } catch (e) {
      /* collection may not exist */
    }

    // Recent bids
    try {
      const bidRef = collection(db, "marketplace_bids");
      const bidSnap = await getDocs(
        query(bidRef, orderBy("created_at", "desc"), limit(8)),
      );
      bidSnap.docs.forEach((d) => {
        const data = d.data();
        events.push({
          id: `bid-${d.id}`,
          type: "bid",
          description: `Bid submitted: $${(data.price || 0).toLocaleString()}`,
          detail: data.service_type ? `Service: ${data.service_type}` : null,
          timestamp: data.created_at || data.createdAt,
          icon: "bid",
        });
      });
    } catch (e) {
      /* collection may not exist */
    }

    // Recent completed listings
    try {
      const listRef = collection(db, "marketplace_listings");
      const compSnap = await getDocs(
        query(
          listRef,
          where("status", "==", "completed"),
          orderBy("completed_at", "desc"),
          limit(5),
        ),
      );
      compSnap.docs.forEach((d) => {
        const data = d.data();
        events.push({
          id: `comp-${d.id}`,
          type: "completion",
          description: `Job completed: ${data.service_type || data.title || "Task"}`,
          detail: data.winning_bid ? `Worker assigned` : null,
          timestamp: data.completed_at,
          icon: "completion",
        });
      });
    } catch (e) {
      /* collection may not exist */
    }

    // Recent SLA violations
    try {
      const vRef = collection(db, "sla_violations");
      const vSnap = await getDocs(
        query(vRef, orderBy("created_at", "desc"), limit(5)),
      );
      vSnap.docs.forEach((d) => {
        const data = d.data();
        events.push({
          id: `viol-${d.id}`,
          type: "violation",
          description: `SLA violation: ${data.violation_type || data.reason || "Overdue task"}`,
          detail: data.worker_name ? `Worker: ${data.worker_name}` : null,
          timestamp: data.created_at,
          icon: "violation",
        });
      });
    } catch (e) {
      /* collection may not exist */
    }

    // Sort by timestamp desc, take 20
    events.sort((a, b) => {
      const tA = a.timestamp?.toDate
        ? a.timestamp.toDate()
        : new Date(a.timestamp || 0);
      const tB = b.timestamp?.toDate
        ? b.timestamp.toDate()
        : new Date(b.timestamp || 0);
      return tB - tA;
    });

    setActivityFeed(events.slice(0, 20));
  };

  // --- Render helpers ---
  const eventIcon = (type) => {
    switch (type) {
      case "project":
        return <FolderKanban size={14} className="text-emerald-500" />;
      case "bid":
        return <Gavel size={14} className="text-blue-500" />;
      case "completion":
        return <CheckCircle2 size={14} className="text-green-500" />;
      case "violation":
        return <AlertTriangle size={14} className="text-red-500" />;
      default:
        return <Activity size={14} className="text-gray-400" />;
    }
  };

  const eventBadgeColor = (type) => {
    switch (type) {
      case "project":
        return "bg-emerald-100 text-emerald-700";
      case "bid":
        return "bg-blue-100 text-blue-700";
      case "completion":
        return "bg-green-100 text-green-700";
      case "violation":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const reliabilityColor = (score) => {
    if (score > 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const reliabilityBg = (score) => {
    if (score > 80) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="space-y-6">
        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        {/* Pipeline Skeleton */}
        <SkeletonBlock height="h-56" />
        {/* Two-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonBlock height="h-72" />
          <SkeletonBlock height="h-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonBlock height="h-48" />
          <SkeletonBlock height="h-64" />
        </div>
      </div>
    );
  }

  // Pipeline totals for funnel visualization
  const pipelineTotal =
    Object.values(pipelineCounts).reduce((a, b) => a + b, 0) || 1;
  const pipelineMax = Math.max(...Object.values(pipelineCounts), 1);

  // KPI cards data
  const kpiCards = [
    {
      label: "Total Projects",
      value: kpi.totalProjects.toLocaleString(),
      icon: FolderKanban,
      accent: "text-emerald-400",
      bg: "bg-emerald-500/10",
      trend: kpi.projectsTrend,
    },
    {
      label: "Active Listings",
      value: kpi.activeListings.toLocaleString(),
      icon: ShoppingCart,
      accent: "text-blue-400",
      bg: "bg-blue-500/10",
      trend: kpi.listingsTrend,
    },
    {
      label: "Workers Registered",
      value: kpi.workersRegistered.toLocaleString(),
      icon: HardHat,
      accent: "text-purple-400",
      bg: "bg-purple-500/10",
      trend: kpi.workersTrend,
    },
    {
      label: "Revenue (MTD)",
      value: `$${kpi.revenueMtd >= 1000 ? `${(kpi.revenueMtd / 1000).toFixed(1)}k` : kpi.revenueMtd.toLocaleString()}`,
      icon: DollarSign,
      accent: "text-green-400",
      bg: "bg-green-500/10",
      trend: kpi.revenueTrend,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform analytics and operational overview
          </p>
        </div>
        <button
          onClick={loadAllData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* ====== 1. KPI Cards Row ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}
              >
                <card.icon size={20} className={card.accent} />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-extrabold text-gray-900">
                {card.value}
              </span>
              {card.trend !== 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-semibold mb-1 ${
                    card.trend > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {card.trend > 0 ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  {Math.abs(card.trend)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ====== 2. Pipeline Funnel ====== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <BarChart3 size={20} className="text-emerald-500" />
          Pipeline Funnel
        </h3>
        <p className="text-xs text-gray-500 mb-5">
          Projects at each stage with conversion rates
        </p>

        <div className="space-y-3">
          {PIPELINE_STAGES.map((stage, idx) => {
            const count = pipelineCounts[stage.value] || 0;
            const pct = Math.round((count / pipelineTotal) * 100);
            const barWidth = Math.max((count / pipelineMax) * 100, 4);
            const prevCount =
              idx > 0
                ? pipelineCounts[PIPELINE_STAGES[idx - 1].value] || 0
                : pipelineTotal;
            const conversion =
              prevCount > 0 && idx > 0
                ? Math.round((count / prevCount) * 100)
                : null;

            return (
              <div key={stage.value} className="flex items-center gap-3">
                <span className="w-20 text-xs font-medium text-gray-600 text-right truncate">
                  {stage.label}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden relative">
                  <div
                    className={`h-full ${FUNNEL_COLORS[idx] || "bg-emerald-500"} rounded-full flex items-center px-3 transition-all duration-500`}
                    style={{ width: `${barWidth}%` }}
                  >
                    <span className="text-xs font-bold text-white whitespace-nowrap drop-shadow">
                      {count}
                    </span>
                  </div>
                </div>
                <span className="w-12 text-xs text-gray-500 text-right">
                  {pct}%
                </span>
                {conversion !== null ? (
                  <span className="w-16 text-xs text-right">
                    <span
                      className={
                        conversion >= 60
                          ? "text-green-600"
                          : conversion >= 30
                            ? "text-yellow-600"
                            : "text-red-600"
                      }
                    >
                      {conversion}%
                    </span>
                    <ChevronDown
                      size={10}
                      className="inline text-gray-400 ml-0.5"
                    />
                  </span>
                ) : (
                  <span className="w-16" />
                )}
              </div>
            );
          })}
        </div>

        {/* Funnel summary row */}
        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{pipelineTotal}</p>
            <p className="text-xs text-gray-500">Total in Pipeline</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {pipelineCounts["activated"] || 0}
            </p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {(pipelineCounts["installing"] || 0) +
                (pipelineCounts["inspection"] || 0)}
            </p>
            <p className="text-xs text-gray-500">In Progress</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {pipelineTotal > 0
                ? Math.round(
                    ((pipelineCounts["activated"] || 0) / pipelineTotal) * 100,
                  )
                : 0}
              %
            </p>
            <p className="text-xs text-gray-500">Completion Rate</p>
          </div>
        </div>
      </div>

      {/* ====== 3. Marketplace Activity + 4. Worker Leaderboard ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Marketplace Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <ShoppingCart size={20} className="text-blue-500" />
            Marketplace Activity
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Open Listings */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Open Listings
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {marketplace.openListings}
              </p>
            </div>

            {/* Avg Bid Score */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Avg Bid Score
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {marketplace.avgBidScore}
                <span className="text-sm text-gray-500">/100</span>
              </p>
            </div>

            {/* Bids Submitted */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Bids Submitted
              </p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {marketplace.bidsToday}
                  </p>
                  <p className="text-xs text-gray-500">Today</p>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {marketplace.bidsWeek}
                  </p>
                  <p className="text-xs text-gray-500">This Week</p>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {marketplace.bidsMonth}
                  </p>
                  <p className="text-xs text-gray-500">This Month</p>
                </div>
              </div>
            </div>

            {/* Jobs Completed This Month */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Jobs Done (Month)
              </p>
              <p className="text-2xl font-bold text-green-600">
                {marketplace.jobsCompletedMonth}
              </p>
            </div>

            {/* Avg Time-to-Fill */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Avg Time to Fill
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {marketplace.avgTimeToFill}
                <span className="text-sm text-gray-500 ml-1">days</span>
              </p>
            </div>
          </div>
        </div>

        {/* Worker Leaderboard */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Award size={20} className="text-yellow-500" />
            Worker Leaderboard
            <span className="text-xs text-gray-500 font-normal ml-1">
              Top 10 by Rating
            </span>
          </h3>

          {topWorkers.length === 0 ? (
            <div className="text-center py-12">
              <HardHat size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No workers registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Worker
                    </th>
                    <th className="text-center pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="text-center pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Jobs
                    </th>
                    <th className="text-center pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reliability
                    </th>
                    <th className="text-center pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Bid Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topWorkers.map((w, i) => (
                    <tr
                      key={w.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2.5 text-sm text-gray-500 font-mono">
                        {i + 1}
                      </td>
                      <td className="py-2.5">
                        <span className="text-sm font-medium text-gray-900">
                          {w.name}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Star
                            size={12}
                            className="text-yellow-500 fill-yellow-500"
                          />
                          <span className="text-sm font-bold text-yellow-600">
                            {w.rating.toFixed(1)}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 text-center text-sm text-gray-600">
                        {w.jobsCompleted}
                      </td>
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${reliabilityBg(w.reliabilityScore)}`}
                              style={{
                                width: `${Math.min(w.reliabilityScore, 100)}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`text-xs font-bold ${reliabilityColor(w.reliabilityScore)}`}
                          >
                            {w.reliabilityScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-sm text-gray-600">
                        {w.avgBidScore || "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ====== 5. SLA Summary + 6. Recent Activity Feed ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SLA Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-500" />
            SLA Summary
          </h3>

          <div className="space-y-4">
            {/* Active Violations */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <span className="text-sm text-gray-700">Active Violations</span>
              </div>
              <span
                className={`text-xl font-bold ${
                  sla.activeViolations > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {sla.activeViolations}
              </span>
            </div>

            {/* Suspended Workers */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <XCircle size={16} className="text-orange-500" />
                </div>
                <span className="text-sm text-gray-700">Workers Suspended</span>
              </div>
              <span
                className={`text-xl font-bold ${
                  sla.suspendedWorkers > 0
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {sla.suspendedWorkers}
              </span>
            </div>

            {/* Auto-Requeued */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
                  <RefreshCw size={16} className="text-yellow-500" />
                </div>
                <span className="text-sm text-gray-700">
                  Auto-Requeued (Month)
                </span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {sla.autoRequeued}
              </span>
            </div>

            {/* Avg Compliance */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">
                  Avg SLA Compliance
                </span>
                <span
                  className={`text-lg font-bold ${
                    sla.avgCompliance >= 80
                      ? "text-green-600"
                      : sla.avgCompliance >= 50
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {sla.avgCompliance}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    sla.avgCompliance >= 80
                      ? "bg-green-500"
                      : sla.avgCompliance >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(sla.avgCompliance, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Clock size={20} className="text-gray-500" />
            Recent Activity
            <span className="text-xs text-gray-500 font-normal ml-1">
              Last 20 events
            </span>
          </h3>

          {activityFeed.length === 0 ? (
            <div className="text-center py-12">
              <Activity size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {activityFeed.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="mt-0.5">{eventIcon(event.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      {event.description}
                    </p>
                    {event.detail && (
                      <p className="text-xs text-gray-500 truncate">
                        {event.detail}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${eventBadgeColor(event.type)}`}
                    >
                      {event.type}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
