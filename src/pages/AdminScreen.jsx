/**
 * AdminScreen.jsx — Zappi NG
 *
 * Admin-only screen for publishing general announcements and resolving
 * support tickets. isAdminUser() is a CLIENT-SIDE VISIBILITY check only —
 * it decides whether to show the entry point in the UI, nothing more.
 * The actual enforcement is entirely server-side via requireAdmin
 * middleware (see backend routes/announcements.js, routes/tickets.js).
 * Someone bypassing this check client-side still can't call any admin
 * endpoint without genuinely being the admin account.
 *
 * Place in: frontend/src/pages/AdminScreen.jsx
 * Usage: import AdminScreen, { isAdminUser } from "./pages/AdminScreen.jsx"
 */

import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://zappi-ng-backend.onrender.com";

function authHdrs() {
  const token = localStorage.getItem("zappi_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export function isAdminUser() {
  try {
    const token = localStorage.getItem("zappi_token");
    if (!token) return false;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.username === "Sirraddo";
  } catch {
    return false;
  }
}

export default function AdminScreen({ onBack, showToast = () => {} }) {
  const [tab, setTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  function loadAnnouncements() {
    setLoading(true);
    fetch(`${API_URL}/api/announcements/all`, { headers: authHdrs() })
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.announcements || []))
      .catch(() => showToast("Could not load announcements", "danger"))
      .finally(() => setLoading(false));
  }

  function loadTickets() {
    setLoading(true);
    fetch(`${API_URL}/api/tickets`, { headers: authHdrs() })
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets || []))
      .catch(() => showToast("Could not load tickets", "danger"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (tab === "announcements") loadAnnouncements();
    else loadTickets();
  }, [tab]);

  function createAnnouncement() {
    if (!newTitle.trim() || !newBody.trim()) {
      showToast("Title and message are required", "danger");
      return;
    }
    fetch(`${API_URL}/api/announcements`, {
      method: "POST",
      headers: authHdrs(),
      body: JSON.stringify({ title: newTitle, body: newBody }),
    })
      .then((r) => r.json())
      .then(() => {
        setNewTitle("");
        setNewBody("");
        loadAnnouncements();
        showToast("Announcement published", "success");
      })
      .catch(() => showToast("Could not create announcement", "danger"));
  }

  function toggleAnnouncement(id, active) {
    fetch(`${API_URL}/api/announcements/${id}`, {
      method: "PATCH",
      headers: authHdrs(),
      body: JSON.stringify({ active: !active }),
    })
      .then((r) => r.json())
      .then(() => loadAnnouncements())
      .catch(() => showToast("Could not update announcement", "danger"));
  }

  function markTicketSolved(id, currentStatus) {
    const newStatus = currentStatus === "solved" ? "open" : "solved";
    fetch(`${API_URL}/api/tickets/${id}`, {
      method: "PATCH",
      headers: authHdrs(),
      body: JSON.stringify({ status: newStatus }),
    })
      .then((r) => r.json())
      .then(() => {
        loadTickets();
        showToast(newStatus === "solved" ? "Marked solved" : "Reopened", "success");
      })
      .catch(() => showToast("Could not update ticket", "danger"));
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18 }}>Admin</h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTab("announcements")}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
            background: tab === "announcements" ? "var(--primary-light)" : "var(--bg-secondary)",
            color: tab === "announcements" ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: 700, cursor: "pointer",
          }}
        >Announcements</button>
        <button
          onClick={() => setTab("tickets")}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
            background: tab === "tickets" ? "var(--primary-light)" : "var(--bg-secondary)",
            color: tab === "tickets" ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: 700, cursor: "pointer",
          }}
        >Support Tickets</button>
      </div>

      {tab === "announcements" && (
        <>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>New announcement</div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, boxSizing: "border-box" }}
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Message"
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, boxSizing: "border-box", fontFamily: "inherit" }}
            />
            <button
              onClick={createAnnouncement}
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}
            >Publish</button>
          </div>

          {loading ? (
            <div>Loading…</div>
          ) : announcements.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>No announcements yet</div>
          ) : (
            announcements.map((a) => (
              <div key={a._id} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10, opacity: a.active ? 1 : 0.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: a.active ? "#DCFCE7" : "#F3F4F6", color: a.active ? "#166534" : "#6B7280" }}>
                    {a.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", margin: "6px 0" }}>{a.body}</div>
                <button
                  onClick={() => toggleAnnouncement(a._id, a.active)}
                  style={{ fontSize: 12, background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                >{a.active ? "Hide" : "Reactivate"}</button>
              </div>
            ))
          )}
        </>
      )}

      {tab === "tickets" && (
        loading ? (
          <div>Loading…</div>
        ) : tickets.length === 0 ? (
          <div style={{ color: "var(--text-secondary)" }}>No support tickets yet</div>
        ) : (
          tickets.map((t) => (
            <div key={t._id} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.subject}</div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: t.status === "solved" ? "#DCFCE7" : "#FEF3C7", color: t.status === "solved" ? "#166534" : "#92400E" }}>
                  {t.status === "solved" ? "Solved" : "Open"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0" }}>@{t.username}</div>
              <div style={{ fontSize: 13, margin: "6px 0" }}>{t.message}</div>
              <button
                onClick={() => markTicketSolved(t._id, t.status)}
                style={{ fontSize: 12, background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
              >{t.status === "solved" ? "Reopen" : "Mark Solved"}</button>
            </div>
          ))
        )
      )}
    </div>
  );
}
