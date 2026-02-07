import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Webhook,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Activity,
  Zap,
  AlertTriangle,
  Search,
  Download,
  RotateCcw,
  Server,
  TrendingUp,
  BarChart3,
  Shield,
  Eye,
  Pause,
  Play,
  FileJson,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import {
  getWebhookLogs,
  getWebhookStats,
  getWebhookEventTypes,
  getWebhookTimeline,
  getWebhookEndpointHealth,
  getWebhookFailureAnalysis,
  retryWebhookDelivery,
  exportLogsAsCsv,
  exportLogsAsJson,
} from "../services/webhookService";

export default function WebhookDashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [endpointHealth, setEndpointHealth] = useState([]);
  const [failureAnalysis, setFailureAnalysis] = useState(null);
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

  // UI State
  const [expandedLog, setExpandedLog] = useState(null);
  const [activeView, setActiveView] = useState("overview"); // overview, logs, endpoints, failures
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [retrying, setRetrying] = useState(null);
  const [retrySuccess, setRetrySuccess] = useState(null);

  const autoRefreshRef = useRef(null);

  const loadData = useCallback(
    async (resetPagination = true) => {
      try {
        setError("");
        if (resetPagination) {
          setLoading(true);
        }

        const promises = [
          getWebhookStats(),
          getWebhookEventTypes(),
          getWebhookLogs({
            status: statusFilter || undefined,
            eventType: eventTypeFilter || undefined,
            pageSize: 50,
            lastDoc: resetPagination ? undefined : lastDoc,
          }),
        ];

        // Load view-specific data
        if (activeView === "overview" || activeView === "logs") {
          promises.push(getWebhookTimeline(72));
        }
        if (activeView === "overview" || activeView === "endpoints") {
          promises.push(getWebhookEndpointHealth());
        }
        if (activeView === "failures") {
          promises.push(getWebhookFailureAnalysis());
        }

        const results = await Promise.all(promises);
        const [statsData, typesData, logsData] = results;

        setStats(statsData);
        setEventTypes(typesData);

        if (resetPagination) {
          setLogs(logsData.logs);
        } else {
          setLogs((prev) => [...prev, ...logsData.logs]);
        }
        setLastDoc(logsData.lastDoc);
        setHasMore(logsData.hasMore);

        let idx = 3;
        if (activeView === "overview" || activeView === "logs") {
          setTimeline(results[idx] || []);
          idx++;
        }
        if (activeView === "overview" || activeView === "endpoints") {
          setEndpointHealth(results[idx] || []);
          idx++;
        }
        if (activeView === "failures") {
          setFailureAnalysis(results[idx] || null);
        }
      } catch (err) {
        console.error("Error loading webhook data:", err);
        setError("Failed to load webhook data. " + (err.message || ""));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, eventTypeFilter, lastDoc, activeView],
  );

  useEffect(() => {
    loadData(true);
  }, [statusFilter, eventTypeFilter, activeView]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        loadData(true);
      }, 15000);
    } else if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    loadData(false);
  };

  const handleRetry = async (log) => {
    setRetrying(log.id);
    setRetrySuccess(null);
    try {
      await retryWebhookDelivery(log);
      setRetrySuccess(log.id);
      setTimeout(() => setRetrySuccess(null), 3000);
      // Refresh to show the new retry entry
      loadData(true);
    } catch (err) {
      console.error("Retry failed:", err);
      setError("Retry failed: " + err.message);
    } finally {
      setRetrying(null);
    }
  };

  const handleExport = (format) => {
    const data =
      format === "csv" ? exportLogsAsCsv(logs) : exportLogsAsJson(logs);
    const blob = new Blob([data], {
      type: format === "csv" ? "text/csv" : "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webhook-logs-${new Date().toISOString().split("T")[0]}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
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
    const date = ts instanceof Date ? ts : ts.toDate?.() || new Date(ts);
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
  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
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
      }),
    [logs, searchTerm],
  );

  // Timeline chart (simple SVG bar chart)
  const TimelineChart = useMemo(() => {
    if (!timeline.length) return null;

    // Show last 48 hours for readability
    const recent = timeline.slice(-48);
    const maxVal = Math.max(...recent.map((b) => b.total), 1);
    const chartWidth = 720;
    const chartHeight = 120;
    const barWidth = chartWidth / recent.length - 1;

    return (
      <div className="wh-timeline-chart">
        <div className="wh-section-header">
          <TrendingUp size={16} />
          <span>Delivery Timeline (48h)</span>
        </div>
        <div style={{ overflowX: "auto", padding: "8px 0" }}>
          <svg
            width={chartWidth}
            height={chartHeight + 24}
            viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}
            style={{ display: "block", minWidth: chartWidth }}
          >
            {recent.map((bucket, i) => {
              const x = i * (barWidth + 1);
              const totalH = (bucket.total / maxVal) * chartHeight;
              const successH = (bucket.success / maxVal) * chartHeight;
              const failedH = (bucket.failed / maxVal) * chartHeight;
              const hour = bucket.hour.split(" ")[1] || "";

              return (
                <g key={bucket.hour}>
                  {/* Failed bar (bottom layer) */}
                  {bucket.failed > 0 && (
                    <rect
                      x={x}
                      y={chartHeight - totalH}
                      width={barWidth}
                      height={failedH}
                      fill="#ef4444"
                      rx={1}
                      opacity={0.85}
                    >
                      <title>
                        {bucket.hour}: {bucket.failed} failed
                      </title>
                    </rect>
                  )}
                  {/* Success bar */}
                  <rect
                    x={x}
                    y={chartHeight - totalH + failedH}
                    width={barWidth}
                    height={successH}
                    fill="#10b981"
                    rx={1}
                    opacity={0.85}
                  >
                    <title>
                      {bucket.hour}: {bucket.success} success
                    </title>
                  </rect>
                  {/* Pending bar */}
                  {bucket.pending > 0 && (
                    <rect
                      x={x}
                      y={chartHeight - totalH + failedH + successH}
                      width={barWidth}
                      height={(bucket.pending / maxVal) * chartHeight}
                      fill="#f59e0b"
                      rx={1}
                      opacity={0.85}
                    >
                      <title>
                        {bucket.hour}: {bucket.pending} pending
                      </title>
                    </rect>
                  )}
                  {/* Hour label every 6 bars */}
                  {i % 6 === 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 16}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#9ca3af"
                    >
                      {hour}
                    </text>
                  )}
                </g>
              );
            })}
            {/* Zero line */}
            <line
              x1={0}
              y1={chartHeight}
              x2={chartWidth}
              y2={chartHeight}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          </svg>
        </div>
        <div className="wh-chart-legend">
          <span>
            <span className="wh-legend-dot" style={{ background: "#10b981" }} />{" "}
            Success
          </span>
          <span>
            <span className="wh-legend-dot" style={{ background: "#ef4444" }} />{" "}
            Failed
          </span>
          <span>
            <span className="wh-legend-dot" style={{ background: "#f59e0b" }} />{" "}
            Pending
          </span>
        </div>
      </div>
    );
  }, [timeline]);

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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .wh-dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
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

        .wh-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wh-auto-refresh {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .wh-auto-refresh.active {
          background: #f0fdf4;
          border-color: #10b981;
          color: #059669;
        }

        .wh-auto-refresh:hover {
          border-color: #8b5cf6;
        }

        .wh-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .wh-tabs {
          display: flex;
          gap: 4px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 10px;
          overflow-x: auto;
        }

        .wh-tab {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 0.85rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .wh-tab:hover {
          color: #374151;
          background: rgba(255,255,255,0.5);
        }

        .wh-tab.active {
          background: white;
          color: #111827;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .wh-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }

        .wh-stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
          animation: fadeIn 0.3s ease-out;
        }

        .wh-stat-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transform: translateY(-1px);
        }

        .wh-stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .wh-stat-label {
          color: #6b7280;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .wh-stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wh-stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #111827;
        }

        .wh-stat-sub {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 2px;
        }

        .wh-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .wh-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
        }

        .wh-timeline-chart {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .wh-chart-legend {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .wh-legend-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 4px;
        }

        .wh-controls {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .wh-search-box {
          position: relative;
          flex: 1;
          min-width: 200px;
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
          padding: 9px 12px 9px 36px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.85rem;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .wh-search-input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .wh-filter-select {
          padding: 9px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.85rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .wh-filter-select:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .wh-btn {
          padding: 9px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .wh-btn:hover {
          background: #f9fafb;
          border-color: #8b5cf6;
          color: #8b5cf6;
        }

        .wh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .wh-btn-sm {
          padding: 5px 10px;
          font-size: 0.78rem;
        }

        .wh-btn-success {
          background: #f0fdf4;
          border-color: #86efac;
          color: #059669;
        }

        .wh-export-group {
          position: relative;
          display: inline-flex;
        }

        .wh-export-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 10;
          min-width: 140px;
          overflow: hidden;
        }

        .wh-export-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: none;
          background: none;
          width: 100%;
          font-size: 0.85rem;
          color: #374151;
          cursor: pointer;
          transition: background 0.15s;
        }

        .wh-export-option:hover {
          background: #f3f4f6;
        }

        .wh-logs-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          animation: fadeIn 0.3s ease-out;
        }

        .wh-logs-header {
          padding: 14px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .wh-logs-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .wh-logs-count {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .wh-log-row {
          display: grid;
          grid-template-columns: 32px 1fr 120px 90px 80px 60px;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
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
          font-size: 0.85rem;
        }

        .wh-log-url {
          font-size: 0.75rem;
          color: #6b7280;
          word-break: break-all;
          margin-top: 1px;
        }

        .wh-log-time {
          font-size: 0.8rem;
          color: #6b7280;
          text-align: right;
        }

        .wh-log-time-relative {
          font-size: 0.7rem;
          color: #9ca3af;
        }

        .wh-log-code {
          text-align: center;
        }

        .wh-log-code-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .wh-log-duration {
          font-size: 0.8rem;
          color: #6b7280;
          text-align: center;
        }

        .wh-log-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          justify-content: center;
        }

        .wh-log-detail {
          background: #f9fafb;
          padding: 16px 20px 16px 60px;
          border-bottom: 1px solid #e5e7eb;
          animation: fadeIn 0.2s ease-out;
        }

        .wh-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .wh-detail-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
        }

        .wh-detail-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .wh-detail-pre {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          font-size: 0.75rem;
          color: #374151;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 180px;
          overflow-y: auto;
          margin: 0;
        }

        .wh-detail-meta {
          margin-top: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .wh-detail-tag {
          font-size: 0.75rem;
          color: #6b7280;
          background: #f3f4f6;
          padding: 3px 10px;
          border-radius: 6px;
        }

        .wh-event-breakdown {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .wh-event-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .wh-event-row:last-child {
          border-bottom: none;
        }

        .wh-event-name {
          font-weight: 500;
          color: #374151;
          font-size: 0.85rem;
        }

        .wh-event-counts {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .wh-event-count {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .wh-event-bar {
          height: 6px;
          border-radius: 3px;
          background: #e5e7eb;
          width: 100px;
          overflow: hidden;
        }

        .wh-event-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }

        /* Endpoint Health */
        .wh-ep-grid {
          display: grid;
          gap: 12px;
        }

        .wh-ep-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: center;
          animation: fadeIn 0.3s ease-out;
        }

        .wh-ep-status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .wh-ep-info h4 {
          margin: 0;
          font-size: 0.9rem;
          color: #111827;
          font-weight: 600;
          word-break: break-all;
        }

        .wh-ep-info p {
          margin: 2px 0 0;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .wh-ep-stats {
          display: flex;
          gap: 16px;
          text-align: center;
        }

        .wh-ep-stat-val {
          font-size: 1.1rem;
          font-weight: 700;
          color: #111827;
        }

        .wh-ep-stat-label {
          font-size: 0.65rem;
          color: #9ca3af;
          text-transform: uppercase;
        }

        /* Failure Analysis */
        .wh-fail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .wh-fail-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
        }

        .wh-fail-section h4 {
          margin: 0 0 12px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #111827;
        }

        .wh-fail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.8rem;
        }

        .wh-fail-item:last-child {
          border-bottom: none;
        }

        .wh-fail-name {
          color: #374151;
          word-break: break-all;
          flex: 1;
          margin-right: 12px;
        }

        .wh-fail-count {
          font-weight: 600;
          color: #ef4444;
          white-space: nowrap;
        }

        .wh-load-more {
          text-align: center;
          padding: 14px;
        }

        .wh-load-more-btn {
          padding: 9px 24px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.85rem;
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
          padding: 48px 20px;
        }

        .wh-empty-icon {
          width: 64px;
          height: 64px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          color: #9ca3af;
        }

        .wh-error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 10px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
        }

        .wh-success-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #059669;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 50;
          animation: fadeIn 0.3s ease-out;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .wh-log-row {
            grid-template-columns: 24px 1fr 70px 40px;
          }
          .wh-log-time, .wh-log-duration {
            display: none;
          }
          .wh-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .wh-detail-grid, .wh-fail-grid {
            grid-template-columns: 1fr;
          }
          .wh-controls {
            flex-direction: column;
          }
          .wh-search-box {
            min-width: 100%;
          }
          .wh-tabs {
            gap: 2px;
          }
          .wh-tab {
            padding: 6px 10px;
            font-size: 0.78rem;
          }
          .wh-ep-card {
            grid-template-columns: auto 1fr;
          }
          .wh-ep-stats {
            grid-column: 1 / -1;
          }
          .wh-header-actions {
            width: 100%;
            justify-content: flex-end;
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
                Monitor deliveries, analyze failures, and track endpoint health
              </p>
            </div>
          </div>
          <div className="wh-header-actions">
            <button
              className={`wh-auto-refresh ${autoRefresh ? "active" : ""}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={
                autoRefresh
                  ? "Disable auto-refresh"
                  : "Enable auto-refresh (15s)"
              }
            >
              {autoRefresh ? (
                <>
                  <div className="wh-live-dot" />
                  Live
                </>
              ) : (
                <>
                  <Play size={12} />
                  Auto
                </>
              )}
            </button>
            <button
              className="wh-btn"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="wh-error-banner">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* View Tabs */}
        <div className="wh-tabs">
          <button
            className={`wh-tab ${activeView === "overview" ? "active" : ""}`}
            onClick={() => setActiveView("overview")}
          >
            <BarChart3 size={14} /> Overview
          </button>
          <button
            className={`wh-tab ${activeView === "logs" ? "active" : ""}`}
            onClick={() => setActiveView("logs")}
          >
            <Activity size={14} /> Delivery Logs
          </button>
          <button
            className={`wh-tab ${activeView === "endpoints" ? "active" : ""}`}
            onClick={() => setActiveView("endpoints")}
          >
            <Server size={14} /> Endpoints
          </button>
          <button
            className={`wh-tab ${activeView === "failures" ? "active" : ""}`}
            onClick={() => setActiveView("failures")}
          >
            <AlertCircle size={14} /> Failure Analysis
          </button>
        </div>

        {/* Stats Cards (always visible) */}
        {stats && (
          <div className="wh-stats-grid">
            <div className="wh-stat-card">
              <div className="wh-stat-header">
                <span className="wh-stat-label">Total</span>
                <div
                  className="wh-stat-icon"
                  style={{ background: "rgba(139, 92, 246, 0.1)" }}
                >
                  <Activity size={16} style={{ color: "#8b5cf6" }} />
                </div>
              </div>
              <div className="wh-stat-value">{stats.total}</div>
              <div className="wh-stat-sub">{stats.last24h} in last 24h</div>
            </div>

            <div className="wh-stat-card">
              <div className="wh-stat-header">
                <span className="wh-stat-label">Success</span>
                <div
                  className="wh-stat-icon"
                  style={{ background: "rgba(16, 185, 129, 0.1)" }}
                >
                  <CheckCircle size={16} style={{ color: "#10b981" }} />
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
                  <XCircle size={16} style={{ color: "#ef4444" }} />
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
                <span className="wh-stat-label">Pending</span>
                <div
                  className="wh-stat-icon"
                  style={{ background: "rgba(245, 158, 11, 0.1)" }}
                >
                  <Clock size={16} style={{ color: "#f59e0b" }} />
                </div>
              </div>
              <div className="wh-stat-value">{stats.pending}</div>
              <div className="wh-stat-sub">awaiting delivery</div>
            </div>

            <div className="wh-stat-card">
              <div className="wh-stat-header">
                <span className="wh-stat-label">Avg Response</span>
                <div
                  className="wh-stat-icon"
                  style={{ background: "rgba(59, 130, 246, 0.1)" }}
                >
                  <Zap size={16} style={{ color: "#3b82f6" }} />
                </div>
              </div>
              <div className="wh-stat-value">
                {stats.avgResponseTime > 0
                  ? `${stats.avgResponseTime}ms`
                  : "--"}
              </div>
              <div className="wh-stat-sub">{stats.last7d} in last 7d</div>
            </div>
          </div>
        )}

        {/* ============ OVERVIEW VIEW ============ */}
        {activeView === "overview" && (
          <>
            {/* Timeline Chart */}
            {TimelineChart}

            {/* Event Type Breakdown */}
            {stats && Object.keys(stats.byEventType).length > 0 && (
              <div className="wh-event-breakdown">
                <div className="wh-section-header">
                  <BarChart3 size={16} />
                  <span>Event Type Breakdown</span>
                </div>
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

            {/* Endpoint Health Summary (top 5) */}
            {endpointHealth.length > 0 && (
              <div className="wh-section">
                <div className="wh-section-header">
                  <Server size={16} />
                  <span>Endpoint Health</span>
                  <button
                    className="wh-btn wh-btn-sm"
                    onClick={() => setActiveView("endpoints")}
                    style={{ marginLeft: "auto" }}
                  >
                    View All
                  </button>
                </div>
                <div className="wh-ep-grid">
                  {endpointHealth.slice(0, 5).map((ep) => (
                    <div key={ep.endpoint} className="wh-ep-card">
                      <div
                        className="wh-ep-status-indicator"
                        style={{
                          background:
                            ep.status === "healthy"
                              ? "#10b981"
                              : ep.status === "warning"
                                ? "#f59e0b"
                                : "#ef4444",
                        }}
                        title={ep.status}
                      />
                      <div className="wh-ep-info">
                        <h4>{ep.endpoint}</h4>
                        <p>
                          Last delivery: {formatRelativeTime(ep.lastDelivery)} |{" "}
                          {ep.avgResponseTime > 0
                            ? `${ep.avgResponseTime}ms avg`
                            : "no timing data"}
                        </p>
                      </div>
                      <div className="wh-ep-stats">
                        <div>
                          <div className="wh-ep-stat-val">
                            {ep.successRate}%
                          </div>
                          <div className="wh-ep-stat-label">Success</div>
                        </div>
                        <div>
                          <div className="wh-ep-stat-val">{ep.total}</div>
                          <div className="wh-ep-stat-label">Total</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ============ LOGS VIEW ============ */}
        {(activeView === "logs" || activeView === "overview") && (
          <>
            {/* Filters / Controls */}
            <div className="wh-controls">
              <div className="wh-search-box">
                <Search className="wh-search-icon" size={14} />
                <input
                  type="text"
                  className="wh-search-input"
                  placeholder="Search logs by event, URL, error..."
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
                <option value="">All Events</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <ExportButton onExport={handleExport} />
            </div>

            {/* Logs Table */}
            <div className="wh-logs-section">
              <div className="wh-logs-header">
                <h3 className="wh-logs-title">Delivery Logs</h3>
                <span className="wh-logs-count">
                  {filteredLogs.length}{" "}
                  {filteredLogs.length === 1 ? "entry" : "entries"}
                  {autoRefresh && (
                    <span
                      style={{
                        marginLeft: 8,
                        color: "#10b981",
                        fontSize: "0.75rem",
                      }}
                    >
                      <span
                        className="wh-live-dot"
                        style={{
                          display: "inline-block",
                          verticalAlign: "middle",
                          marginRight: 4,
                        }}
                      />{" "}
                      live
                    </span>
                  )}
                </span>
              </div>

              {filteredLogs.length > 0 ? (
                <>
                  {filteredLogs.map((log) => {
                    const isExpanded = expandedLog === log.id;
                    const statusColor = getStatusColor(log);
                    const statusLabel = getStatusLabel(log);
                    const isFailed = statusLabel === "Failed";

                    return (
                      <div key={log.id}>
                        <div
                          className="wh-log-row"
                          onClick={() =>
                            setExpandedLog(isExpanded ? null : log.id)
                          }
                        >
                          <div>
                            <div
                              className="wh-log-status-dot"
                              style={{ background: statusColor }}
                            />
                          </div>

                          <div>
                            <div className="wh-log-event">
                              {log.eventType || log.event || "webhook_delivery"}
                              {log.retryCount > 0 && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: "0.7rem",
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                  }}
                                >
                                  retry #{log.retryCount}
                                </span>
                              )}
                            </div>
                            <div className="wh-log-url">
                              {log.url || log.endpoint || log.id}
                            </div>
                          </div>

                          <div className="wh-log-time">
                            <div>{formatRelativeTime(log.timestamp)}</div>
                            <div className="wh-log-time-relative">
                              {formatTimestamp(log.timestamp)?.split(",")[0]}
                            </div>
                          </div>

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

                          <div className="wh-log-duration">
                            {log.responseTime || log.duration
                              ? `${log.responseTime || log.duration}ms`
                              : "--"}
                          </div>

                          <div className="wh-log-actions">
                            {isFailed && (
                              <button
                                className="wh-btn wh-btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetry(log);
                                }}
                                disabled={retrying === log.id}
                                title="Retry delivery"
                                style={{
                                  padding: "3px 6px",
                                  border: "1px solid #d1d5db",
                                }}
                              >
                                <RotateCcw
                                  size={12}
                                  style={{
                                    animation:
                                      retrying === log.id
                                        ? "spin 1s linear infinite"
                                        : "none",
                                  }}
                                />
                              </button>
                            )}
                            {isExpanded ? (
                              <ChevronDown
                                size={14}
                                style={{ color: "#9ca3af" }}
                              />
                            ) : (
                              <ChevronRight
                                size={14}
                                style={{ color: "#9ca3af" }}
                              />
                            )}
                          </div>
                        </div>

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
                                        log.payload ||
                                        log.data ||
                                        log.body ||
                                        {},
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
                                        log.response ||
                                        log.responseBody ||
                                        null,
                                    },
                                    null,
                                    2,
                                  )}
                                </pre>
                              </div>
                            </div>

                            <div className="wh-detail-meta">
                              {log.retryCount != null && (
                                <span className="wh-detail-tag">
                                  Retry #{log.retryCount}
                                </span>
                              )}
                              {log.retryOf && (
                                <span className="wh-detail-tag">
                                  Retry of: {log.retryOf}
                                </span>
                              )}
                              {log.referralId && (
                                <span className="wh-detail-tag">
                                  Referral: {log.referralId}
                                </span>
                              )}
                              {log.apiKeyId && (
                                <span className="wh-detail-tag">
                                  API Key: {log.apiKeyId}
                                </span>
                              )}
                              {log.source && (
                                <span className="wh-detail-tag">
                                  Source: {log.source}
                                </span>
                              )}
                              {isFailed && (
                                <button
                                  className={`wh-btn wh-btn-sm ${retrySuccess === log.id ? "wh-btn-success" : ""}`}
                                  onClick={() => handleRetry(log)}
                                  disabled={retrying === log.id}
                                >
                                  <RotateCcw
                                    size={12}
                                    style={{
                                      animation:
                                        retrying === log.id
                                          ? "spin 1s linear infinite"
                                          : "none",
                                    }}
                                  />
                                  {retrySuccess === log.id
                                    ? "Queued!"
                                    : retrying === log.id
                                      ? "Retrying..."
                                      : "Retry Delivery"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

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
                    <Webhook size={28} />
                  </div>
                  <h3
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: 6,
                    }}
                  >
                    No webhook logs found
                  </h3>
                  <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                    {statusFilter || eventTypeFilter || searchTerm
                      ? "Try adjusting your filters"
                      : "Webhook delivery logs will appear here as webhooks are triggered"}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ ENDPOINTS VIEW ============ */}
        {activeView === "endpoints" && (
          <div className="wh-section">
            <div className="wh-section-header">
              <Server size={16} />
              <span>Endpoint Health Monitor</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "0.75rem",
                  color: "#6b7280",
                }}
              >
                {endpointHealth.length} endpoints tracked
              </span>
            </div>

            {endpointHealth.length > 0 ? (
              <div className="wh-ep-grid">
                {endpointHealth.map((ep) => (
                  <div key={ep.endpoint} className="wh-ep-card">
                    <div
                      className="wh-ep-status-indicator"
                      style={{
                        background:
                          ep.status === "healthy"
                            ? "#10b981"
                            : ep.status === "warning"
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                      title={ep.status}
                    />
                    <div className="wh-ep-info">
                      <h4>{ep.endpoint}</h4>
                      <p>
                        Last:{" "}
                        {ep.lastDelivery
                          ? formatRelativeTime(ep.lastDelivery)
                          : "N/A"}{" "}
                        | Avg:{" "}
                        {ep.avgResponseTime > 0
                          ? `${ep.avgResponseTime}ms`
                          : "--"}{" "}
                        | Recent failures: {ep.recentFailures}
                      </p>
                    </div>
                    <div className="wh-ep-stats">
                      <div>
                        <div
                          className="wh-ep-stat-val"
                          style={{
                            color:
                              parseFloat(ep.successRate) >= 95
                                ? "#059669"
                                : parseFloat(ep.successRate) >= 80
                                  ? "#d97706"
                                  : "#dc2626",
                          }}
                        >
                          {ep.successRate}%
                        </div>
                        <div className="wh-ep-stat-label">Success</div>
                      </div>
                      <div>
                        <div className="wh-ep-stat-val">{ep.total}</div>
                        <div className="wh-ep-stat-label">Total</div>
                      </div>
                      <div>
                        <div
                          className="wh-ep-stat-val"
                          style={{ color: "#10b981" }}
                        >
                          {ep.success}
                        </div>
                        <div className="wh-ep-stat-label">OK</div>
                      </div>
                      <div>
                        <div
                          className="wh-ep-stat-val"
                          style={{ color: "#ef4444" }}
                        >
                          {ep.failed}
                        </div>
                        <div className="wh-ep-stat-label">Fail</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="wh-empty">
                <div className="wh-empty-icon">
                  <Server size={28} />
                </div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: 6,
                  }}
                >
                  No endpoints detected
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                  Endpoint health data will appear once webhooks are delivered
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============ FAILURES VIEW ============ */}
        {activeView === "failures" && (
          <>
            {failureAnalysis ? (
              <>
                <div
                  className="wh-stat-card"
                  style={{ borderLeft: "4px solid #ef4444" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <AlertCircle size={18} style={{ color: "#ef4444" }} />
                    <span style={{ fontWeight: 700, color: "#111827" }}>
                      {failureAnalysis.totalFailures} Total Failures
                    </span>
                  </div>
                  <p
                    style={{ fontSize: "0.8rem", color: "#6b7280", margin: 0 }}
                  >
                    Analysis of failed webhook deliveries from the last 500
                    error logs
                  </p>
                </div>

                <div className="wh-fail-grid">
                  <div className="wh-fail-section">
                    <h4>Error Categories</h4>
                    {failureAnalysis.categories.length > 0 ? (
                      failureAnalysis.categories.map((cat) => (
                        <div key={cat.name} className="wh-fail-item">
                          <span className="wh-fail-name">{cat.name}</span>
                          <span className="wh-fail-count">{cat.count}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                        No categorized errors
                      </p>
                    )}
                  </div>

                  <div className="wh-fail-section">
                    <h4>Most Affected Endpoints</h4>
                    {failureAnalysis.affectedEndpoints.length > 0 ? (
                      failureAnalysis.affectedEndpoints.map((ep) => (
                        <div key={ep.endpoint} className="wh-fail-item">
                          <span className="wh-fail-name">{ep.endpoint}</span>
                          <span className="wh-fail-count">{ep.count}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                        No affected endpoints
                      </p>
                    )}
                  </div>

                  <div
                    className="wh-fail-section"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <h4>Top Error Messages</h4>
                    {failureAnalysis.topErrors.length > 0 ? (
                      failureAnalysis.topErrors.map((err, i) => (
                        <div key={i} className="wh-fail-item">
                          <span
                            className="wh-fail-name"
                            style={{
                              fontFamily: "'SF Mono', monospace",
                              fontSize: "0.75rem",
                            }}
                          >
                            {err.message}
                          </span>
                          <span className="wh-fail-count">{err.count}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                        No error messages recorded
                      </p>
                    )}
                  </div>
                </div>

                {/* Recent Failures */}
                {failureAnalysis.recentFailures.length > 0 && (
                  <div className="wh-section">
                    <div className="wh-section-header">
                      <XCircle size={16} style={{ color: "#ef4444" }} />
                      <span>Most Recent Failures</span>
                    </div>
                    {failureAnalysis.recentFailures.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: "1px solid #f3f4f6",
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "0.85rem",
                              color: "#111827",
                            }}
                          >
                            {f.eventType || "unknown"}
                          </div>
                          <div
                            style={{ fontSize: "0.75rem", color: "#6b7280" }}
                          >
                            {f.url || "no url"} —{" "}
                            {f.error || `HTTP ${f.statusCode}`}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#9ca3af",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatRelativeTime(f.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="wh-empty">
                <div className="wh-empty-icon">
                  <Shield size={28} />
                </div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: 6,
                  }}
                >
                  Loading failure analysis...
                </h3>
              </div>
            )}
          </>
        )}

        {/* Retry Success Toast */}
        {retrySuccess && (
          <div className="wh-success-toast">
            <CheckCircle size={16} />
            Retry queued successfully
          </div>
        )}
      </div>
    </div>
  );
}

/** Export dropdown button component */
function ExportButton({ onExport }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="wh-export-group" ref={ref}>
      <button className="wh-btn" onClick={() => setOpen(!open)}>
        <Download size={14} />
        Export
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="wh-export-dropdown">
          <button
            className="wh-export-option"
            onClick={() => {
              onExport("csv");
              setOpen(false);
            }}
          >
            <FileSpreadsheet size={14} />
            Export CSV
          </button>
          <button
            className="wh-export-option"
            onClick={() => {
              onExport("json");
              setOpen(false);
            }}
          >
            <FileJson size={14} />
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
}
