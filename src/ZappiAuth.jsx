import { useState, useEffect } from "react"

const C = {
  primary: "#6C3AED",
  light: "var(--primary-light)",
  success: "#22C55E",
  danger: "#EF4444",
  bg: "var(--bg-secondary)",
}

// ── MOBILE BROWSER DETECTOR ───────────────────────────────────────────────────
function isMobileBrowser() {
  const ua = navigator.userAgent || ""
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const isPiBrowser = /PiBrowser|pi-browser/i.test(ua)
  return isMobile && !isPiBrowser
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
          width: 16, height: 16, borderRadius: "50%", transition: "all 0.2s",
          background: error ? C.danger : i < value.length ? C.primary : "transparent",
          border: `2.5px solid ${error ? C.danger : i < value.length ? C.primary : "var(--border)"}`,
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
            height: 62, borderRadius: 14, border: "none",
            background: k === "⌫" ? "#FEE2E2" : k ? "var(--card-bg)" : "transparent",
            color: k === "⌫" ? C.danger : "#1a1a1a",
            fontSize: k === "⌫" ? 20 : 22, fontWeight: 700, cursor: k ? "pointer" : "default",
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
      <button onClick={() => onContinue("login")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 8 }}>
        Having trouble? Use email instead
      </button>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 24, textAlign: "center" }}>Powered by Pi Network · Made for Nigerians 🇳🇬</p>
    </div>
  )
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
export function RegisterScreen({ onSuccess, onLogin }) {
  const [step, setStep] = useState("form")
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirm: "", avatar: "😊" })
  const [errors, setErrors] = useState({})
  const [showPass, setShowPass] = useState(false)
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [pinStep, setPinStep] = useState("create")
  const [txnPin, setTxnPin] = useState("")
  const [confirmTxnPin, setConfirmTxnPin] = useState("")
  const [txnStep, setTxnStep] = useState("create")
  const [pinError, setPinError] = useState("")

  const avatars = ["😊", "👨🏾", "👩🏾", "🦁", "⚡", "🔥", "💎", "🎯", "🚀", "🦅"]

  const validate = () => {
    const e = {}
    if (!form.fullName.trim()) e.fullName = "Full name is required"
    if (!form.email.includes("@")) e.email = "Enter a valid email"
    if (form.phone.length < 11) e.phone = "Enter a valid Nigerian phone number"
    if (form.password.length < 6) e.password = "Password must be at least 6 characters"
    if (form.password !== form.confirm) e.confirm = "Passwords do not match"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = () => {
    if (validate()) {
      localStorage.setItem("zappi_user", JSON.stringify({ ...form, createdAt: new Date().toISOString() }))
      setStep("pin")
    }
  }

  const handleLoginPinPress = (d) => {
    setPinError("")
    if (pinStep === "create") setPin(prev => (prev.length < 4 ? prev + d : prev))
    else setConfirmPin(prev => (prev.length < 4 ? prev + d : prev))
  }

  useEffect(() => {
    if (pinStep === "create" && pin.length === 4) {
      const t = setTimeout(() => setPinStep("confirm"), 300)
      return () => clearTimeout(t)
    }
  }, [pin, pinStep])

  useEffect(() => {
    if (pinStep === "confirm" && confirmPin.length === 4) {
      const t = setTimeout(() => {
        if (confirmPin === pin) { localStorage.setItem("zappi_login_pin", pin); setStep("txnpin") }
        else { setPinError("PINs don't match"); setConfirmPin(""); setTimeout(() => { setPin(""); setPinStep("create"); setPinError("") }, 600) }
      }, 300)
      return () => clearTimeout(t)
    }
  }, [confirmPin, pinStep, pin])

  const handleTxnPinPress = (d) => {
    setPinError("")
    if (txnStep === "create") setTxnPin(prev => (prev.length < 6 ? prev + d : prev))
    else setConfirmTxnPin(prev => (prev.length < 6 ? prev + d : prev))
  }

  useEffect(() => {
    if (txnStep === "create" && txnPin.length === 6) {
      const t = setTimeout(() => setTxnStep("confirm"), 300)
      return () => clearTimeout(t)
    }
  }, [txnPin, txnStep])

  useEffect(() => {
    if (txnStep === "confirm" && confirmTxnPin.length === 6) {
      const t = setTimeout(() => {
        if (confirmTxnPin === txnPin) { localStorage.setItem("zappi_txn_pin", txnPin); onSuccess() }
        else { setPinError("PINs don't match"); setConfirmTxnPin(""); setTimeout(() => { setTxnPin(""); setTxnStep("create"); setPinError("") }, 600) }
      }, 300)
      return () => clearTimeout(t)
    }
  }, [confirmTxnPin, txnStep, txnPin])

  const field = (key, label, placeholder, type = "text") => (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
      <div style={{ position: "relative" }}>
        <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
          type={type === "password" ? (showPass ? "text" : "password") : type}
          placeholder={placeholder}
          style={{ width: "100%", padding: "13px 14px", borderRadius: 12, border: `1.5px solid ${errors[key] ? "#EF4444" : "var(--border)"}`, boxSizing: "border-box", fontSize: 14, outline: "none", fontFamily: "inherit", background: "var(--card-bg)" }} />
        {type === "password" && <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>{showPass ? "🙈" : "👁️"}</button>}
      </div>
      {errors[key] && <p style={{ color: "#EF4444", fontSize: 11, margin: "4px 0 0", fontWeight: 500 }}>{errors[key]}</p>}
    </div>
  )

  if (step === "pin") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>{pinStep === "create" ? "Create Login PIN" : "Confirm Login PIN"}</h2>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>4-digit PIN to unlock Zappi NG</p>
      <PinDots value={pinStep === "create" ? pin : confirmPin} length={4} error={!!pinError} />
      {pinError && <p style={{ color: C.danger, fontSize: 13, fontWeight: 600, margin: "0 0 8px", textAlign: "center" }}>{pinError}</p>}
      <PinPad onPress={handleLoginPinPress} onDelete={() => { setPinError(""); if (pinStep === "create") setPin(p => p.slice(0, -1)); else setConfirmPin(p => p.slice(0, -1)) }} />
    </div>
  )

  if (step === "txnpin") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>{txnStep === "create" ? "Create Transaction PIN" : "Confirm Transaction PIN"}</h2>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", textAlign: "center", maxWidth: 260 }}>6-digit PIN required before every payment</p>
      <PinDots value={txnStep === "create" ? txnPin : confirmTxnPin} length={6} error={!!pinError} />
      {pinError && <p style={{ color: C.danger, fontSize: 13, fontWeight: 600, margin: "0 0 8px", textAlign: "center" }}>{pinError}</p>}
      <PinPad onPress={handleTxnPinPress} onDelete={() => { setPinError(""); if (txnStep === "create") setTxnPin(p => p.slice(0, -1)); else setConfirmTxnPin(p => p.slice(0, -1)) }} />
      <button onClick={onSuccess} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer", marginTop: 16, padding: 8 }}>Skip for now</button>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.bg, overflowY: "auto" }}>
      <div style={{ background: `linear-gradient(135deg,${C.primary},#9F67F5)`, padding: "40px 24px 24px", textAlign: "center" }}>
        <h1 style={{ color: "white", fontSize: 26, fontWeight: 900, margin: "0 0 4px" }}>⚡ Zappi NG</h1>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, margin: 0 }}>Create your account</p>
      </div>
      <div style={{ padding: 20 }}>
        <button onClick={() => piLogin(onSuccess)}
  style={{ width:'100%', padding:'12px', background:'#6C3AED', color:'white', border:'none', borderRadius:14, fontSize:15, fontWeight:700, cursor:'pointer' }}>
   ⚡ Authenticate with Pi
</button>

        <div style={{ textAlign: "center", margin: "20px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>or fill in manually</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 10px" }}>Choose your avatar</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {avatars.map(a => (
            <button key={a} onClick={() => setForm({ ...form, avatar: a })}
              style={{ width: 44, height: 44, borderRadius: 12, border: `2px solid ${form.avatar === a ? C.primary : "var(--border)"}`, background: form.avatar === a ? C.light : "var(--card-bg)", fontSize: 22, cursor: "pointer", transition: "all 0.2s" }}>{a}</button>
          ))}
        </div>
        {field("fullName", "Full name", "Enter your full name")}
        {field("email", "Email address", "your@email.com", "email")}
        {field("phone", "Phone number", "08012345678", "tel")}
        {field("password", "Password", "Create a password", "password")}
        {field("confirm", "Confirm password", "Re-enter password", "password")}
        <button onClick={handleRegister} style={{ width: "100%", background: C.primary, color: "white", border: "none", borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 800, cursor: "pointer", marginTop: 4, boxShadow: "0 4px 16px rgba(108,58,237,0.3)" }}>
          Create Account →
        </button>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginTop: 16 }}>
          Already have an account? <button onClick={onLogin} style={{ background: "none", border: "none", color: C.primary, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Sign in</button>
        </p>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-tertiary)", marginTop: 8 }}>By creating an account you agree to our Terms of Service and Privacy Policy</p>
      </div>
    </div>
  )
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export function LoginScreen({ onSuccess, onRegister, onForgot, onCreateAccount }) {
  const [method, setMethod] = useState("password")
  const [form, setForm] = useState({ email: "", password: "" })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)
  const [mobileBrowser] = useState(() => isMobileBrowser())

  const handlePasswordLogin = () => {
    const user = JSON.parse(localStorage.getItem("zappi_user") || "{}")
    if (!form.email || !form.password) { setError("Please fill in all fields"); return }
    if ((form.email === user.email || form.email === user.phone) && form.password === user.password) {
      onSuccess()
    } else {
      setError("Incorrect email/phone or password")
    }
  }

    const handlePinPress = (d) => setPin(prev => (prev.length < 4 ? prev + d : prev))

  useEffect(() => {
    if (pin.length === 4) {
      const stored = localStorage.getItem("zappi_login_pin")
      const t = setTimeout(() => {
        if (pin === stored) onSuccess()
        else {
          const a = attempts + 1; setAttempts(a)
          if (a >= 3) { setLocked(true); setPinError("Too many attempts. Use password instead.") }
          else setPinError(`Wrong PIN. ${3 - a} attempt${3 - a === 1 ? "" : "s"} left.`)
          setPin("")
        }
      }, 300)
      return () => clearTimeout(t)
    }
    if (pin.length === 0) setPinError("")
  }, [pin])

  const user = JSON.parse(localStorage.getItem("zappi_user") || "{}")

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ background: `linear-gradient(135deg,${C.primary},#9F67F5)`, padding: "50px 24px 30px", textAlign: "center" }}>
        <div style={{ fontSize: 50, marginBottom: 8 }}>{user.avatar || "⚡"}</div>
        <h1 style={{ color: "white", fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>Welcome back!</h1>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, margin: 0 }}>{user.fullName || "Zappi NG User"}</p>
      </div>

      <div style={{ flex: 1, padding: 20 }}>
        <div style={{ display: "flex", gap: 8, background: "var(--card-bg)", borderRadius: 14, padding: 4, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {[{ id: "password", label: "🔒 Password" }, { id: "pin", label: "🔢 PIN" }].map(m => (
            <button key={m.id} onClick={() => { setMethod(m.id); setError(""); setPinError(""); setPin("") }}
              style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", background: method === m.id ? C.primary : "transparent", color: method === m.id ? "white" : "var(--text-secondary)", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>{m.label}</button>
          ))}
        </div>

        {method === "password" && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email or Phone</p>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com or 080..."
              style={{ width: "100%", padding: 13, borderRadius: 12, border: "1.5px solid #E5E7EB", boxSizing: "border-box", fontSize: 14, outline: "none", marginBottom: 14, fontFamily: "inherit" }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</p>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} type={showPass ? "text" : "password"} placeholder="Enter your password"
                style={{ width: "100%", padding: 13, borderRadius: 12, border: "1.5px solid #E5E7EB", boxSizing: "border-box", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
              <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>{showPass ? "🙈" : "👁️"}</button>
            </div>
            <button onClick={onForgot} style={{ background: "none", border: "none", color: C.primary, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 0", marginBottom: 16 }}>Forgot password?</button>
            {error && <p style={{ color: C.danger, fontSize: 13, fontWeight: 600, margin: "0 0 12px", textAlign: "center" }}>{error}</p>}
            <button onClick={handlePasswordLogin} style={{ width: "100%", background: C.primary, color: "white", border: "none", borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(108,58,237,0.3)" }}>Sign In</button>

            {/* Fingerprint — hidden on mobile browsers, shown on desktop / Pi Browser */}
            {!mobileBrowser ? (
              <button style={{ width: "100%", background: "var(--card-bg)", border: "1.5px solid #E5E7EB", borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginTop: 10 }}
                onClick={() => alert("Fingerprint authentication requires a real device. This will work on your phone!")}>
                <span style={{ fontSize: 22 }}>👆</span> Sign in with Fingerprint
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#FEF9C3", borderRadius: 12, padding: "10px 14px", marginTop: 10 }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>ℹ️</span>
                <p style={{ margin: 0, fontSize: 12, color: "#854D0E", lineHeight: 1.5 }}>
                  Fingerprint login is only available in the <strong>Pi Browser app</strong>. Use your password or PIN on mobile browsers.
                </p>
              </div>
            )}
          </div>
        )}

        {method === "pin" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 4px" }}>Enter your 4-digit login PIN</p>
            {!locked && <PinDots value={pin} length={4} error={!!pinError} />}
            {locked ? (
              <div style={{ background: "#FEE2E2", borderRadius: 12, padding: 16, margin: "20px 0" }}>
                <p style={{ margin: 0, color: C.danger, fontWeight: 700 }}>🔒 Account Locked</p>
                <p style={{ margin: "6px 0 0", color: "#991B1B", fontSize: 13 }}>Use password to sign in</p>
              </div>
            ) : (
              <>
                {pinError && <p style={{ color: C.danger, fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>{pinError}</p>}
                <PinPad onPress={handlePinPress} onDelete={() => { setPinError(""); setPin(p => p.slice(0, -1)) }} />
              </>
            )}
            <button onClick={onForgot} style={{ background: "none", border: "none", color: C.primary, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 16, padding: 8 }}>Forgot PIN?</button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 14px" }}>
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 700, letterSpacing: 0.5 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
        </div>
        <button onClick={onRegister} style={{ width: "100%", background: C.primary, color: "white", border: "none", borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(108,58,237,0.3)" }}>
          ⚡ Continue with Pi
        </button>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginTop: 12 }}>
          New here? <button onClick={onCreateAccount} style={{ background: "none", border: "none", color: C.primary, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Create an account →</button>
        </p>
      </div>
    </div>
  )
}

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
export function ForgotScreen({ onBack }) {
  const [step, setStep] = useState("email")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const handleReset = () => {
    const user = JSON.parse(localStorage.getItem("zappi_user") || "{}")
    if (!email) { setError("Enter your email or phone"); return }
    if (email === user.email || email === user.phone) { setStep("success") }
    else setError("Account not found. Check your email or phone.")
  }

  if (step === "success") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 60, marginBottom: 20 }}>📧</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 12px" }}>Check your email!</h2>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 280, lineHeight: 1.6, margin: "0 0 32px" }}>We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions.</p>
      <button onClick={onBack} style={{ background: C.primary, color: "white", border: "none", borderRadius: 14, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Back to Login</button>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <button onClick={onBack} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.primary, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 24, padding: 0 }}>← Back</button>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔓</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", textAlign: "center" }}>Forgot Password?</h2>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", textAlign: "center", margin: "0 0 28px", maxWidth: 280 }}>Enter your email or phone number and we'll send you a reset link.</p>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email or phone number"
        style={{ width: "100%", padding: 14, borderRadius: 14, border: `1.5px solid ${error ? "#EF4444" : "var(--border)"}`, boxSizing: "border-box", fontSize: 14, outline: "none", marginBottom: 8, fontFamily: "inherit" }} />
      {error && <p style={{ color: C.danger, fontSize: 13, margin: "0 0 12px", fontWeight: 500 }}>{error}</p>}
      <button onClick={handleReset} style={{ width: "100%", background: C.primary, color: "white", border: "none", borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 800, cursor: "pointer", marginTop: 8, boxShadow: "0 4px 16px rgba(108,58,237,0.3)" }}>
        Send Reset Link
      </button>
    </div>
  )
}

// ── TRANSACTION PIN MODAL ─────────────────────────────────────────────────────
export function TxnPinModal({ onSuccess, onCancel, label = "Confirm Payment" }) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")

    // Functional update -- never drops a tap, even when typed faster than React re-renders.
  const handlePress = (d) => setPin(prev => (prev.length < 6 ? prev + d : prev))

  // Verify once all 6 digits are committed (reads real state, not a stale closure).
  useEffect(() => {
    if (pin.length === 6) {
      const stored = localStorage.getItem("zappi_txn_pin")
      const t = setTimeout(() => {
        if (pin === stored) onSuccess()
        else { setError("Wrong transaction PIN"); setPin("") }
      }, 300)
      return () => clearTimeout(t)
    }
    if (pin.length === 0) setError("")
  }, [pin])

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: "var(--card-bg)", borderRadius: "24px 24px 0 0", padding: "24px 20px 48px" }}>
        <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{label}</h3>
          <button onClick={onCancel} style={{ background: "#f0f0f0", border: "none", borderRadius: 50, width: 32, height: 32, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-tertiary)" }}>Enter your 6-digit transaction PIN to proceed</p>
        <PinDots value={pin} length={6} error={!!error} />
        {error && <p style={{ color: C.danger, fontSize: 13, fontWeight: 600, margin: "0 0 8px", textAlign: "center" }}>{error}</p>}
        <PinPad onPress={handlePress} onDelete={() => { setError(""); setPin(p => p.slice(0, -1)) }} />
      </div>
    </div>
  )
}

// ── PROFILE SCREEN ────────────────────────────────────────────────────────────
// ── CHANGE / SET PIN FLOW (login = 4-digit, txn = 6-digit) ────────────────────
export function ChangePinFlow({ kind = "txn", forceSetup = false, onBack, onDone }) {
  const isLogin = kind === "login"
  const len = isLogin ? 4 : 6
  const storageKey = isLogin ? "zappi_login_pin" : "zappi_txn_pin"
  const title = isLogin ? "Login PIN" : "Transaction PIN"
  const existing = localStorage.getItem(storageKey)
  const changing = existing && !forceSetup
  const [stage, setStage] = useState(changing ? "current" : "new") // current | new | confirm
  const [entry, setEntry] = useState("")
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (entry.length !== len) { if (entry.length === 0) setError(""); return }
    const t = setTimeout(() => {
      if (stage === "current") {
        if (entry === existing) { setStage("new"); setEntry(""); setError("") }
        else { setError("Incorrect current PIN"); setEntry("") }
      } else if (stage === "new") {
        setDraft(entry); setStage("confirm"); setEntry(""); setError("")
      } else {
        if (entry === draft) { localStorage.setItem(storageKey, draft); setDone(true) }
        else { setError("PINs didn't match. Start again."); setStage("new"); setDraft(""); setEntry("") }
      }
    }, 250)
    return () => clearTimeout(t)
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
        {forceSetup && stage !== "confirm" ? `Secure your payments with a ${len}-digit PIN.` : `Enter your ${len}-digit ${title.toLowerCase()}.`}
      </p>
      <PinDots value={entry} length={len} error={!!error} />
      {error && <p style={{ color: C.danger, fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>{error}</p>}
      <PinPad onPress={press} onDelete={del} />
    </div>
  )
}

// ── CHANGE PASSWORD (local accounts only; Pi accounts have no password) ───────
export function ChangePasswordFlow({ onBack }) {
  const user = JSON.parse(localStorage.getItem("zappi_user") || "{}")
  const hasPw = !!user.password
  const [cur, setCur] = useState("")
  const [pw, setPw] = useState("")
  const [cf, setCf] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  function submit() {
    if (cur !== user.password) return setError("Current password is incorrect")
    if (pw.length < 6) return setError("New password must be at least 6 characters")
    if (pw !== cf) return setError("New passwords do not match")
    localStorage.setItem("zappi_user", JSON.stringify({ ...user, password: pw }))
    setDone(true)
  }

  const inp = (val, set, ph) => (
    <input type="password" value={val} onChange={e => { set(e.target.value); setError("") }} placeholder={ph}
      style={{ width: "100%", padding: 12, borderRadius: 10, border: "1.5px solid #E5E7EB", boxSizing: "border-box", fontSize: 14, outline: "none", marginBottom: 10 }} />
  )

  const wrap = { minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }

  return (
    <div style={wrap}>
      <button onClick={onBack} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.primary, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 24 }}>← Back</button>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800 }}>Change Password</h3>
      {done ? (
        <>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#16a34a", fontWeight: 600 }}>✓ Password updated!</p>
          <button onClick={onBack} style={{ background: C.primary, color: "white", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Done</button>
        </>
      ) : !hasPw ? (
        <>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)", maxWidth: 300 }}>You sign in with Pi Network, so there's no password to change here — your Pi account secures your login.</p>
          <button onClick={onBack} style={{ background: C.primary, color: "white", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Got it</button>
        </>
      ) : (
        <div style={{ width: "100%", maxWidth: 320 }}>
          {inp(cur, setCur, "Current password")}
          {inp(pw, setPw, "New password (min 6 chars)")}
          {inp(cf, setCf, "Confirm new password")}
          {error && <p style={{ color: C.danger, fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>{error}</p>}
          <button onClick={submit} style={{ width: "100%", background: C.primary, color: "white", border: "none", borderRadius: 12, padding: 14, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 }}>Update Password</button>
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
  const [mobileBrowser] = useState(() => isMobileBrowser())

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

  if (section === "changePin") return <ChangePinFlow kind="login" onBack={() => setSection(null)} />
  if (section === "changeTxnPin") return <ChangePinFlow kind="txn" onBack={() => setSection(null)} />
  if (section === "changePassword") return <ChangePasswordFlow onBack={() => setSection(null)} />

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
            { icon: "🔐", label: "Change Login PIN", sub: "Update your 4-digit unlock PIN", action: () => setSection("changePin") },
            { icon: "🔑", label: "Change Transaction PIN", sub: "Update your 6-digit payment PIN", action: () => setSection("changeTxnPin") },
            { icon: "🔒", label: "Change Password", sub: "Update your account password", action: () => setSection("changePassword") },
            ...(!mobileBrowser ? [{ icon: "👆", label: "Fingerprint Login", sub: "Enable biometric authentication", action: () => alert("Fingerprint login is available on supported devices") }] : []),
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
          {mobileBrowser && (
            <div style={{ margin: "4px 14px 12px", display: "flex", alignItems: "flex-start", gap: 8, background: "#FEF9C3", borderRadius: 10, padding: "10px 12px" }}>
              <span style={{ fontSize: 14 }}>ℹ️</span>
              <p style={{ margin: 0, fontSize: 12, color: "#854D0E", lineHeight: 1.5 }}>Fingerprint login works in the <strong>Pi Browser app</strong>, not in mobile browsers.</p>
            </div>
          )}
        </div>

        <button onClick={onLogout} style={{ width: "100%", background: "#FEE2E2", color: C.danger, border: "none", borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  )
}

