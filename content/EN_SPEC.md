# English edition spec — translating the study platform

The site has an Arabic edition (`content/units`, `content/beginner`, `content/glossary.json`, `content/guide.json`)
and is getting an English edition built from **mirror files** under `content/en/` with the **identical path**:
`content/units/07.json` → `content/en/units/07.json`, `content/beginner/07.json` → `content/en/beginner/07.json`, etc.
Never edit the Arabic files.

The reader is a professional preparing for SDAIA's **Expert AI Engineer** badge exam who prefers English. The
English must read as if it had been written in English by a senior ML/LLM engineer who writes exam-prep material:
precise, calm, operational, no hype, no filler. It is a **faithful translation, not a rewrite**: every claim,
number, threshold, condition, caveat, example, trap and nuance of the Arabic must be present, nothing added.

## Structure (machine-checked — `node tools/check-en.js units/07.json beginner/07.json`)

The English file is the Arabic JSON with every Arabic string translated in place. Therefore:

- Same keys, same nesting, same array lengths and order, same block types (`p`, `ul`, `ol`, `table`, `h`, `quote`,
  `formula`, `code`). A table keeps exactly its rows and columns. Do not merge or split paragraphs or list items.
- Strings that contain no Arabic (formulas, code, `english`, `coverage`, `en` fields, numbers) are copied **byte-for-byte**.
- Fields named `ar` (in `terms` lists and the glossary) stay in Arabic, unchanged — the English edition shows the
  Arabic equivalent beside each term on purpose.
- Section titles keep their number prefix: `"2.3 المقاييس…"` → `"2.3 Metrics…"`.
- Every number in the Arabic must appear **as digits** in the English (Arabic-Indic digits → Western digits; `٪` → `%`,
  `٤٤٫٧` → `44.7`). Write "26 of 150 items", not "twenty-six". You may add digits, never lose one.
- URLs unchanged. Keep `**bold**` on the same idea it marks in the Arabic (same number of `**` pairs).
- No Arabic letters or Arabic punctuation (`« » ، ؛ ؟ ٪`) anywhere except `ar` fields — with one exception: when the
  Arabic itself is the example being taught (an Arabic word being tokenised, a diacritic, a dialect phrase, a kashida),
  keep it, wrapped as `[[ar:والمستشفيات]]`, and add the English gloss next to it: `the single word [[ar:والمستشفيات]]
  (“and the hospitals”)`. The build renders it as right-to-left Arabic. Never use this to skip translating prose.
- Unit files: `title` becomes the English title (use the value of `english` unless that clearly fits worse);
  `english` is copied unchanged. `domain` "المحور 1 · 17.3%" → "Domain 1 · 17.3%"; "يخدم كل المحاور" → "Serves all domains".

The check must end with **0 errors**. Review every WARN: a length-ratio warning means re-read that string against
the Arabic for an omission; a bold warning means fix the bold placement unless English grammar truly forces a merge.

## Terminology (most important for exam precision)

The Arabic content was originally written *from an English source*. That source is the ground truth for English
wording — the exam is written in it. Before translating a unit, open the matching English source and use its terms
and phrasings:

- English source: `E:\SDAIA\Exam_Simulator\_work\src\chNN_*.txt` (bilingual extraction: **only the English lines
  are usable**; the Arabic in those files is garbled). Each unit's `coverage` array lists the source subsection ids
  (e.g. `"2.3"`, `"Case 4"`); grep the source for them. Section line index: `E:\SDAIA\Exam_Simulator\_work\SECTION_INDEX.md`.
  Chapter map: unit 01 ← ch01, 02–03 ← ch02, 04–05 ← ch03, 06 ← ch04, 07 ← ch05, 08 ← ch06, 09–10 ← ch07,
  11 ← ch08 + ch09, 12 ← ch10; unit 00 (beginner primer) has no direct source — use ch12_glossary / ch11_cheatsheet terms.
- Arabic text already carries the English term in parentheses: «الاستدعاء (Recall)» → just "recall" (drop the
  duplicated parenthesis). Use that exact English term every time the Arabic term recurs.
- `content/glossary.json` (`ar` ↔ `en`) and `E:\SDAIA\Exam_Simulator\question_bank.json` (`topic/stem/options/explanation`
  `.en` ↔ `.ar`) are reviewed bilingual pairs — search them for any term you are unsure of.
- Fixed renderings: سدايا → SDAIA; نظام حماية البيانات الشخصية → the Personal Data Protection Law (PDPL);
  مكتب إدارة البيانات الوطنية → the National Data Management Office (NDMO); الهيئة الوطنية للأمن السيبراني →
  the National Cybersecurity Authority (NCA); مبادئ أخلاقيات الذكاء الاصطناعي → the AI Ethics Principles; بوابة أذكى X → "the official SDAIA badge portal" (no verified English
  spelling of the platform name exists — do not transliterate it); شارة → badge; مهندس الذكاء الاصطناعي الخبير →
  Expert AI Engineer; جهة التحكم / صاحب البيانات / جهة المعالجة → controller / data subject /
  processor. Any other official Saudi name: use the English form in the source; if the source has none, keep the
  form used in the question bank; never invent one.
- Recurring labels: المحور → Domain; الوحدة → Unit; الفصل → Chapter; القسم → Section; المحاكي → the exam simulator;
  المسرد → the glossary; المشتت → distractor; الخيار → option; المتطلبات الصارمة/المرنة → hard/soft requirements;
  الحل الكافي الأرخص → the cheapest sufficient solution; فخ → trap; السبب الجذري → root cause; الكمون → latency;
  الإنتاجية → throughput; الانجراف → drift; التسريب → leakage; العتبة → threshold.
- Cross-references to labelled boxes use the English labels: «الفكرة ببساطة» → "In Plain Terms"; «مثال من الواقع» →
  "Real-World Example"; «تعريفات هذا القسم» → "Key Terms"; «قبل أن تبدأ» → "Before You Start"; «التطبيق العملي» →
  "Applied Scenario"; «فخاخ الامتحان» → "Exam Traps"; «طريقة الدراسة» → "How to Study This Unit";
  «مخرجات التعلم» → "Learning Outcomes"; «خلاصة الوحدة» → "Unit Summary".

## Style

- **British English** (behaviour, optimise, modelling, analyse, organisation) — the exam source and question bank use it.
- Arabic «quotes» → “curly double quotes”. Arabic comma lists and long chained clauses → natural English sentences,
  but do not drop a clause. Arabic emphatic repetition may be tightened only if no information is lost.
- Imperative instructions stay imperative ("Diagnose the data before touching the model."). Outcomes (Arabic masdar
  «تمييز …», «حساب …») → bare-infinitive verbs: "Distinguish …", "Calculate …".
- Saudi-workplace examples, riyal amounts (ريال → SAR), Saudi entities and in-Kingdom hosting stay exactly as they are —
  they are content, not localisation.
- Arabic-language-specific remarks (e.g. about Arabic tokenisation or dialects) are content: translate them.
- Do not "correct" the technical content. If you believe the Arabic contains a factual error, translate it faithfully
  and report it (file, path, why) in your final report instead.

## Working method (large files)

A unit is 30–110 KB. Do not try to write a whole file in one tool call. Write it in pieces, e.g. one JSON file per
chapter in your scratch folder (`content/en/_parts/<file>/…`), then assemble with a short `node -e` script that
builds the exact original shape, writes `content/en/<path>` and deletes `_parts/<file>`. Then run the check and fix
until 0 errors. Finally re-read your English start to finish once, as an English reader, for fluency and
terminology consistency.
