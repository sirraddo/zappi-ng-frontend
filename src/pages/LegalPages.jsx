/**
 * LegalPages.jsx
 * Privacy Policy + Terms of Service for Zappi NG.
 * All text lives in ../legalContent.js (single source of truth, also used to
 * generate the static /privacy-policy.html, /terms.html and /data-deletion.html).
 */

import "./LegalPages.css";
import { APP_NAME, LEGAL_UPDATED, PRIVACY_SECTIONS, TERMS_SECTIONS } from "../legalContent.js";

function Sections({ sections }) {
  return sections.map((s) => (
    <div key={s.title}>
      <h2>{s.title}</h2>
      {(s.body || []).map((p, i) => <p key={i}>{p}</p>)}
      {s.list && <ul>{s.list.map((li, i) => <li key={i}>{li}</li>)}</ul>}
    </div>
  ));
}

export function PrivacyPolicy({ onBack }) {
  return (
    <LegalWrapper title="Privacy Policy" onBack={onBack}>
      <p className="legal-updated">Last updated: {LEGAL_UPDATED}</p>
      <Sections sections={PRIVACY_SECTIONS} />
    </LegalWrapper>
  );
}

export function TermsOfService({ onBack }) {
  return (
    <LegalWrapper title="Terms of Service" onBack={onBack}>
      <p className="legal-updated">Last updated: {LEGAL_UPDATED}</p>
      <Sections sections={TERMS_SECTIONS} />
    </LegalWrapper>
  );
}

function LegalWrapper({ title, children, onBack }) {
  return (
    <div className="legal-page">
      <div className="legal-header">
        {onBack && (
          <button className="legal-back" onClick={onBack}>← Back</button>
        )}
        <h1 className="legal-title">{title}</h1>
        <div className="legal-brand">{APP_NAME}</div>
      </div>
      <div className="legal-body">{children}</div>
    </div>
  );
}
