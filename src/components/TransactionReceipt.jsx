/**
 * TransactionReceipt.jsx
 * Full-screen receipt shown after every bill payment
 * Place in: frontend/src/components/TransactionReceipt.jsx
 *
 * Props:
 *   receipt: {
 *     status: 'success' | 'pending' | 'failed',
 *     type: 'airtime' | 'data' | 'electricity' | 'cable' | 'internet' | 'betting',
 *     amount: number,        // Pi amount paid
 *     nairaAmount: number,   // Naira equivalent
 *     reference: string,     // VTPass reference ID
 *     txid: string,          // Pi blockchain txid
 *     recipient: string,     // phone / meter number / smartcard
 *     provider: string,      // MTN, EEDC, DSTV etc
 *     token: string,         // electricity token (if applicable)
 *     date: Date,
 *   }
 *   onDone: () => void
 *   onRetry: () => void  (only shown on failure)
 */

import { useState } from "react";
import "./TransactionReceipt.css";

const STATUS_CONFIG = {
  success: {
    icon: "✓",
    label: "Payment Successful",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  pending: {
    icon: "⏳",
    label: "Payment Pending",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  failed: {
    icon: "✕",
    label: "Payment Failed",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
};

const TYPE_LABELS = {
  airtime: "Airtime Recharge",
  data: "Data Purchase",
  electricity: "Electricity Bill",
  cable: "Cable TV Subscription",
  internet: "Internet Subscription",
  betting: "Betting Wallet Funding",
};

export default function TransactionReceipt({ receipt, onDone, onRetry }) {
  const [copied, setCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const cfg = STATUS_CONFIG[receipt.status] || STATUS_CONFIG.pending;
  const typeLabel = TYPE_LABELS[receipt.type] || receipt.type;
  const dateStr = new Date(receipt.date).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

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

  function shareReceipt() {
    const text = `Zappi NG Receipt\n${typeLabel}\nAmount: π${receipt.amount} (₦${receipt.nairaAmount?.toLocaleString()})\nRef: ${receipt.reference}\nDate: ${dateStr}\n${receipt.token ? `Token: ${receipt.token}` : ""}`;
    if (navigator.share) {
      navigator.share({ title: "Zappi NG Receipt", text });
    } else {
      navigator.clipboard.writeText(text);
    }
  }

  return (
    <div className="receipt-overlay">
      <div className="receipt-card">
        {/* Status icon */}
        <div className="receipt-status" style={{ background: cfg.bg, borderColor: cfg.border }}>
          <div className="receipt-icon" style={{ background: cfg.color }}>
            {cfg.icon}
          </div>
          <div className="receipt-status-label" style={{ color: cfg.color }}>
            {cfg.label}
          </div>
          <div className="receipt-type">{typeLabel}</div>
        </div>

        {/* Amount */}
        <div className="receipt-amount-block">
          <span className="receipt-pi">π{receipt.amount}</span>
          {receipt.nairaAmount && (
            <span className="receipt-naira">≈ ₦{receipt.nairaAmount.toLocaleString()}</span>
          )}
        </div>

        {/* Electricity token — most prominent element */}
        {receipt.token && receipt.status === "success" && (
          <div className="receipt-token-block">
            <div className="receipt-token-label">⚡ Electricity Token</div>
            <div className="receipt-token-value">{receipt.token}</div>
            <button className="receipt-token-copy" onClick={copyToken}>
              {tokenCopied ? "✓ Copied!" : "Copy Token"}
            </button>
            <div className="receipt-token-hint">
              Enter this token on your prepaid meter
            </div>
          </div>
        )}

        {/* Details table */}
        <div className="receipt-details">
          <Row label="Provider" value={receipt.provider} />
          <Row label="Recipient" value={receipt.recipient} />
          <Row label="Date" value={dateStr} />
          <Row
            label="Reference"
            value={
              <span className="receipt-ref">
                {receipt.reference}
                <button className="copy-btn" onClick={copyRef} title="Copy reference">
                  {copied ? "✓" : "⎘"}
                </button>
              </span>
            }
          />
          {receipt.txid && (
            <Row
              label="Pi TxID"
              value={
                <a
                  href={`https://blockexplorer.minepi.com/tx/${receipt.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="receipt-txlink"
                >
                  {receipt.txid.slice(0, 12)}…{receipt.txid.slice(-6)}
                </a>
              }
            />
          )}
        </div>

        {/* Sandbox badge */}
        {receipt.sandbox && (
          <div className="receipt-sandbox-badge">🧪 Testnet Transaction</div>
        )}

        {/* Actions */}
        <div className="receipt-actions">
          <button className="receipt-share-btn" onClick={shareReceipt}>
            Share Receipt
          </button>
          {receipt.status === "failed" && onRetry && (
            <button className="receipt-retry-btn" onClick={onRetry}>
              Try Again
            </button>
          )}
          <button className="receipt-done-btn" onClick={onDone}>
            Done
          </button>
        </div>
      </div>
    </div>
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
