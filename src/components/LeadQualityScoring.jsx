import { useMemo, useState } from "react";
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

/**
 * Lead Quality Scoring Visualization
 * Renders scoring analytics for the admin dashboard
 */
export default function LeadQualityScoring({ projects }) {
  const [expandedLead, setExpandedLead] = useState(null);
  const [showTopLeads, setShowTopLeads] = useState(true);

  const analytics = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return scoreAllLeads(projects);
  }, [projects]);

  if (!analytics) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
        No lead data available for scoring
      </div>
    );
  }

  const maxHistCount = Math.max(...analytics.histogram.map((h) => h.count), 1);

  return (
    <>
      <style>{`
        .lqs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .lqs-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }

        .lqs-card-full {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .lqs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .lqs-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lqs-subtitle {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-top: 2px;
        }

        /* Score Gauge */
        .lqs-gauge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 0;
        }

        .lqs-gauge-ring {
          position: relative;
          width: 140px;
          height: 140px;
        }

        .lqs-gauge-svg {
          transform: rotate(-90deg);
        }

        .lqs-gauge-bg {
          fill: none;
          stroke: #f3f4f6;
          stroke-width: 10;
        }

        .lqs-gauge-fill {
          fill: none;
          stroke-width: 10;
          stroke-linecap: round;
          transition: stroke-dashoffset 1s ease;
        }

        .lqs-gauge-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .lqs-gauge-value {
          font-size: 2rem;
          font-weight: 800;
          color: #111827;
          line-height: 1;
        }

        .lqs-gauge-text {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 4px;
        }

        /* Tier Distribution */
        .lqs-tier-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .lqs-tier-row:last-child {
          border-bottom: none;
        }

        .lqs-tier-badge {
          width: 64px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          text-align: center;
        }

        .lqs-tier-bar-wrap {
          flex: 1;
          height: 20px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
        }

        .lqs-tier-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.6s ease;
        }

        .lqs-tier-count {
          width: 40px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          text-align: right;
        }

        .lqs-tier-pct {
          width: 40px;
          font-size: 0.75rem;
          color: #9ca3af;
          text-align: right;
        }

        /* Radar Chart (CSS) */
        .lqs-radar {
          position: relative;
          width: 240px;
          height: 240px;
          margin: 0 auto;
        }

        .lqs-radar-grid {
          position: absolute;
          inset: 0;
        }

        /* Category Bars */
        .lqs-cat-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
        }

        .lqs-cat-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .lqs-cat-info {
          flex: 1;
          min-width: 0;
        }

        .lqs-cat-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: #374151;
        }

        .lqs-cat-bar-wrap {
          height: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 4px;
        }

        .lqs-cat-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.8s ease;
        }

        .lqs-cat-score {
          font-size: 0.85rem;
          font-weight: 700;
          width: 36px;
          text-align: right;
          flex-shrink: 0;
        }

        /* Histogram */
        .lqs-histogram {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 100px;
          padding-top: 8px;
        }

        .lqs-hist-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .lqs-hist-bar {
          width: 100%;
          border-radius: 3px 3px 0 0;
          transition: height 0.6s ease;
          position: relative;
          cursor: default;
        }

        .lqs-hist-bar:hover {
          opacity: 0.85;
        }

        .lqs-hist-count {
          font-size: 0.65rem;
          font-weight: 600;
          color: #6b7280;
          line-height: 1;
        }

        .lqs-hist-label {
          font-size: 0.6rem;
          color: #9ca3af;
          white-space: nowrap;
        }

        /* Lead Table */
        .lqs-leads-table {
          width: 100%;
          border-collapse: collapse;
        }

        .lqs-leads-table th {
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .lqs-leads-table td {
          padding: 10px 12px;
          font-size: 0.85rem;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
        }

        .lqs-leads-table tr:hover {
          background: #f9fafb;
        }

        .lqs-leads-table tr.expanded {
          background: #f0fdf4;
        }

        .lqs-score-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .lqs-expand-row td {
          padding: 12px 16px;
          background: #fafafa;
        }

        .lqs-signal-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .lqs-signal-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 500;
          background: #e5e7eb;
          color: #374151;
        }

        .lqs-signal-tag.positive {
          background: #dcfce7;
          color: #166534;
        }

        .lqs-toggle-btn {
          background: none;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 0.8rem;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .lqs-toggle-btn:hover {
          border-color: #10b981;
          color: #10b981;
        }

        @media (max-width: 768px) {
          .lqs-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Row 1: Score Gauge + Tier Distribution + Category Breakdown */}
      <div className="lqs-grid">
        {/* Average Score Gauge */}
        <div className="lqs-card">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <Target size={16} style={{ color: "#10b981" }} />
                Average Lead Score
              </div>
              <div className="lqs-subtitle">Across {analytics.total} leads</div>
            </div>
          </div>
          <ScoreGauge score={analytics.avgScore} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 12,
            }}
          >
            <MiniStat
              label="Highest"
              value={analytics.topLeads[0]?.scoring.totalScore ?? 0}
              color="#10b981"
            />
            <MiniStat
              label="Lowest"
              value={analytics.bottomLeads[0]?.scoring.totalScore ?? 0}
              color="#ef4444"
            />
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="lqs-card">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <Award size={16} style={{ color: "#f59e0b" }} />
                Quality Tiers
              </div>
              <div className="lqs-subtitle">Lead distribution by quality</div>
            </div>
          </div>
          {Object.entries(TIER_CONFIG).map(([tier, config]) => {
            const count = analytics.distribution[tier] || 0;
            const pct =
              analytics.total > 0
                ? Math.round((count / analytics.total) * 100)
                : 0;
            return (
              <div key={tier} className="lqs-tier-row">
                <div
                  className="lqs-tier-badge"
                  style={{ background: config.bg, color: config.color }}
                >
                  {tier}
                </div>
                <div className="lqs-tier-bar-wrap">
                  <div
                    className="lqs-tier-bar"
                    style={{
                      width: `${pct}%`,
                      background: config.color,
                    }}
                  />
                </div>
                <div className="lqs-tier-count">{count}</div>
                <div className="lqs-tier-pct">{pct}%</div>
              </div>
            );
          })}
        </div>

        {/* Category Averages */}
        <div className="lqs-card">
          <div className="lqs-header">
            <div>
              <div className="lqs-title">
                <Activity size={16} style={{ color: "#8b5cf6" }} />
                Category Breakdown
              </div>
              <div className="lqs-subtitle">Average scores by dimension</div>
            </div>
          </div>
          {Object.entries(analytics.categoryAverages).map(([cat, avg]) => {
            const Icon = CATEGORY_ICONS[cat];
            const catColors = {
              contact: "#3b82f6",
              qualification: "#10b981",
              energyData: "#f59e0b",
              systemDesign: "#8b5cf6",
              engagement: "#ec4899",
            };
            const color = catColors[cat];
            return (
              <div key={cat} className="lqs-cat-row">
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
                      style={{ width: `${avg}%`, background: color }}
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
      </div>

      {/* Row 2: Score Distribution Histogram */}
      <div className="lqs-card-full">
        <div className="lqs-header">
          <div>
            <div className="lqs-title">
              <TrendingUp size={16} style={{ color: "#10b981" }} />
              Score Distribution
            </div>
            <div className="lqs-subtitle">
              Number of leads in each score range
            </div>
          </div>
        </div>
        <div className="lqs-histogram">
          {analytics.histogram.map((bucket) => {
            const height =
              maxHistCount > 0 ? (bucket.count / maxHistCount) * 100 : 0;
            const color = getHistogramColor(bucket.min);
            return (
              <div key={bucket.range} className="lqs-hist-col">
                <div className="lqs-hist-count">
                  {bucket.count > 0 ? bucket.count : ""}
                </div>
                <div
                  className="lqs-hist-bar"
                  style={{
                    height: `${height}%`,
                    minHeight: bucket.count > 0 ? 6 : 0,
                    background: color,
                  }}
                  title={`${bucket.range}: ${bucket.count} leads`}
                />
                <div className="lqs-hist-label">{bucket.range}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Top / Bottom Leads */}
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
              {showTopLeads
                ? "Your strongest leads ready for action"
                : "Leads with the most room for improvement"}
            </div>
          </div>
          <button
            className="lqs-toggle-btn"
            onClick={() => setShowTopLeads(!showTopLeads)}
          >
            {showTopLeads ? (
              <>
                <TrendingDown size={14} /> Show Low Scores
              </>
            ) : (
              <>
                <TrendingUp size={14} /> Show Top Scores
              </>
            )}
          </button>
        </div>
        <table className="lqs-leads-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Score</th>
              <th>Tier</th>
              <th>Contact</th>
              <th>Energy</th>
              <th>Design</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(showTopLeads ? analytics.topLeads : analytics.bottomLeads).map(
              (lead) => {
                const isExpanded = expandedLead === lead.id;
                const scoring = lead.scoring;
                return (
                  <>
                    <tr
                      key={lead.id}
                      className={isExpanded ? "expanded" : ""}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setExpandedLead(isExpanded ? null : lead.id)
                      }
                    >
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {lead.customerName || lead.id}
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
                        <MiniBar
                          value={scoring.breakdown.contact.score}
                          color="#3b82f6"
                        />
                      </td>
                      <td>
                        <MiniBar
                          value={scoring.breakdown.energyData.score}
                          color="#f59e0b"
                        />
                      </td>
                      <td>
                        <MiniBar
                          value={scoring.breakdown.systemDesign.score}
                          color="#8b5cf6"
                        />
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
                      <tr key={`${lead.id}-detail`} className="lqs-expand-row">
                        <td colSpan={7}>
                          <ExpandedScoreDetail scoring={scoring} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              },
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function ScoreGauge({ score }) {
  const radius = 60;
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

  return (
    <div className="lqs-gauge">
      <div className="lqs-gauge-ring">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="lqs-gauge-svg"
        >
          <circle cx="70" cy="70" r={radius} className="lqs-gauge-bg" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="lqs-gauge-fill"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="lqs-gauge-label">
          <div className="lqs-gauge-value">{score}</div>
          <div className="lqs-gauge-text">/ 100</div>
        </div>
      </div>
    </div>
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
          width: 50,
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
          }}
        />
      </div>
      <span style={{ fontSize: "0.75rem", color: "#6b7280", width: 20 }}>
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
        const catColors = {
          contact: "#3b82f6",
          qualification: "#10b981",
          energyData: "#f59e0b",
          systemDesign: "#8b5cf6",
          engagement: "#ec4899",
        };
        const color = catColors[cat];
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
