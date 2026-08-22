/**
 * Every admin-protected route must live at a path the platform gates.
 *
 *     node tools/check-admin-gate.mjs
 *
 * WHY THIS EXISTS
 * ---------------
 * On hr.rdcc.ai the admin surface is gated by PATH, not by anything in this
 * app. nginx matches
 *
 *     location ~ ^/techno/(admin|api/admin)
 *
 * and only inside that match does it ask the portal who the caller is and
 * attach X-Auth-Email. Off that path the header is deliberately blanked, so a
 * caller cannot forge one -- which also means an admin-only route sitting
 * outside the pattern can never be authorised. Under SSO there is no fallback
 * either: the console skips the password prompt, so no X-Admin-Password is
 * sent.
 *
 * SRT shipped exactly that bug. Its PDF download checked for an admin at
 * /api/download-pdf, outside the gate, and returned "Unauthorized -- admin
 * only" to an admin who was signed in and looking at a dashboard that had just
 * loaded from /api/admin/... a second earlier.
 *
 * Nothing in development reproduces it: there is no nginx and no SSO locally,
 * so the password path works and the app looks fine. This check stands in for
 * that missing environment.
 *
 * HOW IT DECIDES
 * --------------
 * File-system routing means the path IS the folder, so no route table is
 * needed. A file counts as admin-protected if it reaches for the identity --
 * adminIdentity, checkAuth, or the x-auth-email header itself. Nothing to keep
 * in step by hand: a new route is covered the moment it is written.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// The prefixes nginx gates, from the location block quoted above. The other
// half of this contract is rdc-hr-platform/nginx/default.conf -- if that regex
// moves, this moves with it.
const GATED_PREFIXES = ["/admin", "/api/admin"];

const GUARD_MARKERS = ["adminIdentity", "checkAuth", "x-auth-email"];
const ROUTE_FILES = ["route.ts", "route.tsx", "route.js", "page.tsx", "page.ts"];

const appDir = join(process.cwd(), "src", "app");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (ROUTE_FILES.includes(entry)) out.push(full);
  }
  return out;
}

/** URL path for a route file: the folder it sits in, minus (route groups). */
function urlPath(file) {
  const parts = relative(appDir, file).split(sep);
  parts.pop();                                    // drop route.ts / page.tsx
  return "/" + parts.filter((p) => !p.startsWith("(")).join("/");
}

const protectedRoutes = [];
for (const file of walk(appDir)) {
  const source = readFileSync(file, "utf8");
  const marker = GUARD_MARKERS.find((m) => source.includes(m));
  if (marker) protectedRoutes.push({ path: urlPath(file), file: relative(process.cwd(), file), marker });
}

const offenders = protectedRoutes.filter(
  (r) => !GATED_PREFIXES.some((p) => r.path === p || r.path.startsWith(p + "/")),
);

console.log(`admin-protected routes found: ${protectedRoutes.length}`);
for (const r of protectedRoutes.sort((a, b) => a.path.localeCompare(b.path))) {
  console.log(`  [${offenders.includes(r) ? "FAIL" : "  ok"}] ${r.path}   (${r.file})`);
}

if (protectedRoutes.length === 0) {
  console.log("\nNo admin-protected routes found at all -- the check itself is "
    + "probably broken. Failing rather than reporting a clean run.");
  process.exit(1);
}

if (offenders.length) {
  console.log("\nFAILED - these routes reach for an admin identity but sit outside "
    + "the paths nginx gates, so on hr.rdcc.ai they can never be authorised:");
  for (const r of offenders) console.log(`    ${r.path}   (${r.file})`);
  console.log("\nMove each one under /api/admin (leave a redirect at the old path "
    + "if anything might still call it), or widen the location regex in "
    + "rdc-hr-platform/nginx/default.conf and GATED_PREFIXES here to match.");
  process.exit(1);
}

console.log("\nPASSED - every admin-protected route is inside the gated paths.");
