/**
 * SavedBeneficiaries.jsx
 * Save and reuse phone/meter/smartcard numbers per bill type
 * Place in: frontend/src/components/SavedBeneficiaries.jsx
 *
 * Props:
 *   type: 'airtime' | 'data' | 'electricity' | 'cable' | 'internet' | 'betting'
 *   onSelect: (beneficiary) => void
 *   currentValue: string  (highlights the matching saved entry)
 */

import { useState, useEffect } from "react";
import "./SavedBeneficiaries.css";

const STORAGE_KEY = "zappi_beneficiaries";

const TYPE_FIELD_LABEL = {
  airtime: "Phone Number",
  data: "Phone Number",
  electricity: "Meter Number",
  cable: "Smartcard Number",
  internet: "Account Number",
  betting: "User ID",
};

export function useBeneficiaries(type) {
  const [beneficiaries, setBeneficiaries] = useState([]);

  useEffect(() => {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    setBeneficiaries(all[type] || []);
  }, [type]);

  function save(entry) {
    // entry: { name, value, provider }
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const existing = all[type] || [];
    // Avoid duplicates by value
    const filtered = existing.filter((b) => b.value !== entry.value);
    const updated = [{ ...entry, savedAt: Date.now() }, ...filtered].slice(0, 10);
    all[type] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setBeneficiaries(updated);
  }

  function remove(value) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    all[type] = (all[type] || []).filter((b) => b.value !== value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setBeneficiaries(all[type]);
  }

  return { beneficiaries, save, remove };
}

export default function SavedBeneficiaries({ type, onSelect, currentValue }) {
  const { beneficiaries, remove } = useBeneficiaries(type);
  const [deleting, setDeleting] = useState(null);

  if (!beneficiaries.length) return null;

  return (
    <div className="beneficiaries-wrap">
      <div className="beneficiaries-label">Saved {TYPE_FIELD_LABEL[type]}s</div>
      <div className="beneficiaries-scroll">
        {beneficiaries.map((b) => (
          <div
            key={b.value}
            className={`beneficiary-chip ${currentValue === b.value ? "active" : ""}`}
          >
            <button
              className="beneficiary-select"
              onClick={() => onSelect(b)}
            >
              <span className="beneficiary-name">{b.name || b.value}</span>
              {b.name && (
                <span className="beneficiary-value">{b.value}</span>
              )}
              {b.provider && (
                <span className="beneficiary-provider">{b.provider}</span>
              )}
            </button>
            <button
              className="beneficiary-delete"
              onClick={() => {
                setDeleting(b.value);
                setTimeout(() => {
                  remove(b.value);
                  setDeleting(null);
                }, 300);
              }}
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SaveBeneficiaryPrompt
 * Show after a successful payment to offer saving the number
 *
 * Props:
 *   type: string
 *   value: string
 *   provider: string
 *   onSave: (name) => void
 *   onSkip: () => void
 */
export function SaveBeneficiaryPrompt({ type, value, provider, onSave, onSkip }) {
  const [name, setName] = useState("");

  return (
    <div className="save-prompt">
      <div className="save-prompt-title">Save this {TYPE_FIELD_LABEL[type]}?</div>
      <div className="save-prompt-value">{value} · {provider}</div>
      <input
        className="save-prompt-input"
        placeholder="Give it a name (e.g. Home Meter, Mum's Phone)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={30}
      />
      <div className="save-prompt-actions">
        <button className="save-prompt-skip" onClick={onSkip}>Skip</button>
        <button
          className="save-prompt-save"
          onClick={() => onSave(name || value)}
          disabled={!name.trim()}
        >
          Save
        </button>
      </div>
    </div>
  );
}
