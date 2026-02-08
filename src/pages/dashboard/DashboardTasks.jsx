/**
 * DashboardTasks -- Human Task Queue for Installers
 *
 * This is the installer-facing task queue where humans handle work that AI couldn't complete.
 * Core pattern: AI tries first -> fails -> human completes -> system learns from human action.
 *
 * Layout:
 *   - Stats bar: tasks completed today, AI success rate, your contribution
 *   - Filter bar: type dropdown, status tabs, priority filter
 *   - Task card list with claim/view actions
 *   - Detail modal with AI attempt info, action form, "teach AI" checkbox
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getTaskQueue,
  getTaskStats,
  claimTask,
  completeHumanTask,
  escalateToHuman,
  retryAiTask,
} from "../../services/aiTaskService";
import {
  ClipboardList,
  FileText,
  ClipboardCheck,
  Camera,
  Calendar,
  PenTool,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertCircle,
  Bot,
  User,
  RefreshCw,
  ArrowUpRight,
  Brain,
  Sparkles,
  Loader2,
} from "lucide-react";

/** Map task types to icons and display labels */
const TASK_TYPES = {
  permit: {
    icon: FileText,
    label: "Permit",
    color: "text-violet-600 bg-violet-50",
  },
  survey: {
    icon: ClipboardCheck,
    label: "Survey",
    color: "text-blue-600 bg-blue-50",
  },
  photo_review: {
    icon: Camera,
    label: "Photo Review",
    color: "text-amber-600 bg-amber-50",
  },
  schedule: {
    icon: Calendar,
    label: "Schedule",
    color: "text-emerald-600 bg-emerald-50",
  },
  cad: { icon: PenTool, label: "CAD Design", color: "text-sky-600 bg-sky-50" },
  funding: {
    icon: DollarSign,
    label: "Funding",
    color: "text-green-600 bg-green-50",
  },
};

/** Priority levels with colors (1=critical, 5=low) */
const PRIORITY_COLORS = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-blue-500",
  5: "bg-gray-400",
};

const PRIORITY_LABELS = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Minimal",
};

/** Status tabs for the filter bar */
const STATUS_TABS = [
  { value: "pending_human", label: "Needs Me" },
  { value: "ai_processing", label: "AI Processing" },
  { value: "completed", label: "Completed" },
];

/**
 * Format a timestamp into relative time ("2 hours ago", "3 days ago")
 * @param {Object|string|number} timestamp - Firestore timestamp, ISO string, or epoch ms
 */
function timeAgo(timestamp) {
  if (!timestamp) return "";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Loading skeleton for the task list while data is being fetched
 */
function TaskListSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-xl bg-gray-100" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

/**
 * Stats bar showing today's performance metrics
 */
function StatsBar({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Completed Today",
      value: stats?.completedToday ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-600",
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
      label: "Your Contribution",
      value: stats?.humanInterventionsToday ?? 0,
      icon: User,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </div>
          <p className={`mt-1 text-2xl font-bold ${item.color}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Individual task card in the queue list.
 * Shows priority indicator, type icon, project reference, status, and AI failure reason.
 */
function TaskCard({ task, onClaim, onClick, currentUserId }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = TASK_TYPES[task.type] || {
    icon: ClipboardList,
    label: task.type,
    color: "text-gray-600 bg-gray-50",
  };
  const TypeIcon = typeConfig.icon;
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[3];
  const isMine = task.assignedTo === currentUserId;
  const isUnassigned = !task.assignedTo;

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
      onClick={() => onClick(task)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Priority indicator */}
          <div
            className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${priorityColor}`}
            title={`Priority ${task.priority}: ${PRIORITY_LABELS[task.priority]}`}
          />

          {/* Type icon */}
          <div className={`rounded-lg p-2 shrink-0 ${typeConfig.color}`}>
            <TypeIcon className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {typeConfig.label}
              </h3>
              {isMine && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  Yours
                </span>
              )}
            </div>

            {/* Project reference */}
            {task.projectName && (
              <p className="mt-0.5 text-xs text-gray-500 truncate">
                {task.projectName}
              </p>
            )}

            {/* Status + time */}
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(task.createdAt)}
              </span>
              {task.status === "pending_human" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Needs Human
                </span>
              )}
              {task.status === "ai_processing" && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                  AI Working
                </span>
              )}
              {task.status === "completed" && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  Done
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isUnassigned && task.status === "pending_human" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClaim(task.id);
                }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Claim
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible AI attempt section */}
        {expanded && task.aiAttempt && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3 border border-gray-100">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
              <Bot className="h-3.5 w-3.5" />
              AI Attempt
            </div>
            {task.aiAttempt.action && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">What AI tried:</span>{" "}
                {task.aiAttempt.action}
              </p>
            )}
            {task.aiAttempt.error && (
              <p className="mt-1 text-xs text-red-600">
                <span className="font-medium">Error:</span>{" "}
                {task.aiAttempt.error}
              </p>
            )}
            {task.aiAttempt.confidence != null && (
              <p className="mt-1 text-xs text-gray-500">
                Confidence: {Math.round(task.aiAttempt.confidence * 100)}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Task detail modal -- shown when clicking a task card.
 * Contains full AI attempt details, action form, notes, and teach-AI checkbox.
 */
function TaskDetailModal({ task, onClose, onComplete, onEscalate, onRetry }) {
  const [notes, setNotes] = useState("");
  const [teachAi, setTeachAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState({});
  const typeConfig = TASK_TYPES[task.type] || {
    icon: ClipboardList,
    label: task.type,
    color: "text-gray-600 bg-gray-50",
  };
  const TypeIcon = typeConfig.icon;

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await onComplete(task.id, result, notes, teachAi);
      onClose();
    } catch (err) {
      console.error("Failed to complete task:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    const reason = prompt("Why can't you complete this task?");
    if (!reason) return;
    setSubmitting(true);
    try {
      await onEscalate(task.id, reason);
      onClose();
    } catch (err) {
      console.error("Failed to escalate:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setSubmitting(true);
    try {
      await onRetry(task.id);
      onClose();
    } catch (err) {
      console.error("Failed to retry:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh] overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${typeConfig.color}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {typeConfig.label} Task
              </h2>
              {task.projectName && (
                <p className="text-sm text-gray-500">{task.projectName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* AI attempt details */}
          {task.aiAttempt && (
            <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-800 mb-3">
                <Bot className="h-4 w-4" />
                AI Attempt Details
              </div>
              <dl className="space-y-2 text-sm">
                {task.aiAttempt.action && (
                  <div>
                    <dt className="font-medium text-violet-700">
                      What was tried
                    </dt>
                    <dd className="text-violet-600">{task.aiAttempt.action}</dd>
                  </div>
                )}
                {task.aiAttempt.error && (
                  <div>
                    <dt className="font-medium text-red-700">Error</dt>
                    <dd className="text-red-600">{task.aiAttempt.error}</dd>
                  </div>
                )}
                {task.aiAttempt.confidence != null && (
                  <div>
                    <dt className="font-medium text-violet-700">Confidence</dt>
                    <dd className="text-violet-600">
                      {Math.round(task.aiAttempt.confidence * 100)}%
                    </dd>
                  </div>
                )}
                {task.aiAttempt.attemptCount != null && (
                  <div>
                    <dt className="font-medium text-violet-700">Attempts</dt>
                    <dd className="text-violet-600">
                      {task.aiAttempt.attemptCount}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Context data */}
          {task.context && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Context
              </h3>
              <dl className="space-y-1 text-sm text-gray-600">
                {Object.entries(task.context).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="font-medium text-gray-500 capitalize">
                      {key.replace(/_/g, " ")}:
                    </dt>
                    <dd className="truncate">
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Action form -- visible only when task needs human completion */}
          {task.status === "pending_human" && (
            <>
              {/* Type-specific result fields */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Your Action
                </h3>

                {task.type === "permit" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Permit number"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({
                          ...r,
                          permitNumber: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({
                          ...r,
                          approvalDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                {task.type === "survey" && (
                  <div className="space-y-2">
                    <select
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({
                          ...r,
                          surveyResult: e.target.value,
                        }))
                      }
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select survey result
                      </option>
                      <option value="approved">
                        Approved -- ready for design
                      </option>
                      <option value="changes_needed">Changes needed</option>
                      <option value="rejected">Site not suitable</option>
                    </select>
                    <textarea
                      placeholder="Survey findings..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({ ...r, findings: e.target.value }))
                      }
                    />
                  </div>
                )}

                {task.type === "photo_review" && (
                  <div className="space-y-2">
                    <select
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({
                          ...r,
                          reviewResult: e.target.value,
                        }))
                      }
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select review result
                      </option>
                      <option value="approved">Photos approved</option>
                      <option value="reshoot">Need reshoot</option>
                      <option value="partial">Some photos OK, need more</option>
                    </select>
                    <textarea
                      placeholder="Review notes..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({
                          ...r,
                          reviewNotes: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                {task.type === "schedule" && (
                  <div className="space-y-2">
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({
                          ...r,
                          scheduledDate: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Crew assigned"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({
                          ...r,
                          crewAssigned: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                {task.type === "cad" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Design file URL or reference"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({ ...r, designUrl: e.target.value }))
                      }
                    />
                    <input
                      type="number"
                      placeholder="Panel count"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({
                          ...r,
                          panelCount: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                )}

                {task.type === "funding" && (
                  <div className="space-y-2">
                    <select
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({
                          ...r,
                          fundingStatus: e.target.value,
                        }))
                      }
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Funding status
                      </option>
                      <option value="approved">Approved</option>
                      <option value="conditional">Conditional approval</option>
                      <option value="denied">Denied</option>
                      <option value="resubmit">Need to resubmit</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Lender / program name"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setResult((r) => ({ ...r, lender: e.target.value }))
                      }
                    />
                  </div>
                )}

                {/* Notes -- common to all types */}
                <textarea
                  placeholder="Notes (optional)..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {/* Teach AI checkbox */}
                <label className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-100 p-3 cursor-pointer hover:bg-emerald-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={teachAi}
                    onChange={(e) => setTeachAi(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
                      <Sparkles className="h-3.5 w-3.5" />
                      Teach AI
                    </div>
                    <p className="text-xs text-emerald-600">
                      Mark this solution as a reusable pattern so AI handles
                      similar tasks next time
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-gray-100 p-5">
          <div>
            {task.status === "pending_human" && (
              <button
                onClick={handleEscalate}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <ArrowUpRight className="h-4 w-4" />
                Can't Complete
              </button>
            )}
            {(task.status === "failed" || task.status === "ai_processing") && (
              <button
                onClick={handleRetry}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Retry AI
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            {task.status === "pending_human" && (
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Complete Task
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * DashboardTasks -- Main page component
 * Renders the installer's human task queue with filters, task list, and detail modal.
 */
export default function DashboardTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending_human");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);

  /** Load tasks from the AI task engine */
  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const filters = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (typeFilter !== "all") filters.type = typeFilter;
      // Installers see tasks assigned to them + unassigned tasks
      const { tasks: data } = await getTaskQueue(filters);
      setTasks(data || []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, typeFilter]);

  /** Load dashboard stats */
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getTaskStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadStats();
  }, [loadTasks, loadStats]);

  /** Claim an unassigned task */
  const handleClaim = async (taskId) => {
    try {
      await claimTask(taskId);
      loadTasks();
    } catch (err) {
      console.error("Failed to claim task:", err);
    }
  };

  /** Complete a human task */
  const handleComplete = async (taskId, result, notes, teachAi) => {
    await completeHumanTask(taskId, result, notes, teachAi);
    loadTasks();
    loadStats();
  };

  /** Escalate a task (can't complete) */
  const handleEscalate = async (taskId, reason) => {
    await escalateToHuman(taskId, reason);
    loadTasks();
  };

  /** Retry AI processing */
  const handleRetry = async (taskId) => {
    await retryAiTask(taskId);
    loadTasks();
  };

  // Count pending tasks for the header badge
  const pendingCount = tasks.filter((t) => t.status === "pending_human").length;

  if (loading && !tasks.length) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-100 animate-pulse" />
        <TaskListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Task Queue</h1>
          {pendingCount > 0 && (
            <span className="flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-700">
              {pendingCount}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            loadTasks();
            loadStats();
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <StatsBar stats={stats} loading={statsLoading} />

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type dropdown */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="all">All Types</option>
          {Object.entries(TASK_TYPES).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Brain className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            No tasks waiting
          </p>
          <p className="mt-1 text-xs text-gray-400">
            AI is handling everything! Check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClaim={handleClaim}
              onClick={setSelectedTask}
              currentUserId={user?.uid}
            />
          ))}
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onComplete={handleComplete}
          onEscalate={handleEscalate}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
