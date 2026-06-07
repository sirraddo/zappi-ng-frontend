/**
 * NotificationBell.jsx
 * In-app notification bell for Zappi NG
 * Place in: frontend/src/components/NotificationBell.jsx
 *
 * Usage: <NotificationBell /> — place in your home screen header
 *
 * Notifications are stored in localStorage and updated after each payment.
 * Use addNotification() utility to push new notifications from payment flows.
 */

import { useState, useEffect, useRef } from "react";
import "./NotificationBell.css";

const STORAGE_KEY = "zappi_notifications";

export function addNotification({ title, body, type = "info", txRef = null }) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const notif = {
    id: Date.now(),
    title,
    body,
    type, // 'success' | 'failed' | 'pending' | 'info'
    txRef,
    read: false,
    createdAt: Date.now(),
  };
  const updated = [notif, ...all].slice(0, 50); // keep last 50
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  // Dispatch event so the bell reacts in real time
  window.dispatchEvent(new CustomEvent("zappi:notification", { detail: notif }));
}

const TYPE_ICON = {
  success: "✓",
  failed: "✕",
  pending: "⏳",
  info: "ℹ",
};

const TYPE_COLOR = {
  success: "#16a34a",
  failed: "#dc2626",
  pending: "#d97706",
  info: "#2563eb",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  function load() {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setNotifications(all);
  }

  useEffect(() => {
    load();
    window.addEventListener("zappi:notification", load);
    return () => window.removeEventListener("zappi:notification", load);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNotifications(updated);
  }

  function clearAll() {
    localStorage.setItem(STORAGE_KEY, "[]");
    setNotifications([]);
    setOpen(false);
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button
        className="notif-bell"
        onClick={() => { setOpen((o) => !o); if (!open) markAllRead(); }}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            {notifications.length > 0 && (
              <button className="notif-clear" onClick={clearAll}>Clear all</button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-icon">🔔</div>
              <div>No notifications yet</div>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map((n) => (
                <div key={n.id} className={`notif-item ${n.read ? "read" : "unread"}`}>
                  <div
                    className="notif-type-icon"
                    style={{ background: TYPE_COLOR[n.type] }}
                  >
                    {TYPE_ICON[n.type]}
                  </div>
                  <div className="notif-content">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-body">{n.body}</div>
                    {n.txRef && (
                      <div className="notif-ref">Ref: {n.txRef}</div>
                    )}
                    <div className="notif-time">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
