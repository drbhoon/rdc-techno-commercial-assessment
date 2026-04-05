# RDC Techno-Commercial Assessment

Voice-based assessment platform for the RDC sales force — two separate assessments:
- **Selling Skill** (107-question pool, 20 per attempt)
- **Technical Skill** (48-question pool, 20 per attempt)

## Prerequisites

- Node.js ≥ 18
- Python 3.x with `pandas` and `openpyxl` (`pip install pandas openpyxl`)
- Anthropic API key (or OpenAI / Gemini — see configuration)
- Chrome or Edge browser (for Web Speech API voice recording)

## Quick Start

### 1. Set up environment

```bash
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
```

### 2. Build the question banks (run once, or after updating Excel files)

```bash
npm run build-banks
# Generates: data/selling-questions.json, data/technical-questions.json, data/metadata.json
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run development server

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Production build

```bash
npm run build
npm start
```

---

## Folder Structure

```
rdc-techno-commercial-assessment/
├── data/                          # Generated JSON question banks (gitignore in prod)
│   ├── selling-questions.json     # 107 questions with competency tags
│   ├── technical-questions.json   # 48 questions with competency tags
│   └── metadata.json              # Competency names + distribution targets
├── db/
│   └── sessions/                  # One JSON file per assessment session
├── scripts/
│   └── build-question-banks.py    # Excel → JSON converter with competency mapping
├── src/
│   ├── app/
│   │   ├── page.tsx               # Home — candidate info + assessment selector
│   │   ├── instructions/page.tsx  # Pre-assessment briefing
│   │   ├── assessment/page.tsx    # Live assessment (voice + evaluation loop)
│   │   ├── report/[sessionId]/    # Final report with export
│   │   └── api/
│   │       ├── session/route.ts           # POST — create session + assemble questions
│   │       ├── session/[id]/submit/route.ts  # POST — submit transcript, get evaluation
│   │       └── report/[id]/route.ts       # GET — generate full report
│   ├── lib/
│   │   ├── db.ts                  # JSON file storage (no native deps)
│   │   ├── questionBank.ts        # Load and cache question JSON banks
│   │   ├── randomizer.ts          # Competency-aware question assembly
│   │   ├── evaluator.ts           # AI evaluation dispatcher (swappable)
│   │   └── reportGenerator.ts     # Score aggregation + readiness logic
│   ├── prompts/
│   │   ├── sellingEvaluator.ts    # Selling skill evaluation prompt template
│   │   └── technicalEvaluator.ts  # Technical skill evaluation prompt template
│   ├── components/
│   │   ├── VoiceRecorder.tsx      # Mic recorder with transcript + text fallback
│   │   └── ScoreCard.tsx          # Per-question evaluation display
│   └── types/index.ts             # Shared TypeScript interfaces
├── rdc_sales_selling_skill.md     # Selling skill rules (source of truth)
├── rdc_sales_technical_skill.md   # Technical skill rules (source of truth)
├── rdc-Techno-commercial-sales - question bank.xlsx
├── rdc-Techno-commercial-technical - question bank.xlsx
├── .env.local.example
└── README.md
```

---

## Assessment Flow

```
Home (candidate info + type)
  → Instructions
  → Assessment (Q1–Q20: record → review → submit → see score)
  → Final Report (competency scores + readiness + export)
```

Each question:
1. Question displayed on screen
2. Candidate presses **Record** (mic button)
3. Speech is transcribed in real-time (Chrome/Edge Web Speech API)
4. Candidate reviews transcript, may **re-record once**
5. Candidate submits → AI evaluates → score card shown (1–5 + feedback)
6. Next question

---

## Competency Distribution (per attempt)

### Selling Skill (20 questions)
| Competency | Name | Questions |
|------------|------|-----------|
| C1 | Customer Understanding & Need Diagnosis | 2 |
| C2 | Service Recovery & Complaint Handling | 4 |
| C3 | Delivery Coordination & Execution Orientation | 3 |
| C4 | Value Selling & Differentiation | 2 |
| C5 | Negotiation & Objection Handling | 3 |
| C6 | Commercial Acumen & Credit Discipline | 3 |
| C7 | Relationship Management & Trust Building | 1 |
| C8 | Ownership, Escalation & Follow-through | 2 |

### Technical Skill (20 questions)
| Competency | Name | Questions |
|------------|------|-----------|
| T1 | RMX Fundamentals & Product Understanding | 3 |
| T2 | Site Condition Diagnosis | 3 |
| T3 | Complaint Handling for Fresh Concrete | 4 |
| T4 | Complaint Handling for Hardened Concrete | 4 |
| T5 | Corrective Action & Preventive Guidance | 3 |
| T6 | Technical Risk Judgment | 2 |
| T7 | Communication & Escalation Discipline | 1 |

---

## Scoring

Each response is scored **1–5** using competency-specific sub-score weights.
The AI evaluator enforces mandatory downgrade rules from the skill files:

- Selling: generic answers, blame-shifting, unverified concessions → capped at 3 or below
- Technical: adding-water advice, no escalation → capped at 2 or below
- Both: falsification / unsafe recommendations → capped at 1

---

## Readiness Thresholds

| Score % | Selling recommendation | Technical recommendation |
|---------|------------------------|--------------------------|
| ≥ 75% | Ready | Technically ready for sales role |
| 60–74% | Ready with coaching | Ready with coaching |
| 45–59% | Borderline | Borderline |
| < 45% | Not ready | Not ready |

---

## Swapping AI Provider

In `.env.local`:
```bash
AI_PROVIDER=openai        # or gemini
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

Then uncomment the relevant client in `src/lib/evaluator.ts`.

---

## Updating Question Banks

1. Edit the Excel files
2. Run `npm run build-banks`
3. Restart the dev server

Session data in `db/sessions/` is not affected — past sessions are preserved.

---

## Export Formats

From the report screen:
- **Print / PDF** — browser print dialog (formatted for A4)
- **JSON** — full structured report with all responses and evaluations
- **CSV** — tabular: Q#, competency, score, transcript excerpt, feedback
