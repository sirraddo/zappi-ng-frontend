/**
 * MoreExtras.jsx — rewards (credit, referral), saved people, reminders, monthly summary, pay-for-me link.
 * Everything personal stays on this device except credit and referral, which live on the server.
 */
import { useState } from "react"

const APP_URL = "https://zappi-ng-frontend.vercel.app"
const box = { background: "var(--card-bg)", borderRadius: 14, padding: "12px 14px", marginBottom: 8 }
const h = { margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }
const note = { margin: "0 0 8px", fontSize: 12, color: "var(--text-tertiary)" }
const inp = { padding: "9px 11px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, width: "100%", boxSizing: "border-box" }
const pill = { borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", border: "1.5px solid #CC4E00", background: "transparent", color: "#CC4E00" }
const solid = { padding: "9px 16px", borderRadius: 10, border: "none", background: "#CC4E00", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }
const NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"]
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const share = (text) => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")

// ── Credit, cashback and referral ──
export function RewardsCard({ me, creditOn, setCreditOn, onClaim }) {
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  if (!me) return null
  const link = `${APP_URL}/?ref=${me.code}`
  return (
    <div style={box}>
      <p style={h}>🎁 Zappi credit: ₦{Number(me.creditNGN || 0).toLocaleString()}</p>
      <p style={note}>
        {me.cashbackPct > 0 ? `You earn ${me.cashbackPct}% credit back on every delivered order. ` : ""}
        Credit is taken off your next purchases automatically.
      </p>
      {me.creditNGN > 0 && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 8, color: "var(--text-primary)" }}>
          <input type="checkbox" checked={creditOn} onChange={(e) => setCreditOn(e.target.checked)} /> Use my credit at checkout
        </label>
      )}
      {me.rewardNGN > 0 && me.code && (
        <>
          <p style={{ ...note, marginBottom: 6 }}>Invite a friend: you both get ₦{me.rewardNGN} credit after their first delivered order. Invited so far: {me.invited}.</p>
          <button style={pill} onClick={() => share(`I use Zappi NG to pay airtime, data and light bills with Pi. Use my code ${me.code} for a reward: ${link}`)}>Share my code {me.code}</button>
        </>
      )}
      {!me.referred && me.rewardNGN > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input style={inp} placeholder="Have a friend's code?" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} />
          <button style={{ ...solid, opacity: code.length < 8 ? 0.5 : 1 }} disabled={busy || code.length < 8} onClick={async () => { setBusy(true); const ok = await onClaim(code); setBusy(false); if (ok) setCode("") }}>{busy ? "…" : "Apply"}</button>
        </div>
      )}
    </div>
  )
}

// ── Saved people (chips on the airtime/data screens) ──
export function SavedPeople({ phone, network, onSelect }) {
  const [list, setList] = useState(() => rd("zappi_people", []))
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState("")
  const valid = /^0\d{10}$/.test(phone || "")
  const known = list.some((p) => p.phone === phone)
  const save = () => { const n = name.trim().slice(0, 20); if (!n) return; const next = [{ name: n, phone, network: network || "" }, ...list.filter((p) => p.phone !== phone)].slice(0, 12); setList(next); wr("zappi_people", next); setNaming(false); setName("") }
  const remove = (p) => { const next = list.filter((x) => x.phone !== p.phone); setList(next); wr("zappi_people", next) }
  return (
    <div style={{ margin: "0 0 12px" }}>
      {list.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
          {list.map((p) => (
            <span key={p.phone} style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
              <button style={{ ...pill, background: phone === p.phone ? "#CC4E00" : "transparent", color: phone === p.phone ? "white" : "#CC4E00" }} onClick={() => onSelect(p)}>👤 {p.name}</button>
              <button aria-label="Remove" onClick={() => remove(p)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}>×</button>
            </span>
          ))}
        </div>
      )}
      {valid && !known && !naming && <button style={{ ...pill, border: "1.5px dashed var(--border)", color: "var(--text-secondary)" }} onClick={() => setNaming(true)}>＋ Save this number</button>}
      {naming && (
        <div style={{ display: "flex", gap: 8 }}>
          <input style={inp} placeholder="Name, e.g. Mum" value={name} onChange={(e) => setName(e.target.value)} />
          <button style={solid} onClick={save}>Save</button>
        </div>
      )}
    </div>
  )
}

// ── Reminders: a nudge in the notification bell when it is time to buy again ──
export function dueReminders() {
  const list = rd("zappi_reminders", [])
  const now = Date.now(), due = []
  const next = list.map((r) => {
    if (now >= r.nextAt) { due.push(r); const step = r.every === "week" ? 7 : 30; let n = r.nextAt; while (n <= now) n += step * 86400000; return { ...r, nextAt: n } }
    return r
  })
  if (due.length) wr("zappi_reminders", next)
  return due
}
export function RemindersCard() {
  const [list, setList] = useState(() => rd("zappi_reminders", []))
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ what: "Airtime", every: "week", who: "" })
  const add = () => { const step = f.every === "week" ? 7 : 30; const r = { id: Date.now(), what: f.what, every: f.every, who: f.who.trim().slice(0, 20), nextAt: Date.now() + step * 86400000 }; const next = [...list, r].slice(0, 10); setList(next); wr("zappi_reminders", next); setOpen(false) }
  const remove = (id) => { const next = list.filter((r) => r.id !== id); setList(next); wr("zappi_reminders", next) }
  return (
    <div style={box}>
      <p style={h}>⏰ Buy-again reminders</p>
      <p style={note}>We remind you in the app when it is time to buy again. You still approve each payment yourself.</p>
      {list.map((r) => (
        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "var(--text-primary)" }}>
          <span>{r.what}{r.who ? ` for ${r.who}` : ""} · every {r.every}</span>
          <button onClick={() => remove(r.id)} style={{ background: "none", border: "none", color: "#dc2626", fontWeight: 700, cursor: "pointer" }}>Remove</button>
        </div>
      ))}
      {!open ? <button style={pill} onClick={() => setOpen(true)}>＋ Add reminder</button> : (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <select style={inp} value={f.what} onChange={(e) => setF({ ...f, what: e.target.value })}>{["Airtime", "Data", "Light bill", "Cable TV"].map((x) => <option key={x}>{x}</option>)}</select>
            <select style={inp} value={f.every} onChange={(e) => setF({ ...f, every: e.target.value })}><option value="week">every week</option><option value="month">every month</option></select>
          </div>
          <input style={{ ...inp, marginBottom: 8 }} placeholder="For whom? (optional)" value={f.who} onChange={(e) => setF({ ...f, who: e.target.value })} />
          <button style={solid} onClick={add}>Save reminder</button>
        </div>
      )}
    </div>
  )
}

// ── Monthly summary (from this device's history) ──
export function MonthlySummary({ transactions }) {
  const num = (v) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0
  const now = new Date()
  const mine = transactions.filter((t) => t.status === "success" && t.type !== "receive" && t.ts && new Date(t.ts).getMonth() === now.getMonth() && new Date(t.ts).getFullYear() === now.getFullYear())
  if (!mine.length) return null
  const total = mine.reduce((a, t) => a + num(t.amount), 0)
  const pi = mine.reduce((a, t) => a + num(t.pi), 0)
  const by = {}; mine.forEach((t) => { by[t.type] = (by[t.type] || 0) + num(t.amount) })
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0]
  const month = now.toLocaleString("en", { month: "long" })
  const text = `My ${month} on Zappi NG: ${mine.length} orders, ₦${total.toLocaleString()} paid with π${pi.toFixed(2)}. Most spent on ${top[0]}. Pay your bills with Pi: ${APP_URL}`
  return (
    <div style={box}>
      <p style={h}>📅 Your {month}</p>
      <p style={{ ...note, color: "var(--text-secondary)" }}>{mine.length} orders · ₦{total.toLocaleString()} · π{pi.toFixed(2)} · most on {top[0]} (₦{top[1].toLocaleString()})</p>
      <button style={pill} onClick={() => share(text)}>Share</button>
    </div>
  )
}

// ── Ask someone to pay for you (link) ──
export function PayForMeCard({ myLine }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ network: myLine?.network || "MTN", phone: myLine?.phone || "", amount: "500" })
  const ok = /^0\d{10}$/.test(f.phone) && Number(f.amount) >= 50 && Number(f.amount) <= 5000
  const send = () => { const link = `${APP_URL}/?req=${encodeURIComponent(["airtime", f.network, f.phone, Number(f.amount)].join("|"))}`; share(`Please buy me ₦${Number(f.amount).toLocaleString()} ${f.network} airtime on Zappi NG (you pay with Pi): ${link}`) }
  return (
    <div style={box}>
      <p style={h}>🙏 Ask someone to pay for you</p>
      {!open ? <><p style={note}>Out of airtime? Send a link; they pay with Pi and it is delivered to your number.</p><button style={pill} onClick={() => setOpen(true)}>Create link</button></> : (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <select style={inp} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })}>{NETWORKS.map((x) => <option key={x}>{x}</option>)}</select>
            <input style={inp} inputMode="numeric" placeholder="Amount ₦" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </div>
          <input style={{ ...inp, marginBottom: 8 }} inputMode="numeric" placeholder="Your number" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
          <button style={{ ...solid, opacity: ok ? 1 : 0.5 }} disabled={!ok} onClick={send}>Share on WhatsApp</button>
        </div>
      )}
    </div>
  )
}

// Read and validate a ?req= link. Returns { network, phone, amount } or null.
export function readPayRequest() {
  try {
    const p = new URLSearchParams(window.location.search).get("req")
    if (!p) return null
    const [type, network, phone, amount] = p.split("|")
    const a = Number(amount)
    if (type !== "airtime" || !NETWORKS.includes(network) || !/^0\d{10}$/.test(phone) || !(a >= 50 && a <= 5000)) return null
    return { network, phone, amount: a }
  } catch { return null }
}
export function readRefCode() {
  try { const c = new URLSearchParams(window.location.search).get("ref"); return /^ZAP[A-Z0-9]{5}$/.test(c || "") ? c : null } catch { return null }
}
