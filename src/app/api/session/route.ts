import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createSession, findResumableSession, type StoredSession } from "@/lib/db";
import { assembleAssessment } from "@/lib/randomizer";
import { getBank } from "@/lib/questionBank";
import { resolveEmployee } from "@/lib/identity";
import type { AssessmentType, CandidateInfo } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      candidate: CandidateInfo;
      assessmentType: AssessmentType;
    };
    const { candidate, assessmentType } = body;

    if (!assessmentType) {
      return NextResponse.json({ error: "assessmentType is required" }, { status: 400 });
    }
    if (!candidate?.employeeId?.trim() || !candidate?.email?.trim()) {
      return NextResponse.json(
        { error: "Employee code and company e-mail are both required." },
        { status: 400 }
      );
    }

    // Resolved AGAIN here, server-side. The lookup the browser did is a
    // convenience for the candidate; this is the check. Name and location are
    // taken from the master, not from the request — a form field is not
    // evidence of who somebody is.
    const resolved = await resolveEmployee(candidate.employeeId, candidate.email);
    if (!resolved.ok) {
      if (resolved.reason === "not_found") {
        return NextResponse.json(
          {
            error:
              resolved.message
              ?? "That employee code and e-mail address are not on the employee master.",
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          error:
            "Could not reach the employee directory just now. Please try again in a minute.",
        },
        { status: 503 }
      );
    }

    const person = resolved.person;
    const identified: CandidateInfo = {
      ...candidate,
      name: person.full_name || candidate.name || "",
      employeeId: person.employee_code ?? candidate.employeeId,
      // The master's location is authoritative and better spelled than a
      // free-text value typed under time pressure.
      location: person.employment?.location || candidate.location || "",
      email: person.email ?? candidate.email,
      personId: person.person_id,
    };

    // Resume before creating. A candidate whose connection dropped comes back
    // through this same endpoint, and minting a second session gave them two
    // in-progress attempts and a timer restarted from full. The questions and
    // original startedAt are handed straight back, so they carry on where they
    // stopped with the clock still running from the first attempt.
    const existing = await findResumableSession(identified.employeeId, assessmentType);
    if (existing) {
      // Answers already saved come back too. They live only in the browser
      // until the final submit, so a candidate returning on another device — or
      // after clearing the tab — would otherwise get their questions back and
      // an empty form, which is not resuming in any sense that helps them.
      const transcripts: Record<number, string> = {};
      for (const response of Object.values(existing.responses ?? {})) {
        if (response?.transcript?.trim()) transcripts[response.position] = response.transcript;
      }
      return NextResponse.json({
        sessionId: existing.id,
        questions: existing.questions,
        startedAt: existing.startedAt,
        transcripts,
        resumed: true,
      });
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
      candidate: identified,
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
