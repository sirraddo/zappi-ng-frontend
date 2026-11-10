/**
 * AskZappi.jsx — customer help assistant (AI). Read-only: explains the app and the
 * user's own recent orders. Messages go to our server, which calls the AI service.
 */
import { useEffect, useRef, useState } from "react"

const API = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const SUGGESTIONS = ["Where is my order?", "How do I pay with Pi?", "My order failed. What now?", "How does the Pi rate work?"]

export default function AskZappi({ onClose, onSupport }) {
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs, busy])

  const send = async (q) => {
    const content = (q ?? text).trim()
    if (!content || busy) return
    const next = [...msgs, { role: "user", content }]
    setMsgs(next); setText(""); setBusy(true)
    try {
      const r = await fetch(`${API}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("zappi_token") || ""}` },
        body: JSON.stringify({ messages: next }),
      })
      const d = await r.json().catch(() => ({}))
      setMsgs([...next, { role: "assistant", content: r.ok ? d.reply : (d.error || "Sorry, something went wrong."), error: !r.ok }])
    } catch {
      setMsgs([...next, { role: "assistant", content: "No connection right now. Please try again.", error: true }])
    } finally { setBusy(false) }
  }

  const bubble = (m) => ({
    alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", padding: "10px 14px", borderRadius: 16, fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap",
    background: m.role === "user" ? "#CC4E00" : m.error ? "#FEE2E2" : "var(--card-bg)", color: m.role === "user" ? "white" : m.error ? "#991B1B" : "var(--text-primary)",
    border: m.role === "user" ? "none" : "1px solid var(--border)",
  })

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "var(--bg-primary, #fff)", display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "calc(env(safe-area-inset-top,0px) + 14px) 16px 12px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-primary)" }}>←</button>
        <div><div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>✨ Ask Zappi</div><div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>AI helper. It can be wrong. Never share your PIN.</div></div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.length === 0 && (
          <>
            <div style={bubble({ role: "assistant" })}>Hi! I can help with buying, rates, refunds and your recent orders. What do you need?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} style={{ padding: "8px 12px", borderRadius: 20, border: "1.5px solid #CC4E00", background: "transparent", color: "#CC4E00", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{s}</button>)}
            </div>
          </>
        )}
        {msgs.map((m, i) => <div key={i} style={bubble(m)}>{m.content}</div>)}
        {busy && <div style={bubble({ role: "assistant" })}>Thinking…</div>}
        {msgs.length > 0 && onSupport && <button onClick={onSupport} style={{ alignSelf: "center", background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 12, textDecoration: "underline", cursor: "pointer" }}>Still stuck? Contact Help & Support</button>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send() }} style={{ display: "flex", gap: 8, padding: "10px 16px calc(env(safe-area-inset-bottom,0px) + 12px)", borderTop: "1px solid var(--border)" }}>
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} placeholder="Type your question…" style={{ flex: 1, padding: "12px 14px", borderRadius: 24, border: "1.5px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 14 }} />
        <button type="submit" disabled={busy || !text.trim()} style={{ padding: "0 18px", borderRadius: 24, border: "none", background: "#CC4E00", color: "white", fontWeight: 700, cursor: "pointer", opacity: busy || !text.trim() ? 0.5 : 1 }}>Send</button>
      </form>
    </div>
  )
}
