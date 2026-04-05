import type {
  SessionResponse,
  FinalReport,
  CandidateInfo,
  AssessmentType,
  CompetencyScore,
} from "@/types";
import {
  SELLING_COMPETENCY_NAMES,
} from "@/prompts/sellingEvaluator";
import {
  TECHNICAL_COMPETENCY_NAMES,
} from "@/prompts/technicalEvaluator";

// Distribution used per assessment (for denominator in competency score %)
const SELLING_DIST: Record<string, number> = {
  C1: 2, C2: 4, C3: 3, C4: 2,
  C5: 3, C6: 3, C7: 1, C8: 2,
};
const TECHNICAL_DIST: Record<string, number> = {
  T1: 3, T2: 3, T3: 4, T4: 4,
  T5: 3, T6: 2, T7: 1,
};

// Red-flag triggers from skill files
const SELLING_RED_FLAGS = [
  "price-first selling",
  "weak collection discipline",
  "inability to handle conflict",
  "excessive dependence on plant/QC",
  "poor ownership",
  "tendency to over-promise",
];

const TECHNICAL_RED_FLAGS = [
  "weak understanding of slump/workability basics",
  "unsafe attitude toward water addition",
  "inability to distinguish fresh vs hardened concrete issues",
  "poor diagnosis of customer complaints",
  "failure to escalate serious technical matters",
];

function getReadiness(pct: number, type: AssessmentType): { recommendation: string; label: string } {
  if (type === "selling") {
    if (pct >= 75) return { recommendation: "Ready", label: "Can independently handle routine sales/customer-service situations with acceptable judgment." };
    if (pct >= 60) return { recommendation: "Ready with coaching", label: "Can manage most situations but needs structured coaching on negotiation, complaint control, or collections." };
    if (pct >= 45) return { recommendation: "Borderline", label: "Can talk well but lacks practical RMX handling depth or commercial firmness." };
    return { recommendation: "Not ready", label: "Likely to create customer-service or commercial risk without close supervision." };
  } else {
    if (pct >= 75) return { recommendation: "Technically ready for sales role", label: "Can handle routine customer technical discussions and first-level complaint handling correctly." };
    if (pct >= 60) return { recommendation: "Ready with coaching", label: "Can handle basic matters but needs coaching on diagnosis, escalation, or preventive guidance." };
    if (pct >= 45) return { recommendation: "Borderline", label: "Understands some terms, but practical technical handling is inconsistent." };
    return { recommendation: "Not ready", label: "Insufficient technical judgment for customer-facing RMX discussions." };
  }
}

export function generateReport(params: {
  sessionId: string;
  candidate: CandidateInfo;
  assessmentType: AssessmentType;
  completedAt: string;
  responses: SessionResponse[];
}): FinalReport {
  const { sessionId, candidate, assessmentType, completedAt, responses } =
    params;

  const names =
    assessmentType === "selling"
      ? SELLING_COMPETENCY_NAMES
      : TECHNICAL_COMPETENCY_NAMES;

  const dist =
    assessmentType === "selling" ? SELLING_DIST : TECHNICAL_DIST;

  // Compute competency-wise scores
  const compTotals: Record<string, { total: number; count: number }> = {};
  for (const r of responses) {
    if (!r.evaluation) continue;
    const primaryComp = r.competencies[0];
    if (!compTotals[primaryComp]) compTotals[primaryComp] = { total: 0, count: 0 };
    compTotals[primaryComp].total += r.evaluation.score;
    compTotals[primaryComp].count += 1;
  }

  const competencyScores: CompetencyScore[] = Object.entries(names).map(
    ([id, name]) => {
      const data = compTotals[id] ?? { total: 0, count: 0 };
      const maxPossible = (dist[id] ?? 1) * 5;
      const avgScore = data.count > 0 ? data.total / data.count : 0;
      const pct = maxPossible > 0 ? (data.total / maxPossible) * 100 : 0;
      return {
        id,
        name,
        questionsAnswered: data.count,
        totalScore: data.total,
        avgScore: Math.round(avgScore * 10) / 10,
        maxPossible,
        pct: Math.round(pct),
      };
    }
  );

  // Overall score
  const scoredResponses = responses.filter((r) => r.evaluation?.score);
  const totalScore = scoredResponses.reduce(
    (sum, r) => sum + (r.evaluation?.score ?? 0),
    0
  );
  const maxTotal = scoredResponses.length * 5;
  const overallScore =
    maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;
  const overallAvg =
    scoredResponses.length > 0
      ? Math.round((totalScore / scoredResponses.length) * 10) / 10
      : 0;

  // Top 3 strengths = highest avg competency scores
  const sorted = [...competencyScores]
    .filter((c) => c.questionsAnswered > 0)
    .sort((a, b) => b.avgScore - a.avgScore);

  const topStrengths = sorted.slice(0, 3).map(
    (c) => `${c.name} (avg ${c.avgScore}/5)`
  );

  // Development areas = lowest avg competency scores
  const developmentAreas = sorted
    .slice(-3)
    .reverse()
    .map((c) => `${c.name} (avg ${c.avgScore}/5)`);

  // Red flags: competencies with avg < 2.5 or score 1 responses
  const redFlagCompetencies = competencyScores
    .filter((c) => c.questionsAnswered > 0 && c.avgScore < 2.5)
    .map((c) => c.name);

  const hasScore1 = responses.some((r) => r.evaluation?.score === 1);
  const redFlags: string[] = [];

  if (redFlagCompetencies.length > 0) {
    redFlags.push(
      `Consistently weak in: ${redFlagCompetencies.join(", ")}`
    );
  }

  if (hasScore1) {
    const flagList =
      assessmentType === "selling" ? SELLING_RED_FLAGS : TECHNICAL_RED_FLAGS;
    redFlags.push(
      `One or more critically poor responses (score 1). Manager review recommended.`
    );
    // Add domain-specific flag hints based on which questions scored 1
    const score1Comps = responses
      .filter((r) => r.evaluation?.score === 1)
      .map((r) => names[r.competencies[0]] ?? r.competencies[0]);
    if (score1Comps.length > 0) {
      redFlags.push(
        `Critical failure in: ${Array.from(new Set(score1Comps)).join(", ")}`
      );
    }
    // Add generic domain flag if relevant
    if (assessmentType === "technical") {
      redFlags.push(flagList[1]); // unsafe water advice flag
    }
  }

  const { recommendation, label } = getReadiness(overallScore, assessmentType);

  return {
    sessionId,
    candidate,
    assessmentType,
    completedAt,
    responses,
    overallScore,
    overallAvg,
    competencyScores,
    topStrengths,
    developmentAreas,
    redFlags,
    readinessRecommendation: recommendation,
    readinessLabel: label,
  };
}
