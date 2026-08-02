import type { NextRequest } from "next/server";

/**
 * Who is allowed into the admin API.
 *
 * On the HR platform (hr.rdcc.ai/techno) nginx has already verified the caller
 * against the HR allowlist and forwards their address as X-Auth-Email. That
 * header is blanked on every inbound request and re-set only from the
 * auth_request result, so a caller cannot forge it.
 *
 * The shared admin password remains valid as a fallback, which keeps Railway
 * and local development working unchanged.
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin@rdc2026";
const REQUIRE_SSO = process.env.REQUIRE_SSO === "true";

/** Returns the admin's identity, or null when the request is not authorised. */
export function adminIdentity(req: NextRequest): string | null {
  if (REQUIRE_SSO) {
    const email = req.headers.get("x-auth-email");
    if (email) return email;
  }
  if (req.headers.get("x-admin-password") === ADMIN_PASSWORD) return "admin";
  return null;
}

export function checkAuth(req: NextRequest): boolean {
  return adminIdentity(req) !== null;
}

export { REQUIRE_SSO };
