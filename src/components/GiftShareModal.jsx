/**
 * GiftShareModal.jsx — "Send as a gift with a message".
 * Nothing is sent by Zappi: it builds a friendly message the sender can share
 * (WhatsApp, any app, or copy). For airtime/data the recipient's WhatsApp chat
 * can be opened directly because we already know their number.
 */
import { useState } from "react"

const SITE = "https://zappi-ng-frontend.vercel.app"

const toIntl = (n) => {
  const d = String(n || "").replace(/\D/g, "")
  if (/^0\d{10}$/.test(d)) return "234" + d.slice(1)
  if (/^234\d{10}$/.test(d)) return d
  return null
}

export default function GiftShareModal({ tx, senderName, initialMessage = "", onClose }) {
  const [msg, setMsg] = useState(initialMessage)
  const [copied, setCopied] = useState(false)
  const intl = ["airtime", "data"].includes(tx.type) ? toIntl(tx.sub) : null
  const text = `🎁 ${senderName ? senderName + " has" : "I have"} sent you ${tx.label} (${tx.amount}) on Zappi NG!${msg.trim() ? `\n\n"${msg.trim()}"` : ""}\n\nPay Nigerian bills with Pi: ${SITE}`

  const whatsapp = () => window.open(`https://wa.me/${intl || ""}?text=${encodeURIComponent(text)}`, "_blank")
  const share = async () => { try { await navigator.share({ text }) } catch {} }
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {} }
  const btn = (bg, fg) => ({ width: "100%", padding: 13, borderRadius: 12, border: "none", background: bg, color: fg, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 8 })

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 10000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: "var(--card-bg)", color: "var(--text-primary)", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "90vh", overflowY: "auto" }}>
        <p style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>🎁 Share as a gift</p>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-tertiary)" }}>Add a personal message, then share it. This only sends the message — the purchase is already done.</p>
        <textarea value={msg} onChange={e => setMsg(e.target.value.slice(0, 200))} rows={3} placeholder="e.g. Happy birthday! Enjoy 🎉"
          style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, resize: "none", marginBottom: 10 }} />
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 12, background: "var(--bg-secondary)", borderRadius: 12, padding: 12, margin: "0 0 12px" }}>{text}</pre>
        <button onClick={whatsapp} style={btn("#16A34A", "white")}>{intl ? "Send to recipient on WhatsApp" : "Share on WhatsApp"}</button>
        {navigator.share && <button onClick={share} style={btn("#CC4E00", "white")}>Share…</button>}
        <button onClick={copy} style={btn("var(--bg-secondary)", "var(--text-primary)")}>{copied ? "Copied ✓" : "Copy message"}</button>
        <button onClick={onClose} style={{ ...btn("transparent", "var(--text-tertiary)"), marginBottom: 0 }}>Close</button>
      </div>
    </div>
  )
}

export function GiftOption({ on, setOn, msg, setMsg }) {
  return (
    <div style={{ margin: "0 0 14px" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--text-primary)" }}>
        <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} style={{ width: 18, height: 18 }} />
        🎁 Send as a gift with a message
      </label>
      {on && <input value={msg} onChange={e => setMsg(e.target.value.slice(0, 200))} placeholder="Your message, e.g. Happy birthday!"
        style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: "10px 14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13 }} />}
    </div>
  )
}
