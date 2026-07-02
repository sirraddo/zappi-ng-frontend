import { useState, useEffect } from "react"
import {
  verifyTxnPin, setTxnPin, hasServerPin,
  confirmWithPasskey, registerPasskey, hasPasskey, webauthnSupported,
} from "./hooks/useTxnConfirmation"

const C = {
  primary: "#6C3AED",
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
async function piLogin(onSuccess) {
  dbg("1: piLogin started");

  if (typeof window.Pi === "undefined") {
    alert("Pi login works inside the Pi Browser app. Open this site in Pi Browser to continue.");
    return;
  }
  dbg("2: Pi SDK present");

  try {
    window.Pi.init({ version: "2.0", sandbox: import.meta.env.VITE_PI_SANDBOX === "true" });
    dbg("3: init called, authenticating…");

    const auth = await Promise.race([
      window.Pi.authenticate(["username"], (payment) => {
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
      alert("Pi verification failed. Please try again.");
    }
  } catch (e) {
    alert("PI ERROR: " + (e?.message || "unknown error"));
  }
}

// ── PIN DOTS ──────────────────────────────────────────────────────────────────
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

// ── PIN PAD ───────────────────────────────────────────────────────────────────
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

// ── SPLASH SCREEN ─────────────────────────────────────────────────────────────
export function SplashScreen({ onContinue, onSuccess }) {
  const [busy, setBusy] = useState(false)

  async function handlePi() {
    setBusy(true)
    await piLogin(onSuccess)
    setBusy(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${C.primary} 0%,#9F67F5 60%,#C4B5FD 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 90, height: 90, borderRadius: 28, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, marginBottom: 20, backdropFilter: "blur(10px)", border: "2px solid rgba(255,255,255,0.3)" }}>⚡</div>
      <h1 style={{ color: "white", fontSize: 36, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-1px" }}>Zappi NG</h1>
      <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, margin: "0 0 60px", textAlign: "center", lineHeight: 1.5 }}>Pay bills. Send Pi. Live better.</p>
      <button onClick={handlePi} disabled={busy} style={{ width: "100%", maxWidth: 320, background: "rgba(255,255,255,1)", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 800, color: C.primary, cursor: busy ? "default" : "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", marginBottom: 16, opacity: busy ? 0.8 : 1 }}>
        {busy ? "Connecting…" : "⚡ Continue with Pi"}
      </button>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 24, textAlign: "center" }}>Powered by Pi Network · Made for Nigerians 🇳🇬</p>
    </div>
  )
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export function LoginScreen({ onSuccess }) {
  const [busy, setBusy] = useState(false)

  async function handlePi() {
    setBusy(true)
    await piLogin(onSuccess)
    setBusy(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${C.primary} 0%,#9F67F5 60%,#C4B5FD 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 90, height: 90, borderRadius: 28, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, marginBottom: 20, backdropFilter: "blur(10px)", border: "2px solid rgba(255,255,255,0.3)" }}>⚡</div>
      <h1 style={{ color: "white", fontSize: 36, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-1px" }}>Welcome back</h1>
      <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, margin: "0 0 60px", textAlign: "center", lineHeight: 1.5 }}>Sign in with Pi Network to continue</p>
      <button onClick={handlePi} disabled={busy} style={{ width: "100%", maxWidth: 320, background: "white", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 800, color: C.primary, cursor: busy ? "default" : "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", marginBottom: 16, opacity: busy ? 0.8 : 1 }}>
        {busy ? "Connecting…" : "⚡ Continue with Pi"}
      </button>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 24, textAlign: "center" }}>Powered by Pi Network · Made for Nigerians 🇳🇬</p>
    </div>
  )
}

// ── TRANSACTION PIN MODAL ─────────────────────────────────────────────────────
// Server-verified: the PIN (or a passkey assertion) is checked by the backend,
// which returns a single-use confirmation token bound to `txnFields`. That
// token is passed to onSuccess and is what /api/payments/complete requires.
export function TxnPinModal({ onSuccess, onCancel, label = "Confirm Payment", txnFields = {} }) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const passkeyReady = hasPasskey()

  // Functional update -- never drops a tap, even when typed faster than React re-renders.
  const handlePress = (d) => setPin(prev => (prev.length < 6 && !busy ? prev + d : prev))

  // Verify once all 6 digits are committed (reads real state, not a stale closure).
  useEffect(() => {
    if (pin.length !== 6) { if (pin.length === 0) setError(""); return }
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

  async function usePasskey() {
    if (busy) return
    setBusy(true); setError("")
    try {
      onSuccess(await confirmWithPasskey(txnFields))
    } catch (e) {
      setError(e.status ? e.message : (e.message || "Passkey confirmation failed"))
      setBusy(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: "var(--card-bg)", borderRadius: "24px 24px 0 0", padding: "24px 20px calc(env(safe-area-inset-bottom, 0px) + 40px)" }}>
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
        {passkeyReady && (
          <button onClick={usePasskey} disabled={busy} style={{ width: "100%", marginTop: 16, background: "none", border: `1.5px solid ${C.primary}`, borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 700, color: C.primary, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
            👆 Use passkey instead
          </button>
        )}
      </div>
    </div>
  )
}

// ── PROFILE SCREEN ────────────────────────────────────────────────────────────
// ── CHANGE / SET PIN FLOW (login = 4-digit, txn = 6-digit) ────────────────────
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
    if (entry.length !== len) { if (entry.length === 0) setError(""); return }
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

  const press = (d) => setEntry(p => (p.length < len ? p + d : p))
  const del = () => { setError(""); setEntry(p => p.slice(0, -1)) }

  const wrap = { minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }

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

export function ProfileScreen({ onBack, onLogout }) {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("zappi_user") || "{}"))
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(user)
  const [saved, setSaved] = useState(false)
  const [section, setSection] = useState(null)
  const [passkeyDone, setPasskeyDone] = useState(() => hasPasskey())
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const [passkeyError, setPasskeyError] = useState("")
  async function addPasskey() {
    if (passkeyBusy) return
    setPasskeyBusy(true); setPasskeyError("")
    try {
      await registerPasskey("This device")
      setPasskeyDone(true)
    } catch (e) {
      // 409 = this authenticator is already registered — treat as enabled
      if (e.status === 409) { localStorage.setItem("zappi_has_passkey", "1"); setPasskeyDone(true) }
      else if (e.name === "NotAllowedError" || e.name === "AbortError") { /* user cancelled — no error shown */ }
      else if (e.name === "NotSupportedError" || e.name === "SecurityError") {
        setPasskeyError("This device or browser can't set up a passkey. Your transaction PIN still keeps payments secure.")
      } else setPasskeyError(e.message || "Couldn't add a passkey right now. Please try again.")
    } finally { setPasskeyBusy(false) }
  }
  const save = () => {
    localStorage.setItem("zappi_user", JSON.stringify(form))
    setUser(form); setEditing(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const avatars = ["😊", "👨🏾", "👩🏾", "🦁", "⚡", "🔥", "💎", "🎯", "🚀", "🦅"]

  const stats = [
    { label: "Transactions", value: "24" },
    { label: "Pi Sent", value: "π45.5" },
    { label: "Saved", value: "₦12k" },
  ]

  if (section === "changeTxnPin") return <ChangePinFlow kind="txn" onBack={() => setSection(null)} />

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ background: `linear-gradient(135deg,${C.primary},#9F67F5)`, padding: "calc(env(safe-area-inset-top, 0px) + 48px) 20px 32px", textAlign: "center" , position: "relative" }}>
        <button onClick={onBack} style={{ position: "absolute", left: 16, top: 40, background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>←</button>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 12px", border: "3px solid rgba(255,255,255,0.4)" }}>{user.avatar || "⚡"}</div>
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
          {[
            { icon: "🔑", label: "Change Transaction PIN", sub: "Update your 6-digit payment PIN", action: () => setSection("changeTxnPin") },
            ...(webauthnSupported() ? [{
              icon: "👆",
              label: passkeyDone ? "Passkey enabled" : "Add a Passkey",
              sub: passkeyDone ? "Confirm payments with Face ID / fingerprint" : "Approve payments with Face ID, fingerprint, or your device PIN",
              action: addPasskey,
            }] : []),
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{ width: "100%", background: "none", border: "none", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderRadius: 12, textAlign: "left" }}>
              <span style={{ fontSize: 22, width: 36, textAlign: "center" }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>{item.sub}</p>
              </div>
              <span style={{ color: "var(--text-tertiary)", fontSize: 18 }}>›</span>
            </button>
          ))}
          {passkeyError && (
            <div style={{ margin: "4px 14px 12px", display: "flex", alignItems: "flex-start", gap: 8, background: "#FEE2E2", borderRadius: 10, padding: "10px 12px" }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <p style={{ margin: 0, fontSize: 12, color: "#991B1B", lineHeight: 1.5 }}>{passkeyError}</p>
            </div>
          )}
          {!webauthnSupported() && (
            <div style={{ margin: "4px 14px 12px", display: "flex", alignItems: "flex-start", gap: 8, background: "#FEF9C3", borderRadius: 10, padding: "10px 12px" }}>
              <span style={{ fontSize: 14 }}>ℹ️</span>
              <p style={{ margin: 0, fontSize: 12, color: "#854D0E", lineHeight: 1.5 }}>Passkeys aren't supported in this browser — your transaction PIN keeps payments protected.</p>
            </div>
          )}
        </div>

        <button onClick={onLogout} style={{ width: "100%", background: "#FEE2E2", color: C.danger, border: "none", borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  )
}

