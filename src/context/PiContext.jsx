/**
 * PiContext.jsx
 * Global Pi Network state provider for Zappi NG
 * Place in: frontend/src/context/PiContext.jsx
 *
 * Wrap your App.jsx with <PiProvider> so all pages can access Pi state.
 *
 * Usage in any component:
 *   import { usePi } from '../context/PiContext';
 *   const { piUser, piAuth, createPayment, isSandbox } = usePi();
 */

import { createContext, useContext, useState, useEffect } from "react";
import { usePiNetwork } from "../hooks/usePiNetwork";

const PiContext = createContext(null);

export function PiProvider({ children }) {
  const pi = usePiNetwork();
  const [authAttempted, setAuthAttempted] = useState(false);

  // Auto-authenticate when SDK is ready and inside Pi Browser
  useEffect(() => {
    if (!pi.isReady || authAttempted) return;
    setAuthAttempted(true);

    const insidePiBrowser =
      navigator.userAgent.includes("PiBrowser") ||
      window.location.hostname.includes("minepi.com") ||
      import.meta.env.DEV; // allow testing in dev

    if (insidePiBrowser) {
      pi.piAuth()
  .then(async (authResult) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authResult }),
        }
      );
      const data = await res.json();
      if (data.token) localStorage.setItem("zappi_token", data.token);
    } catch (err) {
      console.warn("JWT fetch failed:", err.message);
    }
  })
  .catch((e) => {
    console.warn("Auto Pi auth failed:", e.message);
  });
    }
  }, [pi.isReady, authAttempted]);

  return <PiContext.Provider value={pi}>{children}</PiContext.Provider>;
}

export function usePi() {
  const ctx = useContext(PiContext);
  if (!ctx) throw new Error("usePi must be used inside <PiProvider>");
  return ctx;
}
