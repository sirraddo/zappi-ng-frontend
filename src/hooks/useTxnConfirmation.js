/**
 * useTxnConfirmation.js — Zappi NG
 *
 * Client for the server-verified transaction confirmation flow
 * (backend: routes/confirm.js, middleware/requireTxnConfirmation.js).
 *
 * Replaces the old client-side-only PIN check (plaintext localStorage
 * "zappi_txn_pin"). The PIN now only ever travels to the server over HTTPS
 * and is stored there as a bcrypt hash; nothing secret is kept on-device.
 *
 * The confirmation flow (server PIN check) returns a short-lived (120s),
 * single-use confirmation token bound to the exact transaction fields,
 * which POST /api/payments/complete requires in the
 * "x-confirmation-token" header.
 */

const API_URL = import.meta.env.VITE_API_URL || "https://zappi-ng-backend.onrender.com"

// Real Pi -> VTPass payments are gated behind an env flag until the flow has
// been exercised end-to-end inside Pi Browser (sandbox). Everything else in
// this module (server PIN, confirmation tokens) is always live.
export const REAL_PAYMENTS = import.meta.env.VITE_REAL_PAYMENTS === "true"

// localStorage keys — flags only, never secrets.
export const SERVER_PIN_FLAG = "zappi_txn_pin_server" // "1" once /pin/set has succeeded for this account
const LEGACY_PIN_KEY = "zappi_txn_pin"                // old plaintext PIN — deleted on migration

function authHeaders() {
  const token = localStorage.getItem("zappi_token")
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

async function post(path, body, extraHeaders = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...authHeaders(), ...extraHeaders },
    body: JSON.stringify(body),
  })
  let data = null
  try { data = await res.json() } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

/**
 * The five fields the confirmation token is bound to (utils/txnHash.js).
 * These MUST be sent identically to the confirm endpoint and to
 * /api/payments/complete, or the middleware rejects the token.
 */
export function normalizeTxnFields({ serviceID, billType, amount, phone, billersCode } = {}) {
  return {
    serviceID: serviceID || "",
    billType: billType || "",
    amount: String(amount ?? ""),
    phone: phone || "",
    billersCode: billersCode || phone || "",
  }
}

// -- Transaction PIN --

export function hasServerPin() { return localStorage.getItem(SERVER_PIN_FLAG) === "1" }
export function hasLegacyPin() { return !!localStorage.getItem(LEGACY_PIN_KEY) }

/** Set (or replace) the server-side transaction PIN. Also clears the legacy plaintext PIN. */
export async function setTxnPin(pin) {
  await post("/api/confirm/pin/set", { pin })
  localStorage.setItem(SERVER_PIN_FLAG, "1")
  localStorage.removeItem(LEGACY_PIN_KEY)
}

/**
 * Verify the PIN against the server for a specific transaction.
 * Resolves with a confirmation token; rejects with server messages for
 * wrong PIN (401), lockout (429, includes retry countdown), or no PIN set (400).
 */
export async function verifyTxnPin(pin, txnFields) {
  const data = await post("/api/confirm/pin/verify", { pin, ...normalizeTxnFields(txnFields) })
  return data.confirmationToken
}

// -- Bill delivery (real-payments path) --

/**
 * Deliver a bill via VTPass after the Pi payment completed on-chain.
 * extras = { variation_code?, piPaymentId, piAmount }.
 * Throws err.status === 401 when the confirmation token expired or was
 * already used — the caller should re-confirm (Pi is NOT re-charged) and retry.
 */
export async function completeBillPayment(txnFields, extras, confirmationToken) {
  const body = { ...normalizeTxnFields(txnFields), ...extras }
  return post("/api/payments/complete", body, { "x-confirmation-token": confirmationToken })
}
