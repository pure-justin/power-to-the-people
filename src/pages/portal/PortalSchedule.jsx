/**
 * PortalSchedule -- Customer-facing install schedule view
 *
 * Shows proposed time slots for customer selection, confirmed schedule
 * details, and live install progress tracking.
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCustomerSchedule,
  confirmSchedule,
} from "../../services/schedulingService";
import { getInstallProgress } from "../../services/photoService";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  CalendarCheck,
  Wrench,
  RefreshCw,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_COLORS = {
  proposed: "bg-amber-100 text-amber-700 border-amber-200",
  customer_confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  installer_confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  both_confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  in_progress: "bg-purple-100 text-purple-700 border-purple-200",
  completed: "bg-gray-100 text-gray-600 border-gray-200",
  rescheduled: "bg-orange-100 text-orange-700 border-orange-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS = {
  proposed: "Choose a Time",
  customer_confirmed: "Waiting for Installer",
  installer_confirmed: "Please Confirm",
  both_confirmed: "Confirmed",
  in_progress: "Installation In Progress",
  completed: "Installation Complete",
  rescheduled: "Rescheduled — Choose New Time",
  cancelled: "Cancelled",
};

// ─── Proposed Slot Selector ───────────────────────────────────────────────────

function SlotSelector({ slots, onSelect, selecting }) {
  if (!slots || slots.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No time slots available. Your installer will contact you with options.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Choose the time that works best for you:
      </p>
      {slots.map((slot, i) => (
        <button
          key={i}
          onClick={() => onSelect(slot)}
          disabled={selecting}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-emerald-300 hover:shadow-md disabled:opacity-50"
        >
          <div>
            <p className="font-medium text-gray-900">{formatDate(slot.date)}</p>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {slot.time_window?.start || "8:00 AM"} -{" "}
                {slot.time_window?.end || "5:00 PM"}
              </span>
              {slot.crew_size && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {slot.crew_size}-person crew
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {selecting ? (
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            ) : (
              <CalendarCheck className="h-5 w-5 text-emerald-500" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Install Progress Tracker ─────────────────────────────────────────────────

function ProgressTracker({ projectId }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getInstallProgress(projectId);
        setProgress(result.progress);
      } catch (err) {
        console.error("Failed to load progress:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading progress...
      </div>
    );
  }

  if (!progress) return null;

  const phases = [
    { key: "pre_install", label: "Pre-Install" },
    { key: "mounting", label: "Mounting" },
    { key: "wiring", label: "Wiring" },
    { key: "panels", label: "Panels" },
    { key: "inverter", label: "Inverter" },
    { key: "battery", label: "Battery" },
    { key: "final", label: "Final" },
    { key: "inspection", label: "Inspection" },
  ];

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Installation Progress
        </span>
        <span className="text-sm font-bold text-emerald-600">
          {progress.percentComplete}%
        </span>
      </div>
      <div className="mb-4 h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>

      {/* Phase steps */}
      <div className="space-y-2">
        {phases.map((phase) => {
          const data = progress.phases?.[phase.key];
          const status = data?.status || "not_started";

          return (
            <div
              key={phase.key}
              className="flex items-center gap-3 rounded-lg px-3 py-2"
            >
              {status === "passed" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : status === "in_progress" ? (
                <Wrench className="h-5 w-5 shrink-0 text-amber-500" />
              ) : status === "needs_rework" ? (
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              ) : (
                <div className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-200" />
              )}
              <span
                className={`text-sm ${
                  status === "passed"
                    ? "font-medium text-emerald-700"
                    : status === "in_progress"
                      ? "font-medium text-amber-700"
                      : "text-gray-400"
                }`}
              >
                {phase.label}
              </span>
              {data?.photoCount > 0 && (
                <span className="text-xs text-gray-400">
                  {data.photoCount} photos
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule Card ────────────────────────────────────────────────────────────

function ScheduleCard({ schedule, onConfirmed }) {
  const [selecting, setSelecting] = useState(false);

  const handleSelectSlot = async () => {
    setSelecting(true);
    try {
      await confirmSchedule(schedule.id, "customer");
      onConfirmed();
    } catch (err) {
      console.error("Confirm failed:", err);
    } finally {
      setSelecting(false);
    }
  };

  const isActionable =
    schedule.status === "proposed" ||
    schedule.status === "installer_confirmed" ||
    schedule.status === "rescheduled";

  const showProgress =
    schedule.status === "both_confirmed" ||
    schedule.status === "in_progress" ||
    schedule.status === "completed";

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${STATUS_COLORS[schedule.status] || "border-gray-200"} bg-white`}
    >
      {/* Status header */}
      <div
        className={`px-6 py-3 ${STATUS_COLORS[schedule.status] || "bg-gray-100 text-gray-600"}`}
      >
        <p className="text-sm font-semibold">
          {STATUS_LABELS[schedule.status] || schedule.status}
        </p>
      </div>

      <div className="p-6">
        {/* Confirmed schedule details */}
        {schedule.date && !isActionable && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="font-medium">{formatDate(schedule.date)}</span>
            </div>
            {schedule.time_window && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-5 w-5 text-gray-400" />
                <span>
                  {schedule.time_window.start} - {schedule.time_window.end}
                </span>
              </div>
            )}
            {schedule.crew?.length > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-5 w-5 text-gray-400" />
                <span>{schedule.crew.length}-person crew</span>
              </div>
            )}
          </div>
        )}

        {/* Proposed slots for selection */}
        {isActionable && (
          <div className="mb-4">
            {schedule.status === "installer_confirmed" ? (
              <div>
                <p className="mb-3 text-sm text-gray-600">
                  Your installer has confirmed. Please confirm to finalize:
                </p>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="font-medium text-gray-900">
                    {formatDate(schedule.date)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {schedule.time_window?.start} - {schedule.time_window?.end}
                  </p>
                  <button
                    onClick={handleSelectSlot}
                    disabled={selecting}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {selecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirm Schedule
                  </button>
                </div>
              </div>
            ) : (
              <SlotSelector
                slots={schedule.proposed_slots}
                onSelect={handleSelectSlot}
                selecting={selecting}
              />
            )}
          </div>
        )}

        {/* Install progress */}
        {showProgress && schedule.projectId && (
          <ProgressTracker projectId={schedule.projectId} />
        )}

        {/* Notifications */}
        {schedule.customer_notifications?.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
              Updates
            </h4>
            <div className="space-y-1">
              {schedule.customer_notifications.slice(-3).map((notif, i) => (
                <p key={i} className="text-xs text-gray-500">
                  {notif.type?.replace(/_/g, " ")} —{" "}
                  {notif.sent_at?.split("T")[0]}
                  {notif.reason && ` (${notif.reason})`}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortalSchedule() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const result = await getCustomerSchedule(user.uid);
      setSchedules(result.schedules || []);
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Your Installation
          </h1>
          <p className="text-sm text-gray-500">
            Schedule and track your solar installation
          </p>
        </div>
        <button
          onClick={loadData}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Schedule list */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="py-16 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            No Installation Scheduled Yet
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Once your permit is approved, we'll propose installation dates that
            work for you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onConfirmed={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
