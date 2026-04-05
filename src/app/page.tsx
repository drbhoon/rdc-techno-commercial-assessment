"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AssessmentType, CandidateInfo } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CandidateInfo & { assessmentType: AssessmentType }>({
    name: "",
    employeeId: "",
    location: "",
    role: "",
    assessmentType: "selling",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Candidate name is required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            name: form.name.trim(),
            employeeId: form.employeeId.trim(),
            location: form.location.trim(),
            role: form.role.trim(),
          },
          assessmentType: form.assessmentType,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to start session");
      }
      const data = await res.json() as { sessionId: string; questions: unknown[] };
      sessionStorage.setItem(`session_${data.sessionId}`, JSON.stringify(data));
      router.push(`/instructions?session=${data.sessionId}&type=${form.assessmentType}`);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      {/* Hero */}
      <div className="gradient-navy rounded-2xl p-8 text-white shadow-card">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs font-semibold mb-4 uppercase tracking-wider">
          🎯 Sales Force Evaluation
        </div>
        <h1 className="text-3xl font-black mb-2 leading-tight">
          Techno-Commercial<br />Assessment
        </h1>
        <p className="text-blue-200 text-sm leading-relaxed">
          Voice-based evaluation for RDC sales professionals. 20 questions,
          AI-evaluated, competency-mapped results.
        </p>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-card p-7 space-y-6"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Candidate Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter candidate's full name"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Employee ID
                </label>
                <input
                  name="employeeId"
                  value={form.employeeId}
                  onChange={handleChange}
                  placeholder="EMP-001"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Location
                </label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="City / Plant"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Role / Designation
              </label>
              <input
                name="role"
                value={form.role}
                onChange={handleChange}
                placeholder="e.g. Sales Executive, Area Manager"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Assessment type */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            Select Assessment Module
          </label>
          <div className="grid grid-cols-2 gap-3">
            {([
              {
                value: "selling" as AssessmentType,
                emoji: "💼",
                label: "Selling Skill",
                desc: "107-question pool",
                tags: ["Customer handling", "Negotiation", "Collections"],
              },
              {
                value: "technical" as AssessmentType,
                emoji: "🔬",
                label: "Technical Skill",
                desc: "48-question pool",
                tags: ["Concrete defects", "Site diagnosis", "QC escalation"],
              },
            ] as const).map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  form.assessmentType === opt.value
                    ? "border-[#1a3a6b] bg-blue-50 shadow-md"
                    : "border-slate-200 hover:border-blue-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="assessmentType"
                  value={opt.value}
                  checked={form.assessmentType === opt.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="text-3xl mb-2">{opt.emoji}</div>
                <div className="font-bold text-slate-800 text-sm mb-0.5">{opt.label}</div>
                <div className="text-xs text-slate-400 font-medium mb-2">{opt.desc} • 20 questions</div>
                <div className="flex flex-wrap gap-1">
                  {opt.tags.map((t) => (
                    <span key={t} className="text-xs bg-slate-100 text-slate-500 rounded-md px-2 py-0.5 font-medium">
                      {t}
                    </span>
                  ))}
                </div>
                {form.assessmentType === opt.value && (
                  <div className="mt-2 flex items-center gap-1 text-xs font-bold text-[#1a3a6b]">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Selected
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 gradient-orange text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Creating session…
            </>
          ) : (
            <>
              Start Assessment
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Info strip */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: "🎤", label: "Voice-first", sub: "Speak naturally" },
          { icon: "🤖", label: "AI-evaluated", sub: "Claude-powered" },
          { icon: "📊", label: "Instant report", sub: "Competency scores" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl py-3 px-2 shadow-card">
            <div className="text-xl mb-1">{item.icon}</div>
            <div className="text-xs font-bold text-slate-700">{item.label}</div>
            <div className="text-xs text-slate-400">{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
