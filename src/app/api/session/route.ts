import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createSession, type StoredSession } from "@/lib/db";
import { assembleAssessment } from "@/lib/randomizer";
import { getBank } from "@/lib/questionBank";
import type { AssessmentType, CandidateInfo } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      candidate: CandidateInfo;
      assessmentType: AssessmentType;
    };
    const { candidate, assessmentType } = body;

    if (!candidate?.name || !assessmentType) {
      return NextResponse.json(
        { error: "candidate.name and assessmentType are required" },
        { status: 400 }
      );
    }

    const { questions: fullQuestions, clientQuestions } =
      assembleAssessment(assessmentType);

    const sessionId = uuidv4();
    const startedAt = new Date().toISOString();

    const bank = getBank(assessmentType);
    const bankMap = new Map(bank.map((q) => [q.id, q]));

    const responses: StoredSession["responses"] = {};
    for (const cq of clientQuestions) {
      const fullQ = bankMap.get(cq.id);
      if (!fullQ) continue;
      responses[cq.position] = {
        id: uuidv4(),
        sessionId,
        position: cq.position,
        questionId: cq.id,
        questionText: cq.text,
        modelAnswer: fullQ.modelAnswer,
        competencies: cq.competencies,
      };
    }

    const session: StoredSession = {
      id: sessionId,
      candidate,
      assessmentType,
      questions: clientQuestions,
      startedAt,
      status: "in_progress",
      responses,
    };

    await createSession(session);

    return NextResponse.json({ sessionId, questions: clientQuestions, startedAt });
  } catch (err) {
    console.error("[POST /api/session]", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
