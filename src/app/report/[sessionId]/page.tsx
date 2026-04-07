"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ScoreCard from "@/components/ScoreCard";
import type { FinalReport } from "@/types";

const READINESS: Record<string, { bg: string; text: string; icon: string }> = {
  "Ready":                        { bg: "gradient-navy",  text: "text-white", icon: "🏆" },
  "Technically ready for sales role": { bg: "gradient-navy", text: "text-white", icon: "🏆" },
  "Ready with coaching":          { bg: "bg-blue-600",    text: "text-white", icon: "📈" },
  "Borderline":                   { bg: "bg-amber-500",   text: "text-white", icon: "⚖️" },
  "Not ready":                    { bg: "bg-red-600",     text: "text-white", icon: "🔴" },
};

const BAR_COLOR = (pct: number) =>
  pct >= 75 ? "bg-green-500" : pct >= 60 ? "bg-blue-500" : pct >= 45 ? "bg-amber-500" : "bg-red-500";

const SCORE_RING_COLOR = (s: number) =>
  s >= 75 ? "#22c55e" : s >= 60 ? "#3b82f6" : s >= 45 ? "#f59e0b" : "#ef4444";

function ScoreRing({ score }: { score: number }) {
  const r = 52, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = SCORE_RING_COLOR(score);
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease-in-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-slate-800">{score}%</span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Overall</span>
      </div>
    </div>
  );
}

export default function ReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const [report, setReport] = useState<FinalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    params.then(({ sessionId: sid }) => {
      setSessionId(sid);
      fetch(`/api/report/${sid}`)
        .then((r) => r.json())
        .then((data: FinalReport | { error?: string }) => {
          if ("error" in data) throw new Error(data.error);
          setReport(data as FinalReport);
        })
        .catch((e: unknown) => setError(String(e)))
        .finally(() => setLoading(false));
    });
  }, [params]);

  const exportJSON = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RDC-${report.assessmentType}-${report.candidate.name.replace(/\s+/g,"_")}-${sessionId.slice(0,8)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }, [report, sessionId]);

  const exportCSV = useCallback(() => {
    if (!report) return;
    const rows = [
      ["Q#","Question ID","Competency","Score","Transcript (first 100 chars)","What was good","What was missing"],
      ...report.responses.map((r) => [
        r.position, r.questionId, r.competencies[0],
        r.evaluation?.score ?? "",
        (r.transcript ?? "").slice(0, 100),
        r.evaluation?.whatWasGood ?? "",
        r.evaluation?.whatWasMissing ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RDC-${report.assessmentType}-${report.candidate.name.replace(/\s+/g,"_")}-${sessionId.slice(0,8)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [report, sessionId]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <svg className="animate-spin w-8 h-8 text-[#1a3a6b]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm font-semibold">Generating your report…</span>
      </div>
    </div>
  );

  if (error || !report) return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-7 text-red-700">
      <p className="font-bold text-base mb-1">Failed to load report</p>
      <p className="text-sm mb-4">{error}</p>
      <button onClick={() => router.push("/")} className="underline text-sm font-semibold">Return home</button>
    </div>
  );

  const readinessTheme = READINESS[report.readinessRecommendation] ?? READINESS["Borderline"];

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Top bar */}
      <div className="bg-white rounded-2xl shadow-card p-5 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-800">Assessment Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {report.candidate.name}
              {report.candidate.role && ` · ${report.candidate.role}`}
              {report.candidate.location && ` · ${report.candidate.location}`}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {report.assessmentType === "selling" ? "💼 Selling Skill" : "🔬 Technical Skill"} ·{" "}
              {new Date(report.completedAt).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">🖨 Print</button>
            <button onClick={exportJSON} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">⬇ JSON</button>
            <button onClick={exportCSV}  className="px-3 py-2 border-2 border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">⬇ CSV</button>
            <button onClick={() => router.push("/")} className="px-4 py-2 gradient-navy text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all">+ New Assessment</button>
          </div>
        </div>
      </div>

      {/* Score + readiness row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score ring */}
        <div className="bg-white rounded-2xl shadow-card p-6 flex flex-col items-center justify-center gap-2">
          <ScoreRing score={report.overallScore} />
          <p className="text-xs font-bold text-slate-400 text-center">
            {report.totalPoints ?? "—"}/{report.maxPoints ?? "—"} points · Avg {report.overallAvg}/10
          </p>
        </div>

        {/* Readiness verdict */}
        <div className={`md:col-span-2 rounded-2xl shadow-card p-6 flex flex-col justify-center ${readinessTheme.bg} ${readinessTheme.text}`}>
          <div className="text-4xl mb-3">{readinessTheme.icon}</div>
          <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Readiness Verdict</div>
          <div className="text-2xl font-black mb-2">{report.readinessRecommendation}</div>
          <p className="text-sm opacity-80 leading-relaxed">{report.readinessLabel}</p>
        </div>
      </div>

      {/* Competency scores */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h2 className="text-base font-black text-slate-800 mb-5">Competency Breakdown</h2>
        <div className="space-y-4">
          {report.competencyScores.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-400 bg-slate-100 rounded-md px-2 py-0.5">{c.id}</span>
                  <span className="text-sm font-bold text-slate-700">{c.name}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-xs text-slate-400 font-medium">{c.avgScore}/10</span>
                  <span className={`text-xs font-black rounded-full px-2.5 py-0.5 ${
                    c.pct >= 75 ? "bg-green-100 text-green-700" :
                    c.pct >= 60 ? "bg-blue-100 text-blue-700" :
                    c.pct >= 45 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                  }`}>{c.pct}%</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-2.5 rounded-full transition-all duration-700 ${BAR_COLOR(c.pct)}`} style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths / Development / Red flags */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
          <h3 className="font-black text-green-800 text-sm mb-3">🏅 Top Strengths</h3>
          <ul className="space-y-2">
            {report.topStrengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-green-800">
                <span className="font-black text-green-500 shrink-0">✓</span><span>{s}</span>
              </li>
            ))}
            {!report.topStrengths.length && <li className="text-xs text-green-500 italic">None identified</li>}
          </ul>
        </div>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
          <h3 className="font-black text-amber-800 text-sm mb-3">📈 Development Areas</h3>
          <ul className="space-y-2">
            {report.developmentAreas.map((d, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-800">
                <span className="font-black text-amber-500 shrink-0">↗</span><span>{d}</span>
              </li>
            ))}
            {!report.developmentAreas.length && <li className="text-xs text-amber-500 italic">None identified</li>}
          </ul>
        </div>
        <div className={`border-2 rounded-2xl p-5 ${report.redFlags.length ? "bg-red-50 border-red-300" : "bg-slate-50 border-slate-200"}`}>
          <h3 className={`font-black text-sm mb-3 ${report.redFlags.length ? "text-red-800" : "text-slate-600"}`}>
            {report.redFlags.length ? "⚠️ Red Flags" : "✅ Red Flags"}
          </h3>
          {report.redFlags.length ? (
            <ul className="space-y-2">
              {report.redFlags.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-red-800">
                  <span className="shrink-0">⚠</span><span>{f}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">No red flags identified.</p>
          )}
        </div>
      </div>

      {/* Question-by-question */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-slate-800">Question-by-Question Detail</h2>
          <button onClick={() => setShowAll((s) => !s)} className="text-xs font-bold text-[#1a3a6b] underline">
            {showAll ? "Collapse all" : "Expand all"}
          </button>
        </div>

        {showAll ? (
          <div className="space-y-4">
            {report.responses.map((r) =>
              r.evaluation ? (
                <ScoreCard key={r.position} evaluation={r.evaluation} questionText={r.questionText} transcript={r.transcript} position={r.position} />
              ) : (
                <div key={r.position} className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-sm text-slate-400 italic">
                  Q{r.position} — Not submitted
                </div>
              )
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card divide-y divide-slate-100">
            {report.responses.map((r) => {
              const s = r.evaluation?.score ?? 0;
              const color = s >= 7 ? "text-green-600" : s >= 5 ? "text-amber-600" : s > 0 ? "text-red-600" : "text-slate-400";
              return (
                <details key={r.position} className="group">
                  <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors list-none">
                    <span className="w-7 h-7 gradient-navy text-white rounded-lg flex items-center justify-center text-xs font-black shrink-0">
                      {r.position}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-700 line-clamp-1">{r.questionText}</span>
                    <span className={`font-black text-base ${color} shrink-0`}>
                      {s ? `${s}/10` : "—"}
                    </span>
                    <svg className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </summary>
                  <div className="px-5 pb-5 pt-1">
                    {r.evaluation ? (
                      <ScoreCard evaluation={r.evaluation} questionText={r.questionText} transcript={r.transcript} position={r.position} />
                    ) : (
                      <p className="text-sm text-slate-400 italic">Not submitted</p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
