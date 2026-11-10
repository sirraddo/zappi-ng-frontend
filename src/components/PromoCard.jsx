/** PromoCard.jsx — enter a promo code; the app then applies the discount to eligible purchases. */
import { useState } from "react"

export default function PromoCard({ promo, onApply, onRemove }) {
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const box = { background: "var(--card-bg)", borderRadius: 14, padding: "12px 14px", marginBottom: 8 }

  if (promo) {
    return (
      <div style={box}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>🎟️ {promo.code} applied</p>
        <p style={{ margin: "4px 0 8px", fontSize: 12, color: "var(--text-tertiary)" }}>
          {promo.percent}% off{promo.maxDiscountNGN ? ` (up to ₦${promo.maxDiscountNGN} per purchase)` : ""}{promo.services?.length ? ` on ${promo.services.join(", ")}` : ""}. Applied automatically at checkout.
        </p>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 }}>Remove code</button>
      </div>
    )
  }
  return (
    <div style={box}>
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>🎟️ Promo code</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))} placeholder="Enter code"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14 }} />
        <button disabled={busy || code.length < 3} onClick={async () => { setBusy(true); const ok = await onApply(code); setBusy(false); if (ok) setCode("") }}
          style={{ padding: "0 16px", borderRadius: 10, border: "none", background: "#CC4E00", color: "white", fontWeight: 700, cursor: "pointer", opacity: code.length < 3 ? 0.5 : 1 }}>{busy ? "…" : "Apply"}</button>
      </div>
    </div>
  )
}
