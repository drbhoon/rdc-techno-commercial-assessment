/**
 * Closing attempts nobody closed.
 *
 * The paper is submitted by the browser: the candidate presses Submit, or the
 * on-screen timer hits zero and submits for them. Both need the tab to still be
 * open. A power cut, a closed laptop or simply walking away therefore left the
 * attempt "in progress" for ever — answers saved, scored, and unreachable,
 * because the console only offers a report once an attempt is submitted. That
 * is exactly what happened to the attempts HR could not open.
 *
 * So the server closes them itself. Once an attempt is past its window it can
 * no longer be resumed, which means nothing more is coming: whatever was saved
 * is the answer paper, and it is evaluated and published as it stands.
 *
 * An attempt with nothing saved is marked `expired` rather than completed —
 * there is no paper to publish, and calling it complete would put an empty
 * report in front of a manager.
 */
import { evaluateBatch, type EvalRequest } from "./evaluator";
import {
  SESSION_WINDOW_MS,
  getSession,
  listStaleSessions,
  updateSession,
  type StoredSession,
} from "./db";

export function windowExpired(session: StoredSession, now = Date.now()): boolean {
  const startedAt = Date.parse(session.startedAt);
  if (!Number.isFinite(startedAt)) return true;
  return now - startedAt > SESSION_WINDOW_MS;
}

export function answeredCount(session: StoredSession): number {
  return Object.values(session.responses ?? {}).filter((r) => r?.transcript?.trim()).length;
}

/**
 * Close one attempt: score anything still unscored, then publish it.
 *
 * Answers are normally evaluated as they are saved, so most of the work is
 * already done and this only fills the gaps — but an evaluation can fail (a
 * dropped API call mid-paper), and a report with holes in it is worse than one
 * that waited a few seconds longer.
 */
export async function finaliseSession(sessionId: string): Promise<{
  status: StoredSession["status"];
  answered: number;
  evaluated: number;
}> {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.status === "completed" || session.status === "submitted") {
    return { status: session.status, answered: answeredCount(session), evaluated: 0 };
  }

  const answered = answeredCount(session);
  if (answered === 0) {
    session.status = "expired";
    session.completedAt = session.completedAt ?? new Date().toISOString();
    await updateSession(session);
    return { status: "expired", answered: 0, evaluated: 0 };
  }

  const pending = Object.values(session.responses)
    .filter((r) => r.transcript?.trim() && !r.evaluation)
    .sort((a, b) => a.position - b.position);

  let evaluated = 0;
  if (pending.length) {
    const requests: EvalRequest[] = pending.map((r) => ({
      questionId: r.questionId,
      questionText: r.questionText,
      modelAnswer: r.modelAnswer,
      competencies: r.competencies,
      transcript: r.transcript!.trim(),
      assessmentType: session.assessmentType,
    }));
    const evaluations = await evaluateBatch(requests);
    // Re-read: answers may have been saved while the evaluation ran.
    const fresh = (await getSession(sessionId)) ?? session;
    pending.forEach((r, i) => {
      const target = fresh.responses[r.position];
      if (!target) return;
      fresh.responses[r.position] = { ...target, score: evaluations[i].score, evaluation: evaluations[i] };
    });
    fresh.status = "completed";
    fresh.completedAt = fresh.completedAt ?? new Date().toISOString();
    await updateSession(fresh);
    evaluated = pending.length;
    return { status: "completed", answered: answeredCount(fresh), evaluated };
  }

  session.status = "completed";
  session.completedAt = session.completedAt ?? new Date().toISOString();
  await updateSession(session);
  return { status: "completed", answered, evaluated };
}

/**
 * Close every attempt whose window has passed. Called when the console loads,
 * so HR never has to know this exists: an attempt that can no longer be
 * resumed has either become a report or been marked expired by the time they
 * look at the list.
 */
export async function finaliseExpiredSessions(): Promise<{ closed: number; expired: number }> {
  const stale = await listStaleSessions();
  let closed = 0;
  let expired = 0;
  for (const session of stale) {
    if (!windowExpired(session)) continue;
    try {
      const result = await finaliseSession(session.id);
      if (result.status === "expired") expired += 1;
      else closed += 1;
    } catch (err) {
      console.error(`[finalise] ${session.id}:`, err);
    }
  }
  return { closed, expired };
}
