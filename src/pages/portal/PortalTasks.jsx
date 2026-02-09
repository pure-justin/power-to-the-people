/**
 * PortalTasks - Customer view of their project's pipeline tasks
 *
 * Displays the 10-step pipeline as a vertical timeline showing task status,
 * bid information for open tasks, worker details for assigned tasks,
 * completion info for finished tasks, issue reporting, and worker rating.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
} from "../../services/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  Users,
  ArrowRight,
  Loader2,
  Lock,
  CircleDot,
  Gavel,
  UserCheck,
  AlertCircle,
  AlertTriangle,
  Star,
  Phone,
  Mail,
  MessageSquare,
  Flag,
  X,
  Send,
  ChevronRight,
  CalendarClock,
} from "lucide-react";

const functions = getFunctions(undefined, "us-central1");

/** Friendly labels for pipeline task names */
const TASK_LABELS = {
  site_survey: "Site Survey",
  cad_design: "CAD Design",
  engineering: "Engineering",
  permitting: "Permitting",
  hoa_approval: "HOA Approval",
  utility_application: "Utility Application",
  equipment_procurement: "Equipment Procurement",
  installation: "Installation",
  inspection: "Inspection",
  pto: "Permission to Operate",
};

/** Status badge config: color classes + label */
const STATUS_CONFIG = {
  blocked: {
    bg: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
    label: "Blocked",
    icon: Lock,
  },
  ready: {
    bg: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    label: "Ready",
    icon: CircleDot,
  },
  open: {
    bg: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    label: "Bidding",
    icon: Gavel,
  },
  assigned: {
    bg: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    label: "Assigned",
    icon: UserCheck,
  },
  completed: {
    bg: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    label: "Completed",
    icon: CheckCircle,
  },
};

const ISSUE_TYPES = [
  {
    id: "no_show",
    label: "Worker No-Show",
    description: "Worker did not show up at scheduled time",
  },
  {
    id: "quality",
    label: "Quality Issue",
    description: "Work quality does not meet expectations",
  },
  {
    id: "unresponsive",
    label: "Unresponsive Worker",
    description: "Cannot reach assigned worker",
  },
  {
    id: "delay",
    label: "Unexpected Delay",
    description: "Task is taking longer than expected",
  },
  {
    id: "other",
    label: "Other Issue",
    description: "Something else needs attention",
  },
];

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.blocked;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.bg}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

/** Format a Firestore timestamp or ISO date string */
function formatDate(dateValue) {
  if (!dateValue) return "N/A";
  const d = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Calculate time remaining from now until a deadline */
function timeRemaining(deadline) {
  if (!deadline) return null;
  const end = deadline.toDate ? deadline.toDate() : new Date(deadline);
  const now = new Date();
  const diff = end - now;
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  return `${hours}h left`;
}

/** Estimate completion date based on task order and typical durations */
function estimateCompletion(task, allTasks) {
  if (task.expected_completion) return formatDate(task.expected_completion);
  if (task.status === "completed") return null;

  // Typical durations in days for each task type
  const typicalDurations = {
    site_survey: 3,
    cad_design: 5,
    engineering: 7,
    permitting: 14,
    hoa_approval: 21,
    utility_application: 10,
    equipment_procurement: 14,
    installation: 5,
    inspection: 7,
    pto: 14,
  };

  const completedCount = allTasks.filter(
    (t) => t.status === "completed",
  ).length;
  const taskIndex = allTasks.findIndex((t) => t.id === task.id);
  if (taskIndex < completedCount) return null;

  // Calculate cumulative days from current task
  let cumulativeDays = 0;
  for (let i = completedCount; i <= taskIndex; i++) {
    cumulativeDays += typicalDurations[allTasks[i]?.task_name] || 7;
  }

  const estDate = new Date();
  estDate.setDate(estDate.getDate() + cumulativeDays);
  return estDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Report Issue Modal */
function ReportIssueModal({ task, projectId, onClose, onSubmitted }) {
  const [issueType, setIssueType] = useState("no_show");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "task_issues"), {
        project_id: projectId,
        task_id: task.id,
        task_name: task.task_name,
        issue_type: issueType,
        description,
        status: "open",
        created_at: serverTimestamp(),
        worker_name: task.worker_name || null,
        worker_id: task.worker_id || null,
      });
      onSubmitted?.();
    } catch (err) {
      console.error("Failed to report issue:", err);
      setError("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Flag className="h-4 w-4 text-red-500" />
            Report Issue
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-500">
          Report a problem with:{" "}
          <span className="font-medium text-gray-700">
            {TASK_LABELS[task.task_name] || task.task_name}
          </span>
          {task.worker_name && (
            <span className="ml-1 text-gray-500">
              (Worker: {task.worker_name})
            </span>
          )}
        </p>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Issue Type
            </label>
            <div className="space-y-2">
              {ISSUE_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    issueType === type.id
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="issueType"
                    value={type.id}
                    checked={issueType === type.id}
                    onChange={() => setIssueType(type.id)}
                    className="mt-0.5 accent-red-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {type.label}
                    </p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Additional Details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the issue in detail..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-1 focus:ring-red-300"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Rate Worker Modal */
function RateWorkerModal({ task, projectId, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "marketplace_ratings"), {
        worker_id: task.worker_id,
        project_id: projectId,
        task_id: task.id,
        task_name: task.task_name,
        score: rating,
        review: review || null,
        created_at: serverTimestamp(),
      });
      onSubmitted?.();
    } catch (err) {
      console.error("Failed to submit rating:", err);
      setError("Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Star className="h-4 w-4 text-amber-500" />
            Rate Worker
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-500">
          How was{" "}
          <span className="font-medium text-gray-700">
            {task.worker_name || "the worker"}
          </span>{" "}
          for{" "}
          <span className="font-medium text-gray-700">
            {TASK_LABELS[task.task_name] || task.task_name}
          </span>
          ?
        </p>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    n <= (hoverRating || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-200 hover:text-amber-200"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm font-medium text-gray-700">
              {rating === 1
                ? "Poor"
                : rating === 2
                  ? "Below Average"
                  : rating === 3
                    ? "Average"
                    : rating === 4
                      ? "Good"
                      : "Excellent"}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Review (optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
              placeholder="Share your experience..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Star className="h-4 w-4" />
              )}
              Submit Rating
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Horizontal dependency pipeline -- which tasks unlock next */
function DependencyPipeline({ tasks }) {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <CalendarClock className="h-4 w-4 text-gray-400" />
        Pipeline Dependencies
      </h3>
      <div className="overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max py-1">
          {tasks.map((task, i) => {
            const status = task.status || "blocked";
            const label =
              TASK_LABELS[task.task_name] ||
              task.task_name?.replace(/_/g, " ") ||
              "Task";

            let nodeColor = "bg-gray-200 text-gray-500 border-gray-300";
            if (status === "completed")
              nodeColor = "bg-green-500 text-white border-green-600";
            else if (status === "assigned")
              nodeColor = "bg-purple-500 text-white border-purple-600";
            else if (status === "open")
              nodeColor = "bg-amber-400 text-white border-amber-500";
            else if (status === "ready")
              nodeColor = "bg-blue-400 text-white border-blue-500";

            // Determine if this is the "next up" task
            const isNextUp =
              (status === "ready" || status === "open") &&
              i > 0 &&
              (tasks[i - 1]?.status === "completed" ||
                tasks[i - 1]?.status === "assigned");

            return (
              <div key={task.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${nodeColor} ${
                      isNextUp ? "ring-2 ring-blue-300 ring-offset-1" : ""
                    }`}
                    title={`${label}: ${status}`}
                  >
                    {status === "completed" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : status === "blocked" ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-1 max-w-[60px] text-center text-[9px] leading-tight ${
                      isNextUp ? "font-semibold text-blue-700" : "text-gray-500"
                    }`}
                  >
                    {label}
                  </span>
                  {isNextUp && (
                    <span className="mt-0.5 rounded-full bg-blue-100 px-1.5 py-0 text-[7px] font-bold text-blue-700">
                      NEXT
                    </span>
                  )}
                </div>
                {i < tasks.length - 1 && (
                  <div className="mx-1 flex items-center">
                    <div
                      className={`h-0.5 w-5 ${
                        status === "completed" ? "bg-green-300" : "bg-gray-200"
                      }`}
                    />
                    <ChevronRight
                      className={`h-3 w-3 -ml-0.5 ${
                        status === "completed"
                          ? "text-green-400"
                          : "text-gray-300"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, allTasks, projectId, onReportIssue, onRateWorker }) {
  const status = task.status || "blocked";
  const label =
    TASK_LABELS[task.task_name] || task.task_name?.replace(/_/g, " ") || "Task";

  // Estimated completion for non-completed tasks
  const estCompletion =
    status !== "completed" ? estimateCompletion(task, allTasks) : null;

  return (
    <div className="relative flex gap-4">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div
          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            status === "completed"
              ? "bg-green-500"
              : status === "assigned"
                ? "bg-purple-500"
                : status === "open"
                  ? "bg-amber-500"
                  : status === "ready"
                    ? "bg-blue-500"
                    : "bg-gray-300"
          }`}
        >
          {status === "completed" ? (
            <CheckCircle className="h-4 w-4 text-white" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-white" />
          )}
        </div>
        {/* Vertical line connector */}
        <div className="w-0.5 flex-1 bg-gray-200" />
      </div>

      {/* Card content */}
      <div className="mb-6 flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">{label}</h3>
            {task.description && (
              <p className="mt-0.5 text-sm text-gray-500">{task.description}</p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Estimated completion timeline */}
        {estCompletion && status !== "blocked" && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <CalendarClock className="h-3 w-3" />
            <span>Est. completion: {estCompletion}</span>
          </div>
        )}

        {/* Open task: bid info */}
        {status === "open" && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {task.bid_count != null && (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <Users className="h-3.5 w-3.5" />
                  {task.bid_count} {task.bid_count === 1 ? "bid" : "bids"}
                </span>
              )}
              {task.price_range_low != null &&
                task.price_range_high != null && (
                  <span className="text-amber-700">
                    ${task.price_range_low.toLocaleString()} - $
                    {task.price_range_high.toLocaleString()}
                  </span>
                )}
              {task.bid_deadline && (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <Clock className="h-3.5 w-3.5" />
                  {timeRemaining(task.bid_deadline)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Assigned task: worker info + contact */}
        {status === "assigned" && (
          <div className="mt-3 rounded-lg bg-purple-50 p-3">
            <div className="flex flex-wrap items-center gap-4 text-sm text-purple-700">
              {task.worker_name && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <UserCheck className="h-3.5 w-3.5" />
                  {task.worker_name}
                </span>
              )}
              {task.expected_completion && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Expected: {formatDate(task.expected_completion)}
                </span>
              )}
            </div>

            {/* Worker contact info */}
            {(task.worker_phone || task.worker_email) && (
              <div className="mt-2 flex flex-wrap gap-2 border-t border-purple-100 pt-2">
                {task.worker_phone && (
                  <a
                    href={`tel:${task.worker_phone}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200"
                  >
                    <Phone className="h-3 w-3" />
                    {task.worker_phone}
                  </a>
                )}
                {task.worker_email && (
                  <a
                    href={`mailto:${task.worker_email}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200"
                  >
                    <Mail className="h-3 w-3" />
                    Email
                  </a>
                )}
              </div>
            )}

            {/* Report Issue button */}
            <div className="mt-2 border-t border-purple-100 pt-2">
              <button
                onClick={() => onReportIssue(task)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                <Flag className="h-3 w-3" />
                Report Issue
              </button>
            </div>
          </div>
        )}

        {/* Completed task: date + rate worker */}
        {status === "completed" && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              Completed {formatDate(task.completed_at)}
            </div>

            {/* Rate Worker button (only if worker was assigned and not yet rated) */}
            {task.worker_id && !task.rated && (
              <button
                onClick={() => onRateWorker(task)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
              >
                <Star className="h-3 w-3" />
                Rate Worker
              </button>
            )}
            {task.rated && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Star className="h-3 w-3 fill-amber-400" />
                Rated
              </div>
            )}
          </div>
        )}

        {/* DIY button for site_survey */}
        {task.task_name === "site_survey" &&
          task.allow_diy &&
          status !== "completed" && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <Link
                to="/portal/survey"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
              >
                Do It Yourself
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
      </div>
    </div>
  );
}

export default function PortalTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [reportIssueTask, setReportIssueTask] = useState(null);
  const [rateWorkerTask, setRateWorkerTask] = useState(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        // 1. Get the customer's first project
        const projectQuery = query(
          collection(db, "projects"),
          where("userId", "==", user.uid),
          limit(1),
        );
        const projectSnap = await getDocs(projectQuery);

        if (projectSnap.empty) {
          setLoading(false);
          return;
        }

        const projectDoc = projectSnap.docs[0];
        const projectData = { id: projectDoc.id, ...projectDoc.data() };
        setProject(projectData);

        // 2. Fetch pipeline tasks for this project
        const tasksQuery = query(
          collection(db, "projects", projectDoc.id, "pipeline_tasks"),
          orderBy("order", "asc"),
        );
        const tasksSnap = await getDocs(tasksQuery);
        const taskList = tasksSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setTasks(taskList);
      } catch (err) {
        console.error("Failed to load tasks:", err);
        setError("Failed to load your project tasks. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-4 w-64 rounded bg-gray-100" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="h-24 flex-1 rounded-xl bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="mt-1 text-sm text-gray-500">
          {project
            ? `Track every step of your solar project at ${project.address || "your home"}`
            : "Your project pipeline and progress"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* No project state */}
      {!project && !error && (
        <div className="py-16 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            No Active Project
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Once you have a solar project, your tasks will appear here.
          </p>
        </div>
      )}

      {/* Progress summary */}
      {project && tasks.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <span className="text-sm font-bold text-emerald-600">
              {tasks.filter((t) => t.status === "completed").length} of{" "}
              {tasks.length} complete
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${(tasks.filter((t) => t.status === "completed").length / tasks.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Dependency pipeline visualization */}
      {project && tasks.length > 0 && <DependencyPipeline tasks={tasks} />}

      {/* Task timeline */}
      {project && tasks.length > 0 && (
        <div className="relative">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              allTasks={tasks}
              projectId={project.id}
              onReportIssue={setReportIssueTask}
              onRateWorker={setRateWorkerTask}
            />
          ))}
        </div>
      )}

      {/* Project exists but no tasks yet */}
      {project && tasks.length === 0 && !error && (
        <div className="py-16 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Setting Up Your Pipeline
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Your project tasks are being configured. Check back soon.
          </p>
        </div>
      )}

      {/* Modals */}
      {reportIssueTask && project && (
        <ReportIssueModal
          task={reportIssueTask}
          projectId={project.id}
          onClose={() => setReportIssueTask(null)}
          onSubmitted={() => setReportIssueTask(null)}
        />
      )}
      {rateWorkerTask && project && (
        <RateWorkerModal
          task={rateWorkerTask}
          projectId={project.id}
          onClose={() => setRateWorkerTask(null)}
          onSubmitted={() => {
            setRateWorkerTask(null);
            // Mark task as rated locally
            setTasks((prev) =>
              prev.map((t) =>
                t.id === rateWorkerTask.id ? { ...t, rated: true } : t,
              ),
            );
          }}
        />
      )}
    </div>
  );
}
