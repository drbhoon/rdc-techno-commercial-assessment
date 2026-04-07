"""
build-question-banks.py
Converts Excel/Word question banks to JSON with competency tags.
Run once after updating source files: py scripts/build-question-banks.py

Requirements: pip install pandas openpyxl python-docx
"""

import pandas as pd
import json
import os
import re
from docx import Document

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(ROOT, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# ── Selling skill competency assignment ─────────────────────────────────────
# Based on cluster ranges from rdc_sales_selling_skill.md
# Returns list of competency IDs (first = primary)
def selling_competencies(q: int) -> list[str]:
    if q in (85, 86):          # ERP-only → excluded
        return []
    # C1 primary: initial customer need/urgency diagnosis questions
    if 1 <= q <= 4:            return ["C1", "C3"]   # customer understanding
    if 5 <= q <= 10:           return ["C3", "C1"]   # delivery coordination
    if 11 <= q <= 20:          return ["C3", "C8"]   # delivery + ownership
    if 21 <= q <= 31:          return ["C3", "C2"]   # delivery + service recovery
    if 32 <= q <= 42:          return ["C2", "C3"]   # complaint handling
    if 43 <= q <= 45:          return ["C2", "C3"]   # site/delivery complaints
    if 46 <= q <= 54:          return ["C6", "C5"]   # billing + negotiation
    # C7 primary: relationship management in payment follow-up zone
    if 55 <= q <= 58:          return ["C7", "C6"]   # relationship + collections
    if 59 <= q <= 62:          return ["C6", "C7"]   # payment discipline
    if 63 <= q <= 70:          return ["C4", "C5"]   # value selling + negotiation
    if 71 <= q <= 81:          return ["C5", "C4"]   # objection handling
    if 82 <= q <= 84:          return ["C8", "C1"]   # KPI/ownership
    if q == 87:                return ["C3", "C2"]
    if 88 <= q <= 91:          return ["C2", "C3"]   # pump/service recovery
    if q == 92:                return ["C6"]         # billing dispute
    if 93 <= q <= 97:          return ["C6", "C7"]   # collections + relationship
    if 98 <= q <= 109:         return ["C2", "C7"]   # complaint + relationship
    return ["C1"]

# ── Technical skill competency assignment (revised 50-question bank) ─────────
# Based on 12 sections in the revised Word document question bank
def technical_competencies(q: int) -> list[str]:
    if 1 <= q <= 5:    return ["T3"]   # S1: Cracks in Concrete → Fresh Concrete
    if 6 <= q <= 9:    return ["T3"]   # S2: Delay Setting → Fresh Concrete
    if 10 <= q <= 13:  return ["T2"]   # S3: Quantity Shortage → Site Diagnosis
    if 14 <= q <= 15:  return ["T2"]   # S4: Retention Time → Site Diagnosis
    if 16 <= q <= 20:  return ["T1"]   # S5: Sampling & Curing → RMX Fundamentals
    if 21 <= q <= 24:  return ["T4"]   # S6: Factors Affecting Cube Strength → Hardened
    if 25 <= q <= 28:  return ["T4"]   # S7: Cube Failure → Hardened
    if 29 <= q <= 31:  return ["T6"]   # S8: Evidence Collection → Risk Judgment
    if 32 <= q <= 34:  return ["T5"]   # S9: IS Code Provisions → Corrective Action
    if 35 <= q <= 38:  return ["T1"]   # S10: VAS Products → RMX Fundamentals
    if 39 <= q <= 43:  return ["T6"]   # S11: Case Studies → Risk Judgment
    if 44 <= q <= 50:  return ["T7"]   # S12: Customer Communication → Escalation
    return ["T1"]

# ── Competency metadata ──────────────────────────────────────────────────────
SELLING_COMPETENCIES = {
    "C1": "Customer Understanding & Need Diagnosis",
    "C2": "Service Recovery & Complaint Handling",
    "C3": "Delivery Coordination & Execution Orientation",
    "C4": "Value Selling & Differentiation",
    "C5": "Negotiation & Objection Handling",
    "C6": "Commercial Acumen & Credit Discipline",
    "C7": "Relationship Management & Trust Building",
    "C8": "Ownership, Escalation & Follow-through",
}

TECHNICAL_COMPETENCIES = {
    "T1": "RMX Fundamentals & Product Understanding",
    "T2": "Site Condition Diagnosis",
    "T3": "Complaint Handling for Fresh Concrete",
    "T4": "Complaint Handling for Hardened Concrete",
    "T5": "Corrective Action & Preventive Guidance",
    "T6": "Technical Risk Judgment",
    "T7": "Communication & Escalation Discipline",
}

# Required distribution per attempt (20 questions)
SELLING_DISTRIBUTION = {"C1":2,"C2":4,"C3":3,"C4":2,"C5":3,"C6":3,"C7":1,"C8":2}
TECHNICAL_DISTRIBUTION = {"T1":3,"T2":3,"T3":4,"T4":4,"T5":3,"T6":2,"T7":1}

def clean_text(s) -> str:
    if not isinstance(s, str):
        s = str(s) if s is not None else ""
    # Remove encoding artifacts
    s = s.replace('\u00e2\u0080\u0099', "'").replace('\ufffd', "'")
    s = re.sub(r'\s+', ' ', s).strip()
    return s

# ── Build selling question bank ───────────────────────────────────────────────
print("Building selling question bank...")
df_s = pd.read_excel(
    os.path.join(ROOT, "rdc-Techno-commercial-sales - question bank.xlsx"),
    sheet_name="question bank-sales"
)
df_s.columns = ["sr_no", "question", "answer"]

selling_questions = []
for _, row in df_s.iterrows():
    q_num = int(row["sr_no"])
    comps = selling_competencies(q_num)
    if not comps:   # excluded (Q85, Q86)
        continue
    selling_questions.append({
        "id": f"S{q_num:03d}",
        "sourceNum": q_num,
        "text": clean_text(row["question"]),
        "modelAnswer": clean_text(row["answer"]),
        "competencies": comps,
        "assessmentType": "selling",
    })

print(f"  Selling: {len(selling_questions)} questions (excluded Q85, Q86)")

# ── Build technical question bank (from revised .docx) ───────────────────────
print("Building technical question bank from revised Word document...")

DOCX_PATH = os.path.join(ROOT, "rdc-Techno-commercial-technical - question bank - revised.docx")
# Also try without extension (the original file has no extension)
if not os.path.exists(DOCX_PATH):
    DOCX_PATH = os.path.join(ROOT, "rdc-Techno-commercial-technical - question bank - revised")
if not os.path.exists(DOCX_PATH):
    # Try the external source path
    DOCX_PATH = r"D:\RDC Drive\AI\Assessments\Techno-commercial\rdc-Techno-commercial-technical - question bank - revised"

doc = Document(DOCX_PATH)
paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

technical_questions = []
i = 0
while i < len(paragraphs):
    text = paragraphs[i]
    # Detect QUESTION N
    m = re.match(r'^QUESTION\s+(\d+)$', text)
    if m:
        q_num = int(m.group(1))
        i += 1
        # Collect question text (paragraphs until MODEL ANSWER)
        q_parts = []
        while i < len(paragraphs) and paragraphs[i] != "MODEL ANSWER":
            if not paragraphs[i].startswith("SECTION "):
                q_parts.append(paragraphs[i])
            i += 1
        q_text = " ".join(q_parts)
        # Skip "MODEL ANSWER" header
        if i < len(paragraphs) and paragraphs[i] == "MODEL ANSWER":
            i += 1
        # Collect answer text (paragraphs until next QUESTION or SECTION or end)
        a_parts = []
        while i < len(paragraphs):
            if re.match(r'^QUESTION\s+\d+$', paragraphs[i]) or paragraphs[i].startswith("SECTION "):
                break
            a_parts.append(paragraphs[i])
            i += 1
        a_text = "\n".join(a_parts)

        comps = technical_competencies(q_num)
        technical_questions.append({
            "id": f"T{q_num:03d}",
            "sourceNum": q_num,
            "text": clean_text(q_text),
            "modelAnswer": clean_text(a_text),
            "competencies": comps,
            "assessmentType": "technical",
        })
    else:
        i += 1

print(f"  Technical: {len(technical_questions)} questions (from revised .docx)")

# ── Write JSON outputs ────────────────────────────────────────────────────────
with open(os.path.join(DATA_DIR, "selling-questions.json"), "w", encoding="utf-8") as f:
    json.dump(selling_questions, f, ensure_ascii=False, indent=2)

with open(os.path.join(DATA_DIR, "technical-questions.json"), "w", encoding="utf-8") as f:
    json.dump(technical_questions, f, ensure_ascii=False, indent=2)

# Write competency metadata
metadata = {
    "selling": {
        "competencies": SELLING_COMPETENCIES,
        "distribution": SELLING_DISTRIBUTION,
        "totalQuestions": 20,
        "poolSize": len(selling_questions),
    },
    "technical": {
        "competencies": TECHNICAL_COMPETENCIES,
        "distribution": TECHNICAL_DISTRIBUTION,
        "totalQuestions": 20,
        "poolSize": len(technical_questions),
    }
}
with open(os.path.join(DATA_DIR, "metadata.json"), "w", encoding="utf-8") as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)

print(f"\nDone. Files written to: {DATA_DIR}")
print("  data/selling-questions.json")
print("  data/technical-questions.json")
print("  data/metadata.json")

# ── Distribution check ────────────────────────────────────────────────────────
print("\n--- Selling competency distribution in pool ---")
from collections import Counter
sc = Counter()
for q in selling_questions:
    sc[q["competencies"][0]] += 1
for k, v in sorted(sc.items()):
    needed = SELLING_DISTRIBUTION.get(k, 0)
    status = "OK" if v >= needed else f"SHORT (need {needed})"
    print(f"  {k} ({SELLING_COMPETENCIES[k][:30]}): {v} available, {needed} needed — {status}")

print("\n--- Technical competency distribution in pool ---")
tc = Counter()
for q in technical_questions:
    tc[q["competencies"][0]] += 1
for k, v in sorted(tc.items()):
    needed = TECHNICAL_DISTRIBUTION.get(k, 0)
    status = "OK" if v >= needed else f"SHORT (need {needed})"
    print(f"  {k} ({TECHNICAL_COMPETENCIES[k][:30]}): {v} available, {needed} needed — {status}")
