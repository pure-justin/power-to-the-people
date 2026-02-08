import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { updateUserProfile, getUserProfile } from "../../services/firebase";
import {
  User,
  Mail,
  Phone,
  Save,
  Loader2,
  CheckCircle2,
  Plug,
  Bell,
  MessageSquare,
} from "lucide-react";

export default function PortalSettings() {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    phone: "",
    esiid: "",
  });
  const [notifications, setNotifications] = useState({
    sms: true,
    email: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const p = await getUserProfile(user.uid);
        setForm({
          displayName: p?.displayName || user.displayName || "",
          email: p?.email || user.email || "",
          phone: p?.phone || "",
          esiid: p?.esiid || "",
        });
        setNotifications({
          sms: p?.notifications?.sms !== false,
          email: p?.notifications?.email !== false,
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
        setForm({
          displayName: user.displayName || "",
          email: user.email || "",
          phone: "",
          esiid: "",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateUserProfile(user.uid, {
        displayName: form.displayName,
        phone: form.phone,
        esiid: form.esiid,
        notifications,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-32 rounded bg-gray-200" />
        <div className="space-y-4 rounded-xl bg-gray-100 p-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your profile and preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Profile Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, displayName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Your full name"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Email cannot be changed here
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SMT Linking */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Plug className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Smart Meter Texas
              </h2>
              <p className="text-sm text-gray-500">
                Link your ESIID for real-time usage data
              </p>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              ESIID Number
            </label>
            <input
              type="text"
              value={form.esiid}
              onChange={(e) =>
                setForm((f) => ({ ...f, esiid: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 py-2.5 px-4 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Enter your 17-22 digit ESIID"
            />
            <p className="mt-1 text-xs text-gray-400">
              Found on your electricity bill or at smartmetertexas.com
            </p>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Notification Preferences
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    SMS Notifications
                  </p>
                  <p className="text-xs text-gray-500">
                    Project updates via text message
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.sms}
                onChange={(e) =>
                  setNotifications((n) => ({ ...n, sms: e.target.checked }))
                }
                className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Email Notifications
                  </p>
                  <p className="text-xs text-gray-500">
                    Invoice and milestone updates via email
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) =>
                  setNotifications((n) => ({ ...n, email: e.target.checked }))
                }
                className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Changes saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
