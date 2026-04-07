import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/db";
import { evaluateBatch } from "@/lib/evaluator";
import type { EvalRequest } from "@/lib/evaluator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = (await req.json()) as {
      responses: { position: number; transcript: string }[];
    };
    const { responses: clientResponses } = body;

    if (!clientResponses || !Array.isArray(clientResponses) || clientResponses.length === 0) {
      return NextResponse.json(
        { error: "responses array is required" },
        { status: 400 }
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Build evaluation requests from stored questions + client transcripts
    const evalRequests: EvalRequest[] = [];
    const positionMap: Map<number, string> = new Map(); // position → transcript

    for (const cr of clientResponses) {
      const stub = session.responses[cr.position];
      if (!stub) continue;

      const transcript = (cr.transcript ?? "").trim();
      positionMap.set(cr.position, transcript);

      evalRequests.push({
        questionId: stub.questionId,
        questionText: stub.questionText,
        modelAnswer: stub.modelAnswer,
        competencies: stub.competencies,
        transcript: transcript || "(No response provided)",
        assessmentType: session.assessmentType,
      });
    }

    // Single batch AI call for all questions
    const evaluations = await evaluateBatch(evalRequests);

    // Update session with all evaluations
    const recordedAt = new Date().toISOString();
    for (let i = 0; i < clientResponses.length; i++) {
      const pos = clientResponses[i].position;
      const stub = session.responses[pos];
      if (!stub) continue;

      session.responses[pos] = {
        ...stub,
        transcript: positionMap.get(pos) ?? "",
        score: evaluations[i].score,
        evaluation: evaluations[i],
        recordedAt,
      };
    }

    session.status = "completed";
    session.completedAt = recordedAt;

    await updateSession(session);

    return NextResponse.json({ success: true, completedAt: recordedAt });
  } catch (err) {
    console.error("[POST /api/session/[id]/submit-all]", err);
    return NextResponse.json(
      { error: "Batch evaluation failed", details: String(err) },
      { status: 500 }
    );
  }
}
