import { NextRequest, NextResponse } from "next/server";
import { REQUIRE_SSO } from "@/lib/adminAuth";

/**
 * Lets the admin login page skip its password prompt when the HR platform has
 * already identified the caller. Returns null elsewhere so the prompt still
 * appears on Railway and in local development.
 */
export async function GET(req: NextRequest) {
  // Only claim an identity when SSO is actually switched on. Reporting the
  // header while REQUIRE_SSO is off sends the login page to the dashboard,
  // whose API calls then fall back to the password check, fail, and bounce
  // back here — an endless flicker instead of an honest password prompt.
  return NextResponse.json({
    email: REQUIRE_SSO ? req.headers.get("x-auth-email") : null,
    sso: REQUIRE_SSO,
  });
}
