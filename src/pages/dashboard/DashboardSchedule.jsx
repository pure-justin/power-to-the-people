/**
 * DashboardSchedule -- Installer schedule management
 *
 * Calendar view of upcoming installs with availability management.
 * Week/month toggle, install cards with status, crew, and project details.
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getAvailability,
  setAvailability,
  getUpcomingInstalls,
  confirmSchedule,
  reschedule,
} from "../../services/schedulingService";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarDays,
  CalendarRange,
  Wrench,
  RefreshCw,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getWeekDates(referenceDate) {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

function getMonthDates(referenceDate) {
  const d = new Date(referenceDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const dates = [];
  // Add empty padding for days before the 1st so the grid aligns with day-of-week headers
  const startDay = first.getDay(); // 0=Sun, 1=Mon, etc.
  for (let i = 0; i < startDay; i++) {
    dates.push(null);
  }
  for (let i = first.getDate(); i <= last.getDate(); i++) {
    dates.push(new Date(year, month, i).toISOString().split("T")[0]);
  }
  return dates;
}

const STATUS_COLORS = {
  proposed: "bg-amber-100 text-amber-700",
  customer_confirmed: "bg-blue-100 text-blue-700",
  installer_confirmed: "bg-blue-100 text-blue-700",
  both_confirmed: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-gray-100 text-gray-600",
  rescheduled: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  proposed: "Proposed",
  customer_confirmed: "Customer Confirmed",
  installer_confirmed: "You Confirmed",
  both_confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
};

// ─── Set Availability Modal ───────────────────────────────────────────────────

function AvailabilityModal({ date, onClose, onSaved, installerId }) {
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [crewSize, setCrewSize] = useState("3");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await setAvailability(
        installerId,
        date,
        [{ start: startTime, end: endTime }],
        parseInt(crewSize, 10),
      );
      onSaved();
    } catch (err) {
      setError(err.message || "Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Set Availability — {formatDate(date)}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Crew Size
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={crewSize}
              onChange={(e) => setCrewSize(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save Availability
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Install Card ─────────────────────────────────────────────────────────────

function InstallCard({ install, onConfirm, confirming }) {
  return (
    <div className="card border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[install.status] || "bg-gray-100 text-gray-600"}`}
            >
              {STATUS_LABELS[install.status] || install.status}
            </span>
            <span className="text-xs text-gray-400">
              {install.projectId?.slice(0, 8)}...
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {formatDate(install.date)}
            </span>
            {install.time_window && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {install.time_window.start} - {install.time_window.end}
              </span>
            )}
            {install.crew?.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-gray-400" />
                {install.crew.length} crew
              </span>
            )}
          </div>

          {install.equipment_checklist?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {install.equipment_checklist.slice(0, 4).map((item, i) => (
                <span
                  key={i}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {item.item}
                </span>
              ))}
            </div>
          )}
        </div>

        {install.status === "proposed" && (
          <button
            onClick={() => onConfirm(install.id)}
            disabled={confirming === install.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {confirming === install.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Confirm
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardSchedule() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState("week"); // "week" | "month"
  const [referenceDate, setReferenceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [installs, setInstalls] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);
  const [availabilityDate, setAvailabilityDate] = useState(null);

  const dates =
    viewMode === "week"
      ? getWeekDates(referenceDate)
      : getMonthDates(referenceDate);

  // Find first and last actual date (skip null padding in month view)
  const startDate = dates.find((d) => d !== null);
  const endDate = dates[dates.length - 1];

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [installResult, slotResult] = await Promise.all([
        getUpcomingInstalls(user.uid, 50),
        getAvailability(user.uid, startDate, endDate),
      ]);
      setInstalls(installResult.installs || []);
      setSlots(slotResult.slots || []);
    } catch (err) {
      console.error("Failed to load schedule data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirm = async (scheduleId) => {
    setConfirming(scheduleId);
    try {
      await confirmSchedule(scheduleId, "installer");
      await loadData();
    } catch (err) {
      console.error("Failed to confirm:", err);
    } finally {
      setConfirming(null);
    }
  };

  const navigateDate = (direction) => {
    const d = new Date(referenceDate);
    if (viewMode === "week") {
      d.setDate(d.getDate() + direction * 7);
    } else {
      d.setMonth(d.getMonth() + direction);
    }
    setReferenceDate(d.toISOString().split("T")[0]);
  };

  // Map installs by date for calendar view
  const installsByDate = {};
  installs.forEach((inst) => {
    if (!installsByDate[inst.date]) installsByDate[inst.date] = [];
    installsByDate[inst.date].push(inst);
  });

  // Map availability by date
  const slotsByDate = {};
  slots.forEach((slot) => {
    slotsByDate[slot.date] = slot;
  });

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Install Schedule</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* View toggle + navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate(-1)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[160px] text-center text-sm font-medium text-gray-700">
            {formatDate(startDate)} — {formatDate(endDate)}
          </span>
          <button
            onClick={() => navigateDate(1)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setViewMode("week")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "week"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Week
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "month"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <CalendarRange className="h-4 w-4" />
            Month
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <div
          className={`grid gap-2 ${viewMode === "week" ? "grid-cols-7" : "grid-cols-7"}`}
        >
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold uppercase text-gray-400"
            >
              {day}
            </div>
          ))}

          {/* Date cells */}
          {dates.map((date, idx) => {
            // null entries are padding for month view alignment
            if (date === null) {
              return (
                <div
                  key={`pad-${idx}`}
                  className="min-h-[100px] rounded-lg border border-transparent bg-transparent"
                />
              );
            }

            const dayInstalls = installsByDate[date] || [];
            const daySlot = slotsByDate[date];
            const isToday = date === today;
            const isPast = date < today;

            return (
              <div
                key={date}
                className={`min-h-[100px] rounded-lg border p-2 ${
                  isToday
                    ? "border-emerald-300 bg-emerald-50"
                    : isPast
                      ? "border-gray-100 bg-gray-50"
                      : "border-gray-200 bg-white"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${isToday ? "text-emerald-700" : "text-gray-500"}`}
                  >
                    {new Date(date + "T00:00:00").getDate()}
                  </span>
                  {!isPast && (
                    <button
                      onClick={() => setAvailabilityDate(date)}
                      className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                      title="Set availability"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Availability indicator */}
                {daySlot && (
                  <div className="mb-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                    <Users className="mr-0.5 inline h-2.5 w-2.5" />
                    Crew: {daySlot.crew_size}
                  </div>
                )}

                {/* Install cards */}
                {dayInstalls.map((inst) => (
                  <div
                    key={inst.id}
                    className={`mb-1 rounded px-1.5 py-0.5 text-[10px] ${STATUS_COLORS[inst.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    <Wrench className="mr-0.5 inline h-2.5 w-2.5" />
                    {inst.time_window?.start || "TBD"}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming Installs List */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Upcoming Installs
        </h2>
        {installs.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              No upcoming installs scheduled
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {installs.map((install) => (
              <InstallCard
                key={install.id}
                install={install}
                onConfirm={handleConfirm}
                confirming={confirming}
              />
            ))}
          </div>
        )}
      </div>

      {/* Availability Modal */}
      {availabilityDate && (
        <AvailabilityModal
          date={availabilityDate}
          installerId={user?.uid}
          onClose={() => setAvailabilityDate(null)}
          onSaved={() => {
            setAvailabilityDate(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
