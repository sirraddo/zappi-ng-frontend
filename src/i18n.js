/**
 * i18n.js — tiny translation helper for Zappi NG.
 * English text is the key; missing translations fall back to English.
 *
 * NOTE: the Nigerian Pidgin (pcm) and Yorùbá (yo) strings below are first drafts
 * and MUST be reviewed by native speakers before being treated as final.
 */
export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "pcm", label: "Pidgin" },
  { id: "yo", label: "Yorùbá" },
]

const DICT = {
  pcm: {
    "Home": "Home", "Bills": "Bills", "More": "Mòre", "History": "History",
    "Good day, Pioneer 👋": "How far, Pioneer 👋",
    "Buy Airtime": "Buy Airtime", "Buy Data": "Buy Data", "Electricity": "Light (NEPA)", "Cable TV": "Cable TV",
    "Recent transactions": "Wetin you do recently",
    "Check status": "Check how e dey go", "Checking…": "I dey check…",
    "Your usual": "Your usual", "Repeat": "Do am again",
    "for": "for",
    "Rates": "Rate", "Account": "Account", "Legal": "Law matter",
    "My Profile": "My Profile", "Help & Support": "Help & Support", "Dark Mode": "Dark Mode",
    "Language": "Language", "Choose your language": "Choose your language",
    "Search plans, e.g. 2GB, 1000, weekly": "Find plan, e.g. 2GB, 1000, weekly",
    "RECENTLY BOUGHT": "WETIN YOU BUY RECENTLY",
    "Refund in progress": "We dey refund your Pi", "Pi refunded": "We don refund your Pi",
    "Waking up the server… this can take up to a minute the first time. Thanks for your patience.": "We dey wake the server… e fit take small time (like 1 minute). Abeg no vex.",
  },
  yo: {
    "Home": "Ilé", "Bills": "Àwọn Owó Ìsanwó", "More": "Àfikún", "History": "Ìtàn",
    "Good day, Pioneer 👋": "Ẹ kú ọjọ́, Pioneer 👋",
    "Buy Airtime": "Ra Airtime", "Buy Data": "Ra Data", "Electricity": "Iná Mọ̀nàmọ́ná", "Cable TV": "Cable TV",
    "Recent transactions": "Àwọn ìgbòwò àìpẹ́",
    "Check status": "Ṣàyẹ̀wò ipò rẹ̀", "Checking…": "Ó ń ṣàyẹ̀wò…",
    "Your usual": "Tí o máa ń ra", "Repeat": "Tún ṣe é",
    "for": "fún",
    "Rates": "Owó Pi", "Account": "Àkántì", "Legal": "Òfin",
    "My Profile": "Pàtàkì Mi", "Help & Support": "Ìrànlọ́wọ́", "Dark Mode": "Ìrísí Dúdú",
    "Language": "Èdè", "Choose your language": "Yan èdè rẹ",
    "Search plans, e.g. 2GB, 1000, weekly": "Wá ètò, bíi 2GB, 1000, ọ̀sẹ̀",
    "RECENTLY BOUGHT": "ÀWỌN TÍ O RA LÁTIJỌ́ YÌÍ",
    "Refund in progress": "A ń dá Pi rẹ padà", "Pi refunded": "A ti dá Pi rẹ padà",
    "Waking up the server… this can take up to a minute the first time. Thanks for your patience.": "À ń jí olùpèsè (server)… ó lè gba ìṣẹ́jú kan. Ẹ ṣeun fún sùúrù yín.",
  },
}

let current = "en"
try { const saved = localStorage.getItem("zappi_lang"); if (saved && (saved === "en" || DICT[saved])) current = saved } catch {}

export const getLang = () => current
export function setLang(id) {
  current = id === "en" || DICT[id] ? id : "en"
  try { localStorage.setItem("zappi_lang", current) } catch {}
}
export const t = (text) => (current !== "en" && DICT[current]?.[text]) || text
