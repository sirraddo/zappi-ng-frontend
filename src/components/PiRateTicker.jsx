/**
 * PiRateTicker.jsx
 * Presentational Pi/NGN rate badge. Driven by the app's single liveRate
 * source (passed in as props) so it can never disagree with the balance
 * header. Shows an "Indicative" badge until the backend confirms a live rate.
 *
 * Usage: <PiRateTicker rate={liveRate} live={rateLive} />
 */

import "./PiRateTicker.css";

export default function PiRateTicker({ rate, live }) {
  if (!rate) return <div className="rate-ticker loading">Fetching Pi rate…</div>;

  return (
    <div className="rate-ticker">
      <span className="rate-pi-logo">π</span>
      <span className="rate-equals">1 Pi</span>
      <span className="rate-separator">=</span>
      <span className="rate-naira">
        ₦{Number(rate).toLocaleString("en-NG", { maximumFractionDigits: 0 })}
      </span>
      {!live && <span className="rate-badge">Indicative</span>}
    </div>
  );
}
