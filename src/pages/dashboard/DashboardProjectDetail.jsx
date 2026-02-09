import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from "../../services/firebase";
import {
  ArrowLeft,
  MapPin,
  Sun,
  Clock,
  User,
  CheckCircle2,
  Circle,
  FileText,
  Package,
  ShieldCheck,
  ClipboardList,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Gavel,
  ArrowRight,
  Lock,
  Workflow,
  Star,
  DollarSign,
  Timer,
  ExternalLink,
  Activity,
  BarChart3,
  Hammer,
  Ruler,
  Zap,
  ClipboardCheck,
  Send,
  Eye,
  Compass,
  PenTool,
  HardHat,
} from "lucide-react";

const PIPELINE_STAGES = [
  { value: "lead", label: "Lead", phase: "Acquisition" },
  { value: "qualified", label: "Qualified", phase: "Acquisition" },
  { value: "proposal", label: "Proposal", phase: "Sales" },
  { value: "sold", label: "Sold", phase: "Sales" },
  { value: "survey", label: "Survey", phase: "Pre-Construction" },
  { value: "design", label: "Design", phase: "Pre-Construction" },
  { value: "engineering", label: "Engineering", phase: "Pre-Construction" },
  {
    value: "permit_submitted",
    label: "Permit Submitted",
    phase: "Pre-Construction",
  },
  {
    value: "permit_approved",
    label: "Permit Approved",
    phase: "Pre-Construction",
  },
  { value: "scheduled", label: "Scheduled", phase: "Construction" },
  { value: "installing", label: "Installing", phase: "Construction" },
  { value: "inspection", label: "Inspection", phase: "Construction" },
  { value: "pto_submitted", label: "PTO Submitted", phase: "Activation" },
  { value: "pto_approved", label: "PTO Approved", phase: "Activation" },
  { value: "activated", label: "Activated", phase: "Activation" },
  { value: "monitoring", label: "Monitoring", phase: "Activation" },
];

const TASK_TYPE_LABELS = {
  site_survey: "Site Survey",
  cad_design: "CAD Design",
  engineering_stamp: "Engineering Stamp",
  permit_submission: "Permit Submission",
  hoa_approval: "HOA Approval",
  equipment_order: "Equipment Order",
  installation: "Installation",
  inspection: "Inspection",
  pto_submission: "PTO Submission",
};

const TASK_STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  assigned: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// Enhanced status styles for pipeline tasks (dark theme cards)
const PIPELINE_STATUS_CONFIG = {
  blocked: {
    bg: "bg-gray-700/60",
    border: "border-gray-600",
    badge: "bg-gray-600 text-gray-300",
    dot: "bg-gray-500",
    label: "Blocked",
  },
  ready: {
    bg: "bg-yellow-900/30",
    border: "border-yellow-700/50",
    badge: "bg-yellow-600/80 text-yellow-100",
    dot: "bg-yellow-400",
    label: "Ready",
  },
  open: {
    bg: "bg-blue-900/30",
    border: "border-blue-700/50",
    badge: "bg-blue-600/80 text-blue-100",
    dot: "bg-blue-400",
    label: "Open (Bidding)",
  },
  assigned: {
    bg: "bg-indigo-900/30",
    border: "border-indigo-700/50",
    badge: "bg-indigo-600/80 text-indigo-100",
    dot: "bg-indigo-400",
    label: "Assigned",
  },
  completed: {
    bg: "bg-emerald-900/30",
    border: "border-emerald-700/50",
    badge: "bg-emerald-600/80 text-emerald-100",
    dot: "bg-emerald-400",
    label: "Completed",
  },
  pending: {
    bg: "bg-yellow-900/30",
    border: "border-yellow-700/50",
    badge: "bg-yellow-600/80 text-yellow-100",
    dot: "bg-yellow-400",
    label: "Pending",
  },
};

// SLA timelines in business days per task type
const TASK_SLA_DAYS = {
  site_survey: 3,
  cad_design: 5,
  engineering_stamp: 7,
  permit_submission: 3,
  hoa_approval: 14,
  equipment_order: 10,
  installation: 5,
  inspection: 5,
  pto_submission: 3,
};

// Task type icons
const TASK_TYPE_ICONS = {
  site_survey: Compass,
  cad_design: PenTool,
  engineering_stamp: Ruler,
  permit_submission: FileText,
  hoa_approval: ClipboardCheck,
  equipment_order: Package,
  installation: Hammer,
  inspection: Eye,
  pto_submission: Send,
};

// Dependency map for the diagram
const TASK_DEPENDENCY_FLOW = [
  { id: "site_survey", label: "Survey", col: 0, row: 0 },
  { id: "cad_design", label: "CAD", col: 1, row: 0 },
  { id: "engineering_stamp", label: "Engineering", col: 2, row: 0 },
  { id: "permit_submission", label: "Permit Prep", col: 3, row: 0 },
  { id: "hoa_approval", label: "HOA", col: 3, row: 1 },
  { id: "equipment_order", label: "Equipment", col: 4, row: 1 },
  { id: "installation", label: "Install", col: 5, row: 0 },
  { id: "inspection", label: "Inspection", col: 6, row: 0 },
  { id: "pto_submission", label: "PTO", col: 7, row: 0 },
];

function formatDate(val) {
  if (!val) return null;
  const d = val.toDate ? val.toDate() : new Date(val);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card-padded">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ---- Bid Summary Panel ----
function BidSummaryPanel({ pipelineTasks, marketplaceData }) {
  const totalTasks = pipelineTasks.length;
  const completed = pipelineTasks.filter(
    (t) => t.status === "completed",
  ).length;
  const assigned = pipelineTasks.filter((t) => t.status === "assigned").length;
  const open = pipelineTasks.filter(
    (t) => t.status === "open" || t.status === "ready",
  ).length;
  const blocked = pipelineTasks.filter((t) => t.status === "blocked").length;
  const pending = pipelineTasks.filter((t) => t.status === "pending").length;

  // Count total bids across all marketplace listings
  let totalBids = 0;
  let totalCost = 0;
  Object.values(marketplaceData).forEach((listing) => {
    totalBids += listing.bid_count || 0;
    if (listing.winning_bid?.price) {
      totalCost += listing.winning_bid.price;
    }
  });

  // Estimate completion date based on remaining SLA timelines
  const remainingTasks = pipelineTasks.filter((t) => t.status !== "completed");
  const remainingSLADays = remainingTasks.reduce(
    (sum, t) => sum + (TASK_SLA_DAYS[t.type] || 5),
    0,
  );
  const estCompletion = new Date();
  estCompletion.setDate(estCompletion.getDate() + remainingSLADays);

  const progress = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-emerald-400" />
        <h2 className="text-sm font-semibold text-gray-200">
          Pipeline Summary
        </h2>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-gray-400">Overall Progress</span>
          <span className="font-medium text-emerald-400">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-700">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg bg-emerald-900/30 border border-emerald-700/30 p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{completed}</p>
          <p className="text-[10px] font-medium text-emerald-300/70">
            Completed
          </p>
        </div>
        <div className="rounded-lg bg-blue-900/30 border border-blue-700/30 p-3 text-center">
          <p className="text-xl font-bold text-blue-400">{open}</p>
          <p className="text-[10px] font-medium text-blue-300/70">
            Open / Ready
          </p>
        </div>
        <div className="rounded-lg bg-indigo-900/30 border border-indigo-700/30 p-3 text-center">
          <p className="text-xl font-bold text-indigo-400">{assigned}</p>
          <p className="text-[10px] font-medium text-indigo-300/70">Assigned</p>
        </div>
        <div className="rounded-lg bg-gray-700/50 border border-gray-600/30 p-3 text-center">
          <p className="text-xl font-bold text-gray-400">{blocked + pending}</p>
          <p className="text-[10px] font-medium text-gray-500">Blocked</p>
        </div>
        <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-3 text-center">
          <p className="text-xl font-bold text-amber-400">{totalBids}</p>
          <p className="text-[10px] font-medium text-amber-300/70">
            Total Bids
          </p>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-700/50 pt-3 text-xs">
        {totalCost > 0 && (
          <div className="flex items-center gap-1.5 text-gray-300">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              Project Cost:{" "}
              <span className="font-semibold text-emerald-400">
                ${totalCost.toLocaleString()}
              </span>
            </span>
          </div>
        )}
        {remainingTasks.length > 0 && (
          <div className="flex items-center gap-1.5 text-gray-300">
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            <span>
              Est. Completion:{" "}
              <span className="font-semibold text-blue-400">
                {estCompletion.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-gray-300">
          <Activity className="h-3.5 w-3.5 text-gray-400" />
          <span>{totalTasks} total tasks</span>
        </div>
      </div>
    </div>
  );
}

// ---- Task Dependency Diagram ----
function TaskDependencyDiagram({ pipelineTasks }) {
  // Build a status map from actual tasks
  const statusMap = {};
  pipelineTasks.forEach((t) => {
    statusMap[t.type] = t.status;
  });

  const getStatusColor = (taskType) => {
    const status = statusMap[taskType];
    switch (status) {
      case "completed":
        return "bg-emerald-500 text-white border-emerald-400";
      case "assigned":
        return "bg-indigo-500 text-white border-indigo-400";
      case "open":
        return "bg-blue-500 text-white border-blue-400";
      case "ready":
        return "bg-yellow-500 text-white border-yellow-400";
      case "blocked":
      case "pending":
        return "bg-gray-600 text-gray-300 border-gray-500";
      default:
        return "bg-gray-700 text-gray-400 border-gray-600";
    }
  };

  const getConnectorColor = (fromType) => {
    const status = statusMap[fromType];
    if (status === "completed") return "bg-emerald-500/60";
    return "bg-gray-600";
  };

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Workflow className="h-5 w-5 text-blue-400" />
        <h2 className="text-sm font-semibold text-gray-200">
          Task Dependencies
        </h2>
      </div>

      {/* Dependency flow diagram */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px] space-y-3 py-2">
          {/* Main flow: Survey -> CAD -> Engineering -> Permit -> Install -> Inspection -> PTO */}
          <div className="flex items-center gap-0">
            {[
              "site_survey",
              "cad_design",
              "engineering_stamp",
              "permit_submission",
            ].map((taskType, i, arr) => (
              <div key={taskType} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${getStatusColor(taskType)}`}
                >
                  {(() => {
                    const Icon = TASK_TYPE_ICONS[taskType] || Circle;
                    return <Icon className="h-3.5 w-3.5" />;
                  })()}
                  {TASK_TYPE_LABELS[taskType]}
                </div>
                {i < arr.length - 1 && (
                  <div className="flex items-center px-1">
                    <div
                      className={`h-0.5 w-6 ${getConnectorColor(taskType)}`}
                    />
                    <ArrowRight
                      className={`h-3 w-3 -ml-1 ${
                        statusMap[taskType] === "completed"
                          ? "text-emerald-400"
                          : "text-gray-500"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Fork arrow down to HOA */}
            <div className="flex items-center px-1">
              <div
                className={`h-0.5 w-4 ${getConnectorColor("permit_submission")}`}
              />
              <ArrowRight
                className={`h-3 w-3 -ml-1 ${
                  statusMap["permit_submission"] === "completed"
                    ? "text-emerald-400"
                    : "text-gray-500"
                }`}
              />
            </div>

            {/* Continue main flow */}
            {["installation", "inspection", "pto_submission"].map(
              (taskType, i, arr) => (
                <div key={taskType} className="flex items-center">
                  <div
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${getStatusColor(taskType)}`}
                  >
                    {(() => {
                      const Icon = TASK_TYPE_ICONS[taskType] || Circle;
                      return <Icon className="h-3.5 w-3.5" />;
                    })()}
                    {TASK_TYPE_LABELS[taskType]}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex items-center px-1">
                      <div
                        className={`h-0.5 w-6 ${getConnectorColor(taskType)}`}
                      />
                      <ArrowRight
                        className={`h-3 w-3 -ml-1 ${
                          statusMap[taskType] === "completed"
                            ? "text-emerald-400"
                            : "text-gray-500"
                        }`}
                      />
                    </div>
                  )}
                </div>
              ),
            )}
          </div>

          {/* Branch row: HOA + Equipment Order (parallel) */}
          <div className="ml-[340px] flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-px bg-gray-600 -mt-3" />
              <div
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${getStatusColor("hoa_approval")}`}
              >
                {(() => {
                  const Icon = TASK_TYPE_ICONS["hoa_approval"] || Circle;
                  return <Icon className="h-3.5 w-3.5" />;
                })()}
                {TASK_TYPE_LABELS["hoa_approval"]}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${getStatusColor("equipment_order")}`}
              >
                {(() => {
                  const Icon = TASK_TYPE_ICONS["equipment_order"] || Circle;
                  return <Icon className="h-3.5 w-3.5" />;
                })()}
                {TASK_TYPE_LABELS["equipment_order"]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-700/50 pt-3">
        <span className="text-[10px] font-medium uppercase text-gray-500">
          Status:
        </span>
        {[
          { color: "bg-gray-600", label: "Blocked" },
          { color: "bg-yellow-500", label: "Ready" },
          { color: "bg-blue-500", label: "Open" },
          { color: "bg-indigo-500", label: "Assigned" },
          { color: "bg-emerald-500", label: "Completed" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
            <span className="text-[10px] text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Enhanced Pipeline Task Card ----
function EnhancedTaskCard({
  task,
  listing,
  pipelineTasks,
  isExpanded,
  onToggleBids,
  bidsList,
  bidsLoading,
}) {
  const config =
    PIPELINE_STATUS_CONFIG[task.status] || PIPELINE_STATUS_CONFIG.blocked;
  const Icon = TASK_TYPE_ICONS[task.type] || Circle;
  const slaDays = TASK_SLA_DAYS[task.type] || 5;

  // Calculate bid price range if listing exists
  let priceRange = null;
  if (listing && listing.budget) {
    priceRange = { min: listing.budget.min, max: listing.budget.max };
  }

  // Calculate time remaining for bid window
  let bidTimeRemaining = null;
  if (listing?.bid_deadline) {
    const deadline = listing.bid_deadline.toDate
      ? listing.bid_deadline.toDate()
      : new Date(listing.bid_deadline);
    const now = new Date();
    const diff = deadline - now;
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      bidTimeRemaining =
        days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
    } else {
      bidTimeRemaining = "Bidding closed";
    }
  }

  // Blocked dependencies info
  const blockedDeps = [];
  if (task.status === "blocked" && task.depends_on?.length > 0) {
    task.depends_on.forEach((depId) => {
      const depTask = pipelineTasks.find((t) => t.id === depId);
      if (depTask && depTask.status !== "completed") {
        blockedDeps.push(depTask);
      }
    });
  }

  return (
    <div
      className={`rounded-xl border ${config.border} ${config.bg} p-4 transition-all`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            task.status === "completed"
              ? "bg-emerald-500/20"
              : task.status === "assigned"
                ? "bg-indigo-500/20"
                : task.status === "open"
                  ? "bg-blue-500/20"
                  : task.status === "ready"
                    ? "bg-yellow-500/20"
                    : "bg-gray-600/30"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              task.status === "completed"
                ? "text-emerald-400"
                : task.status === "assigned"
                  ? "text-indigo-400"
                  : task.status === "open"
                    ? "text-blue-400"
                    : task.status === "ready"
                      ? "text-yellow-400"
                      : "text-gray-500"
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-200">
              {TASK_TYPE_LABELS[task.type] || task.type}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.badge}`}
            >
              {config.label}
            </span>
            <span className="text-[10px] text-gray-500">
              SLA: {slaDays} days
            </span>
          </div>

          {task.description && (
            <p className="mt-1 text-xs text-gray-400">{task.description}</p>
          )}

          {/* Status-specific content */}
          <div className="mt-2 space-y-1.5">
            {/* BLOCKED: Show dependencies */}
            {task.status === "blocked" && blockedDeps.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Lock className="h-3 w-3 text-gray-500" />
                <span className="text-gray-500">Waiting on:</span>
                {blockedDeps.map((dep) => (
                  <span
                    key={dep.id}
                    className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300"
                  >
                    {TASK_TYPE_LABELS[dep.type] || dep.type}
                  </span>
                ))}
              </div>
            )}

            {/* OPEN: Show bid count, price range, time remaining */}
            {(task.status === "open" || task.status === "ready") && listing && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-blue-300">
                  <Gavel className="h-3 w-3" />
                  {listing.bid_count || 0} bid
                  {(listing.bid_count || 0) !== 1 ? "s" : ""}
                </span>
                {priceRange && (
                  <span className="flex items-center gap-1 text-gray-300">
                    <DollarSign className="h-3 w-3 text-emerald-400" />$
                    {priceRange.min?.toLocaleString()} - $
                    {priceRange.max?.toLocaleString()}
                  </span>
                )}
                {bidTimeRemaining && (
                  <span
                    className={`flex items-center gap-1 ${
                      bidTimeRemaining === "Bidding closed"
                        ? "text-red-400"
                        : "text-amber-300"
                    }`}
                  >
                    <Timer className="h-3 w-3" />
                    {bidTimeRemaining}
                  </span>
                )}
              </div>
            )}

            {/* ASSIGNED: Show worker info */}
            {task.status === "assigned" && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {(listing?.winning_bid?.bidderName ||
                  task.assigned_to_name) && (
                  <span className="flex items-center gap-1 text-indigo-300">
                    <User className="h-3 w-3" />
                    {listing?.winning_bid?.bidderName ||
                      task.assigned_to_name ||
                      "Worker assigned"}
                  </span>
                )}
                {listing?.winning_bid?.rating && (
                  <span className="flex items-center gap-1 text-amber-300">
                    <Star className="h-3 w-3" />
                    {listing.winning_bid.rating}
                  </span>
                )}
                {task.expected_completion && (
                  <span className="flex items-center gap-1 text-gray-300">
                    <Calendar className="h-3 w-3" />
                    Due {formatDate(task.expected_completion)}
                  </span>
                )}
                {listing?.winning_bid?.price && (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <DollarSign className="h-3 w-3" />$
                    {listing.winning_bid.price.toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* COMPLETED: Show completion info */}
            {task.status === "completed" && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {task.completed_at && (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed {formatDate(task.completed_at)}
                  </span>
                )}
                {task.deliverables_url && (
                  <a
                    href={task.deliverables_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Deliverables
                  </a>
                )}
                {listing?.winning_bid?.price && (
                  <span className="flex items-center gap-1 text-gray-400">
                    <DollarSign className="h-3 w-3" />$
                    {listing.winning_bid.price.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side: View Bids button */}
        <div className="shrink-0">
          {listing && (listing.bid_count || 0) > 0 && (
            <button
              onClick={() => onToggleBids(task.marketplace_listing_id)}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-700/50 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600/50 hover:text-gray-200 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              View Bids
            </button>
          )}
        </div>
      </div>

      {/* Expanded Bids List */}
      {isExpanded && (
        <div className="mt-3 rounded-lg border border-gray-700/50 bg-gray-900/40 p-3">
          {bidsLoading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading bids...
            </div>
          ) : bidsList.length === 0 ? (
            <p className="py-2 text-xs text-gray-500">No bids found</p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <Gavel className="h-3.5 w-3.5 text-gray-400" />
                <h4 className="text-[10px] font-semibold uppercase text-gray-400">
                  {bidsList.length} Bid{bidsList.length !== 1 ? "s" : ""}{" "}
                  Received
                </h4>
              </div>
              {bidsList.map((bid) => (
                <div
                  key={bid.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    bid.status === "accepted"
                      ? "bg-emerald-900/30 border border-emerald-700/30"
                      : "bg-gray-800/60"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-200">
                        ${bid.price?.toLocaleString() || "N/A"}
                      </span>
                      {bid.score != null && (
                        <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
                          Score: {bid.score}
                        </span>
                      )}
                      {bid.timeline && (
                        <span className="text-[10px] text-gray-500">
                          {bid.timeline}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
                      <span>
                        {bid.bidder?.displayName ||
                          bid.bidder?.email ||
                          "Anonymous"}
                      </span>
                      {bid.bidder?.rating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 text-amber-400" />
                          {bid.bidder.rating}
                        </span>
                      )}
                      {bid.distance_miles != null && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {bid.distance_miles.toFixed(1)} mi
                        </span>
                      )}
                      {bid.certifications?.length > 0 && (
                        <span>
                          {bid.certifications.length} cert
                          {bid.certifications.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      bid.status === "accepted"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : bid.status === "rejected"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {bid.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [pipelineTasks, setPipelineTasks] = useState([]);
  const [marketplaceData, setMarketplaceData] = useState({}); // keyed by marketplace_listing_id
  const [expandedBids, setExpandedBids] = useState(null); // listing_id to show bids for
  const [bidsList, setBidsList] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !projectId) return;

    const load = async () => {
      try {
        // Load project
        const projectSnap = await getDoc(doc(db, "projects", projectId));
        if (!projectSnap.exists()) {
          setError("Project not found");
          setLoading(false);
          return;
        }
        setProject({ id: projectSnap.id, ...projectSnap.data() });

        // Load tasks subcollection (legacy)
        const tasksSnap = await getDocs(
          collection(db, "projects", projectId, "tasks"),
        );
        const taskData = tasksSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setTasks(taskData);

        // Load pipeline_tasks subcollection
        try {
          const pipelineSnap = await getDocs(
            query(
              collection(db, "projects", projectId, "pipeline_tasks"),
              orderBy("order", "asc"),
            ),
          );
          const pipelineData = pipelineSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setPipelineTasks(pipelineData);

          // Load marketplace listings for each pipeline task that has one
          const listingIds = pipelineData
            .map((t) => t.marketplace_listing_id)
            .filter(Boolean);
          if (listingIds.length > 0) {
            const listingMap = {};
            // Fetch each listing individually (Firestore doesn't support `in` with subcollections easily)
            await Promise.all(
              listingIds.map(async (lid) => {
                try {
                  const listingSnap = await getDoc(
                    doc(db, "marketplace_listings", lid),
                  );
                  if (listingSnap.exists()) {
                    listingMap[lid] = {
                      id: listingSnap.id,
                      ...listingSnap.data(),
                    };
                  }
                } catch (e) {
                  console.error("Failed to load listing:", lid, e);
                }
              }),
            );
            setMarketplaceData(listingMap);
          }
        } catch (pipelineErr) {
          console.error("Failed to load pipeline tasks:", pipelineErr);
          // Not fatal -- pipeline_tasks may not exist yet
        }
      } catch (err) {
        console.error("Failed to load project:", err);
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, projectId]);

  const loadBidsForListing = async (listingId) => {
    if (expandedBids === listingId) {
      setExpandedBids(null);
      setBidsList([]);
      return;
    }
    setExpandedBids(listingId);
    setBidsLoading(true);
    try {
      const bidsQ = query(
        collection(db, "marketplace_bids"),
        where("listing_id", "==", listingId),
        orderBy("price", "asc"),
        limit(50),
      );
      const bidsSnap = await getDocs(bidsQ);
      setBidsList(bidsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load bids:", err);
      setBidsList([]);
    } finally {
      setBidsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/dashboard/projects")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>
        <div className="card-padded text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-300" />
          <p className="mt-3 text-sm text-gray-500">
            {error || "Project not found"}
          </p>
        </div>
      </div>
    );
  }

  const currentStatus = project.status || "lead";
  const currentStageIndex = PIPELINE_STAGES.findIndex(
    (s) => s.value === currentStatus,
  );
  const timeline = project.pipeline?.timeline || [];

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        onClick={() => navigate("/dashboard/projects")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </button>

      {/* Header */}
      <div className="card-padded">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {project.customerName || project.name || "Untitled Project"}
            </h1>
            {project.address && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                {project.address}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {project.systemSize && (
              <span className="flex items-center gap-1">
                <Sun className="h-4 w-4" />
                {project.systemSize} kW
              </span>
            )}
            {project.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(project.createdAt)}
              </span>
            )}
          </div>
        </div>

        {/* Pipeline progress */}
        <div className="mt-6 overflow-x-auto">
          <div className="flex items-center gap-0.5 min-w-max">
            {PIPELINE_STAGES.map((stage, i) => {
              const isPast = i < currentStageIndex;
              const isCurrent = i === currentStageIndex;
              return (
                <div key={stage.value} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                        isCurrent
                          ? "bg-emerald-500 text-white"
                          : isPast
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    <span
                      className={`mt-1 text-[9px] leading-tight max-w-[56px] text-center ${
                        isCurrent
                          ? "font-semibold text-emerald-700"
                          : isPast
                            ? "text-emerald-600"
                            : "text-gray-400"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={`mx-0.5 h-0.5 w-4 ${
                        isPast ? "bg-emerald-300" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline */}
        <Section title="Timeline" icon={Clock}>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400">No timeline entries yet.</p>
          ) : (
            <div className="relative space-y-0">
              {timeline
                .slice()
                .reverse()
                .map((entry, i) => (
                  <div key={i} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-3 w-3 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-gray-300"}`}
                      />
                      {i < timeline.length - 1 && (
                        <div className="h-full w-px bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 -mt-0.5">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.from}{" "}
                        <ChevronRight className="inline h-3 w-3 text-gray-400" />{" "}
                        {entry.to}
                      </p>
                      {entry.notes && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {entry.notes}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* Tasks */}
        <Section title="Tasks" icon={ClipboardList}>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400">No tasks created yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {TASK_TYPE_LABELS[task.type] || task.type}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {task.description}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_STYLES[task.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Pipeline Tasks -- Enhanced Visualization */}
      {pipelineTasks.length > 0 && (
        <div className="space-y-4">
          {/* Smart Bid Summary Panel */}
          <BidSummaryPanel
            pipelineTasks={pipelineTasks}
            marketplaceData={marketplaceData}
          />

          {/* Task Dependencies Diagram */}
          <TaskDependencyDiagram pipelineTasks={pipelineTasks} />

          {/* Pipeline Visual Chain (compact horizontal) */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Workflow className="h-5 w-5 text-emerald-400" />
              <h2 className="text-sm font-semibold text-gray-200">
                Pipeline Tasks ({pipelineTasks.length})
              </h2>
            </div>

            {/* Compact dependency chain */}
            <div className="mb-5 overflow-x-auto">
              <div className="flex items-center gap-0 min-w-max py-2">
                {pipelineTasks.map((pt, i) => {
                  const isBlocked =
                    pt.status === "blocked" || pt.status === "pending";
                  const isReady = pt.status === "ready" || pt.status === "open";
                  const isAssigned = pt.status === "assigned";
                  const isCompleted = pt.status === "completed";

                  const TaskIcon = TASK_TYPE_ICONS[pt.type] || Circle;

                  let nodeColor = "bg-gray-600 text-gray-400";
                  let ringColor = "";
                  if (isCompleted) {
                    nodeColor = "bg-emerald-500 text-white";
                  } else if (isAssigned) {
                    nodeColor = "bg-indigo-500 text-white";
                  } else if (isReady) {
                    nodeColor = "bg-blue-500 text-white";
                  } else if (isBlocked) {
                    nodeColor = "bg-gray-600 text-gray-400";
                    ringColor = "ring-2 ring-gray-500";
                  }

                  return (
                    <div key={pt.id} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${nodeColor} ${ringColor} transition-all`}
                          title={`${TASK_TYPE_LABELS[pt.type] || pt.type}: ${pt.status}`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : isBlocked ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <TaskIcon className="h-4 w-4" />
                          )}
                        </div>
                        <span className="mt-1 max-w-[68px] text-center text-[9px] leading-tight text-gray-400">
                          {TASK_TYPE_LABELS[pt.type] || pt.type}
                        </span>
                        <span
                          className={`mt-0.5 rounded-full px-1.5 py-0 text-[8px] font-semibold ${
                            (
                              PIPELINE_STATUS_CONFIG[pt.status] ||
                              PIPELINE_STATUS_CONFIG.blocked
                            ).badge
                          }`}
                        >
                          {
                            (
                              PIPELINE_STATUS_CONFIG[pt.status] ||
                              PIPELINE_STATUS_CONFIG.blocked
                            ).label
                          }
                        </span>
                      </div>
                      {i < pipelineTasks.length - 1 && (
                        <div className="mx-1 flex items-center">
                          <div
                            className={`h-0.5 w-6 ${isCompleted ? "bg-emerald-500/60" : "bg-gray-600"}`}
                          />
                          <ArrowRight
                            className={`h-3 w-3 -ml-1 ${isCompleted ? "text-emerald-400" : "text-gray-600"}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Enhanced Pipeline Task Cards */}
            <div className="space-y-3">
              {pipelineTasks.map((pt) => {
                const listing = pt.marketplace_listing_id
                  ? marketplaceData[pt.marketplace_listing_id]
                  : null;
                const isExpanded = expandedBids === pt.marketplace_listing_id;

                return (
                  <EnhancedTaskCard
                    key={pt.id}
                    task={pt}
                    listing={listing}
                    pipelineTasks={pipelineTasks}
                    isExpanded={isExpanded}
                    onToggleBids={loadBidsForListing}
                    bidsList={isExpanded ? bidsList : []}
                    bidsLoading={isExpanded ? bidsLoading : false}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Equipment */}
        <Section title="Equipment" icon={Package}>
          {project.equipment ? (
            <div className="space-y-2">
              {project.equipment.panels && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Panels</span>
                  <span className="font-medium text-gray-900">
                    {project.equipment.panels}
                  </span>
                </div>
              )}
              {project.equipment.inverter && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Inverter</span>
                  <span className="font-medium text-gray-900">
                    {project.equipment.inverter}
                  </span>
                </div>
              )}
              {project.equipment.battery && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Battery</span>
                  <span className="font-medium text-gray-900">
                    {project.equipment.battery}
                  </span>
                </div>
              )}
              {project.equipment.mounting && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Mounting</span>
                  <span className="font-medium text-gray-900">
                    {project.equipment.mounting}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No equipment selected yet.</p>
          )}
        </Section>

        {/* Documents */}
        <Section title="Documents" icon={FileText}>
          {project.documents && project.documents.length > 0 ? (
            <div className="space-y-2">
              {project.documents.map((docItem, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                >
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {docItem.name || docItem.type || "Document"}
                    </p>
                    {docItem.uploadedAt && (
                      <p className="text-xs text-gray-400">
                        {formatDate(docItem.uploadedAt)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No documents uploaded yet.</p>
          )}
        </Section>

        {/* Assignments */}
        <Section title="Assignments" icon={User}>
          {project.assignedTo || project.installer ? (
            <div className="space-y-2">
              {project.assignedTo && (
                <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <User className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Assigned To</p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.assignedToName || project.assignedTo}
                    </p>
                  </div>
                </div>
              )}
              {project.installer && (
                <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <User className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Installer</p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.installerName || project.installer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No assignments yet.</p>
          )}
        </Section>

        {/* Compliance */}
        <Section title="Compliance" icon={ShieldCheck}>
          {project.compliance ? (
            <div className="space-y-2">
              <ComplianceRow
                label="FEOC Compliant"
                value={project.compliance.feoc_compliant}
              />
              <ComplianceRow
                label="Domestic Content"
                value={project.compliance.domestic_content_compliant}
              />
              <ComplianceRow
                label="Tariff Safe"
                value={project.compliance.tariff_safe}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No compliance data available.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function ComplianceRow({ label, value }) {
  const isTrue = value === true;
  const isFalse = value === false;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      {isTrue ? (
        <span className="flex items-center gap-1 text-green-600 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Yes
        </span>
      ) : isFalse ? (
        <span className="flex items-center gap-1 text-red-500 font-medium">
          <AlertCircle className="h-4 w-4" />
          No
        </span>
      ) : (
        <span className="text-gray-400">Unknown</span>
      )}
    </div>
  );
}
