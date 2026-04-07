"use client";
import type { EvaluationResult } from "@/types";

function getTheme(score: number) {
  if (score >= 9) return { bar: "bg-green-500",  bg: "bg-green-50",  border: "border-green-400", badge: "bg-green-500 text-white",  label: "Exceptional", icon: "🌟" };
  if (score >= 7) return { bar: "bg-blue-500",   bg: "bg-blue-50",   border: "border-blue-400",  badge: "bg-blue-500 text-white",   label: "Strong",      icon: "✅" };
  if (score >= 5) return { bar: "bg-yellow-500", bg: "bg-yellow-50", border: "border-yellow-400",badge: "bg-yellow-500 text-white", label: "Acceptable",  icon: "🟡" };
  if (score >= 3) return { bar: "bg-orange-500", bg: "bg-orange-50", border: "border-orange-400",badge: "bg-orange-500 text-white", label: "Weak",        icon: "⚠️" };
  return { bar: "bg-red-600",    bg: "bg-red-50",    border: "border-red-500",   badge: "bg-red-600 text-white",    label: "Poor",        icon: "🔴" };
}

interface Props {
  evaluation: EvaluationResult;
  questionText: string;
  transcript: string;
  position: number;
}

export default function ScoreCard({ evaluation, questionText, transcript, position }: Props) {
  const theme = getTheme(evaluation.score);
  const pct = (evaluation.score / 10) * 100;

  return (
    <div className={`rounded-2xl border-2 shadow-card overflow-hidden animate-slide-up ${theme.bg} ${theme.border}`}>
      {/* Score header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{theme.icon}</span>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Question {position} Result
            </div>
            <div className="font-black text-slate-800 text-base leading-tight">
              {theme.label}
            </div>
          </div>
        </div>

        {/* Big score */}
        <div className={`flex items-baseline gap-1 rounded-2xl px-4 py-2 ${theme.badge} shadow-md animate-score-pop`}>
          <span className="text-4xl font-black">{evaluation.score}</span>
          <span className="text-lg font-bold opacity-75">/10</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="px-5 pb-4">
        <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full transition-all duration-700 ${theme.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Evaluation details */}
      <div className="px-5 pb-5 space-y-3">
        {/* Why */}
        <div className="bg-white/70 rounded-xl p-3.5">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-1">Why this score</p>
          <p className="text-sm text-slate-700 leading-relaxed">{evaluation.whyThisScore}</p>
        </div>

        {/* Good / Missing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-green-100 border border-green-200 rounded-xl p-3.5">
            <p className="text-xs font-black text-green-700 uppercase tracking-wide mb-1">✓ What was good</p>
            <p className="text-sm text-green-900 leading-relaxed">{evaluation.whatWasGood}</p>
          </div>
          <div className="bg-orange-100 border border-orange-200 rounded-xl p-3.5">
            <p className="text-xs font-black text-orange-700 uppercase tracking-wide mb-1">↗ What was missing</p>
            <p className="text-sm text-orange-900 leading-relaxed">{evaluation.whatWasMissing}</p>
          </div>
        </div>

        {/* Coaching note */}
        <div className="bg-[#0f2347]/5 border border-[#1a3a6b]/20 rounded-xl p-3.5">
          <p className="text-xs font-black text-[#1a3a6b] uppercase tracking-wide mb-1">🎯 Manager coaching note</p>
          <p className="text-sm text-slate-700 leading-relaxed">{evaluation.managerCoachingNote}</p>
        </div>

        {/* Collapsible transcript */}
        <details className="group">
          <summary className="cursor-pointer text-xs text-slate-400 font-semibold hover:text-slate-600 list-none flex items-center gap-1">
            <svg className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
            Show question &amp; transcript
          </summary>
          <div className="mt-2 space-y-2 pl-4 border-l-2 border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-400">Question: </span>
              <span className="text-xs text-slate-600">{questionText}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400">Your answer: </span>
              <span className="text-xs text-slate-600 italic">{transcript || "(no transcript)"}</span>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
