"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AssessmentType, CandidateInfo } from "@/types";
import { withBase } from "@/lib/basePath";

/**
 * `?type=selling` / `?type=technical` fixes the module, so HR can hand out one
 * link per assessment instead of one link and a verbal instruction about which
 * tile to pick. The picker is then shown as a locked, single tile rather than
 * hidden entirely, so the candidate can still see which paper they are sitting.
 *
 * Plain /techno with no parameter keeps the two-tile chooser exactly as it was,
 * so links already circulating keep working.
 */
function assessmentTypeFromParam(value: string | null): AssessmentType | null {
  return value === "selling" || value === "technical" ? value : null;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedType = assessmentTypeFromParam(searchParams.get("type"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CandidateInfo & { assessmentType: AssessmentType }>({
    name: "",
    employeeId: "",
    location: "",
    role: "",
    email: "",
    assessmentType: lockedType ?? "selling",
  });

  // Identity confirmed by the lookup. Cleared whenever the code or e-mail is
  // edited, so a candidate cannot confirm as one person and then start as
  // another by changing a field afterwards.
  const [identity, setIdentity] = useState<{
    employee_code: string | null;
    full_name: string;
    designation: string | null;
    location: string | null;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setError("");
    if (name === "employeeId" || name === "email") setIdentity(null);
  };

  const handleVerify = async () => {
    if (!form.employeeId.trim() || !form.email?.trim()) {
      setError("Employee code and company e-mail are both required.");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(withBase("/api/identity/lookup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_code: form.employeeId.trim(),
          email: form.email.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string } & Record<string, never>;
      if (!res.ok) throw new Error(data.error ?? "Could not confirm those details.");
      setIdentity(data as never);
    } catch (err) {
      setIdentity(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity) { setError("Please confirm your details first."); return; }
    setLoading(true);
    try {
      const res = await fetch(withBase("/api/session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            // Name and location are sent for continuity only — the server
            // takes both from the employee master and ignores these.
            name: identity.full_name,
            employeeId: form.employeeId.trim(),
            location: identity.location ?? "",
            role: identity.designation ?? form.role.trim(),
            email: form.email!.trim(),
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Employee Code <span className="text-red-500">*</span>
                </label>
                <input
                  name="employeeId"
                  value={form.employeeId}
                  onChange={handleChange}
                  placeholder="e.g. A00388"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Company E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={handleChange}
                  placeholder="name@rdc.in"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Shown before the assessment starts so a mistyped code is caught
                here rather than discovered later in somebody else's report. */}
            {identity ? (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                <div className="font-bold text-slate-800">
                  {identity.full_name}
                  {identity.employee_code ? ` · ${identity.employee_code}` : ""}
                </div>
                {identity.designation && (
                  <div className="text-slate-600">{identity.designation}</div>
                )}
                {identity.location && <div className="text-slate-600">{identity.location}</div>}
                <div className="mt-1 text-xs text-slate-500">
                  Not you? Correct the employee code or e-mail above.
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="w-full rounded-xl border-2 border-blue-500 px-4 py-3 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50"
              >
                {verifying ? "Checking…" : "Confirm My Details"}
              </button>
            )}
            <p className="text-xs text-slate-500">
              Your name, designation and location come from the employee master, so
              they appear on the report exactly as HR holds them.
            </p>
          </div>
        </div>

        {/* Assessment type */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            {lockedType ? "Assessment Module" : "Select Assessment Module"}
          </label>
          <div className={lockedType ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
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
            ] as const).filter((opt) => !lockedType || opt.value === lockedType).map((opt) => (
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

      {/* The way BACK to the console. This app is two pages with no navigation
          between them: the portal tile lands HR on the dashboard, and until now
          neither page mentioned the other, so whichever door you came through
          was a dead end. Kept small and plain — a candidate has no use for it,
          and the console is gated anyway. */}
      <p className="text-center">
        <a
          href={withBase("/admin")}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-4 transition-colors"
        >
          Admin console — view past assessments and reports
        </a>
      </p>
    </div>
  );
}

export default function HomePage() {
  // useSearchParams needs a Suspense boundary, or the whole route is forced
  // into client-side rendering at build time.
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
