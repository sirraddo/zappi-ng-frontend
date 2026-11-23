/**
 * TransactionReceipt.jsx
 * Full-screen receipt for any transaction. Opened from History / Home (tap a row)
 * and shown automatically after a payment.
 *
 * Props:
 *   receipt: { status, type, amount (Pi), nairaAmount, reference, txid,
 *              recipient, provider, token, date, sandbox }
 *   onDone: () => void
 *   onRetry?: () => void  (only shown on failure)
 */

import { useState } from "react";
import "./TransactionReceipt.css";

const API_URL = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com";

function formatFacts(f) {
  return "share fn:" + (f.hasShare ? "y" : "n") + " canShare fn:" + (f.hasCanShare ? "y" : "n")
    + " | share:" + f.shareResult
    + " | anchor:" + (f.anchorTried ? (f.anchorError === "none" ? "clicked ok" : "error(" + f.anchorError + ")") : "skipped")
    + " | image:" + (f.dataUrlLen > 100 ? f.dataUrlLen + "b generated" : "FAILED (" + f.dataUrlLen + "b)");
}

const STATUS_CONFIG = {
  success: { icon: "✓", label: "Payment Successful", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  pending: { icon: "⏳", label: "Payment Pending", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  failed:  { icon: "✕", label: "Payment Failed", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

const TYPE_LABELS = {
  airtime: "Airtime Recharge",
  data: "Data Purchase",
  electricity: "Electricity Bill",
  cable: "Cable TV Subscription",
  internet: "Internet Subscription",
  betting: "Betting Wallet Funding",
  send: "Pi Transfer",
  receive: "Money Received",
  transport: "Transport Payment",
  hotel: "Hotel Booking",
};

export default function TransactionReceipt({ receipt, onDone, onRetry }) {
  const [copied, setCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [, setSaveDebug] = useState("");
  const [noShareApi, setNoShareApi] = useState(false);
  const [savedNote, setSavedNote] = useState("");

  const cfg = STATUS_CONFIG[receipt.status] || STATUS_CONFIG.pending;
  const typeLabel = TYPE_LABELS[receipt.type] || receipt.type;
  const dateStr = new Date(receipt.date).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

  function copyRef() {
    navigator.clipboard.writeText(receipt.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyToken() {
    navigator.clipboard.writeText(receipt.token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  // Draw the receipt onto a canvas. No external deps.
  function receiptCanvas() {
    const rows = [
      ["Type", typeLabel],
      receipt.provider && ["Provider", String(receipt.provider)],
      receipt.recipient && ["Recipient", String(receipt.recipient)],
      ["Date", dateStr],
      ["Reference", String(receipt.reference || "—")],
      receipt.token && ["Token", String(receipt.token)],
      ["Status", cfg.label],
    ].filter(Boolean);

    const S = 2, W = 720, pad = 48, rowH = 62, top = 360;
    const H = top + rows.length * rowH + 110;
    const c = document.createElement("canvas");
    c.width = W * S; c.height = H * S;
    const x = c.getContext("2d");
    x.scale(S, S);
    const FONT = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

    x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#CC4E00"); g.addColorStop(1, "#F97316");
    x.fillStyle = g; x.fillRect(0, 0, W, 150);
    x.fillStyle = "#ffffff";
    x.font = "800 38px " + FONT; x.fillText("Zappi NG", pad, 66);
    x.font = "400 20px " + FONT; x.fillStyle = "rgba(255,255,255,0.85)";
    x.fillText("Pay your bills with Pi", pad, 100);

    x.fillStyle = cfg.color; x.font = "700 26px " + FONT;
    x.fillText(cfg.icon + "  " + cfg.label, pad, 215);
    x.fillStyle = "#111111"; x.font = "800 50px " + FONT;
    x.fillText("\u03C0" + receipt.amount, pad, 280);
    if (receipt.nairaAmount) {
      x.fillStyle = "#777777"; x.font = "400 24px " + FONT;
      x.fillText("\u2248 \u20A6" + Number(receipt.nairaAmount).toLocaleString(), pad, 315);
    }

    let y = top;
    x.textBaseline = "middle";
    for (const [k, v] of rows) {
      x.strokeStyle = "#eeeeee"; x.beginPath(); x.moveTo(pad, y - rowH / 2); x.lineTo(W - pad, y - rowH / 2); x.stroke();
      x.fillStyle = "#888888"; x.font = "400 22px " + FONT; x.textAlign = "left"; x.fillText(k, pad, y);
      x.fillStyle = "#111111"; x.font = "600 22px " + FONT; x.textAlign = "right";
      const val = v.length > 30 ? v.slice(0, 29) + "\u2026" : v;
      x.fillText(val, W - pad, y);
      y += rowH;
    }
    x.textAlign = "center"; x.fillStyle = "#9aa0a6"; x.font = "400 18px " + FONT;
    x.fillText("Paid with Pi  \u00B7  zappi0867.pinet.com", W / 2, H - 45);

    return c;
  }

  // data: URI of the receipt image. Used for the press-and-hold preview and
  // the anchor download — data: URIs are far more reliably long-press-saveable
  // than blob: URLs in locked-down in-app webviews (Pi Browser included; some
  // of these webviews simply refuse to offer "Save image" on a blob: src).
  function receiptDataUrl() {
    return receiptCanvas().toDataURL("image/png");
  }

  // Blob/File version, needed only for the Web Share API (navigator.share
  // requires a real File, a data: URI won't do).
  function receiptBlob() {
    const c = receiptCanvas();
    return new Promise((resolve, reject) => {
      const fallback = () => {
        try {
          const dataUrl = c.toDataURL("image/png");
          const bin = atob(dataUrl.split(",")[1]);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          resolve(new Blob([bytes], { type: "image/png" }));
        } catch (e) { reject(e); }
      };
      // Some in-app webviews either lack canvas.toBlob or silently resolve null.
      if (typeof c.toBlob === "function") {
        c.toBlob((b) => (b ? resolve(b) : fallback()), "image/png");
      } else {
        fallback();
      }
    });
  }

  function fileName() {
    return "zappi-receipt-" + (receipt.reference || "tx") + ".png";
  }

  // Save the receipt image. Ordered by what actually works on each platform:
  //  1) native share-to-gallery/files (needs a real File/Blob)
  //  2) a real <a download> click using a data: URI
  //  3) in-app image preview (same data: URI) -> press & hold to save,
  //     since data: URIs are long-press-saveable even where (1) and (2) are blocked
  async function downloadReceipt() {
    setBusy(true); setSaveError(""); setSaveDebug("");
    const facts = {
      hasShare: typeof navigator.share === "function",
      hasCanShare: typeof navigator.canShare === "function",
      shareTried: false, shareResult: "skipped",
      anchorTried: false, anchorError: "none",
      dataUrlLen: 0,
    };
    setNoShareApi(!facts.hasShare);
    setSavedNote("");
    // The Pi Browser can't save files or open the share sheet. Hand the image to the phone's own browser instead:
    // upload it for a one-hour link and open that link outside the Pi Browser, where it downloads normally.
    if (!facts.hasShare && typeof window.Pi?.openUrlInSystemBrowser === "function") {
      try {
        if (await saveViaPhoneBrowser()) { setBusy(false); return; }
      } catch (e) {
        console.warn("[receipt] phone-browser save failed, falling back to preview:", e);
      }
    }
    try {
      const dataUrl = receiptDataUrl();
      facts.dataUrlLen = dataUrl ? dataUrl.length : 0;
      if (navigator.canShare) {
        facts.shareTried = true;
        try {
          const blob = await receiptBlob();
          const file = new File([blob], fileName(), { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "Zappi NG Receipt" });
            facts.shareResult = "ok";
            setSaveDebug(formatFacts(facts));
            setBusy(false);
            return;
          } else {
            facts.shareResult = "canShare()=false for this file";
          }
        } catch (shareErr) {
          // AbortError = user closed the share sheet themselves; nothing to report.
          if (shareErr?.name === "AbortError") {
            facts.shareResult = "user dismissed share sheet";
          } else {
            facts.shareResult = "error: " + (shareErr?.name || "") + " " + (shareErr?.message || shareErr);
            console.warn("[receipt] share failed, falling back:", shareErr);
          }
        }
      }
      facts.anchorTried = true;
      try {
        const a = document.createElement("a");
        a.href = dataUrl; a.download = fileName(); a.rel = "noopener";
        document.body.appendChild(a); a.click(); a.remove();
      } catch (downloadErr) {
        facts.anchorError = (downloadErr?.name || "") + " " + (downloadErr?.message || downloadErr);
        console.warn("[receipt] anchor download failed, falling back to preview:", downloadErr);
      }
      // Always surface the preview so press-and-hold works where the above is blocked.
      setSaveDebug(formatFacts(facts));
      setPreviewUrl(dataUrl);
    } catch (e) {
      console.error("[receipt] could not generate the receipt image:", e);
      setSaveError("Couldn't generate the receipt image on this device. Please try again or take a screenshot instead.");
      setSaveDebug(formatFacts(facts) + " | generateError: " + (e?.message || e));
    }
    setBusy(false);
  }

  async function saveViaPhoneBrowser() {
    let blob = await receiptBlob();
    // Keep uploads small (the server takes up to ~1 MB): use JPEG if the PNG is large.
    if (blob.size > 900 * 1024) {
      const jpg = receiptCanvas().toDataURL("image/jpeg", 0.9);
      const bin = atob(jpg.split(",")[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      blob = new Blob([bytes], { type: "image/jpeg" });
    }
    const ref = encodeURIComponent(String(receipt.reference || "tx").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40));
    const r = await fetch(`${API_URL}/api/receipts?ref=${ref}`, {
      method: "POST",
      headers: { "Content-Type": blob.type, Authorization: `Bearer ${localStorage.getItem("zappi_token") || ""}` },
      body: blob,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.url) throw new Error(d.error || "upload failed");
    await window.Pi.openUrlInSystemBrowser(d.url);
    setSavedNote("Your receipt is downloading in your phone's browser. Check your Downloads or Gallery.");
    return true;
  }

  function closePreview() {
    setPreviewUrl(null);
  }

  async function shareReceipt() {
    const text = "Zappi NG Receipt\n" + typeLabel +
      "\nAmount: \u03C0" + receipt.amount + (receipt.nairaAmount ? " (\u20A6" + Number(receipt.nairaAmount).toLocaleString() + ")" : "") +
      "\nRef: " + (receipt.reference || "—") + "\nDate: " + dateStr;
    setBusy(true); setSaveError("");
    try {
      const blob = await receiptBlob();
      const file = new File([blob], fileName(), { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Zappi NG Receipt", text });
        setBusy(false);
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "Zappi NG Receipt", text });
        setBusy(false);
        return;
      }
    } catch (e) {
      setBusy(false);
      if (e?.name === "AbortError") return; // user dismissed the share sheet themselves
      console.warn("[receipt] share failed, falling back to download:", e);
      // fall through to the download path below rather than giving up silently
    }
    // No share support (or share failed for a real reason): fall back to save flow + copy text.
    try { await navigator.clipboard.writeText(text); } catch (_) {}
    await downloadReceipt();
  }

  return (
    <>
    <div className="receipt-overlay">
      <div className="receipt-card">
        <div className="receipt-status" style={{ background: cfg.bg, borderColor: cfg.border }}>
          <div className="receipt-icon" style={{ background: cfg.color }}>{cfg.icon}</div>
          <div className="receipt-status-label" style={{ color: cfg.color }}>{cfg.label}</div>
          <div className="receipt-type">{typeLabel}</div>
        </div>

        <div className="receipt-amount-block">
          <span className="receipt-pi">π{receipt.amount}</span>
          {receipt.nairaAmount && (
            <span className="receipt-naira">≈ ₦{Number(receipt.nairaAmount).toLocaleString()}</span>
          )}
        </div>

        {receipt.token && receipt.status === "success" && (
          <div className="receipt-token-block">
            <div className="receipt-token-label">⚡ Token / PIN</div>
            <div className="receipt-token-value">{receipt.token}</div>
            <button className="receipt-token-copy" onClick={copyToken}>{tokenCopied ? "✓ Copied!" : "Copy Token"}</button>
            <div className="receipt-token-hint">Enter this token on your prepaid meter</div>
          </div>
        )}

        <div className="receipt-details">
          {receipt.provider && <Row label="Provider" value={receipt.provider} />}
          {receipt.recipient && <Row label="Recipient" value={receipt.recipient} />}
          <Row label="Date" value={dateStr} />
          <Row label="Reference" value={
            <span className="receipt-ref">
              {receipt.reference}
              <button className="copy-btn" onClick={copyRef} title="Copy reference">{copied ? "✓" : "⎘"}</button>
            </span>
          } />
          {receipt.txid && (
            <Row label="Pi TxID" value={
              <a href={`https://blockexplorer.minepi.com/tx/${receipt.txid}`} target="_blank" rel="noopener noreferrer" className="receipt-txlink">
                {receipt.txid.slice(0, 12)}…{receipt.txid.slice(-6)}
              </a>
            } />
          )}
        </div>

        {receipt.sandbox && <div className="receipt-sandbox-badge">🧪 Testnet Transaction</div>}

        <div className="receipt-actions">
          {savedNote && (
            <div style={{ background: "#DCFCE7", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#166534", fontWeight: 600, textAlign: "left" }}>
              {savedNote}
            </div>
          )}
          {saveError && (
            <div style={{ background: "#FEE2E2", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#991B1B", fontWeight: 600, textAlign: "left" }}>
              {saveError}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="receipt-share-btn" style={{ flex: 1 }} onClick={shareReceipt} disabled={busy}>
              {busy ? "…" : "Share"}
            </button>
            <button className="receipt-share-btn" style={{ flex: 1, background: "#fff", color: "#CC4E00", border: "2px solid #CC4E00" }} onClick={downloadReceipt} disabled={busy}>
              {busy ? "…" : "Download"}
            </button>
          </div>
          {receipt.status === "failed" && onRetry && (
            <button className="receipt-retry-btn" onClick={onRetry}>Try Again</button>
          )}
          <button className="receipt-done-btn" onClick={onDone}>Done</button>
        </div>
      </div>
    </div>

    {previewUrl && (
      <div className="receipt-overlay" style={{ zIndex: 10000 }} onClick={closePreview}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, width: "90%", maxWidth: 360, textAlign: "center", marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }} onClick={(e) => e.stopPropagation()}>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "#555", fontWeight: 600 }}>
            {noShareApi
              ? "This browser can't save images automatically \u2014 take a screenshot now to keep this receipt \ud83d\udcf8"
              : "Press & hold the image to save it \ud83d\udce5"}
          </p>
          {noShareApi && (
            <p style={{ margin: "0 0 10px", fontSize: 11, color: "#999" }}>Most phones: press the power + volume-down buttons together</p>
          )}
          <img src={previewUrl} alt="Receipt" style={{ width: "100%", borderRadius: 12, border: "1px solid #eee", display: "block" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            {!noShareApi && <a href={previewUrl} download={fileName()} className="receipt-share-btn" style={{ flex: 1, textDecoration: "none", lineHeight: "2.8" }}>Download</a>}
            <button className="receipt-share-btn" style={{ flex: 1, background: "#fff", color: "#CC4E00", border: "2px solid #CC4E00" }} onClick={closePreview}>{noShareApi ? "Done" : "Close"}</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="receipt-row">
      <span className="receipt-row-label">{label}</span>
      <span className="receipt-row-value">{value}</span>
    </div>
  );
}
