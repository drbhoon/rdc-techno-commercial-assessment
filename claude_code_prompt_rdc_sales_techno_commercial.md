Build a voice-based assessment workflow for RDC sales force using the two local skill files:

1. `rdc_sales_selling_skill.md`
2. `rdc_sales_technical_skill.md`

Also use the two local source Excel files:
1. `rdc-Techno-commercial-sales - question bank.xlsx`
2. `rdc-Techno-commercial-technical - question bank.xlsx`

## Objective
Create a production-oriented local app/prototype that administers **two separate assessments** for the same candidate:
- **Selling Skill Assessment**
- **Technical Skill Assessment**

Each assessment is independent and administered separately.
Each assessment should ask **20 random questions** from its own valid pool.
Responses are **voice-based**.
AI evaluates each response against the model answer in the Excel file plus the rules in the corresponding skill file.

## Mandatory business rules
- Selling-skill assessment source bank has 109 questions, but **exclude ERP-only questions Q85 and Q86** from the active pool.
- Technical-skill assessment source bank has 48 questions.
- Keep both assessments separate.
- Use the markdown skill files as the source of truth for:
  - competencies
  - randomization logic
  - evaluation rules
  - downgrade rules
  - output format
- The Excel files remain the source of truth for:
  - raw question text
  - model answers
- The app must be **voice-first**:
  - question displayed on screen
  - candidate records answer by microphone
  - speech-to-text transcript generated
  - transcript sent for evaluation
- Candidate may answer in English, Hindi, or Hinglish.
- Evaluation should score meaning and judgment, not grammar polish.

## What I want you to build
Build a local-first web app or desktop-friendly app with a clean workflow.

### Core screens
1. **Home**
   - Candidate name / employee ID / location / role
   - Select assessment:
     - Selling Skill
     - Technical Skill

2. **Instructions screen**
   - Explain voice-based format
   - Explain that 20 questions will be asked
   - Explain answer duration target: 30–75 seconds

3. **Assessment screen**
   - Show one question at a time
   - Record voice
   - Show transcript for review
   - Allow:
     - re-record once
     - submit
   - Move to next question
   - Show progress: question x/20

4. **Evaluation screen**
   - For each question, show:
     - score 1–5
     - why this score
     - what was good
     - what was missing
     - manager coaching note

5. **Final report screen**
   - overall score %
   - competency-wise scores
   - top strengths
   - development areas
   - red flags
   - readiness recommendation

6. **Export**
   - JSON export
   - PDF or printable report
   - CSV optional

## Implementation requirements
- Use deterministic internal question IDs.
- Preserve traceability to original source question number.
- Apply question clean-up before runtime:
  - remove ERP questions from sales pool
  - normalize numbering issues in technical bank
  - avoid near-duplicate questions in the same attempt where possible
- Randomization must respect competency distribution rules from each skill file.
- The evaluator must read:
  - the question
  - model answer
  - candidate transcript
  - competency tag(s)
  - relevant rules from skill file
- Add transcript normalization:
  - tolerate filler words
  - tolerate spelling/transcription errors
  - normalize RMX terms like TM, cum, slump, cube fail, pump choke, debit note, etc.

## Evaluation logic
For each question:
1. infer competency tag(s)
2. compare candidate transcript against model answer
3. score on 1–5 scale using the skill-file rubric
4. apply downgrade rules where required
5. generate concise coaching feedback

## AI prompt architecture
Create the evaluation layer so that it can later be swapped between OpenAI / Anthropic / Gemini.
Keep prompt templates modular:
- selling evaluator prompt
- technical evaluator prompt

## Technical preferences
Choose a stack that is easy to run locally on Windows desktop.
Good default:
- Next.js or React frontend
- simple local backend API
- local JSON storage or SQLite
- modular services for:
  - question bank loader
  - assessment assembler
  - speech transcription adapter
  - AI evaluator
  - report generator

If a simpler stack is better for reliability, choose it.

## Deliverables in the codebase
I want:
1. working app
2. README with setup steps
3. clear folder structure
4. sample config/env file
5. sample exported report
6. reusable prompt templates
7. clean comments where logic is non-obvious

## Important evaluation behavior
- Generic textbook answers should not score high.
- For selling skill, commercial discipline matters.
- For technical skill, unsafe technical advice must be penalized heavily.
- Do not reward polished speaking if substance is weak.
- Do reward practical RMX-grounded thinking.

## Nice-to-have
- admin option to replay audio response
- retake assessment
- store completed attempts by candidate
- dashboard of past attempts
- difficulty balancing in future

## First thing to do
Start by:
1. loading and inspecting the two markdown skill files
2. loading and inspecting the two Excel banks
3. designing the internal data model
4. implementing the question pool filtering and competency-aware randomization
5. then build the UI and evaluator

Work step by step, but do the actual implementation — not just a plan.
