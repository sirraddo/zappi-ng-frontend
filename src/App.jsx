import { displayName } from "./utils/displayName.js"
import { useState, useEffect, useCallback } from "react"
import { usePi } from "./context/PiContext.jsx"
import { useTheme } from "./context/ThemeContext.jsx"
import NotificationBell, { addNotification } from "./components/NotificationBell.jsx"
import { t, setLang, getLang, LANGUAGES } from "./i18n.js"
import DataBudgetFinder from "./components/DataBudgetFinder.jsx"
import GiftShareModal, { GiftOption } from "./components/GiftShareModal.jsx"
import AskZappi from "./components/AskZappi.jsx"
import PromoCard from "./components/PromoCard.jsx"
import PiRateTicker from "./components/PiRateTicker.jsx"
import TransactionReceipt from "./components/TransactionReceipt.jsx"
import { PrivacyPolicy, TermsOfService } from "./pages/LegalPages.jsx"
import SupportPage, { CONFIG } from "./pages/SupportPage.jsx"
import { SplashScreen, LoginScreen, TxnPinModal, ProfileScreen, ChangePinFlow } from "./ZappiAuth"
import { hasServerPin, hasLegacyPin, REAL_PAYMENTS, completeBillPayment } from "./hooks/useTxnConfirmation"
import MyLine from "./components/MyLine.jsx"
import { RewardsCard, SavedPeople, RemindersCard, MonthlySummary, PayForMeCard, dueReminders, readPayRequest, readRefCode } from "./components/MoreExtras.jsx"
import SavedBeneficiaries, { useBeneficiaries, SaveBeneficiaryPrompt } from "./components/SavedBeneficiaries.jsx"
import AdminScreen, { isAdminUser } from "./pages/AdminScreen.jsx"

// VTPass serviceID mappings for the real-payments path (VITE_REAL_PAYMENTS).
// These are just VTPass serviceID strings — actual bundle/plan options and
// prices are fetched live via VariationGrid -> /api/payments/variations.
const VTPASS_AIRTIME = { MTN: "mtn", Airtel: "airtel", Glo: "glo", "9mobile": "etisalat" }
const VTPASS_DATA = { MTN: "mtn-data", Airtel: "airtel-data", Glo: "glo-data", "9mobile": "etisalat-data", "GLO SME": "GLO-sme-data" }
const VTPASS_CABLE = { DStv: "dstv", GOtv: "gotv", Startimes: "startimes" }
const VTPASS_EDU = { waec: "waec", "waec-registration": "waec-registration", jamb: "jamb" }
const VTPASS_INSURANCE = "personal-accident-insurance"
const VTPASS_SHOWMAX = "showmax"
const VTPASS_DISCO = { IKEDC: "ikeja-electric", EKEDC: "eko-electric", IBEDC: "ibadan-electric", AEDC: "abuja-electric", PHED: "portharcourt-electric", EEDC: "enugu-electric", KEDCO: "kano-electric", BEDC: "benin-electric", JED: "jos-electric", KAEDC: "kaduna-electric", YEDC: "yola-electric", ABEDC: "aba-electric" }

const RATE = 600 // fallback only — app uses live rate from backend
const C = {
primary: "#CC4E00", light: "var(--primary-light)",
success: "#22C55E", danger: "#EF4444", bg: "var(--bg-secondary)",
}

// Render a stored timestamp as friendly relative time. Seed rows keep their string date.
function relativeTime(ts){
if(!ts) return ""
const s=Math.floor((Date.now()-ts)/1000)
if(s<60) return "Just now"
const m=Math.floor(s/60); if(m<60) return `${m} min${m>1?"s":""} ago`
const h=Math.floor(m/60); if(h<24) return `${h} hour${h>1?"s":""} ago`
const d=Math.floor(h/24); if(d===1) return "Yesterday"
if(d<7) return `${d} days ago`
return new Date(ts).toLocaleDateString("en-NG",{day:"numeric",month:"short"})
}


const DISCOS=["IKEDC (Lagos)","EKEDC (Lagos)","IBEDC (Ibadan)","AEDC (Abuja)","PHED (Port Harcourt)","EEDC (Enugu)","KEDCO (Kano)","BEDC (Benin)","JED (Jos)","KAEDC (Kaduna)","YEDC (Yola)","ABEDC (Aba)"]

// Nigerian mobile network prefixes (public, NCC-allocated ranges — no external API needed).
// Used only to suggest/confirm a network from the phone number; not authoritative,
// the user can always override the detected network manually.
const NETWORK_PREFIXES = {
MTN: ["0803","0806","0703","0706","0813","0816","0810","0814","0903","0906","0913","0916","0704"],
Airtel: ["0802","0808","0708","0812","0701","0902","0901","0907","0912","0904"],
Glo: ["0805","0807","0705","0815","0811","0905","0915"],
"9mobile": ["0809","0817","0818","0908","0909"],
}
function detectNetwork(phone) {
const p = String(phone||"").replace(/\D/g,"")
const local = p.startsWith("234") ? "0"+p.slice(3) : p
const prefix = local.slice(0,4)
for (const [net, prefixes] of Object.entries(NETWORK_PREFIXES)) {
if (prefixes.includes(prefix)) return net
}
return null
}
// VTPass has no ipNX product in its entire catalog (checked both the "data" and
// "other-services" categories), so it was never deliverable — removed, same
// reasoning as Betting. Smile and Spectranet are real, VTPass-backed services.
const INTERNET_PROVIDERS=[{id:"smile",label:"Smile",icon:"😊"},{id:"spectranet",label:"Spectranet",icon:"📡"}]
// NOTE: Smile's serviceID was "smile-data" (wrong) — VTPass's actual serviceID
// is "smile-direct". Fixed here, but Smile purchases need a fundamentally
// different flow than every other Internet/Data product: VTPass requires
// verifying the customer's EMAIL first (merchant-verify/smile/email, sandbox
// test value tester@sandbox.com) to get back an AccountID, which THEN becomes
// billersCode for the purchase — there's no "type in an account number and
// go" path like Spectranet has. This screen still treats Smile identically
// to Spectranet, so Smile purchases will still fail even with the correct
// serviceID until that verify-by-email + account-picker flow is built.
const VTPASS_INTERNET = { smile: "smile-direct", spectranet: "spectranet" }

function HowToModal({ onClose }) {
const steps = [
{ n:1, title:"Pick a service", desc:"Airtime, data, electricity, cable TV, education, and more — all in one place." },
{ n:2, title:"Enter the details", desc:"Phone number, meter number, or account ID — whatever the service needs." },
{ n:3, title:"See the Pi cost", desc:"We show you the live Pi amount before you confirm anything." },
{ n:4, title:"Confirm with your PIN", desc:"Approve with your transaction PIN, then complete payment in Pi Wallet." },
]
return (
<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",zIndex:9998,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
<div style={{width:"100%",maxWidth:430,background:"var(--card-bg)",borderRadius:"24px 24px 0 0",padding:"24px 20px max(32px, calc(env(safe-area-inset-bottom, 0px) + 20px))",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
<h3 style={{margin:0,fontSize:18,fontWeight:800}}>How Zappi NG works</h3>
<button onClick={onClose} style={{background:"#f0f0f0",border:"none",borderRadius:50,width:32,height:32,fontSize:18,cursor:"pointer"}}>✕</button>
</div>
<p style={{margin:"0 0 20px",fontSize:13,color:"var(--text-tertiary)"}}>Pay Nigerian bills with Pi in 4 simple steps.</p>
{steps.map(s=>(
<div key={s.n} style={{display:"flex",gap:12,marginBottom:16}}>
<div style={{width:28,height:28,borderRadius:"50%",background:"var(--primary-light)",color:"#CC4E00",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>{s.n}</div>
<div>
<p style={{margin:0,fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{s.title}</p>
<p style={{margin:"2px 0 0",fontSize:12,color:"var(--text-secondary)",lineHeight:1.4}}>{s.desc}</p>
</div>
</div>
))}
<button onClick={onClose} style={{width:"100%",background:"#CC4E00",color:"white",border:"none",borderRadius:12,padding:14,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4}}>Got it</button>
</div>
</div>
)
}

function NavBar({ page, setPage }) {
const tabs=[{id:"home",icon:"🏠",label:"Home"},{id:"bills",icon:"📋",label:"Bills"},{id:"more",icon:"⚡",label:"More"},{id:"history",icon:"🕐",label:"History"}]
return (
<div style={{position:"sticky",bottom:0,background:"var(--nav-bg)",borderTop:"1px solid var(--border)",display:"flex",padding:"8px 0 max(28px, calc(env(safe-area-inset-bottom, 0px) + 20px))",zIndex:100}}>
{tabs.map(tb=>(
<button key={tb.id} onClick={()=>setPage(tb.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
<span style={{fontSize:20}}>{tb.icon}</span>
<span style={{fontSize:10,color:page===tb.id?C.primary:"var(--text-tertiary)",fontWeight:page===tb.id?700:400}}>{t(tb.label)}</span>
{page===tb.id&&<div style={{width:4,height:4,borderRadius:2,background:C.primary,marginTop:1}}/>}
</button>
))}
</div>
)
}

function Header({ title, onBack, right }) {
return (
<div style={{background:`linear-gradient(135deg,${C.primary},#FF7A33)`,padding:"16px",display:"flex",alignItems:"center",gap:12}}>
{onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:14,fontWeight:500}}>←</button>}
<p style={{color:"white",fontSize:16,fontWeight:600,margin:0,flex:1}}>{title}</p>
{right&&right}
</div>
)
}

function PiSummary({ amount, bg="#EFF6FF", color="#2563EB", rate=2150 }) {
const pi=(Number(amount)/rate).toFixed(4)
if(!amount||amount<=0)return null
return (
<div style={{background:bg,borderRadius:10,padding:14,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div><p style={{margin:0,fontSize:11,color,opacity:0.8}}>You pay</p><p style={{margin:"2px 0 0",fontSize:16,fontWeight:700,color}}>π {pi}</p></div>
<div style={{textAlign:"right"}}><p style={{margin:0,fontSize:11,color,opacity:0.8}}>NGN</p><p style={{margin:"2px 0 0",fontSize:14,fontWeight:600,color}}>₦{Number(amount).toLocaleString()}</p></div>
</div>
)
}

function Inp({ value, onChange, placeholder, type="text", mb=16 }) {
return <input value={value} onChange={onChange} placeholder={placeholder} type={type}
style={{width:"100%",padding:13,borderRadius:10,border:"1.5px solid #E5E7EB",marginBottom:mb,boxSizing:"border-box",fontSize:14,outline:"none",fontFamily:"inherit"}}
onFocus={e=>e.target.style.border=`1.5px solid ${C.primary}`} onBlur={e=>e.target.style.border="1.5px solid #E5E7EB"}/>
}

function Btn({ label, disabled, onClick, bg, mb=8 }) {
return <button onClick={onClick} disabled={disabled} style={{width:"100%",background:disabled?"#D1D5DB":bg||C.primary,color:"white",border:"none",borderRadius:12,padding:15,fontSize:15,fontWeight:700,cursor:disabled?"not-allowed":"pointer",marginTop:mb,boxShadow:disabled?"none":"0 4px 12px rgba(108,58,237,0.25)"}}>{label}</button>
}

function FL({ children }) {
return <p style={{fontSize:12,fontWeight:700,color:"var(--text-secondary)",margin:"0 0 6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{children}</p>
}

function SCard({ icon, label, desc, bg, onClick, badge }) {
return (
<button onClick={onClick} style={{width:"100%",background:"var(--card-bg)",border:"none",borderRadius:14,padding:14,marginBottom:10,display:"flex",alignItems:"center",gap:14,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"left"}}
onMouseDown={e=>e.currentTarget.style.transform="scale(0.98)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
<div style={{width:46,height:46,borderRadius:13,background:bg||C.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>
<div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{label}</p>{desc&&<p style={{margin:"2px 0 0",fontSize:12,color:"var(--text-tertiary)"}}>{desc}</p>}</div>
{badge > 0 && <span style={{background:"#dc2626",color:"white",fontSize:11,fontWeight:700,borderRadius:10,padding:"2px 7px",marginRight:2}}>{badge}</span>}
<span style={{color:"var(--text-tertiary)",fontSize:20}}>›</span>
</button>
)
}

// Fetches VTPass's own service catalog for a category (airtime, data,
// tv-subscription, etc.) via our existing backend proxy — each entry includes an "image"
// field pointing to that brand's official logo, hosted on VTPass's CDN. This is
// the same catalog VTPass provides to power real bill delivery, so it's already
// licensed for exactly this kind of display use, not scraped from anywhere.
// Cached at module level so every BrandLogo instance for a given category shares
// one fetch, no matter how many brand buttons are on screen.
const _logoCatalogCache = {}
function fetchLogoCatalog(category) {
if (_logoCatalogCache[category]) return _logoCatalogCache[category]
const apiUrl = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const token = localStorage.getItem("zappi_token")
const promise = fetch(`${apiUrl}/api/payments/services?category=${category}`, {
headers: token ? { Authorization: `Bearer ${token}` } : {},
})
.then(async r => {
if (!r.ok) return []
const list = await r.json()
return Array.isArray(list) ? list : []
})
.catch(() => [])
_logoCatalogCache[category] = promise
return promise
}


// Same live-catalog principle as logos, applied to bundle/package pricing: Data,
// Cable TV, and Internet products used to be hardcoded with invented codes and
// prices (e.g. "mtn-1gb" at a made-up ₦600) that don't exist in VTPass's real
// catalog at all — VTPass validates variation_code against its own list, so
// every purchase using a fabricated code was destined to fail regardless of
// whitelisting. This fetches the real, current catalog (code, name, price)
// live from GET /api/payments/variations?serviceID=X, which the backend has
// supported all along.
const _variationCache = {}
function fetchVariations(serviceID) {
if (!serviceID) return Promise.resolve([])
if (_variationCache[serviceID]) return _variationCache[serviceID]
const apiUrl = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const token = localStorage.getItem("zappi_token")
const promise = fetch(`${apiUrl}/api/payments/variations?serviceID=${serviceID}`, {
headers: token ? { Authorization: `Bearer ${token}` } : {},
})
.then(async r => {
if (!r.ok) return []
const list = await r.json()
return Array.isArray(list) ? list : []
})
.catch(() => [])
_variationCache[serviceID] = promise
return promise
}

// Fetches and renders VTPass's real, live package list for a serviceID — used
// by Data, Cable TV, and Internet, replacing what used to be static, invented
// bundle lists. Selecting an item calls onSelect with {code, label, price}
// sourced entirely from VTPass's own response, never a guessed value.
// Parses a validity period out of VTPass's free-text bundle name, e.g.
// "MTN N800 3GB - 2 days" → 2, "...Monthly Bundle" → 30 (word form, no digit).
// Returns null when nothing recognizable is found (VTPass's naming isn't
// fully consistent across networks — some bundles carry no validity at all,
// e.g. "MTN N200 Xtradata").
const parseValidityDays = (name) => {
const m = name.match(/(\d+)\s*day/i)
if (m) return Number(m[1])
if (/month/i.test(name)) return 30
return null
}
// Buckets match the Daily/Weekly/Monthly/Others grouping used by Opay, PalmPay,
// etc. — cheapest/shortest validity first, with a final catch-all for VTPass's
// occasional 60/90/120/365-day plans and anything with no parseable validity.
const bucketForDays = (days) => {
if (days == null) return "Others"
if (days <= 1) return "Daily"
if (days <= 7) return "Weekly"
if (days <= 30) return "Monthly"
return "Others"
}
const categorizeBundle = (name) => {
const n = name.toLowerCase()
if (/night|xtranite|xtra\s*nite/.test(n)) return "Night"
if (/social|whatsapp|youtube|instagram|facebook|twitter|x\s*premium/.test(n)) return "Social"
return bucketForDays(parseValidityDays(name))
}
const BUNDLE_GROUP_ORDER = ["Night", "Social", "Daily", "Weekly", "Monthly", "Others"]

function VariationGrid({ serviceID, selected, onSelect, columns = 2, grouped = false }) {
const [state, setState] = useState({ loading: true, items: [] })
const [activeGroup, setActiveGroup] = useState(null)
const [query, setQuery] = useState("")
useEffect(() => {
if (!serviceID) { setState({ loading: false, items: [] }); return }
let cancelled = false
setState({ loading: true, items: [] })
fetchVariations(serviceID).then(items => {
if (!cancelled) {
// VTPass's sandbox returns an empty variations list for Personal Accident
// Insurance despite the product being whitelisted and correctly documented
// (confirmed: not a whitelisting or key-mismatch issue on our side — our
// backend already reads the exact "varations" key VTPass's own docs show).
// Fall back to the exact codes/prices from VTPass's own API documentation
// so testing isn't blocked on VTPass fixing their sandbox data.
const finalItems = (items.length === 0 && serviceID === VTPASS_INSURANCE)
? [
{ variation_code: "option-a", name: "Option A - 2,500 Naira yearly", variation_amount: "2500.00" },
{ variation_code: "option-b", name: "Option B - 4,000 Naira yearly", variation_amount: "4000.00" },
]
: items
setState({ loading: false, items: finalItems })
}
})
return () => { cancelled = true }
}, [serviceID])
if (state.loading) return <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "0 0 12px" }}>Loading live prices from VTPass…</p>
if (!state.items.length) return <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "0 0 12px" }}>No packages available right now — please try again shortly.</p>

const renderCard = (v) => {
const code = v.variation_code, price = Number(v.variation_amount) || 0
const active = selected?.code === code
return (
<button key={code} onClick={() => onSelect({ code, label: v.name, price })} style={{ padding: 14, borderRadius: 12, border: `2px solid ${active ? C.primary : "var(--border)"}`, background: active ? C.light : "white", cursor: "pointer", textAlign: "left" }}>
<p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{v.name}</p>
<p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700, color: C.primary }}>₦{price.toLocaleString()}</p>
</button>
)
}

if (!grouped) {
return (
<div style={{ display: "grid", gridTemplateColumns: `repeat(${columns},1fr)`, gap: 8, marginBottom: 16, maxHeight: 340, overflowY: "auto" }}>
{state.items.map(renderCard)}
</div>
)
}

const groups = { Night: [], Social: [], Daily: [], Weekly: [], Monthly: [], Others: [] }
state.items.forEach(v => { groups[categorizeBundle(v.name)].push(v) })
const availableGroups = BUNDLE_GROUP_ORDER.filter(g => groups[g].length)
// Falls back to the first available group whenever the previously active one
// isn't present for this serviceID (e.g. switching network) — no separate
// reset effect needed, this just recomputes correctly on every render.
const currentGroup = availableGroups.includes(activeGroup) ? activeGroup : availableGroups[0]
const q = query.trim().toLowerCase()
let recentCodes = []
try { recentCodes = JSON.parse(localStorage.getItem("zappi_recent_bundles") || "[]") } catch {}
const recentItems = recentCodes.map(c => state.items.find(v => v.variation_code === c)).filter(Boolean).slice(0, 4)
const matches = q ? state.items.filter(v => v.name.toLowerCase().includes(q) || String(Number(v.variation_amount)).includes(q.replace(/[₦,]/g, ""))) : null
return (
<div style={{ marginBottom: 16 }}>
<input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("Search plans, e.g. 2GB, 1000, weekly")} inputMode="search"
style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13, marginBottom: 10 }} />
{!q && recentItems.length > 0 && (
<div style={{ marginBottom: 10 }}>
<p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)" }}>⭐ {t("RECENTLY BOUGHT")}</p>
<div style={{ display: "grid", gridTemplateColumns: `repeat(${columns},1fr)`, gap: 8 }}>{recentItems.map(renderCard)}</div>
</div>
)}
{matches ? (
matches.length ? <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns},1fr)`, gap: 8, maxHeight: 340, overflowY: "auto" }}>{matches.map(renderCard)}</div>
: <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No plan matches "{query}".</p>
) : <>
<div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 10 }}>
{availableGroups.map(g => (
<button key={g} onClick={() => setActiveGroup(g)} style={{
flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none",
background: g === currentGroup ? C.primary : "var(--bg-secondary)",
color: g === currentGroup ? "white" : "var(--text-secondary)",
fontSize: 12, fontWeight: 700, cursor: "pointer",
}}>{g}</button>
))}
</div>
<div style={{ display: "grid", gridTemplateColumns: `repeat(${columns},1fr)`, gap: 8, maxHeight: 340, overflowY: "auto" }}>
{groups[currentGroup].map(renderCard)}
</div>
</>}
</div>
)
}

// Shows the account owner's name before payment via VTPass's merchant-verify
// (documented for every electricity disco and for DStv/GOtv/Startimes), so
// the user can confirm they're paying for the right meter/smartcard before
// proceeding. Calls onVerified(name) with an empty string while
// unverified/loading/failed, and the real name only once VTPass confirms a
// match — the parent gates its Pay button on that alone, so a wrong or
// unverifiable number can't slip through as a false positive.
function VerifyName({ serviceID, billersCode, type, onVerified, minLength = 8 }) {
const [state, setState] = useState({ status: "idle", name: "" })
useEffect(() => {
onVerified("")
if (!serviceID || !billersCode || billersCode.length < minLength) { setState({ status: "idle", name: "" }); return }
let cancelled = false
setState({ status: "loading", name: "" })
const timer = setTimeout(() => {
const apiUrl = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const token = localStorage.getItem("zappi_token")
fetch(`${apiUrl}/api/payments/verify`, {
method: "POST",
headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
body: JSON.stringify({ serviceID, billersCode, ...(type ? { type } : {}) }),
})
.then(async r => {
if (!r.ok) { if (!cancelled) setState({ status: "error", name: "" }); return }
const data = await r.json()
if (!cancelled) { setState({ status: "ok", name: data.name || "" }); onVerified(data.name || "", data.raw || null) }
})
.catch(() => { if (!cancelled) setState({ status: "error", name: "" }) })
}, 600)
return () => { cancelled = true; clearTimeout(timer) }
}, [serviceID, billersCode, type])
if (state.status === "idle") return null
if (state.status === "loading") return <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "-8px 0 12px" }}>Verifying…</p>
if (state.status === "error") return <p style={{ fontSize: 12, color: "#DC2626", margin: "-8px 0 12px" }}>⚠ Could not verify this number — double-check and try again</p>
return <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, margin: "-8px 0 12px" }}>✓ {state.name}</p>
}

function SmileVerify({ email, onVerified, minLength = 5 }) {
const [state, setState] = useState({ status: "idle" })
useEffect(() => {
onVerified(null)
if (!email || email.length < minLength || !email.includes("@")) { setState({ status: "idle" }); return }
let cancelled = false
setState({ status: "loading" })
const timer = setTimeout(() => {
const apiUrl = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const token = localStorage.getItem("zappi_token")
fetch(`${apiUrl}/api/payments/verify-smile-email`, {
method: "POST",
headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
body: JSON.stringify({ email }),
})
.then(async r => {
if (!r.ok) { if (!cancelled) setState({ status: "error" }); return }
const data = await r.json()
if (!cancelled) {
setState({ status: "ok", name: data.name || "", accounts: data.accounts || [] })
onVerified({ name: data.name || "", accounts: data.accounts || [] })
}
})
.catch(() => { if (!cancelled) setState({ status: "error" }) })
}, 600)
return () => { cancelled = true; clearTimeout(timer) }
}, [email])
if (state.status === "idle") return null
if (state.status === "loading") return <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "-8px 0 12px" }}>Verifying…</p>
if (state.status === "error") return <p style={{ fontSize: 12, color: "#DC2626", margin: "-8px 0 12px" }}>⚠ Could not verify this email — double-check and try again</p>
return <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, margin: "-8px 0 12px" }}>✓ {state.name}</p>
}

// Quick-reuse strip of the user's own past successful purchases of this type —
// tapping one calls the existing buyAgain(), the same function History's own
// "Buy Again" button already uses, so it's guaranteed to prefill correctly.
function RecentList({ transactions, type, onSelect, limit = 2 }) {
const items = transactions.filter(tx => tx.type === type && tx.status === "success" && tx.raw).slice(0, limit)
if (!items.length) return null
return (
<div style={{ marginBottom: 16 }}>
<FL>Recent</FL>
{items.map(tx => (
<button key={tx.id} onClick={() => onSelect(tx)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
<span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{tx.sub}</span>
<span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>{tx.amount}</span>
</button>
))}
</div>
)
}

// Renders a brand's real logo where VTPass's catalog has one for it, with a
// graceful emoji fallback otherwise (a brand not in VTPass's catalog yet, or
// a slow/failed network request never leaves a blank or broken-looking spot).
function BrandLogo({ category, match, fallback, size = 24 }) {
const [src, setSrc] = useState(null)
const [failed, setFailed] = useState(false)
useEffect(() => {
let cancelled = false
fetchLogoCatalog(category).then(list => {
if (cancelled) return
const needle = match.toLowerCase().replace(/[^a-z0-9]/g, "")
const hit = list.find(s => {
const hay = `${s.serviceID || ""}${s.name || ""}`.toLowerCase().replace(/[^a-z0-9]/g, "")
return hay.includes(needle)
})
if (hit?.image) setSrc(hit.image)
})
return () => { cancelled = true }
}, [category, match])
if (!src || failed) return <span style={{ fontSize: size * 0.8 }}>{fallback}</span>
return (
<img
src={src}
alt={match}
onError={() => setFailed(true)}
style={{ width: size, height: size, borderRadius: 6, objectFit: "contain", background: "white" }}
/>
)
}

function NetGrid({ selected, onSelect, extra = [] }) {
const items = [...["MTN","Airtel","Glo","9mobile"].map(n=>({label:n,match:n})), ...extra]
return (
<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:16}}>
{items.map(({label,match})=>(
<button key={label} onClick={()=>onSelect(label)} style={{padding:10,borderRadius:10,border:`2px solid ${selected===label?C.primary:"var(--border)"}`,background:selected===label?C.light:"white",cursor:"pointer",fontWeight:600,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
<BrandLogo category="airtime" match={match} fallback="📱" size={20}/>{label}
</button>
))}
</div>
)
}

// ─────────────────────────────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const STATUS_BADGE = {
  success: { bg:"#DCFCE7", fg:"#166534", short:"✓", long:"✓ Success" },
  pending: { bg:"#FEF3C7", fg:"#92400E", short:"⏳", long:"⏳ Processing" },
  failed:  { bg:"#FEE2E2", fg:"#991B1B", short:"✗", long:"✗ Failed" },
}
const badgeFor = (st) => STATUS_BADGE[st] || STATUS_BADGE.failed

export default function App() {
const { piAuth, piUser, createPayment, isReady } = usePi()
const { theme, toggleTheme } = useTheme()
const [liveRate, setLiveRate] = useState(() => {
const cached = Number(localStorage.getItem("zappi_rate"))
return cached > 0 ? cached : 2150
})
const [rateLive, setRateLive] = useState(false)
const [rateFetchedAt, setRateFetchedAt] = useState(null)

useEffect(() => {
let cancelled = false
const API = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const fetchRate = async (attempt = 0) => {
try {
const r = await fetch(`${API}/api/pi-rate`)
const d = await r.json()
if (!cancelled && d && d.ngnPerPi > 0) {
setLiveRate(d.ngnPerPi)
setRateFetchedAt(Date.now())
setRateLive((d.source === "live" || d.source === "live-cached") && !d.stale)
localStorage.setItem("zappi_rate", String(d.ngnPerPi))
}
} catch {
// Render free tier can cold-start (~50s); back off and retry a few times
if (!cancelled && attempt < 5) {
setTimeout(() => fetchRate(attempt + 1), Math.min(2000 * 2 ** attempt, 30000))
}
}
}
fetchRate()
const interval = setInterval(() => fetchRate(), 60000) // refresh while app is open
return () => { cancelled = true; clearInterval(interval) }
}, [])

const [authScreen, setAuthScreen] = useState("splash") // splash|login
const [isLoggedIn, setIsLoggedIn] = useState(false)
const [txnPinReady, setTxnPinReady] = useState(hasServerPin())
const [showProfile, setShowProfile] = useState(false)
const [showHowTo, setShowHowTo] = useState(false)

// Check if user exists on load
useEffect(() => {
const user = localStorage.getItem("zappi_user")
const pin = localStorage.getItem("zappi_login_pin")
if (user) setAuthScreen("login")
}, [])

const [page, setPage] = useState("home")
const [subPage, setSubPage] = useState(null)
const [toast, setToast] = useState(null)
// Admin-editable home-screen promo strip (title/desc/link only — icon and
// gradient stay a small fixed rotation, per the deliberate design choice
// in the backend PR: keeps the strip visually consistent instead of
// becoming a full design tool for 3 cards). null = not loaded yet, use
// the hardcoded fallback below so the strip is never empty/broken.
const [banners, setBanners] = useState(null)
useEffect(() => {
const apiUrl = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const token = localStorage.getItem("zappi_token")
fetch(`${apiUrl}/api/banners`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
.then(r => r.ok ? r.json() : { banners: [] })
.then(d => setBanners(d.banners && d.banners.length ? d.banners : null))
.catch(() => setBanners(null))
}, [])
// Admin-editable feature flags — e.g. re-enabling Insurance the moment
// VTPass's SERVICE_SUSPENDED clears, without a redeploy. Empty object
// until loaded, so every flag check below defaults to "off" (the current,
// known-safe state) until we actually hear back.
const [flags, setFlags] = useState({})
useEffect(() => {
const apiUrl = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const token = localStorage.getItem("zappi_token")
fetch(`${apiUrl}/api/flags`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
.then(r => r.ok ? r.json() : { flags: {} })
.then(d => setFlags(d.flags || {}))
.catch(() => setFlags({}))
}, [])
// Promo code: validated by the server when entered, and again (authoritatively) at payment time.
const [promo, setPromo] = useState(() => { try { return JSON.parse(localStorage.getItem("zappi_promo")) } catch { return null } })
const storePromo = (p) => { setPromo(p); try { p ? localStorage.setItem("zappi_promo", JSON.stringify(p)) : localStorage.removeItem("zappi_promo") } catch {} }
const applyPromo = async (code) => {
try {
const r = await fetch(`${API_BASE}/api/promos/check`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("zappi_token")||""}` }, body: JSON.stringify({ code }) })
const d = await r.json().catch(() => ({}))
if (!r.ok) { showToast(d.error || "That code didn't work", "danger"); return false }
storePromo(d); showToast(`${d.code} applied: ${d.percent}% off`, "success"); return true
} catch { showToast("Network problem — try again", "danger"); return false }
}
// Naira off this purchase (0 when no code, or the code doesn't cover this service/amount).
const promoDiscount = (tx) => {
if (!promo || tx.pi != null) return 0
if (promo.services?.length && !promo.services.includes(tx.type)) return 0
if (promo.minAmountNGN && Number(tx.ngn) < promo.minAmountNGN) return 0
return Math.max(0, Math.floor(Math.min(Number(tx.ngn) * promo.percent / 100, promo.maxDiscountNGN || Infinity)))
}
// Service notices from the admin ("MTN data is down"), refreshed every 2 minutes while signed in.
const [notices, setNotices] = useState([])
const [cfg, setCfg] = useState({})
useEffect(() => {
if (!isLoggedIn) return
let off = false
const load = () => {
const token = localStorage.getItem("zappi_token")
fetch(`${API_BASE}/api/notices`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
.then(r => r.ok ? r.json() : { notices: [] })
.then(d => {
if (off) return
setNotices(d.notices || [])
setCfg(d.config || {})
// Support details the owner set in Admin → Settings replace the built-in ones.
const sp = d.config?.support || {}
if (sp.whatsapp) CONFIG.whatsappNumber = sp.whatsapp
if (sp.email) CONFIG.supportEmail = sp.email
CONFIG.supportHours = sp.hours || ""
})
.catch(() => {})
}
load()
const id = setInterval(load, 120000)
return () => { off = true; clearInterval(id) }
}, [isLoggedIn])
const blockingNoticeFor = (billType, serviceID) => notices.find(n => n.blocking && (n.key === "all" || n.key === billType || n.key === `${billType}:${serviceID}`))
// Open-ticket count, shown as a badge on the Admin tile — only fetched
// for the admin account, since regular users would just get a 403.
// Exposed as a plain function (not just a useEffect body) so it can be
// re-run after admin actions inside AdminScreen and again when the admin
// backs out of the screen — previously this only ever ran once on mount,
// so the badge stayed stuck showing a stale count until a full re-login.
const [openTicketCount, setOpenTicketCount] = useState(0)
// "owner", "staff" or null — decided by the server, so staff added in Admin → Settings get the Admin entry too.
const [adminRole, setAdminRole] = useState(null)
useEffect(() => {
if (!isLoggedIn) return
fetch(`${API_BASE}/api/admin-role`, { headers: { Authorization: `Bearer ${localStorage.getItem("zappi_token")||""}` } })
.then(r => r.ok ? r.json() : { role: null }).then(d => setAdminRole(d.role || null)).catch(() => {})
}, [isLoggedIn])
useEffect(() => {
if (!isLoggedIn) return
loadMe()
const rc = readRefCode()
if (rc) { claimRef(rc).finally(() => { try { const u = new URL(window.location.href); u.searchParams.delete("ref"); window.history.replaceState({}, "", u) } catch {} }) }
dueReminders().forEach(r => addNotification({ title: "Time to buy again", body: `${r.what}${r.who ? " for " + r.who : ""} — your ${r.every}ly reminder.`, type: "info" }))
}, [isLoggedIn])
// Keep History honest: pull the latest status of orders that were still processing (or made on another device).
useEffect(() => {
if (!isLoggedIn) return
const sync = async () => {
try {
const r = await fetch(`${API_BASE}/api/transactions`, { headers: { Authorization: `Bearer ${localStorage.getItem("zappi_token")||""}` } })
if (!r.ok) return
const { transactions: server = [] } = await r.json()
const byReq = new Map(server.filter(s => s.requestId).map(s => [s.requestId, s]))
setTransactions(prev => {
let changed = false
const next = prev.map(t => {
const s = t.requestId && byReq.get(t.requestId)
if (!s || t.status === s.status && (t.token || !s.meta?.deliveredCode) && (t.refund || !s.refund?.status)) return t
const patch = {}
if (t.status !== s.status && (t.status === "pending" || s.status === "failed" || s.status === "success")) patch.status = s.status
if (!t.token && s.meta?.deliveredCode && s.status === "success") patch.token = s.meta.deliveredCode
if (s.refund?.status && t.refund !== s.refund.status) patch.refund = s.refund.status
if (!Object.keys(patch).length) return t
changed = true
if (patch.status === "success" && t.status === "pending") addNotification({ title: "Order delivered", body: `${t.label} — ${t.amount} went through.`, type: "success", txRef: t.id })
if (patch.status === "failed" && t.status === "pending") addNotification({ title: "Order failed", body: `${t.label} — ${t.amount} could not be delivered.${s.refund?.status ? " Your Pi is being refunded." : ""}`, type: "info", txRef: t.id })
return { ...t, ...patch }
})
if (changed) localStorage.setItem("zappi_txs", JSON.stringify(next))
return changed ? next : prev
})
} catch {}
}
sync()
const iv = setInterval(sync, 60000)
return () => clearInterval(iv)
}, [isLoggedIn])
const isAdminAny = isAdminUser() || !!adminRole
const loadOpenTicketCount = () => {
if (!isAdminAny) return
const apiUrl = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const token = localStorage.getItem("zappi_token")
fetch(`${apiUrl}/api/tickets`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
.then(r => r.ok ? r.json() : { tickets: [] })
.then(d => setOpenTicketCount((d.tickets || []).filter(t => t.status === "open").length))
.catch(() => setOpenTicketCount(0))
}
useEffect(() => { loadOpenTicketCount() }, [])
const [toastType, setToastType] = useState("success")
// Persists across navigation (unlike a toast) — the Pi wallet ceremony plus
// our backend's VTPass round-trip can take up to ~30s with zero feedback
// otherwise, which made the eventual receipt feel like it "popped up from
// nowhere" after someone had already moved on to browsing elsewhere in the
// app. The 45s safety timeout is a bounded worst-case fallback in case a
// failure path doesn't explicitly clear it — never gets permanently stuck.
const [isPaying, setIsPaying] = useState(false)
const [forgotPin, setForgotPin] = useState(false)
const [me, setMe] = useState(null)
const [creditOn, setCreditOnState] = useState(() => localStorage.getItem("zappi_credit_off") !== "1")
const setCreditOn = (v) => { setCreditOnState(v); try { v ? localStorage.removeItem("zappi_credit_off") : localStorage.setItem("zappi_credit_off", "1") } catch {} }
const [payReq, setPayReq] = useState(() => readPayRequest())
const loadMe = () => fetch(`${API_BASE}/api/referral/me`, { headers: { Authorization: `Bearer ${localStorage.getItem("zappi_token")||""}` } }).then(r => r.ok ? r.json() : null).then(d => d && setMe(d)).catch(() => {})
const claimRef = async (code) => {
  try {
    const r = await fetch(`${API_BASE}/api/referral/claim`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("zappi_token")||""}` }, body: JSON.stringify({ code }) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { showToast(d.error || "Could not apply the code", "danger"); return false }
    showToast("Code applied. Your reward comes after your first delivered order.", "success", 6000); loadMe(); return true
  } catch { showToast("Network problem — try again", "danger"); return false }
}
useEffect(()=>{const f=()=>setForgotPin(true);window.addEventListener("zappi-forgot-pin",f);return()=>window.removeEventListener("zappi-forgot-pin",f)},[])
const [txnPinModal, setTxnPinModal] = useState(null) // {label, onSuccess}
const [receiptTx, setReceiptTx] = useState(null)
const txToReceipt = (tx) => ({ token: tx.token || undefined, status: tx.status || "success", type: tx.type, amount: Number(String(tx.pi).replace(/[^0-9.]/g,"")) || 0, nairaAmount: Number(String(tx.amount).replace(/[^0-9.]/g,"")) || 0, provider: tx.label, recipient: tx.sub, reference: tx.requestId || ("ZAP-" + String(tx.backendId || tx.id).slice(-10).toUpperCase()), date: tx.ts ? new Date(tx.ts) : new Date() })

// ── TRANSACTION LEDGER ───────────────────────────────────────────────────────────
// Real history only — no fabricated starting balance or seed data. Zappi
// never holds custody of Pi (each payment pulls straight from the user's
// own wallet via the SDK, per-transaction), so there's nothing legitimate
// a client-side "Pi balance" figure could ever represent. A brand-new user
// correctly starts with an empty list rather than fake demo transactions.
const [transactions, setTransactions] = useState(() => {
try {
const saved = JSON.parse(localStorage.getItem("zappi_txs"))
if (Array.isArray(saved)) return saved
} catch {}
return []
})
// History is cached on this device. If the signed-in account or the Pi network changed
// (e.g. testnet -> mainnet), drop the old cache so sandbox purchases don't show up as real ones.
const syncLocalAccount = () => {
try {
const t = localStorage.getItem("zappi_token") || ""
const sub = JSON.parse(atob(t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).sub
const marker = `${import.meta.env.VITE_PI_SANDBOX === "false" ? "mainnet" : "sandbox"}:${sub}`
if (localStorage.getItem("zappi_acct") !== marker) {
localStorage.removeItem("zappi_txs")
localStorage.setItem("zappi_acct", marker)
setTransactions([])
}
} catch {}
}
const addTransaction = (tx) => setTransactions(prev => {
const next = [{ id: Date.now(), ts: Date.now(), status: "success", ...tx }, ...prev]
localStorage.setItem("zappi_txs", JSON.stringify(next))
return next
})
// Most frequent successful airtime purchase (same network + number + amount, bought 2+ times).
const usualAirtime = (() => {
const counts = {}
for (const t of transactions) {
if (t.type !== "airtime" || t.status !== "success" || !t.raw?.phone) continue
const k = `${t.raw.network}|${t.raw.phone}|${t.raw.amount}`
counts[k] = counts[k] || { n: 0, tx: t }
counts[k].n++
}
const best = Object.values(counts).sort((a, b) => b.n - a.n)[0]
return best && best.n >= 2 ? best.tx : null
})()
const [, setLangTick] = useState(0) // re-render after a language change
const [giftOn, setGiftOn] = useState(false)
const [giftMsg, setGiftMsg] = useState("")
const [giftTx, setGiftTx] = useState(null)
const [askOpen, setAskOpen] = useState(false)
const [checkingId, setCheckingId] = useState(null)
const patchTransaction = (matchFn, patch) => setTransactions(prev => {
const next = prev.map(t => matchFn(t) ? { ...t, ...patch } : t)
localStorage.setItem("zappi_txs", JSON.stringify(next))
return next
})
// Re-checks a processing order with the provider (via our server) and updates it.
const checkStatus = async (tx) => {
if (!tx.requestId) return
setCheckingId(tx.id)
try {
const r = await fetch(`${API_BASE}/api/payments/status`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${localStorage.getItem("zappi_token")||""}` }, body: JSON.stringify({ requestId: tx.requestId }) })
const d = await r.json().catch(()=>({}))
if (!r.ok) { showToast(d.error || "Could not check right now — try again shortly.","danger"); return }
if (d.tooSoon) { showToast("Just checked — please wait a few seconds and try again.","info"); return }
if (d.status === "success") { patchTransaction(t=>t.id===tx.id,{status:"success", ...(d.token?{token:d.token}:{})}); showToast("Delivered! Your order went through. 🎉","success") }
else if (d.status === "failed") { patchTransaction(t=>t.id===tx.id,{status:"failed", refund:d.refund||null}); showToast(d.refund==="processing" ? "This order failed. Your Pi is being refunded automatically." : "This order failed. Open Help & Support and we will sort it out.","danger",8000) }
else showToast("Still processing. We will keep trying — check again in a minute.","info")
} catch { showToast("Network problem — please try again.","danger") }
finally { setCheckingId(null) }
}
// Real lifetime activity derived from actual transaction history — shown
// on the home screen in place of the old fabricated "Pi Balance" figure.
const txStats = (() => {
const num = v => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0
const paid = transactions.filter(t => t.status === "success" && t.type !== "receive")
const piSent = paid.reduce((a, t) => a + num(t.pi), 0)
return { count: transactions.length, piSent }
})()

const [network,setNetwork]=useState("")
const [phone,setPhone]=useState("")
const [amount,setAmount]=useState("")
const [bundle,setBundle]=useState(null)
const [disco,setDisco]=useState("")
const [meter,setMeter]=useState("")
const [verifiedName,setVerifiedName]=useState("")
const [elecMinAmount,setElecMinAmount]=useState(null)
const [eduProduct,setEduProduct]=useState(null)
const [insFullName,setInsFullName]=useState("")
const [insAddress,setInsAddress]=useState("")
const [insDob,setInsDob]=useState("")
const [insNextKinName,setInsNextKinName]=useState("")
const [insNextKinPhone,setInsNextKinPhone]=useState("")
const [insOccupation,setInsOccupation]=useState("")
const [smileEmail,setSmileEmail]=useState("")
const [smileAccounts,setSmileAccounts]=useState([])
const [smileAccount,setSmileAccount]=useState(null)
const [savePromptFor,setSavePromptFor]=useState(null)
const { save: saveAirtimeBeneficiary } = useBeneficiaries("airtime")
const { save: saveDataBeneficiary } = useBeneficiaries("data")
const { save: saveElectricityBeneficiary } = useBeneficiaries("electricity")
const { save: saveCableBeneficiary } = useBeneficiaries("cable")
const { save: saveInternetBeneficiary } = useBeneficiaries("internet")
const [meterType,setMeterType]=useState("prepaid")
const [recipient,setRecipient]=useState("")
const [piAmount,setPiAmount]=useState("")
const [note,setNote]=useState("")
const [txFilter,setTxFilter]=useState("all")
const [internetProvider,setInternetProvider]=useState(null)

// Auto-detect the mobile network from the phone number (airtime/data screens only —
// phone isn't used elsewhere). Purely a convenience + trust signal; the user can
// still pick a different network manually via NetGrid at any time.
const [phoneDetected,setPhoneDetected]=useState(null)
useEffect(()=>{
const digits = String(phone||"").replace(/\D/g,"")
if (digits.length>=11) {
const detected = detectNetwork(phone)
setPhoneDetected(detected)
if (detected && !network) setNetwork(detected) // don't override a manual choice — ported numbers exist
} else {
setPhoneDetected(null)
}
},[phone])

const user = JSON.parse(localStorage.getItem("zappi_user")||"{}")

const showToast=(msg,type="success",ms=3500)=>{ setToast(msg); setToastType(type); setTimeout(()=>setToast(null),ms) }

// Opens the PIN confirmation modal; onConfirmed receives a single-use confirmation
// token bound to txnFields (required by /api/payments/complete). Setup is
// guaranteed by the txnPinReady gate, so confirmation is never skippable.
const requireTxnConfirmation=(label,txnFields,onConfirmed,detail)=>setTxnPinModal({label,txnFields,onConfirmed,detail})

const validate=(type)=>{
if(type==="airtime"){
if(!network) return showToast("Select a network","danger")
if(!/^0[7-9][0-1]\d{8}$/.test(phone)) return showToast("Enter a valid 11-digit Nigerian phone number","danger")
if(!amount||Number(amount)<50) return showToast("Minimum airtime is ₦50","danger")
return true
}
if(type==="data"){
if(!network) return showToast("Select a network","danger")
if(!/^0[7-9][0-1]\d{8}$/.test(phone)) return showToast("Enter a valid 11-digit Nigerian phone number","danger")
if(!bundle) return showToast("Select a data bundle","danger")
return true
}
if(type==="electricity"){
if(!disco) return showToast("Select your DISCO","danger")
if(meter.length<11||meter.length>13) return showToast("Enter a valid meter number (11-13 digits)","danger")
const minReq = elecMinAmount || 1000
if(!amount||Number(amount)<minReq) return showToast(`Minimum for this meter is ₦${minReq.toLocaleString()}`,"danger")
return true
}
if(type==="cable"){
if(!network) return showToast("Select a provider","danger")
if(meter.length<10) return showToast("Enter a valid smartcard/IUC number","danger")
if(!bundle) return showToast("Select a package","danger")
return true
}
if(type==="internet"){
if(!internetProvider) return showToast("Select a provider","danger")
if(internetProvider.id==="smile"){
if(!smileAccount) return showToast("Verify your Smile email and select an account","danger")
if(!phone) return showToast("Enter your phone number","danger")
}else{
if(meter.length<6) return showToast("Enter a valid account number","danger")
}
if(!bundle) return showToast("Select a plan","danger")
return true
}
if(type==="send"){
if(recipient.length<3) return showToast("Enter a valid Pioneer username","danger")
if(!piAmount||Number(piAmount)<=0) return showToast("Enter a valid Pi amount","danger")
return true
}
return true
}

const resetInputs=()=>{
setAmount(""); setPhone(""); setNetwork(""); setBundle(null)
setDisco(""); setMeter(""); setRecipient(""); setPiAmount(""); setNote("")
setInternetProvider(null)
setInsFullName(""); setInsAddress(""); setInsDob(""); setInsNextKinName(""); setInsNextKinPhone(""); setInsOccupation("")
setSmileEmail(""); setSmileAccounts([]); setSmileAccount(null)
setElecMinAmount(null)
}

// Restores a past purchase's exact details (from tx.raw, saved at the time of that
// purchase) and jumps back to the matching screen so the user can review and resubmit.
// tx.raw is only present on transactions made after this feature shipped — older
// seed/demo entries simply won't show the button (see the History row rendering).
const reportIssue=(tx)=>{
const ref = tx.requestId || ("ZAP-" + String(tx.backendId || tx.id).slice(-10).toUpperCase())
const msg = `Hi Zappi NG Support, I'd like to report an issue with a transaction.\n\nReference: ${ref}\nService: ${tx.label}\nAmount: ${tx.amount} (${tx.pi})\nDate: ${tx.ts ? new Date(tx.ts).toLocaleString() : tx.date}\n\nIssue: `
const apiUrl = import.meta.env.VITE_API_URL || "https://zappi-ng-backend-1.onrender.com"
const token = localStorage.getItem("zappi_token")
if (token) {
fetch(`${apiUrl}/api/tickets`, {
method: "POST",
headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
body: JSON.stringify({ subject: `Transaction issue — ${ref}`, message: `Service: ${tx.label}\nAmount: ${tx.amount} (${tx.pi})\nReference: ${ref}${tx.backendId ? `\nExact transaction ID: ${tx.backendId}` : ""}` }),
}).catch(() => {}) // fire-and-forget — WhatsApp opening should never be blocked by this
}
window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank")
}
const buyAgain=(tx)=>{
const r = tx.raw
if (!r) { showToast("Can't repeat this transaction","danger"); return }
resetInputs()
switch(tx.type){
case "airtime": setNetwork(r.network); setPhone(r.phone); setAmount(r.amount); break
case "data": {
setNetwork(r.network); setPhone(r.phone)
setBundle(r.bundleCode ? { code: r.bundleCode, label: r.bundleLabel, price: r.bundlePrice } : null)
break
}
case "electricity": setDisco(r.disco); setMeter(r.meter); setMeterType(r.meterType); setAmount(r.amount); break
case "cable": setNetwork(r.network); setMeter(r.meter); setBundle(r.bundleCode ? { code: r.bundleCode, label: r.bundleLabel, price: r.bundlePrice } : null); break
case "internet": setInternetProvider(INTERNET_PROVIDERS.find(p=>p.id===r.providerId) || null); setMeter(r.meter); setBundle(r.bundleCode ? { code: r.bundleCode, label: r.bundleLabel, price: r.bundlePrice } : null); break
case "betting": showToast("Betting top-ups are no longer available","danger"); return
case "education": setEduProduct(r.eduProduct); setPhone(r.phone); setMeter(r.meter); setBundle(r.bundleCode ? { code: r.bundleCode, label: r.bundleLabel, price: r.bundlePrice } : null); break
case "showmax": setPhone(r.phone); setBundle(r.bundleCode ? { code: r.bundleCode, label: r.bundleLabel, price: r.bundlePrice } : null); break
case "insurance": showToast("Insurance is temporarily suspended by our payments provider — check back soon","danger"); return
default: showToast("Can't repeat this transaction","danger"); return
}
setPage(r.page); setSubPage(r.subPage)
}

// The five fields the confirmation token is cryptographically bound to.
// They must be sent identically to the confirm endpoint and /api/payments/complete.
const buildTxnFields=(tx)=>{
switch(tx.type){
case "airtime": return { serviceID: VTPASS_AIRTIME[network]||"", billType:"airtime", amount: tx.ngn, phone, billersCode: phone }
case "data": return { serviceID: VTPASS_DATA[network]||"", billType:"data", amount: tx.ngn, phone, billersCode: phone }
case "electricity": return { serviceID: VTPASS_DISCO[disco.split(" ")[0]]||"", billType:"electricity", amount: tx.ngn, phone: meter, billersCode: meter }
case "cable": return { serviceID: VTPASS_CABLE[network]||"", billType:"cable", amount: tx.ngn, phone: meter, billersCode: meter }
case "internet": return internetProvider?.id === "smile"
? { serviceID: VTPASS_INTERNET.smile, billType:"internet", amount: tx.ngn, phone, billersCode: smileAccount?.id || "" }
: { serviceID: VTPASS_INTERNET[internetProvider?.id]||"", billType:"internet", amount: tx.ngn, phone: meter, billersCode: meter }
case "education": return { serviceID: VTPASS_EDU[eduProduct]||"", billType:"education", amount: tx.ngn, phone, billersCode: eduProduct==="jamb" ? meter : phone }
// billersCode is the customer's full name here, per VTPass's own sample payload — not phone, unlike every other product.
case "insurance": return { serviceID: VTPASS_INSURANCE, billType:"insurance", amount: tx.ngn, phone, billersCode: insFullName }
case "showmax": return { serviceID: VTPASS_SHOWMAX, billType:"showmax", amount: tx.ngn, phone, billersCode: phone }
default: return { serviceID: tx.type, billType: tx.type, amount: tx.ngn, phone: tx.sub||"", billersCode: "" }
}
}

// Records the transaction so History/Home stay truthful.
const finishPayment=(service, tx, piCost, backendTxId, requestId, status="success", deliveredToken=null)=>{
setIsPaying(false)
const newTx = {
id: Date.now(), backendId: backendTxId || null, requestId: requestId || null, ts: Date.now(), status,
type: tx.type, label: tx.label, sub: tx.sub,
amount: `₦${Math.round(Number(tx.ngn)).toLocaleString()}`,
pi: `π${piCost.toFixed(2)}`,
color: tx.color || "#EFF6FF", icon: tx.icon || "💳",
raw: tx.raw || null, token: deliveredToken || undefined,
}
addTransaction(newTx)
if (status !== "failed" && tx.type === "data" && tx.raw?.bundleCode) {
try {
const prev = JSON.parse(localStorage.getItem("zappi_recent_bundles") || "[]")
localStorage.setItem("zappi_recent_bundles", JSON.stringify([tx.raw.bundleCode, ...prev.filter(c => c !== tx.raw.bundleCode)].slice(0, 6)))
} catch {}
}
if (status === "pending") {
addNotification({ title: "Order processing", body: `${service} — ${newTx.amount}. Tap Check status in History if it is slow.`, type: "info", txRef: newTx.id })
setReceiptTx(newTx)
showToast(`${service} is processing — we'll confirm it shortly. You can tap "Check status" in History.`,"info",7000)
} else {
addNotification({ title: "Payment successful", body: `${service} — ${newTx.amount} paid with ${newTx.pi}`, type: "success", txRef: newTx.id })
setReceiptTx(newTx)
showToast(`${service} payment successful! 🎉`,"success")
if (giftOn) { setGiftTx({ ...newTx, message: giftMsg }); setGiftOn(false); setGiftMsg("") }
}
setSubPage(null)
resetInputs()
}

// Real path: Pi payment on-chain, then VTPass delivery via /api/payments/complete.
// If the 120s confirmation token expires while the Pi wallet ceremony runs, the
// delivery returns 401 — we re-confirm (Pi is NOT re-charged) and retry delivery only.
const runRealPayment=(service, tx, txnFields, piCost, confirmationToken, promoCode=null, creditOff=0)=>{
setIsPaying(true)
setTimeout(() => {
setIsPaying(prevIsPaying => {
if (!prevIsPaying) return prevIsPaying // already resolved (success/error) — nothing stuck, don't interfere
showToast("This payment is taking much longer than expected. Nothing has been deducted — please check History in a few minutes before trying again.", "danger")
setSubPage(null)
resetInputs()
return false
})
}, 75000)
const extras = {
// electricity REQUIRES variation_code = "prepaid"|"postpaid" — omitting it makes
// VTPass reject delivery with code 011 "INVALID ARGUMENTS" AFTER Pi has charged.
variation_code: tx.type === "electricity" ? meterType : ["data","cable","internet","education","insurance","showmax"].includes(tx.type) ? bundle?.code : undefined,
// VTPass's Personal Accident Insurance purchase needs these on top of the usual
// fields — full_name, address, dob (YYYY-MM-DD), and next-of-kin details.
...(tx.type === "insurance" ? {
full_name: insFullName,
address: insAddress,
dob: insDob,
next_kin_name: insNextKinName,
next_kin_phone: insNextKinPhone,
business_occupation: insOccupation,
} : {}),
piAmount: piCost,
...(promoCode ? { promoCode } : {}),
...(creditOff > 0 ? { creditNGN: creditOff } : {}),
}
const deliveryFailMsg = (svc, err) => `Your Pi was received but ${svc} was not delivered${err?.message ? " ("+err.message+")" : ""}.${err?.data?.requestId ? " Ref: "+err.data.requestId+"." : ""} ${err?.data?.refund === "processing" ? "Your Pi is being refunded automatically." : "Please don't pay again — open Help & Support and we'll fix it."}`
const recordFailure = (svc, err) => {
setIsPaying(false)
if (!err?.data?.requestId) return
addTransaction({ id: Date.now(), backendId: err.data.txId || null, requestId: err.data.requestId, ts: Date.now(), status: "failed",
type: tx.type, label: tx.label, sub: tx.sub, amount: `₦${Math.round(Number(tx.ngn)).toLocaleString()}`, pi: `π${piCost.toFixed(2)}`,
color: tx.color || "#EFF6FF", icon: tx.icon || "💳", raw: null, refund: err.data.refund || null })
}
const deliver = async (token, piPaymentId) => {
const completion = await completeBillPayment(txnFields, { ...extras, piPaymentId }, token)
finishPayment(service, tx, piCost, completion?.txId, completion?.requestId, completion?.status === "pending" ? "pending" : "success", completion?.token || null)
if (promoCode) storePromo(null)
if (creditOff > 0) setTimeout(loadMe, 1500)
else setTimeout(loadMe, 4000)
}
createPayment(
{ amount: Number(piCost.toFixed(7)), memo: `Zappi NG — ${service}`, metadata: { ...txnFields, ...extras } },
async (txid, piData, paymentId) => {
try { await deliver(confirmationToken, paymentId) }
catch (e) {
if (e.status === 401) {
requireTxnConfirmation(`Confirm ${service} delivery`, txnFields, async (fresh) => {
setTxnPinModal(null)
try { await deliver(fresh, paymentId) }
catch (e2) { recordFailure(service, e2); showToast(deliveryFailMsg(service, e2),"danger",9000) }
})
} else { recordFailure(service, e); showToast(deliveryFailMsg(service, e),"danger",9000) }
}
},
(err)=>showToast(err?.message || "Pi payment failed","danger")
)
}

// handlePay(service, tx): tx = { type, label, sub, ngn, pi?, icon?, color? }
const handlePay=(service, tx)=>{
if (REAL_PAYMENTS && !rateLive) { showToast("The live Pi rate isn't confirmed yet — please wait a few seconds and try again.","danger",6000); return }
const promoOff = promoDiscount(tx)
const creditOff = (creditOn && me?.creditNGN > 0 && tx.pi == null) ? Math.max(0, Math.min(Math.floor(me.creditNGN), Math.floor(Number(tx.ngn) - promoOff - 1))) : 0
const piCost = tx.pi != null ? Number(tx.pi) : (Number(tx.ngn) - promoOff - creditOff) / liveRate
const txnFields = buildTxnFields(tx)
const blocked = blockingNoticeFor(txnFields.billType, txnFields.serviceID)
if (blocked) { showToast(blocked.message, "danger", 8000); return }
const lim = cfg.limits || {}
const ngnAmt = Number(tx.ngn)
if (lim.minNGN > 0 && ngnAmt < lim.minNGN) { showToast(`The minimum purchase is ₦${lim.minNGN}`, "danger"); return }
if (lim.maxNGN > 0 && ngnAmt > lim.maxNGN) { showToast(`The maximum purchase is ₦${lim.maxNGN}`, "danger"); return }
if (lim.dailyCapNGN > 0 && (cfg.spentTodayNGN || 0) + ngnAmt > lim.dailyCapNGN) { showToast(`Daily limit: ₦${lim.dailyCapNGN} per day. You have ₦${Math.max(0, lim.dailyCapNGN - (cfg.spentTodayNGN || 0))} left today.`, "danger", 7000); return }
requireTxnConfirmation(`Confirm ${service}${promoOff>0?` (promo −₦${promoOff})`:""}${creditOff>0?` (credit −₦${creditOff})`:""}`, txnFields, (confirmationToken)=>{
setTxnPinModal(null)
const vtpassEligible = ["airtime","data","electricity","cable","internet","education","insurance","showmax"].includes(tx.type) && !!txnFields.serviceID
if (REAL_PAYMENTS) {
// Live mode: never fall back to the simulated ledger — a user who is not
// inside the Pi Browser must not be shown a fake "payment successful".
if (!vtpassEligible) showToast("This service isn't available for payment yet.","danger")
else if (!isReady || !window.Pi) showToast("Open Zappi NG inside the Pi Browser to pay with Pi.","danger")
else runRealPayment(service, tx, txnFields, piCost, confirmationToken, promoOff>0 ? promo.code : null, creditOff)
} else {
// Demo mode (VITE_REAL_PAYMENTS is not "true"): simulated ledger — no Pi moves.
// A banner at the top of the screen says so.
finishPayment(service, tx, piCost)
}
}, `${tx.label || service}${tx.sub ? " → " + tx.sub : ""} · ₦${Math.round(ngnAmt).toLocaleString()}`)
}


const navTo=(p,sub=null)=>{ setPage(p); setSubPage(sub) }

const [legalPage, setLegalPage] = useState(() => {
// Lets external links (e.g. Pi Developer Portal's Privacy Policy / Terms of
// Service URL fields) deep-link straight into these screens instead of just
// loading the home screen. Real working URLs:
//   https://zappi-ng-frontend.vercel.app/?legal=privacy
//   https://zappi-ng-frontend.vercel.app/?legal=terms
const p = new URLSearchParams(window.location.search).get("legal")
return p === "privacy" || p === "terms" ? p : null
})
if (legalPage === "privacy") return <PrivacyPolicy onBack={() => setLegalPage(null)} />
if (legalPage === "terms") return <TermsOfService onBack={() => setLegalPage(null)} />
if (legalPage === "support") return <SupportPage onBack={() => setLegalPage(null)} />
if (legalPage === "admin") return <AdminScreen role={adminRole || "owner"} onBack={() => { setLegalPage(null); loadOpenTicketCount(); }} showToast={showToast} onTicketsChanged={loadOpenTicketCount} />

const filteredTx = txFilter==="all"?transactions:transactions.filter(t=>t.type===txFilter)

// ── AUTH SCREENS ────────────────────────────────────────────────────────────────────────
if (!isLoggedIn) {
if (authScreen === "splash") return <SplashScreen onContinue={setAuthScreen} onSuccess={()=>{syncLocalAccount();setIsLoggedIn(true);setTxnPinReady(hasServerPin())}} />
if (authScreen === "login") return <LoginScreen onSuccess={()=>{syncLocalAccount();setIsLoggedIn(true);setTxnPinReady(hasServerPin())}} />
}

// First-login (or migration from the old on-device PIN): require a
// server-side transaction PIN before entering the app
if (!txnPinReady) return <ChangePinFlow kind="txn" forceSetup onDone={()=>setTxnPinReady(true)}
subtitle={hasLegacyPin() ? "We've upgraded PIN security — please set your transaction PIN again. It's now verified on our servers, never stored on your device." : undefined} />

if (forgotPin) return <ChangePinFlow kind="txn" mode="reset" forceSetup onBack={()=>setForgotPin(false)} onDone={()=>{setForgotPin(false);showToast&&showToast("PIN reset. Purchases are limited for 24 hours.")}} />

// Keep Profile inside the same phone-width shell as the rest of the app
if (showProfile) return (
<div style={{maxWidth:430,margin:"0 auto",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",position:"relative"}}>
<ProfileScreen onBack={()=>setShowProfile(false)} onLogout={()=>{ localStorage.removeItem("zappi_token"); setIsLoggedIn(false); setAuthScreen("login"); setShowProfile(false) }} />
</div>
)

// ── MAIN APP ──────────────────────────────────────────────────────────────────────────────
return (
<div style={{maxWidth:430,margin:"0 auto",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",position:"relative"}}>

{toast&&<div style={{position:"fixed",top:20,left:16,right:16,maxWidth:400,margin:"0 auto",background:toastType==="success"?C.success:toastType==="info"?"#475569":C.danger,color:"white",padding:"12px 24px",borderRadius:24,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",whiteSpace:"normal"}}>{toast}</div>}

{payReq&&!txnPinModal&&<div style={{position:"fixed",left:0,right:0,bottom:0,zIndex:9000,display:"flex",justifyContent:"center"}}><div style={{width:"100%",maxWidth:430,background:"var(--card-bg)",borderRadius:"20px 20px 0 0",padding:"18px 18px 28px",boxShadow:"0 -8px 30px rgba(0,0,0,0.25)"}}>
<p style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>🙏 Someone asked you to buy airtime</p>
<p style={{margin:"0 0 8px",fontSize:14}}>₦{payReq.amount.toLocaleString()} {payReq.network} airtime to <b>{payReq.phone}</b></p>
<p style={{margin:"0 0 12px",fontSize:12,color:"var(--text-tertiary)"}}>Only pay if you know this person and the number is theirs. A wrong number cannot be reversed.</p>
<div style={{display:"flex",gap:8}}>
<button onClick={()=>{const r=payReq;setPayReq(null);try{const u=new URL(window.location.href);u.searchParams.delete("req");window.history.replaceState({},"",u)}catch{};handlePay("Airtime",{type:"airtime",label:`${r.network} Airtime`,sub:r.phone,ngn:r.amount,icon:"📱",color:"#EFF6FF",raw:{page:"bills",subPage:"airtime",network:r.network,phone:r.phone,amount:r.amount}})}} style={{flex:1,padding:12,borderRadius:12,border:"none",background:"#CC4E00",color:"white",fontWeight:700,cursor:"pointer"}}>Pay now</button>
<button onClick={()=>{setPayReq(null);try{const u=new URL(window.location.href);u.searchParams.delete("req");window.history.replaceState({},"",u)}catch{}}} style={{flex:1,padding:12,borderRadius:12,border:"1px solid var(--border)",background:"none",color:"var(--text-primary)",fontWeight:700,cursor:"pointer"}}>Not now</button>
</div></div></div>}
{txnPinModal&&<TxnPinModal detail={txnPinModal.detail} onForgot={()=>{setTxnPinModal(null);setForgotPin(true)}} label={txnPinModal.label} txnFields={txnPinModal.txnFields} onSuccess={txnPinModal.onConfirmed} onCancel={()=>setTxnPinModal(null)}/>}
{showHowTo&&<HowToModal onClose={()=>setShowHowTo(false)}/>}
{askOpen&&<AskZappi onClose={()=>setAskOpen(false)} onSupport={()=>{setAskOpen(false);setLegalPage("support")}}/>}
{giftTx&&<GiftShareModal tx={giftTx} initialMessage={giftTx.message||""} senderName={displayName(user)} onClose={()=>setGiftTx(null)}/>}
{receiptTx&&<TransactionReceipt receipt={txToReceipt(receiptTx)} onDone={()=>setReceiptTx(null)}/>}

<div style={{flex:1,overflowY:"auto"}}>
{!REAL_PAYMENTS&&<div style={{background:"#FEE2E2",color:"#991B1B",padding:"8px 16px",fontSize:12,fontWeight:700,textAlign:"center"}}>Demo mode — payments are simulated, no real Pi is spent</div>}
{isPaying&&<div style={{background:"#FEF3C7",color:"#92400E",padding:"10px 16px",fontSize:13,fontWeight:600,textAlign:"center"}}>⏳ Processing your last payment — this can take up to 30 seconds…</div>}

{promo&&(
<div style={{padding:"8px 16px 0"}}>
<div style={{background:"#DCFCE7",color:"#166534",borderRadius:12,padding:"10px 14px",fontSize:12,fontWeight:700}}>🎟️ {promo.code}: {promo.percent}% off your next purchase{promo.maxDiscountNGN?` (up to ₦${promo.maxDiscountNGN})`:""}</div>
</div>
)}
{notices.length>0&&(
<div style={{padding:"8px 16px 0"}}>
{notices.map(n=>(
<div key={n.key} style={{background:n.blocking?"#FEE2E2":"#FEF3C7",color:n.blocking?"#991B1B":"#92400E",borderRadius:12,padding:"10px 14px",fontSize:12,fontWeight:600,marginBottom:6,lineHeight:1.4}}>
{n.blocking?"⛔":"ℹ️"} {n.label?`${n.label}: `:""}{n.message}
</div>
))}
</div>
)}
{page==="home"&&!subPage&&(
<div>
<div style={{background:`linear-gradient(135deg,${C.primary} 0%,#FF7A33 100%)`,padding:"calc(env(safe-area-inset-top, 0px) + 52px) 16px 40px"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
<div>
<p style={{color:"rgba(255,255,255,0.8)",fontSize:12,margin:0}}>{t("Good day, Pioneer 👋")}</p>
<p style={{color:"white",fontSize:17,fontWeight:700,margin:"2px 0 0"}}>{displayName(user)}</p>
</div>
<div style={{display:"flex",gap:10,alignItems:"center"}}>
<button onClick={()=>setShowHowTo(true)} style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.25)",border:"2px solid rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"white",cursor:"pointer"}}>?</button>
<NotificationBell />
<button onClick={()=>setShowProfile(true)} style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.25)",border:"2px solid rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"white",cursor:"pointer",overflow:"hidden"}}>
{user.avatarImage
? <img src={user.avatarImage} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>
: displayName(user).charAt(0).toUpperCase()}
</button>
</div>
</div>
<div style={{background:"rgba(255,255,255,0.15)",borderRadius:18,padding:18,backdropFilter:"blur(10px)"}}>
<p style={{color:"rgba(255,255,255,0.75)",fontSize:12,margin:0}}>Your Zappi Activity</p>
<div style={{display:"flex",gap:20,margin:"6px 0 2px"}}>
<div>
<p style={{color:"white",fontSize:24,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>π{txStats.piSent>=100?Math.round(txStats.piSent).toLocaleString():txStats.piSent.toFixed(2)}</p>
<p style={{color:"rgba(255,255,255,0.65)",fontSize:11,margin:0}}>Pi Spent</p>
</div>
<div>
<p style={{color:"white",fontSize:24,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>{txStats.count}</p>
<p style={{color:"rgba(255,255,255,0.65)",fontSize:11,margin:0}}>Transactions</p>
</div>
</div>
<div style={{marginTop:10}}><PiRateTicker rate={liveRate} live={rateLive} fetchedAt={rateFetchedAt} /></div>
<p style={{color:"rgba(255,255,255,0.45)",fontSize:9,margin:"6px 0 0",lineHeight:1.3}}>Zappi NG's own rate for pricing our services, calculated from live market data — not an official Pi Network value</p>
</div>
</div>

<div style={{display:"flex",gap:10,padding:"16px 16px 0",marginTop:8}}>
{[{label:"History",icon:"🕐",action:()=>navTo("history")},{label:"Profile",icon:"👤",action:()=>setShowProfile(true)}].map(a=>(
<button key={a.label} onClick={a.action} style={{flex:1,background:"var(--card-bg)",border:"none",borderRadius:12,padding:"12px 4px",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
<span style={{fontSize:20}}>{a.icon}</span>
<span style={{fontSize:10,color:"var(--text-secondary)",fontWeight:600}}>{a.label}</span>
</button>
))}
</div>

<div style={{padding:"20px 16px 8px"}}>
<p style={{fontSize:12,fontWeight:700,color:"var(--text-tertiary)",margin:"0 0 12px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Quick actions</p>
<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
{[{label:"Buy Airtime",icon:"📱",bg:"#EFF6FF",color:"#2563EB",sub:"airtime"},{label:"Buy Data",icon:"📶",bg:"#ECFDF5",color:"#059669",sub:"data"},{label:"Electricity",icon:"⚡",bg:"#FFF7ED",color:"#EA580C",sub:"electricity"},{label:"Cable TV",icon:"📺",bg:"#FDF2F8",color:"#A21CAF",sub:"cable"}].map(item=>(
<button key={item.label} onClick={()=>{setPage("bills");setSubPage(item.sub)}} style={{background:"var(--card-bg)",border:"none",borderRadius:14,padding:16,textAlign:"left",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.97)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
<div style={{width:42,height:42,borderRadius:12,background:item.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:8}}>{item.icon}</div>
<p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{t(item.label)}</p>
<p style={{margin:"2px 0 0",fontSize:11,color:item.color,fontWeight:500}}>Pay with Pi</p>
</button>
))}
</div>
</div>

{usualAirtime&&(
<div style={{padding:"0 16px 8px"}}>
<button onClick={()=>buyAgain(usualAirtime)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,background:"var(--card-bg)",border:`1.5px solid ${C.primary}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",textAlign:"left"}}>
<span style={{fontSize:22}}>🔁</span>
<span style={{flex:1}}>
<span style={{display:"block",fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{t("Your usual")}: {usualAirtime.amount} {usualAirtime.raw.network} airtime</span>
<span style={{display:"block",fontSize:11,color:"var(--text-tertiary)"}}>for {usualAirtime.raw.phone} · tap to fill it in, you still confirm with your PIN</span>
</span>
<span style={{fontSize:12,fontWeight:700,color:C.primary}}>{t("Repeat")}</span>
</button>
</div>
)}
<div style={{padding:"8px 16px 0"}}>
<div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
{(banners || [
{title:"Bill payments with Pi",desc:"Airtime, data, electricity & more — paid with Pi"},
{title:"Clear pricing",desc:"Bills are priced in Naira — you see the Pi amount before you confirm"},
{title:"Secure by design",desc:"Every payment needs your transaction PIN"},
]).map((b,i)=>({...b,icon:["⚡","📊","🔒"][i%3],bg:["linear-gradient(135deg,#CC4E00,#FF7A33)","linear-gradient(135deg,#059669,#10B981)","linear-gradient(135deg,#EA580C,#F59E0B)"][i%3]})).map((promo,i)=>(
<div key={promo.title+i} onClick={()=>{if(promo.link) window.open(promo.link,"_blank")}} style={{minWidth:220,background:promo.bg,borderRadius:14,padding:16,flexShrink:0,cursor:promo.link?"pointer":"default"}}>
<p style={{fontSize:22,margin:"0 0 8px"}}>{promo.icon}</p>
<p style={{color:"white",fontWeight:700,fontSize:13,margin:"0 0 4px"}}>{promo.title}</p>
<p style={{color:"rgba(255,255,255,0.85)",fontSize:11,margin:0,lineHeight:1.4}}>{promo.desc}</p>
</div>
))}
</div>
</div>

<div style={{padding:"12px 16px 0"}}>
<button onClick={()=>setLegalPage("support")} style={{width:"100%",background:"var(--card-bg)",border:"none",borderRadius:14,padding:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"left"}}>
<span style={{fontSize:22}}>💬</span>
<div style={{flex:1}}>
<p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>Need help?</p>
<p style={{margin:"2px 0 0",fontSize:11,color:"var(--text-tertiary)"}}>FAQ, WhatsApp, and contact support</p>
</div>
<span style={{color:"var(--text-tertiary)",fontSize:18}}>›</span>
</button>
</div>

<div style={{padding:"8px 16px 16px"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
<p style={{fontSize:12,fontWeight:700,color:"var(--text-tertiary)",margin:0,textTransform:"uppercase",letterSpacing:"0.5px"}}>{t("Recent transactions")}</p>
<button onClick={()=>setPage("history")} style={{background:"none",border:"none",color:C.primary,fontSize:12,cursor:"pointer",fontWeight:600}}>See all →</button>
</div>
{transactions.slice(0,3).map(tx=>(
<div key={tx.id} onClick={()=>setReceiptTx(tx)} style={{background:"var(--card-bg)",borderRadius:14,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 6px rgba(0,0,0,0.05)",cursor:"pointer"}}>
<div style={{width:42,height:42,borderRadius:12,background:tx.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{tx.icon}</div>
<div style={{flex:1}}>
<p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{tx.label}</p>
<p style={{margin:"2px 0 0",fontSize:11,color:"var(--text-tertiary)"}}>{tx.sub} · {tx.ts ? relativeTime(tx.ts) : tx.date}</p>
</div>
<div style={{textAlign:"right"}}>
<p style={{margin:0,fontSize:13,fontWeight:700,color:tx.type==="receive"?"#22C55E":"var(--text-primary)"}}>{tx.type==="receive"?"+":"-"}{tx.pi}</p>
<span style={{background:badgeFor(tx.status).bg,color:badgeFor(tx.status).fg,fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:600}}>{badgeFor(tx.status).short}</span>
</div>
</div>
))}
</div>
</div>
)}


{page==="bills"&&!subPage&&(
<div>
<Header title="Pay Bills"/>
<div style={{padding:16}}>
{[{label:"Buy Airtime",icon:"📱",bg:"#EFF6FF",sub:"airtime",desc:"MTN, Airtel, Glo, 9mobile"},{label:"Buy Data",icon:"📶",bg:"#ECFDF5",sub:"data",desc:"Data bundles"},{label:"Electricity",icon:"⚡",bg:"#FFF7ED",sub:"electricity",desc:"Prepaid & postpaid meters"},{label:"Cable TV",icon:"📺",bg:"#FDF2F8",sub:"cable",desc:"DStv, GOtv, Startimes"},{label:"Showmax",icon:"🎬",bg:"#FEF2F2",sub:"showmax",desc:"Streaming subscription"},{label:"Internet",icon:"🌐",bg:"#EFF6FF",sub:"internet",desc:"Smile, Spectranet"},{label:"Education",icon:"🎓",bg:"#EEF2FF",sub:"education",desc:"WAEC, JAMB"}].map(item=>(
<SCard key={item.label} icon={item.icon} label={item.label} desc={item.desc} bg={item.bg} onClick={()=>setSubPage(item.sub)}/>
))}
{/* Personal Accident Insurance — confirmed via testing that VTPass's sandbox
    returns response code 034 (SERVICE_SUSPENDED) on purchase, despite the
    product being correctly whitelisted on our account and the request
    payload being correct (serviceID, variation codes, and all 6 required
    fields all verified against VTPass's own docs). This is entirely on
    VTPass's side, not something fixable in our code — left hidden rather
    than deleted so it's trivial to re-enable if VTPass un-suspends it. */}
{flags.insurance_enabled&&<SCard icon="🛡️" label="Insurance" desc="Personal Accident cover" bg="#F0FDFA" onClick={()=>{
setPage("bills"); setSubPage("insurance")
}}/>}
</div>
</div>
)}

{page==="bills"&&subPage==="airtime"&&(
<div><Header title="Buy Airtime" onBack={()=>setSubPage(null)}/>
<div style={{padding:16}}>
<FL>Network</FL><NetGrid selected={network} onSelect={setNetwork}/>
<RecentList transactions={transactions} type="airtime" onSelect={buyAgain}/>
<FL>Phone number</FL>
<MyLine phone={phone} network={network} onSelect={m=>{setPhone(m.phone); if(m.network) setNetwork(m.network)}}/><SavedPeople phone={phone} network={network} onSelect={m=>{setPhone(m.phone); if(m.network) setNetwork(m.network)}}/>
<SavedBeneficiaries type="airtime" currentValue={phone} onSelect={b=>{setPhone(b.value); if(b.provider) setNetwork(b.provider)}}/>
<Inp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08012345678"/>
{phoneDetected&&<p style={{color:"#16a34a",fontSize:12,fontWeight:600,margin:"-8px 0 12px"}}>✓ Number verified ({phoneDetected} Nigeria)</p>}
{phone&&savePromptFor!=="airtime"&&<button onClick={()=>setSavePromptFor("airtime")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",margin:"-8px 0 12px",padding:0,display:"block"}}>☆ Save this number</button>}
{savePromptFor==="airtime"&&<SaveBeneficiaryPrompt type="airtime" value={phone} provider={network} onSkip={()=>setSavePromptFor(null)} onSave={name=>{saveAirtimeBeneficiary({name,value:phone,provider:network});setSavePromptFor(null)}}/>}
<FL>Amount (₦)</FL>
<div style={{display:"flex",gap:8,marginBottom:8}}>{[100,200,500,1000].map(a=><button key={a} onClick={()=>setAmount(String(a))} style={{flex:1,padding:10,borderRadius:10,border:`2px solid ${amount==a?C.primary:"var(--border)"}`,background:amount==a?C.light:"white",cursor:"pointer",fontSize:13,fontWeight:600}}>₦{a}</button>)}</div>
<Inp value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Or enter amount"/>
<PiSummary amount={amount} rate={liveRate}/>
<GiftOption on={giftOn} setOn={setGiftOn} msg={giftMsg} setMsg={setGiftMsg}/>
<Btn label={`Buy Airtime — π ${amount?(amount/liveRate).toFixed(4):"0"}`} disabled={!network||!phone||!amount} onClick={()=>validate("airtime")&&handlePay("Airtime",{type:"airtime",label:`${network} Airtime`,sub:phone,ngn:Number(amount),icon:"📱",color:"#EFF6FF",raw:{page:"bills",subPage:"airtime",network,phone,amount}})}/>
</div></div>
)}

{page==="bills"&&subPage==="databudget"&&(
<div><Header title="Best data for your budget" onBack={()=>setSubPage("data")}/>
<DataBudgetFinder serviceIDs={VTPASS_DATA} fetchVariations={fetchVariations} liveRate={liveRate} initialPhone={phone}
onPick={({network:n,phone:ph,bundle:b})=>{setNetwork(n);setBundle(b);if(ph)setPhone(ph);setSubPage("data")}}/>
</div>
)}
{page==="bills"&&subPage==="data"&&(
<div><Header title="Buy Data" onBack={()=>setSubPage(null)}/>
<div style={{padding:16}}>
<button onClick={()=>setSubPage("databudget")} style={{display:"block",width:"100%",textAlign:"left",background:C.light,border:`1.5px solid ${C.primary}`,color:C.primary,borderRadius:12,padding:"10px 14px",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:14}}>🔎 Find the best deal for your budget ›</button>
<FL>Network</FL><NetGrid selected={network} onSelect={n=>{setNetwork(n);setBundle(null)}} extra={[{label:"GLO SME",match:"Glo"}]}/>
<RecentList transactions={transactions} type="data" onSelect={buyAgain}/>
<FL>Phone number</FL>
<MyLine phone={phone} network={network} onSelect={m=>{setPhone(m.phone); if(m.network) setNetwork(m.network)}}/><SavedPeople phone={phone} network={network} onSelect={m=>{setPhone(m.phone); if(m.network) setNetwork(m.network)}}/>
<SavedBeneficiaries type="data" currentValue={phone} onSelect={b=>{setPhone(b.value); if(b.provider) setNetwork(b.provider)}}/>
<Inp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08012345678"/>
{phoneDetected&&<p style={{color:"#16a34a",fontSize:12,fontWeight:600,margin:"-8px 0 12px"}}>✓ Number verified ({phoneDetected} Nigeria)</p>}
{phone&&savePromptFor!=="data"&&<button onClick={()=>setSavePromptFor("data")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",margin:"-8px 0 12px",padding:0,display:"block"}}>☆ Save this number</button>}
{savePromptFor==="data"&&<SaveBeneficiaryPrompt type="data" value={phone} provider={network} onSkip={()=>setSavePromptFor(null)} onSave={name=>{saveDataBeneficiary({name,value:phone,provider:network});setSavePromptFor(null)}}/>}
{network&&<><FL>Select bundle</FL>
<VariationGrid serviceID={VTPASS_DATA[network]} selected={bundle} onSelect={setBundle} grouped/>
</>}
{bundle&&<PiSummary amount={bundle.price} rate={liveRate}/>}
<GiftOption on={giftOn} setOn={setGiftOn} msg={giftMsg} setMsg={setGiftMsg}/>
<Btn label={bundle?`Buy ${bundle.label} — π ${(bundle.price/liveRate).toFixed(4)}`:"Select a bundle"} disabled={!network||!phone||!bundle} onClick={()=>validate("data")&&handlePay("Data",{type:"data",label:`${network} ${bundle.label}`,sub:phone,ngn:bundle.price,icon:"📶",color:"#ECFDF5",raw:{page:"bills",subPage:"data",network,phone,bundleCode:bundle.code,bundleLabel:bundle.label,bundlePrice:bundle.price}})}/>
</div></div>
)}

{page==="bills"&&subPage==="electricity"&&(
<div><Header title="Electricity Bill" onBack={()=>setSubPage(null)}/>
<div style={{padding:16}}>
<FL>Distribution company</FL>
<select value={disco} onChange={e=>setDisco(e.target.value)} style={{width:"100%",padding:13,borderRadius:10,border:"1.5px solid #E5E7EB",marginBottom:16,boxSizing:"border-box",fontSize:14,outline:"none",background:"var(--card-bg)",color:"var(--text-primary)",fontFamily:"inherit"}}>
<option value="">Select your DISCO</option>{DISCOS.map(d=><option key={d}>{d}</option>)}
</select>
<RecentList transactions={transactions} type="electricity" onSelect={buyAgain}/>
<FL>Meter type</FL>
<div style={{display:"flex",gap:8,marginBottom:16}}>{["prepaid","postpaid"].map(t=><button key={t} onClick={()=>setMeterType(t)} style={{flex:1,padding:12,borderRadius:10,border:`2px solid ${meterType===t?C.primary:"var(--border)"}`,background:meterType===t?C.light:"white",cursor:"pointer",fontWeight:600,textTransform:"capitalize"}}>{t}</button>)}</div>
<FL>Meter number</FL>
<SavedBeneficiaries type="electricity" currentValue={meter} onSelect={b=>{setMeter(b.value); if(b.provider) setDisco(b.provider)}}/>
<Inp value={meter} onChange={e=>setMeter(e.target.value)} placeholder="Enter meter number"/>
{disco&&meter&&<VerifyName serviceID={VTPASS_DISCO[disco.split(" ")[0]]} billersCode={meter} type={meterType} onVerified={(name,raw)=>{setVerifiedName(name);const min=Number(raw?.Minimum_Amount||raw?.Min_Purchase_Amount)||null;setElecMinAmount(min>0?Math.ceil(min):null)}}/>}
{meter&&savePromptFor!=="electricity"&&<button onClick={()=>setSavePromptFor("electricity")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",margin:"-8px 0 12px",padding:0,display:"block"}}>☆ Save this meter</button>}
{savePromptFor==="electricity"&&<SaveBeneficiaryPrompt type="electricity" value={meter} provider={disco} onSkip={()=>setSavePromptFor(null)} onSave={name=>{saveElectricityBeneficiary({name,value:meter,provider:disco});setSavePromptFor(null)}}/>}
<FL>Amount (₦)</FL>
{elecMinAmount&&<p style={{fontSize:12,color:"var(--text-tertiary)",margin:"-8px 0 8px"}}>Minimum for this meter: ₦{elecMinAmount.toLocaleString()}</p>}
<div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>{(elecMinAmount?[elecMinAmount,elecMinAmount*2,elecMinAmount*5,elecMinAmount*10]:[1000,2000,5000,10000]).map(a=><button key={a} onClick={()=>setAmount(String(a))} style={{padding:"10px 14px",borderRadius:10,border:`2px solid ${amount==a?C.primary:"var(--border)"}`,background:amount==a?C.light:"white",cursor:"pointer",fontSize:13,fontWeight:600}}>₦{a.toLocaleString()}</button>)}</div>
<Inp value={amount} onChange={e=>setAmount(e.target.value)} placeholder={elecMinAmount?`Or enter amount (min ₦${elecMinAmount.toLocaleString()})`:"Or enter amount"}/>
<PiSummary amount={amount} bg="#FFF7ED" color="#EA580C" rate={liveRate}/>
<Btn label={verifiedName?`Pay ₦${Number(amount||0).toLocaleString()} — π ${amount?(amount/liveRate).toFixed(4):"0"}`:"Verify meter to continue"} disabled={!disco||!meter||!amount||!verifiedName} onClick={()=>validate("electricity")&&handlePay("Electricity",{type:"electricity",label:`${disco.split(" ")[0]} Electricity`,sub:`Meter: ${meter} (${verifiedName})`,ngn:Number(amount),icon:"⚡",color:"#FFF7ED",raw:{page:"bills",subPage:"electricity",disco,meter,meterType,amount}})}/>
</div></div>
)}

{page==="bills"&&subPage==="cable"&&(
<div><Header title="Cable TV" onBack={()=>setSubPage(null)}/>
<div style={{padding:16}}>
<FL>Provider</FL>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>{["DStv","GOtv","Startimes"].map(p=><button key={p} onClick={()=>{setNetwork(p);setBundle(null)}} style={{padding:14,borderRadius:10,border:`2px solid ${network===p?C.primary:"var(--border)"}`,background:network===p?C.light:"white",cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}><BrandLogo category="tv-subscription" match={p} fallback="📺" size={26}/>{p}</button>)}</div>
<RecentList transactions={transactions} type="cable" onSelect={buyAgain}/>
<FL>Smart card / IUC number</FL>
<SavedBeneficiaries type="cable" currentValue={meter} onSelect={b=>{setMeter(b.value); if(b.provider) setNetwork(b.provider); setBundle(null)}}/>
<Inp value={meter} onChange={e=>setMeter(e.target.value)} placeholder="Enter smart card number"/>
{network&&meter&&<VerifyName serviceID={VTPASS_CABLE[network]} billersCode={meter} onVerified={setVerifiedName}/>}
{meter&&savePromptFor!=="cable"&&<button onClick={()=>setSavePromptFor("cable")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",margin:"-8px 0 12px",padding:0,display:"block"}}>☆ Save this smart card</button>}
{savePromptFor==="cable"&&<SaveBeneficiaryPrompt type="cable" value={meter} provider={network} onSkip={()=>setSavePromptFor(null)} onSave={name=>{saveCableBeneficiary({name,value:meter,provider:network});setSavePromptFor(null)}}/>}
{network&&<><FL>Select package</FL>
<VariationGrid serviceID={VTPASS_CABLE[network]} selected={bundle} onSelect={setBundle} columns={1}/>
</>}
{bundle&&<PiSummary amount={bundle.price} bg="#FDF2F8" color="#A21CAF" rate={liveRate}/>}
<Btn label={!verifiedName?"Verify smart card to continue":bundle?`Pay ${bundle.label} — π ${(bundle.price/liveRate).toFixed(4)}`:"Select a package"} disabled={!network||!meter||!bundle||!verifiedName} onClick={()=>validate("cable")&&handlePay("Cable TV",{type:"cable",label:`${network} ${bundle.label}`,sub:`Smart card: ${meter} (${verifiedName})`,ngn:bundle.price,icon:"📺",color:"#FDF2F8",raw:{page:"bills",subPage:"cable",network,meter,bundleCode:bundle.code,bundleLabel:bundle.label,bundlePrice:bundle.price}})}/>
</div></div>
)}

{page==="bills"&&subPage==="showmax"&&(
<div><Header title="Showmax" onBack={()=>setSubPage(null)}/>
<div style={{padding:16}}>
<RecentList transactions={transactions} type="showmax" onSelect={buyAgain}/>
<FL>Phone number</FL><Inp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08012345678"/>
<FL>Select plan</FL>
<VariationGrid serviceID={VTPASS_SHOWMAX} selected={bundle} onSelect={setBundle} columns={1}/>
{bundle&&<PiSummary amount={bundle.price} bg="#FEF2F2" color="#B91C1C" rate={liveRate}/>}
<Btn label={bundle?`Pay ${bundle.label} — π ${(bundle.price/liveRate).toFixed(4)}`:"Select a plan"} disabled={!phone||!bundle} onClick={()=>validate("showmax")&&handlePay("Showmax",{type:"showmax",label:bundle.label,sub:`Phone: ${phone}`,ngn:bundle.price,icon:"🎬",color:"#FEF2F2",raw:{page:"bills",subPage:"showmax",phone,bundleCode:bundle.code,bundleLabel:bundle.label,bundlePrice:bundle.price}})}/>
</div></div>
)}

{page==="bills"&&subPage==="internet"&&(
<div><Header title="Internet" onBack={()=>setSubPage(null)}/>
<div style={{padding:16}}>
<FL>Select provider</FL>
<RecentList transactions={transactions} type="internet" onSelect={buyAgain}/>
{INTERNET_PROVIDERS.map(p=><button key={p.id} onClick={()=>{setInternetProvider(p);setBundle(null)}} style={{width:"100%",background:"var(--card-bg)",color:"var(--text-primary)",border:`2px solid ${internetProvider?.id===p.id?C.primary:"var(--border)"}`,borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}>
<span style={{fontSize:24}}>{p.icon}</span>
<div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:700}}>{p.label}</p></div>
{internetProvider?.id===p.id&&<span style={{color:C.primary,fontSize:18}}>✓</span>}
</button>)}
{internetProvider?.id==="smile"&&<>
<FL>Smile email</FL>
<Inp value={smileEmail} onChange={e=>{setSmileEmail(e.target.value);setSmileAccount(null)}} placeholder="you@example.com"/>
<SmileVerify email={smileEmail} onVerified={v=>{setSmileAccounts(v?.accounts||[]);setSmileAccount(null)}}/>
{smileAccounts.length>0&&<>
<FL>Select account</FL>
<div style={{display:"grid",gap:8,marginBottom:16}}>
{smileAccounts.map((a,i)=>(
<button key={i} onClick={()=>setSmileAccount(a)} style={{padding:12,borderRadius:10,border:`2px solid ${smileAccount===a?C.primary:"var(--border)"}`,background:smileAccount===a?C.light:"white",cursor:"pointer",textAlign:"left",fontSize:13,fontWeight:600}}>
{a.label} · {a.id}
</button>
))}
</div>
</>}
{smileAccount&&<>
<FL>Phone number</FL><Inp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08012345678"/>
<FL>Select plan</FL><VariationGrid serviceID={VTPASS_INTERNET.smile} selected={bundle} onSelect={setBundle}/>
{bundle&&<PiSummary amount={bundle.price} bg="#EFF6FF" color="#2563EB" rate={liveRate}/>}
<Btn label={bundle?`Pay ${bundle.label} — π ${(bundle.price/liveRate).toFixed(4)}`:"Select a plan"} disabled={!phone||!bundle} onClick={()=>validate("internet")&&handlePay("Internet",{type:"internet",label:`Smile ${bundle.label}`,sub:`${smileAccount.label} · ${smileAccount.id}`,ngn:bundle.price,icon:"🌐",color:"#EFF6FF",raw:{page:"bills",subPage:"internet",providerId:"smile",phone,smileAccountId:smileAccount.id,smileAccountLabel:smileAccount.label,bundleCode:bundle.code,bundleLabel:bundle.label,bundlePrice:bundle.price}})}/>
</>}
</>}
{internetProvider&&internetProvider.id!=="smile"&&<><FL>Account number</FL>
<SavedBeneficiaries type="internet" currentValue={meter} onSelect={b=>{setMeter(b.value); if(b.provider){const p=INTERNET_PROVIDERS.find(x=>x.label===b.provider); if(p) setInternetProvider(p)} setBundle(null)}}/>
<Inp value={meter} onChange={e=>setMeter(e.target.value)} placeholder="Account number"/>
{meter&&savePromptFor!=="internet"&&<button onClick={()=>setSavePromptFor("internet")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",margin:"0 0 12px",padding:0,display:"block"}}>☆ Save this account</button>}
{savePromptFor==="internet"&&<SaveBeneficiaryPrompt type="internet" value={meter} provider={internetProvider.label} onSkip={()=>setSavePromptFor(null)} onSave={name=>{saveInternetBeneficiary({name,value:meter,provider:internetProvider.label});setSavePromptFor(null)}}/>}
<FL>Select plan</FL><VariationGrid serviceID={VTPASS_INTERNET[internetProvider.id]} selected={bundle} onSelect={setBundle}/>{bundle&&<PiSummary amount={bundle.price} bg="#EFF6FF" color="#2563EB" rate={liveRate}/>}<Btn label={bundle?`Pay ${bundle.label} — π ${(bundle.price/liveRate).toFixed(4)}`:"Select a plan"} disabled={!meter||!bundle} onClick={()=>validate("internet")&&handlePay("Internet",{type:"internet",label:`${internetProvider.label} ${bundle.label}`,sub:`Acct: ${meter}`,ngn:bundle.price,icon:"🌐",color:"#EFF6FF",raw:{page:"bills",subPage:"internet",providerId:internetProvider.id,meter,bundleCode:bundle.code,bundleLabel:bundle.label,bundlePrice:bundle.price}})}/></>}
</div></div>
)}

{page==="bills"&&subPage==="education"&&(
<div><Header title="Education Payments" onBack={()=>{setSubPage(null);setEduProduct(null);setBundle(null)}}/>
<div style={{padding:16}}>
{!eduProduct&&<>
<FL>Select service</FL>
{[{id:"waec",label:"WAEC Result Checker PIN",icon:"📄"},{id:"waec-registration",label:"WAEC Registration PIN",icon:"📝"},{id:"jamb",label:"JAMB UTME/DE PIN",icon:"🎓"}].map(p=>
<button key={p.id} onClick={()=>{setEduProduct(p.id);setBundle(null)}} style={{width:"100%",background:"var(--card-bg)",color:"var(--text-primary)",border:"1.5px solid var(--border)",borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}>
<span style={{fontSize:22}}>{p.icon}</span><p style={{margin:0,fontSize:14,fontWeight:700,flex:1}}>{p.label}</p>
</button>)}
</>}
{eduProduct&&<>
<button onClick={()=>{setEduProduct(null);setBundle(null)}} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",padding:0,marginBottom:12,display:"block"}}>← Change service</button>
{eduProduct==="jamb"?<>
{/* VTPass's JAMB verify endpoint requires "type" = the variation_code (utme-mock /
    utme-no-mock) alongside the Profile ID — so PIN type must be picked first,
    otherwise verification is sent incomplete and fails VTPass-side. */}
<FL>Select PIN type</FL>
<VariationGrid serviceID={VTPASS_EDU[eduProduct]} selected={bundle} onSelect={b=>{setBundle(b);setVerifiedName("")}} columns={1}/>
{bundle&&<PiSummary amount={bundle.price} bg="#EEF2FF" color="#4338CA" rate={liveRate}/>}
{bundle&&<><FL>JAMB Profile ID</FL><Inp value={meter} onChange={e=>setMeter(e.target.value)} placeholder="Enter Profile ID from JAMB portal"/>
{meter&&<VerifyName serviceID="jamb" billersCode={meter} type={bundle.code} onVerified={setVerifiedName}/>}</>}
<FL>Phone number</FL><Inp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08012345678"/>
</>:<>
<FL>Phone number</FL><Inp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08012345678"/>
<FL>Select plan</FL>
<VariationGrid serviceID={VTPASS_EDU[eduProduct]} selected={bundle} onSelect={setBundle} columns={1}/>
{bundle&&<PiSummary amount={bundle.price} bg="#EEF2FF" color="#4338CA" rate={liveRate}/>}
</>}
<Btn label={eduProduct==="jamb"&&!verifiedName?"Verify Profile ID to continue":bundle?`Pay ${bundle.label} — π ${(bundle.price/liveRate).toFixed(4)}`:"Select a plan"} disabled={!phone||!bundle||(eduProduct==="jamb"&&(!meter||!verifiedName))} onClick={()=>handlePay("Education",{type:"education",label:bundle.label,sub:eduProduct==="jamb"?`Profile: ${meter}`:`Phone: ${phone}`,ngn:bundle.price,icon:"🎓",color:"#EEF2FF",raw:{page:"bills",subPage:"education",eduProduct,phone,meter,bundleCode:bundle.code,bundleLabel:bundle.label,bundlePrice:bundle.price}})}/>
</>}
</div></div>
)}

{page==="bills"&&subPage==="insurance"&&(
<div><Header title="Insurance" onBack={()=>{setSubPage(null);setBundle(null);setInsFullName("");setInsAddress("");setInsDob("");setInsNextKinName("");setInsNextKinPhone("");setInsOccupation("")}}/>
<div style={{padding:16}}>
<p style={{fontSize:12,color:"var(--text-tertiary)",margin:"0 0 16px"}}>Personal Accident cover — pays out for injury, disability, or death resulting from an accident.</p>
<FL>Select plan</FL>
<VariationGrid serviceID={VTPASS_INSURANCE} selected={bundle} onSelect={setBundle} columns={1}/>
{bundle&&<PiSummary amount={bundle.price} bg="#F0FDFA" color="#0F766E" rate={liveRate}/>}
<FL>Full name</FL><Inp value={insFullName} onChange={e=>setInsFullName(e.target.value)} placeholder="As it should appear on the policy"/>
<FL>Phone number</FL><Inp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08012345678"/>
<FL>Home address</FL><Inp value={insAddress} onChange={e=>setInsAddress(e.target.value)} placeholder="Street, city, state"/>
<FL>Date of birth</FL><Inp type="date" value={insDob} onChange={e=>setInsDob(e.target.value)}/>
<FL>Occupation</FL><Inp value={insOccupation} onChange={e=>setInsOccupation(e.target.value)} placeholder="e.g. Trader, Civil Servant"/>
<FL>Next of kin — full name</FL><Inp value={insNextKinName} onChange={e=>setInsNextKinName(e.target.value)} placeholder="Full name"/>
<FL>Next of kin — phone number</FL><Inp value={insNextKinPhone} onChange={e=>setInsNextKinPhone(e.target.value)} placeholder="08012345678"/>
<Btn label={bundle?`Pay ${bundle.label} — π ${(bundle.price/liveRate).toFixed(4)}`:"Select a plan"} disabled={!phone||!bundle||!insFullName||!insAddress||!insDob||!insOccupation||!insNextKinName||!insNextKinPhone} onClick={()=>handlePay("Insurance",{type:"insurance",label:bundle.label,sub:`${insFullName} · Phone: ${phone}`,ngn:bundle.price,icon:"🛡️",color:"#F0FDFA",raw:{page:"bills",subPage:"insurance",phone,bundleCode:bundle.code,bundleLabel:bundle.label,bundlePrice:bundle.price,insFullName,insAddress,insDob,insNextKinName,insNextKinPhone,insOccupation}})}/>
</div></div>
)}


{page==="more"&&!subPage&&(
<div><Header title="More Services"/>
<div style={{padding:16}}>
<p style={{fontSize:12,fontWeight:700,color:"var(--text-tertiary)",margin:"16px 0 10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{t("Rates")}</p>
<SCard icon="📊" label="Zappi NG Pi Rate" desc="Our own pricing rate — not an official Pi price" bg="#FFF7ED" onClick={()=>showToast(`Current rate: ₦${liveRate}/π`,"success")}/>
<p style={{fontSize:12,fontWeight:700,color:"var(--text-tertiary)",margin:"16px 0 10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{t("Account")}</p>
<SCard icon="👤" label={t("My Profile")} desc="Manage your account" bg="#F0F0FF" onClick={()=>setShowProfile(true)}/>
<SCard icon="✨" label="Ask Zappi" desc="AI help with orders, rates and refunds" bg="#FFF7ED" onClick={()=>setAskOpen(true)}/>
<PromoCard promo={promo} onApply={applyPromo} onRemove={()=>storePromo(null)}/>
<RewardsCard me={me} creditOn={creditOn} setCreditOn={setCreditOn} onClaim={claimRef}/>
<MonthlySummary transactions={transactions}/>
<RemindersCard/>
<PayForMeCard myLine={(()=>{try{return JSON.parse(localStorage.getItem("zappi_my_line"))}catch{return null}})()}/>
<SCard icon="💬" label={t("Help & Support")} desc="FAQ, WhatsApp, contact us" bg="#F0FDF4" onClick={()=>setLegalPage("support")}/>
<div style={{background:"var(--card-bg)",borderRadius:14,padding:"12px 14px",marginBottom:8}}>
<p style={{margin:"0 0 8px",fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>🌍 {t("Language")}</p>
<div style={{display:"flex",gap:8}}>
{LANGUAGES.map(l=>(<button key={l.id} onClick={()=>{setLang(l.id);setLangTick(n=>n+1)}} style={{flex:1,padding:"8px 6px",borderRadius:10,border:`1.5px solid ${getLang()===l.id?C.primary:"var(--border)"}`,background:getLang()===l.id?C.light:"transparent",color:"var(--text-primary)",fontSize:12,fontWeight:700,cursor:"pointer"}}>{l.label}</button>))}
</div>
</div>
<SCard icon="🌙" label={t("Dark Mode")} desc={theme==="dark"?"Switch to light mode":"Switch to dark mode"} bg="#F0F0FF" onClick={toggleTheme}/>
{isAdminAny && <SCard icon="🛠️" label="Admin" desc="Announcements & support tickets" bg="#F0F0FF" badge={openTicketCount} onClick={()=>setLegalPage("admin")}/>}
<p style={{fontSize:12,fontWeight:700,color:"var(--text-tertiary)",margin:"16px 0 10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{t("Legal")}</p>
<SCard icon="📄" label="Privacy Policy" desc="How we handle your data" bg="#F9FAFB" onClick={()=>setLegalPage("privacy")}/>
<SCard icon="📋" label="Terms of Service" desc="Rules for using Zappi NG" bg="#F9FAFB" onClick={()=>setLegalPage("terms")}/>
</div></div>
)}



{page==="history"&&(
<div><Header title="Transactions"/>
<div style={{padding:"12px 16px 6px",display:"flex",gap:8,overflowX:"auto"}}>
{[{id:"all",label:"All"},{id:"airtime",label:"Airtime"},{id:"data",label:"Data"},{id:"electricity",label:"Electric"},{id:"cable",label:"Cable"},{id:"internet",label:"Internet"},{id:"receive",label:"Received"}].map(f=>(
<button key={f.id} onClick={()=>setTxFilter(f.id)} style={{padding:"6px 14px",borderRadius:20,border:"none",background:txFilter===f.id?C.primary:"var(--border)",color:txFilter===f.id?"white":"var(--text-secondary)",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>{f.label}</button>
))}
</div>
<div style={{padding:"8px 16px"}}>
{filteredTx.length===0&&<p style={{color:"var(--text-tertiary)",textAlign:"center",padding:40,fontSize:14}}>No transactions found</p>}
{filteredTx.map(tx=>(
<div key={tx.id} style={{background:"var(--card-bg)",borderRadius:14,marginBottom:8,boxShadow:"0 2px 6px rgba(0,0,0,0.05)",overflow:"hidden"}}>
<div onClick={()=>setReceiptTx(tx)} style={{padding:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
<div style={{width:44,height:44,borderRadius:12,background:tx.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{tx.icon}</div>
<div style={{flex:1}}>
<p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{tx.label}</p>
<p style={{margin:"2px 0",fontSize:11,color:"var(--text-tertiary)"}}>{tx.sub}</p>
<p style={{margin:0,fontSize:11,color:"var(--text-tertiary)"}}>{tx.ts ? relativeTime(tx.ts) : tx.date}</p>
</div>
<div style={{textAlign:"right"}}>
<p style={{margin:0,fontSize:13,fontWeight:700,color:tx.type==="receive"?"#22C55E":"var(--text-primary)"}}>{tx.type==="receive"?"+":"-"}{tx.pi}</p>
<p style={{margin:"2px 0",fontSize:11,color:"var(--text-tertiary)"}}>{tx.amount}</p>
<span style={{background:badgeFor(tx.status).bg,color:badgeFor(tx.status).fg,fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:700}}>{badgeFor(tx.status).long}</span>
{tx.refund==="processing"&&<p style={{margin:"3px 0 0",fontSize:10,color:"#92400E"}}>{t("Refund in progress")}</p>}
{tx.refund==="success"&&<p style={{margin:"3px 0 0",fontSize:10,color:"#166534"}}>{t("Pi refunded")}</p>}
</div>
</div>
{tx.type!=="receive"&&(
<div style={{display:"flex",borderTop:"1px solid var(--border)"}}>
{tx.status==="pending"&&tx.requestId&&(
<button onClick={()=>checkStatus(tx)} disabled={checkingId===tx.id} style={{flex:1,background:"none",border:"none",borderRight:"1px solid var(--border)",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",color:C.primary,fontSize:12,fontWeight:700}}>
{checkingId===tx.id?t("Checking…"):"🔄 "+t("Check status")}
</button>
)}
{tx.raw&&tx.status==="success"&&(
<button onClick={()=>buyAgain(tx)} style={{flex:1,background:"none",border:"none",borderRight:"1px solid var(--border)",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",color:C.primary,fontSize:12,fontWeight:700}}>
🔁 Buy Again
</button>
)}
{tx.status==="success"&&(
<button onClick={()=>setGiftTx({...tx,message:""})} style={{flex:1,background:"none",border:"none",borderRight:"1px solid var(--border)",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",color:C.primary,fontSize:12,fontWeight:700}}>
🎁 Gift
</button>
)}
<button onClick={()=>reportIssue(tx)} style={{flex:1,background:"none",border:"none",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",color:"var(--text-secondary)",fontSize:12,fontWeight:700}}>
🚩 Report Issue
</button>
</div>
)}
</div>
))}
</div></div>
)}

</div>
<NavBar page={page} setPage={p=>{setPage(p);setSubPage(null)}}/>
</div>
)
}
