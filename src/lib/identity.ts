/**
 * Client for the portal's identity resolver.
 *
 * Every app on the platform links its records to one shared person_id rather
 * than keeping its own idea of who somebody is. Techno is ROLL-BOUND: everyone
 * assessed here is an employee, on-roll or off-roll, so both the employee code
 * and the e-mail are required and both are checked.
 *
 * Talks to the portal over the private Docker network on hr.rdcc.ai
 * (http://portal:3000), so the key never leaves the bridge.
 */
const MASTER_API_URL = (process.env.MASTER_API_URL || "").replace(/\/$/, "");
const MASTER_API_KEY = process.env.MASTER_API_KEY || "";

export interface Employment {
  designation: string | null;
  location: string | null;
  city: string | null;
  cost_centre: string | null;
  company: string | null;
}

export interface Person {
  person_id: string;
  employee_code: string | null;
  full_name: string;
  kind: "internal" | "external";
  status: string;
  email: string | null;
  employment?: Employment | null;
}

export type ResolveResult =
  | { ok: true; person: Person }
  | { ok: false; reason: "unconfigured" | "not_found" | "unavailable"; message?: string };

/** False on Railway and local dev, where the portal does not exist. */
export function identityConfigured(): boolean {
  return Boolean(MASTER_API_URL && MASTER_API_KEY);
}

/**
 * Returns a RESULT rather than throwing, and keeps "no such person" separate
 * from "could not ask". The two need opposite handling: an unknown address is
 * the caller's business, while an unreachable portal must never be allowed to
 * look like a rejection.
 */
async function resolvePerson(body: Record<string, unknown>): Promise<ResolveResult> {
  if (!identityConfigured()) return { ok: false, reason: "unconfigured" };

  try {
    const res = await fetch(`${MASTER_API_URL}/api/identity/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-master-key": MASTER_API_KEY },
      body: JSON.stringify(body),
      // A slow portal must not hold the candidate's browser open at the moment
      // they are trying to start a timed assessment.
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (res.status === 404) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, reason: "not_found", message: data.error };
    }
    if (!res.ok) {
      console.error(`[identity] portal returned ${res.status}`);
      return { ok: false, reason: "unavailable" };
    }
    return { ok: true, person: (await res.json()) as Person };
  } catch (err) {
    // Timeout, DNS, connection refused — the portal is down or slow.
    console.error("[identity] resolve failed:", (err as Error).message);
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Resolve a candidate who must be a known employee, with BOTH fields agreeing.
 *
 * The e-mail is looked up ALONE and the returned employee code compared with
 * the one typed. Sending the code to the resolver would ask it to ATTACH an
 * unrecognised address to that employee — right when an HR screen is adding
 * somebody's personal address, and wrong here: it would let a candidate type a
 * colleague's employee code beside their own e-mail and have the assessment
 * recorded against the colleague.
 */
export async function resolveEmployee(
  employeeCode: string,
  email: string,
): Promise<ResolveResult> {
  const code = (employeeCode || "").trim();
  if (!code) return { ok: false, reason: "not_found", message: "Employee code is required." };
  if (!email?.trim()) {
    return { ok: false, reason: "not_found", message: "E-mail address is required." };
  }

  const result = await resolvePerson({
    email: email.trim().toLowerCase(),
    require_internal: true,
    create: false,
  });
  if (!result.ok) return result;

  const found = (result.person.employee_code || "").trim();
  if (found.toLowerCase() !== code.toLowerCase()) {
    // Deliberately does NOT reveal whose code was actually typed.
    return {
      ok: false,
      reason: "not_found",
      message:
        "That employee code does not match the employee code held against this "
        + "e-mail address. Please check both with HR.",
    };
  }
  return result;
}
