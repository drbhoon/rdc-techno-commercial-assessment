"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function InstructionsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session") ?? "";
  const type = (params.get("type") ?? "selling") as "selling" | "technical";
  const isSelling = type === "selling";

  const steps = [
    { n: "01", icon: "📋", title: "20 Questions", body: "You will answer 20 questions drawn from a randomised pool, covering all key competency areas." },
    { n: "02", icon: "🎤", title: "Voice-first answering", body: "Press the mic button and speak your answer. A text-input fallback is available if needed." },
    { n: "03", icon: "⏱️", title: "30–75 seconds per answer", body: "Aim for concise, practical answers. Quality and judgment matter more than speaking duration." },
    { n: "04", icon: "🔁", title: "One re-record allowed", body: "You may re-record your answer once before submitting. After that, you must submit." },
    { n: "05", icon: "🗣️", title: "English, Hindi, or Hinglish", body: "Speak in whichever language you are most comfortable. Grammar is not scored." },
    { n: "06", icon: "🤖", title: "Instant AI evaluation", body: "Each answer is scored 1–5 immediately with detailed feedback before you move to the next question." },
  ];

  const domainTip = isSelling
    ? { icon: "💡", color: "bg-amber-50 border-amber-300 text-amber-900",
        body: "Focus on real RMX situations — delivery coordination, customer complaint handling, billing discipline, and collections. Generic textbook answers will not score high." }
    : { icon: "⚗️", color: "bg-blue-50 border-blue-300 text-blue-900",
        body: "Focus on site-practical technical handling — identifying likely causes, safe first-level guidance, and correct escalation to QC. Recommending uncontrolled water addition will be penalised." };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-slide-up">
      {/* Header card */}
      <div className="gradient-navy rounded-2xl p-7 text-white shadow-card">
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-3 ${isSelling ? "bg-orange-500/30 text-orange-200" : "bg-blue-500/30 text-blue-200"}`}>
          {isSelling ? "💼 Selling Skill Assessment" : "🔬 Technical Skill Assessment"}
        </div>
        <h1 className="text-2xl font-black mb-1">Read before you begin</h1>
        <p className="text-blue-300 text-sm">Take 60 seconds to understand the format.</p>
      </div>

      {/* Steps */}
      <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
        {steps.map((s) => (
          <div key={s.n} className="flex gap-4">
            <div className="shrink-0 w-10 h-10 gradient-navy rounded-xl flex items-center justify-center text-xs font-black text-white">
              {s.n}
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm mb-0.5">
                {s.icon} {s.title}
              </div>
              <div className="text-slate-500 text-sm leading-relaxed">{s.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Domain tip */}
      <div className={`border-2 rounded-2xl p-5 ${domainTip.color}`}>
        <div className="font-bold text-sm mb-1">{domainTip.icon} Domain tip</div>
        <p className="text-sm leading-relaxed">{domainTip.body}</p>
      </div>

      {/* Warning */}
      <div className="bg-slate-800 text-white rounded-2xl p-5 flex gap-4">
        <div className="text-2xl shrink-0">🎙️</div>
        <div>
          <div className="font-bold text-sm mb-1">Before you begin</div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Make sure you are in a quiet environment with a working microphone (Chrome or Edge browser required for voice). Once started, the assessment runs straight through to completion.
          </p>
        </div>
      </div>

      <button
        onClick={() => router.push(`/assessment?session=${sessionId}&type=${type}`)}
        className="w-full py-4 gradient-orange text-white rounded-xl font-bold text-base shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
      >
        I understand — Begin Assessment
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
}

export default function InstructionsPage() {
  return <Suspense><InstructionsContent /></Suspense>;
}
