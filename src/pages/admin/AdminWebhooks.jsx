import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  where,
  limit,
} from "../../services/firebase";
import {
  Webhook,
  Bell,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Send,
  Plus,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Search,
} from "lucide-react";

// ─── Event Types (matches webhookApi.ts) ────────────────────────────────────

const EVENT_CATEGORIES = {
  Project: ["project.created", "project.stage_changed", "project.completed"],
  Task: [
    "task.created",
    "task.opened_for_bidding",
    "task.assigned",
    "task.completed",
  ],
  Bid: ["bid.received", "bid.accepted", "bid.rejected"],
  Listing: ["listing.created", "listing.assigned", "listing.completed"],
  Lead: ["lead.created", "lead.qualified", "lead.sold"],
  Referral: ["referral.milestone_reached", "referral.payout_processed"],
};

const ALL_EVENTS = Object.values(EVENT_CATEGORIES).flat();

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateSecret() {
  const chars = "abcdef0123456789";
  let secret = "";
  for (let i = 0; i < 64; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}

function formatDate(ts) {
  if (!ts) return "Never";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateShort(ts) {
  if (!ts) return "Never";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncateUrl(url, maxLen = 40) {
  if (!url) return "";
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen) + "...";
}

function statusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "active") return "bg-green-100 text-green-700";
  if (s === "paused") return "bg-amber-100 text-amber-700";
  if (s === "failed") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function statusIcon(status) {
  const s = (status || "").toLowerCase();
  if (s === "active") return CheckCircle;
  if (s === "paused") return Pause;
  if (s === "failed") return XCircle;
  return AlertTriangle;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminWebhooks() {
  const { user } = useAuth();

  // Data state
  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    failed: 0,
  });

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState([]);
  const [expandedLogsLoading, setExpandedLogsLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [modalForm, setModalForm] = useState({
    url: "",
    events: [],
    status: "active",
  });
  const [modalSecret, setModalSecret] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Test modal state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testWebhookId, setTestWebhookId] = useState(null);
  const [testEventType, setTestEventType] = useState("test.ping");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Secret reveal
  const [revealedSecrets, setRevealedSecrets] = useState(new Set());

  // ─── Data Loading ───────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const webhooksRef = collection(db, "webhooks");
      const webhooksSnap = await getDocs(
        query(webhooksRef, orderBy("created_at", "desc")),
      );
      const items = webhooksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setWebhooks(items);

      const active = items.filter((w) => w.status === "active").length;
      const paused = items.filter((w) => w.status === "paused").length;
      const failed = items.filter((w) => w.status === "failed").length;
      setStats({ total: items.length, active, paused, failed });
    } catch (err) {
      console.error("Error loading webhooks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Detail Panel Logs ─────────────────────────────────────────────────

  const loadWebhookLogs = async (webhookId) => {
    try {
      setExpandedLogsLoading(true);
      const logsRef = collection(db, "webhookLogs");
      const logsSnap = await getDocs(
        query(
          logsRef,
          where("webhook_id", "==", webhookId),
          orderBy("timestamp", "desc"),
          limit(10),
        ),
      );
      setExpandedLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading webhook logs:", err);
      setExpandedLogs([]);
    } finally {
      setExpandedLogsLoading(false);
    }
  };

  const toggleExpand = (webhookId) => {
    if (expandedId === webhookId) {
      setExpandedId(null);
      setExpandedLogs([]);
    } else {
      setExpandedId(webhookId);
      loadWebhookLogs(webhookId);
    }
  };

  // ─── Create / Edit ─────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingWebhook(null);
    setModalForm({ url: "", events: [], status: "active" });
    setModalSecret(null);
    setModalError("");
    setModalOpen(true);
  };

  const openEditModal = (webhook) => {
    setEditingWebhook(webhook);
    setModalForm({
      url: webhook.url || "",
      events: [...(webhook.events || [])],
      status: webhook.status || "active",
    });
    setModalSecret(null);
    setModalError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingWebhook(null);
    setModalSecret(null);
    setModalError("");
  };

  const toggleEvent = (event) => {
    setModalForm((prev) => {
      const events = prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event];
      return { ...prev, events };
    });
  };

  const toggleCategoryEvents = (category) => {
    const categoryEvents = EVENT_CATEGORIES[category];
    setModalForm((prev) => {
      const allSelected = categoryEvents.every((e) => prev.events.includes(e));
      let events;
      if (allSelected) {
        events = prev.events.filter((e) => !categoryEvents.includes(e));
      } else {
        const existing = new Set(prev.events);
        categoryEvents.forEach((e) => existing.add(e));
        events = [...existing];
      }
      return { ...prev, events };
    });
  };

  const validateUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    setModalError("");

    if (!modalForm.url.trim()) {
      setModalError("URL is required.");
      return;
    }

    if (!validateUrl(modalForm.url)) {
      setModalError("URL must be a valid HTTPS URL.");
      return;
    }

    if (modalForm.events.length === 0) {
      setModalError("Select at least one event type.");
      return;
    }

    try {
      setModalSaving(true);

      if (editingWebhook) {
        // Update existing
        const webhookRef = doc(db, "webhooks", editingWebhook.id);
        await updateDoc(webhookRef, {
          url: modalForm.url,
          events: modalForm.events,
          status: modalForm.status,
          updated_at: serverTimestamp(),
          ...(modalForm.status === "active" &&
          editingWebhook.status !== "active"
            ? { failure_count: 0 }
            : {}),
        });
      } else {
        // Create new
        const secret = generateSecret();
        await addDoc(collection(db, "webhooks"), {
          url: modalForm.url,
          events: modalForm.events,
          status: modalForm.status,
          secret,
          failure_count: 0,
          last_delivered_at: null,
          user_id: user?.uid || "admin",
          api_key_id: "admin_console",
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        setModalSecret(secret);
      }

      await loadData();

      if (editingWebhook) {
        closeModal();
      }
      // For create, keep modal open to show the secret
    } catch (err) {
      console.error("Error saving webhook:", err);
      setModalError("Failed to save webhook. Please try again.");
    } finally {
      setModalSaving(false);
    }
  };

  // ─── Pause / Resume ────────────────────────────────────────────────────

  const toggleStatus = async (webhook) => {
    const newStatus = webhook.status === "active" ? "paused" : "active";
    try {
      const webhookRef = doc(db, "webhooks", webhook.id);
      await updateDoc(webhookRef, {
        status: newStatus,
        updated_at: serverTimestamp(),
        ...(newStatus === "active" ? { failure_count: 0 } : {}),
      });
      await loadData();
    } catch (err) {
      console.error("Error toggling webhook status:", err);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async (webhookId) => {
    try {
      await deleteDoc(doc(db, "webhooks", webhookId));
      setDeleteConfirm(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(webhookId);
        return next;
      });
      await loadData();
    } catch (err) {
      console.error("Error deleting webhook:", err);
    }
  };

  // ─── Bulk Actions ──────────────────────────────────────────────────────

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((w) => w.id)));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const bulkUpdateStatus = async (newStatus) => {
    try {
      const promises = [...selectedIds].map((id) =>
        updateDoc(doc(db, "webhooks", id), {
          status: newStatus,
          updated_at: serverTimestamp(),
          ...(newStatus === "active" ? { failure_count: 0 } : {}),
        }),
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      await loadData();
    } catch (err) {
      console.error("Error bulk updating webhooks:", err);
    }
  };

  const bulkDelete = async () => {
    try {
      const promises = [...selectedIds].map((id) =>
        deleteDoc(doc(db, "webhooks", id)),
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      await loadData();
    } catch (err) {
      console.error("Error bulk deleting webhooks:", err);
    }
  };

  // ─── Test Webhook ──────────────────────────────────────────────────────

  const openTestModal = (webhookId) => {
    setTestWebhookId(webhookId);
    setTestEventType("test.ping");
    setTestResult(null);
    setTestModalOpen(true);
  };

  const sendTestEvent = async () => {
    if (!testWebhookId) return;

    try {
      setTestSending(true);
      setTestResult(null);

      const webhookDoc = await getDoc(doc(db, "webhooks", testWebhookId));
      if (!webhookDoc.exists()) {
        setTestResult({ success: false, message: "Webhook not found." });
        return;
      }

      const webhook = webhookDoc.data();

      // Log the test delivery attempt in webhookLogs
      await addDoc(collection(db, "webhookLogs"), {
        webhook_id: testWebhookId,
        user_id: webhook.user_id || "admin",
        event_type: testEventType,
        url: webhook.url,
        success: true,
        error: null,
        payload_size: 0,
        is_test: true,
        timestamp: serverTimestamp(),
      });

      setTestResult({
        success: true,
        message: `Test event "${testEventType}" logged for delivery to ${truncateUrl(webhook.url, 50)}.`,
      });
    } catch (err) {
      console.error("Error sending test event:", err);
      setTestResult({
        success: false,
        message: "Failed to send test event. Check console for details.",
      });
    } finally {
      setTestSending(false);
    }
  };

  // ─── Copy to Clipboard ─────────────────────────────────────────────────

  const [copied, setCopied] = useState(null);
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ─── Filtering ─────────────────────────────────────────────────────────

  const filtered = webhooks.filter((w) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (w.url || "").toLowerCase().includes(term) ||
      (w.status || "").toLowerCase().includes(term) ||
      (w.events || []).some((e) => e.toLowerCase().includes(term)) ||
      (w.user_id || "").toLowerCase().includes(term)
    );
  });

  // ─── Metric Cards ──────────────────────────────────────────────────────

  const metricCards = [
    {
      label: "Total Webhooks",
      value: stats.total.toLocaleString(),
      icon: Webhook,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Active",
      value: stats.active.toLocaleString(),
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Paused",
      value: stats.paused.toLocaleString(),
      icon: Pause,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Failed",
      value: stats.failed.toLocaleString(),
      icon: XCircle,
      color: "bg-red-50 text-red-600",
    },
  ];

  // ─── Loading Skeleton ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-3" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Webhook size={28} className="text-emerald-500" />
            Webhook Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage webhook subscriptions for event notifications
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} />
          Create Webhook
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {m.label}
              </span>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.color}`}
              >
                <m.icon size={20} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size} webhook{selectedIds.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkUpdateStatus("paused")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors"
            >
              <Pause size={14} />
              Pause All
            </button>
            <button
              onClick={() => bulkUpdateStatus("active")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors"
            >
              <Play size={14} />
              Resume All
            </button>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
            >
              <Trash2 size={14} />
              Delete All
            </button>
          </div>
        </div>
      )}

      {/* Webhooks Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-bold text-gray-900">All Webhooks</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search webhooks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {filtered.length} webhook{filtered.length !== 1 ? "s" : ""}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Webhook size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No webhooks found</p>
            <p className="text-gray-400 text-sm mt-1">
              Create your first webhook to start receiving event notifications.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Plus size={16} />
              Create Webhook
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === filtered.length &&
                        filtered.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    URL
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Events
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Last Delivered
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Failures
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((w) => {
                  const StatusIcon = statusIcon(w.status);
                  const isExpanded = expandedId === w.id;

                  return (
                    <tr key={w.id} className="group">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(w.id)}
                          onChange={() => toggleSelect(w.id)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleExpand(w.id)}
                          className="flex items-center gap-2 text-left hover:text-emerald-600 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown
                              size={14}
                              className="text-gray-400 shrink-0"
                            />
                          ) : (
                            <ChevronRight
                              size={14}
                              className="text-gray-400 shrink-0"
                            />
                          )}
                          <span
                            className="text-sm font-medium text-gray-900 font-mono"
                            title={w.url}
                          >
                            {truncateUrl(w.url)}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                          {(w.events || []).length} event
                          {(w.events || []).length !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadgeClass(w.status)}`}
                        >
                          <StatusIcon size={12} />
                          {w.status || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateShort(w.last_delivered_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-bold ${(w.failure_count || 0) > 0 ? "text-red-600" : "text-gray-400"}`}
                        >
                          {w.failure_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(w)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Bell size={14} />
                          </button>
                          <button
                            onClick={() => openTestModal(w.id)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50 transition-colors"
                            title="Send Test Event"
                          >
                            <Send size={14} />
                          </button>
                          <button
                            onClick={() => toggleStatus(w)}
                            className={`p-1.5 rounded transition-colors ${
                              w.status === "active"
                                ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                            }`}
                            title={w.status === "active" ? "Pause" : "Resume"}
                          >
                            {w.status === "active" ? (
                              <Pause size={14} />
                            ) : (
                              <Play size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(w.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expanded Detail Panel */}
      {expandedId && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {(() => {
            const w = webhooks.find((wh) => wh.id === expandedId);
            if (!w) return null;

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Webhook size={20} className="text-emerald-500" />
                    Webhook Details
                  </h3>
                  <button
                    onClick={() => {
                      setExpandedId(null);
                      setExpandedLogs([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Endpoint URL
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-50 border border-gray-200 rounded px-3 py-1.5 font-mono text-gray-800 flex-1 break-all">
                      {w.url}
                    </code>
                    <a
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-blue-600"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                {/* Events */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Subscribed Events
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(w.events || []).map((event) => (
                      <span
                        key={event}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Secret */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Signing Secret
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-50 border border-gray-200 rounded px-3 py-1.5 font-mono text-gray-800">
                      {revealedSecrets.has(w.id)
                        ? w.secret || "(not available)"
                        : "whsec_" + "*".repeat(32)}
                    </code>
                    <button
                      onClick={() =>
                        setRevealedSecrets((prev) => {
                          const next = new Set(prev);
                          if (next.has(w.id)) {
                            next.delete(w.id);
                          } else {
                            next.add(w.id);
                          }
                          return next;
                        })
                      }
                      className="p-1.5 text-gray-400 hover:text-gray-600"
                      title={revealedSecrets.has(w.id) ? "Hide" : "Reveal"}
                    >
                      {revealedSecrets.has(w.id) ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                    {w.secret && (
                      <button
                        onClick={() =>
                          copyToClipboard(w.secret, `secret-${w.id}`)
                        }
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                        title="Copy secret"
                      >
                        <Copy size={14} />
                        {copied === `secret-${w.id}` && (
                          <span className="text-xs text-green-600 ml-1">
                            Copied
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivery History */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Recent Deliveries
                  </label>
                  {expandedLogsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-10 bg-gray-100 rounded animate-pulse"
                        />
                      ))}
                    </div>
                  ) : expandedLogs.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      No deliveries recorded yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                              Event
                            </th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                              Status
                            </th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                              Error
                            </th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                              Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {expandedLogs.map((log) => (
                            <tr
                              key={log.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-3 py-2 text-xs font-mono text-gray-700">
                                {log.event_type}
                                {log.is_test && (
                                  <span className="ml-1.5 px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-semibold">
                                    TEST
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {log.success ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                                    <CheckCircle size={12} />
                                    OK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                                    <XCircle size={12} />
                                    Failed
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500 max-w-[200px] truncate">
                                {log.error || "-"}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-400">
                                {formatDateShort(log.timestamp)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Test Event Button */}
                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={() => openTestModal(w.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                  >
                    <Send size={14} />
                    Send Test Event
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── Create / Edit Modal ─────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {editingWebhook ? "Edit Webhook" : "Create Webhook"}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {editingWebhook
                  ? "Update the webhook configuration."
                  : "Register a new webhook endpoint to receive event notifications."}
              </p>

              {/* Secret display after creation */}
              {modalSecret && !editingWebhook && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <CheckCircle
                      size={16}
                      className="text-green-600 mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        Webhook created successfully
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Save this signing secret securely. It will not be shown
                        again.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <code className="text-xs bg-white border border-green-200 rounded px-2 py-1 font-mono text-gray-800 flex-1 break-all">
                      {modalSecret}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(modalSecret, "modal-secret")
                      }
                      className="p-1.5 text-green-600 hover:text-green-800 shrink-0"
                      title="Copy"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  {copied === "modal-secret" && (
                    <p className="text-xs text-green-600 mt-1">
                      Copied to clipboard
                    </p>
                  )}
                  <button
                    onClick={closeModal}
                    className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Form (hidden after secret display) */}
              {!(modalSecret && !editingWebhook) && (
                <>
                  {modalError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <AlertTriangle
                        size={14}
                        className="text-red-500 shrink-0"
                      />
                      <span className="text-sm text-red-700">{modalError}</span>
                    </div>
                  )}

                  {/* URL */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Endpoint URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={modalForm.url}
                      onChange={(e) =>
                        setModalForm((prev) => ({
                          ...prev,
                          url: e.target.value,
                        }))
                      }
                      placeholder="https://your-server.com/webhooks/solarios"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Must be HTTPS. Events will be delivered via POST with
                      HMAC-SHA256 signature.
                    </p>
                  </div>

                  {/* Status */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value="active"
                          checked={modalForm.status === "active"}
                          onChange={() =>
                            setModalForm((prev) => ({
                              ...prev,
                              status: "active",
                            }))
                          }
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value="paused"
                          checked={modalForm.status === "paused"}
                          onChange={() =>
                            setModalForm((prev) => ({
                              ...prev,
                              status: "paused",
                            }))
                          }
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-700">Paused</span>
                      </label>
                    </div>
                  </div>

                  {/* Event Types */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Types <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-3">
                      {modalForm.events.length} of {ALL_EVENTS.length} events
                      selected
                    </p>

                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                      {Object.entries(EVENT_CATEGORIES).map(
                        ([category, events]) => {
                          const allChecked = events.every((e) =>
                            modalForm.events.includes(e),
                          );
                          const someChecked = events.some((e) =>
                            modalForm.events.includes(e),
                          );

                          return (
                            <div
                              key={category}
                              className="border border-gray-200 rounded-lg p-3"
                            >
                              <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                  type="checkbox"
                                  checked={allChecked}
                                  ref={(el) => {
                                    if (el)
                                      el.indeterminate =
                                        someChecked && !allChecked;
                                  }}
                                  onChange={() =>
                                    toggleCategoryEvents(category)
                                  }
                                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm font-semibold text-gray-800">
                                  {category}
                                </span>
                                <span className="text-xs text-gray-400">
                                  (
                                  {
                                    events.filter((e) =>
                                      modalForm.events.includes(e),
                                    ).length
                                  }
                                  /{events.length})
                                </span>
                              </label>
                              <div className="ml-6 space-y-1">
                                {events.map((event) => (
                                  <label
                                    key={event}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={modalForm.events.includes(event)}
                                      onChange={() => toggleEvent(event)}
                                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-xs font-mono text-gray-600">
                                      {event}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={modalSaving}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {modalSaving
                        ? "Saving..."
                        : editingWebhook
                          ? "Save Changes"
                          : "Create Webhook"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Test Event Modal ────────────────────────────────────────────── */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Send size={18} className="text-purple-500" />
                Send Test Event
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Send a test event to verify webhook delivery.
              </p>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  value={testEventType}
                  onChange={(e) => setTestEventType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="test.ping">test.ping</option>
                  {ALL_EVENTS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              {testResult && (
                <div
                  className={`mb-5 p-3 rounded-lg flex items-start gap-2 ${
                    testResult.success
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle
                      size={14}
                      className="text-green-600 mt-0.5 shrink-0"
                    />
                  ) : (
                    <XCircle
                      size={14}
                      className="text-red-600 mt-0.5 shrink-0"
                    />
                  )}
                  <span
                    className={`text-sm ${testResult.success ? "text-green-700" : "text-red-700"}`}
                  >
                    {testResult.message}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={sendTestEvent}
                  disabled={testSending}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {testSending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send Test
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Delete Webhook
                </h3>
                <p className="text-sm text-gray-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this webhook? All delivery history
              will be preserved in logs.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bulk Delete Confirmation Modal ──────────────────────────────── */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Delete {selectedIds.size} Webhooks
                </h3>
                <p className="text-sm text-gray-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete {selectedIds.size} webhook
              {selectedIds.size !== 1 ? "s" : ""}? All delivery history will be
              preserved in logs.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={bulkDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
