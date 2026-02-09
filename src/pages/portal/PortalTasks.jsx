/**
 * PortalTasks - Customer view of their project's pipeline tasks
 *
 * Displays the 10-step pipeline as a vertical timeline showing task status,
 * bid information for open tasks, worker details for assigned tasks,
 * and completion info for finished tasks.
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
} from "../../services/firebase";
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
} from "lucide-react";

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

function TaskCard({ task }) {
  const status = task.status || "blocked";
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.blocked;
  const label =
    TASK_LABELS[task.task_name] || task.task_name?.replace(/_/g, " ") || "Task";

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

        {/* Assigned task: worker info */}
        {status === "assigned" && (
          <div className="mt-3 rounded-lg bg-purple-50 p-3">
            <div className="flex flex-wrap items-center gap-4 text-sm text-purple-700">
              {task.worker_name && (
                <span className="inline-flex items-center gap-1">
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
          </div>
        )}

        {/* Completed task: date */}
        {status === "completed" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Completed {formatDate(task.completed_at)}
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

      {/* Task timeline */}
      {project && tasks.length > 0 && (
        <div className="relative">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
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
    </div>
  );
}
