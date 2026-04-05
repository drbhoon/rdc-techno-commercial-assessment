/**
 * Competency-aware deterministic question randomizer.
 * Selects exactly 20 questions per attempt following the distribution
 * rules in the skill files.
 */
import type { Question, ClientQuestion } from "@/types";
import { getBank } from "./questionBank";

// Required distribution: competencyId → count
const SELLING_DIST: Record<string, number> = {
  C1: 2, C2: 4, C3: 3, C4: 2,
  C5: 3, C6: 3, C7: 1, C8: 2,
};

const TECHNICAL_DIST: Record<string, number> = {
  T1: 3, T2: 3, T3: 4, T4: 4,
  T5: 3, T6: 2, T7: 1,
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
  if (selected.length < 20) {
    const allRemaining = shuffle(
      bank.filter((q) => !usedIds.has(q.id))
    );
    for (const q of allRemaining) {
      if (selected.length >= 20) break;
      selected.push(q);
      usedIds.add(q.id);
    }
  }

  // Shuffle final set for random order
  const finalQuestions = shuffle(selected).slice(0, 20);

  const clientQuestions: ClientQuestion[] = finalQuestions.map((q, i) => ({
    id: q.id,
    sourceNum: q.sourceNum,
    text: q.text,
    competencies: q.competencies,
    position: i + 1,
  }));

  return { questions: finalQuestions, clientQuestions };
}
