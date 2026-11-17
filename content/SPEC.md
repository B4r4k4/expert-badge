# Content spec — منصة التحضير لشارة مهندس الذكاء الاصطناعي الخبير (سدايا)

The site is a static Arabic (RTL) study platform that copies the structure and tone of a reference
course site (read `E:\web-design\site\units\01.html` once to absorb the tone: calm, precise, explanatory
Arabic; English technical terms kept inline in parentheses, e.g. «الاستدعاء (Recall)»; short paragraphs;
no hype; every claim operational and checkable).

Each unit is one JSON file `E:\SDAIA\study_site\content\units\NN.json` (UTF-8, valid JSON — validate it
with `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>` before finishing).

## Source material

- Main source: `E:\SDAIA\Exam_Simulator\_work\src\chNN_*.txt` — the bilingual exam memo extracted from PDF.
  **The English text is clean; the Arabic text in these files is garbled by extraction (reversed letters) —
  never copy Arabic from them.** Write the Arabic yourself from the English.
- Section line index: `E:\SDAIA\Exam_Simulator\_work\SECTION_INDEX.md`.
- Clean Arabic terminology: `E:\SDAIA\Exam_Simulator\question_bank.json` (1000 reviewed bilingual MCQs,
  fields `section`, `topic.ar`, `stem.ar`, `explanation.ar`) — use it to match established Arabic terms.
  Also `E:\SDAIA\New folder\files2\expert_ai_engineer_ar.md`, `files3\chapter3_infrastructure_ar.md`,
  `files (3)\chapter4_security_governance_ar.md` (clean Arabic, older reference; secondary).
- Do not invent facts, numbers, official names or dates that are not in the sources. SDAIA/PDPL names must be
  exact (official Arabic names). Where the source flags something as unverified, say so.

## Coverage rule (most important)

Every numbered subsection of your assigned source range must be taught in the unit — merged or regrouped is
fine, dropped is not. Keep every decision table, threshold, formula, worked calculation, distractor/trap and
"pattern behind correct answers" that the source gives, because the exam tests exactly those. List the source
subsection ids you covered in `coverage`.

## Unit schema

```json
{
  "num": 2,
  "title": "Arabic unit title",
  "english": "English unit title",
  "subtitle": "one-line Arabic subtitle (like «من المفاهيم الأساسية إلى …»)",
  "domain": "المحور 1 · 17.3%",            // exam domain + weight, or "يخدم كل المحاور" for unit 1 / 12
  "deliverable": "one Arabic line: what the learner can do after this unit (shown on the landing ledger)",
  "intro": "Arabic paragraph: what this unit builds and why it matters in the exam",
  "outcomes": ["5–7 Arabic outcomes, each starting with a verb in masdar form like the reference: «تمييز …», «حساب …»"],
  "method": "Arabic paragraph: how to study this unit (طريقة الدراسة)",
  "chapters": [
    {
      "title": "chapter title (3–4 chapters per unit)",
      "sections": [
        { "title": "1.1 numbered section title (number within the unit: chapter.section)",
          "blocks": [ BLOCK, ... ] }
      ]
    }
  ],
  "lab": {
    "purpose": "Arabic sentence: the goal of the applied exercise",
    "scenario": ["paragraphs of a realistic exam-style scenario (Saudi workplace context is welcome)"],
    "steps": ["ordered solution walk-through steps that apply the unit's method to the scenario"],
    "traps": ["4–6 exam traps / distractor families relevant to this unit"],
    "deliverable": "Arabic sentence: what the learner should be able to produce/decide at the end"
  },
  "review": [ {"q": "Arabic question", "a": "Arabic explained answer (1–3 sentences)"} ],   // 8–10 items
  "summary": "Arabic paragraph: the unit's mastery criterion",
  "coverage": ["2.1", "2.2", "..."]
}
```

### BLOCK types (inline text may use **bold**; no HTML, no markdown other than **bold**)

- `{"p": "Arabic paragraph"}`
- `{"ul": ["item", ...]}` / `{"ol": ["item", ...]}`
- `{"table": [["header1","header2"], ["cell","cell"], ...]}` — first row is the header
- `{"formula": "LTR formula or calculation line, e.g. cos(a,b) = (a · b) / (||a|| ||b||)"}`
- `{"quote": "a short rule worth remembering (rendered as a highlighted pull-quote)"}`
- `{"code": "multi-line code\nif genuinely useful (rare — the exam has no coding)"}`
- `{"h": "a sub-heading inside a section (h4)"}`

Size guide: depth over brevity — a unit is usually 3–4 chapters × 4–7 sections, each section 2–6 blocks.
Write natural Arabic (فصحى معاصرة), not a word-for-word translation. Prefer Western digits (0–9) for
numbers and formulas.
