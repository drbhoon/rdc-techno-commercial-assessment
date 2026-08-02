"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@/lib/basePath";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSso, setCheckingSso] = useState(true);

  // On the HR platform nginx has already verified this person against the HR
  // allowlist, so a second password would be pointless friction. The marker
  // below stands in for the password on subsequent API calls; the server
  // ignores it and trusts X-Auth-Email instead.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(withBase("/api/admin/me"));
        if (res.ok) {
          const { email } = (await res.json()) as { email: string | null };
          if (email && !cancelled) {
            sessionStorage.setItem("adminPassword", "hr-sso");
            router.replace("/admin/dashboard");
            return;
          }
        }
      } catch { /* fall through to the password form */ }
      if (!cancelled) setCheckingSso(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(withBase("/api/admin/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        sessionStorage.setItem("adminPassword", password);
        router.push("/admin/dashboard");
      } else {
        setError("Incorrect password. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Avoid flashing the password form while the SSO check is in flight.
  if (checkingSso) {
    return <div className="min-h-[70vh] flex items-center justify-center text-slate-400">Checking sign-in…</div>;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="gradient-navy rounded-2xl p-8 text-white shadow-card mb-5 text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-black mb-1">Admin Console</h1>
          <p className="text-blue-300 text-sm">RDC Techno-Commercial Assessment</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-card p-7 space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Enter admin password"
              autoFocus
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 gradient-navy text-white rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Verifying…
              </>
            ) : (
              "Enter Admin Console →"
            )}
          </button>

          <p className="text-center text-xs text-slate-400">
            <a href={withBase("/")} className="underline hover:text-slate-600">← Back to assessment</a>
          </p>
        </form>
      </div>
    </div>
  );
}
