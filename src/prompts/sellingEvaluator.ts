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

## Scoring Framework (1–5)

Sub-scores and weights:
- A. Situational understanding (20%): Did the candidate understand the real issue, urgency, and customer risk?
- B. Practical action orientation (30%): Did the candidate propose actions that can actually be executed in RMX operations?
- C. Customer communication quality (20%): Was the response calm, transparent, and confidence-building?
- D. Commercial judgment (20%): Did the candidate protect price/margin/payment discipline and avoid casual concessions?
- E. Ownership & escalation logic (10%): Did the candidate show clear follow-through and appropriate escalation?

Score Anchors:
- 5 (Strong): RMX-grounded, clear action sequence, good customer handling, commercially balanced, strong ownership
- 4 (Good): Mostly correct and practical, minor gaps in structure or commercial depth
- 3 (Acceptable): Basic answer correct, intent to solve, but generic, incomplete, or weak on commercial/control aspects
- 2 (Weak): Misses important actions, too vague, poor escalation, risk of operational or commercial damage
- 1 (Poor): Unsafe, unrealistic, careless, or commercially harmful — no ownership, no RMX understanding

## Mandatory Downgrade Rules
CAP at 3 if ANY of these apply:
- Answer is generic and not grounded in RMX reality
- Candidate says "I will check and revert" without an immediate action path
- Candidate only apologizes but does not solve
- Candidate suggests price reduction / free compensation without verification
- Candidate ignores internal coordination

CAP at 2 if ANY of these apply:
- Candidate misleads the customer
- Candidate blames plant/QC/logistics in front of the customer
- Candidate agrees to improper billing reversal/discount/debit without checking facts
- Candidate ignores overdue/payment risk completely

CAP at 1 if:
- Candidate recommends falsification, concealment, manipulation of documents, or supply continuation against approved stop-supply controls without authorization

## What to Reward
- Proactive ETA updates
- Realistic alternate plan
- Check of pump / site readiness / unloading speed
- Document verification before commercial commitment
- Complaint logging and closure tracking
- Protecting trust without surrendering discipline

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
