/**
 * AI evaluation layer — batch mode: single API call for all 20 questions.
 * Current default: Anthropic Claude.
 */
import type { EvaluationResult } from "@/types";
import { buildSellingEvalPrompt } from "@/prompts/sellingEvaluator";
import { buildTechnicalEvalPrompt } from "@/prompts/technicalEvaluator";

export interface EvalRequest {
  questionId: string;
  questionText: string;
  modelAnswer: string;
  competencies: string[];
  transcript: string;
  assessmentType: "selling" | "technical";
}

// ── Anthropic client ─────────────────────────────────────────────────────────
async function callAnthropic(prompt: string, maxTokens: number): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Strip markdown code fences if present
  return text.replace(/^```[a-z]*\n?/m, "").replace(/```$/m, "").trim();
}

function parseResult(raw: Record<string, unknown>, questionId: string, competencies: string[]): EvaluationResult {
  const score = Math.round(Number(raw.score));
  if (!score || score < 1 || score > 10) {
    throw new Error(`Invalid score from AI: ${raw.score}`);
  }
  return {
    questionId,
    competencies,
    score,
    whyThisScore: String(raw.whyThisScore ?? ""),
    whatWasGood: String(raw.whatWasGood ?? ""),
    whatWasMissing: String(raw.whatWasMissing ?? ""),
    managerCoachingNote: String(raw.managerCoachingNote ?? ""),
  };
}

/**
 * Evaluate a single response (kept for backward compatibility if needed).
 */
export async function evaluateResponse(req: EvalRequest): Promise<EvaluationResult> {
  const buildPrompt =
    req.assessmentType === "selling"
      ? buildSellingEvalPrompt
      : buildTechnicalEvalPrompt;

  const prompt = buildPrompt({
    questionId: req.questionId,
    questionText: req.questionText,
    modelAnswer: req.modelAnswer,
    competencies: req.competencies,
    transcript: req.transcript,
  });

  const raw = JSON.parse(await callAnthropic(prompt, 1024)) as Record<string, unknown>;
  return parseResult(raw, req.questionId, req.competencies);
}

/**
 * Batch evaluate all responses in a single API call.
 * Sends all 20 Q&A pairs to AI and gets back 20 evaluations.
 */
export async function evaluateBatch(
  requests: EvalRequest[]
): Promise<EvaluationResult[]> {
  if (requests.length === 0) return [];

  const assessmentType = requests[0].assessmentType;
  const buildPrompt =
    assessmentType === "selling"
      ? buildSellingEvalPrompt
      : buildTechnicalEvalPrompt;

  // Build the per-question scoring rubric from one sample prompt
  // to extract the framework, then create a combined batch prompt
  const samplePrompt = buildPrompt({
    questionId: "SAMPLE",
    questionText: "SAMPLE",
    modelAnswer: "SAMPLE",
    competencies: requests[0].competencies,
    transcript: "SAMPLE",
  });

  // Extract everything from "## Transcript Normalization" onward as the shared framework
  const frameworkStart = samplePrompt.indexOf("## Transcript Normalization");
  const framework = frameworkStart >= 0
    ? samplePrompt.slice(frameworkStart)
    : samplePrompt.slice(samplePrompt.indexOf("## Scoring Framework"));

  // Remove the per-question output format from framework (we'll add our own)
  const frameworkClean = framework
    .replace(/## Output Format[\s\S]*$/, "")
    .trim();

  // Build batch prompt
  const questionsBlock = requests.map((r, i) => {
    return `### Question ${i + 1} (ID: ${r.questionId}, Competencies: ${r.competencies.join(", ")})
**Question:** ${r.questionText}

**Model Answer (reference):** ${r.modelAnswer}

**Candidate's Transcript:** ${r.transcript || "(No response provided)"}`;
  }).join("\n\n---\n\n");

  const batchPrompt = `You are evaluating a sales professional's responses in the RDC Ready-Mix Concrete (RMX) Techno-Commercial Assessment — ${assessmentType === "selling" ? "Selling Skill" : "Technical Skill"} module.

The candidate may have answered in English, Hindi, or Hinglish. Evaluate technical meaning and practical judgment, not grammar.

${frameworkClean}

## QUESTIONS TO EVALUATE (${requests.length} total)

${questionsBlock}

## Output Format
Respond with ONLY a valid JSON ARRAY of ${requests.length} objects — no markdown, no prose, no code fences.
Each object must have this exact structure:
[
  {
    "questionIndex": 0,
    "score": <integer 1-10>,
    "whyThisScore": "<2-3 sentence explanation>",
    "whatWasGood": "<specific strengths>",
    "whatWasMissing": "<key gaps or errors>",
    "managerCoachingNote": "<1-2 actionable coaching suggestions>"
  },
  ...
]

CRITICAL SCORING RULES:
- The scale is 1–10, NOT 1–5. You MUST use the FULL 1–10 range.
- A competent professional who gives a correct, practical answer = score 7 or 8.
- A correct answer covering most key points with good judgment = score 8.
- Only truly exceptional, textbook-perfect answers = score 9 or 10.
- A basic but correct answer missing depth = score 5 or 6.
- Vague, generic, or significantly incomplete = score 3 or 4.
- Wrong, unsafe, or no response = score 1 or 2.
- Do NOT cluster all scores in the 3–5 range. Spread scores across the full 1–10 spectrum.
- Return exactly ${requests.length} objects, one per question, in order (questionIndex 0 to ${requests.length - 1}).
- If a candidate provided no response, score 1.
- Output ONLY the JSON array — no other text.`;

  const rawText = await callAnthropic(batchPrompt, 8192);

  // Parse JSON array
  let parsed: Record<string, unknown>[];
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>[];
  } catch {
    // Try to extract JSON array from response
    const match = rawText.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]) as Record<string, unknown>[];
    } else {
      throw new Error("Failed to parse batch evaluation response as JSON array");
    }
  }

  if (!Array.isArray(parsed) || parsed.length !== requests.length) {
    throw new Error(
      `Expected ${requests.length} evaluations, got ${Array.isArray(parsed) ? parsed.length : "non-array"}`
    );
  }

  return parsed.map((raw, i) =>
    parseResult(raw, requests[i].questionId, requests[i].competencies)
  );
}
