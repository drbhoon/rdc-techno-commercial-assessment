import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/db";
import { accrue, remainingMs } from "@/lib/examClock";

/**
 * POST /api/session/:id/heartbeat — "I am still here."
 *
 * The exam clock counts only while the candidate is sitting the paper, so the
 * page says so every half minute and the server banks the time between
 * reports. When the reports stop — tab closed, laptop dead — the clock stops
 * with them, which is the whole point: a power cut must not spend the paper.
 *
 * { active: false } is the goodbye, sent when the page is hidden or closed, so
 * the pause is recorded at the right moment instead of being inferred.
 *
 * The balance comes back on every call, and the browser trusts it over its own
 * countdown — the server's copy is the one that survives a refresh.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { active?: boolean };
    const session = await getSession(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // A finished paper has no clock left to run.
    if (session.status !== "in_progress") {
      return NextResponse.json({ remainingMs: 0, status: session.status });
    }

    const updated = accrue(session, body.active !== false);
    await updateSession(updated);
    return NextResponse.json({ remainingMs: remainingMs(updated), status: updated.status });
  } catch (err) {
    console.error("[POST /api/session/[id]/heartbeat]", err);
    return NextResponse.json({ error: "Heartbeat failed" }, { status: 500 });
  }
}
