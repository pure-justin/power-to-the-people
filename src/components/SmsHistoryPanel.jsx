import { useState, useEffect } from "react";
import {
  MessageSquare,
  Bell,
  BellOff,
  Check,
  X,
  Loader2,
  Clock,
} from "lucide-react";
import {
  getProjectSmsHistory,
  updateSmsPreferences,
} from "../services/smsService";

export default function SmsHistoryPanel({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (projectId) {
      loadHistory();
    }
  }, [projectId]);

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProjectSmsHistory(projectId);
      setMessages(data.messages || []);
      setSmsOptIn(data.smsOptIn);
    } catch (err) {
      console.error("Error loading SMS history:", err);
      setError("Unable to load notification history");
    } finally {
      setLoading(false);
    }
  };

  const toggleOptIn = async () => {
    setUpdating(true);
    try {
      const result = await updateSmsPreferences(projectId, !smsOptIn);
      setSmsOptIn(result.smsOptIn);
    } catch (err) {
      console.error("Error updating preferences:", err);
      setError("Failed to update notification preferences");
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (msg) => {
    if (msg.error) return <X className="w-4 h-4 text-red-500" />;
    if (msg.deliveryStatus === "delivered")
      return <Check className="w-4 h-4 text-green-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: "#94a3b8",
        }}
      >
        <Loader2
          className="w-6 h-6 animate-spin"
          style={{ margin: "0 auto 8px" }}
        />
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.6)",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.1)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MessageSquare className="w-5 h-5" style={{ color: "#3b82f6" }} />
          <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 15 }}>
            SMS Notifications
          </span>
        </div>

        <button
          onClick={toggleOptIn}
          disabled={updating}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid",
            borderColor: smsOptIn
              ? "rgba(34, 197, 94, 0.3)"
              : "rgba(239, 68, 68, 0.3)",
            background: smsOptIn
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: smsOptIn ? "#22c55e" : "#ef4444",
            fontSize: 13,
            fontWeight: 500,
            cursor: updating ? "not-allowed" : "pointer",
            opacity: updating ? 0.6 : 1,
          }}
        >
          {updating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : smsOptIn ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
          {smsOptIn ? "Notifications On" : "Notifications Off"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 20px",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#fca5a5",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Message List */}
      {messages.length === 0 ? (
        <div
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "#64748b",
            fontSize: 14,
          }}
        >
          <MessageSquare
            className="w-8 h-8"
            style={{ margin: "0 auto 8px", opacity: 0.4 }}
          />
          <p>No SMS notifications sent yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>
            You'll receive updates about your solar project here
          </p>
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid rgba(148, 163, 184, 0.06)",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div style={{ marginTop: 2 }}>{getStatusIcon(msg)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    color: "#cbd5e1",
                    fontSize: 13,
                    lineHeight: 1.5,
                    margin: 0,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.message}
                </p>
                <p
                  style={{
                    color: "#475569",
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {formatDate(msg.sentAt)}
                  {msg.deliveryStatus && (
                    <span style={{ marginLeft: 8 }}>{msg.deliveryStatus}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: "10px 20px",
          borderTop: "1px solid rgba(148, 163, 184, 0.06)",
          fontSize: 11,
          color: "#475569",
          textAlign: "center",
        }}
      >
        Reply STOP to any message to unsubscribe. Msg & data rates may apply.
      </div>
    </div>
  );
}
