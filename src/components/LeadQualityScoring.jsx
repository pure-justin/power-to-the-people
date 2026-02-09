import { useMemo, useState, useCallback, Fragment } from "react";
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  Zap,
  Shield,
  Activity,
  Filter,
  BarChart3,
  Eye,
  ArrowRight,
  Flame,
  Sun,
  Snowflake,
  ThermometerSnowflake,
} from "lucide-react";
import {
  scoreAllLeads,
  TIER_CONFIG,
  CATEGORY_LABELS,
} from "../utils/leadScoring";

const CATEGORY_ICONS = {
  contact: Users,
  qualification: Shield,
  energyData: Zap,
  systemDesign: Activity,
  engagement: TrendingUp,
};

const CAT_COLORS = {
  contact: "#3b82f6",
  qualification: "#10b981",
  energyData: "#f59e0b",
  systemDesign: "#8b5cf6",
  engagement: "#ec4899",
};

const TIER_ICONS = {
  Hot: Flame,
  Warm: Sun,
  Cool: Snowflake,
  Cold: ThermometerSnowflake,
};

/**
 * Lead Quality Scoring Visualization
 * Full-featured scoring dashboard with radar chart, funnel, heatmap, and trends
 */
export default function LeadQualityScoring({ projects }) {
  const [expandedLead, setExpandedLead] = useState(null);
  const [showTopLeads, setShowTopLeads] = useState(true);
  const [activeTierFilter, setActiveTierFilter] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredHistBucket, setHoveredHistBucket] = useState(null);

  const analytics = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return scoreAllLeads(projects);
  }, [projects]);

  // Funnel data: shows conversion from total leads through tiers
  const funnelData = useMemo(() => {
    if (!analytics) return [];
    const { distribution, total } = analytics;
    const withContact = analytics.scored.filter(
      (l) => l.scoring.breakdown.contact.score > 50,
    ).length;
    const qualified = analytics.scored.filter(
      (l) => l.scoring.breakdown.qualification.score > 50,
    ).length;
    const warmPlus = (distribution.Hot || 0) + (distribution.Warm || 0);
    const hot = distribution.Hot || 0;
    return [
      { label: "All Leads", count: total, color: "#6b7280" },
      { label: "Has Contact Info", count: withContact, color: "#3b82f6" },
      { label: "Qualified", count: qualified, color: "#f59e0b" },
      { label: "Warm+", count: warmPlus, color: "#10b981" },
      { label: "Hot", count: hot, color: "#ef4444" },
    ];
  }, [analytics]);

  // Time-based scoring (group by creation week/month)
  const scoreTrend = useMemo(() => {
    if (!analytics || analytics.scored.length === 0) return [];
    const sorted = [...analytics.scored].sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
      const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
      return (
        (aTime instanceof Date ? aTime : new Date(aTime)) -
        (bTime instanceof Date ? bTime : new Date(bTime))
      );
    });

    // Group into ~8 buckets
    const bucketSize = Math.max(1, Math.ceil(sorted.length / 8));
    const buckets = [];
    for (let i = 0; i < sorted.length; i += bucketSize) {
      const slice = sorted.slice(i, i + bucketSize);
      const avgScore = Math.round(
        slice.reduce((s, l) => s + l.scoring.totalScore, 0) / slice.length,
      );
      const dateObj = slice[0].createdAt?.toDate?.() || slice[0].createdAt;
      const label = dateObj
        ? new Date(dateObj).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : `Batch ${buckets.length + 1}`;
      buckets.push({ label, avgScore, count: slice.length });
    }
    return buckets;
  }, [analytics]);

  // Heatmap: category scores by tier
  const heatmapData = useMemo(() => {
    if (!analytics) return null;
    const tiers = ["Hot", "Warm", "Cool", "Cold"];
    const categories = Object.keys(CAT_COLORS);
    const grid = {};
    tiers.forEach((tier) => {
      grid[tier] = {};
      const leadsInTier = analytics.scored.filter(
        (l) => l.scoring.tier.label === tier,
      );
      categories.forEach((cat) => {
        grid[tier][cat] =
          leadsInTier.length > 0
            ? Math.round(
                leadsInTier.reduce(
                  (s, l) => s + l.scoring.breakdown[cat].score,
                  0,
                ) / leadsInTier.length,
              )
            : 0;
      });
    });
    return { tiers, categories, grid };
  }, [analytics]);

  // Filtered leads based on tier selection
  const filteredLeads = useMemo(() => {
    if (!analytics) return [];
    if (!activeTierFilter) return analytics.scored;
    return analytics.scored.filter(
      (l) => l.scoring.tier.label === activeTierFilter,
    );
  }, [analytics, activeTierFilter]);

  const toggleTierFilter = useCallback((tier) => {
    setActiveTierFilter((prev) => (prev === tier ? null : tier));
  }, []);

  if (!analytics) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
        <BarChart3 size={48} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
        <div style={{ fontSize: "1rem", fontWeight: 600 }}>
          No lead data available
        </div>
        <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
          Leads will appear here once customers submit qualification forms
        </div>
      </div>
    );
  }

  const maxHistCount = Math.max(...analytics.histogram.map((h) => h.count), 1);

  return (
    <>
      <style>{`
        .lqs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px; }
        .lqs-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .lqs-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; transition: box-shadow 0.2s; }
        .lqs-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .lqs-card-full { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px; transition: box-shadow 0.2s; }
        .lqs-card-full:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .lqs-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .lqs-title { font-size: 0.95rem; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 8px; }
        .lqs-subtitle { font-size: 0.8rem; color: #9ca3af; margin-top: 2px; }

        /* Score Gauge */
        .lqs-gauge { display: flex; flex-direction: column; align-items: center; padding: 16px 0; }
        .lqs-gauge-ring { position: relative; width: 160px; height: 160px; }
        .lqs-gauge-svg { transform: rotate(-90deg); }
        .lqs-gauge-bg { fill: none; stroke: #f3f4f6; stroke-width: 12; }
        .lqs-gauge-fill { fill: none; stroke-width: 12; stroke-linecap: round; transition: stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .lqs-gauge-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
        .lqs-gauge-value { font-size: 2.5rem; font-weight: 800; color: #111827; line-height: 1; }
        .lqs-gauge-text { font-size: 0.75rem; color: #9ca3af; margin-top: 4px; }
        .lqs-gauge-tier { font-size: 0.7rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }

        /* Tier Cards */
        .lqs-tier-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .lqs-tier-card { padding: 14px 12px; border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; position: relative; overflow: hidden; }
        .lqs-tier-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .lqs-tier-card.active { border-color: currentColor; }
        .lqs-tier-card-count { font-size: 1.5rem; font-weight: 800; line-height: 1; }
        .lqs-tier-card-label { font-size: 0.75rem; font-weight: 600; margin-top: 4px; }
        .lqs-tier-card-pct { font-size: 0.65rem; opacity: 0.7; margin-top: 2px; }
        .lqs-tier-card-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; }

        /* Radar Chart */
        .lqs-radar-wrap { display: flex; justify-content: center; padding: 8px 0; }

        /* Category Bars */
        .lqs-cat-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; cursor: default; transition: background 0.15s; border-radius: 6px; padding-left: 4px; padding-right: 4px; }
        .lqs-cat-row:hover { background: #f9fafb; }
        .lqs-cat-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .lqs-cat-info { flex: 1; min-width: 0; }
        .lqs-cat-name { font-size: 0.8rem; font-weight: 600; color: #374151; }
        .lqs-cat-bar-wrap { height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; margin-top: 4px; }
        .lqs-cat-bar { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
        .lqs-cat-score { font-size: 0.85rem; font-weight: 700; width: 36px; text-align: right; flex-shrink: 0; }

        /* Histogram */
        .lqs-histogram { display: flex; align-items: flex-end; gap: 4px; height: 120px; padding-top: 8px; }
        .lqs-hist-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .lqs-hist-bar { width: 100%; border-radius: 4px 4px 0 0; transition: all 0.4s ease; position: relative; cursor: pointer; }
        .lqs-hist-bar:hover { filter: brightness(1.1); transform: scaleY(1.05); transform-origin: bottom; }
        .lqs-hist-bar.highlighted { filter: brightness(1.15); box-shadow: 0 0 8px rgba(0,0,0,0.15); }
        .lqs-hist-count { font-size: 0.7rem; font-weight: 600; color: #6b7280; line-height: 1; }
        .lqs-hist-label { font-size: 0.6rem; color: #9ca3af; white-space: nowrap; }
        .lqs-hist-tooltip { position: absolute; top: -32px; left: 50%; transform: translateX(-50%); background: #111827; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; white-space: nowrap; pointer-events: none; z-index: 10; }

        /* Funnel */
        .lqs-funnel { display: flex; flex-direction: column; gap: 6px; padding: 4px 0; }
        .lqs-funnel-step { display: flex; align-items: center; gap: 12px; }
        .lqs-funnel-bar-wrap { flex: 1; position: relative; }
        .lqs-funnel-bar { height: 32px; border-radius: 6px; display: flex; align-items: center; padding: 0 12px; transition: width 0.6s ease; }
        .lqs-funnel-label { font-size: 0.8rem; font-weight: 600; color: white; white-space: nowrap; }
        .lqs-funnel-count { width: 50px; font-size: 0.85rem; font-weight: 700; color: #374151; text-align: right; flex-shrink: 0; }
        .lqs-funnel-pct { width: 40px; font-size: 0.75rem; color: #9ca3af; text-align: right; flex-shrink: 0; }
        .lqs-funnel-arrow { display: flex; justify-content: center; padding: 0 0 0 50px; }

        /* Sparkline / Trend */
        .lqs-trend { display: flex; align-items: flex-end; gap: 3px; height: 80px; padding-top: 8px; }
        .lqs-trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .lqs-trend-bar { width: 100%; border-radius: 3px; transition: height 0.5s ease; }
        .lqs-trend-val { font-size: 0.65rem; font-weight: 600; color: #6b7280; }
        .lqs-trend-label { font-size: 0.55rem; color: #9ca3af; white-space: nowrap; }

        /* Heatmap */
        .lqs-heatmap { display: grid; gap: 3px; }
        .lqs-heatmap-cell { border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; height: 36px; transition: all 0.2s; cursor: default; }
        .lqs-heatmap-cell:hover { transform: scale(1.08); z-index: 1; }
        .lqs-heatmap-label { font-size: 0.7rem; font-weight: 600; color: #6b7280; display: flex; align-items: center; justify-content: center; }

        /* Lead Table */
        .lqs-leads-table { width: 100%; border-collapse: collapse; }
        .lqs-leads-table th { text-align: left; font-size: 0.75rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .lqs-leads-table td { padding: 10px 12px; font-size: 0.85rem; border-bottom: 1px solid #f3f4f6; color: #374151; }
        .lqs-leads-table tr:hover { background: #f9fafb; }
        .lqs-leads-table tr.expanded { background: #f0fdf4; }
        .lqs-score-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
        .lqs-expand-row td { padding: 12px 16px; background: #fafafa; }
        .lqs-signal-tags { display: flex; flex-wrap: wrap; gap: 4px; }
        .lqs-signal-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 500; background: #e5e7eb; color: #374151; }
        .lqs-signal-tag.positive { background: #dcfce7; color: #166534; }

        .lqs-toggle-btn { background: none; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 14px; font-size: 0.8rem; color: #6b7280; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .lqs-toggle-btn:hover { border-color: #10b981; color: #10b981; }

        .lqs-filter-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; font-weight: 500; background: #f3f4f6; color: #6b7280; cursor: pointer; border: none; transition: all 0.2s; }
        .lqs-filter-chip:hover { background: #e5e7eb; }
        .lqs-filter-chip.active { background: #10b981; color: white; }

        @media (max-width: 768px) {
          .lqs-grid { grid-template-columns: 1fr; }
          .lqs-grid-2 { grid-template-columns: 1fr; }
          .lqs-tier-cards { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* Row 1: Score Gauge + Tier Cards */}
      <div className="lqs-grid" style={{ gridTemplateColumns: "340px 1fr" }}>
        {/* Average Score Gauge */}
        <div className="lqs-card">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <Target size={16} style={{ color: "#10b981" }} />
                Lead Score Overview
              </div>
              <div className="lqs-subtitle">Across {analytics.total} leads</div>
            </div>
          </div>
          <ScoreGauge score={analytics.avgScore} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginTop: 8,
            }}
          >
            <MiniStat
              label="Highest"
              value={analytics.topLeads[0]?.scoring.totalScore ?? 0}
              color="#10b981"
            />
            <MiniStat
              label="Median"
              value={
                analytics.scored.length > 0
                  ? ([...analytics.scored].sort(
                      (a, b) => a.scoring.totalScore - b.scoring.totalScore,
                    )[Math.floor(analytics.scored.length / 2)]?.scoring
                      .totalScore ?? 0)
                  : 0
              }
              color="#f59e0b"
            />
            <MiniStat
              label="Lowest"
              value={analytics.bottomLeads[0]?.scoring.totalScore ?? 0}
              color="#ef4444"
            />
          </div>
        </div>

        {/* Tier Distribution Cards */}
        <div className="lqs-card">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <Award size={16} style={{ color: "#f59e0b" }} />
                Quality Tiers
              </div>
              <div className="lqs-subtitle">
                Click a tier to filter leads
                {activeTierFilter && (
                  <span
                    style={{
                      marginLeft: 8,
                      color: "#10b981",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    onClick={() => setActiveTierFilter(null)}
                  >
                    Clear filter
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="lqs-tier-cards">
            {Object.entries(TIER_CONFIG).map(([tier, config]) => {
              const count = analytics.distribution[tier] || 0;
              const pct =
                analytics.total > 0
                  ? Math.round((count / analytics.total) * 100)
                  : 0;
              const TierIcon = TIER_ICONS[tier];
              const isActive = activeTierFilter === tier;
              return (
                <div
                  key={tier}
                  className={`lqs-tier-card ${isActive ? "active" : ""}`}
                  style={{
                    background: isActive ? config.bg : `${config.bg}80`,
                    color: config.color,
                    borderColor: isActive ? config.color : "transparent",
                  }}
                  onClick={() => toggleTierFilter(tier)}
                >
                  <TierIcon
                    size={18}
                    style={{ marginBottom: 4, opacity: 0.8 }}
                  />
                  <div className="lqs-tier-card-count">{count}</div>
                  <div className="lqs-tier-card-label">{tier}</div>
                  <div className="lqs-tier-card-pct">{pct}%</div>
                  <div
                    className="lqs-tier-card-bar"
                    style={{ background: config.color }}
                  />
                </div>
              );
            })}
          </div>
          {/* Tier progress bar */}
          <div
            style={{
              display: "flex",
              height: 8,
              borderRadius: 4,
              overflow: "hidden",
              marginTop: 16,
              background: "#f3f4f6",
            }}
          >
            {Object.entries(TIER_CONFIG).map(([tier, config]) => {
              const count = analytics.distribution[tier] || 0;
              const pct =
                analytics.total > 0 ? (count / analytics.total) * 100 : 0;
              return (
                <div
                  key={tier}
                  style={{
                    width: `${pct}%`,
                    background: config.color,
                    transition: "width 0.6s ease",
                  }}
                  title={`${tier}: ${count} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Radar Chart + Category Breakdown + Conversion Funnel */}
      <div className="lqs-grid">
        {/* Radar Chart */}
        <div className="lqs-card">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <Activity size={16} style={{ color: "#8b5cf6" }} />
                Score Radar
              </div>
              <div className="lqs-subtitle">Category performance overview</div>
            </div>
          </div>
          <div className="lqs-radar-wrap">
            <RadarChart
              data={analytics.categoryAverages}
              hoveredCategory={hoveredCategory}
              onHover={setHoveredCategory}
            />
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="lqs-card">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <BarChart3 size={16} style={{ color: "#10b981" }} />
                Category Breakdown
              </div>
              <div className="lqs-subtitle">Average scores by dimension</div>
            </div>
          </div>
          {Object.entries(analytics.categoryAverages).map(([cat, avg]) => {
            const Icon = CATEGORY_ICONS[cat];
            const color = CAT_COLORS[cat];
            const isHovered = hoveredCategory === cat;
            return (
              <div
                key={cat}
                className="lqs-cat-row"
                style={{
                  background: isHovered ? `${color}08` : undefined,
                }}
                onMouseEnter={() => setHoveredCategory(cat)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div
                  className="lqs-cat-icon"
                  style={{ background: `${color}15` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="lqs-cat-info">
                  <div className="lqs-cat-name">{CATEGORY_LABELS[cat]}</div>
                  <div className="lqs-cat-bar-wrap">
                    <div
                      className="lqs-cat-bar"
                      style={{
                        width: `${avg}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                      }}
                    />
                  </div>
                </div>
                <div className="lqs-cat-score" style={{ color }}>
                  {avg}
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversion Funnel */}
        <div className="lqs-card">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <Filter size={16} style={{ color: "#3b82f6" }} />
                Scoring Funnel
              </div>
              <div className="lqs-subtitle">Lead qualification pipeline</div>
            </div>
          </div>
          <div className="lqs-funnel">
            {funnelData.map((step, i) => {
              const maxCount = funnelData[0]?.count || 1;
              const widthPct = Math.max(20, (step.count / maxCount) * 100);
              const pct =
                maxCount > 0 ? Math.round((step.count / maxCount) * 100) : 0;
              return (
                <div key={step.label}>
                  <div className="lqs-funnel-step">
                    <div className="lqs-funnel-bar-wrap">
                      <div
                        className="lqs-funnel-bar"
                        style={{
                          width: `${widthPct}%`,
                          background: step.color,
                        }}
                      >
                        <span className="lqs-funnel-label">{step.label}</span>
                      </div>
                    </div>
                    <div className="lqs-funnel-count">{step.count}</div>
                    <div className="lqs-funnel-pct">{pct}%</div>
                  </div>
                  {i < funnelData.length - 1 && (
                    <div className="lqs-funnel-arrow">
                      <ArrowRight
                        size={12}
                        style={{
                          color: "#d1d5db",
                          transform: "rotate(90deg)",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Score Distribution + Score Trend */}
      <div className="lqs-grid-2">
        {/* Histogram */}
        <div className="lqs-card">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <TrendingUp size={16} style={{ color: "#10b981" }} />
                Score Distribution
              </div>
              <div className="lqs-subtitle">Leads per score range</div>
            </div>
          </div>
          <div className="lqs-histogram">
            {analytics.histogram.map((bucket, idx) => {
              const height =
                maxHistCount > 0 ? (bucket.count / maxHistCount) * 100 : 0;
              const color = getHistogramColor(bucket.min);
              const isHovered = hoveredHistBucket === idx;
              return (
                <div key={bucket.range} className="lqs-hist-col">
                  <div className="lqs-hist-count">
                    {bucket.count > 0 ? bucket.count : ""}
                  </div>
                  <div
                    className={`lqs-hist-bar ${isHovered ? "highlighted" : ""}`}
                    style={{
                      height: `${height}%`,
                      minHeight: bucket.count > 0 ? 8 : 0,
                      background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                    }}
                    title={`${bucket.range}: ${bucket.count} leads`}
                    onMouseEnter={() => setHoveredHistBucket(idx)}
                    onMouseLeave={() => setHoveredHistBucket(null)}
                  >
                    {isHovered && bucket.count > 0 && (
                      <div className="lqs-hist-tooltip">
                        {bucket.count} lead{bucket.count !== 1 ? "s" : ""} (
                        {bucket.range})
                      </div>
                    )}
                  </div>
                  <div className="lqs-hist-label">{bucket.range}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Score Trend */}
        <div className="lqs-card">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <TrendingUp size={16} style={{ color: "#8b5cf6" }} />
                Score Trend
              </div>
              <div className="lqs-subtitle">Average score over time</div>
            </div>
          </div>
          {scoreTrend.length > 0 ? (
            <>
              <div className="lqs-trend">
                {scoreTrend.map((point, i) => {
                  const height = (point.avgScore / 100) * 100;
                  const color =
                    point.avgScore >= 80
                      ? "#10b981"
                      : point.avgScore >= 60
                        ? "#f59e0b"
                        : point.avgScore >= 40
                          ? "#3b82f6"
                          : "#9ca3af";
                  return (
                    <div key={i} className="lqs-trend-col">
                      <div className="lqs-trend-val">{point.avgScore}</div>
                      <div
                        className="lqs-trend-bar"
                        style={{
                          height: `${height}%`,
                          minHeight: 4,
                          background: `linear-gradient(180deg, ${color}, ${color}88)`,
                          borderRadius: 3,
                        }}
                        title={`${point.label}: avg ${point.avgScore} (${point.count} leads)`}
                      />
                      <div className="lqs-trend-label">{point.label}</div>
                    </div>
                  );
                })}
              </div>
              {/* Trend line overlay (SVG) */}
              <TrendLine data={scoreTrend} />
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: 30,
                color: "#9ca3af",
                fontSize: "0.85rem",
              }}
            >
              Not enough data for trend analysis
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Heatmap */}
      {heatmapData && (
        <div className="lqs-card-full">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <Eye size={16} style={{ color: "#f59e0b" }} />
                Category Heatmap by Tier
              </div>
              <div className="lqs-subtitle">
                Average category scores within each quality tier
              </div>
            </div>
          </div>
          <Heatmap data={heatmapData} />
        </div>
      )}

      {/* Row 5: Top / Bottom Leads */}
      <div className="lqs-card-full">
        <div className="lqs-header">
          <div>
            <div className="lqs-title">
              {showTopLeads ? (
                <TrendingUp size={16} style={{ color: "#10b981" }} />
              ) : (
                <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
              )}
              {showTopLeads
                ? "Highest Scoring Leads"
                : "Improvement Opportunities"}
            </div>
            <div className="lqs-subtitle">
              {activeTierFilter
                ? `Filtered to ${activeTierFilter} tier`
                : showTopLeads
                  ? "Your strongest leads ready for action"
                  : "Leads with the most room for improvement"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {activeTierFilter && (
              <button
                className="lqs-filter-chip active"
                onClick={() => setActiveTierFilter(null)}
              >
                {activeTierFilter} x
              </button>
            )}
            <button
              className="lqs-toggle-btn"
              onClick={() => setShowTopLeads(!showTopLeads)}
            >
              {showTopLeads ? (
                <>
                  <TrendingDown size={14} /> Low Scores
                </>
              ) : (
                <>
                  <TrendingUp size={14} /> Top Scores
                </>
              )}
            </button>
          </div>
        </div>
        <LeadTable
          leads={filteredLeads}
          showTop={showTopLeads}
          expandedLead={expandedLead}
          onToggleExpand={(id) =>
            setExpandedLead((prev) => (prev === id ? null : id))
          }
        />
      </div>
    </>
  );
}

/* ── Sub-components ─────────────────────────────── */

function ScoreGauge({ score }) {
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80
      ? "#10b981"
      : score >= 60
        ? "#f59e0b"
        : score >= 40
          ? "#3b82f6"
          : "#9ca3af";
  const tierLabel =
    score >= 80 ? "HOT" : score >= 60 ? "WARM" : score >= 40 ? "COOL" : "COLD";

  return (
    <div className="lqs-gauge">
      <div className="lqs-gauge-ring">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          className="lqs-gauge-svg"
        >
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={`${color}88`} />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={radius} className="lqs-gauge-bg" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="lqs-gauge-fill"
            stroke="url(#gaugeGrad)"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="lqs-gauge-label">
          <div className="lqs-gauge-value">{score}</div>
          <div className="lqs-gauge-text">/ 100</div>
          <div className="lqs-gauge-tier" style={{ color }}>
            {tierLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

function RadarChart({ data, hoveredCategory, onHover }) {
  const categories = Object.keys(data);
  const values = Object.values(data);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 85;
  const levels = [20, 40, 60, 80, 100];
  const angleStep = (2 * Math.PI) / categories.length;

  const getPoint = (index, value) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const polygonPoints = categories
    .map((_, i) => {
      const p = getPoint(i, values[i]);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid circles */}
      {levels.map((level) => (
        <polygon
          key={level}
          points={categories
            .map((_, i) => {
              const p = getPoint(i, level);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={level === 100 ? 1.5 : 0.5}
          strokeDasharray={level < 100 ? "2,2" : "none"}
        />
      ))}

      {/* Axes */}
      {categories.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(16, 185, 129, 0.15)"
        stroke="#10b981"
        strokeWidth={2}
      />

      {/* Data points + labels */}
      {categories.map((cat, i) => {
        const p = getPoint(i, values[i]);
        const labelP = getPoint(i, 118);
        const color = CAT_COLORS[cat];
        const isHovered = hoveredCategory === cat;
        return (
          <g
            key={cat}
            onMouseEnter={() => onHover(cat)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={isHovered ? 6 : 4}
              fill={color}
              stroke="white"
              strokeWidth={2}
              style={{ transition: "r 0.2s" }}
            />
            <text
              x={labelP.x}
              y={labelP.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isHovered ? 11 : 9}
              fontWeight={isHovered ? 700 : 500}
              fill={isHovered ? color : "#6b7280"}
              style={{ transition: "all 0.2s" }}
            >
              {CATEGORY_LABELS[cat].split(" ")[0]}
            </text>
            {isHovered && (
              <text
                x={p.x}
                y={p.y - 14}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={color}
              >
                {values[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function TrendLine({ data }) {
  if (data.length < 2) return null;
  const width = 100;
  const height = 30;
  const padding = 4;
  const stepX = (width - padding * 2) / (data.length - 1);
  const maxScore = 100;

  const points = data
    .map((d, i) => {
      const x = padding + i * stepX;
      const y =
        height - padding - (d.avgScore / maxScore) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const first = data[0].avgScore;
  const last = data[data.length - 1].avgScore;
  const trendColor = last >= first ? "#10b981" : "#ef4444";
  const trendLabel = last >= first ? "Improving" : "Declining";
  const diff = last - first;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 8,
        padding: "8px 12px",
        background: "#f9fafb",
        borderRadius: 8,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ flexShrink: 0 }}
      >
        <polyline
          points={points}
          fill="none"
          stroke={trendColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div>
        <span
          style={{ fontSize: "0.8rem", fontWeight: 600, color: trendColor }}
        >
          {trendLabel}
        </span>
        <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: 6 }}>
          {diff > 0 ? "+" : ""}
          {diff} pts
        </span>
      </div>
    </div>
  );
}

function Heatmap({ data }) {
  const { tiers, categories, grid } = data;

  const getHeatColor = (value) => {
    if (value >= 80) return { bg: "#dcfce7", text: "#166534" };
    if (value >= 60) return { bg: "#fef9c3", text: "#854d0e" };
    if (value >= 40) return { bg: "#ffedd5", text: "#9a3412" };
    if (value >= 20) return { bg: "#fef2f2", text: "#991b1b" };
    return { bg: "#f3f4f6", text: "#6b7280" };
  };

  return (
    <div
      className="lqs-heatmap"
      style={{
        gridTemplateColumns: `80px repeat(${categories.length}, 1fr)`,
      }}
    >
      {/* Header row */}
      <div className="lqs-heatmap-label" />
      {categories.map((cat) => {
        const Icon = CATEGORY_ICONS[cat];
        return (
          <div key={cat} className="lqs-heatmap-label">
            <Icon
              size={12}
              style={{ color: CAT_COLORS[cat], marginRight: 4 }}
            />
            {CATEGORY_LABELS[cat].split(" ")[0]}
          </div>
        );
      })}

      {/* Data rows */}
      {tiers.map((tier) => (
        <Fragment key={tier}>
          <div
            className="lqs-heatmap-label"
            style={{ color: TIER_CONFIG[tier].color, fontWeight: 700 }}
          >
            {TIER_CONFIG[tier].icon} {tier}
          </div>
          {categories.map((cat) => {
            const value = grid[tier][cat];
            const colors = getHeatColor(value);
            return (
              <div
                key={`${tier}-${cat}`}
                className="lqs-heatmap-cell"
                style={{ background: colors.bg, color: colors.text }}
                title={`${tier} - ${CATEGORY_LABELS[cat]}: ${value}`}
              >
                {value}
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

function LeadTable({ leads, showTop, expandedLead, onToggleExpand }) {
  const displayLeads = useMemo(() => {
    const sorted = [...leads].sort((a, b) =>
      showTop
        ? b.scoring.totalScore - a.scoring.totalScore
        : a.scoring.totalScore - b.scoring.totalScore,
    );
    return sorted.slice(0, 10);
  }, [leads, showTop]);

  if (displayLeads.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 24,
          color: "#9ca3af",
          fontSize: "0.85rem",
        }}
      >
        No leads match the current filter
      </div>
    );
  }

  return (
    <table className="lqs-leads-table">
      <thead>
        <tr>
          <th>Lead</th>
          <th>Score</th>
          <th>Tier</th>
          <th>Contact</th>
          <th>Qual.</th>
          <th>Energy</th>
          <th>Design</th>
          <th>Engage</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {displayLeads.map((lead) => {
          const isExpanded = expandedLead === lead.id;
          const scoring = lead.scoring;
          return (
            <LeadRow
              key={lead.id}
              lead={lead}
              scoring={scoring}
              isExpanded={isExpanded}
              onToggle={() => onToggleExpand(lead.id)}
            />
          );
        })}
      </tbody>
    </table>
  );
}

function LeadRow({ lead, scoring, isExpanded, onToggle }) {
  return (
    <>
      <tr
        className={isExpanded ? "expanded" : ""}
        style={{ cursor: "pointer" }}
        onClick={onToggle}
      >
        <td>
          <div style={{ fontWeight: 600 }}>
            {lead.customerName || lead.name || lead.id?.slice(0, 8)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
            {lead.email || "No email"}
          </div>
        </td>
        <td>
          <div
            className="lqs-score-pill"
            style={{
              background: scoring.tier.bg,
              color: scoring.tier.color,
            }}
          >
            {scoring.totalScore}
          </div>
        </td>
        <td>
          <div
            className="lqs-score-pill"
            style={{
              background: scoring.tier.bg,
              color: scoring.tier.color,
            }}
          >
            {scoring.tier.label}
          </div>
        </td>
        <td>
          <MiniBar value={scoring.breakdown.contact.score} color="#3b82f6" />
        </td>
        <td>
          <MiniBar
            value={scoring.breakdown.qualification.score}
            color="#10b981"
          />
        </td>
        <td>
          <MiniBar value={scoring.breakdown.energyData.score} color="#f59e0b" />
        </td>
        <td>
          <MiniBar
            value={scoring.breakdown.systemDesign.score}
            color="#8b5cf6"
          />
        </td>
        <td>
          <MiniBar value={scoring.breakdown.engagement.score} color="#ec4899" />
        </td>
        <td>
          {isExpanded ? (
            <ChevronUp size={16} color="#9ca3af" />
          ) : (
            <ChevronDown size={16} color="#9ca3af" />
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="lqs-expand-row">
          <td colSpan={9}>
            <ExpandedScoreDetail scoring={scoring} />
          </td>
        </tr>
      )}
    </>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "8px",
        background: "#f9fafb",
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: "1.25rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{label}</div>
    </div>
  );
}

function MiniBar({ value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 44,
          height: 6,
          background: "#f3f4f6",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span style={{ fontSize: "0.7rem", color: "#6b7280", width: 18 }}>
        {value}
      </span>
    </div>
  );
}

function ExpandedScoreDetail({ scoring }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
      }}
    >
      {Object.entries(scoring.breakdown).map(([cat, data]) => {
        const Icon = CATEGORY_ICONS[cat];
        const color = CAT_COLORS[cat];
        return (
          <div key={cat}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Icon size={14} style={{ color }} />
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                {CATEGORY_LABELS[cat]}: {data.score}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                (wt: {data.weight}%)
              </span>
            </div>
            <div className="lqs-signal-tags">
              {data.signals.length > 0 ? (
                data.signals.map((s, i) => (
                  <span key={i} className="lqs-signal-tag positive">
                    {s}
                  </span>
                ))
              ) : (
                <span className="lqs-signal-tag">No data</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getHistogramColor(min) {
  if (min >= 80) return "#10b981";
  if (min >= 60) return "#34d399";
  if (min >= 40) return "#f59e0b";
  if (min >= 20) return "#fb923c";
  return "#ef4444";
}
