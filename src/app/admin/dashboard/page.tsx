"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { FinalReport } from "@/types";

interface SessionRow {
  id: string;
  candidateName: string;
  employeeId: string;
  location: string;
  role: string;
  assessmentType: "selling" | "technical";
  status: "in_progress" | "completed";
  startedAt: string;
  completedAt: string | null;
  questionsAnswered: number;
  overallScore: number | null;
}

const SCORE_COLOR = (s: number | null) => {
  if (s === null) return "text-slate-400";
  if (s >= 75) return "text-green-600";
  if (s >= 60) return "text-blue-600";
  if (s >= 45) return "text-amber-600";
  return "text-red-600";
};

const BADGE = (status: string) =>
  status === "completed"
    ? "bg-green-100 text-green-700 border border-green-200"
    : "bg-amber-100 text-amber-700 border border-amber-200";

export default function AdminDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress">("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [adminPwd, setAdminPwd] = useState("");

  useEffect(() => {
    const pwd = sessionStorage.getItem("adminPassword");
    if (!pwd) { router.push("/admin"); return; }
    setAdminPwd(pwd);
    fetchSessions(pwd);
  }, [router]);

  const fetchSessions = async (pwd: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sessions", {
        headers: { "x-admin-password": pwd },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json() as SessionRow[];
      // Sort newest first
      setSessions(data.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
    } catch {
      setError("Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/sessions/${id}`, {
        method: "DELETE",
        headers: { "x-admin-password": adminPwd },
      });
      setSessions((s) => s.filter((r) => r.id !== id));
    } catch {
      alert("Delete failed.");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  }, [adminPwd]);

  const handleDownloadPDF = useCallback(async (id: string, name: string, type: string) => {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/report/${id}`);
      const report = await res.json() as FinalReport;
      await generatePDF(report);
    } catch (e) {
      alert("PDF generation failed: " + String(e));
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const filtered = sessions.filter((s) => {
    const matchStatus = filter === "all" || s.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.candidateName.toLowerCase().includes(q) ||
      s.employeeId.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: sessions.length,
    completed: sessions.filter((s) => s.status === "completed").length,
    inProgress: sessions.filter((s) => s.status === "in_progress").length,
    avgScore: (() => {
      const scored = sessions.filter((s) => s.overallScore !== null);
      if (!scored.length) return null;
      return Math.round(scored.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / scored.length);
    })(),
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <svg className="animate-spin w-8 h-8 text-[#1a3a6b]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="font-semibold text-sm">Loading admin console…</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="gradient-navy rounded-2xl p-6 text-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-2">
              🔐 Admin Console
            </div>
            <h1 className="text-2xl font-black">Assessment Dashboard</h1>
            <p className="text-blue-300 text-sm mt-0.5">All sessions — RDC Techno-Commercial Assessment</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchSessions(adminPwd)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all"
            >
              ↻ Refresh
            </button>
            <button
              onClick={() => { sessionStorage.removeItem("adminPassword"); router.push("/admin"); }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl text-sm font-bold transition-all"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Assessments", value: stats.total, icon: "📋", color: "text-slate-800" },
          { label: "Completed", value: stats.completed, icon: "✅", color: "text-green-600" },
          { label: "In Progress", value: stats.inProgress, icon: "⏳", color: "text-amber-600" },
          { label: "Avg Score", value: stats.avgScore !== null ? `${stats.avgScore}%` : "—", icon: "📊", color: SCORE_COLOR(stats.avgScore) },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl shadow-card p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters & search */}
      <div className="bg-white rounded-2xl shadow-card p-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, location…"
          className="flex-1 min-w-[200px] border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
        />
        <div className="flex gap-2">
          {(["all", "completed", "in_progress"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? "gradient-navy text-white shadow-md"
                  : "border-2 border-slate-200 text-slate-500 hover:border-blue-300"
              }`}
            >
              {f === "all" ? "All" : f === "completed" ? "✅ Completed" : "⏳ In Progress"}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 font-medium ml-auto">{filtered.length} records</span>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">⚠ {error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold">No assessments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Employee ID", "Name", "Location", "Role", "Type", "Date", "Q Done", "Score", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {s.employeeId || "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                      {s.candidateName}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{s.location || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap max-w-[140px] truncate">{s.role || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${
                        s.assessmentType === "selling"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {s.assessmentType === "selling" ? "💼 Selling" : "🔬 Technical"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      <div>{new Date(s.startedAt).toLocaleDateString("en-IN")}</div>
                      <div className="text-slate-400">{new Date(s.startedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-slate-700">{s.questionsAnswered}</span>
                      <span className="text-slate-400">/20</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-lg font-black ${SCORE_COLOR(s.overallScore)}`}>
                        {s.overallScore !== null ? `${s.overallScore}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${BADGE(s.status)}`}>
                        {s.status === "completed" ? "✅ Complete" : "⏳ In Progress"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* View report */}
                        <a
                          href={`/report/${s.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                          title="View report"
                        >
                          👁 View
                        </a>

                        {/* Download PDF */}
                        {s.status === "completed" && (
                          <button
                            onClick={() => handleDownloadPDF(s.id, s.candidateName, s.assessmentType)}
                            disabled={downloadingId === s.id}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            title="Download PDF"
                          >
                            {downloadingId === s.id ? (
                              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                            ) : "⬇ PDF"}
                          </button>
                        )}

                        {/* Delete */}
                        {confirmDelete === s.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(s.id)}
                              disabled={deletingId === s.id}
                              className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                            >
                              {deletingId === s.id ? "…" : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(s.id)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors"
                            title="Delete assessment"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PDF generation using jsPDF ─────────────────────────────────────────────────
async function generatePDF(report: FinalReport) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, M = 15, CW = W - M * 2;
  let y = M;

  const navy = [15, 35, 71] as const;
  const orange = [232, 84, 26] as const;
  const white = [255, 255, 255] as const;
  const light = [241, 245, 249] as const;

  const newPage = () => { doc.addPage(); y = M; };
  const checkY = (h: number) => { if (y + h > 280) newPage(); };

  // ── Header bar ──
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(...white);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("RDC Concrete", M, 11);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Techno-Commercial Assessment Report", M, 18);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, W - M, 18, { align: "right" });
  y = 36;

  // ── Candidate info box ──
  doc.setFillColor(...light);
  doc.roundedRect(M, y, CW, 28, 3, 3, "F");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text(report.candidate.name, M + 5, y + 8);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  const infoLine = [report.candidate.role, report.candidate.location, `ID: ${report.candidate.employeeId || "—"}`].filter(Boolean).join("  ·  ");
  doc.text(infoLine, M + 5, y + 15);
  doc.text(`${report.assessmentType === "selling" ? "Selling Skill" : "Technical Skill"} Assessment  ·  ${new Date(report.completedAt).toLocaleString("en-IN")}`, M + 5, y + 22);
  y += 34;

  // ── Score summary row ──
  const scoreColor = report.overallScore >= 75 ? [34, 197, 94] : report.overallScore >= 60 ? [59, 130, 246] : report.overallScore >= 45 ? [245, 158, 11] : [239, 68, 68];
  const boxes = [
    { label: "Overall Score", value: `${report.overallScore}%`, color: scoreColor },
    { label: "Avg per Question", value: `${report.overallAvg}/5`, color: navy },
    { label: "Readiness", value: report.readinessRecommendation, color: orange },
  ];
  const bw = CW / 3 - 3;
  boxes.forEach((b, i) => {
    const bx = M + i * (bw + 4.5);
    doc.setFillColor(...(b.color as [number, number, number]));
    doc.roundedRect(bx, y, bw, 20, 3, 3, "F");
    doc.setTextColor(...white);
    doc.setFontSize(b.label === "Readiness" ? 7 : 16); doc.setFont("helvetica", "bold");
    doc.text(b.value, bx + bw / 2, y + (b.label === "Readiness" ? 10 : 12), { align: "center" });
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text(b.label, bx + bw / 2, y + 17, { align: "center" });
  });
  y += 26;

  // ── Competency scores table ──
  doc.setTextColor(...navy);
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Competency Breakdown", M, y); y += 5;

  report.competencyScores.forEach((c) => {
    checkY(10);
    doc.setFillColor(...light);
    doc.rect(M, y, CW, 8, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text(`${c.id}`, M + 2, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.text(c.name, M + 10, y + 5.5);
    // Score bar background
    const barX = M + CW - 55, barW = 40;
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(barX, y + 2, barW, 4, 1, 1, "F");
    const fc = c.pct >= 75 ? [34, 197, 94] : c.pct >= 60 ? [59, 130, 246] : c.pct >= 45 ? [245, 158, 11] : [239, 68, 68];
    doc.setFillColor(...(fc as [number, number, number]));
    doc.roundedRect(barX, y + 2, Math.max(1, (barW * c.pct) / 100), 4, 1, 1, "F");
    doc.setTextColor(80, 80, 80);
    doc.text(`${c.avgScore}/5 (${c.pct}%)`, W - M - 2, y + 5.5, { align: "right" });
    y += 9;
  });
  y += 4;

  // ── Strengths / Development / Red flags ──
  checkY(40);
  const colW = (CW - 6) / 3;
  const sections = [
    { title: "Top Strengths", items: report.topStrengths, color: [34, 197, 94] as const },
    { title: "Development Areas", items: report.developmentAreas, color: [245, 158, 11] as const },
    { title: "Red Flags", items: report.redFlags.length ? report.redFlags : ["None identified"], color: [239, 68, 68] as const },
  ];
  sections.forEach((sec, i) => {
    const sx = M + i * (colW + 3);
    doc.setFillColor(sec.color[0], sec.color[1], sec.color[2]);
    doc.rect(sx, y, colW, 6, "F");
    doc.setTextColor(...white);
    doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text(sec.title, sx + 2, y + 4.2);
    let sy = y + 8;
    sec.items.slice(0, 4).forEach((item) => {
      doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
      const lines = doc.splitTextToSize(`• ${item}`, colW - 3);
      lines.forEach((ln: string) => { doc.text(ln, sx + 2, sy); sy += 4; });
    });
  });
  y += 50;

  // ── Per-question detail ──
  newPage();
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 12, "F");
  doc.setTextColor(...white);
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Question-by-Question Detail", M, 8.5);
  y = 18;

  const SCORE_LABELS: Record<number, string> = { 5: "Strong", 4: "Good", 3: "Acceptable", 2: "Weak", 1: "Poor" };
  const SCORE_COL: Record<number, readonly [number,number,number]> = {
    5: [34,197,94], 4: [59,130,246], 3: [245,158,11], 2: [249,115,22], 1: [239,68,68]
  };

  report.responses.forEach((r) => {
    if (!r.evaluation) return;
    const ev = r.evaluation;
    const blockH = 52;
    checkY(blockH);

    // Question header
    doc.setFillColor(...(SCORE_COL[ev.score] ?? [150,150,150]));
    doc.rect(M, y, CW, 8, "F");
    doc.setTextColor(...white);
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(`Q${r.position}  ${r.competencies.join(", ")}`, M + 2, y + 5.5);
    doc.text(`Score ${ev.score}/5 — ${SCORE_LABELS[ev.score] ?? ""}`, W - M - 2, y + 5.5, { align: "right" });
    y += 9;

    // Question text
    doc.setFillColor(...light);
    doc.rect(M, y, CW, 1, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    const qLines = doc.splitTextToSize(r.questionText, CW - 4);
    qLines.forEach((ln: string) => { checkY(5); doc.text(ln, M + 2, y + 4); y += 4.5; });

    // Evaluation fields
    const fields = [
      { label: "Why this score", text: ev.whyThisScore },
      { label: "What was good", text: ev.whatWasGood },
      { label: "What was missing", text: ev.whatWasMissing },
      { label: "Manager coaching note", text: ev.managerCoachingNote },
    ];
    fields.forEach((f) => {
      checkY(12);
      doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(80, 80, 80);
      doc.text(f.label.toUpperCase(), M + 2, y + 4);
      doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(f.text || "—", CW - 4);
      y += 5;
      lines.slice(0, 3).forEach((ln: string) => {
        checkY(4); doc.text(ln, M + 2, y + 3); y += 4;
      });
    });

    // Transcript
    if (r.transcript) {
      checkY(10);
      doc.setFontSize(6.5); doc.setFont("helvetica", "italic"); doc.setTextColor(120, 120, 120);
      const tLines = doc.splitTextToSize(`Transcript: "${r.transcript.slice(0, 200)}${r.transcript.length > 200 ? "…" : ""}"`, CW - 4);
      tLines.slice(0, 2).forEach((ln: string) => { checkY(4); doc.text(ln, M + 2, y + 3); y += 4; });
    }

    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(M, y, M + CW, y);
    y += 4;
  });

  // Footer on last page
  doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 150);
  doc.text("RDC Concrete India Ltd — Confidential Assessment Report", W / 2, 290, { align: "center" });

  const fileName = `RDC-${report.assessmentType}-${report.candidate.name.replace(/\s+/g, "_")}-${new Date(report.completedAt).toLocaleDateString("en-IN").replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}
