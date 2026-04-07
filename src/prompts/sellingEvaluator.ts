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

## CRITICAL: Scoring Scale is 1–10 (NOT 1–5)

You MUST use the FULL 1–10 range. This is a 10-point scale. Do NOT compress scores into the 1–5 range.

**Calibration guide — read carefully before scoring:**
- A competent sales professional who gives a correct, practical answer with minor gaps = **7 or 8**
- An experienced professional who covers most key points with good judgment = **8**
- Only truly exceptional, textbook-perfect answers with comprehensive detail = **9 or 10**
- A basic but correct answer that misses depth or specifics = **5 or 6**
- A vague, generic, or significantly incomplete answer = **3 or 4**
- A wrong, harmful, or empty answer = **1 or 2**

Sub-scores and weights:
- A. Situational understanding (20%): Did the candidate understand the real issue, urgency, and customer risk?
- B. Practical action orientation (30%): Did the candidate propose actions that can actually be executed in RMX operations?
- C. Customer communication quality (20%): Was the response calm, transparent, and confidence-building?
- D. Commercial judgment (20%): Did the candidate protect price/margin/payment discipline and avoid casual concessions?
- E. Ownership & escalation logic (10%): Did the candidate show clear follow-through and appropriate escalation?

**Score Anchors (use the FULL 1–10 range):**
- **10**: Perfect — covers every key point from model answer, adds practical insight, flawless judgment
- **9**: Near-perfect — covers almost all key points, minor omission only, excellent practical grounding
- **8**: Strong — technically correct, practical, well-structured, good commercial awareness, minor gaps
- **7**: Good — correct approach, covers main points, some gaps in depth or structure, still reliable
- **6**: Above average — basic understanding correct, reasonable approach, but missing important specifics or commercial nuance
- **5**: Average — gets the general direction right but generic, incomplete, or lacks RMX-specific grounding
- **4**: Below average — misses important actions, too vague, weak escalation, some commercial risk
- **3**: Weak — significant gaps, incorrect approach on key aspects, operational risk
- **2**: Poor — mostly wrong, potentially harmful advice, no ownership shown
- **1**: Fail — no meaningful response, completely wrong, or dangerous recommendation

## Mandatory Downgrade Rules
CAP at 6 if ANY of these apply:
- Answer is generic and not grounded in RMX reality
- Candidate says "I will check and revert" without an immediate action path
- Candidate only apologizes but does not solve
- Candidate suggests price reduction / free compensation without verification
- Candidate ignores internal coordination

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
