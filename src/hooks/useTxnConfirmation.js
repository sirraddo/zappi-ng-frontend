/**
 * useTxnConfirmation.js — Zappi NG
 *
 * Client for the server-verified transaction confirmation flow
 * (backend: routes/confirm.js, routes/webauthn.js, middleware/requireTxnConfirmation.js).
 *
 * Replaces the old client-side-only PIN check (plaintext localStorage
 * "zappi_txn_pin"). The PIN now only ever travels to the server over HTTPS
 * and is stored there as a bcrypt hash; nothing secret is kept on-device.
 *
 * Both confirmation methods (PIN and passkey) return the same thing: a
 * short-lived (120s), single-use confirmation token bound to the exact
 * transaction fields, which POST /api/payments/complete requires in the
 * "x-confirmation-token" header.
 */

const API_URL = import.meta.env.VITE_API_URL || "https://zappi-ng-backend.onrender.com"

// Real Pi -> VTPass payments are gated behind an env flag until the flow has
// been exercised end-to-end inside Pi Browser (sandbox). Everything else in
// this module (server PIN, passkeys, confirmation tokens) is always live.
export const REAL_PAYMENTS = import.meta.env.VITE_REAL_PAYMENTS === "true"

// localStorage keys — flags only, never secrets.
export const SERVER_PIN_FLAG = "zappi_txn_pin_server" // "1" once /pin/set has succeeded for this account
export const PASSKEY_FLAG = "zappi_has_passkey"       // "1" once a passkey was registered from this device
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

// ─── Transaction PIN ──────────────────────────────────────────────────────────

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

// ─── WebAuthn passkeys ────────────────────────────────────────────────────
// NOTE: passkeys are only a faster alternative to the PIN for confirming a
// payment — Pi Authentication remains the only login mechanism.

export function webauthnSupported() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials?.create
}

/** True when this device registered a passkey AND the browser supports WebAuthn. */
export function hasPasskey() { return localStorage.getItem(PASSKEY_FLAG) === "1" && webauthnSupported() }

// base64url helpers — @simplewebauthn/server v10 emits/expects base64url strings,
// while navigator.credentials works in ArrayBuffers.
function b64urlToBuf(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/")
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}
function bufToB64url(buf) {
  const bytes = new Uint8Array(buf)
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function toCreationOptions(o) {
  return {
    ...o,
    challenge: b64urlToBuf(o.challenge),
    user: { ...o.user, id: b64urlToBuf(o.user.id) },
    excludeCredentials: (o.excludeCredentials || []).map((c) => ({ ...c, id: b64urlToBuf(c.id) })),
  }
}
function toRequestOptions(o) {
  return {
    ...o,
    challenge: b64urlToBuf(o.challenge),
    allowCredentials: (o.allowCredentials || []).map((c) => ({ ...c, id: b64urlToBuf(c.id) })),
  }
}

/** Serialize a PublicKeyCredential the way @simplewebauthn/server expects. */
function credToJSON(cred) {
  const r = cred.response
  const out = {
    id: cred.id,
    rawId: bufToB64url(cred.rawId),
    type: cred.type,
    clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {},
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    response: { clientDataJSON: bufToB64url(r.clientDataJSON) },
  }
  if (r.attestationObject) {
    // registration ceremony
    out.response.attestationObject = bufToB64url(r.attestationObject)
    out.response.transports = r.getTransports ? r.getTransports() : []
  }
  if (r.authenticatorData) {
    // authentication ceremony
    out.response.authenticatorData = bufToB64url(r.authenticatorData)
    out.response.signature = bufToB64url(r.signature)
    out.response.userHandle = r.userHandle ? bufToB64url(r.userHandle) : undefined
  }
  return out
}

/** Enroll a passkey for the signed-in account (Profile → Security). */
export async function registerPasskey(deviceLabel = "This device") {
  if (!webauthnSupported()) throw new Error("Passkeys aren't supported in this browser")
  const options = await post("/api/webauthn/register/options", {})
  const cred = await navigator.credentials.create({ publicKey: toCreationOptions(options) })
  if (!cred) throw new Error("Passkey creation was cancelled")
  await post("/api/webauthn/register/verify", { response: credToJSON(cred), deviceLabel })
  localStorage.setItem(PASSKEY_FLAG, "1")
}

/** Confirm a specific transaction with a passkey. Resolves with a confirmation token. */
export async function confirmWithPasskey(txnFields) {
  if (!webauthnSupported()) throw new Error("Passkeys aren't supported in this browser")
  const options = await post("/api/webauthn/confirm/options", normalizeTxnFields(txnFields))
  const cred = await navigator.credentials.get({ publicKey: toRequestOptions(options) })
  if (!cred) throw new Error("Passkey confirmation was cancelled")
  const data = await post("/api/webauthn/confirm/verify", { response: credToJSON(cred) })
  return data.confirmationToken
}

// ─── Bill delivery (real-payments path) ──────────────────────────────────────

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
