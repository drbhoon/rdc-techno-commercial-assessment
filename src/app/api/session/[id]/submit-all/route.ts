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

    // ── Step 1: Save all transcripts immediately ─────────────────────────────
    const recordedAt = new Date().toISOString();
    const evalRequests: EvalRequest[] = [];

    for (const cr of clientResponses) {
      const stub = session.responses[cr.position];
      if (!stub) continue;

      const transcript = (cr.transcript ?? "").trim();
      session.responses[cr.position] = {
        ...stub,
        transcript,
        recordedAt,
      };

      evalRequests.push({
        questionId: stub.questionId,
        questionText: stub.questionText,
        modelAnswer: stub.modelAnswer,
        competencies: stub.competencies,
        transcript: transcript || "(No response provided)",
        assessmentType: session.assessmentType,
      });
    }

    session.status = "submitted";
    session.completedAt = recordedAt;
    await updateSession(session);

    // ── Step 2: Fire AI evaluation in background (don't await) ───────────────
    // Railway runs a persistent Node server, so this background promise
    // continues after the HTTP response is sent to the client.
    runBackgroundEvaluation(sessionId, evalRequests).catch((err) => {
      console.error(`[Background eval failed for ${sessionId}]`, err);
    });

    // ── Return immediately — candidate sees "Thank you" right away ───────────
    return NextResponse.json({ success: true, completedAt: recordedAt });
  } catch (err) {
    console.error("[POST /api/session/[id]/submit-all]", err);
    return NextResponse.json(
      { error: "Submission failed", details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * Runs batch AI evaluation in the background.
 * Updates the session from "submitted" to "completed" when done.
 */
async function runBackgroundEvaluation(
  sessionId: string,
  evalRequests: EvalRequest[]
): Promise<void> {
  console.log(`[Background eval] Starting for session ${sessionId} (${evalRequests.length} questions)`);

  const evaluations = await evaluateBatch(evalRequests);

  // Reload session (may have been updated since we saved transcripts)
  const session = await getSession(sessionId);
  if (!session) {
    console.error(`[Background eval] Session ${sessionId} not found`);
    return;
  }

  // Apply evaluations
  for (let i = 0; i < evalRequests.length; i++) {
    const req = evalRequests[i];
    // Find the position by matching questionId
    const pos = Object.values(session.responses).find(
      (r) => r.questionId === req.questionId
    );
    if (pos) {
      session.responses[pos.position] = {
        ...session.responses[pos.position],
        score: evaluations[i].score,
        evaluation: evaluations[i],
      };
    }
  }

  session.status = "completed";
  await updateSession(session);

  console.log(`[Background eval] Completed for session ${sessionId}`);
}
