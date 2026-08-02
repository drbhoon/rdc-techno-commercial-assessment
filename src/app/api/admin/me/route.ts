import { NextRequest, NextResponse } from "next/server";
import { REQUIRE_SSO } from "@/lib/adminAuth";

/**
 * Lets the admin login page skip its password prompt when the HR platform has
 * already identified the caller. Returns null elsewhere so the prompt still
 * appears on Railway and in local development.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    email: req.headers.get("x-auth-email"),
    sso: REQUIRE_SSO,
  });
}
