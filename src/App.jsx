import { useState, useEffect, useCallback } from "react"
import { usePi } from "./context/PiContext.jsx"
import { useTheme } from "./context/ThemeContext.jsx"
import NotificationBell from "./components/NotificationBell.jsx"
import PiRateTicker from "./components/PiRateTicker.jsx"
import { PrivacyPolicy, TermsOfService } from "./pages/LegalPages.jsx"
import SupportPage from "./pages/SupportPage.jsx"
import { SplashScreen, RegisterScreen, LoginScreen, ForgotScreen, TxnPinModal, ProfileScreen } from "./ZappiAuth"

const RATE = 600 // fallback only — app uses live rate from backend
const C = {
  primary: "#6C3AED", light: "#EDE9FE",
  success: "#22C55E", danger: "#EF4444", bg: "#F5F3FF",
}

const TRANSACTIONS = [
  { id:1, type:"airtime", label:"MTN Airtime", sub:"08012345678", amount:"₦500", pi:"π0.83", date:"Today 10:30am", color:"#EDE9FE", icon:"📱", status:"success" },
  { id:2, type:"electricity", label:"IKEDC Electricity", sub:"Meter: 12345678", amount:"₦5,000", pi:"π8.33", date:"Yesterday", color:"#FFF7ED", icon:"⚡", status:"success" },
  { id:3, type:"send", label:"Sent to @adaeze", sub:"Pioneer transfer", amount:"₦3,000", pi:"π5.00", date:"2 days ago", color:"#EDE9FE", icon:"💸", status:"success" },
  { id:4, type:"cable", label:"DStv Compact", sub:"Smart card: 456789", amount:"₦9,000", pi:"π15.00", date:"3 days ago", color:"#ECFDF5", icon:"📺", status:"success" },
  { id:5, type:"receive", label:"Received from @tunde", sub:"Pioneer transfer", amount:"₦6,000", pi:"π10.00", date:"4 days ago", color:"#ECFDF5", icon:"💰", status:"success" },
  { id:6, type:"data", label:"Airtel 2GB Data", sub:"08091157430", amount:"₦600", pi:"π1.00", date:"5 days ago", color:"#ECFDF5", icon:"📶", status:"failed" },
]

const BENEFICIARIES = [
  { name:"Adaeze", initials:"AD", username:"adaeze" },
  { name:"Tunde", initials:"TU", username:"tunde" },
  { name:"Kike", initials:"KI", username:"kike" },
  { name:"Emeka", initials:"EM", username:"emeka" },
]

const DATA_BUNDLES = {
  MTN:[{code:"mtn-1gb",label:"1GB",duration:"30 days",price:350},{code:"mtn-2gb",label:"2GB",duration:"30 days",price:600},{code:"mtn-5gb",label:"5GB",duration:"30 days",price:1500},{code:"mtn-10gb",label:"10GB",duration:"30 days",price:2500}],
  Airtel:[{code:"a-1gb",label:"1GB",duration:"30 days",price:350},{code:"a-2gb",label:"2GB",duration:"30 days",price:600},{code:"a-5gb",label:"5GB",duration:"30 days",price:1500}],
  Glo:[{code:"g-2gb",label:"2GB",duration:"30 days",price:500},{code:"g-5gb",label:"5GB",duration:"30 days",price:1200},{code:"g-10gb",label:"10GB",duration:"30 days",price:2000}],
  "9mobile":[{code:"9m-1gb",label:"1GB",duration:"30 days",price:300},{code:"9m-2gb",label:"2GB",duration:"30 days",price:500}],
}

const DISCOS=["IKEDC (Lagos)","EKEDC (Lagos)","AEDC (Abuja)","PHED (Port Harcourt)","EEDC (Enugu)","KEDCO (Kano)"]
const BETTING_SITES=[{id:"bet9ja",label:"Bet9ja",icon:"🎯"},{id:"sportybet",label:"Sportybet",icon:"⚽"},{id:"1xbet",label:"1xBet",icon:"🏆"},{id:"betway",label:"Betway",icon:"🎲"}]
const HOTELS=[{id:"transcorp",label:"Transcorp Hilton",city:"Abuja",price:60000,rating:"⭐⭐⭐⭐⭐"},{id:"eko",label:"Eko Hotel",city:"Lagos",price:45000,rating:"⭐⭐⭐⭐⭐"},{id:"sheraton",label:"Sheraton Lagos",city:"Lagos",price:55000,rating:"⭐⭐⭐⭐⭐"},{id:"radisson",label:"Radisson Blu",city:"Lagos",price:40000,rating:"⭐⭐⭐⭐"}]
const TRANSPORT=[{id:"uber",label:"Uber Ride",icon:"🚗",desc:"Book a ride"},{id:"brt",label:"BRT Pass",icon:"🚌",desc:"Bus rapid transit"},{id:"toll",label:"Toll Payment",icon:"🛣️",desc:"Highway tolls"},{id:"ferry",label:"Ferry Ticket",icon:"⛵",desc:"Water transport"},{id:"flight",label:"Flight Booking",icon:"✈️",desc:"Domestic flights"}]
const INTERNET_PROVIDERS=[{id:"smile",label:"Smile",icon:"😊",price:3000},{id:"spectranet",label:"Spectranet",icon:"📡",price:4000},{id:"ipnx",label:"ipNX",icon:"🌐",price:5000}]

function NavBar({ page, setPage }) {
  const tabs=[{id:"home",icon:"🏠",label:"Home"},{id:"bills",icon:"📋",label:"Bills"},{id:"send",icon:"💸",label:"Send"},{id:"more",icon:"⚡",label:"More"},{id:"history",icon:"🕐",label:"History"}]
  return (
    <div style={{position:"sticky",bottom:0,background:"white",borderTop:"1px solid #eee",display:"flex",padding:"8px 0 12px",zIndex:100}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>setPage(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <span style={{fontSize:20}}>{t.icon}</span>
          <span style={{fontSize:10,color:page===t.id?C.primary:"#999",fontWeight:page===t.id?700:400}}>{t.label}</span>
          {page===t.id&&<div style={{width:4,height:4,borderRadius:2,background:C.primary,marginTop:1}}/>}
        </button>
      ))}
    </div>
  )
}

function Header({ title, onBack, right }) {
  return (
    <div style={{background:`linear-gradient(135deg,${C.primary},#9F67F5)`,padding:"16px",display:"flex",alignItems:"center",gap:12}}>
      {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:14,fontWeight:500}}>←</button>}
      <p style={{color:"white",fontSize:16,fontWeight:600,margin:0,flex:1}}>{title}</p>
      {right&&right}
    </div>
  )
}

function PiSummary({ amount, bg="#EDE9FE", color="#5B21B6", rate=2150 }) {
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
  return <p style={{fontSize:12,fontWeight:700,color:"#555",margin:"0 0 6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{children}</p>
}

function SCard({ icon, label, desc, bg, onClick }) {
  return (
    <button onClick={onClick} style={{width:"100%",background:"white",border:"none",borderRadius:14,padding:14,marginBottom:10,display:"flex",alignItems:"center",gap:14,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"left"}}
      onMouseDown={e=>e.currentTarget.style.transform="scale(0.98)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
      <div style={{width:46,height:46,borderRadius:13,background:bg||C.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>
      <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:700,color:"#1a1a1a"}}>{label}</p>{desc&&<p style={{margin:"2px 0 0",fontSize:12,color:"#999"}}>{desc}</p>}</div>
      <span style={{color:"#ccc",fontSize:20}}>›</span>
    </button>
  )
}

function NetGrid({ selected, onSelect }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:16}}>
      {["MTN","Airtel","Glo","9mobile"].map(n=>(
        <button key={n} onClick={()=>onSelect(n)} style={{padding:10,borderRadius:10,border:`2px solid ${selected===n?C.primary:"#E5E7EB"}`,background:selected===n?C.light:"white",cursor:"pointer",fontWeight:600,fontSize:14}}>{n}</button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const { piAuth, piUser, isSandbox } = usePi()
  const { theme, toggleTheme } = useTheme()
  const [liveRate, setLiveRate] = useState(2150)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "https://zappi-ng-backend.onrender.com"}/api/pi-rate`)
      .then(r => r.json())
      .then(d => { if (d.ngnPerPi) setLiveRate(d.ngnPerPi) })
      .catch(() => {}) // silently fall back to 600
  }, [])

  const [authScreen, setAuthScreen] = useState("splash") // splash|register|login|forgot
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  // Google OAuth return: catch #token=... from the backend redirect
useEffect(() => {
  const h = new URLSearchParams(window.location.hash.slice(1));
  const token = h.get("token");
  if (token) {
    localStorage.setItem("zappi_token", token);
    history.replaceState(null, "", window.location.pathname);
    setIsLoggedIn(true);
  } else if (h.get("auth_error")) {
    history.replaceState(null, "", window.location.pathname);
    alert("Google sign-in failed — please try again.");
  }
}, []);

  // Check if user exists on load
  useEffect(() => {
    const user = localStorage.getItem("zappi_user")
    const pin = localStorage.getItem("zappi_login_pin")
    if (user && pin) setAuthScreen("login")
    else if (user) setAuthScreen("login")
  }, [])

  const [page, setPage] = useState("home")
  const [subPage, setSubPage] = useState(null)
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState("success")
  const [bonusClaimed, setBonusClaimed] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [txnPinModal, setTxnPinModal] = useState(null) // {label, onSuccess}
  const [notifications, setNotifications] = useState([
    {id:1,text:"Your ₦500 MTN airtime was delivered!",time:"10 mins ago",read:false,icon:"📱"},
    {id:2,text:"Daily bonus of π0.05 is ready to claim!",time:"1 hour ago",read:false,icon:"🎁"},
    {id:3,text:"Airtel 2GB data purchase failed. Pi refunded.",time:"5 days ago",read:true,icon:"❌"},
  ])

  const [network,setNetwork]=useState("")
  const [phone,setPhone]=useState("")
  const [amount,setAmount]=useState("")
  const [bundle,setBundle]=useState(null)
  const [disco,setDisco]=useState("")
  const [meter,setMeter]=useState("")
  const [meterType,setMeterType]=useState("prepaid")
  const [recipient,setRecipient]=useState("")
  const [piAmount,setPiAmount]=useState("")
  const [note,setNote]=useState("")
  const [txFilter,setTxFilter]=useState("all")
  const [bettingSite,setBettingSite]=useState(null)
  const [bettingId,setBettingId]=useState("")
  const [hotel,setHotel]=useState(null)
  const [transport,setTransport]=useState(null)
  const [internetProvider,setInternetProvider]=useState(null)

  const unread = notifications.filter(n=>!n.read).length
  const user = JSON.parse(localStorage.getItem("zappi_user")||"{}")

  const showToast=(msg,type="success")=>{ setToast(msg); setToastType(type); setTimeout(()=>setToast(null),3500) }

  const requireTxnPin=(label,onSuccess)=>{
    const hasTxnPin=localStorage.getItem("zappi_txn_pin")
    if(hasTxnPin){ setTxnPinModal({label,onSuccess}) }
    else { onSuccess() }
  }

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
      if(!amount||Number(amount)<1000) return showToast("Minimum electricity payment is ₦1,000","danger")
      return true
    }
    if(type==="cable"){
      if(!network) return showToast("Select a provider","danger")
      if(meter.length<10) return showToast("Enter a valid smartcard/IUC number","danger")
      if(!amount) return showToast("Select a package","danger")
      return true
    }
    if(type==="internet"){
      if(!internetProvider) return showToast("Select a provider","danger")
      if(meter.length<6) return showToast("Enter a valid account number","danger")
      if(!amount||Number(amount)<500) return showToast("Enter a valid amount","danger")
      return true
    }
    if(type==="betting"){
      if(!bettingSite) return showToast("Select a betting site","danger")
      if(bettingId.length<4) return showToast("Enter a valid betting user ID","danger")
      if(!amount||Number(amount)<100) return showToast("Minimum funding is ₦100","danger")
      return true
    }
    if(type==="send"){
      if(recipient.length<3) return showToast("Enter a valid Pioneer username","danger")
      if(!piAmount||Number(piAmount)<=0) return showToast("Enter a valid Pi amount","danger")
      if(Number(piAmount)>142.50) return showToast("Insufficient Pi balance","danger")
      return true
    }
    if(type==="hotel"){
      if(!hotel) return showToast("Select a hotel","danger")
      if(!amount||Number(amount)<1) return showToast("Enter number of nights","danger")
      return true
    }
    if(type==="transport"){
      if(!transport) return showToast("Select a transport service","danger")
      if(!amount||Number(amount)<100) return showToast("Enter a valid amount","danger")
      return true
    }
    return true
  }

  const handlePay=(service)=>{
    requireTxnPin(`Confirm ${service}`,()=>{
      setTxnPinModal(null)
      showToast(`${service} payment successful! 🎉`,"success")
      setSubPage(null)
      setAmount(""); setPhone(""); setNetwork(""); setBundle(null)
      setDisco(""); setMeter(""); setRecipient(""); setPiAmount("")
      setBettingSite(null); setBettingId(""); setHotel(null); setTransport(null); setInternetProvider(null)
    })
  }

  const navTo=(p,sub=null)=>{ setPage(p); setSubPage(sub) }

  const [legalPage, setLegalPage] = useState(null)
  if (legalPage === "privacy") return <PrivacyPolicy onBack={() => setLegalPage(null)} />
  if (legalPage === "terms") return <TermsOfService onBack={() => setLegalPage(null)} />
  if (legalPage === "support") return <SupportPage onBack={() => setLegalPage(null)} />

  const filteredTx = txFilter==="all"?TRANSACTIONS:TRANSACTIONS.filter(t=>t.type===txFilter)

  // ── AUTH SCREENS ────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    if (authScreen === "splash") return <SplashScreen onContinue={setAuthScreen} />
    if (authScreen === "register") return <RegisterScreen onSuccess={()=>setIsLoggedIn(true)} onLogin={()=>setAuthScreen("login")} />
    if (authScreen === "login") return <LoginScreen onSuccess={()=>setIsLoggedIn(true)} onRegister={()=>setAuthScreen("register")} onForgot={()=>setAuthScreen("forgot")} />
    if (authScreen === "forgot") return <ForgotScreen onBack={()=>setAuthScreen("login")} />
  }

  if (showProfile) return <ProfileScreen onBack={()=>setShowProfile(false)} onLogout={()=>{ setIsLoggedIn(false); setAuthScreen("login"); setShowProfile(false) }} />

  // ── MAIN APP ────────────────────────────────────────────────────────────────
  return (
    <div style={{maxWidth:430,margin:"0 auto",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",position:"relative"}}>

      {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toastType==="success"?C.success:C.danger,color:"white",padding:"12px 24px",borderRadius:24,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",whiteSpace:"nowrap"}}>{toast}</div>}

      {txnPinModal&&<TxnPinModal label={txnPinModal.label} onSuccess={txnPinModal.onSuccess} onCancel={()=>setTxnPinModal(null)}/>}

      {showNotif&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:500}} onClick={()=>setShowNotif(false)}>
          <div style={{position:"absolute",top:0,right:0,width:300,height:"100vh",background:"white",padding:16,overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <p style={{margin:0,fontSize:16,fontWeight:700}}>Notifications</p>
              <button onClick={()=>setShowNotif(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            {notifications.map(n=>(
              <div key={n.id} onClick={()=>setNotifications(prev=>prev.map(x=>x.id===n.id?{...x,read:true}:x))}
                style={{padding:12,borderRadius:10,marginBottom:8,background:n.read?"white":"#F0EBFF",border:`1px solid ${n.read?"#eee":"#DDD6FE"}`,cursor:"pointer"}}>
                <div style={{display:"flex",gap:10}}>
                  <span style={{fontSize:20}}>{n.icon}</span>
                  <div><p style={{margin:0,fontSize:13,fontWeight:n.read?400:600}}>{n.text}</p><p style={{margin:"4px 0 0",fontSize:11,color:"#999"}}>{n.time}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto"}}>

      {page==="home"&&!subPage&&(
        <div>
          <div style={{background:`linear-gradient(135deg,${C.primary} 0%,#9F67F5 100%)`,padding:"20px 16px 40px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <p style={{color:"rgba(255,255,255,0.8)",fontSize:12,margin:0}}>Good day, Pioneer 👋</p>
                <p style={{color:"white",fontSize:17,fontWeight:700,margin:"2px 0 0"}}>{user.fullName||"Zappi User"}</p>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <NotificationBell />
                <button onClick={()=>setShowProfile(true)} style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.25)",border:"2px solid rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer"}}>
                  {user.avatar||"⚡"}
                </button>
              </div>
            </div>
            <div style={{background:"rgba(255,255,255,0.15)",borderRadius:18,padding:18,backdropFilter:"blur(10px)"}}>
              <p style={{color:"rgba(255,255,255,0.75)",fontSize:12,margin:0}}>Pi Balance</p>
              <p style={{color:"white",fontSize:34,fontWeight:800,margin:"4px 0 2px",letterSpacing:"-1px"}}>π 142.50</p>
              <p style={{color:"rgba(255,255,255,0.65)",fontSize:12,margin:0}}>≈ ₦{(142.50 * liveRate).toLocaleString()} · Rate: ₦{liveRate}/π</p>
              <div style={{marginTop:10}}><PiRateTicker /></div>
            </div>
          </div>

          {!bonusClaimed&&(
            <div style={{margin:"0 16px",marginTop:-16,background:"linear-gradient(135deg,#F59E0B,#EF4444)",borderRadius:14,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 4px 12px rgba(245,158,11,0.3)"}}>
              <div>
                <p style={{color:"white",fontWeight:700,fontSize:14,margin:0}}>🎁 Daily Bonus Available!</p>
                <p style={{color:"rgba(255,255,255,0.85)",fontSize:12,margin:"2px 0 0"}}>Claim your π0.05 daily reward</p>
              </div>
              <button onClick={()=>{setBonusClaimed(true);showToast("🎉 Daily bonus claimed!","success")}} style={{background:"white",border:"none",borderRadius:10,padding:"8px 14px",fontWeight:700,fontSize:13,color:"#F59E0B",cursor:"pointer"}}>Claim</button>
            </div>
          )}

          <div style={{display:"flex",gap:10,padding:"16px 16px 0",marginTop:bonusClaimed?"-12px":8}}>
            {[{label:"Send Pi",icon:"💸",action:()=>navTo("send")},{label:"Refer & Earn",icon:"🎯",action:()=>navTo("home","refer")},{label:"History",icon:"🕐",action:()=>navTo("history")},{label:"Profile",icon:"👤",action:()=>setShowProfile(true)}].map(a=>(
              <button key={a.label} onClick={a.action} style={{flex:1,background:"white",border:"none",borderRadius:12,padding:"12px 4px",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <span style={{fontSize:20}}>{a.icon}</span>
                <span style={{fontSize:10,color:"#555",fontWeight:600}}>{a.label}</span>
              </button>
            ))}
          </div>

          <div style={{padding:"20px 16px 8px"}}>
            <p style={{fontSize:12,fontWeight:700,color:"#888",margin:"0 0 12px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Quick actions</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
              {[{label:"Buy Airtime",icon:"📱",bg:"#EDE9FE",color:"#7C3AED",sub:"airtime"},{label:"Buy Data",icon:"📶",bg:"#ECFDF5",color:"#059669",sub:"data"},{label:"Electricity",icon:"⚡",bg:"#FFF7ED",color:"#EA580C",sub:"electricity"},{label:"Cable TV",icon:"📺",bg:"#FDF2F8",color:"#A21CAF",sub:"cable"}].map(item=>(
                <button key={item.label} onClick={()=>{setPage("bills");setSubPage(item.sub)}} style={{background:"white",border:"none",borderRadius:14,padding:16,textAlign:"left",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.97)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
                  <div style={{width:42,height:42,borderRadius:12,background:item.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:8}}>{item.icon}</div>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1a1a"}}>{item.label}</p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:item.color,fontWeight:500}}>Pay with Pi</p>
                </button>
              ))}
            </div>
          </div>

          <div style={{padding:"8px 16px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <p style={{fontSize:12,fontWeight:700,color:"#888",margin:0,textTransform:"uppercase",letterSpacing:"0.5px"}}>Recent transactions</p>
              <button onClick={()=>setPage("history")} style={{background:"none",border:"none",color:C.primary,fontSize:12,cursor:"pointer",fontWeight:600}}>See all →</button>
            </div>
            {TRANSACTIONS.slice(0,3).map(tx=>(
              <div key={tx.id} style={{background:"white",borderRadius:14,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                <div style={{width:42,height:42,borderRadius:12,background:tx.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{tx.icon}</div>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1a1a"}}>{tx.label}</p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:"#aaa"}}>{tx.sub} · {tx.date}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:tx.type==="receive"?"#22C55E":"#1a1a1a"}}>{tx.type==="receive"?"+":"-"}{tx.pi}</p>
                  <span style={{background:tx.status==="success"?"#DCFCE7":"#FEE2E2",color:tx.status==="success"?"#166534":"#991B1B",fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:600}}>{tx.status==="success"?"✓":"✗"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {page==="home"&&subPage==="refer"&&(
        <div>
          <Header title="Refer & Earn" onBack={()=>setSubPage(null)}/>
          <div style={{padding:16}}>
            <div style={{background:`linear-gradient(135deg,${C.primary},#9F67F5)`,borderRadius:16,padding:20,textAlign:"center",marginBottom:16}}>
              <p style={{color:"white",fontSize:30,margin:0}}>🎯</p>
              <p style={{color:"white",fontWeight:700,fontSize:18,margin:"8px 0 4px"}}>Refer & Earn Pi</p>
              <p style={{color:"rgba(255,255,255,0.8)",fontSize:13,margin:0}}>Earn π0.50 for every Pioneer who makes their first payment</p>
            </div>
            <div style={{background:"white",borderRadius:14,padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <p style={{fontSize:12,color:"#777",margin:"0 0 6px",fontWeight:600}}>Your referral code</p>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{flex:1,background:C.light,borderRadius:10,padding:"12px 14px",fontWeight:700,fontSize:16,color:C.primary,letterSpacing:"2px"}}>ZAPPI50</div>
                <button onClick={()=>showToast("Referral code copied!","success")} style={{background:C.primary,border:"none",borderRadius:10,padding:"12px 16px",color:"white",fontWeight:600,cursor:"pointer"}}>Copy</button>
              </div>
            </div>
            <div style={{background:"white",borderRadius:14,padding:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <p style={{fontSize:13,fontWeight:700,margin:"0 0 12px"}}>Your referral stats</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {[{label:"Referred",value:"7"},{label:"Active",value:"5"},{label:"Earned",value:"π2.50"}].map(s=>(
                  <div key={s.label} style={{background:C.bg,borderRadius:10,padding:12,textAlign:"center"}}>
                    <p style={{margin:0,fontSize:20,fontWeight:800,color:C.primary}}>{s.value}</p>
                    <p style={{margin:"4px 0 0",fontSize:11,color:"#777"}}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <Btn label="Share Referral Link" onClick={()=>showToast("Referral link shared!","success")}/>
          </div>
        </div>
      )}

      {page==="bills"&&!subPage&&(
        <div>
          <Header title="Pay Bills"/>
          <div style={{padding:16}}>
            {[{label:"Buy Airtime",icon:"📱",bg:"#EDE9FE",sub:"airtime",desc:"MTN, Airtel, Glo, 9mobile"},{label:"Buy Data",icon:"📶",bg:"#ECFDF5",sub:"data",desc:"Data bundles"},{label:"Electricity",icon:"⚡",bg:"#FFF7ED",sub:"electricity",desc:"Prepaid & postpaid meters"},{label:"Cable TV",icon:"📺",bg:"#FDF2F8",sub:"cable",desc:"DStv, GOtv, Startimes"},{label:"Internet",icon:"🌐",bg:"#EFF6FF",sub:"internet",desc:"Smile, Spectranet, ipNX"},{label:"Betting",icon:"🎯",bg:"#F0FDF4",sub:"betting",desc:"Bet9ja, Sportybet, 1xBet"}].map(item=>(
              <SCard key={item.label} icon={item.icon} label={item.label} desc={item.desc} bg={item.bg} onClick={()=>setSubPage(item.sub)}/>
            ))}
          </div>
        </div>
      )}

      {page==="bills"&&subPage==="airtime"&&(
        <div><Header title="Buy Airtime" onBack={()=>setSubPage(null)}/>
        <div style={{padding:16}}>
          <FL>Network</FL><NetGrid selected={network} onSelect={setNetwork}/>
          <FL>Phone number</FL><Inp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08012345678"/>
          <FL>Amount (₦)</FL>
          <div style={{display:"flex",gap:8,marginBottom:8}}>{[100,200,500,1000].map(a=><button key={a} onClick={()=>setAmount(String(a))} style={{flex:1,padding:10,borderRadius:10,border:`2px solid ${amount==a?C.primary:"#E5E7EB"}`,background:amount==a?C.light:"white",cursor:"pointer",fontSize:13,fontWeight:600}}>₦{a}</button>)}</div>
          <Inp value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Or enter amount"/>
          <PiSummary amount={amount} rate={liveRate}/>
          <Btn label={`Buy Airtime — π ${amount?(amount/liveRate).toFixed(4):"0"}`} disabled={!network||!phone||!amount} onClick={()=>validate("airtime")&&handlePay("Airtime")}/>
        </div></div>
      )}

      {page==="bills"&&subPage==="data"&&(
        <div><Header title="Buy Data" onBack={()=>setSubPage(null)}/>
        <div style={{padding:16}}>
          <FL>Network</FL><NetGrid selected={network} onSelect={n=>{setNetwork(n);setBundle(null)}}/>
          <FL>Phone number</FL><Inp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08012345678"/>
          {network&&<><FL>Select bundle</FL>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:16}}>
            {(DATA_BUNDLES[network]||[]).map(b=><button key={b.code} onClick={()=>setBundle(b)} style={{padding:14,borderRadius:12,border:`2px solid ${bundle?.code===b.code?C.primary:"#E5E7EB"}`,background:bundle?.code===b.code?C.light:"white",cursor:"pointer",textAlign:"left"}}>
              <p style={{margin:0,fontSize:16,fontWeight:800}}>{b.label}</p><p style={{margin:"2px 0 4px",fontSize:11,color:"#999"}}>{b.duration}</p><p style={{margin:0,fontSize:13,fontWeight:700,color:C.primary}}>₦{b.price.toLocaleString()}</p>
            </button>)}
          </div></>}
          {bundle&&<PiSummary amount={bundle.price}/>}
          <Btn label={bundle?`Buy ${bundle.label} Data — π ${(bundle.price/liveRate).toFixed(4)}`:"Select a bundle"} disabled={!network||!phone||!bundle} onClick={()=>validate("data")&&handlePay("Data")}/>
        </div></div>
      )}

      {page==="bills"&&subPage==="electricity"&&(
        <div><Header title="Electricity Bill" onBack={()=>setSubPage(null)}/>
        <div style={{padding:16}}>
          <FL>Distribution company</FL>
          <select value={disco} onChange={e=>setDisco(e.target.value)} style={{width:"100%",padding:13,borderRadius:10,border:"1.5px solid #E5E7EB",marginBottom:16,boxSizing:"border-box",fontSize:14,outline:"none",background:"white",fontFamily:"inherit"}}>
            <option value="">Select your DISCO</option>{DISCOS.map(d=><option key={d}>{d}</option>)}
          </select>
          <FL>Meter type</FL>
          <div style={{display:"flex",gap:8,marginBottom:16}}>{["prepaid","postpaid"].map(t=><button key={t} onClick={()=>setMeterType(t)} style={{flex:1,padding:12,borderRadius:10,border:`2px solid ${meterType===t?C.primary:"#E5E7EB"}`,background:meterType===t?C.light:"white",cursor:"pointer",fontWeight:600,textTransform:"capitalize"}}>{t}</button>)}</div>
          <FL>Meter number</FL><Inp value={meter} onChange={e=>setMeter(e.target.value)} placeholder="Enter meter number"/>
          <FL>Amount (₦)</FL>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>{[1000,2000,5000,10000].map(a=><button key={a} onClick={()=>setAmount(String(a))} style={{padding:"10px 14px",borderRadius:10,border:`2px solid ${amount==a?C.primary:"#E5E7EB"}`,background:amount==a?C.light:"white",cursor:"pointer",fontSize:13,fontWeight:600}}>₦{a.toLocaleString()}</button>)}</div>
          <Inp value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Or enter amount"/>
          <PiSummary amount={amount} bg="#FFF7ED" color="#EA580C" rate={liveRate}/>
          <Btn label={`Pay ₦${Number(amount||0).toLocaleString()} — π ${amount?(amount/liveRate).toFixed(4):"0"}`} disabled={!disco||!meter||!amount} onClick={()=>validate("electricity")&&handlePay("Electricity")}/>
        </div></div>
      )}

      {page==="bills"&&subPage==="cable"&&(
        <div><Header title="Cable TV" onBack={()=>setSubPage(null)}/>
        <div style={{padding:16}}>
          <FL>Provider</FL>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>{["DStv","GOtv","Startimes"].map(p=><button key={p} onClick={()=>setNetwork(p)} style={{padding:14,borderRadius:10,border:`2px solid ${network===p?C.primary:"#E5E7EB"}`,background:network===p?C.light:"white",cursor:"pointer",fontWeight:700,fontSize:13}}>{p}</button>)}</div>
          <FL>Smart card / IUC number</FL><Inp value={meter} onChange={e=>setMeter(e.target.value)} placeholder="Enter smart card number"/>
          <FL>Select package</FL>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>{[{label:"Basic",price:2500},{label:"Compact",price:9000},{label:"Compact+",price:14250},{label:"Premium",price:29500}].map(pkg=><button key={pkg.label} onClick={()=>setAmount(String(pkg.price))} style={{padding:14,borderRadius:12,border:`2px solid ${amount==pkg.price?C.primary:"#E5E7EB"}`,background:amount==pkg.price?C.light:"white",cursor:"pointer",textAlign:"left"}}>
            <p style={{margin:0,fontSize:14,fontWeight:700}}>{pkg.label}</p><p style={{margin:"4px 0 0",fontSize:13,color:C.primary,fontWeight:700}}>₦{pkg.price.toLocaleString()}</p>
          </button>)}</div>
          <PiSummary amount={amount} bg="#FDF2F8" color="#A21CAF" rate={liveRate}/>
          <Btn label={`Pay ₦${Number(amount||0).toLocaleString()} — π ${amount?(amount/liveRate).toFixed(4):"0"}`} disabled={!network||!meter||!amount} onClick={()=>validate("cable")&&handlePay("Cable TV")}/>
        </div></div>
      )}

      {page==="bills"&&subPage==="internet"&&(
        <div><Header title="Internet" onBack={()=>setSubPage(null)}/>
        <div style={{padding:16}}>
          <FL>Select provider</FL>
          {INTERNET_PROVIDERS.map(p=><button key={p.id} onClick={()=>setInternetProvider(p)} style={{width:"100%",background:"white",border:`2px solid ${internetProvider?.id===p.id?C.primary:"#E5E7EB"}`,borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:24}}>{p.icon}</span>
            <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:700}}>{p.label}</p><p style={{margin:"2px 0 0",fontSize:12,color:"#999"}}>From ₦{p.price.toLocaleString()}/month</p></div>
            {internetProvider?.id===p.id&&<span style={{color:C.primary,fontSize:18}}>✓</span>}
          </button>)}
          {internetProvider&&<><FL>Account number</FL><Inp value={meter} onChange={e=>setMeter(e.target.value)} placeholder="Account number"/><FL>Amount (₦)</FL><Inp value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter amount" type="number"/><PiSummary amount={amount} bg="#EFF6FF" color="#2563EB" rate={liveRate}/><Btn label={`Pay — π ${amount?(amount/liveRate).toFixed(4):"0"}`} disabled={!meter||!amount} onClick={()=>validate("internet")&&handlePay("Internet")}/></>}
        </div></div>
      )}

      {page==="bills"&&subPage==="betting"&&(
        <div><Header title="Betting Wallet" onBack={()=>setSubPage(null)}/>
        <div style={{padding:16}}>
          <FL>Select betting site</FL>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:16}}>{BETTING_SITES.map(b=><button key={b.id} onClick={()=>setBettingSite(b)} style={{padding:14,borderRadius:12,border:`2px solid ${bettingSite?.id===b.id?C.primary:"#E5E7EB"}`,background:bettingSite?.id===b.id?C.light:"white",cursor:"pointer",textAlign:"center"}}>
            <span style={{fontSize:24}}>{b.icon}</span><p style={{margin:"6px 0 0",fontSize:13,fontWeight:700}}>{b.label}</p>
          </button>)}</div>
          {bettingSite&&<><FL>Betting ID</FL><Inp value={bettingId} onChange={e=>setBettingId(e.target.value)} placeholder={`${bettingSite.label} user ID`}/>
          <FL>Amount (₦)</FL>
          <div style={{display:"flex",gap:8,marginBottom:8}}>{[500,1000,2000,5000].map(a=><button key={a} onClick={()=>setAmount(String(a))} style={{flex:1,padding:10,borderRadius:10,border:`2px solid ${amount==a?C.primary:"#E5E7EB"}`,background:amount==a?C.light:"white",cursor:"pointer",fontSize:12,fontWeight:600}}>₦{a>=1000?a/1000+"k":a}</button>)}</div>
          <Inp value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Or enter amount" type="number"/>
          <PiSummary amount={amount} bg="#F0FDF4" color="#15803D" rate={liveRate}/>
          <Btn label={`Fund ${bettingSite.label} — π ${amount?(amount/liveRate).toFixed(4):"0"}`} disabled={!bettingId||!amount} onClick={()=>validate("betting")&&handlePay(`${bettingSite.label} betting`)}/></>}
        </div></div>
      )}

      {page==="send"&&(
        <div><Header title="Send Pi"/>
        <div style={{padding:16}}>
          <FL>Recent pioneers</FL>
          <div style={{display:"flex",gap:12,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
            {BENEFICIARIES.map(b=><button key={b.name} onClick={()=>setRecipient(b.username)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0}}>
              <div style={{width:46,height:46,borderRadius:"50%",background:recipient===b.username?C.primary:C.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:recipient===b.username?"white":C.primary,border:`2px solid ${recipient===b.username?C.primary:"transparent"}`}}>{b.initials}</div>
              <span style={{fontSize:11,color:"#777"}}>{b.name}</span>
            </button>)}
          </div>
          <FL>Recipient username</FL>
          <div style={{display:"flex",alignItems:"center",border:"1.5px solid #E5E7EB",borderRadius:10,padding:"0 12px",marginBottom:16,background:"white"}}>
            <span style={{color:C.primary,fontWeight:700,fontSize:18}}>@</span>
            <input value={recipient} onChange={e=>setRecipient(e.target.value.toLowerCase())} placeholder="pioneer_username" style={{flex:1,padding:13,border:"none",outline:"none",fontSize:14,background:"transparent",fontFamily:"inherit"}}/>
          </div>
          <FL>Amount (π)</FL>
          <div style={{display:"flex",gap:8,marginBottom:8}}>{[1,5,10,20].map(a=><button key={a} onClick={()=>setPiAmount(String(a))} style={{flex:1,padding:10,borderRadius:10,border:`2px solid ${piAmount==a?C.primary:"#E5E7EB"}`,background:piAmount==a?C.light:"white",cursor:"pointer",fontSize:13,fontWeight:600}}>π{a}</button>)}</div>
          <Inp value={piAmount} onChange={e=>setPiAmount(e.target.value)} placeholder="0.00" type="number"/>
          {piAmount>0&&<div style={{background:C.light,borderRadius:10,padding:14,marginBottom:12,display:"flex",justifyContent:"space-between"}}><span style={{color:"#5B21B6",fontSize:13}}>NGN equivalent</span><span style={{color:"#5B21B6",fontSize:14,fontWeight:700}}>₦{(Number(piAmount)*liveRate).toLocaleString()}</span></div>}
          <FL>Note (optional)</FL><Inp value={note} onChange={e=>setNote(e.target.value)} placeholder="What's this for?"/>
          <Btn label={`Send π${piAmount||"0"} to @${recipient||"..."}`} disabled={!recipient||!piAmount} onClick={()=>validate("send")&&handlePay("Pi Transfer")}/>
        </div></div>
      )}

      {page==="more"&&!subPage&&(
        <div><Header title="More Services"/>
        <div style={{padding:16}}>
          <p style={{fontSize:12,fontWeight:700,color:"#aaa",margin:"0 0 10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Travel & Lifestyle</p>
          <SCard icon="🏨" label="Hotels" desc="Book hotels across Nigeria" bg="#FEF9C3" onClick={()=>setSubPage("hotel")}/>
          <SCard icon="✈️" label="Travel & Transport" desc="Flights, rides, tolls & more" bg="#DBEAFE" onClick={()=>setSubPage("transport")}/>
          <p style={{fontSize:12,fontWeight:700,color:"#aaa",margin:"16px 0 10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Finance & Rewards</p>
          <SCard icon="🎯" label="Refer & Earn" desc="Earn π0.50 per referral" bg="#ECFDF5" onClick={()=>navTo("home","refer")}/>
          <SCard icon="📊" label="Pi Market Rate" desc="Live Pi/NGN exchange rate" bg="#FFF7ED" onClick={()=>showToast(`Current rate: ₦${liveRate}/π`,"success")}/>
          <SCard icon="💰" label="Pi Savings" desc="Save Pi and earn interest (Coming soon)" bg="#EDE9FE" onClick={()=>showToast("Pi Savings launching soon!","success")}/>
          <p style={{fontSize:12,fontWeight:700,color:"#aaa",margin:"16px 0 10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Account</p>
          <SCard icon="👤" label="My Profile" desc="Manage your account" bg="#F0F0FF" onClick={()=>setShowProfile(true)}/>
          <SCard icon="💬" label="Help & Support" desc="FAQ, WhatsApp, contact us" bg="#F0FDF4" onClick={()=>setLegalPage("support")}/>
          <SCard icon="🌙" label="Dark Mode" desc={theme==="dark"?"Switch to light mode":"Switch to dark mode"} bg="#F0F0FF" onClick={toggleTheme}/>
          <p style={{fontSize:12,fontWeight:700,color:"#aaa",margin:"16px 0 10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Legal</p>
          <SCard icon="📄" label="Privacy Policy" desc="How we handle your data" bg="#F9FAFB" onClick={()=>setLegalPage("privacy")}/>
          <SCard icon="📋" label="Terms of Service" desc="Rules for using Zappi NG" bg="#F9FAFB" onClick={()=>setLegalPage("terms")}/>
        </div></div>
      )}

      {page==="more"&&subPage==="hotel"&&(
        <div><Header title="Book a Hotel" onBack={()=>setSubPage(null)}/>
        <div style={{padding:16}}>
          <FL>Popular hotels</FL>
          {HOTELS.map(h=><button key={h.id} onClick={()=>setHotel(h)} style={{width:"100%",background:"white",border:`2px solid ${hotel?.id===h.id?C.primary:"#E5E7EB"}`,borderRadius:14,padding:14,marginBottom:10,display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:30}}>🏨</span>
            <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:700}}>{h.label}</p><p style={{margin:"2px 0",fontSize:12,color:"#999"}}>{h.city} · {h.rating}</p><p style={{margin:0,fontSize:13,fontWeight:700,color:C.primary}}>₦{h.price.toLocaleString()}/night</p></div>
            {hotel?.id===h.id&&<span style={{color:C.primary,fontSize:20}}>✓</span>}
          </button>)}
          {hotel&&<><FL>Number of nights</FL><Inp value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 2" type="number"/>
          {amount>0&&<PiSummary amount={hotel.price*Number(amount)} bg="#FEF9C3" color="#854D0E" rate={liveRate}/>}
          <Btn label={`Book — π ${amount?(hotel.price*amount/liveRate).toFixed(4):"0"}`} disabled={!amount} onClick={()=>validate("hotel")&&handlePay("Hotel booking")}/></>}
        </div></div>
      )}

      {page==="more"&&subPage==="transport"&&(
        <div><Header title="Travel & Transport" onBack={()=>setSubPage(null)}/>
        <div style={{padding:16}}>
          <FL>Select service</FL>
          {TRANSPORT.map(t=><button key={t.id} onClick={()=>setTransport(t)} style={{width:"100%",background:"white",border:`2px solid ${transport?.id===t.id?C.primary:"#E5E7EB"}`,borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:26}}>{t.icon}</span>
            <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:700}}>{t.label}</p><p style={{margin:"2px 0 0",fontSize:12,color:"#999"}}>{t.desc}</p></div>
            {transport?.id===t.id&&<span style={{color:C.primary,fontSize:18}}>✓</span>}
          </button>)}
          {transport&&<><FL>Amount (₦)</FL><Inp value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter amount" type="number"/>
          <PiSummary amount={amount} bg="#DBEAFE" color="#1D4ED8" rate={liveRate}/>
          <Btn label={`Pay for ${transport.label} — π ${amount?(amount/liveRate).toFixed(4):"0"}`} disabled={!amount} onClick={()=>validate("transport")&&handlePay(transport.label)}/></>}
        </div></div>
      )}

      {page==="history"&&(
        <div><Header title="Transactions"/>
        <div style={{padding:"12px 16px 6px",display:"flex",gap:8,overflowX:"auto"}}>
          {[{id:"all",label:"All"},{id:"airtime",label:"Airtime"},{id:"data",label:"Data"},{id:"electricity",label:"Electric"},{id:"send",label:"Sent"},{id:"receive",label:"Received"}].map(f=>(
            <button key={f.id} onClick={()=>setTxFilter(f.id)} style={{padding:"6px 14px",borderRadius:20,border:"none",background:txFilter===f.id?C.primary:"#E5E7EB",color:txFilter===f.id?"white":"#555",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>{f.label}</button>
          ))}
        </div>
        <div style={{padding:"8px 16px"}}>
          {filteredTx.length===0&&<p style={{color:"#aaa",textAlign:"center",padding:40,fontSize:14}}>No transactions found</p>}
          {filteredTx.map(tx=>(
            <div key={tx.id} style={{background:"white",borderRadius:14,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
              <div style={{width:44,height:44,borderRadius:12,background:tx.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{tx.icon}</div>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1a1a"}}>{tx.label}</p>
                <p style={{margin:"2px 0",fontSize:11,color:"#bbb"}}>{tx.sub}</p>
                <p style={{margin:0,fontSize:11,color:"#bbb"}}>{tx.date}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:tx.type==="receive"?"#22C55E":"#1a1a1a"}}>{tx.type==="receive"?"+":"-"}{tx.pi}</p>
                <p style={{margin:"2px 0",fontSize:11,color:"#aaa"}}>{tx.amount}</p>
                <span style={{background:tx.status==="success"?"#DCFCE7":"#FEE2E2",color:tx.status==="success"?"#166534":"#991B1B",fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:700}}>{tx.status==="success"?"✓ Success":"✗ Failed"}</span>
              </div>
            </div>
          ))}
        </div></div>
      )}

      </div>
      <NavBar page={page} setPage={p=>{setPage(p);setSubPage(null)}}/>
    </div>
  )
}
