import { useState, useEffect } from "react";
import {
  Check,
  CheckCheck,
  Calendar,
  Gift,
  DollarSign,
  Sun,
  Info,
  MessageSquare,
  X,
} from "lucide-react";
import { NOTIFICATION_TYPES } from "../services/notificationService";

const ICON_MAP = {
  "check-circle": Check,
  info: Info,
  "badge-check": CheckCheck,
  calendar: Calendar,
  sun: Sun,
  gift: Gift,
  "dollar-sign": DollarSign,
};

/**
 * NotificationToast - Displays a temporary toast when new notifications arrive
 *
 * Props:
 * - notification: The notification object to display
 * - onDismiss: Called when toast is dismissed
 * - duration: Auto-dismiss after ms (default 5000)
 */
export default function NotificationToast({
  notification,
  onDismiss,
  duration = 5000,
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!notification) return;

    // Animate in
    requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss
    const timer = setTimeout(() => dismiss(), duration);
    return () => clearTimeout(timer);
  }, [notification]);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onDismiss?.();
    }, 300);
  };

  if (!notification) return null;

  const config =
    NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.info;
  const Icon = ICON_MAP[config.icon] || MessageSquare;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 10000,
        transform: visible && !exiting ? "translateX(0)" : "translateX(120%)",
        opacity: visible && !exiting ? 1 : 0,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: 12,
          border: "1px solid rgba(148, 163, 184, 0.15)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          padding: "14px 16px",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          maxWidth: 360,
          minWidth: 280,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${config.color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#e2e8f0",
              marginBottom: 2,
            }}
          >
            {notification.title}
          </div>
          <p
            style={{
              fontSize: 12,
              color: "#94a3b8",
              lineHeight: 1.4,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {notification.message}
          </p>
        </div>
        <button
          onClick={dismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            padding: 4,
            borderRadius: 6,
            display: "flex",
            flexShrink: 0,
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * NotificationToastContainer - Manages a queue of toast notifications
 *
 * Usage:
 * const [toastQueue, setToastQueue] = useState([]);
 * <NotificationToastContainer
 *   notifications={toastQueue}
 *   onDismiss={(id) => setToastQueue(q => q.filter(n => n.id !== id))}
 * />
 */
export function NotificationToastContainer({ notifications = [], onDismiss }) {
  if (notifications.length === 0) return null;

  // Show only the most recent toast
  const latest = notifications[notifications.length - 1];

  return (
    <NotificationToast
      key={latest.id}
      notification={latest}
      onDismiss={() => onDismiss?.(latest.id)}
    />
  );
}
