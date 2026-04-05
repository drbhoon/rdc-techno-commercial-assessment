/**
 * AI evaluation layer — swappable between Anthropic / OpenAI / Gemini.
 * Current default: Anthropic Claude.
 * To swap providers: change AI_PROVIDER in .env.local and uncomment the relevant client below.
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
async function evaluateWithAnthropic(prompt: string): Promise<Record<string, unknown>> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Strip markdown code fences if present
  const clean = text.replace(/^```[a-z]*\n?/m, "").replace(/```$/m, "").trim();
  return JSON.parse(clean) as Record<string, unknown>;
}

// ── OpenAI client stub ────────────────────────────────────────────────────────
// async function evaluateWithOpenAI(prompt: string): Promise<Record<string, unknown>> {
//   const OpenAI = (await import("openai")).default;
//   const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//   const res = await client.chat.completions.create({
//     model: process.env.OPENAI_MODEL ?? "gpt-4o",
//     messages: [{ role: "user", content: prompt }],
//     response_format: { type: "json_object" },
//   });
//   return JSON.parse(res.choices[0].message.content ?? "{}");
// }

// ── Gemini client stub ────────────────────────────────────────────────────────
// async function evaluateWithGemini(prompt: string): Promise<Record<string, unknown>> {
//   const { GoogleGenerativeAI } = await import("@google/generative-ai");
//   const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
//   const model = client.getGenerativeModel({ model: "gemini-1.5-pro" });
//   const result = await model.generateContent(prompt);
//   return JSON.parse(result.response.text());
// }

function parseResult(raw: Record<string, unknown>, questionId: string, competencies: string[]): EvaluationResult {
  const score = Math.round(Number(raw.score));
  if (!score || score < 1 || score > 5) {
    throw new Error(`Invalid score from AI: ${raw.score}`);
  }
  return {
    questionId,
    competencies,
    score: score as 1 | 2 | 3 | 4 | 5,
    whyThisScore: String(raw.whyThisScore ?? ""),
    whatWasGood: String(raw.whatWasGood ?? ""),
    whatWasMissing: String(raw.whatWasMissing ?? ""),
    managerCoachingNote: String(raw.managerCoachingNote ?? ""),
  };
}

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

  const provider = process.env.AI_PROVIDER ?? "anthropic";
  let raw: Record<string, unknown>;

  switch (provider) {
    case "anthropic":
    default:
      raw = await evaluateWithAnthropic(prompt);
  }

  return parseResult(raw, req.questionId, req.competencies);
}
