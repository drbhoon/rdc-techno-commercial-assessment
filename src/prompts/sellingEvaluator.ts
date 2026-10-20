/**
 * Selling Skill Evaluation Prompt
 * Source of truth: rdc_sales_selling_skill.md
 */

export const SELLING_COMPETENCY_NAMES: Record<string, string> = {
  C1: "Customer Understanding & Need Diagnosis",
  C2: "Service Recovery & Complaint Handling",
  C3: "Delivery Coordination & Execution Orientation",
  C4: "Value Selling & Differentiation",
  C5: "Negotiation & Objection Handling",
  C6: "Commercial Acumen & Credit Discipline",
  C7: "Relationship Management & Trust Building",
  C8: "Ownership, Escalation & Follow-through",
};

export function buildSellingEvalPrompt(params: {
  questionId: string;
  questionText: string;
  modelAnswer: string;
  competencies: string[];
  transcript: string;
}): string {
  const { questionId, questionText, modelAnswer, competencies, transcript } =
    params;

  const compNames = competencies
    .map((c) => `${c}: ${SELLING_COMPETENCY_NAMES[c] ?? c}`)
    .join(", ");

  return `You are evaluating a sales professional's voice response in the RDC Ready-Mix Concrete (RMX) Techno-Commercial Assessment — Selling Skill module.

## Evaluation Context
- Question ID: ${questionId}
- Competencies: ${compNames}
- Candidate may have answered in English, Hindi, or Hinglish. Evaluate meaning and judgment, not grammar.

## The Question
${questionText}

## Model Answer (reference only — not a script)
${modelAnswer}

## Candidate's Transcript
${transcript}

## Transcript Normalization Rules
Before scoring, normalize the transcript:
- Ignore filler words (um, uh, like, basically, so, etc.)
- "cum" = cubic metre / m³
- "TM" = transit mixer
- "pump choke" / "blockage" / "jam" = pump blockage
- "slump low" / "low slump" = low workability
- "cube fail" / "strength fail" = failed compressive test
- "debit note" = commercial credit note
- Mixed Hindi-English is acceptable if the technical/commercial meaning is clear

## CRITICAL: Scoring Scale is 0–10 (NOT 1–5)

You MUST use the FULL 1–10 range for genuine attempts. This is a 10-point scale plus a 0 floor reserved for non-answers. Do NOT compress scores into the 1–5 range.

## Moderation: what a spoken answer can be expected to cover
This is a SPOKEN answer of about 60–90 seconds, given under exam time by a
working sales professional. The model answer is a full written reference and lists more
points than anyone can say in that time. So:
- Do NOT score by the share of model-answer points covered. Identify the 2–3
  ESSENTIAL points — the right first action and the judgment that matters most —
  and score mainly on whether those are present and right.
- Secondary points, extra steps, names of documents or systems, and exact figures from the model answer are a bonus,
  not a requirement. Their absence alone must not pull a sound answer below 7.
- Conversational, unstructured, Hindi/Hinglish or speech-to-text-garbled
  phrasing is normal. Read for the intended meaning, and give the benefit of
  the doubt where a reasonable listener would understand what was meant.
- This moderation is about completeness only. It never softens the downgrade
  rules below: a wrong, unsafe or dishonest answer is scored as strictly as before.

**Calibration guide — read carefully before scoring:**
- Right essential action(s) and sound judgment, said plainly, even with secondary points missing = **7 or 8**
- Right essentials plus a useful check, follow-up or escalation = **8 or 9**
- Essentials and most of the useful detail, with clear practical sense = **9 or 10** (a 10 does not require reciting the model answer)
- Right general direction but thin — one essential point present, another missing = **5 or 6**
- On-topic but vague or generic, essentials largely missing = **3 or 4**
- A wrong or harmful answer, but a genuine attempt at the question = **1 or 2**
- Blank, no response, or a meaningless non-answer (a single word like "OK"/"test"/"yes", gibberish, or text that does not attempt to address the question) = **0**. Never score this a 1 — 0 is reserved for exactly this case.

Sub-scores and weights:
- A. Situational understanding (20%): Did the candidate understand the real issue, urgency, and customer risk?
- B. Practical action orientation (30%): Did the candidate propose actions that can actually be executed in RMX operations?
- C. Customer communication quality (20%): Was the response calm, transparent, and confidence-building?
- D. Commercial judgment (20%): Did the candidate protect price/margin/payment discipline and avoid casual concessions?
- E. Ownership & escalation logic (10%): Did the candidate show clear follow-through and appropriate escalation?

**Score Anchors (use the FULL 1–10 range):**
- **10**: Excellent — essentials right, most of the useful detail present, nothing important missing (need not match the model answer point for point)
- **9**: Very strong — essentials right, backed by good check, follow-up or escalation
- **8**: Strong — essentials right and practical; some secondary points missing
- **7**: Good — right approach and right first action, limited detail
- **6**: Fair — right direction; one essential point present, another important one missing
- **5**: Thin — right direction but mostly generic
- **4**: Below par — on-topic but misses the essentials, some commercial risk
- **3**: Weak — wrong on a key aspect, or largely misses the point
- **2**: Poor — mostly wrong, potentially harmful advice, no ownership shown
- **1**: Fail — a genuine attempt that is completely wrong or a dangerous recommendation
- **0**: No response, blank, or a meaningless non-answer (single word, gibberish, or text that doesn't attempt the question)

## Mandatory Downgrade Rules
Apply a cap only when the answer actually does what the rule describes — not
because a point was simply not mentioned. Omissions are handled by the
calibration above.

CAP at 6 if ANY of these apply:
- Answer is entirely generic, with nothing specific to the situation asked
- Candidate's only action is "I will check and revert", with no immediate step at all
- Candidate only apologizes and proposes no solution at all
- Candidate suggests price reduction / free compensation without verification

CAP at 4 if ANY of these apply:
- Candidate misleads the customer
- Candidate blames plant/QC/logistics in front of the customer
- Candidate agrees to improper billing reversal/discount/debit without checking facts
- Candidate ignores overdue/payment risk completely

CAP at 2 if:
- Candidate recommends falsification, concealment, manipulation of documents, or supply continuation against approved stop-supply controls without authorization

## What to Reward (push score HIGHER for these)
- Proactive ETA updates → +1
- Realistic alternate plan → +1
- Check of pump / site readiness / unloading speed → +1
- Document verification before commercial commitment → +1
- Complaint logging and closure tracking → +1
- Protecting trust without surrendering discipline → +1

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
