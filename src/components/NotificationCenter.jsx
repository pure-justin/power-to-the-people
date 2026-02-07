import { useState, useEffect, useRef } from "react";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  Calendar,
  Gift,
  DollarSign,
  Sun,
  Info,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import {
  subscribeToNotifications,
  subscribeToUserNotifications,
  markAsRead,
  markAllAsRead,
  NOTIFICATION_TYPES,
} from "../services/notificationService";

const ICON_MAP = {
  "check-circle": Check,
  info: Info,
  "badge-check": CheckCheck,
  calendar: Calendar,
  sun: Sun,
  gift: Gift,
  "dollar-sign": DollarSign,
};

function getNotificationIcon(type) {
  const config = NOTIFICATION_TYPES[type];
  const IconComponent = ICON_MAP[config?.icon] || MessageSquare;
  return { Icon: IconComponent, color: config?.color || "#6b7280" };
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * NotificationCenter - Bell icon with dropdown notification list
 *
 * Props:
 * - projectId: Subscribe to project notifications
 * - userId: Subscribe to user notifications
 * - onNotification: Callback when new notification arrives (for toast)
 * - darkMode: Use dark theme (default true)
 */
export default function NotificationCenter({
  projectId,
  userId,
  onNotification,
  darkMode = true,
}) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!projectId && !userId) return;

    const callback = (newNotifications) => {
      setNotifications((prev) => {
        // Detect truly new notifications for toast
        if (prev.length > 0 && newNotifications.length > prev.length) {
          const newOnes = newNotifications.filter(
            (n) => !prev.find((p) => p.id === n.id),
          );
          newOnes.forEach((n) => onNotification?.(n));
        }
        return newNotifications;
      });
    };

    const unsubscribe = projectId
      ? subscribeToNotifications(projectId, callback)
      : subscribeToUserNotifications(userId, callback);

    return () => unsubscribe();
  }, [projectId, userId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        bellRef.current &&
        !bellRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!projectId) return;
    try {
      await markAllAsRead(projectId);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const bg = darkMode ? "rgba(15, 23, 42, 0.95)" : "#ffffff";
  const textPrimary = darkMode ? "#e2e8f0" : "#1e293b";
  const textSecondary = darkMode ? "#94a3b8" : "#64748b";
  const border = darkMode ? "rgba(148, 163, 184, 0.15)" : "rgba(0, 0, 0, 0.1)";
  const hoverBg = darkMode ? "rgba(148, 163, 184, 0.08)" : "#f8fafc";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 8,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
        }}
        onMouseOver={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
        }
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
      >
        <Bell
          className="w-5 h-5"
          style={{ color: darkMode ? "#e2e8f0" : "#374151" }}
        />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: unreadCount > 9 ? 20 : 16,
              height: 16,
              borderRadius: 8,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              boxShadow: "0 0 8px rgba(239, 68, 68, 0.5)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxHeight: 480,
            background: bg,
            borderRadius: 12,
            border: `1px solid ${border}`,
            boxShadow: darkMode
              ? "0 20px 60px rgba(0,0,0,0.6)"
              : "0 20px 60px rgba(0,0,0,0.15)",
            zIndex: 1000,
            overflow: "hidden",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${border}`,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 15, color: textPrimary }}>
              Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#ef4444",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#3b82f6",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: 6,
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: textSecondary,
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 6,
                  display: "flex",
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: textSecondary,
                }}
              >
                <BellOff
                  className="w-10 h-10"
                  style={{ margin: "0 auto 12px", opacity: 0.3 }}
                />
                <p style={{ fontSize: 14, fontWeight: 500 }}>
                  No notifications yet
                </p>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  You'll see updates about your solar project here
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const { Icon, color } = getNotificationIcon(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      borderBottom: `1px solid ${border}`,
                      cursor: notif.read ? "default" : "pointer",
                      background: notif.read ? "transparent" : hoverBg,
                      transition: "background 0.2s",
                    }}
                    onMouseOver={(e) => {
                      if (!notif.read)
                        e.currentTarget.style.background = darkMode
                          ? "rgba(148, 163, 184, 0.12)"
                          : "#f1f5f9";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = notif.read
                        ? "transparent"
                        : hoverBg;
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${color}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: notif.read ? 500 : 600,
                            color: textPrimary,
                          }}
                        >
                          {notif.title}
                        </span>
                        <span style={{ fontSize: 11, color: textSecondary }}>
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: textSecondary,
                          lineHeight: 1.4,
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {notif.message}
                      </p>
                      {notif.link && (
                        <a
                          href={notif.link}
                          style={{
                            fontSize: 11,
                            color: "#3b82f6",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          View details <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {!notif.read && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: "#3b82f6",
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
