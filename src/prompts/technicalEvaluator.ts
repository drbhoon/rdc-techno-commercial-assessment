/**
 * Technical Skill Evaluation Prompt
 * Source of truth: rdc_sales_technical_skill.md
 */

export const TECHNICAL_COMPETENCY_NAMES: Record<string, string> = {
  T1: "RMX Fundamentals & Product Understanding",
  T2: "Site Condition Diagnosis",
  T3: "Complaint Handling for Fresh Concrete",
  T4: "Complaint Handling for Hardened Concrete",
  T5: "Corrective Action & Preventive Guidance",
  T6: "Technical Risk Judgment",
  T7: "Communication & Escalation Discipline",
};

export function buildTechnicalEvalPrompt(params: {
  questionId: string;
  questionText: string;
  modelAnswer: string;
  competencies: string[];
  transcript: string;
}): string {
  const { questionId, questionText, modelAnswer, competencies, transcript } =
    params;

  const compNames = competencies
    .map((c) => `${c}: ${TECHNICAL_COMPETENCY_NAMES[c] ?? c}`)
    .join(", ");

  return `You are evaluating a sales professional's voice response in the RDC Ready-Mix Concrete (RMX) Techno-Commercial Assessment — Technical Skill module.

## Evaluation Context
- Question ID: ${questionId}
- Competencies: ${compNames}
- Candidate may have answered in English, Hindi, or Hinglish. Evaluate technical meaning and practical judgment, not grammar.

## The Question
${questionText}

## Model Answer (reference only — not a script)
${modelAnswer}

## Candidate's Transcript
${transcript}

## Transcript Normalization Rules
Before scoring, normalize the transcript:
- "slump low" / "low slump" / "workability low" = low workability
- "cube fail" / "strength fail" = failed compressive test
- "setting fast" / "flash set" / "quick set" = accelerated setting
- "bleeding" / "segregation" / "honeycomb" = surface/structural defects
- "pump choke" / "blockage" = pump blockage
- "cracks next day" / "plastic shrinkage" / "crazing" = early cracking
- "bug holes" / "pits" / "pockmarks" = surface voids
- "rebar visible" / "cover issue" / "exposed steel" = inadequate cover
- Mixed Hindi-English is acceptable if the technical meaning is clear

## Scoring Framework (1–5)

Sub-scores and weights:
- A. Technical correctness (35%): Is the response technically sound?
- B. Practical site applicability (25%): Would the advice help in a real site situation?
- C. Diagnostic quality (15%): Did the candidate identify plausible causes and relevant checks?
- D. Safety / risk judgment (15%): Did the candidate avoid unsafe or unauthorized advice?
- E. Escalation & communication discipline (10%): Did the candidate involve QC/technical appropriately?

Score Anchors:
- 5 (Strong): Technically correct, practical, balanced, safe, good escalation judgment
- 4 (Good): Mostly correct and practical, minor omissions, still reliable
- 3 (Acceptable): Basic understanding present, but generic, incomplete, or weak on root-cause thinking / escalation
- 2 (Weak): Important gaps, risk of wrong field guidance, poor structure
- 1 (Poor): Technically wrong, unsafe, or highly unrealistic

## Mandatory Downgrade Rules
CAP at 3 if ANY of these apply:
- Answer is generic and not linked to RMX site reality
- Candidate gives only theory, no practical next step
- Candidate jumps to conclusion without basic checks
- Candidate ignores QC/technical escalation where appropriate

CAP at 2 if ANY of these apply:
- Candidate casually recommends adding water or other uncontrolled site alteration
- Candidate ignores curing, unloading delay, weather, handling, or site practice where clearly relevant
- Candidate gives technically incomplete guidance that can worsen the issue

CAP at 1 if:
- Candidate recommends unsafe or clearly wrong action likely to damage quality or create structural risk

## What to Reward
- Checking site conditions before blaming mix
- Verifying unloading delay / transit time / weather / site handling
- Separating immediate mitigation from long-term prevention
- Involving QC/technical team when issue affects quality, strength, or durability
- Preserving customer confidence without making unsupported technical claims

## Output Format
Respond with ONLY a valid JSON object — no markdown, no prose, no code fences:
{
  "score": <integer 1-5>,
  "whyThisScore": "<2-3 sentence explanation tying score to the specific answer>",
  "whatWasGood": "<specific strengths from this answer>",
  "whatWasMissing": "<key gaps or errors — be specific>",
  "managerCoachingNote": "<1-2 actionable coaching suggestions for this candidate>"
}`;
}
