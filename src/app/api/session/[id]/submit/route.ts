import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/db";
import { evaluateResponse } from "@/lib/evaluator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = (await req.json()) as { position: number; transcript: string };
    const { position, transcript } = body;

    if (!position || !transcript?.trim()) {
      return NextResponse.json(
        { error: "position and transcript are required" },
        { status: 400 }
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const responseStub = session.responses[position];
    if (!responseStub) {
      return NextResponse.json(
        { error: "Question not found in session" },
        { status: 404 }
      );
    }

    const evaluation = await evaluateResponse({
      questionId: responseStub.questionId,
      questionText: responseStub.questionText,
      modelAnswer: responseStub.modelAnswer,
      competencies: responseStub.competencies,
      transcript: transcript.trim(),
      assessmentType: session.assessmentType,
    });

    const recordedAt = new Date().toISOString();

    session.responses[position] = {
      ...responseStub,
      transcript: transcript.trim(),
      score: evaluation.score,
      evaluation,
      recordedAt,
    };

    if (position === 20) {
      session.status = "completed";
      session.completedAt = recordedAt;
    }

    await updateSession(session);

    return NextResponse.json({ evaluation, recordedAt });
  } catch (err) {
    console.error("[POST /api/session/[id]/submit]", err);
    return NextResponse.json(
      { error: "Evaluation failed", details: String(err) },
      { status: 500 }
    );
  }
}
