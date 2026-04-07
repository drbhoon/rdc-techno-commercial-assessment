export type AssessmentType = "selling" | "technical";

export interface CandidateInfo {
  name: string;
  employeeId: string;
  location: string;
  role: string;
}

export interface Question {
  id: string;           // e.g. "S001", "T023"
  sourceNum: number;    // original Excel row number
  text: string;
  modelAnswer: string;
  competencies: string[]; // primary first, e.g. ["C2","C3"]
  assessmentType: AssessmentType;
}

// Sent to client — no modelAnswer
export interface ClientQuestion {
  id: string;
  sourceNum: number;
  text: string;
  competencies: string[];
  position: number; // 1–20
}

export interface EvaluationResult {
  questionId: string;
  competencies: string[];
  score: number; // 1–10
  whyThisScore: string;
  whatWasGood: string;
  whatWasMissing: string;
  managerCoachingNote: string;
}

export interface SessionResponse {
  position: number;
  questionId: string;
  questionText: string;
  competencies: string[];
  transcript: string;
  evaluation: EvaluationResult | null;
  recordedAt: string;
}

export interface Session {
  id: string;
  candidate: CandidateInfo;
  assessmentType: AssessmentType;
  questions: ClientQuestion[];
  startedAt: string;
  completedAt: string | null;
  status: "in_progress" | "completed";
}

export interface CompetencyScore {
  id: string;
  name: string;
  questionsAnswered: number;
  totalScore: number;
  avgScore: number;
  maxPossible: number;
  pct: number;
}

export interface FinalReport {
  sessionId: string;
  candidate: CandidateInfo;
  assessmentType: AssessmentType;
  completedAt: string;
  responses: SessionResponse[];
  overallScore: number;       // 0–100 %
  overallAvg: number;         // avg score 1–10
  totalPoints: number;        // sum of all scores (max 200)
  maxPoints: number;          // max possible (questions * 10)
  competencyScores: CompetencyScore[];
  topStrengths: string[];
  developmentAreas: string[];
  redFlags: string[];
  readinessRecommendation: string; // "Ready" | "Ready with coaching" | "Borderline" | "Not ready"
  readinessLabel: string;
}
