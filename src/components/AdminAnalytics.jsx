import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  DollarSign,
} from "lucide-react";

/**
 * Admin Analytics Component
 * Shows visual analytics and charts for the dashboard
 */
export default function AdminAnalytics({ projects }) {
  // Calculate analytics data
  const analytics = useMemo(() => {
    if (!projects || projects.length === 0) {
      return null;
    }

    // Status distribution
    const statusCounts = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {});

    // Monthly trend (last 6 months)
    const now = new Date();
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleDateString("en-US", { month: "short" });
      const count = projects.filter((p) => {
        const createdDate = p.createdAt?.toDate?.() || new Date(0);
        return (
          createdDate.getMonth() === month.getMonth() &&
          createdDate.getFullYear() === month.getFullYear()
        );
      }).length;
      monthlyData.push({ month: monthName, count });
    }

    // Recent vs previous period comparison
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentCount = projects.filter((p) => {
      const createdDate = p.createdAt?.toDate?.() || new Date(0);
      return createdDate >= thirtyDaysAgo;
    }).length;

    const previousCount = projects.filter((p) => {
      const createdDate = p.createdAt?.toDate?.() || new Date(0);
      return createdDate >= sixtyDaysAgo && createdDate < thirtyDaysAgo;
    }).length;

    const growth =
      previousCount > 0
        ? Math.round(((recentCount - previousCount) / previousCount) * 100)
        : 0;

    // Average system size
    const totalSystemSize = projects
      .filter((p) => p.systemSize)
      .reduce((sum, p) => sum + (parseFloat(p.systemSize) || 0), 0);
    const avgSystemSize = (totalSystemSize / projects.length).toFixed(1);

    // Conversion rate (approved + scheduled + completed / total)
    const successfulProjects = projects.filter((p) =>
      ["approved", "scheduled", "completed"].includes(p.status),
    ).length;
    const conversionRate = Math.round(
      (successfulProjects / projects.length) * 100,
    );

    return {
      statusCounts,
      monthlyData,
      growth,
      avgSystemSize,
      conversionRate,
      recentCount,
    };
  }, [projects]);

  if (!analytics) {
    return null;
  }

  const maxMonthlyCount = Math.max(
    ...analytics.monthlyData.map((d) => d.count),
    1,
  );

  return (
    <>
      <style>{`
        .analytics-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .analytics-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }

        .analytics-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .analytics-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #374151;
        }

        .analytics-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-distribution {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .status-bar {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-label {
          width: 90px;
          font-size: 0.85rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-progress {
          flex: 1;
          height: 24px;
          background: #f3f4f6;
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }

        .status-fill {
          height: 100%;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: white;
          transition: width 0.5s ease;
        }

        .monthly-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 120px;
          gap: 8px;
        }

        .chart-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .bar-fill {
          width: 100%;
          background: linear-gradient(180deg, #10b981 0%, #059669 100%);
          border-radius: 4px 4px 0 0;
          transition: height 0.5s ease;
          position: relative;
        }

        .bar-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .metric-item {
          text-align: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .metric-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: #111827;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 0.8rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .growth-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-top: 4px;
        }

        .growth-badge.positive {
          background: #dcfce7;
          color: #166534;
        }

        .growth-badge.negative {
          background: #fef2f2;
          color: #991b1b;
        }

        .growth-badge.neutral {
          background: #f3f4f6;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .analytics-container {
            grid-template-columns: 1fr;
          }

          .metric-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="analytics-container">
        {/* Status Distribution */}
        <div className="analytics-card">
          <div className="analytics-header">
            <div className="analytics-title">Status Distribution</div>
            <div
              className="analytics-icon"
              style={{ background: "rgba(59, 130, 246, 0.1)" }}
            >
              <FileText size={18} style={{ color: "#3b82f6" }} />
            </div>
          </div>
          <div className="status-distribution">
            {Object.entries(analytics.statusCounts).map(([status, count]) => {
              const percentage = Math.round((count / projects.length) * 100);
              const colors = {
                submitted: "#3b82f6",
                reviewing: "#f59e0b",
                approved: "#10b981",
                scheduled: "#8b5cf6",
                completed: "#059669",
                cancelled: "#ef4444",
              };

              return (
                <div key={status} className="status-bar">
                  <div className="status-label">{status}</div>
                  <div className="status-progress">
                    <div
                      className="status-fill"
                      style={{
                        width: `${percentage}%`,
                        background: colors[status] || "#6b7280",
                      }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="analytics-card">
          <div className="analytics-header">
            <div className="analytics-title">6-Month Trend</div>
            <div
              className="analytics-icon"
              style={{ background: "rgba(16, 185, 129, 0.1)" }}
            >
              <TrendingUp size={18} style={{ color: "#10b981" }} />
            </div>
          </div>
          <div className="monthly-chart">
            {analytics.monthlyData.map((data, index) => (
              <div key={index} className="chart-bar">
                <div
                  className="bar-fill"
                  style={{
                    height: `${(data.count / maxMonthlyCount) * 100}%`,
                    minHeight: data.count > 0 ? "20px" : "0px",
                  }}
                  title={`${data.month}: ${data.count} projects`}
                />
                <div className="bar-label">{data.month}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div
              className={`growth-badge ${
                analytics.growth > 0
                  ? "positive"
                  : analytics.growth < 0
                    ? "negative"
                    : "neutral"
              }`}
            >
              {analytics.growth > 0 ? (
                <TrendingUp size={14} />
              ) : analytics.growth < 0 ? (
                <TrendingDown size={14} />
              ) : null}
              {analytics.growth > 0 ? "+" : ""}
              {analytics.growth}% vs last period
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="analytics-card">
          <div className="analytics-header">
            <div className="analytics-title">Key Metrics</div>
            <div
              className="analytics-icon"
              style={{ background: "rgba(139, 92, 246, 0.1)" }}
            >
              <DollarSign size={18} style={{ color: "#8b5cf6" }} />
            </div>
          </div>
          <div className="metric-grid">
            <div className="metric-item">
              <div className="metric-value">{analytics.avgSystemSize} kW</div>
              <div className="metric-label">Avg System Size</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{analytics.conversionRate}%</div>
              <div className="metric-label">Conversion Rate</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{analytics.recentCount}</div>
              <div className="metric-label">Last 30 Days</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">
                ${((analytics.recentCount * 15000) / 1000).toFixed(0)}k
              </div>
              <div className="metric-label">Pipeline Value</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
