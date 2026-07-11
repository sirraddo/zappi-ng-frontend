/**
 * SupportPage.jsx
 * Support & About page for Zappi NG
 * Place in: frontend/src/pages/SupportPage.jsx
 *
 * Add to your router: <Route path="/support" element={<SupportPage />} />
 * Or render as a tab inside your More/Settings screen.
 *
 * TODO: update WHATSAPP_NUMBER, SUPPORT_EMAIL, APP_VERSION
 */

import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import "./SupportPage.css";

export const CONFIG = {
  whatsappNumber: "2349011653172",
  supportEmail: "zapping9900.pinet@gmail.com",
  appVersion: "1.0.0",
  buildDate: "January 2025",
};

const FAQS = [
  {
    q: "My payment was deducted but the bill wasn't paid",
    a: "This can happen due to a temporary VTPass outage. Wait 5 minutes and check your transaction history. If still unresolved, contact support with your Reference ID (found in Transaction History).",
  },
  {
    q: "How do I see my electricity token after paying?",
    a: "Your electricity token is displayed immediately on the payment success screen. You can copy it there. It is also saved in your Transaction History — tap the transaction to view it again.",
  },
  {
    q: "How much is 1 Pi worth in Naira?",
    a: "The Pi/NGN rate shown on the Zappi NG home screen is an indicative rate. Pi has not yet launched on open exchanges. The rate we use is based on the best available market data.",
  },
  {
    q: "Can I use Zappi NG without a Pi Network account?",
    a: "No. Zappi NG is exclusively for Pi Network Pioneers. You need an active Pi Network account to sign in and make payments.",
  },
  {
    q: "Is my PIN and personal data safe?",
    a: "Yes. Your PIN is never stored in plain text — it is encrypted using bcrypt. All data is transmitted over HTTPS. Your Pi private keys are never accessed by Zappi NG.",
  },
  {
    q: "How do I report a wrong transaction?",
    a: "Go to Transaction History, find the transaction, and tap 'Report Issue'. You can also contact support directly on WhatsApp with your Reference ID.",
  },
  {
    q: "Why is the app only available in Pi Browser?",
    a: "Zappi NG uses the Pi Network SDK to process Pi payments, which only works inside Pi Browser. This ensures secure Pi authentication for every transaction.",
  },
];

export default function SupportPage({ onBack }) {
  const [openFaq, setOpenFaq] = useState(null);
  const { theme, toggleTheme } = useTheme();

  function openWhatsApp() {
    window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=Hi+Zappi+NG+Support,+I+need+help+with+my+account.`, "_blank");
  }

  function openEmail() {
    window.open(`mailto:${CONFIG.supportEmail}?subject=Zappi+NG+Support+Request`, "_blank");
  }

  return (
    <div className="support-page">
      {/* Header */}
      <div className="support-header">
        {onBack && (
          <button className="support-back" onClick={onBack}>←</button>
        )}
        <span className="support-title">Help & Support</span>
      </div>

      <div className="support-body">
        {/* Contact options */}
        <div className="support-section-label">Contact Us</div>
        <div className="support-contacts">
          <button className="support-contact-btn whatsapp" onClick={openWhatsApp}>
            <span className="contact-icon">💬</span>
            <div className="contact-info">
              <span className="contact-name">WhatsApp Support</span>
              <span className="contact-sub">Fastest response · Mon–Sat, 8am–8pm</span>
            </div>
            <span className="contact-arrow">→</span>
          </button>
          <button className="support-contact-btn email" onClick={openEmail}>
            <span className="contact-icon">✉️</span>
            <div className="contact-info">
              <span className="contact-name">Email Support</span>
              <span className="contact-sub">{CONFIG.supportEmail}</span>
            </div>
            <span className="contact-arrow">→</span>
          </button>
        </div>

        {/* FAQ */}
        <div className="support-section-label">Frequently Asked Questions</div>
        <div className="faq-list">
          {FAQS.map((faq, i) => (
            <div key={i} className={`faq-item ${openFaq === i ? "open" : ""}`}>
              <button
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{faq.q}</span>
                <span className="faq-chevron">{openFaq === i ? "▲" : "▼"}</span>
              </button>
              {openFaq === i && (
                <div className="faq-answer">{faq.a}</div>
              )}
            </div>
          ))}
        </div>

        {/* App settings */}
        <div className="support-section-label">App Settings</div>
        <div className="support-settings">
          <div className="settings-row" onClick={toggleTheme}>
            <span className="settings-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
            <span className="settings-label">
              {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </span>
            <span className="settings-arrow">→</span>
          </div>
        </div>

        {/* About */}
        <div className="support-section-label">About Zappi NG</div>
        <div className="about-card">
          <div className="about-logo">π</div>
          <div className="about-name">Zappi NG</div>
          <div className="about-tagline">Pay bills with Pi · Nigeria</div>
          <div className="about-version">Version {CONFIG.appVersion} · {CONFIG.buildDate}</div>
          <div className="about-links">
            <a href="/privacy" className="about-link">Privacy Policy</a>
            <span className="about-dot">·</span>
            <a href="/terms" className="about-link">Terms of Service</a>
          </div>
          <div className="about-sandbox-note">
            {import.meta.env.VITE_PI_SANDBOX === "true" ? (
              <span className="sandbox-badge">🧪 Pi Testnet Mode</span>
            ) : (
              <span className="mainnet-badge">🟢 Pi Mainnet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
