/**
 * DataBudgetFinder.jsx — "Find the best deal for your budget".
 * Pulls the live plan lists for every network (the same VTPass catalogue the
 * normal Data screen uses), keeps what fits the budget, and ranks it by
 * "Most data" or "Best value" (₦ per GB). Prices are the real catalogue prices.
 */
import { useEffect, useMemo, useState } from "react"

const NETS = ["MTN", "Airtel", "Glo", "9mobile"]
const BUDGETS = [300, 500, 1000, 2000, 5000]
const LENGTHS = [
  { id: "any", label: "Any length", max: Infinity },
  { id: "short", label: "1–2 days", max: 2 },
  { id: "week", label: "Week-ish", max: 7 },
  { id: "month", label: "Monthly", max: 31 },
]

// "MTN 2.5GB - 1 day" -> 2.5 ; "500MB" -> 0.488 ; null when no size in the name
export const parseGB = (name) => {
  const m = String(name).match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)\b/i)
  if (!m) return null
  const n = parseFloat(m[1].replace(",", "."))
  const u = m[2].toUpperCase()
  return u === "TB" ? n * 1024 : u === "GB" ? n : n / 1024
}
export const parseDays = (name) => {
  const n = String(name)
  const d = n.match(/(\d+)\s*day/i); if (d) return Number(d[1])
  const w = n.match(/(\d+)\s*week/i); if (w) return Number(w[1]) * 7
  if (/month/i.test(n)) return 30
  return null
}
const fmtGB = (gb) => gb >= 1 ? `${+gb.toFixed(2)}GB` : `${Math.round(gb * 1024)}MB`

export default function DataBudgetFinder({ serviceIDs, fetchVariations, liveRate, initialPhone = "", onPick }) {
  const [budget, setBudget] = useState(1000)
  const [phone, setPhone] = useState(initialPhone)
  const [net, setNet] = useState("all")
  const [len, setLen] = useState("any")
  const [sort, setSort] = useState("data")
  const [state, setState] = useState({ loading: true, plans: [] })

  useEffect(() => {
    let off = false
    Promise.all(NETS.map(n => fetchVariations(serviceIDs[n]).then(list => list.map(v => ({
      network: n, code: v.variation_code, name: v.name, price: Number(v.variation_amount) || 0,
      gb: parseGB(v.name), days: parseDays(v.name),
    }))))).then(all => { if (!off) setState({ loading: false, plans: all.flat() }) })
    return () => { off = true }
  }, [])

  const list = useMemo(() => {
    const maxDays = LENGTHS.find(l => l.id === len).max
    const rows = state.plans.filter(p => p.gb && p.price > 0 && p.price <= budget
      && (net === "all" || p.network === net)
      && (maxDays === Infinity || (p.days != null && p.days <= maxDays)))
    const perGB = p => p.price / p.gb
    rows.sort(sort === "data" ? (a, b) => b.gb - a.gb || a.price - b.price : (a, b) => perGB(a) - perGB(b))
    return rows.slice(0, 30)
  }, [state, budget, net, len, sort])

  const chip = (active) => ({ flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${active ? "#CC4E00" : "var(--border)"}`, background: active ? "#CC4E00" : "transparent", color: active ? "white" : "var(--text-secondary)", fontSize: 12, fontWeight: 700, cursor: "pointer" })
  const row = { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }
  const input = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 15 }

  return (
    <div style={{ padding: 16 }}>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-tertiary)" }}>Tell us what you want to spend — we compare every network's plans for you.</p>
      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700 }}>My budget (₦)</p>
      <input style={{ ...input, fontSize: 22, fontWeight: 700, marginBottom: 8 }} inputMode="numeric" value={budget || ""} onChange={e => setBudget(Number(e.target.value.replace(/\D/g, "")) || 0)} />
      <div style={row}>{BUDGETS.map(b => <button key={b} onClick={() => setBudget(b)} style={chip(budget === b)}>₦{b.toLocaleString()}</button>)}</div>
      <p style={{ margin: "4px 0 6px", fontSize: 12, fontWeight: 700 }}>For this number <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(optional)</span></p>
      <input style={{ ...input, marginBottom: 10 }} inputMode="tel" placeholder="08012345678" value={phone} onChange={e => setPhone(e.target.value)} />
      <div style={row}>{["all", ...NETS].map(n => <button key={n} onClick={() => setNet(n)} style={chip(net === n)}>{n === "all" ? "All networks" : n}</button>)}</div>
      <div style={row}>{LENGTHS.map(l => <button key={l.id} onClick={() => setLen(l.id)} style={chip(len === l.id)}>{l.label}</button>)}</div>
      <div style={{ display: "flex", gap: 8, margin: "6px 0 12px" }}>
        <button onClick={() => setSort("data")} style={{ ...chip(sort === "data"), flex: 1 }}>Most data</button>
        <button onClick={() => setSort("value")} style={{ ...chip(sort === "value"), flex: 1 }}>Best value (₦/GB)</button>
      </div>

      {state.loading && <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Checking plans on every network…</p>}
      {!state.loading && list.length === 0 && <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No plans fit that budget and filter. Try a higher budget or "Any length".</p>}
      {list.map((p, i) => (
        <button key={p.network + p.code} onClick={() => onPick({ network: p.network, phone, bundle: { code: p.code, label: p.name, price: p.price } })}
          style={{ width: "100%", textAlign: "left", background: "var(--card-bg)", border: `1.5px solid ${i === 0 ? "#CC4E00" : "var(--border)"}`, borderRadius: 14, padding: 14, marginBottom: 8, cursor: "pointer", color: "var(--text-primary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{fmtGB(p.gb)} <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>{p.days ? `${p.days} day${p.days > 1 ? "s" : ""}` : ""}</span></span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#CC4E00" }}>₦{p.price.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
            {i === 0 && <b style={{ color: "#CC4E00" }}>★ Top pick · </b>}{p.network} · ₦{Math.round(p.price / p.gb).toLocaleString()} per GB · ≈ π{(p.price / liveRate).toFixed(4)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{p.name}</div>
        </button>
      ))}
      <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Prices are the networks' current plan prices. Plan names come from the networks.</p>
    </div>
  )
}
