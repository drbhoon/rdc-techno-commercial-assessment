import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/dbPool";
import { getSession, updateSession } from "@/lib/db";
import { finaliseSession } from "@/lib/finalise";
import { checkAuth } from "@/lib/adminAuth";


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const pool = getPool();
  const res = await pool.query("DELETE FROM rdc_sessions WHERE id = $1", [id]);
  if (res.rowCount === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * POST /api/admin/sessions/:id — the two things HR needs to do to an attempt.
 *
 *   { action: "finalise" }     close it now and publish what was answered
 *   { action: "allow-retake" } release the candidate to sit the paper again
 *
 * Finalise exists for the attempt whose candidate has clearly gone — a power
 * cut, a closed laptop — but whose two-hour window has not run out yet, so the
 * automatic sweep has not reached it. It evaluates whatever was saved.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (body.action === "finalise") {
    try {
      const result = await finaliseSession(id);
      return NextResponse.json({
        ok: true,
        ...result,
        message:
          result.status === "expired"
            ? "Nothing was answered, so there is no report to publish. Marked expired."
            : `Closed with ${result.answered} answer(s)${result.evaluated ? `, ${result.evaluated} newly evaluated` : ""}.`,
      });
    } catch (err) {
      console.error("[admin finalise]", err);
      return NextResponse.json({ error: "Could not finalise this attempt." }, { status: 500 });
    }
  }

  if (body.action === "allow-retake") {
    session.retakeAllowedAt = new Date().toISOString();
    await updateSession(session);
    return NextResponse.json({
      ok: true,
      message: `${session.candidate.name || session.candidate.employeeId} can sit the ${session.assessmentType} paper again. This attempt is kept.`,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
