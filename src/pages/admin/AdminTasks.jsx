/**
 * AdminTasks -- Admin AI Task Overview
 *
 * Admin-facing dashboard for the AI Task Engine. Provides a bird's-eye view of
 * all tasks across all users, learning data management, and task assignment.
 *
 * Sections:
 *   - Dashboard metrics: total tasks, AI success rate, human interventions, active learnings
 *   - Task table: all tasks sortable by columns with row actions
 *   - Learning data panel: review/adjust AI learning patterns
 */
import { useState, useEffect, useCallback } from "react";
import {
  getTaskQueue,
  getTaskStats,
  reassignTask,
  retryAiTask,
  getLearnings,
  adjustLearningConfidence,
} from "../../services/aiTaskService";
import {
  Brain,
  Bot,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserPlus,
  RotateCw,
  Sparkles,
  FileText,
  ClipboardCheck,
  Camera,
  Calendar,
  PenTool,
  DollarSign,
  ClipboardList,
  Loader2,
  AlertCircle,
} from "lucide-react";

/** Task type config reused from DashboardTasks */
const TASK_TYPES = {
  permit: { icon: FileText, label: "Permit" },
  survey: { icon: ClipboardCheck, label: "Survey" },
  photo_review: { icon: Camera, label: "Photo Review" },
  schedule: { icon: Calendar, label: "Schedule" },
  cad: { icon: PenTool, label: "CAD Design" },
  funding: { icon: DollarSign, label: "Funding" },
};

const STATUS_COLORS = {
  pending_human: "bg-amber-100 text-amber-700",
  ai_processing: "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  pending_human: "Needs Human",
  ai_processing: "AI Processing",
  completed: "Completed",
  failed: "Failed",
};

const PRIORITY_LABELS = {
  1: { text: "Critical", color: "text-red-600" },
  2: { text: "High", color: "text-orange-600" },
  3: { text: "Medium", color: "text-yellow-600" },
  4: { text: "Low", color: "text-blue-600" },
  5: { text: "Minimal", color: "text-gray-500" },
};

/**
 * Format timestamp for the table (short date + time)
 */
function formatDate(timestamp) {
  if (!timestamp) return "--";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Dashboard metrics cards at the top of the page
 */
function MetricsBar({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: "Total Tasks",
      value: stats?.totalTasks ?? 0,
      icon: ClipboardList,
      color: "text-gray-900",
    },
    {
      label: "AI Success Rate",
      value:
        stats?.aiSuccessRate != null
          ? `${Math.round(stats.aiSuccessRate)}%`
          : "--",
      icon: Bot,
      color: "text-violet-600",
    },
    {
      label: "Human Interventions",
      value: stats?.humanInterventionsToday ?? 0,
      sub: "today",
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Active Learnings",
      value: stats?.activeLearnings ?? 0,
      icon: Brain,
      color: "text-emerald-600",
    },
    {
      label: "Avg Resolution",
      value:
        stats?.avgResolutionMinutes != null
          ? `${Math.round(stats.avgResolutionMinutes)}m`
          : "--",
      icon: Clock,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </div>
          <p className={`mt-1 text-2xl font-bold ${m.color}`}>
            {m.value}
            {m.sub && (
              <span className="ml-1 text-xs font-normal text-gray-400">
                {m.sub}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Sortable column header -- extracted outside TaskTable to avoid
 * recreating the component on every render.
 */
function SortHeader({ field, sortField, onSort, children }) {
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown
          className={`h-3 w-3 ${sortField === field ? "text-gray-900" : "text-gray-300"}`}
        />
      </div>
    </th>
  );
}

/**
 * Sortable task table showing all tasks across all users
 */
function TaskTable({ tasks, loading, onReassign, onRetry, onViewDetail }) {
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    // Handle Firestore timestamps
    if (aVal?.toDate) aVal = aVal.toDate().getTime();
    if (bVal?.toDate) bVal = bVal.toDate().getTime();
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white animate-pulse">
        <div className="h-12 border-b border-gray-100 bg-gray-50 rounded-t-xl" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 border-b border-gray-50" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <SortHeader field="type" sortField={sortField} onSort={handleSort}>
              Type
            </SortHeader>
            <SortHeader
              field="projectName"
              sortField={sortField}
              onSort={handleSort}
            >
              Project
            </SortHeader>
            <SortHeader
              field="status"
              sortField={sortField}
              onSort={handleSort}
            >
              Status
            </SortHeader>
            <SortHeader
              field="priority"
              sortField={sortField}
              onSort={handleSort}
            >
              Priority
            </SortHeader>
            <SortHeader
              field="assignedToName"
              sortField={sortField}
              onSort={handleSort}
            >
              Assigned
            </SortHeader>
            <SortHeader
              field="createdAt"
              sortField={sortField}
              onSort={handleSort}
            >
              Created
            </SortHeader>
            <SortHeader
              field="updatedAt"
              sortField={sortField}
              onSort={handleSort}
            >
              Updated
            </SortHeader>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center">
                <Brain className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No tasks found</p>
              </td>
            </tr>
          ) : (
            sorted.map((task) => {
              const typeConfig = TASK_TYPES[task.type] || {
                icon: ClipboardList,
                label: task.type,
              };
              const TypeIcon = typeConfig.icon;
              const statusColor =
                STATUS_COLORS[task.status] || "bg-gray-100 text-gray-600";
              const statusLabel = STATUS_LABELS[task.status] || task.status;
              const priorityConfig =
                PRIORITY_LABELS[task.priority] || PRIORITY_LABELS[3];

              return (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {typeConfig.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                    {task.projectName || task.projectId || "--"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-medium ${priorityConfig.color}`}
                    >
                      {priorityConfig.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {task.assignedToName ||
                      (task.assignedTo
                        ? task.assignedTo.slice(0, 8)
                        : "Unassigned")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(task.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(task.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onViewDetail(task)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="View detail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onReassign(task)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        title="Reassign"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                      {(task.status === "failed" ||
                        task.status === "ai_processing") && (
                        <button
                          onClick={() => onRetry(task.id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-600"
                          title="Force retry"
                        >
                          <RotateCw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Learning data panel -- shows AI patterns learned from human completions
 * Admins can boost or reduce confidence on individual learnings
 */
function LearningsPanel({ learnings, loading, onAdjust }) {
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered =
    typeFilter === "all"
      ? learnings
      : learnings.filter((l) => l.taskType === typeFilter);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-gray-100 mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-gray-50 mb-3" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-900">AI Learnings</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {filtered.length}
          </span>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600"
        >
          <option value="all">All Types</option>
          {Object.entries(TASK_TYPES).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center">
          <Brain className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            No learnings yet. As humans complete tasks with "Teach AI" checked,
            patterns appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {filtered.map((learning) => (
            <div
              key={learning.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {learning.pattern || learning.id}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                      {TASK_TYPES[learning.taskType]?.label ||
                        learning.taskType}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 truncate">
                    {learning.description || "No description"}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>Used: {learning.usageCount ?? 0} times</span>
                    <span>Success: {learning.successCount ?? 0}</span>
                  </div>
                </div>

                {/* Confidence bar + controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-24">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Confidence</span>
                      <span className="font-medium">
                        {Math.round((learning.confidence ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.round((learning.confidence ?? 0) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => onAdjust(learning.id, "boost")}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                    title="Boost confidence"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onAdjust(learning.id, "reduce")}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Reduce confidence"
                  >
                    <TrendingDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * AdminTasks -- Main admin task overview page
 */
export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [learnings, setLearnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [learningsLoading, setLearningsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadAll = useCallback(async () => {
    // Load tasks
    setLoading(true);
    try {
      const filters = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      const { tasks: data } = await getTaskQueue(filters);
      setTasks(data || []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }

    // Load stats
    setStatsLoading(true);
    try {
      const data = await getTaskStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setStatsLoading(false);
    }

    // Load learnings
    setLearningsLoading(true);
    try {
      const { learnings: data } = await getLearnings();
      setLearnings(data || []);
    } catch (err) {
      console.error("Failed to load learnings:", err);
      setLearnings([]);
    } finally {
      setLearningsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /** Reassign a task -- prompts for user ID */
  const handleReassign = async (task) => {
    const userId = prompt(
      `Reassign "${TASK_TYPES[task.type]?.label || task.type}" task to (user ID):`,
    );
    if (!userId) return;
    try {
      await reassignTask(task.id, userId);
      loadAll();
    } catch (err) {
      console.error("Failed to reassign:", err);
    }
  };

  /** Force retry AI processing */
  const handleRetry = async (taskId) => {
    try {
      await retryAiTask(taskId);
      loadAll();
    } catch (err) {
      console.error("Failed to retry:", err);
    }
  };

  /** Adjust learning confidence */
  const handleAdjustConfidence = async (learningId, action) => {
    try {
      await adjustLearningConfidence(learningId, action);
      // Reload learnings
      const { learnings: data } = await getLearnings();
      setLearnings(data || []);
    } catch (err) {
      console.error("Failed to adjust confidence:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">AI Tasks</h1>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-sm font-medium text-violet-700">
            {tasks.length} total
          </span>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Metrics */}
      <MetricsBar stats={stats} loading={statsLoading} />

      {/* Status filter for table */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Filter:</span>
        {["all", "pending_human", "ai_processing", "completed", "failed"].map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status === "all" ? "All" : STATUS_LABELS[status] || status}
            </button>
          ),
        )}
      </div>

      {/* Task table */}
      <TaskTable
        tasks={tasks}
        loading={loading}
        onReassign={handleReassign}
        onRetry={handleRetry}
        onViewDetail={setSelectedTask}
      />

      {/* Learnings panel */}
      <LearningsPanel
        learnings={learnings}
        loading={learningsLoading}
        onAdjust={handleAdjustConfidence}
      />

      {/* Quick detail modal (reuses same structure as installer view) */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh] overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <h2 className="text-lg font-bold text-gray-900">
                {TASK_TYPES[selectedTask.type]?.label || selectedTask.type} Task
                Detail
              </h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="font-medium text-gray-500 w-28">Task ID:</dt>
                  <dd className="text-gray-700 font-mono text-xs">
                    {selectedTask.id}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-gray-500 w-28">Project:</dt>
                  <dd className="text-gray-700">
                    {selectedTask.projectName || selectedTask.projectId || "--"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-gray-500 w-28">Status:</dt>
                  <dd>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedTask.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {STATUS_LABELS[selectedTask.status] ||
                        selectedTask.status}
                    </span>
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-gray-500 w-28">Priority:</dt>
                  <dd
                    className={`font-medium ${PRIORITY_LABELS[selectedTask.priority]?.color || "text-gray-600"}`}
                  >
                    {PRIORITY_LABELS[selectedTask.priority]?.text ||
                      selectedTask.priority}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-gray-500 w-28">Assigned:</dt>
                  <dd className="text-gray-700">
                    {selectedTask.assignedToName ||
                      selectedTask.assignedTo ||
                      "Unassigned"}
                  </dd>
                </div>
              </dl>

              {/* AI attempt details */}
              {selectedTask.aiAttempt && (
                <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-800 mb-2">
                    <Bot className="h-4 w-4" />
                    AI Attempt
                  </div>
                  <dl className="space-y-1 text-sm">
                    {selectedTask.aiAttempt.action && (
                      <div>
                        <dt className="font-medium text-violet-700">Action</dt>
                        <dd className="text-violet-600">
                          {selectedTask.aiAttempt.action}
                        </dd>
                      </div>
                    )}
                    {selectedTask.aiAttempt.error && (
                      <div>
                        <dt className="font-medium text-red-700">Error</dt>
                        <dd className="text-red-600">
                          {selectedTask.aiAttempt.error}
                        </dd>
                      </div>
                    )}
                    {selectedTask.aiAttempt.confidence != null && (
                      <div>
                        <dt className="font-medium text-violet-700">
                          Confidence
                        </dt>
                        <dd className="text-violet-600">
                          {Math.round(selectedTask.aiAttempt.confidence * 100)}%
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Human result (if completed) */}
              {selectedTask.humanResult && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Human Result
                  </div>
                  <pre className="text-xs text-emerald-700 overflow-x-auto">
                    {JSON.stringify(selectedTask.humanResult, null, 2)}
                  </pre>
                  {selectedTask.humanNotes && (
                    <p className="mt-2 text-sm text-emerald-600">
                      <span className="font-medium">Notes:</span>{" "}
                      {selectedTask.humanNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-gray-100 p-4">
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
