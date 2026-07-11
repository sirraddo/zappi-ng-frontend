/**
 * LegalPages.jsx
 * Privacy Policy + Terms of Service for Zappi NG
 * Place in: frontend/src/pages/LegalPages.jsx
 *
 * Usage in App.jsx routes:
 *   <Route path="/privacy" element={<LegalPage type="privacy" />} />
 *   <Route path="/terms" element={<LegalPage type="terms" />} />
 *
 * IMPORTANT: Update COMPANY_NAME, CONTACT_EMAIL, and EFFECTIVE_DATE before submitting.
 */

import "./LegalPages.css";

const CONFIG = {
  appName: "Zappi NG",
  companyName: "Zappi NG",           // TODO: update with your registered business name
  contactEmail: "zappingsupport@gmail.com",
  website: "https://zappi.ng",       // TODO: update with your deployed URL
  effectiveDate: "1 January 2025",
};

export function PrivacyPolicy({ onBack }) {
  return (
    <LegalWrapper title="Privacy Policy" onBack={onBack}>
      <p className="legal-updated">Effective Date: {CONFIG.effectiveDate}</p>

      <h2>1. Introduction</h2>
      <p>{CONFIG.appName} ("we", "our", "us") operates a Pi Network bill payment app for Nigerian Pioneers. This Privacy Policy explains how we collect, use, and protect your information when you use {CONFIG.appName}.</p>

      <h2>2. Information We Collect</h2>
      <ul>
        <li><strong>Pi Network account data:</strong> Your Pi username, User ID, and KYC verification status — obtained via the Pi SDK upon login.</li>
        <li><strong>Contact information:</strong> Email address or phone number provided during registration.</li>
        <li><strong>Transaction data:</strong> Bill payment records, amounts, recipients, and VTPass reference IDs.</li>
        <li><strong>Device data:</strong> Device type, browser, and IP address for security purposes.</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>To process bill payments on your behalf via VTPass</li>
        <li>To authenticate you via Pi Network SDK</li>
        <li>To display your transaction history</li>
        <li>To send payment confirmations and receipts</li>
        <li>To improve the app and fix issues</li>
      </ul>

      <h2>4. Pi Network Payments</h2>
      <p>All Pi Network payments are processed through the official Pi Payment API. We do not store your Pi wallet private keys. Pi transactions are recorded on the Pi blockchain.</p>

      <h2>5. Data Sharing</h2>
      <p>We do not sell your personal data. We share data only with:</p>
      <ul>
        <li><strong>VTPass:</strong> To process bill payments (phone numbers, meter numbers, smartcard numbers)</li>
        <li><strong>Pi Network:</strong> Transaction approval and completion via Pi API</li>
        <li><strong>Service providers:</strong> Hosting (Render, Vercel) under strict data agreements</li>
      </ul>

      <h2>6. Data Storage & Security</h2>
      <p>Your data is stored securely in encrypted databases. We use HTTPS for all communications. Passwords are hashed using bcrypt. PINs are never stored in plain text.</p>

      <h2>7. Your Rights</h2>
      <p>You have the right to access, correct, or delete your personal data. Contact us at <a href={`mailto:${CONFIG.contactEmail}`}>{CONFIG.contactEmail}</a> to make a request.</p>

      <h2>8. Data Retention</h2>
      <p>We retain transaction records for 7 years for regulatory compliance. Account data is deleted within 30 days of account deletion.</p>

      <h2>9. Children's Privacy</h2>
      <p>{CONFIG.appName} is not intended for users under 18 years of age.</p>

      <h2>10. Changes to This Policy</h2>
      <p>We will notify you of significant changes via in-app notification. Continued use after changes constitutes acceptance.</p>

      <h2>11. Contact Us</h2>
      <p>Email: <a href={`mailto:${CONFIG.contactEmail}`}>{CONFIG.contactEmail}</a></p>
      <p>Website: <a href={CONFIG.website} target="_blank" rel="noopener noreferrer">{CONFIG.website}</a></p>
    </LegalWrapper>
  );
}

export function TermsOfService({ onBack }) {
  return (
    <LegalWrapper title="Terms of Service" onBack={onBack}>
      <p className="legal-updated">Effective Date: {CONFIG.effectiveDate}</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By using {CONFIG.appName}, you agree to these Terms of Service. If you do not agree, do not use the app.</p>

      <h2>2. Eligibility</h2>
      <p>You must be 18 or older, a verified Pi Network Pioneer, and located in Nigeria to use {CONFIG.appName}.</p>

      <h2>3. Pi Network Payments</h2>
      <ul>
        <li>Payments are processed in Pi cryptocurrency via the official Pi Payment API</li>
        <li>Pi amounts are converted to Naira at the current indicative rate to fund bill payments</li>
        <li>Transactions on the Pi Mainnet are irreversible once completed</li>
        <li>During Pi Testnet, all transactions use test Pi and have no real monetary value</li>
      </ul>

      <h2>4. Bill Payment Services</h2>
      <p>Bill payments are fulfilled through VTPass, a licensed payment service provider in Nigeria. {CONFIG.appName} is not responsible for:</p>
      <ul>
        <li>Delays caused by VTPass or service providers (MTN, EEDC, DSTV, etc.)</li>
        <li>Incorrect recipient details entered by users</li>
        <li>Failed deliveries due to provider outages</li>
      </ul>
      <p>All disputed transactions must be raised within 48 hours with your VTPass reference ID.</p>

      <h2>5. User Responsibilities</h2>
      <ul>
        <li>Keep your login credentials and PIN confidential</li>
        <li>Verify recipient details before completing a payment</li>
        <li>Do not use {CONFIG.appName} for fraudulent or illegal activities</li>
        <li>Do not attempt to reverse-engineer or misuse the Pi payment integration</li>
      </ul>

      <h2>6. Refund Policy</h2>
      <p>Successfully delivered bill payments are non-refundable. For failed transactions where Pi was deducted but the bill was not paid, contact support within 48 hours with your reference ID for investigation.</p>

      <h2>7. Limitation of Liability</h2>
      <p>{CONFIG.companyName} is not liable for losses arising from: Pi Network outages, VTPass downtime, incorrect user input, or force majeure events.</p>

      <h2>8. Account Suspension</h2>
      <p>We may suspend accounts found to be engaged in fraudulent activity, abuse of the payment system, or violation of Pi Network's terms.</p>

      <h2>9. Governing Law</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>

      <h2>10. Contact</h2>
      <p>Email: <a href={`mailto:${CONFIG.contactEmail}`}>{CONFIG.contactEmail}</a></p>
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
        <div className="legal-brand">Zappi NG</div>
      </div>
      <div className="legal-body">{children}</div>
    </div>
  );
}
