/**
 * PiKycBadge.jsx
 * Shows Pioneer's Pi Network KYC verification status on profile screen
 * Place in: frontend/src/components/PiKycBadge.jsx
 *
 * The Pi SDK's authenticate() response includes user.roles array.
 * Possible values: ['@app', '@role/pioneer', '@role/active_pioneer', '@role/kyc_verified', '@role/core_team']
 *
 * Usage:
 *   import { usePi } from '../context/PiContext';
 *   const { piUser } = usePi();
 *   <PiKycBadge piUser={piUser} />
 */

import "./PiKycBadge.css";

function getKycStatus(piUser) {
  if (!piUser) return "not_connected";
  const roles = piUser.roles || [];
  if (roles.includes("@role/core_team")) return "core_team";
  if (roles.includes("@role/kyc_verified")) return "verified";
  if (roles.includes("@role/active_pioneer")) return "active";
  if (roles.includes("@role/pioneer")) return "pioneer";
  return "unverified";
}

const STATUS_CONFIG = {
  verified: {
    icon: "✓",
    label: "KYC Verified",
    sublabel: "Identity verified by Pi Network",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  core_team: {
    icon: "★",
    label: "Pi Core Team",
    sublabel: "Pi Network core team member",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#c4b5fd",
  },
  active: {
    icon: "◎",
    label: "Active Pioneer",
    sublabel: "Active Pi Network member",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  pioneer: {
    icon: "○",
    label: "Pioneer",
    sublabel: "Pi Network member",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  unverified: {
    icon: "!",
    label: "Not Verified",
    sublabel: "Complete Pi KYC to unlock full access",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
  },
  not_connected: {
    icon: "π",
    label: "Connect Pi",
    sublabel: "Sign in with Pi Network",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#c4b5fd",
  },
};

export default function PiKycBadge({ piUser, compact = false }) {
  const status = getKycStatus(piUser);
  const cfg = STATUS_CONFIG[status];

  if (compact) {
    return (
      <span
        className="pi-kyc-chip"
        style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
        title={cfg.sublabel}
      >
        {cfg.icon} {cfg.label}
      </span>
    );
  }

  return (
    <div
      className="pi-kyc-card"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <div className="pi-kyc-icon" style={{ background: cfg.color }}>
        {cfg.icon}
      </div>
      <div className="pi-kyc-info">
        <div className="pi-kyc-label" style={{ color: cfg.color }}>
          {cfg.label}
        </div>
        <div className="pi-kyc-sub">{cfg.sublabel}</div>
        {piUser?.username && (
          <div className="pi-kyc-username">@{piUser.username}</div>
        )}
      </div>
      {status === "verified" && (
        <div className="pi-kyc-checkmark">✓</div>
      )}
    </div>
  );
}
