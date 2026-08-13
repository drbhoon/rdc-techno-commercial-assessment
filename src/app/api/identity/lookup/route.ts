/**
 * POST /api/identity/lookup — confirm who the candidate is before they start.
 *
 * Lets the form show back the name, designation and location held in the
 * employee master, so a mistyped employee code is caught at the door rather
 * than discovered later in somebody else's report. The candidate then types
 * two fields instead of four, and the report carries HR's spelling.
 *
 * This is a convenience. The REAL check happens again in POST /api/session,
 * because a form field is not evidence of who somebody is.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveEmployee, identityConfigured } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!identityConfigured()) {
    // Railway and local dev have no portal. Say so, rather than failing in a
    // way that looks like the candidate got their own details wrong.
    return NextResponse.json(
      { error: "The employee directory is not available in this environment." },
      { status: 503 },
    );
  }

  let body: { employee_code?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const result = await resolveEmployee(body.employee_code ?? "", body.email ?? "");

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json(
        {
          error:
            result.message
            ?? "No employee found with that code and e-mail address. Please check both with HR.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Could not reach the employee directory just now. Please try again in a minute." },
      { status: 503 },
    );
  }

  const employment = result.person.employment ?? null;
  // Only what the form needs to show back — the rest of the person record is
  // no business of a candidate-facing page.
  return NextResponse.json(
    {
      employee_code: result.person.employee_code,
      full_name: result.person.full_name,
      designation: employment?.designation ?? null,
      location: employment?.location ?? null,
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
