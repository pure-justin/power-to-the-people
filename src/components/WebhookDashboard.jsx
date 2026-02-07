import { useState, useEffect, useCallback } from "react";
import {
  Webhook,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  Activity,
  Zap,
  AlertTriangle,
  Search,
  ArrowRight,
} from "lucide-react";
import {
  getWebhookLogs,
  getWebhookStats,
  getWebhookEventTypes,
} from "../services/webhookService";

export default function WebhookDashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Expanded log detail
  const [expandedLog, setExpandedLog] = useState(null);

  const loadData = useCallback(
    async (resetPagination = true) => {
      try {
        setError("");
        if (resetPagination) {
          setLoading(true);
        }

        const [statsData, typesData, logsData] = await Promise.all([
          getWebhookStats(),
          getWebhookEventTypes(),
          getWebhookLogs({
            status: statusFilter || undefined,
            eventType: eventTypeFilter || undefined,
            pageSize: 50,
            lastDoc: resetPagination ? undefined : lastDoc,
          }),
        ]);

        setStats(statsData);
        setEventTypes(typesData);

        if (resetPagination) {
          setLogs(logsData.logs);
        } else {
          setLogs((prev) => [...prev, ...logsData.logs]);
        }
        setLastDoc(logsData.lastDoc);
        setHasMore(logsData.hasMore);
      } catch (err) {
        console.error("Error loading webhook data:", err);
        setError("Failed to load webhook data. " + (err.message || ""));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, eventTypeFilter, lastDoc],
  );

  useEffect(() => {
    loadData(true);
  }, [statusFilter, eventTypeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    loadData(false);
  };

  const getStatusColor = (log) => {
    if (log.status === "success" || log.statusCode === 200) return "#10b981";
    if (log.status === "error" || (log.statusCode && log.statusCode >= 400))
      return "#ef4444";
    if (log.status === "pending" || log.status === "processing")
      return "#f59e0b";
    return "#6b7280";
  };

  const getStatusLabel = (log) => {
    if (log.status === "success" || log.statusCode === 200) return "Success";
    if (log.status === "error" || (log.statusCode && log.statusCode >= 400))
      return "Failed";
    if (log.status === "pending") return "Pending";
    if (log.status === "processing") return "Processing";
    return log.status || "Unknown";
  };

  const getStatusIcon = (log) => {
    const label = getStatusLabel(log);
    if (label === "Success") return <CheckCircle size={14} />;
    if (label === "Failed") return <XCircle size={14} />;
    if (label === "Pending" || label === "Processing")
      return <Clock size={14} />;
    return <AlertTriangle size={14} />;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "N/A";
    const date = ts.toDate?.() || new Date(ts);
    return date.toLocaleString();
  };

  const formatRelativeTime = (ts) => {
    if (!ts) return "";
    const date = ts.toDate?.() || new Date(ts);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Filter logs by search term
  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (log.eventType || log.event || "").toLowerCase().includes(term) ||
      (log.url || log.endpoint || "").toLowerCase().includes(term) ||
      (log.id || "").toLowerCase().includes(term) ||
      (log.error || "").toLowerCase().includes(term) ||
      JSON.stringify(log.payload || log.data || {})
        .toLowerCase()
        .includes(term)
    );
  });

  if (loading && !stats) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "4px solid #e5e7eb",
            borderTopColor: "#10b981",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <p style={{ color: "#6b7280" }}>Loading webhook data...</p>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .wh-dashboard {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .wh-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .wh-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wh-header-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #8b5cf6, #6d28d9);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .wh-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .wh-subtitle {
          color: #6b7280;
          font-size: 0.85rem;
          margin: 0;
        }

        .wh-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .wh-stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .wh-stat-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transform: translateY(-1px);
        }

        .wh-stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .wh-stat-label {
          color: #6b7280;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .wh-stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wh-stat-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: #111827;
        }

        .wh-stat-sub {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 4px;
        }

        .wh-controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .wh-search-box {
          position: relative;
          flex: 1;
          min-width: 220px;
        }

        .wh-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }

        .wh-search-input {
          width: 100%;
          padding: 10px 12px 10px 38px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .wh-search-input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .wh-filter-select {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .wh-filter-select:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .wh-refresh-btn {
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .wh-refresh-btn:hover {
          background: #f9fafb;
          border-color: #8b5cf6;
          color: #8b5cf6;
        }

        .wh-logs-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }

        .wh-logs-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .wh-logs-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .wh-logs-count {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .wh-log-row {
          display: grid;
          grid-template-columns: 36px 1fr 140px 100px 90px 40px;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: background 0.15s;
        }

        .wh-log-row:hover {
          background: #f9fafb;
        }

        .wh-log-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin: 0 auto;
        }

        .wh-log-event {
          font-weight: 600;
          color: #111827;
          font-size: 0.9rem;
        }

        .wh-log-url {
          font-size: 0.8rem;
          color: #6b7280;
          word-break: break-all;
          margin-top: 2px;
        }

        .wh-log-time {
          font-size: 0.85rem;
          color: #6b7280;
          text-align: right;
        }

        .wh-log-time-relative {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .wh-log-code {
          text-align: center;
        }

        .wh-log-code-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .wh-log-duration {
          font-size: 0.85rem;
          color: #6b7280;
          text-align: center;
        }

        .wh-log-expand {
          color: #9ca3af;
          transition: transform 0.2s;
        }

        .wh-log-detail {
          background: #f9fafb;
          padding: 16px 20px 16px 68px;
          border-bottom: 1px solid #e5e7eb;
        }

        .wh-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .wh-detail-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
        }

        .wh-detail-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .wh-detail-pre {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          font-size: 0.8rem;
          color: #374151;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 200px;
          overflow-y: auto;
          margin: 0;
        }

        .wh-event-breakdown {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }

        .wh-event-breakdown-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .wh-event-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .wh-event-row:last-child {
          border-bottom: none;
        }

        .wh-event-name {
          font-weight: 500;
          color: #374151;
          font-size: 0.9rem;
        }

        .wh-event-counts {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .wh-event-count {
          font-size: 0.85rem;
          font-weight: 600;
        }

        .wh-event-bar {
          height: 6px;
          border-radius: 3px;
          background: #e5e7eb;
          width: 120px;
          overflow: hidden;
        }

        .wh-event-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }

        .wh-load-more {
          text-align: center;
          padding: 16px;
        }

        .wh-load-more-btn {
          padding: 10px 24px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }

        .wh-load-more-btn:hover {
          background: #e5e7eb;
        }

        .wh-empty {
          text-align: center;
          padding: 60px 20px;
        }

        .wh-empty-icon {
          width: 72px;
          height: 72px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: #9ca3af;
        }

        .wh-error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .wh-log-row {
            grid-template-columns: 28px 1fr 80px 40px;
          }
          .wh-log-time, .wh-log-duration {
            display: none;
          }
          .wh-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .wh-detail-grid {
            grid-template-columns: 1fr;
          }
          .wh-controls {
            flex-direction: column;
          }
          .wh-search-box {
            min-width: 100%;
          }
        }
      `}</style>

      <div className="wh-dashboard">
        {/* Header */}
        <div className="wh-header">
          <div className="wh-header-left">
            <div className="wh-header-icon">
              <Webhook size={20} />
            </div>
            <div>
              <h2 className="wh-title">Webhook Delivery Status</h2>
              <p className="wh-subtitle">
                Monitor webhook deliveries and troubleshoot failures
              </p>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="wh-error-banner">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="wh-stats-grid">
            <div className="wh-stat-card">
              <div className="wh-stat-header">
                <span className="wh-stat-label">Total Deliveries</span>
                <div
                  className="wh-stat-icon"
                  style={{ background: "rgba(139, 92, 246, 0.1)" }}
                >
                  <Activity size={18} style={{ color: "#8b5cf6" }} />
                </div>
              </div>
              <div className="wh-stat-value">{stats.total}</div>
              <div className="wh-stat-sub">{stats.last24h} in last 24h</div>
            </div>

            <div className="wh-stat-card">
              <div className="wh-stat-header">
                <span className="wh-stat-label">Successful</span>
                <div
                  className="wh-stat-icon"
                  style={{ background: "rgba(16, 185, 129, 0.1)" }}
                >
                  <CheckCircle size={18} style={{ color: "#10b981" }} />
                </div>
              </div>
              <div className="wh-stat-value">{stats.successful}</div>
              <div className="wh-stat-sub">
                {stats.successRate}% success rate
              </div>
            </div>

            <div className="wh-stat-card">
              <div className="wh-stat-header">
                <span className="wh-stat-label">Failed</span>
                <div
                  className="wh-stat-icon"
                  style={{ background: "rgba(239, 68, 68, 0.1)" }}
                >
                  <XCircle size={18} style={{ color: "#ef4444" }} />
                </div>
              </div>
              <div className="wh-stat-value">{stats.failed}</div>
              <div className="wh-stat-sub">
                {stats.total > 0
                  ? (100 - parseFloat(stats.successRate)).toFixed(1)
                  : "0.0"}
                % failure rate
              </div>
            </div>

            <div className="wh-stat-card">
              <div className="wh-stat-header">
                <span className="wh-stat-label">Avg Response</span>
                <div
                  className="wh-stat-icon"
                  style={{ background: "rgba(245, 158, 11, 0.1)" }}
                >
                  <Zap size={18} style={{ color: "#f59e0b" }} />
                </div>
              </div>
              <div className="wh-stat-value">
                {stats.avgResponseTime > 0
                  ? `${stats.avgResponseTime}ms`
                  : "--"}
              </div>
              <div className="wh-stat-sub">{stats.last7d} in last 7 days</div>
            </div>
          </div>
        )}

        {/* Event Type Breakdown */}
        {stats && Object.keys(stats.byEventType).length > 0 && (
          <div className="wh-event-breakdown">
            <h3 className="wh-event-breakdown-title">Event Type Breakdown</h3>
            {Object.entries(stats.byEventType)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([type, counts]) => {
                const successPct =
                  counts.total > 0
                    ? ((counts.success / counts.total) * 100).toFixed(0)
                    : 0;
                return (
                  <div key={type} className="wh-event-row">
                    <span className="wh-event-name">{type}</span>
                    <div className="wh-event-counts">
                      <span
                        className="wh-event-count"
                        style={{ color: "#374151" }}
                      >
                        {counts.total}
                      </span>
                      <span
                        className="wh-event-count"
                        style={{ color: "#10b981" }}
                      >
                        {counts.success}
                      </span>
                      <span
                        className="wh-event-count"
                        style={{ color: "#ef4444" }}
                      >
                        {counts.failed}
                      </span>
                      <div className="wh-event-bar">
                        <div
                          className="wh-event-bar-fill"
                          style={{
                            width: `${successPct}%`,
                            background:
                              successPct >= 90
                                ? "#10b981"
                                : successPct >= 70
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Filters / Controls */}
        <div className="wh-controls">
          <div className="wh-search-box">
            <Search className="wh-search-icon" size={16} />
            <input
              type="text"
              className="wh-search-input"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="wh-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="error">Failed</option>
            <option value="pending">Pending</option>
          </select>

          <select
            className="wh-filter-select"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
          >
            <option value="">All Event Types</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <button
            className="wh-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              style={{
                animation: refreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            Refresh
          </button>
        </div>

        {/* Logs Table */}
        <div className="wh-logs-section">
          <div className="wh-logs-header">
            <h3 className="wh-logs-title">Delivery Logs</h3>
            <span className="wh-logs-count">
              {filteredLogs.length}{" "}
              {filteredLogs.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {filteredLogs.length > 0 ? (
            <>
              {filteredLogs.map((log) => {
                const isExpanded = expandedLog === log.id;
                const statusColor = getStatusColor(log);
                const statusLabel = getStatusLabel(log);

                return (
                  <div key={log.id}>
                    <div
                      className="wh-log-row"
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      {/* Status Dot */}
                      <div>
                        <div
                          className="wh-log-status-dot"
                          style={{ background: statusColor }}
                        />
                      </div>

                      {/* Event Info */}
                      <div>
                        <div className="wh-log-event">
                          {log.eventType || log.event || "webhook_delivery"}
                        </div>
                        <div className="wh-log-url">
                          {log.url || log.endpoint || log.id}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="wh-log-time">
                        <div>{formatRelativeTime(log.timestamp)}</div>
                        <div className="wh-log-time-relative">
                          {formatTimestamp(log.timestamp)?.split(",")[0]}
                        </div>
                      </div>

                      {/* Status Code */}
                      <div className="wh-log-code">
                        <span
                          className="wh-log-code-badge"
                          style={{
                            background: `${statusColor}15`,
                            color: statusColor,
                          }}
                        >
                          {getStatusIcon(log)}
                          {log.statusCode || statusLabel}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="wh-log-duration">
                        {log.responseTime || log.duration
                          ? `${log.responseTime || log.duration}ms`
                          : "--"}
                      </div>

                      {/* Expand */}
                      <div className="wh-log-expand">
                        {isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="wh-log-detail">
                        <div className="wh-detail-grid">
                          <div className="wh-detail-section">
                            <div className="wh-detail-label">Request</div>
                            <pre className="wh-detail-pre">
                              {JSON.stringify(
                                {
                                  method: log.method || "POST",
                                  url: log.url || log.endpoint || "N/A",
                                  headers: log.requestHeaders || {},
                                  body:
                                    log.payload || log.data || log.body || {},
                                },
                                null,
                                2,
                              )}
                            </pre>
                          </div>

                          <div className="wh-detail-section">
                            <div className="wh-detail-label">Response</div>
                            <pre className="wh-detail-pre">
                              {JSON.stringify(
                                {
                                  statusCode: log.statusCode || "N/A",
                                  status: log.status || "N/A",
                                  duration:
                                    log.responseTime || log.duration
                                      ? `${log.responseTime || log.duration}ms`
                                      : "N/A",
                                  error: log.error || null,
                                  response:
                                    log.response || log.responseBody || null,
                                },
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                        </div>

                        {/* Additional metadata */}
                        {(log.retryCount || log.referralId || log.apiKeyId) && (
                          <div
                            style={{
                              marginTop: 12,
                              display: "flex",
                              gap: 16,
                              flexWrap: "wrap",
                            }}
                          >
                            {log.retryCount != null && (
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "#6b7280",
                                  background: "#f3f4f6",
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                }}
                              >
                                Retry #{log.retryCount}
                              </span>
                            )}
                            {log.referralId && (
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "#6b7280",
                                  background: "#f3f4f6",
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                }}
                              >
                                Referral: {log.referralId}
                              </span>
                            )}
                            {log.apiKeyId && (
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "#6b7280",
                                  background: "#f3f4f6",
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                }}
                              >
                                API Key: {log.apiKeyId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Load More */}
              {hasMore && (
                <div className="wh-load-more">
                  <button
                    className="wh-load-more-btn"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="wh-empty">
              <div className="wh-empty-icon">
                <Webhook size={32} />
              </div>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                No webhook logs found
              </h3>
              <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                {statusFilter || eventTypeFilter || searchTerm
                  ? "Try adjusting your filters"
                  : "Webhook delivery logs will appear here as webhooks are triggered"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
