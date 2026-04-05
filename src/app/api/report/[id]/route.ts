import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/db";
import { generateReport } from "@/lib/reportGenerator";
import type { SessionResponse } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const responses: SessionResponse[] = Object.values(session.responses)
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        position: r.position,
        questionId: r.questionId,
        questionText: r.questionText,
        competencies: r.competencies,
        transcript: r.transcript ?? "",
        evaluation: r.evaluation ?? null,
        recordedAt: r.recordedAt ?? "",
      }));

    const report = generateReport({
      sessionId,
      candidate: session.candidate,
      assessmentType: session.assessmentType,
      completedAt: session.completedAt ?? new Date().toISOString(),
      responses,
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("[GET /api/report/[id]]", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
