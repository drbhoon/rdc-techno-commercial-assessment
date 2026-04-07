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

## CRITICAL: Scoring Scale is 1–10 (NOT 1–5)

You MUST use the FULL 1–10 range. This is a 10-point scale. Do NOT compress scores into the 1–5 range.

**Calibration guide — read carefully before scoring:**
- A competent professional who gives a technically correct, practical answer with minor gaps = **7 or 8**
- An experienced professional who covers most key points with good site judgment = **8**
- Only truly exceptional, textbook-perfect answers with comprehensive technical detail = **9 or 10**
- A basic but correct answer that misses depth or diagnosis specifics = **5 or 6**
- A vague, generic, or significantly incomplete answer = **3 or 4**
- A wrong, unsafe, or empty answer = **1 or 2**

Sub-scores and weights:
- A. Technical correctness (35%): Is the response technically sound?
- B. Practical site applicability (25%): Would the advice help in a real site situation?
- C. Diagnostic quality (15%): Did the candidate identify plausible causes and relevant checks?
- D. Safety / risk judgment (15%): Did the candidate avoid unsafe or unauthorized advice?
- E. Escalation & communication discipline (10%): Did the candidate involve QC/technical appropriately?

**Score Anchors (use the FULL 1–10 range):**
- **10**: Perfect — covers every key point from model answer, adds practical insight, flawless technical judgment
- **9**: Near-perfect — covers almost all key points, minor omission only, excellent site-practical grounding
- **8**: Strong — technically correct, practical, covers main causes/solutions, good safety awareness, minor gaps
- **7**: Good — correct technical approach, covers main points, some gaps in diagnosis depth or escalation, still reliable
- **6**: Above average — basic understanding correct, reasonable approach, but missing important diagnostic steps or preventive guidance
- **5**: Average — gets the general technical direction right but generic, incomplete, or lacks RMX site-specific grounding
- **4**: Below average — misses important technical factors, too vague, weak diagnosis, some risk of incorrect guidance
- **3**: Weak — significant technical gaps, incorrect approach on key aspects, could lead to wrong field guidance
- **2**: Poor — mostly wrong, potentially unsafe advice, poor technical understanding
- **1**: Fail — no meaningful response, completely wrong, or dangerous recommendation (e.g., recommending water addition)

## Mandatory Downgrade Rules
CAP at 6 if ANY of these apply:
- Answer is generic and not linked to RMX site reality
- Candidate gives only theory, no practical next step
- Candidate jumps to conclusion without basic checks
- Candidate ignores QC/technical escalation where appropriate

CAP at 4 if ANY of these apply:
- Candidate casually recommends adding water or other uncontrolled site alteration
- Candidate ignores curing, unloading delay, weather, handling, or site practice where clearly relevant
- Candidate gives technically incomplete guidance that can worsen the issue

CAP at 2 if:
- Candidate recommends unsafe or clearly wrong action likely to damage quality or create structural risk

## What to Reward (push score HIGHER for these)
- Checking site conditions before blaming mix → +1
- Verifying unloading delay / transit time / weather / site handling → +1
- Separating immediate mitigation from long-term prevention → +1
- Involving QC/technical team when issue affects quality, strength, or durability → +1
- Preserving customer confidence without making unsupported technical claims → +1
- Citing specific IS code references or concrete science principles → +1

## Output Format
Respond with ONLY a valid JSON object — no markdown, no prose, no code fences:
{
  "score": <integer 1-10>,
  "whyThisScore": "<2-3 sentence explanation tying score to the specific answer>",
  "whatWasGood": "<specific strengths from this answer>",
  "whatWasMissing": "<key gaps or errors — be specific>",
  "managerCoachingNote": "<1-2 actionable coaching suggestions for this candidate>"
}`;
}
