"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import VoiceRecorder from "@/components/VoiceRecorder";
import ScoreCard from "@/components/ScoreCard";
import type { ClientQuestion, EvaluationResult } from "@/types";

type Stage = "loading" | "question" | "recorded" | "submitting" | "evaluated" | "complete" | "error";

interface SessionData { sessionId: string; questions: ClientQuestion[] }

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
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) { setError("No session ID. Please start from the home page."); setStage("error"); return; }
    const stored = sessionStorage.getItem(`session_${sessionId}`);
    if (stored) {
      const data = JSON.parse(stored) as SessionData;
      setQuestions(data.questions);
      setStage("question");
    } else {
      setError("Session not found. Please start from the home page.");
      setStage("error");
    }
  }, [sessionId]);

  const currentQuestion = questions.find((q) => q.position === position);

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text); setStage("recorded");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!transcript.trim() || !currentQuestion) return;
    setStage("submitting");
    try {
      const res = await fetch(`/api/session/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, transcript: transcript.trim() }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string; details?: string };
        throw new Error(data.details ?? data.error ?? "Evaluation failed");
      }
      const data = await res.json() as { evaluation: EvaluationResult };
      setEvaluation(data.evaluation);
      setStage("evaluated");
    } catch (err) {
      setError(String(err)); setStage("error");
    }
  }, [transcript, currentQuestion, sessionId, position]);

  const handleNext = useCallback(() => {
    if (position >= 20) { setStage("complete"); }
    else { setPosition((p) => p + 1); setTranscript(""); setEvaluation(null); setStage("question"); }
  }, [position]);

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
    <div className="max-w-xl mx-auto text-center space-y-6 py-16 animate-slide-up">
      <div className="w-24 h-24 gradient-navy rounded-full flex items-center justify-center text-5xl mx-auto shadow-xl">✅</div>
      <div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">Assessment Complete!</h2>
        <p className="text-slate-500">All 20 questions answered. Your AI-evaluated report is ready.</p>
      </div>
      <button
        onClick={() => router.push(`/report/${sessionId}`)}
        className="px-10 py-4 gradient-navy text-white rounded-xl font-bold text-base shadow-lg hover:opacity-90 transition-all"
      >
        View Full Report →
      </button>
    </div>
  );

  const pctDone = ((position - 1) / 20) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
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
      {currentQuestion && (stage === "question" || stage === "recorded" || stage === "submitting") && (
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

            {stage !== "submitting" && (
              <VoiceRecorder onTranscript={handleTranscript} maxRecords={2} />
            )}

            {stage === "recorded" && transcript && (
              <div className="mt-5">
                <button
                  onClick={handleSubmit}
                  className="w-full py-4 gradient-navy text-white rounded-xl font-bold text-base shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  Submit &amp; Evaluate →
                </button>
              </div>
            )}

            {stage === "submitting" && (
              <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
                <svg className="animate-spin w-6 h-6 text-[#1a3a6b]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span className="font-semibold">AI is evaluating your response…</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evaluation result */}
      {stage === "evaluated" && evaluation && currentQuestion && (
        <>
          <ScoreCard evaluation={evaluation} questionText={currentQuestion.text} transcript={transcript} position={position} />
          <button
            onClick={handleNext}
            className="w-full py-4 gradient-orange text-white rounded-xl font-bold text-base shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            {position < 20 ? `Next Question (${position + 1} of 20) →` : "View Final Report →"}
          </button>
        </>
      )}
    </div>
  );
}

export default function AssessmentPage() {
  return <Suspense><AssessmentContent /></Suspense>;
}
