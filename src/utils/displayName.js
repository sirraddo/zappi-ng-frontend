// Name to show for the signed-in user: the name they saved in Profile, otherwise
// their Pi username (read from the session token), otherwise a neutral fallback.
export function piUsername() {
  try {
    const t = localStorage.getItem("zappi_token");
    if (!t) return "";
    const b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b)).username || "";
  } catch { return ""; }
}

export function displayName(user, fallback = "Pioneer") {
  return (user?.fullName || "").trim() || piUsername() || fallback;
}
