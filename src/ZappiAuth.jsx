import { useState, useEffect } from "react"
import {
  verifyTxnPin, setTxnPin, hasServerPin,
} from "./hooks/useTxnConfirmation"

const C = {
  primary: "#CC4E00",
  light: "var(--primary-light)",
  success: "#22C55E",
  danger: "#EF4444",
  bg: "var(--bg-secondary)",
}

function isPiBrowser() {
  const ua = navigator.userAgent || ""
  return /PiBrowser|pi-browser|Pi Network|PiNetwork/i.test(ua) ||
    window.location.hostname.includes("minepi.com") 
}

const API_URL = import.meta.env.VITE_API_URL || "https://zappi-ng-backend.onrender.com"
function dbg(msg) {
  // On-screen debug overlay removed; keep console logging only.
  try { console.log("[pi]", msg); } catch (_) {}
  const old = document.getElementById("pi-debug");
  if (old) old.remove();
}
// The Pi SDK script loads asynchronously (see usePiNetwork.js) — checking
// window.Pi the instant the button is tapped raced against that load and
// intermittently claimed "not in Pi Browser" even when genuinely inside
// it, just because the script hadn't finished loading yet. This polls for
// up to 6s before concluding it's truly absent.
function waitForPiSdk(timeoutMs = 6000, intervalMs = 150) {
  return new Promise((resolve) => {
    if (typeof window.Pi !== "undefined") { resolve(true); return; }
    const start = Date.now();
    const t = setInterval(() => {
      if (typeof window.Pi !== "undefined") {
        clearInterval(t);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(t);
        resolve(false);
      }
    }, intervalMs);
  });
}

async function piLogin(onSuccess, onMessage) {
  dbg("1: piLogin started");

  const piAvailable = await waitForPiSdk();
  if (!piAvailable) {
    onMessage?.("Pi login works inside the Pi Browser app. Open this site in Pi Browser to continue.");
    return;
  }
  dbg("2: Pi SDK present");

  try {
    window.Pi.init({ version: "2.0", sandbox: import.meta.env.VITE_PI_SANDBOX === "true" });
    dbg("3: init called, authenticating…");

    const auth = await Promise.race([
      window.Pi.authenticate(["username", "payments", "wallet_address"], (payment) => {
        console.log("incomplete payment", payment);
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("Pi.authenticate timed out (30s)")), 30000)),
    ]);
    dbg("4: authenticated as " + (auth?.user?.username || "unknown"));

    const res = await fetch(`${API_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: auth.accessToken }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("zappi_token", data.token);
      onSuccess?.(data);
    } else {
      onMessage?.("Pi verification failed. Please try again.");
    }
  } catch (e) {
    onMessage?.(e?.message || "Something went wrong signing in. Please try again.");
  }
}

// -- PIN DOTS --
function PinDots({ value, length, error }) {
  return (
    <div style={{ display: "flex", gap: 16, justifyContent: "center", margin: "28px 0 8px" }}>
      {Array.from({ length }).map((_, i) => (
        <div key={i} style={{
          width: 18, height: 18, borderRadius: "50%", transition: "all 0.2s",
          background: error ? C.danger : i < value.length ? C.primary : "transparent",
          border: `2.5px solid ${error ? C.danger : i < value.length ? C.primary : "rgba(124,124,140,0.65)"}`,
          transform: error ? "scale(1.3)" : "scale(1)"
        }} />
      ))}
    </div>
  )
}

// -- PIN PAD --
function PinPad({ onPress, onDelete }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, maxWidth: 280, margin: "16px auto 0" }}>
      {keys.map((k, i) => (
        <button key={i} onClick={() => k === "⌫" ? onDelete() : k ? onPress(k) : null} disabled={!k}
          style={{
            height: 62, borderRadius: 14,
            border: k && k !== "⌫" ? "1px solid rgba(124,124,140,0.30)" : "none",
            background: k === "⌫" ? "#FEE2E2" : k ? "rgba(124,124,140,0.16)" : "transparent",
            color: k === "⌫" ? C.danger : "var(--text-primary)",
            fontSize: k === "⌫" ? 20 : 24, fontWeight: 700, cursor: k ? "pointer" : "default",
            boxShadow: k ? "0 2px 8px rgba(0,0,0,0.08)" : "none", transition: "transform 0.1s"
          }}
          onMouseDown={e => k && (e.currentTarget.style.transform = "scale(0.93)")}
          onMouseUp={e => k && (e.currentTarget.style.transform = "scale(1)")}>{k}</button>
      ))}
    </div>
  )
}

// -- AUTH MESSAGE MODAL --
// Replaces raw alert() popups for Pi login errors — those render as an
// unstyled native browser dialog with zero branding.
function AuthMessageModal({ text, onClose }) {
  if (!text) return null
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 18, padding: 24, maxWidth: 340, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, color: "#1F2937", lineHeight: 1.5, marginBottom: 20 }}>{text}</div>
        <button onClick={onClose} style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: C.primary, color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Got it</button>
      </div>
    </div>
  )
}

// -- SPLASH SCREEN --
export function SplashScreen({ onContinue, onSuccess }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function handlePi() {
    setBusy(true)
    await piLogin(onSuccess, setMessage)
    setBusy(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${C.primary} 0%,#FF7A33 60%,#FFCBA3 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 90, height: 90, borderRadius: 28, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, marginBottom: 20, backdropFilter: "blur(10px)", border: "2px solid rgba(255,255,255,0.3)", fontWeight:800 }}>Z</div>
      <h1 style={{ color: "white", fontSize: 36, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-1px" }}>Zappi NG</h1>
      <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, margin: "0 0 60px", textAlign: "center", lineHeight: 1.5 }}>Pay bills. Send Pi. Live better.</p>
      <button onClick={handlePi} disabled={busy} style={{ width: "100%", maxWidth: 320, background: "rgba(255,255,255,1)", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 800, color: C.primary, cursor: busy ? "default" : "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", marginBottom: 16, opacity: busy ? 0.8 : 1 }}>
        {busy ? "Connecting…" : "⚡ Continue with Pi"}
      </button>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 24, textAlign: "center" }}>Powered by Pi Network · Made for Nigerians 🇳🇬</p>
      <AuthMessageModal text={message} onClose={() => setMessage(null)} />
    </div>
  )
}

// -- LOGIN --
export function LoginScreen({ onSuccess }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function handlePi() {
    setBusy(true)
    await piLogin(onSuccess, setMessage)
    setBusy(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${C.primary} 0%,#FF7A33 60%,#FFCBA3 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 90, height: 90, borderRadius: 28, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, marginBottom: 20, backdropFilter: "blur(10px)", border: "2px solid rgba(255,255,255,0.3)", fontWeight:800 }}>Z</div>
      <h1 style={{ color: "white", fontSize: 36, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-1px" }}>Welcome back</h1>
      <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, margin: "0 0 60px", textAlign: "center", lineHeight: 1.5 }}>Sign in with Pi Network to continue</p>
      <button onClick={handlePi} disabled={busy} style={{ width: "100%", maxWidth: 320, background: "white", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 800, color: C.primary, cursor: busy ? "default" : "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", marginBottom: 16, opacity: busy ? 0.8 : 1 }}>
        {busy ? "Connecting…" : "⚡ Continue with Pi"}
      </button>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 24, textAlign: "center" }}>Powered by Pi Network · Made for Nigerians 🇳🇬</p>
      <AuthMessageModal text={message} onClose={() => setMessage(null)} />
    </div>
  )
}

// -- TRANSACTION PIN MODAL --
// Server-verified: the PIN is checked by the backend, which returns a
// single-use confirmation token bound to `txnFields`. That token is passed
// to onSuccess and is what /api/payments/complete requires.
export function TxnPinModal({ onSuccess, onCancel, label = "Confirm Payment", txnFields = {} }) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  // Clears any old error as soon as the user presses a new digit (i.e. is
  // actively retrying) -- NOT automatically whenever pin becomes empty, since
  // our own wrong-PIN handler below also resets pin to "" and would otherwise
  // wipe its own message out again on the very next render (this was the
  // "silent restart" bug: the error appeared and was erased in the same
  // tick, so it never actually painted on screen).
  // Functional update on pin itself -- never drops a tap, even when typed
  // faster than React re-renders.
  const handlePress = (d) => {
    if (error) setError("")
    setPin(prev => (prev.length < 6 && !busy ? prev + d : prev))
  }

  // Verify once all 6 digits are committed (reads real state, not a stale closure).
  useEffect(() => {
    if (pin.length !== 6) return
    let cancelled = false
    setBusy(true)
    verifyTxnPin(pin, txnFields)
      .then(token => { if (!cancelled) onSuccess(token) })
      .catch(e => {
        if (cancelled) return
        // Server messages cover wrong PIN (401), lockout countdown (429), no PIN set (400)
        setError(e.status ? e.message : "Network error — check your connection and try again")
        setPin("")
        setBusy(false)
      })
    return () => { cancelled = true }
  }, [pin])

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: "var(--card-bg)", borderRadius: "24px 24px 0 0", padding: "24px 20px max(48px, calc(env(safe-area-inset-bottom, 0px) + 24px))" }}>
        <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{label}</h3>
          <button onClick={onCancel} style={{ background: "#f0f0f0", border: "none", borderRadius: 50, width: 32, height: 32, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-tertiary)" }}>
          {busy ? "Verifying…" : "Enter your 6-digit transaction PIN to proceed"}
        </p>
        <PinDots value={pin} length={6} error={!!error} />
        {error && <p style={{ color: C.danger, fontSize: 13, fontWeight: 600, margin: "0 0 8px", textAlign: "center" }}>{error}</p>}
        <PinPad onPress={handlePress} onDelete={() => { setError(""); setPin(p => p.slice(0, -1)) }} />
      </div>
    </div>
  )
}

// -- PROFILE SCREEN --
// -- CHANGE / SET PIN FLOW (login = 4-digit, txn = 6-digit) --
export function ChangePinFlow({ kind = "txn", forceSetup = false, onBack, onDone, subtitle }) {
  const isLogin = kind === "login"
  const len = isLogin ? 4 : 6
  const storageKey = isLogin ? "zappi_login_pin" : null // txn PIN is server-side only — never stored on-device
  const title = isLogin ? "Login PIN" : "Transaction PIN"
  const changing = (isLogin ? !!localStorage.getItem(storageKey) : hasServerPin()) && !forceSetup
  const [stage, setStage] = useState(changing ? "current" : "new") // current | new | confirm
  const [entry, setEntry] = useState("")
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (entry.length !== len) return
    let cancelled = false
    const t = setTimeout(async () => {
      if (stage === "current") {
        if (isLogin) {
          if (entry === localStorage.getItem(storageKey)) { setStage("new"); setEntry(""); setError("") }
          else { setError("Incorrect current PIN"); setEntry("") }
          return
        }
        // Server-verify the current txn PIN (uses a sentinel txn binding; the
        // issued token is discarded). Wrong entries count toward the lockout.
        setBusy(true)
        try {
          await verifyTxnPin(entry, { serviceID: "pin-change", billType: "pin-change" })
          if (!cancelled) { setStage("new"); setEntry(""); setError("") }
        } catch (e) {
          if (!cancelled) { setError(e.status ? e.message : "Network error — try again"); setEntry("") }
        } finally { if (!cancelled) setBusy(false) }
      } else if (stage === "new") {
        setDraft(entry); setStage("confirm"); setEntry(""); setError("")
      } else {
        if (entry !== draft) { setError("PINs didn't match. Start again."); setStage("new"); setDraft(""); setEntry(""); return }
        if (isLogin) { localStorage.setItem(storageKey, draft); setDone(true); return }
        setBusy(true)
        try {
          await setTxnPin(draft) // bcrypt-hashed server-side; also clears the legacy plaintext PIN
          if (!cancelled) setDone(true)
        } catch (e) {
          if (!cancelled) { setError(e.status ? e.message : "Couldn't save PIN — check your connection"); setStage("new"); setDraft(""); setEntry("") }
        } finally { if (!cancelled) setBusy(false) }
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [entry])

  // Clears any old error as soon as the user presses a new digit, rather than
  // automatically whenever entry becomes empty -- every error path above also
  // resets entry to "", which would otherwise immediately wipe out the very
  // error message it just set (the "silent restart" bug: message appears and
  // is erased in the same tick, so it never actually paints on screen).
  const press = (d) => { if (error) setError(""); setEntry(p => (p.length < len ? p + d : p)) }
  const del = () => { setError(""); setEntry(p => p.slice(0, -1)) }

  const wrap = { minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 24px max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))", textAlign: "center" }

  if (done) return (
    <div style={wrap}>
      <div style={{ fontSize: 56, marginBottom: 8 }}>✅</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800 }}>{title} {changing ? "updated" : "set"}!</h3>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)", maxWidth: 280 }}>
        {isLogin ? "Use this PIN to unlock the app." : "You'll enter this PIN to approve every payment."}
      </p>
      <button onClick={onDone || onBack} style={{ background: C.primary, color: "white", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Continue</button>
    </div>
  )

  const heading = stage === "current" ? `Enter current ${title}` : stage === "confirm" ? `Confirm new ${title}` : (changing ? `Enter new ${title}` : `Create your ${title}`)

  return (
    <div style={wrap}>
      {!forceSetup && <button onClick={onBack} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.primary, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 24 }}>← Back</button>}
      <div style={{ fontSize: 48, marginBottom: 12 }}>{isLogin ? "🔐" : "🔑"}</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800 }}>{heading}</h3>
      <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-secondary)", maxWidth: 300 }}>
        {busy ? "Verifying…" : subtitle && stage !== "confirm" ? subtitle : forceSetup && stage !== "confirm" ? `Secure your payments with a ${len}-digit PIN.` : `Enter your ${len}-digit ${title.toLowerCase()}.`}
      </p>
      <PinDots value={entry} length={len} error={!!error} />
      {error && <p style={{ color: C.danger, fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>{error}</p>}
      <PinPad onPress={press} onDelete={del} />
    </div>
  )
}

// Owner-only earnings card. It tries GET /api/payments/earnings, which the
// backend answers with 404 for every account except the one whose isAdmin
// flag was set manually in MongoDB. For regular users the fetch quietly
// fails and this renders nothing, so the section is invisible to them.
function OwnerEarnings() {
  const [data, setData] = useState(null)
  useEffect(() => {
    const token = localStorage.getItem("zappi_token")
    if (!token) return
    fetch(`${API_URL}/api/payments/earnings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && typeof d.earnedNGN === "number") setData(d) })
      .catch(() => { /* network error or non-admin — show nothing */ })
  }, [])
  if (!data) return null
  const fmt = n => `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`
  return (
    <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #FDE68A" }}>
      <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700 }}>👑 Owner earnings</p>
      <p style={{ margin: "0 0 12px", fontSize: 11, color: "#9CA3AF" }}>VTPass commission on successful payments — visible only to you</p>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#16A34A" }}>{fmt(data.earnedNGN)}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>Earned</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{fmt(data.volumeNGN)}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>Volume</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{data.count}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>Paid bills</p>
        </div>
      </div>
      {Array.isArray(data.byType) && data.byType.length > 0 && (
        <div style={{ marginTop: 12, borderTop: "1px solid #F3F4F6", paddingTop: 8 }}>
          {data.byType.map(b => (
            <div key={b._id || "other"} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
              <span style={{ color: "#6B7280", textTransform: "capitalize" }}>{b._id || "other"} · {b.count}</span>
              <span style={{ fontWeight: 700 }}>{fmt(b.earnedNGN)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ProfileScreen({ onBack, onLogout }) {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("zappi_user") || "{}"))
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(user)
  const [saved, setSaved] = useState(false)
  const [section, setSection] = useState(null)
  const save = () => {
    localStorage.setItem("zappi_user", JSON.stringify(form))
    setUser(form); setEditing(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const avatars = ["😊", "👨🏾", "👩🏾", "🦁", "⚡", "🔥", "💎", "🎯", "🚀", "🦅"]

  // -- Photo avatar (synced) --
  // Picked photo is cover-cropped to a 256px JPEG (~10-30KB) client-side, shown
  // immediately, cached in zappi_user, and uploaded to the backend so it follows
  // the account across devices. On mount we hydrate from GET /api/user/me.
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const authHdrs = () => {
    const token = localStorage.getItem("zappi_token")
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }
  useEffect(() => {
    let cancelled = false
    fetch(`${API_URL}/api/user/me`, { headers: authHdrs() })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d?.user?.avatarImage) return
        setUser(u => {
          const merged = { ...u, avatarImage: d.user.avatarImage }
          localStorage.setItem("zappi_user", JSON.stringify(merged))
          return merged
        })
      })
      .catch(() => { /* offline or endpoint not deployed yet — local cache still shows */ })
    return () => { cancelled = true }
  }, [])
  const pickAvatar = (e) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-picking the same file
    if (!file || !file.type.startsWith("image/")) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = async () => {
      URL.revokeObjectURL(url)
      const S = 256
      const canvas = document.createElement("canvas")
      canvas.width = S; canvas.height = S
      const ctx = canvas.getContext("2d")
      // cover-crop: scale the short side to S, center the long side
      const scale = S / Math.min(img.width, img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82)
      const merged = { ...user, avatarImage: dataUrl }
      setUser(merged); setForm(f => ({ ...f, avatarImage: dataUrl }))
      localStorage.setItem("zappi_user", JSON.stringify(merged))
      setUploadingAvatar(true)
      try {
        const res = await fetch(`${API_URL}/api/user/avatar`, { method: "POST", headers: authHdrs(), body: JSON.stringify({ avatarImage: dataUrl }) })
        if (!res.ok) throw new Error()
      } catch {
        alert("Photo saved on this device, but syncing to your account failed — it will still show here.")
      } finally { setUploadingAvatar(false) }
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  // Real numbers from the same localStorage ledger the rest of the app writes to
  // (App.jsx addTransaction → "zappi_txs"), replacing the hardcoded 24 / π45.5 / ₦12k
  // placeholders that never changed no matter how many payments were made.
  // "Pi Sent" and "Bills Paid" count successful outgoing transactions only
  // (received transfers and daily bonuses are excluded).
  const stats = (() => {
    let txs = []
    try { const s = JSON.parse(localStorage.getItem("zappi_txs")); if (Array.isArray(s)) txs = s } catch { /* corrupt or absent ledger — show zeros */ }
    const num = v => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0
    const paid = txs.filter(t => t.status === "success" && t.type !== "receive")
    const piSent = paid.reduce((a, t) => a + num(t.pi), 0)
    const ngnPaid = paid.reduce((a, t) => a + num(t.amount), 0)
    const compactNgn = n => n >= 1e6 ? `₦${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `₦${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `₦${Math.round(n)}`
    return [
      { label: "Transactions", value: String(txs.length) },
      { label: "Pi Sent", value: `π${piSent >= 100 ? Math.round(piSent).toLocaleString() : piSent.toFixed(1)}` },
      { label: "Bills Paid", value: compactNgn(ngnPaid) },
    ]
  })()

  if (section === "changeTxnPin") return <ChangePinFlow kind="txn" onBack={() => setSection(null)} />

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ background: `linear-gradient(135deg,${C.primary},#FF7A33)`, padding: "calc(env(safe-area-inset-top, 0px) + 48px) 20px 32px", textAlign: "center" , position: "relative" }}>
        <button onClick={onBack} style={{ position: "absolute", left: 16, top: 40, background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>←</button>
        <label style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 12px", border: "3px solid rgba(255,255,255,0.4)", cursor: "pointer", position: "relative", overflow: "visible" }}>
          {user.avatarImage ? <img src={user.avatarImage} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", opacity: uploadingAvatar ? 0.5 : 1 }} /> : (user.avatar || "⚡")}
          <span style={{ position: "absolute", bottom: -2, right: -2, width: 24, height: 24, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>📷</span>
          <input type="file" accept="image/*" onChange={pickAvatar} style={{ display: "none" }} />
        </label>
        <h2 style={{ color: "white", margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>{user.fullName || "User"}</h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>{user.email}</p>
      </div>

      <div style={{ display: "flex", gap: 0, margin: "0 16px", marginTop: -12, background: "var(--card-bg)", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: "16px 8px", textAlign: "center", borderRight: i < 2 ? "1px solid #F3F4F6" : "none" }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.primary }}>{s.value}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {saved && <div style={{ background: "#DCFCE7", borderRadius: 12, padding: 12, marginBottom: 12, textAlign: "center", color: "#166534", fontWeight: 600, fontSize: 13 }}>✓ Profile saved!</div>}

        <OwnerEarnings/>

        <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Personal Info</p>
            <button onClick={() => editing ? save() : setEditing(true)} style={{ background: editing ? C.primary : C.light, color: editing ? "white" : C.primary, border: "none", borderRadius: 10, padding: "6px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{editing ? "Save" : "Edit"}</button>
          </div>
          {editing && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 6px" }}>Avatar</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {avatars.map(a => (
                  <button key={a} onClick={() => setForm({ ...form, avatar: a })} style={{ width: 38, height: 38, borderRadius: 10, border: `2px solid ${form.avatar === a ? C.primary : "var(--border)"}`, background: form.avatar === a ? C.light : "var(--card-bg)", fontSize: 18, cursor: "pointer" }}>{a}</button>
                ))}
              </div>
            </div>
          )}
          {[{ key: "fullName", label: "Full Name" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }].map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{f.label}</p>
              {editing
                ? <input value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1.5px solid #E5E7EB", boxSizing: "border-box", fontSize: 14, outline: "none" }} />
                : <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{user[f.key] || "—"}</p>
              }
            </div>
          ))}
        </div>

        <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: 4, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", margin: "12px 14px 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Security</p>
          <button onClick={() => setSection("changeTxnPin")} style={{ width: "100%", background: "none", border: "none", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderRadius: 12, textAlign: "left" }}>
            <span style={{ fontSize: 22, width: 36, textAlign: "center" }}>🔑</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Change Transaction PIN</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>Update your 6-digit payment PIN</p>
            </div>
            <span style={{ color: "var(--text-tertiary)", fontSize: 18 }}>›</span>
          </button>
        </div>

        <button onClick={onLogout} style={{ width: "100%", background: "#FEE2E2", color: C.danger, border: "none", borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  )
}

