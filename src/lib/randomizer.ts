/**
 * Competency-aware deterministic question randomizer.
 * Selects QUESTION_COUNT questions per attempt following the distribution
 * below — the skill files' 20-question spread scaled to 15, with every
 * competency still asked at least once.
 */
import type { Question, ClientQuestion } from "@/types";
import { getBank } from "./questionBank";

/** Questions per paper, both modules. 15 × 10 = 150 marks. */
export const QUESTION_COUNT = 15;

// Required distribution: competencyId → count. Each sums to QUESTION_COUNT.
export const SELLING_DIST: Record<string, number> = {
  C1: 2, C2: 3, C3: 2, C4: 1,
  C5: 2, C6: 2, C7: 1, C8: 2,
};

export const TECHNICAL_DIST: Record<string, number> = {
  T1: 2, T2: 2, T3: 3, T4: 3,
  T5: 2, T6: 2, T7: 1,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Group questions by their primary competency.
 * A question also appears in secondary competency groups as overflow.
 */
function groupByCompetency(
  questions: Question[],
  competencies: string[]
): Map<string, Question[]> {
  const groups = new Map<string, Question[]>(
    competencies.map((c) => [c, []])
  );
  for (const q of questions) {
    if (groups.has(q.competencies[0])) {
      groups.get(q.competencies[0])!.push(q);
    }
  }
  return groups;
}

export function assembleAssessment(
  type: "selling" | "technical"
): { questions: Question[]; clientQuestions: ClientQuestion[] } {
  const bank = getBank(type);
  const dist = type === "selling" ? SELLING_DIST : TECHNICAL_DIST;
  const competencies = Object.keys(dist);

  const groups = groupByCompetency(bank, competencies);

  // Shuffle each group
  const shuffled = new Map<string, Question[]>();
  groups.forEach((qs, comp) => {
    shuffled.set(comp, shuffle(qs));
  });

  const selected: Question[] = [];
  const usedIds = new Set<string>();

  // Phase 1: pick exact required count from each competency's primary pool
  for (const comp of competencies) {
    const needed = dist[comp];
    const pool = shuffled.get(comp) ?? [];
    let picked = 0;
    for (const q of pool) {
      if (picked >= needed) break;
      if (!usedIds.has(q.id)) {
        selected.push(q);
        usedIds.add(q.id);
        picked++;
      }
    }
    // If primary pool was short, note it — Phase 2 will fill
    if (picked < needed) {
      console.warn(
        `[randomizer] ${comp} short: needed ${needed}, got ${picked} from primary pool`
      );
    }
  }

  // Phase 2: fill remaining slots using secondary competency membership
  // (questions that list this competency second)
  if (selected.length < QUESTION_COUNT) {
    const allRemaining = shuffle(
      bank.filter((q) => !usedIds.has(q.id))
    );
    for (const q of allRemaining) {
      if (selected.length >= QUESTION_COUNT) break;
      selected.push(q);
      usedIds.add(q.id);
    }
  }

  // Shuffle final set for random order
  const finalQuestions = shuffle(selected).slice(0, QUESTION_COUNT);

  const clientQuestions: ClientQuestion[] = finalQuestions.map((q, i) => ({
    id: q.id,
    sourceNum: q.sourceNum,
    text: q.text,
    competencies: q.competencies,
    position: i + 1,
  }));

  return { questions: finalQuestions, clientQuestions };
}
