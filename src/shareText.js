// Share text from inside Pi Browser. Opening wa.me often fails there, so use the phone's own share sheet,
// and fall back to copying the text so the person can paste it into WhatsApp.
export async function shareText(text) {
  const toast = (m) => window.dispatchEvent(new CustomEvent("zappi-toast", { detail: m }))
  try { if (navigator.share) { await navigator.share({ text }); return "shared" } } catch (e) { if (e && e.name === "AbortError") return "cancelled" }
  try { await navigator.clipboard.writeText(text); toast("Copied. Open WhatsApp and paste it."); return "copied" } catch {}
  try {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); document.body.removeChild(ta)
    if (ok) { toast("Copied. Open WhatsApp and paste it."); return "copied" }
  } catch {}
  toast("Could not share. Please copy the text manually.")
  return "failed"
}
