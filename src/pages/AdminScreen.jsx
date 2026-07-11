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

function StatCard({ label, value }) {
  return (
    <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value ?? 0}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</div>
    </div>
  );
}

export default function AdminScreen({ onBack, showToast = () => {} }) {
  const [tab, setTab] = useState("stats");
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

  function createFlag() {
    if (!newFlagKey.trim() || !newFlagLabel.trim()) {
      showToast("Key and label are required", "danger");
      return;
    }
    fetch(`${API_URL}/api/flags`, {
      method: "POST",
      headers: authHdrs(),
      body: JSON.stringify({ key: newFlagKey.trim(), label: newFlagLabel, enabled: false }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { showToast(d.error || "Could not create flag", "danger"); return; }
        setNewFlagKey("");
        setNewFlagLabel("");
        loadFlags();
        showToast("Flag created", "success");
      })
      .catch(() => showToast("Could not create flag", "danger"));
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

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>←</button>
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
        >Support Tickets</button>
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

      {tab === "flags" && (
        <>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>New flag</div>
            <input
              value={newFlagKey}
              onChange={(e) => setNewFlagKey(e.target.value)}
              placeholder="Key (e.g. insurance_enabled)"
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, boxSizing: "border-box", background: "var(--card-bg)", color: "var(--text-primary)" }}
            />
            <input
              value={newFlagLabel}
              onChange={(e) => setNewFlagLabel(e.target.value)}
              placeholder="Label (e.g. Insurance)"
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, boxSizing: "border-box", background: "var(--card-bg)", color: "var(--text-primary)" }}
            />
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
                <button
                  onClick={() => toggleFlag(f.key, f.enabled)}
                  style={{
                    fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: f.enabled ? "#DCFCE7" : "var(--bg-tertiary, #F3F4F6)",
                    color: f.enabled ? "#166534" : "var(--text-secondary)",
                  }}
                >{f.enabled ? "Enabled" : "Disabled"}</button>
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
                <button
                  onClick={() => toggleBanner(b._id, b.active)}
                  style={{ fontSize: 12, background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                >{b.active ? "Hide" : "Reactivate"}</button>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
