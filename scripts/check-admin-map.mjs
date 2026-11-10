// Fails the build if a navigation-map entry (backend utils/adminMap.js) points at an anchor/tab missing from AdminScreen.jsx.
// Backend map is read from ADMIN_MAP_PATH, or ../zappi-ng-backend/utils/adminMap.js, or skipped with a warning (e.g. on Vercel).
import fs from "fs"; import path from "path"; import { createRequire } from "module";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const mapPath = process.env.ADMIN_MAP_PATH || path.join(root, "..", "zappi-ng-backend", "utils", "adminMap.js");
if (!fs.existsSync(mapPath)) { console.warn("check-admin-map: backend map not found, skipping"); process.exit(0); }
const map = createRequire(import.meta.url)(mapPath);
const src = fs.readFileSync(path.join(root, "src", "pages", "AdminScreen.jsx"), "utf8");
const list = map.ADMIN || map.admin || [];
const bad = [];
for (const e of list) {
  if (e.anchor && !src.includes(`id="sec-${e.anchor}"`)) bad.push(`${e.id}: missing id="sec-${e.anchor}"`);
}
if (!list.length) { console.error("check-admin-map: no ADMIN entries found"); process.exit(1); }
if (bad.length) { console.error("Navigation map problems:\n - " + bad.join("\n - ")); process.exit(1); }
console.log(`check-admin-map: ${list.length} entries OK`);
