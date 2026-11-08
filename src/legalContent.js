// Single source of truth for the Privacy Policy, Terms of Service and Data Deletion
// page. Rendered in-app (pages/LegalPages.jsx) AND turned into the static
// /privacy-policy.html, /terms.html and /data-deletion.html (scripts/build-legal.mjs,
// run before every build) so the in-app text, the public URLs given to Pi, and
// reality never drift apart.

export const LEGAL_UPDATED = 'November 2026'
export const APP_NAME = 'Zappi NG'
export const OPERATOR = 'SIRRADDO GLOBAL LIMITED (RC 9939920), Ibadan, Oyo State, Nigeria'
export const CONTACT_EMAIL = 'zappingsupport@gmail.com'
export const WEBSITE = 'https://zappi-ng-frontend.vercel.app'

export const PRIVACY_SECTIONS = [
  { title: '1. Who we are', body: [
    `${APP_NAME} is an app that runs inside the Pi Browser and lets Pioneers pay Nigerian bills (airtime, data, electricity, cable TV, internet, education and insurance) with Pi. It is operated by ${OPERATOR}, which is responsible for the personal data described here.`,
    `${APP_NAME} is an independent app. It is not created, owned or endorsed by Pi Network or the Pi Core Team.`,
  ] },
  { title: '2. What we collect', body: [
    'We collect only what is needed to run the service:',
  ], list: [
    'Pi username and Pi UID, provided by the Pi Network SDK when you sign in. We never see your Pi password or your wallet keys.',
    'Whether your Pi account is KYC-verified, if Pi shares it with us, used only to show a badge. We do not receive or store identity documents.',
    'Optional profile details you choose to add: full name, email address, phone number and an avatar.',
    'The bill details you enter to make a payment: phone numbers, meter numbers, smartcard / decoder numbers, internet account numbers and exam profile IDs. For insurance purchases we also collect the full name, address, date of birth, occupation and next-of-kin details the insurer requires.',
    'Payment and transaction records: the service, amount in Naira and Pi, the Pi payment ID, the VTPass reference and the delivery status.',
    'Your transaction PIN, which is stored on our server and never on your device. Your 4-digit login PIN is stored only on your own device.',
    'Messages you send to support and our replies.',
    'Technical data: your IP address and device / browser type, used for security, abuse and fraud prevention.',
  ] },
  { title: '3. How we use your information', list: [
    'To sign you in with Pi and keep your session secure.',
    'To process your payment through the Pi Payment API and deliver the bill through our provider.',
    'To show your transaction history and receipts, and to send in-app notifications about your payments.',
    'To answer support requests and investigate failed or disputed transactions.',
    'To detect and prevent fraud, abuse and misuse of the service, and to fix problems.',
  ] },
  { title: '4. Pi payments', body: [
    'All payments are made in Pi through the official Pi Payment API inside the Pi Browser. Bills are priced in Naira and converted to Pi using our own indicative rate, shown before you confirm. We do not hold or ask for your wallet private keys, and we never move Pi from your wallet without your confirmation in the Pi wallet screen.',
  ] },
  { title: '5. Who we share data with', body: [
    'We do not sell your personal data. We share it only as needed to provide the service:',
  ], list: [
    'VTPass, our bill-payment provider, and the network, utility, broadcaster, exam body or insurer your payment is for: the phone, meter, smartcard or profile numbers and, for insurance, the details listed above.',
    'Pi Network: payment approval and completion through the Pi API, and sign-in through the Pi SDK.',
    'Hosting and database providers that run the app for us (Vercel, Render and our cloud database).',
    'Authorities, where we are legally required to.',
  ] },
  { title: '6. Data stored on your device', body: [
    'The app stores your sign-in token, theme choice, login PIN, saved beneficiaries and a local copy of your recent transactions in your browser\'s storage. Clearing the Pi Browser\'s site data removes them.',
  ] },
  { title: '7. Security', body: [
    'All communication uses HTTPS and every payment must be approved with your transaction PIN. No system is perfectly secure, so please keep your PINs private.',
  ] },
  { title: '8. Retention and deletion', body: [
    'We keep transaction records for up to 7 years for accounting and dispute purposes. Other account data is kept while your account is active.',
    `You can ask us to delete your data at any time. Email ${CONTACT_EMAIL} with the subject "Data Deletion Request" (see also the Data Deletion page). We delete your account and personal data within 30 days, except records we are legally required to keep.`,
  ] },
  { title: '9. Your rights', body: [
    `Under the Nigeria Data Protection Act 2023 you may ask to access, correct or delete your personal data, or to object to how it is used. Contact us at ${CONTACT_EMAIL}. You may also complain to the Nigeria Data Protection Commission.`,
  ] },
  { title: '10. Children', body: [
    `${APP_NAME} is not intended for anyone under 18 and we do not knowingly collect their data.`,
  ] },
  { title: '11. Changes to this policy', body: [
    'If we make significant changes we will tell you in the app. The date at the top shows when this policy was last updated.',
  ] },
  { title: '12. Contact', body: [
    `${OPERATOR}. Email: ${CONTACT_EMAIL}. Website: ${WEBSITE}`,
  ] },
]

export const TERMS_SECTIONS = [
  { title: '1. Acceptance and who we are', body: [
    `By using ${APP_NAME} you agree to these Terms. If you do not agree, please do not use the app. ${APP_NAME} is operated by ${OPERATOR}.`,
    `${APP_NAME} is independent and is not created, owned or endorsed by Pi Network or the Pi Core Team.`,
  ] },
  { title: '2. Eligibility', body: [
    'You must be 18 or older and be a Pi Network Pioneer using the app inside the Pi Browser. The services deliver to Nigerian phone numbers, meters, decoders, accounts and exam profiles.',
  ] },
  { title: '3. Paying with Pi', list: [
    'Bills are priced in Naira and paid in Pi. The Pi amount is calculated from our own indicative rate, shown to you before you confirm.',
    'Our rate is not an official Pi price and is not an offer to buy or sell Pi. Pi has no official market price set by the Pi Core Team.',
    'Every payment must be approved in your Pi wallet and with your transaction PIN.',
    'Payments on the Pi Mainnet cannot be reversed on the blockchain once completed. If the service is not delivered, follow the refund process below.',
    'When the app runs in Pi Testnet mode, test Pi has no real value.',
  ] },
  { title: '4. Bill payment services', body: [
    'Bills are fulfilled through VTPass, a third-party provider, and the networks, utilities, broadcasters, exam bodies and insurers behind it. Most payments are delivered within about 30 seconds, but some can take longer.',
    `${APP_NAME} is not responsible for delays or outages at VTPass or the service provider, or for details entered incorrectly by you. Please check the phone, meter, smartcard or profile details carefully before confirming, because a delivery to the wrong number cannot be recalled.`,
  ] },
  { title: '5. Failed transactions and refunds', body: [
    'Bill payments that were delivered successfully are not refundable. If Pi was charged but the service was not delivered, contact support within 48 hours with your reference ID and we will investigate and resolve it.',
  ] },
  { title: '6. Your responsibilities', list: [
    'Keep your login PIN and transaction PIN private.',
    'Provide accurate details and only use services you are entitled to buy.',
    'Do not use the app for fraud, money laundering or any illegal activity.',
    'Do not attempt to misuse, overload or reverse-engineer the app or its payment integration.',
  ] },
  { title: '7. Suspension', body: [
    'We may suspend or restrict an account that shows fraud, abuse of the payment system, or a breach of these Terms or Pi Network\'s rules.',
  ] },
  { title: '8. Liability', body: [
    `To the extent allowed by law, ${OPERATOR} is not liable for losses caused by Pi Network or VTPass outages, third-party providers, incorrect details entered by you, or events outside our control.`,
  ] },
  { title: '9. Changes', body: [
    'We may update these Terms. If we make significant changes we will tell you in the app. The date at the top shows the latest version.',
  ] },
  { title: '10. Governing law', body: [
    'These Terms are governed by the laws of the Federal Republic of Nigeria.',
  ] },
  { title: '11. Contact', body: [
    `Email: ${CONTACT_EMAIL}. Website: ${WEBSITE}`,
  ] },
]

export const DELETION_STEPS = [
  { title: 'Send a deletion request', body: `Email ${CONTACT_EMAIL} with the subject "Data Deletion Request" and include your Pi username.` },
  { title: 'We confirm receipt', body: 'We will reply to confirm within 48 hours.' },
  { title: 'Your data is deleted', body: 'Within 30 days we delete your account and personal data. Transaction records we are legally required to keep (up to 7 years) are kept for that purpose only.' },
]
