/**
 * PiRateTicker.jsx
 * Presentational Pi/NGN rate badge. Driven by the app's single liveRate
 * source (passed in as props) so it can never disagree with the balance
 * header. Shows an "Indicative" badge until the backend confirms a live rate.
 *
 * Usage: <PiRateTicker rate={liveRate} live={rateLive} />
 */

import { useEffect, useState } from "react";
import "./PiRateTicker.css";

// `fetchedAt` = when the app last got the rate; the app re-fetches every `refreshMs`.
export default function PiRateTicker({ rate, live, fetchedAt, refreshMs = 60000 }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!fetchedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [fetchedAt]);
  const left = fetchedAt ? Math.max(0, Math.ceil((fetchedAt + refreshMs - now) / 1000)) : null;
  if (!rate) return <div className="rate-ticker loading">Loading service rate…</div>;

  return (
    <div className="rate-ticker">
      <span className="rate-equals">Zappi NG service rate</span>
      <span className="rate-separator">·</span>
      <span className="rate-naira">
        ₦{Number(rate).toLocaleString("en-NG", { maximumFractionDigits: 0 })} per π
      </span>
      {!live && <span className="rate-badge">Indicative</span>}
      {live && left !== null && (
        <span style={{ marginLeft: 8, fontSize: 10, opacity: 0.7 }}>
          🔒 locked at checkout · refreshes in {left}s
        </span>
      )}
    </div>
  );
}
