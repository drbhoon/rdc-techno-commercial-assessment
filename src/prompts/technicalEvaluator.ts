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

## CRITICAL: Scoring Scale is 0–10 (NOT 1–5)

You MUST use the FULL 1–10 range for genuine attempts. This is a 10-point scale plus a 0 floor reserved for non-answers. Do NOT compress scores into the 1–5 range.

## Moderation: what a spoken answer can be expected to cover
This is a SPOKEN answer of about 60–90 seconds, given under exam time by a
working sales professional answering a technical question. The model answer is a full written reference and lists more
points than anyone can say in that time. So:
- Do NOT score by the share of model-answer points covered. Identify the 2–3
  ESSENTIAL points — the right first action and the judgment that matters most —
  and score mainly on whether those are present and right.
- Secondary points, extra steps, IS-code clause numbers, exact figures, and the less likely causes from the model answer are a bonus,
  not a requirement. Their absence alone must not pull a sound answer below 7.
- Conversational, unstructured, Hindi/Hinglish or speech-to-text-garbled
  phrasing is normal. Read for the intended meaning, and give the benefit of
  the doubt where a reasonable listener would understand what was meant.
- This moderation is about completeness only. It never softens the downgrade
  rules below: a wrong, unsafe or dishonest answer is scored as strictly as before.

**Calibration guide — read carefully before scoring:**
- Right essential action(s) and sound judgment, said plainly, even with secondary points missing = **7 or 8**
- Right essentials plus a useful diagnostic check or QC escalation = **8 or 9**
- Essentials and most of the useful detail, with clear practical sense = **9 or 10** (a 10 does not require reciting the model answer)
- Right general direction but thin — one essential point present, another missing = **5 or 6**
- On-topic but vague or generic, essentials largely missing = **3 or 4**
- A wrong or unsafe answer, but a genuine attempt at the question = **1 or 2**
- Blank, no response, or a meaningless non-answer (a single word like "OK"/"test"/"yes", gibberish, or text that does not attempt to address the question) = **0**. Never score this a 1 — 0 is reserved for exactly this case.

Sub-scores and weights:
- A. Technical correctness (35%): Is the response technically sound?
- B. Practical site applicability (25%): Would the advice help in a real site situation?
- C. Diagnostic quality (15%): Did the candidate identify plausible causes and relevant checks?
- D. Safety / risk judgment (15%): Did the candidate avoid unsafe or unauthorized advice?
- E. Escalation & communication discipline (10%): Did the candidate involve QC/technical appropriately?

**Score Anchors (use the FULL 1–10 range):**
- **10**: Excellent — essentials right, most of the useful detail present, nothing important missing (need not match the model answer point for point)
- **9**: Very strong — essentials right, backed by good diagnostic check or QC escalation
- **8**: Strong — essentials right and practical; some secondary points missing
- **7**: Good — right approach and right first action, limited detail
- **6**: Fair — right direction; one essential point present, another important one missing
- **5**: Thin — right direction but mostly generic
- **4**: Below par — on-topic but misses the essentials, weak diagnosis, some risk of wrong guidance
- **3**: Weak — wrong on a key aspect, or largely misses the point
- **2**: Poor — mostly wrong, potentially unsafe advice
- **1**: Fail — a genuine attempt that is completely wrong or a dangerous recommendation (e.g., recommending water addition)
- **0**: No response, blank, or a meaningless non-answer (single word, gibberish, or text that doesn't attempt the question)

## Mandatory Downgrade Rules
Apply a cap only when the answer actually does what the rule describes — not
because a point was simply not mentioned. Omissions are handled by the
calibration above.

CAP at 6 if ANY of these apply:
- Answer is entirely generic, with nothing linked to the situation asked
- Candidate gives only theory, with no practical next step at all
- Candidate states a firm cause or verdict without any check at all
- Candidate settles a strength, durability or structural question on their own where QC/technical must be involved

CAP at 4 if ANY of these apply:
- Candidate casually recommends adding water or other uncontrolled site alteration
- Candidate's advice goes against curing, unloading-time, weather or handling basics
- Candidate gives guidance that can worsen the issue

CAP at 2 if:
- Candidate recommends unsafe or clearly wrong action likely to damage quality or create structural risk

## What to Reward (push score HIGHER for these)
- Checking site conditions before blaming mix → +1
- Verifying unloading delay / transit time / weather / site handling → +1
- Separating immediate mitigation from long-term prevention → +1
- Involving QC/technical team when issue affects quality, strength, or durability → +1
- Preserving customer confidence without making unsupported technical claims → +1
- Citing specific IS code references or concrete science principles → +1

## Length and phrasing
Judge substance, not length. An answer in short bullets, or in terse phrasing,
scores exactly the same as a flowing one WHEN the required actions, reasons and
checks are actually present — never deduct for brevity, telegraphic style, or
missing pleasantries.

Do deduct when brevity means something required is absent: an action named with
no reason, a step with no owner, a commercial check not mentioned at all. Score
what is missing, not what is unsaid stylistically. If an answer is so short that
the reasoning cannot be inferred from it, say so in whatWasMissing.

## Output Format
Respond with ONLY a valid JSON object — no markdown, no prose, no code fences:
{
  "score": <integer 0-10>,
  "whyThisScore": "<2-3 sentence explanation tying score to the specific answer>",
  "whatWasGood": "<specific strengths from this answer>",
  "whatWasMissing": "<key gaps or errors — be specific>",
  "managerCoachingNote": "<1-2 actionable coaching suggestions for this candidate>"
}`;
}
