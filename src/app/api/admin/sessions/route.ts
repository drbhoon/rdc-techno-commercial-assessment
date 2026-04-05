import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin@rdc2026";

function checkAuth(req: NextRequest): boolean {
  return req.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  return Math.round((total / (scored.length * 5)) * 100);
}
