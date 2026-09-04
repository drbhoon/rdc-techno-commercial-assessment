"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import VoiceRecorder from "@/components/VoiceRecorder";
import type { ClientQuestion } from "@/types";
import { withBase } from "@/lib/basePath";

type Stage = "loading" | "question" | "recorded" | "review" | "submitting" | "complete" | "error" | "timeup";

// Two hours, matching SESSION_WINDOW_MS on the server. The paper is a 50
// minute one; the rest is slack for losing signal and coming back, which is
// the whole point of being able to resume. The clock runs from the ORIGINAL
// start, so disconnecting cannot buy extra time.
const TOTAL_TIME = 2 * 60 * 60;

interface SessionData {
  sessionId: string;
  questions: ClientQuestion[];
  /** ISO start time from the server — the clock is anchored to this. */
  startedAt?: string;
  /** Answers already saved server-side, keyed by position. Present on a resume. */
  transcripts?: Record<number, string>;
}

const COMP_SHORT: Record<string, string> = {
  C1:"Customer Diagnosis", C2:"Service Recovery", C3:"Delivery Coord.",
  C4:"Value Selling",      C5:"Negotiation",      C6:"Commercial Acumen",
  C7:"Relationship Mgmt",  C8:"Ownership",
  T1:"RMX Fundamentals",   T2:"Site Diagnosis",   T3:"Fresh Concrete",
  T4:"Hardened Concrete",  T5:"Corrective Action",T6:"Risk Judgment",    T7:"Escalation",
};

function AssessmentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session") ?? "";

  const [stage, setStage] = useState<Stage>("loading");
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [position, setPosition] = useState(1);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  // Once the candidate has seen Review & Submit, jumping back to a question
  // must not strand them: without this, returning to Q3 from review meant
  // pressing through seventeen more questions to reach submit again.
  const [reachedReview, setReachedReview] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Store all transcripts keyed by position
  const transcriptsRef = useRef<Record<number, string>>({});

  // Load session and restore timer
  useEffect(() => {
    if (!sessionId) { setError("No session ID. Please start from the home page."); setStage("error"); return; }
    const stored = sessionStorage.getItem(`session_${sessionId}`);
    if (stored) {
      const data = JSON.parse(stored) as SessionData;
      setQuestions(data.questions);
      // The clock is anchored to the server's startedAt, not to a timestamp
      // this browser wrote. A candidate resuming on a different device has no
      // such timestamp, and the old code handed them a full timer again.
      const startedAt = data.startedAt ? Date.parse(data.startedAt) : NaN;
      const anchor = Number.isFinite(startedAt) ? startedAt : Date.now();
      setTimeLeft(Math.max(0, TOTAL_TIME - Math.floor((Date.now() - anchor) / 1000)));

      // Answers the server already holds win over whatever this browser has:
      // on a resume they ARE this browser's copy, and they are the only copy
      // that survived the disconnection.
      const savedTranscripts = sessionStorage.getItem(`transcripts_${sessionId}`);
      if (savedTranscripts) {
        transcriptsRef.current = JSON.parse(savedTranscripts) as Record<number, string>;
      }
      if (data.transcripts) {
        transcriptsRef.current = { ...transcriptsRef.current, ...data.transcripts };
        sessionStorage.setItem(`transcripts_${sessionId}`, JSON.stringify(transcriptsRef.current));
      }
      setStage("question");
    } else {
      setError("Session not found. Please start from the home page.");
      setStage("error");
    }
  }, [sessionId]);

  // Countdown timer
  useEffect(() => {
    if (stage === "loading" || stage === "error" || stage === "complete" || stage === "timeup") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage]);

  // Handle timer expiry
  useEffect(() => {
    if (timeLeft === 0 && stage !== "complete" && stage !== "timeup" && stage !== "error" && stage !== "submitting") {
      // Save current transcript if any
      if (transcript.trim()) {
        transcriptsRef.current[position] = transcript.trim();
      }
      // Auto-submit whatever we have
      handleFinalSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const currentQuestion = questions.find((q) => q.position === position);

  /**
   * Save one answer to the server as soon as it is captured.
   *
   * Answers used to travel only in this browser until the final submit, so a
   * dropped connection lost every one of them and "resume" could only ever
   * return the questions. Fire-and-forget on purpose: a failed save must not
   * block the candidate mid-paper, and the browser copy plus the final
   * submit-all remain as the fallback.
   */
  const persistAnswer = useCallback((pos: number, text: string) => {
    if (!sessionId || !text.trim()) return;
    void fetch(withBase(`/api/session/${sessionId}/submit`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: pos, transcript: text.trim() }),
    }).catch(() => { /* browser copy still holds it; submit-all will carry it */ });
  }, [sessionId]);

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text);
    if (stage === "question") setStage("recorded");
  }, [stage]);

  // Save transcript and go to next question
  const handleNext = useCallback(() => {
    if (transcript.trim()) {
      transcriptsRef.current[position] = transcript.trim();
      // Persist to sessionStorage
      sessionStorage.setItem(`transcripts_${sessionId}`, JSON.stringify(transcriptsRef.current));
      persistAnswer(position, transcript);
    }
    if (position >= 20) {
      setReachedReview(true);
      setStage("review");
    } else {
      setPosition((p) => p + 1);
      setTranscript("");
      setStage("question");
    }
  }, [position, transcript, sessionId, persistAnswer]);

  // Skip question (no answer)
  const handleSkip = useCallback(() => {
    if (position >= 20) {
      setReachedReview(true);
      setStage("review");
    } else {
      setPosition((p) => p + 1);
      setTranscript("");
      setStage("question");
    }
  }, [position]);

  // Move to any question, keeping whatever has been said so far.
  //
  // "Skip this question" is a small underlined link sitting directly under the
  // recorder, and a candidate who taps it by mistake had no way back: the only
  // controls moved forward. Reported by Dr Bhoon. Going back has to preserve
  // work in BOTH directions — the answer being left behind is saved on the way
  // out, and the answer at the destination is restored on the way in, so a
  // wrong turn costs nothing.
  const goToQuestion = useCallback((target: number) => {
    if (target < 1 || target > 20) return;
    if (transcript.trim()) {
      transcriptsRef.current[position] = transcript.trim();
      sessionStorage.setItem(`transcripts_${sessionId}`, JSON.stringify(transcriptsRef.current));
      persistAnswer(position, transcript);
    }
    const saved = transcriptsRef.current[target] ?? "";
    setPosition(target);
    setTranscript(saved);
    // A question already answered opens in "recorded", so its Save & Next
    // button is there and the existing answer is visible rather than looking
    // lost. An unanswered one opens ready to record.
    setStage(saved.trim() ? "recorded" : "question");
  }, [position, transcript, sessionId, persistAnswer]);

  // Final batch submission
  const handleFinalSubmit = useCallback(async () => {
    setStage("submitting");

    try {
      const responses = questions.map((q) => ({
        position: q.position,
        transcript: transcriptsRef.current[q.position] ?? "",
      }));

      const res = await fetch(withBase(`/api/session/${sessionId}/submit-all`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string; details?: string };
        throw new Error(data.details ?? data.error ?? "Evaluation failed");
      }

      setStage("complete");
    } catch (err) {
      setError(String(err));
      setStage("error");
    }
  }, [questions, sessionId]);

  // Count answered
  const answeredCount = Object.keys(transcriptsRef.current).filter(
    (k) => transcriptsRef.current[Number(k)]?.trim()
  ).length + (transcript.trim() && !transcriptsRef.current[position] ? 1 : 0);

  if (stage === "loading") return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <svg className="animate-spin w-8 h-8 text-[#1a3a6b]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm font-medium">Loading assessment…</span>
      </div>
    </div>
  );

  if (stage === "error") return (
    <div className="max-w-xl mx-auto bg-red-50 border-2 border-red-200 rounded-2xl p-7 text-red-700">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="font-bold text-base mb-1">Something went wrong</p>
      <p className="text-sm mb-4 text-red-600">{error}</p>
      <button onClick={() => router.push("/")} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
        Return to home
      </button>
    </div>
  );

  if (stage === "complete") return (
    <div className="max-w-xl mx-auto text-center space-y-8 py-20 animate-slide-up">
      <div className="w-28 h-28 gradient-navy rounded-full flex items-center justify-center text-6xl mx-auto shadow-xl">✅</div>
      <div>
        <h2 className="text-3xl font-black text-slate-800 mb-3">Thank You!</h2>
        <p className="text-lg text-slate-600 font-semibold">Your assessment has been successfully submitted.</p>
        <p className="text-slate-400 mt-2">Your responses are being evaluated by AI. Results will be available to your manager shortly.</p>
      </div>
      <div className="bg-slate-100 rounded-2xl p-6 text-sm text-slate-500">
        <p className="font-bold text-slate-700 mb-1">You may now close this window.</p>
        <p>If you have any questions, please contact your reporting manager.</p>
      </div>
    </div>
  );

  if (stage === "timeup") return (
    <div className="max-w-xl mx-auto text-center space-y-6 py-16 animate-slide-up">
      <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center text-5xl mx-auto shadow-xl">⏰</div>
      <div>
        <h2 className="text-3xl font-black text-red-700 mb-2">Time&apos;s Up!</h2>
        <p className="text-slate-500">The 50-minute assessment time has expired.</p>
        <p className="text-slate-400 text-sm mt-1">Your responses are being evaluated...</p>
      </div>
    </div>
  );

  if (stage === "submitting") return (
    <div className="max-w-xl mx-auto text-center space-y-6 py-16 animate-slide-up">
      <div className="w-24 h-24 gradient-navy rounded-full flex items-center justify-center mx-auto shadow-xl">
        <svg className="animate-spin w-12 h-12 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Submitting Your Assessment</h2>
        <p className="text-slate-500 text-sm">Saving your responses... Please wait a moment.</p>
      </div>
    </div>
  );

  // Review screen before final submit
  if (stage === "review") {
    const answered = questions.filter((q) => transcriptsRef.current[q.position]?.trim());
    const unanswered = questions.filter((q) => !transcriptsRef.current[q.position]?.trim());

    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-slide-up">
        <div className="gradient-navy rounded-2xl p-6 text-white shadow-card">
          <h2 className="text-2xl font-black mb-1">Review &amp; Submit</h2>
          <p className="text-blue-300 text-sm">
            You answered {answered.length} of 20 questions. Review below and submit for AI evaluation.
          </p>
        </div>

        {unanswered.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-amber-700 mb-1">⚠ {unanswered.length} questions unanswered</p>
            <p className="text-xs text-amber-600">
              Questions: {unanswered.map((q) => `Q${q.position}`).join(", ")}. Unanswered questions will receive a score of 1/10 — tap any question below to go back and answer it.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-card divide-y divide-slate-100">
          {questions.map((q) => {
            const t = transcriptsRef.current[q.position];
            return (
              // The whole row returns to that question. A single-step Back is
              // no use to somebody who skipped Q3 and noticed at Q15 — from
              // here any question is one tap away, right up until submission.
              <button
                key={q.position}
                type="button"
                onClick={() => goToQuestion(q.position)}
                className="w-full text-left px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  t?.trim() ? "gradient-navy text-white" : "bg-slate-200 text-slate-400"
                }`}>
                  {q.position}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 line-clamp-1">{q.text}</p>
                  {t?.trim() ? (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 italic">{t}</p>
                  ) : (
                    <p className="text-xs text-red-400 mt-0.5 italic">No response — tap to answer</p>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  t?.trim() ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"
                }`}>
                  {t?.trim() ? "✓" : "✗"}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleFinalSubmit}
          className="w-full py-4 gradient-navy text-white rounded-xl font-bold text-base shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          Submit Assessment for AI Evaluation →
        </button>
      </div>
    );
  }

  // Active question stage
  const pctDone = ((position - 1) / 20) * 100;
  const fmtTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const timerColor = timeLeft > 15 * 60 ? "text-green-400" : timeLeft > 5 * 60 ? "text-orange-400" : "text-red-400";
  const timerBg = timeLeft > 15 * 60 ? "bg-slate-900" : timeLeft > 5 * 60 ? "bg-orange-950" : "bg-red-950";

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* 50-minute assessment timer */}
      <div className={`${timerBg} rounded-2xl shadow-card px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-white text-xs font-bold uppercase tracking-wide">Time Remaining</span>
          {timeLeft <= 5 * 60 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"/>}
        </div>
        <span className={`font-mono font-black text-3xl ${timerColor}`}>
          {fmtTimer(timeLeft)}
        </span>
      </div>

      {/* Progress header */}
      <div className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-4">
        <div className="gradient-navy text-white rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wide whitespace-nowrap">
          Q {position} / 20
        </div>
        <div className="flex-1">
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="gradient-orange h-3 rounded-full transition-all duration-500"
              style={{ width: `${pctDone}%` }}
            />
          </div>
        </div>
        <div className="text-xs font-bold text-slate-400 whitespace-nowrap">
          {Math.round(pctDone)}% done
        </div>
      </div>

      {/* Question card */}
      {currentQuestion && (stage === "question" || stage === "recorded") && (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {/* Question header */}
          <div className="gradient-navy px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {currentQuestion.competencies.map((c) => (
                <span key={c} className="bg-white/15 text-white text-xs font-bold rounded-full px-2.5 py-0.5">
                  {c} · {COMP_SHORT[c] ?? c}
                </span>
              ))}
            </div>
            <span className="text-blue-300 text-xs font-medium ml-2 shrink-0">
              #{currentQuestion.id}
            </span>
          </div>

          {/* Question text */}
          <div className="px-6 py-6">
            <p className="text-slate-900 font-bold text-lg leading-snug mb-6">
              {currentQuestion.text}
            </p>

            <VoiceRecorder
              key={position}
              initialTranscript={transcriptsRef.current[position] ?? ""}
              onTranscript={handleTranscript}
            />

            {/* Action buttons */}
            {stage === "recorded" && transcript && (
              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleNext}
                  className="flex-1 py-4 gradient-navy text-white rounded-xl font-bold text-base shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {position < 20 ? `Save & Next Question →` : "Review & Submit →"}
                </button>
              </div>
            )}

            {/* Back / Skip. Back is always available from question 2 onward,
                including after an answer has been recorded — a mistaken Skip is
                just as likely to be noticed one question later as immediately.
                It is a proper button, not an underlined link, because the way
                OUT of a mistake should not be harder to hit than the way in. */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                onClick={() => goToQuestion(position - 1)}
                disabled={position <= 1}
                className="text-xs font-bold text-slate-600 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous question
              </button>
              <div className="flex items-center gap-4">
                {stage === "question" && (
                  <button
                    onClick={handleSkip}
                    className="text-xs text-slate-400 underline hover:text-slate-600 transition-colors"
                  >
                    Skip this question
                  </button>
                )}
                {reachedReview && (
                  <button
                    onClick={() => setStage("review")}
                    className="text-xs font-bold text-slate-600 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    Back to review →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssessmentPage() {
  return <Suspense><AssessmentContent /></Suspense>;
}
