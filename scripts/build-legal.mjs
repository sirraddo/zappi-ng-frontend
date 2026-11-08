// Generates public/privacy-policy.html, public/terms.html and public/data-deletion.html
// from src/legalContent.js. Runs automatically before every build (npm "prebuild").
import { writeFileSync } from 'node:fs';
import {
  APP_NAME, LEGAL_UPDATED, CONTACT_EMAIL,
  PRIVACY_SECTIONS, TERMS_SECTIONS, DELETION_STEPS,
} from '../src/legalContent.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const NAV = `<a href="/privacy-policy.html">Privacy Policy</a> &middot; <a href="/terms.html">Terms of Service</a> &middot; <a href="/data-deletion.html">Data Deletion</a> &middot; <a href="/">Open the app</a>`;

function shell(title, inner) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — ${APP_NAME}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:24px 20px;color:#2d3748;line-height:1.7}
  h1{color:#CC4E00;font-size:1.6rem;margin-bottom:4px}
  h2{font-size:1rem;margin-top:26px;color:#374151}
  li{margin-bottom:6px}
  a{color:#CC4E00} footer{margin-top:40px;font-size:.8rem;color:#718096;border-top:1px solid #e2e8f0;padding-top:16px}
</style>
</head>
<body>
<h1>${title}</h1>
<p>${APP_NAME} &middot; Last updated: ${LEGAL_UPDATED}</p>
${inner}
<footer>${APP_NAME} &mdash; bill payments with Pi &bull; ${NAV}</footer>
</body>
</html>
`;
}

function sectionsHtml(sections) {
  return sections.map((s) =>
    `<h2>${esc(s.title)}</h2>\n` +
    (s.body || []).map((p) => `<p>${esc(p)}</p>`).join('\n') +
    (s.list ? `\n<ul>${s.list.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>` : '')
  ).join('\n');
}

const out = (name, html) => writeFileSync(new URL(`../public/${name}`, import.meta.url), html);

out('privacy-policy.html', shell('Privacy Policy', sectionsHtml(PRIVACY_SECTIONS)));
out('terms.html', shell('Terms of Service', sectionsHtml(TERMS_SECTIONS)));
out('data-deletion.html', shell('Request Data Deletion',
  `<p>You have the right to have your personal data removed from ${APP_NAME}. Follow these steps:</p>\n<ol>` +
  DELETION_STEPS.map((s) => `<li><strong>${esc(s.title)}.</strong> ${esc(s.body)}</li>`).join('') +
  `</ol>\n<p><a href="mailto:${CONTACT_EMAIL}?subject=Data%20Deletion%20Request">Email a deletion request</a></p>`));
console.log('legal pages generated');
