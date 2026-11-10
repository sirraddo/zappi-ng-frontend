/**
 * WakeBanner.jsx — friendly "server is waking up" notice.
 * The free hosting tier sleeps when idle and takes up to a minute to start.
 * Pings /health on load; if there's no answer within ~2.5s a calm banner is
 * shown until the server responds, instead of the app just looking broken.
 */
import { useEffect, useState } from "react"

const API = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"

export default function WakeBanner({ text = "Waking up the server… this can take up to a minute the first time. Thanks for your patience." }) {
  const [waking, setWaking] = useState(false)

  useEffect(() => {
    let done = false
    let slowTimer = setTimeout(() => { if (!done) setWaking(true) }, 2500)
    let retryTimer = null
    const ping = async () => {
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 20000)
        const r = await fetch(`${API}/health`, { cache: "no-store", signal: ctrl.signal })
        clearTimeout(t)
        if (r.ok) { done = true; setWaking(false); return }
      } catch { /* still asleep or offline */ }
      if (!done) retryTimer = setTimeout(ping, 4000)
    }
    ping()
    return () => { done = true; clearTimeout(slowTimer); clearTimeout(retryTimer) }
  }, [])

  if (!waking) return null
  return (
    <div role="status" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: "#FEF3C7", color: "#92400E", fontSize: 12, fontWeight: 600, padding: "8px 16px", textAlign: "center", display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
      <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #92400E", borderTopColor: "transparent", borderRadius: "50%", animation: "zspin 0.9s linear infinite" }} />
      {text}
      <style>{"@keyframes zspin{to{transform:rotate(360deg)}}"}</style>
    </div>
  )
}
