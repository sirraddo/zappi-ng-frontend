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
    return payload.username?.toLowerCase() === "sirraddo";
  } catch {
    return false;
  }
}

// The only flags the app currently checks anywhere. A dropdown of exactly
// these — rather than free-text key entry — makes a typo (like "Insurance"
// instead of "insurance_enabled") structurally impossible.
const KNOWN_FLAGS = [
  { key: "insurance_enabled", label: "Insurance" },
];

function StatCard({ label, value }) {
  return (
    <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value ?? 0}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</div>
    </div>
  );
}

// Replaces window.confirm() for destructive actions — the native dialog
// is unstyled, blocks the whole tab, and gives zero indication of which
// app is asking. { open, message, danger, onConfirm, onCancel }
function ConfirmModal({ state, onCancel }) {
  if (!state) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 1000 }}
      onClick={onCancel}
    >
      <div
        style={{ background: "var(--card-bg)", color: "var(--text-primary)", borderRadius: 18, padding: 22, maxWidth: 340, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 20 }}>{state.message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >Cancel</button>
          <button
            onClick={state.onConfirm}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: "#dc2626", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >Delete</button>
        </div>
      </div>
    </div>
  );
}

// Old tickets (created before the message thread existed) only have a
// single `message` + optional `reply` field. New tickets always populate
// `messages`. This normalizes either shape into one chronological list so
// the thread UI below doesn't need to special-case old tickets.
function ticketThread(t) {
  if (t.messages && t.messages.length > 0) return t.messages;
  const thread = [{ sender: "user", text: t.message, createdAt: t.createdAt }];
  if (t.reply) thread.push({ sender: "admin", text: t.reply, createdAt: t.resolvedAt || t.updatedAt || t.createdAt });
  return thread;
}

export default function AdminScreen({ onBack, showToast = () => {}, onTicketsChanged = () => {} }) {
  const [tab, setTab] = useState("stats");
  const [confirmState, setConfirmState] = useState(null);
  const [sendingReply, setSendingReply] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [banners, setBanners] = useState([]);
  const [newBannerTitle, setNewBannerTitle] = useState("");
  const [newBannerDesc, setNewBannerDesc] = useState("");
  const [newBannerLink, setNewBannerLink] = useState("");
  const [newBannerOrder, setNewBannerOrder] = useState("0");
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txFilter, setTxFilter] = useState("");
  const [flags, setFlags] = useState([]);
  const [newFlagKey, setNewFlagKey] = useState("");
  const [newFlagLabel, setNewFlagLabel] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userResult, setUserResult] = useState(null);
  const [userError, setUserError] = useState("");
  const [txRefQuery, setTxRefQuery] = useState("");
  const [txRefResult, setTxRefResult] = useState(null);
  const [txRefError, setTxRefError] = useState("");
  const [ticketFilter, setTicketFilter] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [vtCategories, setVtCategories] = useState({ airtime: true, data: true, electricity: true, cable: true, education: true, insurance: true });
  const [vtResults, setVtResults] = useState(null);
  const [vtMode, setVtMode] = useState(null);
  const [vtRunning, setVtRunning] = useState(false);

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

  function loadBanners() {
    setLoading(true);
    fetch(`${API_URL}/api/banners/all`, { headers: authHdrs() })
      .then((r) => r.json())
      .then((d) => setBanners(d.banners || []))
      .catch(() => showToast("Could not load banners", "danger"))
      .finally(() => setLoading(false));
  }

  function loadStats() {
    setLoading(true);
    fetch(`${API_URL}/api/admin/stats`, { headers: authHdrs() })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => showToast("Could not load stats", "danger"))
      .finally(() => setLoading(false));
  }

  function loadTransactions() {
    setLoading(true);
    const qs = txFilter ? `?status=${txFilter}` : "";
    fetch(`${API_URL}/api/admin/transactions/recent${qs}`, { headers: authHdrs() })
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []))
      .catch(() => showToast("Could not load transactions", "danger"))
      .finally(() => setLoading(false));
  }

  function loadFlags() {
    setLoading(true);
    fetch(`${API_URL}/api/flags/all`, { headers: authHdrs() })
      .then((r) => r.json())
      .then((d) => setFlags(d.flags || []))
      .catch(() => showToast("Could not load flags", "danger"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (tab === "stats") loadStats();
    else if (tab === "transactions") loadTransactions();
    else if (tab === "announcements") loadAnnouncements();
    else if (tab === "tickets") loadTickets();
    else if (tab === "flags") loadFlags();
    else if (tab === "banners") loadBanners();
  }, [tab, txFilter]);

  // Fetch tickets on mount (not lazily) so the open-count badge on the
  // Support Tickets tab works without opening it first. Uses a separate
  // flag, not the shared `loading` state, so it doesn't show a spurious
  // loading indicator on whatever tab happens to be active on mount.
  useEffect(() => {
    fetch(`${API_URL}/api/tickets`, { headers: authHdrs() })
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets || []))
      .catch(() => {});
  }, []);

  function createFlag() {
    const known = KNOWN_FLAGS.find((f) => f.key === newFlagKey);
    if (!known) {
      showToast("Choose a feature from the list", "danger");
      return;
    }
    fetch(`${API_URL}/api/flags`, {
      method: "POST",
      headers: authHdrs(),
      body: JSON.stringify({ key: known.key, label: known.label, enabled: false }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { showToast(d.error || "Could not create flag", "danger"); return; }
        setNewFlagKey("");
        loadFlags();
        showToast("Flag created", "success");
      })
      .catch(() => showToast("Could not create flag", "danger"));
  }

  function deleteFlag(key) {
    setConfirmState({
      message: "Delete this flag? This can't be undone.",
      onConfirm: () => {
        setConfirmState(null);
        fetch(`${API_URL}/api/flags/${key}`, { method: "DELETE", headers: authHdrs() })
          .then((r) => r.json())
          .then(() => {
            loadFlags();
            showToast("Flag deleted", "success");
          })
          .catch(() => showToast("Could not delete flag", "danger"));
      },
    });
  }

  function toggleFlag(key, enabled) {
    fetch(`${API_URL}/api/flags/${key}`, {
      method: "PATCH",
      headers: authHdrs(),
      body: JSON.stringify({ enabled: !enabled }),
    })
      .then((r) => r.json())
      .then(() => loadFlags())
      .catch(() => showToast("Could not update flag", "danger"));
  }

  function lookupTransaction() {
    if (!txRefQuery.trim()) return;
    setLoading(true);
    setTxRefError("");
    setTxRefResult(null);
    fetch(`${API_URL}/api/admin/transactions/lookup?ref=${encodeURIComponent(txRefQuery.trim())}`, { headers: authHdrs() })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { setTxRefError(d.error || "Transaction not found"); return; }
        setTxRefResult(d.transaction);
      })
      .catch(() => setTxRefError("Could not look up transaction"))
      .finally(() => setLoading(false));
  }

  function lookupUser() {
    if (!userQuery.trim()) return;
    setLoading(true);
    setUserError("");
    setUserResult(null);
    fetch(`${API_URL}/api/admin/users/lookup?username=${encodeURIComponent(userQuery.trim())}`, { headers: authHdrs() })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { setUserError(d.error || "User not found"); return; }
        setUserResult(d);
      })
      .catch(() => setUserError("Could not look up user"))
      .finally(() => setLoading(false));
  }

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

  function deleteAnnouncement(id) {
    setConfirmState({
      message: "Delete this announcement? This can't be undone.",
      onConfirm: () => {
        setConfirmState(null);
        fetch(`${API_URL}/api/announcements/${id}`, { method: "DELETE", headers: authHdrs() })
          .then((r) => r.json())
          .then(() => { loadAnnouncements(); showToast("Announcement deleted", "success"); })
          .catch(() => showToast("Could not delete announcement", "danger"));
      },
    });
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

  // Sends a note to the user without touching ticket status — previously
  // this was bundled into "Mark Solved", so there was no way to just say
  // something back without also closing the conversation.
  function sendTicketMessage(id) {
    const text = (replyDrafts[id] || "").trim();
    if (!text) return;
    setSendingReply((s) => ({ ...s, [id]: true }));
    fetch(`${API_URL}/api/tickets/${id}/messages`, {
      method: "POST",
      headers: authHdrs(),
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { showToast(d.error || "Could not send message", "danger"); return; }
        setReplyDrafts((rd) => ({ ...rd, [id]: "" }));
        loadTickets();
        onTicketsChanged();
        showToast("Sent", "success");
      })
      .catch(() => showToast("Could not send message", "danger"))
      .finally(() => setSendingReply((s) => ({ ...s, [id]: false })));
  }

  // Status only — Open <-> Solved. No longer sends whatever's in the
  // reply box; use "Send" above to actually say something to the user.
  function setTicketStatus(id, newStatus) {
    fetch(`${API_URL}/api/tickets/${id}`, {
      method: "PATCH",
      headers: authHdrs(),
      body: JSON.stringify({ status: newStatus }),
    })
      .then((r) => r.json())
      .then(() => {
        loadTickets();
        onTicketsChanged();
        showToast(newStatus === "solved" ? "Marked solved" : "Reopened", "success");
      })
      .catch(() => showToast("Could not update ticket", "danger"));
  }

  function createBanner() {
    if (!newBannerTitle.trim() || !newBannerDesc.trim()) {
      showToast("Title and description are required", "danger");
      return;
    }
    fetch(`${API_URL}/api/banners`, {
      method: "POST",
      headers: authHdrs(),
      body: JSON.stringify({ title: newBannerTitle, desc: newBannerDesc, link: newBannerLink, order: Number(newBannerOrder) || 0 }),
    })
      .then((r) => r.json())
      .then(() => {
        setNewBannerTitle("");
        setNewBannerDesc("");
        setNewBannerLink("");
        setNewBannerOrder("0");
        loadBanners();
        showToast("Banner published", "success");
      })
      .catch(() => showToast("Could not create banner", "danger"));
  }

  function deleteBanner(id) {
    setConfirmState({
      message: "Delete this banner? This can't be undone.",
      onConfirm: () => {
        setConfirmState(null);
        fetch(`${API_URL}/api/banners/${id}`, { method: "DELETE", headers: authHdrs() })
          .then((r) => r.json())
          .then(() => { loadBanners(); showToast("Banner deleted", "success"); })
          .catch(() => showToast("Could not delete banner", "danger"));
      },
    });
  }

  function toggleBanner(id, active) {
    fetch(`${API_URL}/api/banners/${id}`, {
      method: "PATCH",
      headers: authHdrs(),
      body: JSON.stringify({ active: !active }),
    })
      .then((r) => r.json())
      .then(() => loadBanners())
      .catch(() => showToast("Could not update banner", "danger"));
  }

  // Runs the admin-only VTPass sandbox test batch (routes/vtpassTest.js)
  // for whichever categories are checked — generates real, verifiable
  // request IDs for VTPass's live-access application form. Never touches
  // Pi payments or the Transaction collection.
  function runVtpassTest() {
    const categories = Object.entries(vtCategories).filter(([, on]) => on).map(([k]) => k);
    if (!categories.length) { showToast("Select at least one category", "danger"); return; }
    setVtRunning(true);
    setVtResults(null);
    fetch(`${API_URL}/api/admin/vtpass-test`, {
      method: "POST",
      headers: authHdrs(),
      body: JSON.stringify({ categories }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { showToast(d.error || "Test batch failed", "danger"); return; }
        setVtResults(d.results || []);
        setVtMode(d.mode || null);
      })
      .catch(() => showToast("Could not run test batch", "danger"))
      .finally(() => setVtRunning(false));
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 4, padding: "6px 8px 6px 0" }}>← <span style={{ fontSize: 15, fontWeight: 600 }}>Back</span></button>
        <h2 style={{ margin: 0, fontSize: 18 }}>Admin</h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
        <button
          onClick={() => setTab("stats")}
          style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none",
            background: tab === "stats" ? "var(--primary-light)" : "var(--bg-secondary)",
            color: tab === "stats" ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: 700, cursor: "pointer",
          }}
        >Stats</button>
        <button
          onClick={() => setTab("transactions")}
          style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none",
            background: tab === "transactions" ? "var(--primary-light)" : "var(--bg-secondary)",
            color: tab === "transactions" ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: 700, cursor: "pointer",
          }}
        >Transactions</button>
        <button
          onClick={() => setTab("announcements")}
          style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none",
            background: tab === "announcements" ? "var(--primary-light)" : "var(--bg-secondary)",
            color: tab === "announcements" ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: 700, cursor: "pointer",
          }}
        >Announcements</button>
        <button
          onClick={() => setTab("tickets")}
          style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none",
            background: tab === "tickets" ? "var(--primary-light)" : "var(--bg-secondary)",
            color: tab === "tickets" ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: 700, cursor: "pointer",
          }}
        >Support Tickets{tickets.filter((t) => t.status === "open").length > 0 && (
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: "#dc2626", color: "white", borderRadius: 10, padding: "1px 6px" }}>
              {tickets.filter((t) => t.status === "open").length}
            </span>
          )}</button>
        <button
          onClick={() => setTab("flags")}
          style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none",
            background: tab === "flags" ? "var(--primary-light)" : "var(--bg-secondary)",
            color: tab === "flags" ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: 700, cursor: "pointer",
          }}
        >Flags</button>
        <button
          onClick={() => setTab("users")}
          style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none",
            background: tab === "users" ? "var(--primary-light)" : "var(--bg-secondary)",
            color: tab === "users" ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: 700, cursor: "pointer",
          }}
        >Users</button>
        <button
          onClick={() => setTab("banners")}
          style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none",
            background: tab === "banners" ? "var(--primary-light)" : "var(--bg-secondary)",
            color: tab === "banners" ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: 700, cursor: "pointer",
          }}
        >Banners</button>
        <button
          onClick={() => setTab("vtpasstest")}
          style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none",
            background: tab === "vtpasstest" ? "var(--primary-light)" : "var(--bg-secondary)",
            color: tab === "vtpasstest" ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: 700, cursor: "pointer",
          }}
        >VTPass Test</button>
      </div>

      {tab === "stats" && (
        loading ? (
          <div>Loading…</div>
        ) : !stats ? (
          <div style={{ color: "var(--text-secondary)" }}>No data yet</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <StatCard label="Total users" value={stats.totalUsers} />
              <StatCard label="New users today" value={stats.usersToday} />
              <StatCard label="Transactions today" value={stats.transactionsToday} />
              <StatCard label="Transactions this week" value={stats.transactionsThisWeek} />
            </div>
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Successful volume</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Naira</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>₦{Number(stats.volumeNGN).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Pi</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>π{Number(stats.volumePi).toFixed(4)}</span>
              </div>
            </div>
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Transaction status</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#16a34a", fontSize: 13 }}>Success</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{stats.success}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#d97706", fontSize: 13 }}>Pending</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{stats.pending}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#dc2626", fontSize: 13 }}>Failed</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{stats.failed}</span>
              </div>
            </div>
          </>
        )
      )}

      {tab === "transactions" && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
            {["", "failed", "pending", "success"].map((s) => (
              <button
                key={s || "all"}
                onClick={() => setTxFilter(s)}
                style={{
                  flexShrink: 0, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                  background: txFilter === s ? "var(--primary)" : "var(--bg-secondary)",
                  color: txFilter === s ? "white" : "var(--text-secondary)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >{s ? s[0].toUpperCase() + s.slice(1) : "All"}</button>
            ))}
          </div>
          {loading ? (
            <div>Loading…</div>
          ) : transactions.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>No transactions found</div>
          ) : (
            transactions.map((t) => (
              <div key={t._id} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.billType} — @{t.user?.piUsername || "unknown"}</div>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10,
                    background: t.status === "success" ? "#DCFCE7" : t.status === "failed" ? "#FEE2E2" : "#FEF3C7",
                    color: t.status === "success" ? "#166534" : t.status === "failed" ? "#991B1B" : "#92400E",
                  }}>{t.status}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0" }}>
                  ₦{Number(t.amountNGN).toLocaleString()} · π{Number(t.amountPi).toFixed(4)} · {t.serviceID}
                </div>
                {t.status === "success" && t.requestId && (
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
                    <span>Request ID: {t.requestId}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(t.requestId).then(() => showToast("Copied", "success")).catch(() => showToast("Couldn't copy", "danger"))}
                      style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: 0 }}
                    >Copy</button>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{new Date(t.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </>
      )}

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
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => toggleAnnouncement(a._id, a.active)}
                    style={{ fontSize: 12, background: "none", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                  >{a.active ? "Hide" : "Reactivate"}</button>
                  <button
                    onClick={() => deleteAnnouncement(a._id)}
                    style={{ fontSize: 12, background: "none", color: "#dc2626", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                  >Delete</button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "tickets" && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
            {["", "open", "solved"].map((s) => (
              <button
                key={s || "all"}
                onClick={() => setTicketFilter(s)}
                style={{
                  flexShrink: 0, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                  background: ticketFilter === s ? "var(--primary)" : "var(--bg-secondary)",
                  color: ticketFilter === s ? "white" : "var(--text-secondary)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >{s ? s[0].toUpperCase() + s.slice(1) : "All"}</button>
            ))}
          </div>
          {loading ? (
            <div>Loading…</div>
          ) : tickets.filter((t) => !ticketFilter || t.status === ticketFilter).length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>No support tickets{ticketFilter ? ` (${ticketFilter})` : ""}</div>
          ) : (
            tickets.filter((t) => !ticketFilter || t.status === ticketFilter).map((t) => (
            <div key={t._id} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.subject}</div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: t.status === "solved" ? "#DCFCE7" : "#FEF3C7", color: t.status === "solved" ? "#166534" : "#92400E" }}>
                  {t.status === "solved" ? "Solved" : "Open"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 10px" }}>@{t.username}</div>

              <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {ticketThread(t).map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.sender === "admin" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "80%", fontSize: 13, lineHeight: 1.4, padding: "8px 12px", borderRadius: 12,
                      background: m.sender === "admin" ? "var(--primary)" : "var(--card-bg)",
                      color: m.sender === "admin" ? "white" : "var(--text-primary)",
                      borderBottomRightRadius: m.sender === "admin" ? 3 : 12,
                      borderBottomLeftRadius: m.sender === "admin" ? 12 : 3,
                    }}>
                      <div>{m.text}</div>
                      {m.createdAt && (
                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{new Date(m.createdAt).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <textarea
                value={replyDrafts[t._id] ?? ""}
                onChange={(e) => setReplyDrafts({ ...replyDrafts, [t._id]: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTicketMessage(t._id); } }}
                placeholder="Reply to this user…"
                rows={2}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, boxSizing: "border-box", background: "var(--card-bg)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12 }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => sendTicketMessage(t._id)}
                  disabled={!(replyDrafts[t._id] || "").trim() || sendingReply[t._id]}
                  style={{
                    fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: "var(--primary)", color: "white",
                    opacity: !(replyDrafts[t._id] || "").trim() || sendingReply[t._id] ? 0.5 : 1,
                  }}
                >{sendingReply[t._id] ? "Sending…" : "Send"}</button>
                <button
                  onClick={() => setTicketStatus(t._id, t.status === "solved" ? "open" : "solved")}
                  style={{ fontSize: 12, background: "none", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
                >{t.status === "solved" ? "Reopen" : "Mark Solved"}</button>
              </div>
            </div>
          ))
        )}
        </>
      )}

      {tab === "flags" && (
        <>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>New flag</div>
            <select
              value={newFlagKey}
              onChange={(e) => setNewFlagKey(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, boxSizing: "border-box", background: "var(--card-bg)", color: "var(--text-primary)" }}
            >
              <option value="">Select a feature…</option>
              {KNOWN_FLAGS.filter((k) => !flags.some((f) => f.key === k.key)).map((k) => (
                <option key={k.key} value={k.key}>{k.label}</option>
              ))}
            </select>
            <button
              onClick={createFlag}
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}
            >Create</button>
          </div>

          {loading ? (
            <div>Loading…</div>
          ) : flags.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>No flags yet</div>
          ) : (
            flags.map((f) => (
              <div key={f._id} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{f.key}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => toggleFlag(f.key, f.enabled)}
                    style={{
                      fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: f.enabled ? "#DCFCE7" : "var(--bg-tertiary, #F3F4F6)",
                      color: f.enabled ? "#166534" : "var(--text-secondary)",
                    }}
                  >{f.enabled ? "Enabled" : "Disabled"}</button>
                  <button
                    onClick={() => deleteFlag(f.key)}
                    style={{ fontSize: 12, fontWeight: 700, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "#dc2626", cursor: "pointer" }}
                  >Delete</button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "users" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupUser()}
              placeholder="Pi username"
              style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--border)", boxSizing: "border-box", background: "var(--card-bg)", color: "var(--text-primary)" }}
            />
            <button
              onClick={lookupUser}
              style={{ padding: "0 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}
            >Search</button>
          </div>

          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: "var(--text-secondary)" }}>Or look up a transaction directly</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              value={txRefQuery}
              onChange={(e) => setTxRefQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupTransaction()}
              placeholder="Reference (e.g. ZAP-XXXXXXXXXX) or full ID"
              style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--border)", boxSizing: "border-box", background: "var(--card-bg)", color: "var(--text-primary)" }}
            />
            <button
              onClick={lookupTransaction}
              style={{ padding: "0 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}
            >Find</button>
          </div>
          {txRefError && <div style={{ color: "#dc2626", marginBottom: 16 }}>{txRefError}</div>}
          {txRefResult && (
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{txRefResult.billType} — @{txRefResult.user?.piUsername || "unknown"}</div>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 10,
                  background: txRefResult.status === "success" ? "#DCFCE7" : txRefResult.status === "failed" ? "#FEE2E2" : "#FEF3C7",
                  color: txRefResult.status === "success" ? "#166534" : txRefResult.status === "failed" ? "#991B1B" : "#92400E",
                }}>{txRefResult.status}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0" }}>
                ₦{Number(txRefResult.amountNGN).toLocaleString()} · π{Number(txRefResult.amountPi).toFixed(4)} · {txRefResult.serviceID}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{new Date(txRefResult.createdAt).toLocaleString()}</div>
            </div>
          )}

          {loading ? (
            <div>Loading…</div>
          ) : userError ? (
            <div style={{ color: "#dc2626" }}>{userError}</div>
          ) : userResult ? (
            <>
              <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>@{userResult.user.piUsername}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{userResult.user.fullName || "No name on file"}</div>
              </div>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: "var(--text-secondary)" }}>Recent transactions</div>
              {userResult.transactions.length === 0 ? (
                <div style={{ color: "var(--text-secondary)" }}>No transactions yet</div>
              ) : (
                userResult.transactions.map((t) => (
                  <div key={t._id} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.billType}</div>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10,
                        background: t.status === "success" ? "#DCFCE7" : t.status === "failed" ? "#FEE2E2" : "#FEF3C7",
                        color: t.status === "success" ? "#166534" : t.status === "failed" ? "#991B1B" : "#92400E",
                      }}>{t.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0" }}>
                      ₦{Number(t.amountNGN).toLocaleString()} · π{Number(t.amountPi).toFixed(4)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                ))
              )}
            </>
          ) : (
            <div style={{ color: "var(--text-secondary)" }}>Search a username to see their account and recent transactions</div>
          )}
        </>
      )}

      {tab === "banners" && (
        <>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>New banner</div>
            <input
              value={newBannerTitle}
              onChange={(e) => setNewBannerTitle(e.target.value)}
              placeholder="Title"
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, boxSizing: "border-box" }}
            />
            <textarea
              value={newBannerDesc}
              onChange={(e) => setNewBannerDesc(e.target.value)}
              placeholder="Description"
              rows={2}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, boxSizing: "border-box", fontFamily: "inherit" }}
            />
            <input
              value={newBannerLink}
              onChange={(e) => setNewBannerLink(e.target.value)}
              placeholder="Link (optional — https://...)"
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, boxSizing: "border-box" }}
            />
            <input
              value={newBannerOrder}
              onChange={(e) => setNewBannerOrder(e.target.value)}
              placeholder="Display order (0 = first)"
              type="number"
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, boxSizing: "border-box" }}
            />
            <button
              onClick={createBanner}
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}
            >Publish</button>
          </div>

          {loading ? (
            <div>Loading…</div>
          ) : banners.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>No banners yet</div>
          ) : (
            banners.map((b) => (
              <div key={b._id} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10, opacity: b.active ? 1 : 0.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: b.active ? "#DCFCE7" : "#F3F4F6", color: b.active ? "#166534" : "#6B7280" }}>
                    {b.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", margin: "6px 0" }}>{b.desc}</div>
                {b.link && <div style={{ fontSize: 12, color: "var(--primary)", marginBottom: 6, wordBreak: "break-all" }}>{b.link}</div>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => toggleBanner(b._id, b.active)}
                    style={{ fontSize: 12, background: "none", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                  >{b.active ? "Hide" : "Reactivate"}</button>
                  <button
                    onClick={() => deleteBanner(b._id)}
                    style={{ fontSize: 12, background: "none", color: "#dc2626", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                  >Delete</button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "vtpasstest" && (
        <>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Run VTPass sandbox test batch</div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.4 }}>
              Uses VTPass's own documented sandbox test values (test phone numbers, meter numbers, smartcard numbers) to generate real, verifiable request IDs — exactly what VTPass's live-access application form asks for as proof of successful integration. Never touches Pi payments or your transaction history.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {Object.keys(vtCategories).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setVtCategories((c) => ({ ...c, [cat]: !c[cat] }))}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                    background: vtCategories[cat] ? "var(--primary)" : "var(--card-bg)",
                    color: vtCategories[cat] ? "white" : "var(--text-secondary)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                  }}
                >{cat}</button>
              ))}
            </div>
            <button
              onClick={runVtpassTest}
              disabled={vtRunning}
              style={{
                width: "100%", padding: 12, borderRadius: 10, border: "none",
                background: vtRunning ? "#9CA3AF" : "var(--primary)", color: "white", fontWeight: 700,
                cursor: vtRunning ? "default" : "pointer",
              }}
            >{vtRunning ? "Running… this can take a minute" : "Run Test Batch"}</button>
          </div>

          {vtResults && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Mode: <strong>{vtMode}</strong> · {vtResults.filter((r) => r.status === "delivered").length}/{vtResults.length} delivered
                </div>
                <button
                  onClick={() => {
                    const text = vtResults.filter((r) => r.status === "delivered").map((r) => `${r.serviceID}: ${r.requestId}`).join("\n");
                    navigator.clipboard.writeText(text).then(() => showToast("Copied all", "success")).catch(() => showToast("Couldn't copy", "danger"));
                  }}
                  style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}
                >Copy All</button>
              </div>
              {vtResults.map((r, i) => (
                <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{r.serviceID}</span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 10,
                      background: r.status === "delivered" ? "#DCFCE7" : r.status === "skipped" ? "#F3F4F6" : "#FEE2E2",
                      color: r.status === "delivered" ? "#166534" : r.status === "skipped" ? "#6B7280" : "#991B1B",
                    }}>{r.status}</span>
                  </div>
                  {r.product && <div style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "2px 0" }}>{r.product}</div>}
                  {r.requestId && (
                    <div style={{ fontSize: 11, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span>{r.requestId}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(r.requestId).then(() => showToast("Copied", "success")).catch(() => showToast("Couldn't copy", "danger"))}
                        style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: 0 }}
                      >Copy</button>
                      {r.status !== "delivered" && <span style={{ color: "var(--text-tertiary)" }}>(check VTPass dashboard before using)</span>}
                    </div>
                  )}
                  {r.error && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4 }}>{r.error}</div>}
                  {r.skipped && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>{r.skipped}</div>}
                  {r.status !== "delivered" && r.status !== "skipped" && r.raw && (
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4, fontFamily: "monospace", wordBreak: "break-all" }}>
                      {JSON.stringify(r.raw).slice(0, 300)}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </>
      )}

      <ConfirmModal state={confirmState} onCancel={() => setConfirmState(null)} />
    </div>
  );
}
