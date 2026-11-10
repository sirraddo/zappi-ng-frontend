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

const STATUS_COLORS = {
  success: ["#DCFCE7", "#166534"], failed: ["#FEE2E2", "#991B1B"], pending: ["#FEF3C7", "#92400E"],
};
const refundLabel = (r) => (r?.status === "success" ? "Pi refunded" : r?.status === "processing" ? "Refund in progress" : r?.status === "failed" ? "Refund FAILED" : null);

// One order, with the actions an admin needs: re-check with the provider, refund, retry refund.
function OrderCard({ t, busy, onRecheck, onRefund, onRetryRefund, showToast }) {
  const [bg, fg] = STATUS_COLORS[t.status] || STATUS_COLORS.pending;
  const rl = refundLabel(t.refund);
  const btn = { flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--primary)", fontWeight: 700, fontSize: 12, cursor: "pointer" };
  const copy = (v) => navigator.clipboard.writeText(v).then(() => showToast("Copied", "success")).catch(() => showToast("Couldn't copy", "danger"));
  return (
    <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.billType} — @{t.user?.piUsername || "unknown"}</div>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: bg, color: fg }}>{t.status}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0" }}>
        ₦{Number(t.amountNGN).toLocaleString()} · π{Number(t.amountPi).toFixed(4)} · {t.serviceID}{t.recipient ? ` · ${t.recipient}` : ""}
      </div>
      {t.requestId && (
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace", display: "flex", gap: 8, alignItems: "center" }}>
          <span>{t.requestId}</span>
          <button onClick={() => copy(t.requestId)} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>Copy</button>
        </div>
      )}
      {t.vtpassRef && <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace" }}>VTPass: {t.vtpassRef}</div>}
      {t.meta?.error && t.status !== "success" && <div style={{ fontSize: 11, color: "#991B1B", margin: "2px 0" }}>{String(t.meta.error).slice(0, 120)}</div>}
      {rl && <div style={{ fontSize: 12, fontWeight: 700, color: t.refund?.status === "failed" ? "#991B1B" : "#166534", margin: "4px 0" }}>{rl}{t.refund?.error ? ` — ${t.refund.error}` : ""}</div>}
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>{new Date(t.createdAt).toLocaleString()}</div>
      {(t.status !== "success" || t.refund?.status === "failed") && (
        <div style={{ display: "flex", gap: 8 }}>
          {t.requestId && t.status !== "success" && <button disabled={busy} onClick={() => onRecheck(t)} style={btn}>{busy ? "Working…" : "🔄 Re-check"}</button>}
          {t.status === "failed" && !t.refund?.status && t.piPaymentId && <button disabled={busy} onClick={() => onRefund(t)} style={btn}>↩️ Refund Pi</button>}
          {t.refund?.status === "failed" && <button disabled={busy} onClick={() => onRetryRefund(t)} style={btn}>↩️ Retry refund</button>}
        </div>
      )}
    </div>
  );
}

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
  const [tab, setTab] = useState(null);
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
  const [vtCategories, setVtCategories] = useState({ airtime: true, data: true, electricity: true, cable: true, education: true, internet: true, insurance: true });
  const [vtResults, setVtResults] = useState(null);
  const [vtMode, setVtMode] = useState(null);
  const [vtRunning, setVtRunning] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingTx, setPendingTx] = useState([]);
  const [orderQ, setOrderQ] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [ledger, setLedger] = useState({ refunds: [], needs: [] });
  const [money, setMoney] = useState(null);
  const [golive, setGolive] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiOut, setAiOut] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiQ, setAiQ] = useState("");
  const [aiLimit, setAiLimit] = useState("");
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [aiKeyBusy, setAiKeyBusy] = useState(false);
  const [aiTicket, setAiTicket] = useState("");
  const [promos, setPromos] = useState([]);
  const [pf, setPf] = useState({ code: "", percent: "5", maxDiscountNGN: "100", maxUses: "100", perUserLimit: "1", service: "", expiresAt: "" });
  const [rateInfo, setRateInfo] = useState(null);
  const [spreadInput, setSpreadInput] = useState("");
  const [noticeList, setNoticeList] = useState([]);
  const [nKey, setNKey] = useState("data:mtn-data");
  const [nMsg, setNMsg] = useState("");
  const [nBlock, setNBlock] = useState(true);
  const [customers, setCustomers] = useState({ total: 0, customers: [] });
  const [custQ, setCustQ] = useState("");

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

  function reloadCurrent() {
    if (tab === "transactions") loadTransactions();
    else if (tab === "pending") loadPendingTx();
    else if (tab === "ledger") loadLedger();
    else if (tab === "stats") loadStats();
  }
  function adminPost(path, okMsg) {
    return fetch(`${API_URL}/api/admin${path}`, { method: "POST", headers: authHdrs() })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => { showToast(okMsg(d), "success"); return d; })
      .catch((e) => showToast(e.message, "danger"));
  }
  function recheckOrder(t) {
    setBusyId(t._id);
    adminPost(`/transactions/${t._id}/recheck`, (d) => `Provider says: ${d.status}${d.refund ? " — refund started" : ""}`).finally(() => { setBusyId(null); reloadCurrent(); });
  }
  function refundOrder(t) {
    setConfirmState({
      message: `Refund π${Number(t.amountPi).toFixed(4)} to @${t.user?.piUsername || "this user"}? Do this only if they did not receive the service.`,
      onConfirm: () => { setConfirmState(null); setBusyId(t._id); adminPost(`/transactions/${t._id}/refund`, () => "Refund started").finally(() => { setBusyId(null); setTimeout(reloadCurrent, 4000); }); },
    });
  }
  function retryRefund(t) {
    setBusyId(t._id);
    adminPost(`/transactions/${t._id}/refund-retry`, () => "Refund retry started").finally(() => { setBusyId(null); setTimeout(reloadCurrent, 4000); });
  }
  function loadLedger() {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/admin/transactions/recent?refund=any`, { headers: authHdrs() }).then((r) => r.json()),
      fetch(`${API_URL}/api/admin/transactions/recent?needsRefund=1`, { headers: authHdrs() }).then((r) => r.json()),
    ]).then(([a, b]) => setLedger({ refunds: a.transactions || [], needs: b.transactions || [] }))
      .catch(() => showToast("Could not load the ledger", "danger")).finally(() => setLoading(false));
  }
  const NOTICE_SERVICES = [
    ["airtime", "All airtime"], ["airtime:mtn", "MTN airtime"], ["airtime:airtel", "Airtel airtime"], ["airtime:glo", "Glo airtime"], ["airtime:etisalat", "9mobile airtime"],
    ["data", "All data"], ["data:mtn-data", "MTN data"], ["data:airtel-data", "Airtel data"], ["data:glo-data", "Glo data"], ["data:etisalat-data", "9mobile data"],
    ["electricity", "Electricity"], ["cable", "Cable TV"], ["internet", "Internet"], ["education", "Exam fees"], ["showmax", "Showmax"], ["insurance", "Insurance"],
  ];
  const noticeName = (k) => (NOTICE_SERVICES.find(([v]) => v === k) || [k, k])[1];
  function loadAi() {
    fetch(`${API_URL}/api/admin/ai-status`, { headers: authHdrs() }).then((r) => r.json()).then((d) => { setAiStatus(d); setAiLimit(String(d.dailyLimit)); }).catch(() => showToast("Could not load AI status", "danger"));
    if (!tickets.length) loadTickets();
  }
  function runAi(body) {
    setAiBusy(true); setAiOut("");
    fetch(`${API_URL}/api/admin/assistant`, { method: "POST", headers: authHdrs(), body: JSON.stringify(body) })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Failed"); setAiOut(d.reply || ""); })
      .catch((e) => showToast(e.message, "danger")).finally(() => setAiBusy(false));
  }
  function saveAiKey() {
    if (!aiKeyInput.trim()) return;
    setAiKeyBusy(true);
    fetch(`${API_URL}/api/admin/ai-key`, { method: "POST", headers: authHdrs(), body: JSON.stringify({ key: aiKeyInput.trim() }) })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Failed"); setAiKeyInput(""); showToast("AI key saved and tested", "success"); loadAi(); })
      .catch((e) => showToast(e.message, "danger")).finally(() => setAiKeyBusy(false));
  }
  function removeAiKey() {
    setConfirmState({
      message: "Remove the AI key saved here? The assistants stop working unless a key is set on Render.",
      onConfirm: () => { setConfirmState(null); fetch(`${API_URL}/api/admin/ai-key`, { method: "DELETE", headers: authHdrs() }).then(() => { showToast("Key removed", "success"); loadAi(); }).catch(() => showToast("Could not remove", "danger")); },
    });
  }
  function saveAiLimit() {
    const n = Number(aiLimit);
    if (!Number.isInteger(n) || n < 0 || n > 500) return showToast("Enter a whole number from 0 to 500", "danger");
    fetch(`${API_URL}/api/admin/ai-status`, { method: "POST", headers: authHdrs(), body: JSON.stringify({ dailyLimit: n }) })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Failed"); setAiStatus({ ...aiStatus, dailyLimit: n }); showToast(`Limit set to ${n} questions per customer per day`, "success"); })
      .catch((e) => showToast(e.message, "danger"));
  }
  function toggleCustomerAi() {
    const next = !aiStatus.customerEnabled;
    fetch(`${API_URL}/api/admin/ai-status`, { method: "POST", headers: authHdrs(), body: JSON.stringify({ customerEnabled: next }) })
      .then(() => { setAiStatus({ ...aiStatus, customerEnabled: next }); showToast(next ? "Ask Zappi is ON for customers" : "Ask Zappi is OFF for customers", "success"); })
      .catch(() => showToast("Could not change it", "danger"));
  }
  function loadPromos() {
    setLoading(true);
    fetch(`${API_URL}/api/promos/all`, { headers: authHdrs() }).then((r) => r.json()).then((d) => setPromos(d.promos || []))
      .catch(() => showToast("Could not load promo codes", "danger")).finally(() => setLoading(false));
  }
  function savePromo(body) {
    return fetch(`${API_URL}/api/promos`, { method: "POST", headers: authHdrs(), body: JSON.stringify(body) })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Failed"); showToast("Saved", "success"); loadPromos(); return true; })
      .catch((e) => { showToast(e.message, "danger"); return false; });
  }
  function deletePromo(code) {
    setConfirmState({
      message: `Delete promo code ${code}? Customers who already used it keep their discount.`,
      onConfirm: () => { setConfirmState(null); fetch(`${API_URL}/api/promos/${encodeURIComponent(code)}`, { method: "DELETE", headers: authHdrs() }).then(() => { showToast("Deleted", "success"); loadPromos(); }).catch(() => showToast("Could not delete", "danger")); },
    });
  }
  function loadRate() {
    setLoading(true);
    fetch(`${API_URL}/api/admin/rate`, { headers: authHdrs() }).then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => { setRateInfo(d); setSpreadInput(String(+(d.rate.spread * 100).toFixed(2))); })
      .catch((e) => { setRateInfo(null); showToast(e.message, "danger"); }).finally(() => setLoading(false));
  }
  function rateAction(path, body, okMsg) {
    return fetch(`${API_URL}/api/admin/rate/${path}`, { method: "POST", headers: authHdrs(), body: body ? JSON.stringify(body) : undefined })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Failed"); showToast(okMsg, "success"); loadRate(); })
      .catch((e) => showToast(e.message, "danger"));
  }
  function saveSpread() {
    const pct = Number(spreadInput);
    if (!Number.isFinite(pct) || pct < 0 || pct > 10) return showToast("Enter a number between 0 and 10", "danger");
    setConfirmState({
      message: `Set the margin to ${pct}%? Every customer's Pi price changes from the next refresh.`,
      onConfirm: () => { setConfirmState(null); rateAction("spread", { percent: pct }, "Margin updated"); },
    });
  }
  function loadNotices() {
    setLoading(true);
    fetch(`${API_URL}/api/notices/all`, { headers: authHdrs() }).then((r) => r.json()).then((d) => setNoticeList(d.notices || []))
      .catch(() => showToast("Could not load notices", "danger")).finally(() => setLoading(false));
  }
  function saveNotice(body) {
    return fetch(`${API_URL}/api/notices`, { method: "POST", headers: authHdrs(), body: JSON.stringify(body) })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Failed"); showToast("Saved", "success"); loadNotices(); })
      .catch((e) => showToast(e.message, "danger"));
  }
  function deleteNotice(key) {
    fetch(`${API_URL}/api/notices/${encodeURIComponent(key)}`, { method: "DELETE", headers: authHdrs() })
      .then(() => { showToast("Removed", "success"); loadNotices(); }).catch(() => showToast("Could not remove", "danger"));
  }
  function loadGolive() {
    setLoading(true);
    fetch(`${API_URL}/api/admin/go-live`, { headers: authHdrs() }).then((r) => r.json()).then(setGolive)
      .catch(() => showToast("Could not run the go-live check", "danger")).finally(() => setLoading(false));
  }
  function loadMoney() {
    setLoading(true);
    fetch(`${API_URL}/api/admin/money-check`, { headers: authHdrs() }).then((r) => r.json()).then(setMoney)
      .catch(() => showToast("Could not run the money check", "danger")).finally(() => setLoading(false));
  }
  function loadCustomers(q = custQ) {
    setLoading(true);
    fetch(`${API_URL}/api/admin/customers?q=${encodeURIComponent(q)}`, { headers: authHdrs() }).then((r) => r.json())
      .then((d) => setCustomers({ total: d.total || 0, customers: d.customers || [] }))
      .catch(() => showToast("Could not load customers", "danger")).finally(() => setLoading(false));
  }

  function loadTransactions() {
    setLoading(true);
    const qs = `?status=${txFilter}&q=${encodeURIComponent(orderQ)}`;
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

  function loadAuditLog() {
    setLoading(true);
    fetch(`${API_URL}/api/admin/audit-log`, { headers: authHdrs() })
      .then((r) => r.json())
      .then((d) => setAuditLogs(d.logs || []))
      .catch(() => showToast("Could not load audit log", "danger"))
      .finally(() => setLoading(false));
  }

  // Transactions VTPass has accepted (charged the wallet) but not yet
  // confirmed as "delivered" — see models/Transaction.js status enum.
  // Oldest first: the longer something's sat pending, the more likely
  // it's genuinely stuck rather than just mid-flight.
  function loadPendingTx() {
    setLoading(true);
    fetch(`${API_URL}/api/admin/transactions/recent?status=pending`, { headers: authHdrs() })
      .then((r) => r.json())
      .then((d) => {
        const sorted = [...(d.transactions || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setPendingTx(sorted);
      })
      .catch(() => showToast("Could not load pending transactions", "danger"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (tab === "stats") loadStats();
    else if (tab === "transactions") loadTransactions();
    else if (tab === "announcements") loadAnnouncements();
    else if (tab === "tickets") loadTickets();
    else if (tab === "flags") loadFlags();
    else if (tab === "banners") loadBanners();
    else if (tab === "auditlog") loadAuditLog();
    else if (tab === "pending") loadPendingTx();
    else if (tab === "ledger") loadLedger();
    else if (tab === "money") loadMoney();
    else if (tab === "golive") loadGolive();
    else if (tab === "notices") loadNotices();
    else if (tab === "rate") loadRate();
    else if (tab === "promos") loadPromos();
    else if (tab === "ai") loadAi();
    else if (tab === "customers") loadCustomers();
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

      {!tab ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { key: "stats", icon: "📊", label: "Overview" },
            { key: "transactions", icon: "💳", label: "Orders" },
            { key: "ledger", icon: "📒", label: "Ledger & refunds", badge: ledger.needs.length },
            { key: "golive", icon: "🚦", label: "Go-live check" },
            { key: "rate", icon: "📈", label: "Rate & pricing" },
            { key: "promos", icon: "🎟️", label: "Promo codes" },
            { key: "ai", icon: "✨", label: "AI Assistant" },
            { key: "money", icon: "💰", label: "Money check" },
            { key: "customers", icon: "👥", label: "Customers" },
            { key: "announcements", icon: "📢", label: "Announcements" },
            { key: "notices", icon: "🚧", label: "Service notices" },
            { key: "tickets", icon: "🎫", label: "Support Tickets", badge: tickets.filter((t) => t.status === "open").length },
            { key: "flags", icon: "🚩", label: "Flags" },
            { key: "users", icon: "👤", label: "Users" },
            { key: "banners", icon: "🖼️", label: "Banners" },
            { key: "vtpasstest", icon: "🧪", label: "VTPass Test" },
            { key: "auditlog", icon: "📜", label: "Audit Log" },
            { key: "pending", icon: "⏳", label: "Pending orders", badge: pendingTx.length },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setTab(m.key)}
              style={{
                position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 16,
                cursor: "pointer", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 24 }}>{m.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{m.label}</span>
              {m.badge > 0 && (
                <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10, fontWeight: 700, background: "#dc2626", color: "white", borderRadius: 10, padding: "1px 6px" }}>
                  {m.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setTab(null)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--primary)", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 16 }}
        >← Back to menu</button>
      )}

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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <StatCard label="Sales today (₦)" value={`₦${Number(stats.salesTodayNGN || 0).toLocaleString()}`} />
              <StatCard label="Sales today (π)" value={`π${Number(stats.salesTodayPi || 0).toFixed(2)}`} />
              <StatCard label="Stuck over 10 min" value={stats.stuckPending ?? 0} />
              <StatCard label="π refunded" value={`π${Number(stats.refunds?.success?.pi || 0).toFixed(2)}`} />
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
          <form onSubmit={(e) => { e.preventDefault(); loadTransactions(); }} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={orderQ} onChange={(e) => setOrderQ(e.target.value)} placeholder="Search ZNG reference, VTPass ref, phone, @user"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13 }} />
            <button type="submit" style={{ padding: "0 14px", borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}>Search</button>
          </form>
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
            transactions.map((t) => <OrderCard key={t._id} t={t} busy={busyId === t._id} onRecheck={recheckOrder} onRefund={refundOrder} onRetryRefund={retryRefund} showToast={showToast} />            )
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
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "var(--card-bg)", padding: 8, borderRadius: 6 }}>
                      {JSON.stringify(r.raw, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </>
      )}

      {tab === "auditlog" && (
        <>
          {loading ? (
            <div>Loading…</div>
          ) : auditLogs.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>No admin actions recorded yet</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log._id} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{log.action}</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {log.target && <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0" }}>{log.target}</div>}
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>by @{log.admin}</div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4, fontFamily: "monospace" }}>
                    {JSON.stringify(log.details)}
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}

      {tab === "pending" && (
        <>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.4 }}>
            Transactions VTPass has accepted (wallet charged) but hasn't confirmed as delivered yet. Sorted oldest first — anything sitting here a while is worth checking directly with VTPass.
          </p>
          {loading ? (
            <div>Loading…</div>
          ) : pendingTx.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>Nothing pending — all clear</div>
          ) : (
            pendingTx.map((t) => <OrderCard key={t._id} t={t} busy={busyId === t._id} onRecheck={recheckOrder} onRefund={refundOrder} onRetryRefund={retryRefund} showToast={showToast} />            )
          )}
        </>
      )}

      {tab === "ledger" && (
        loading ? <div>Loading…</div> : (
          <>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.4 }}>
              Customers who paid Pi but got nothing, and every refund sent. "Needs refund" are failed orders with no refund yet — check each one is really undelivered first.
            </p>
            <div style={{ fontWeight: 700, fontSize: 14, margin: "0 0 8px" }}>Needs refund ({ledger.needs.length})</div>
            {ledger.needs.length === 0 ? <div style={{ color: "var(--text-secondary)", marginBottom: 16 }}>None — all clear</div>
              : ledger.needs.map((t) => <OrderCard key={t._id} t={t} busy={busyId === t._id} onRecheck={recheckOrder} onRefund={refundOrder} onRetryRefund={retryRefund} showToast={showToast} />)}
            <div style={{ fontWeight: 700, fontSize: 14, margin: "16px 0 8px" }}>Refunds ({ledger.refunds.length})</div>
            {ledger.refunds.length === 0 ? <div style={{ color: "var(--text-secondary)" }}>No refunds yet</div>
              : ledger.refunds.map((t) => <OrderCard key={t._id} t={t} busy={busyId === t._id} onRecheck={recheckOrder} onRefund={refundOrder} onRetryRefund={retryRefund} showToast={showToast} />)}
          </>
        )
      )}

      {tab === "ai" && (
        <>
          {aiStatus && (
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>AI key: <b style={{ color: aiStatus.keyPresent ? "#16a34a" : "#dc2626" }}>{aiStatus.keyPresent ? `set ${aiStatus.keyHint} (${aiStatus.keySource === "admin" ? "saved here" : "from Render"}, ${aiStatus.model})` : "not set yet"}</b></div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input type="password" autoComplete="off" value={aiKeyInput} onChange={(e) => setAiKeyInput(e.target.value)} placeholder={aiStatus.keyPresent ? "Paste a new key to replace it" : "Paste your Anthropic key (sk-ant-…)"} style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13 }} />
                <button disabled={aiKeyBusy || !aiKeyInput.trim()} onClick={saveAiKey} style={{ padding: "0 14px", borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer", opacity: aiKeyInput.trim() ? 1 : 0.5 }}>{aiKeyBusy ? "Testing…" : "Save"}</button>
              </div>
              {aiStatus.keySource === "admin" && <button onClick={removeAiKey} style={{ background: "none", border: "none", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 10 }}>Remove saved key</button>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>"Ask Zappi" for customers: <b>{aiStatus.customerEnabled ? "ON" : "OFF"}</b></span>
                <button onClick={toggleCustomerAi} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--primary)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{aiStatus.customerEnabled ? "Switch off" : "Switch on"}</button>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Daily limit per customer</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={aiLimit} onChange={(e) => setAiLimit(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" style={{ width: 80, padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 15 }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>questions a day</span>
                  <button onClick={saveAiLimit} style={{ marginLeft: "auto", padding: "10px 14px", borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}>Save</button>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>Resets at midnight (Lagos time). 0 means no questions are allowed. Today: {aiStatus.usageToday?.messages ?? 0} questions from {aiStatus.usageToday?.customers ?? 0} customers.</div>
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.4 }}>
            The assistant reads your orders and tickets and explains or drafts. It can never refund or change anything. Customer phone numbers are partly hidden before they reach it.
          </p>
          <button disabled={aiBusy} onClick={() => runAi({ task: "summary" })} style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>📋 Brief me on today</button>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Draft a reply to a support ticket</div>
            <select value={aiTicket} onChange={(e) => setAiTicket(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", marginBottom: 8 }}>
              <option value="">Choose a ticket…</option>
              {tickets.filter((t) => t.status === "open").map((t) => <option key={t._id} value={t._id}>@{t.username || "user"} — {t.subject}</option>)}
            </select>
            <button disabled={aiBusy || !aiTicket} onClick={() => runAi({ task: "reply", ticketId: aiTicket })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--primary)", fontWeight: 700, cursor: "pointer", opacity: aiTicket ? 1 : 0.5 }}>✍️ Draft reply</button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (aiQ.trim()) runAi({ task: "ask", question: aiQ }); }} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={aiQ} onChange={(e) => setAiQ(e.target.value)} placeholder="Ask about orders, e.g. why did MTN data fail today?" style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13 }} />
            <button type="submit" disabled={aiBusy} style={{ padding: "0 14px", borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}>Ask</button>
          </form>
          {aiBusy && <div style={{ color: "var(--text-secondary)" }}>Thinking…</div>}
          {aiOut && (
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14 }}>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5 }}>{aiOut}</div>
              <button onClick={() => navigator.clipboard.writeText(aiOut).then(() => showToast("Copied", "success")).catch(() => showToast("Couldn't copy", "danger"))} style={{ marginTop: 10, background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", padding: 0 }}>Copy</button>
            </div>
          )}
        </>
      )}

      {tab === "promos" && (
        <>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.4 }}>
            A code takes a % off the customer's Pi price. The discount comes out of your own margin and VTPass commission, so keep it small and capped. The server checks every code at payment time, so it can't be faked.
          </p>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            {(() => {
              const inp = { width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13 };
              const lbl = { fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", margin: "8px 0 3px", display: "block" };
              const set = (k) => (e) => setPf({ ...pf, [k]: e.target.value });
              return (
                <>
                  <label style={lbl}>Code</label><input style={inp} value={pf.code} onChange={(e) => setPf({ ...pf, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) })} placeholder="WELCOME5" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div><label style={lbl}>Percent off (1–20)</label><input style={inp} inputMode="decimal" value={pf.percent} onChange={set("percent")} /></div>
                    <div><label style={lbl}>Max ₦ off per purchase</label><input style={inp} inputMode="numeric" value={pf.maxDiscountNGN} onChange={set("maxDiscountNGN")} /></div>
                    <div><label style={lbl}>Total uses (0 = unlimited)</label><input style={inp} inputMode="numeric" value={pf.maxUses} onChange={set("maxUses")} /></div>
                    <div><label style={lbl}>Uses per customer</label><input style={inp} inputMode="numeric" value={pf.perUserLimit} onChange={set("perUserLimit")} /></div>
                  </div>
                  <label style={lbl}>Works on</label>
                  <select style={inp} value={pf.service} onChange={set("service")}>
                    <option value="">All services</option>
                    {["airtime", "data", "electricity", "cable", "internet", "education", "showmax"].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <label style={lbl}>Expires (optional)</label><input style={inp} type="date" value={pf.expiresAt} onChange={set("expiresAt")} />
                  <button onClick={async () => {
                    const ok = await savePromo({ code: pf.code, percent: Number(pf.percent), maxDiscountNGN: Number(pf.maxDiscountNGN), maxUses: Number(pf.maxUses), perUserLimit: Number(pf.perUserLimit), services: pf.service ? [pf.service] : [], expiresAt: pf.expiresAt || null });
                    if (ok) setPf({ ...pf, code: "" });
                  }} style={{ width: "100%", marginTop: 12, padding: 12, borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}>Save code</button>
                </>
              );
            })()}
          </div>
          {loading ? <div>Loading…</div> : promos.length === 0 ? <div style={{ color: "var(--text-secondary)" }}>No promo codes yet</div> : promos.map((p) => (
            <div key={p.code} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10, opacity: p.active ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b style={{ fontSize: 15, letterSpacing: 1 }}>{p.code}</b>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: p.active ? "#DCFCE7" : "#E5E7EB", color: p.active ? "#166534" : "#374151" }}>{p.active ? "active" : "off"}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0" }}>
                {p.percent}% off, up to ₦{p.maxDiscountNGN} · {p.services?.length ? p.services.join(", ") : "all services"} · {p.perUserLimit || "unlimited"} use(s) per customer{p.expiresAt ? ` · expires ${new Date(p.expiresAt).toLocaleDateString()}` : ""}
              </div>
              <div style={{ fontSize: 12, margin: "0 0 10px" }}>Used {p.usedCount}{p.maxUses ? ` of ${p.maxUses}` : ""} times · discount given ₦{Number(p.discountGivenNGN).toLocaleString()}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => savePromo({ ...p, active: !p.active })} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--primary)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{p.active ? "Switch off" : "Switch on"}</button>
                <button onClick={() => deletePromo(p.code)} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "rate" && (
        loading && !rateInfo ? <div>Loading…</div> : !rateInfo ? (
          <div style={{ color: "#dc2626", fontSize: 13 }}>No live rate is available right now, so customers cannot pay. <button onClick={loadRate} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Try again</button></div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <StatCard label="Customers pay per π" value={`₦${Number(rateInfo.rate.ngnPerPi).toLocaleString()}`} />
              <StatCard label="Market rate per π" value={`₦${Number(rateInfo.rate.market).toLocaleString()}`} />
              <StatCard label="π price (USD)" value={`$${Number(rateInfo.rate.piUsd).toFixed(4)}`} />
              <StatCard label="Dollar rate (₦)" value={`₦${Number(rateInfo.rate.usdNgn).toLocaleString()}`} />
            </div>
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Price sources (the middle value is used)</div>
              {Object.entries(rateInfo.rate.sources || {}).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ textTransform: "capitalize" }}>{k}</span>
                  <b style={{ color: v ? "var(--text-primary)" : "#dc2626" }}>{v ? `$${Number(v).toFixed(4)}` : "unavailable"}</b>
                </div>
              ))}
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8 }}>
                Updated {new Date(rateInfo.rate.updatedAt).toLocaleTimeString()}{rateInfo.usdNgnFixed ? " · dollar rate is fixed by you on Render" : ""}
              </div>
            </div>
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Your margin</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.4 }}>
                Customers get this % less naira per π than the market rate. It is your protection against the price moving while an order is processed. Currently {(rateInfo.rate.spread * 100).toFixed(2)}% (set by {rateInfo.spreadSource}).
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={spreadInput} onChange={(e) => setSpreadInput(e.target.value)} inputMode="decimal" style={{ width: 90, padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 15 }} />
                <span style={{ alignSelf: "center" }}>%</span>
                <button onClick={saveSpread} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}>Save margin</button>
              </div>
            </div>
            <button onClick={() => rateAction("refresh", null, "Rate refreshed")} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Refresh rate now</button>
          </>
        )
      )}

      {tab === "notices" && (
        <>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.4 }}>
            Tell customers when a service has a problem. A blocking notice stops purchases of that service (customers see your message instead of paying for something that will fail). Customers see changes within about 2 minutes.
          </p>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <select value={nKey} onChange={(e) => setNKey(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", marginBottom: 8 }}>
              {NOTICE_SERVICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input value={nMsg} onChange={(e) => setNMsg(e.target.value.slice(0, 240))} placeholder="e.g. MTN data is down at the provider. Back soon."
              style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", marginBottom: 8 }} />
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 10 }}>
              <input type="checkbox" checked={nBlock} onChange={(e) => setNBlock(e.target.checked)} /> Block purchases while this is on
            </label>
            <button onClick={() => { if (!nMsg.trim()) return showToast("Write a message first", "danger"); saveNotice({ key: nKey, label: noticeName(nKey), message: nMsg, blocking: nBlock, active: true }).then(() => setNMsg("")); }}
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}>Publish notice</button>
          </div>
          {loading ? <div>Loading…</div> : noticeList.length === 0 ? <div style={{ color: "var(--text-secondary)" }}>No notices — everything is running normally</div> : noticeList.map((n) => (
            <div key={n.key} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10, opacity: n.active ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b style={{ fontSize: 14 }}>{noticeName(n.key)}</b>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: n.blocking ? "#FEE2E2" : "#FEF3C7", color: n.blocking ? "#991B1B" : "#92400E" }}>{n.blocking ? "blocks purchases" : "notice only"}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", margin: "6px 0 10px" }}>{n.message}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => saveNotice({ ...n, active: !n.active })} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--primary)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{n.active ? "Switch off" : "Switch on"}</button>
                <button onClick={() => deleteNotice(n.key)} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Remove</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "golive" && (
        loading || !golive ? <div>Checking everything… (up to 20 seconds)</div> : (
          <>
            <div style={{ padding: 14, borderRadius: 12, marginBottom: 12, fontWeight: 700, background: golive.summary === "ok" ? "#DCFCE7" : golive.summary === "warn" ? "#FEF3C7" : "#FEE2E2", color: golive.summary === "ok" ? "#166534" : golive.summary === "warn" ? "#92400E" : "#991B1B" }}>
              {golive.summary === "ok" ? "🟢 All good — ready for customers" : golive.summary === "warn" ? "🟡 Working, but a few things need attention" : "🔴 Something is broken — fix the red items"}
            </div>
            {golive.checks.map((c) => (
              <div key={c.key} style={{ display: "flex", gap: 10, background: "var(--bg-secondary)", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{c.status === "ok" ? "🟢" : c.status === "warn" ? "🟡" : "🔴"}</span>
                <div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.label}</div><div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{c.detail}</div></div>
              </div>
            ))}
            <button onClick={loadGolive} style={{ marginTop: 8, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Run again</button>
          </>
        )
      )}

      {tab === "money" && (
        loading || !money ? <div>Checking…</div> : (
          <>
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>VTPass wallet</div>
              {money.vtpass?.ok ? (
                <div style={{ fontSize: 22, fontWeight: 700, color: money.vtpass.balance < 5000 ? "#dc2626" : "var(--text-primary)" }}>
                  ₦{Number(money.vtpass.balance).toLocaleString()}{money.vtpass.balance < 5000 ? "  ⚠ low — top up" : ""}
                </div>
              ) : <div style={{ color: "#dc2626", fontSize: 13 }}>Could not read the balance: {money.vtpass?.error || "unknown"}</div>}
            </div>
            {money.pi && (
              <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Pi in and out</div>
                {[["Received for delivered orders", `π${money.pi.receivedForDelivered.toFixed(4)}`], ["Held for processing orders", `π${money.pi.heldPending.toFixed(4)}`],
                  [`Paid but failed (${money.pi.failedPaidCount})`, `π${money.pi.failedPaid.toFixed(4)}`], ["Already refunded", `π${money.pi.refunded.toFixed(4)}`],
                  ["Still owed to customers", `π${money.pi.owedToCustomers.toFixed(4)}`], ["Delivered value", `₦${Number(money.pi.deliveredNGN).toLocaleString()}`],
                  ["VTPass commission earned", `₦${Number(money.pi.commissionNGN).toLocaleString()}`]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}><span style={{ color: "var(--text-secondary)" }}>{k}</span><b>{v}</b></div>
                ))}
              </div>
            )}
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>Pi rate: <b>{money.rate ? `₦${Number(money.rate).toFixed(2)} per π` : "not available"}</b></div>
              <div>Automatic refunds: <b style={{ color: money.refundsEnabled ? "#16a34a" : "#d97706" }}>{money.refundsEnabled ? "ON" : "OFF"}</b></div>
            </div>
            <button onClick={loadMoney} style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Refresh</button>
          </>
        )
      )}

      {tab === "customers" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); loadCustomers(custQ); }} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={custQ} onChange={(e) => setCustQ(e.target.value)} placeholder="Search Pi username"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13 }} />
            <button type="submit" style={{ padding: "0 14px", borderRadius: 10, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}>Search</button>
          </form>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>{customers.total} customers in total · showing the latest 100</div>
          {loading ? <div>Loading…</div> : customers.customers.map((c) => (
            <div key={c._id} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>@{c.piUsername || "unknown"}{c.isAdmin ? " · admin" : ""}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0" }}>{c.orders} orders · ₦{Number(c.spentNGN).toLocaleString()} spent{c.failed ? ` · ${c.failed} failed` : ""}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Joined {new Date(c.createdAt).toLocaleDateString()} · last seen {c.lastLogin ? new Date(c.lastLogin).toLocaleDateString() : "—"}</div>
            </div>
          ))}
        </>
      )}

      <ConfirmModal state={confirmState} onCancel={() => setConfirmState(null)} />
    </div>
  );
}
