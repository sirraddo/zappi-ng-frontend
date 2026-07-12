/**
 * NotificationBell.jsx
 * In-app notification bell for Zappi NG
 * Place in: frontend/src/components/NotificationBell.jsx
 *
 * Three tabs:
 * - Transactions: local, device-only notifications stored in localStorage
 *   and updated after each payment (unchanged from before this file was
 *   split into tabs).
 * - General: app-wide announcements from the backend
 *   (GET /api/announcements), published by the admin via the in-app
 *   admin screen.
 * - Support: the current user's own support tickets and their status
 *   (GET /api/tickets/mine), created when they use Report Issue /
 *   Contact Support.
 *
 * Use: <NotificationBell /> — place in your home screen header.
 *
 * addNotification() is unchanged — still local-only, still called after
 * each payment. The remote tabs are fetched lazily (only once per tab,
 * only while the panel is open) so opening the bell never blocks on a
 * cold Render instance.
 */

import { useState, useEffect, useRef } from "react";
import "./NotificationBell.css";

const STORAGE_KEY = "zappi_notifications";
const API_URL = import.meta.env.VITE_API_URL || "https://zappi-ng-backend.onrender.com";

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

function authHdrs() {
  const token = localStorage.getItem("zappi_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
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

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Old tickets (created before the message thread existed) only have a
// single `message` + optional `reply` field. New tickets always populate
// `messages`. This normalizes either shape into one chronological list —
// mirrors the same helper in AdminScreen.jsx.
function ticketThread(t) {
  if (t.messages && t.messages.length > 0) return t.messages;
  const thread = [{ sender: "user", text: t.message, createdAt: t.createdAt }];
  if (t.reply) thread.push({ sender: "admin", text: t.reply, createdAt: t.resolvedAt || t.updatedAt || t.createdAt });
  return thread;
}

// Full conversation for one ticket — tapped open from the Support list.
// Lets the user keep replying instead of the thread being a dead end
// after the first message.
function TicketThreadView({ ticket, onBack, onUpdated }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  function send() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    fetch(`${API_URL}/api/tickets/${ticket._id}/messages`, {
      method: "POST",
      headers: authHdrs(),
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return;
        setDraft("");
        onUpdated(d.ticket);
      })
      .finally(() => setSending(false));
  }

  return (
    <div className="notif-thread">
      <div className="notif-thread-header">
        <button className="notif-thread-back" onClick={onBack}>← Back</button>
        <span className="notif-thread-subject">{ticket.subject}</span>
      </div>
      <div className="notif-thread-messages">
        {ticketThread(ticket).map((m, i) => (
          <div key={i} className={`notif-thread-bubble ${m.sender === "admin" ? "admin" : "user"}`}>
            <div>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="notif-thread-input">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Reply…"
          rows={2}
        />
        <button onClick={send} disabled={!draft.trim() || sending}>{sending ? "…" : "Send"}</button>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("transactions");
  const [announcements, setAnnouncements] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [announcementsUnread, setAnnouncementsUnread] = useState(0);
  const panelRef = useRef(null);

  function countUnreadAnnouncements(list) {
    const lastSeen = localStorage.getItem("zappi_announcements_seen_at");
    if (!lastSeen) return list.length; // never viewed General before — all count as new
    const lastSeenTime = new Date(lastSeen).getTime();
    return list.filter((a) => new Date(a.createdAt).getTime() > lastSeenTime).length;
  }

  function load() {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setNotifications(all);
  }

  useEffect(() => {
    load();
    window.addEventListener("zappi:notification", load);
    return () => window.removeEventListener("zappi:notification", load);
  }, []);

  // Fetch announcements on mount (not lazily) so the unread badge is visible
  // even before the panel is ever opened.
  useEffect(() => {
    fetch(`${API_URL}/api/announcements`, { headers: authHdrs() })
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((d) => {
        const list = d.announcements || [];
        setAnnouncements(list);
        setAnnouncementsUnread(countUnreadAnnouncements(list));
      })
      .catch(() => {});
  }, []);

  // Mark announcements as seen once the General tab is actually viewed
  useEffect(() => {
    if (open && tab === "general" && announcements.length > 0) {
      localStorage.setItem("zappi_announcements_seen_at", new Date().toISOString());
      setAnnouncementsUnread(0);
    }
  }, [open, tab]);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Fetch remote data lazily — only once per tab, only while the panel is open.
  // (Announcements are the exception — fetched on mount above, so the badge
  // works without opening the panel; this just still handles tickets.)
  useEffect(() => {
    if (!open) return;
    if (tab === "support" && tickets.length === 0) {
      setLoadingRemote(true);
      fetch(`${API_URL}/api/tickets/mine`, { headers: authHdrs() })
        .then((r) => (r.ok ? r.json() : { tickets: [] }))
        .then((d) => setTickets(d.tickets || []))
        .catch(() => {})
        .finally(() => setLoadingRemote(false));
    }
  }, [open, tab]);

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function clearAll() {
    localStorage.setItem(STORAGE_KEY, "[]");
    setNotifications([]);
    setOpen(false);
  }

  const unread = notifications.filter((n) => !n.read).length + announcementsUnread;

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
            {tab === "transactions" && notifications.length > 0 && (
              <button className="notif-clear" onClick={clearAll}>Clear</button>
            )}
          </div>

          <div className="notif-tabs">
            <button className={`notif-tab ${tab === "transactions" ? "active" : ""}`} onClick={() => setTab("transactions")}>Transactions</button>
            <button className={`notif-tab ${tab === "general" ? "active" : ""}`} onClick={() => setTab("general")}>General</button>
            <button className={`notif-tab ${tab === "support" ? "active" : ""}`} onClick={() => setTab("support")}>Support</button>
          </div>

          {tab === "transactions" && (
            notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">🔔</div>
                <div>No notifications yet</div>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map((n) => (
                  <div key={n.id} className={`notif-item ${n.read ? "read" : "unread"}`}>
                    <div className="notif-type-icon" style={{ background: TYPE_COLOR[n.type] }}>
                      {TYPE_ICON[n.type]}
                    </div>
                    <div className="notif-content">
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-body">{n.body}</div>
                      {n.txRef && <div className="notif-ref">Ref: {n.txRef}</div>}
                      <div className="notif-time">{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "general" && (
            loadingRemote ? (
              <div className="notif-empty"><div>Loading…</div></div>
            ) : announcements.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">📢</div>
                <div>No announcements right now</div>
              </div>
            ) : (
              <div className="notif-list">
                {announcements.map((a) => (
                  <div key={a._id} className="notif-item read">
                    <div className="notif-type-icon" style={{ background: "#CC4E00" }}>📢</div>
                    <div className="notif-content">
                      <div className="notif-title">{a.title}</div>
                      <div className="notif-body">{a.body}</div>
                      <div className="notif-time">{timeAgo(new Date(a.createdAt).getTime())}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "support" && (
            selectedTicket ? (
              <TicketThreadView
                ticket={selectedTicket}
                onBack={() => setSelectedTicket(null)}
                onUpdated={(updated) => {
                  setSelectedTicket(updated);
                  setTickets((ts) => ts.map((x) => (x._id === updated._id ? updated : x)));
                }}
              />
            ) : loadingRemote ? (
              <div className="notif-empty"><div>Loading…</div></div>
            ) : tickets.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">💬</div>
                <div>No support queries yet</div>
              </div>
            ) : (
              <div className="notif-list">
                {tickets.map((t) => (
                  <div key={t._id} className="notif-item read" onClick={() => setSelectedTicket(t)} style={{ cursor: "pointer" }}>
                    <div className="notif-type-icon" style={{ background: t.status === "solved" ? "#16a34a" : "#d97706" }}>
                      {t.status === "solved" ? "✓" : "⏳"}
                    </div>
                    <div className="notif-content">
                      <div className="notif-title">{t.subject}</div>
                      <div className="notif-body">{t.reply || (t.status === "solved" ? "Resolved" : "Open — we'll get back to you soon")}</div>
                      <div className="notif-time">{timeAgo(new Date(t.createdAt).getTime())}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
