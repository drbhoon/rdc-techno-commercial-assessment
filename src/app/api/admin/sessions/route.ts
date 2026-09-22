import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/db";
import { finaliseExpiredSessions } from "@/lib/finalise";
import { checkAuth } from "@/lib/adminAuth";


export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Close anything the browser never submitted before listing. An attempt past
  // its window cannot be resumed, so whatever was saved is the paper: it is
  // evaluated and published here rather than sitting as "In Progress" with a
  // report nobody can open.
  try {
    const swept = await finaliseExpiredSessions();
    if (swept.closed || swept.expired) {
      console.log(`[admin/sessions] finalised ${swept.closed}, marked ${swept.expired} expired`);
    }
  } catch (err) {
    // A sweep failure must not take the console down with it.
    console.error("[admin/sessions] sweep failed", err);
  }

  const sessions = await listSessions();
  // Return summary rows (no model answers)
  const rows = sessions.map((s) => ({
    id: s.id,
    candidateName: s.candidate.name,
    employeeId: s.candidate.employeeId,
    location: s.candidate.location,
    role: s.candidate.role,
    assessmentType: s.assessmentType,
    status: s.status,
    startedAt: s.startedAt,
    completedAt: s.completedAt ?? null,
    questionsAnswered: Object.values(s.responses).filter((r) => r.transcript).length,
    overallScore: calcScore(s),
  }));
  return NextResponse.json(rows);
}

function calcScore(s: Awaited<ReturnType<typeof listSessions>>[0]): number | null {
  const scored = Object.values(s.responses).filter((r) => r.score != null);
  if (!scored.length) return null;
  const total = scored.reduce((sum, r) => sum + (r.score ?? 0), 0);
  return Math.round((total / (scored.length * 10)) * 100);
}
