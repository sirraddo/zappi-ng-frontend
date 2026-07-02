/**
 * usePiNetwork.js
 * Drop-in Pi Network SDK hook for Zappi NG
 * Place in: frontend/src/hooks/usePiNetwork.js
 *
 * Usage:
 *   const { piUser, piAuth, createPayment, isSandbox, isReady } = usePiNetwork();
 */

import { useState, useEffect, useCallback } from "react";

const PI_SDK_URL = "https://sdk.minepi.com/pi-sdk.js";

export function usePiNetwork() {
  const [isReady, setIsReady] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const [piUser, setPiUser] = useState(null);
  const [error, setError] = useState(null);

  // Load Pi SDK script
  useEffect(() => {
    if (window.Pi) {
      initPi();
      return;
    }
    const script = document.createElement("script");
    script.src = PI_SDK_URL;
    script.async = true;
    script.onload = () => initPi();
    script.onerror = () => setError("Failed to load Pi SDK");
    document.head.appendChild(script);
  }, []);

  function initPi() {
    try {
      const sandbox = import.meta.env.VITE_PI_SANDBOX === "true";
      window.Pi.init({ version: "2.0", sandbox: import.meta.env.VITE_PI_SANDBOX === "true" })
      setIsSandbox(sandbox);
      setIsReady(true);
    } catch (e) {
      setError("Pi SDK init failed: " + e.message);
    }
  }

  /**
   * Authenticate with Pi Network
   * Returns Pi user object with uid, username, accessToken, roles
   */
  const piAuth = useCallback(async () => {
    if (!window.Pi) throw new Error("Pi SDK not loaded");

    const scopes = ["username"];

    return new Promise((resolve, reject) => {
      window.Pi.authenticate(scopes, async (payment) => {
        // Incomplete payment handler — complete any pending payments
        try {
          await fetch(
            `${import.meta.env.VITE_API_URL}/api/pi/incomplete-payment`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payment }),
              credentials: "include",
            }
          );
        } catch (e) {
          console.warn("Incomplete payment handler failed:", e);
        }
      })
        .then(async (authResult) => {
          // Verify token with your backend
          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/api/pi/verify`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accessToken: authResult.accessToken,
                user: authResult.user,
              }),
              credentials: "include",
            }
          );
          if (!res.ok) throw new Error("Backend Pi verification failed");
          const data = await res.json();
          setPiUser(data.user);
          resolve(data.user);
        })
        .catch(reject);
    });
  }, []);

  /**
   * Create a Pi payment for bill payment
   * @param {object} opts - { amount, memo, metadata }
   * @param {function} onSuccess - called with txid on completion
   * @param {function} onError - called on failure
   */
  const createPayment = useCallback(
    ({ amount, memo, metadata = {} }, onSuccess, onError) => {
      if (!window.Pi) {
        onError?.(new Error("Pi SDK not loaded"));
        return;
      }

      const paymentData = {
        amount,
        memo,
        metadata: { ...metadata, app: "zappi-ng", env: isSandbox ? "sandbox" : "mainnet" },
      };

      const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
          try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/pi/approve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId }),
              credentials: "include",
            });
          } catch (e) {
            console.error("Approval failed:", e);
          }
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
          try {
            const res = await fetch(
              `${import.meta.env.VITE_API_URL}/api/pi/complete`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId, txid }),
                credentials: "include",
              }
            );
            const data = await res.json();
            onSuccess?.(txid, data, paymentId);
          } catch (e) {
            onError?.(e);
          }
        },

        onCancel: (paymentId) => {
          onError?.(new Error("Payment cancelled by user"));
        },

        onError: (err, payment) => {
          console.error("Pi payment error:", err, payment);
          onError?.(err);
        },
      };

      window.Pi.createPayment(paymentData, callbacks);
    },
    [isSandbox]
  );

  return { isReady, isSandbox, piUser, piAuth, createPayment, error };
}
