/**
 * PiRateTicker.jsx
 * Shows live (or cached) Pi/NGN exchange rate on the home screen
 * Place in: frontend/src/components/PiRateTicker.jsx
 *
 * Usage: <PiRateTicker />
 *
 * Rate source: OKX or a custom endpoint on your backend
 * Falls back to a cached/indicative rate if offline
 */

import { useState, useEffect } from "react";
import "./PiRateTicker.css";

const FALLBACK_RATE = 2150; // indicative NGN per 1 Pi — update as needed
const CACHE_KEY = "zappi_pi_rate";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchRate() {
  // First try your backend (which can proxy OKX or CoinGecko)
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pi-rate`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return { rate: data.ngnPerPi, source: "live" };
    }
  } catch (_) {}

  // Fallback: return cached or indicative
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { rate: cached.rate, source: "cached" };
  }
  return { rate: FALLBACK_RATE, source: "indicative" };
}

export default function PiRateTicker() {
  const [rate, setRate] = useState(null);
  const [source, setSource] = useState("loading");
  const [trend, setTrend] = useState(null); // 'up' | 'down' | null

  useEffect(() => {
    let prev = null;
    async function load() {
      const result = await fetchRate();
      if (result.source === "live") {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rate: result.rate, ts: Date.now() }));
      }
      if (prev !== null) setTrend(result.rate > prev ? "up" : result.rate < prev ? "down" : null);
      prev = result.rate;
      setRate(result.rate);
      setSource(result.source);
    }
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!rate) return <div className="rate-ticker loading">Fetching Pi rate…</div>;

  return (
    <div className="rate-ticker">
      <span className="rate-pi-logo">π</span>
      <span className="rate-equals">1 Pi</span>
      <span className="rate-separator">=</span>
      <span className="rate-naira">
        ₦{rate.toLocaleString("en-NG", { maximumFractionDigits: 0 })}
      </span>
      {trend && (
        <span className={`rate-trend ${trend}`}>
          {trend === "up" ? "▲" : "▼"}
        </span>
      )}
      {source !== "live" && (
        <span className="rate-badge">
          {source === "indicative" ? "Indicative" : "Cached"}
        </span>
      )}
    </div>
  );
}
