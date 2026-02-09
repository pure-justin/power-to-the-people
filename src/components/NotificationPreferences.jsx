import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db, doc, getDoc, setDoc } from "../services/firebase";
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Smartphone,
  MapPin,
  Save,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Gavel,
  FileText,
  ShieldAlert,
  Zap,
} from "lucide-react";

const NOTIFICATION_TYPES = [
  {
    id: "new_listings",
    label: "New listings in my area",
    description:
      "Get notified when a new job listing matches your skills and service area",
    icon: FileText,
  },
  {
    id: "bid_accepted",
    label: "Bid accepted",
    description: "When a listing owner accepts your bid",
    icon: CheckCircle2,
  },
  {
    id: "bid_rejected",
    label: "Bid rejected",
    description: "When a listing owner rejects your bid",
    icon: AlertCircle,
  },
  {
    id: "sla_warning",
    label: "SLA warning",
    description: "Warnings about approaching deadlines or performance issues",
    icon: ShieldAlert,
  },
  {
    id: "new_bid_on_listing",
    label: "New bid on my listing",
    description: "When someone submits a bid on a job you posted",
    icon: Gavel,
  },
];

const CHANNELS = [
  { id: "sms", label: "SMS", icon: Smartphone },
  { id: "email", label: "Email", icon: Mail },
  { id: "in_app", label: "In-App", icon: Bell },
];

/**
 * NotificationPreferences -- Manage notification settings.
 *
 * Saves to Firestore: users/{uid}/preferences/notifications
 *
 * Props:
 *   onSaved   - callback after successful save (optional)
 *   compact   - boolean, if true renders in a more compact form
 */
export default function NotificationPreferences({ onSaved, compact = false }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Notification toggles
  const [toggles, setToggles] = useState({
    new_listings: true,
    bid_accepted: true,
    bid_rejected: true,
    sla_warning: true,
    new_bid_on_listing: true,
  });

  // Channels
  const [channels, setChannels] = useState({
    sms: true,
    email: true,
    in_app: true,
  });

  // Quiet hours
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");

  // Service area alert radius
  const [alertRadius, setAlertRadius] = useState(50);

  // Load preferences from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const load = async () => {
      setLoading(true);
      try {
        const prefDoc = await getDoc(
          doc(db, "users", user.uid, "preferences", "notifications"),
        );
        if (prefDoc.exists()) {
          const data = prefDoc.data();
          if (data.toggles)
            setToggles((prev) => ({ ...prev, ...data.toggles }));
          if (data.channels)
            setChannels((prev) => ({ ...prev, ...data.channels }));
          if (data.quiet_hours != null) {
            setQuietHoursEnabled(data.quiet_hours.enabled ?? false);
            setQuietStart(data.quiet_hours.start || "22:00");
            setQuietEnd(data.quiet_hours.end || "08:00");
          }
          if (data.alert_radius != null) setAlertRadius(data.alert_radius);
        }
      } catch (err) {
        console.error("Failed to load notification preferences:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await setDoc(
        doc(db, "users", user.uid, "preferences", "notifications"),
        {
          toggles,
          channels,
          quiet_hours: {
            enabled: quietHoursEnabled,
            start: quietStart,
            end: quietEnd,
          },
          alert_radius: alertRadius,
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
      setSaved(true);
      onSaved?.();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save notification preferences:", err);
      setError("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleNotification = (id) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleChannel = (id) => {
    setChannels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">
          Loading preferences...
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${compact ? "text-sm" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-500" />
          <h3
            className={`font-semibold text-gray-900 ${compact ? "text-sm" : "text-lg"}`}
          >
            Notification Preferences
          </h3>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Notification Types */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase text-gray-500">
          Notification Types
        </h4>
        <div className="space-y-2">
          {NOTIFICATION_TYPES.map((notif) => {
            const Icon = notif.icon;
            const enabled = toggles[notif.id] ?? true;
            return (
              <div
                key={notif.id}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                  enabled
                    ? "border-gray-200 bg-white"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${enabled ? "text-emerald-500" : "text-gray-300"}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${enabled ? "text-gray-900" : "text-gray-400"}`}
                    >
                      {notif.label}
                    </p>
                    {!compact && (
                      <p className="text-xs text-gray-400">
                        {notif.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleNotification(notif.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    enabled ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preferred Channels */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase text-gray-500">
          Notification Channels
        </h4>
        <div className="flex flex-wrap gap-3">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const enabled = channels[channel.id] ?? true;
            return (
              <button
                key={channel.id}
                onClick={() => toggleChannel(channel.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  enabled
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {channel.label}
                {enabled && <CheckCircle2 className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quiet Hours */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase text-gray-500">
          Quiet Hours
        </h4>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellOff
                className={`h-4 w-4 ${quietHoursEnabled ? "text-emerald-500" : "text-gray-300"}`}
              />
              <span className="text-sm font-medium text-gray-900">
                Enable Quiet Hours
              </span>
            </div>
            <button
              onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                quietHoursEnabled ? "bg-emerald-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                  quietHoursEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {quietHoursEnabled && (
            <div className="mt-3 flex items-center gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">From</label>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
              <span className="mt-5 text-gray-400">to</span>
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Until
                </label>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Service Area Alert Radius */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase text-gray-500">
          Service Area Alert Radius
        </h4>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">
                  Alert me about listings within
                </span>
                <span className="text-sm font-semibold text-emerald-600">
                  {alertRadius} miles
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={150}
                step={5}
                value={alertRadius}
                onChange={(e) => setAlertRadius(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>5 mi</span>
                <span>75 mi</span>
                <span>150 mi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
        {saved && (
          <span className="text-sm text-emerald-600">Preferences saved!</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Preferences
        </button>
      </div>
    </div>
  );
}
