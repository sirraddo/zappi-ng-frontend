/**
 * MyLine.jsx — one-tap "My line" shortcut for airtime and data.
 * The user's own number is kept on this device only (localStorage).
 */
import { useState } from "react"

const KEY = "zappi_my_line"
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }

export default function MyLine({ phone, network, onSelect }) {
  const [mine, setMine] = useState(read)
  const valid = /^0\d{10}$/.test(phone || "")

  const save = () => { const v = { phone, network: network || "" }; try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {} setMine(v) }
  const clear = () => { try { localStorage.removeItem(KEY) } catch {} setMine(null) }
  const pill = { borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px" }

  if (mine) {
    const active = phone === mine.phone
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 12px" }}>
        <button onClick={() => onSelect(mine)} style={{ ...pill, border: "1.5px solid #CC4E00", background: active ? "#CC4E00" : "transparent", color: active ? "white" : "#CC4E00" }}>
          📱 My line · {mine.phone}
        </button>
        <button onClick={clear} aria-label="Remove my line" style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 16, cursor: "pointer" }}>×</button>
      </div>
    )
  }
  if (!valid) return null
  return (
    <button onClick={save} style={{ ...pill, border: "1.5px dashed var(--border)", background: "none", color: "var(--text-secondary)", margin: "0 0 12px" }}>
      ☆ Make this my line
    </button>
  )
}
