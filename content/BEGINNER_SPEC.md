# Beginner layer spec

The learner is a **complete beginner in AI** (knows how to use a computer and the internet, nothing more). They
want to *understand first*, then practise questions. The existing unit files
`E:\SDAIA\study_site\content\units\NN.json` are exam-dense (see `content/SPEC.md` for their schema). **Do not
edit them.** For each unit you are given, write an overlay file `E:\SDAIA\study_site\content\beginner\NN.json`
that adds a plain-language layer on top of every section.

## Overlay schema

```json
{
  "before": ["2–4 Arabic paragraphs «قبل أن تبدأ»: what this unit is about in everyday words, why an AI engineer cares, and which ideas from earlier units it builds on"],
  "sections": {
    "1.1": {
      "simple": ["1–3 short Arabic paragraphs «الفكرة ببساطة»: explain the section's idea from zero, as to a smart person with no technical background. Use an everyday analogy (a restaurant, a library, a bank queue, a school exam…). No unexplained jargon."],
      "example": "one Arabic paragraph «مثال من الواقع»: a concrete, small, everyday or Saudi-workplace example showing the idea working (with simple numbers if the section has numbers — walk the arithmetic step by step)",
      "terms": [ {"ar": "الاستدعاء", "en": "Recall", "def": "Arabic definition in 1–2 plain sentences, then (if useful) what it is NOT or how it differs from a close term"} ]
    }
  }
}
```

- Keys of `sections` are the section numbers exactly as they prefix the section titles in the unit file
  ("1.1", "1.2", … "4.6"). **Every section of the unit must have an entry** — check against the unit file.
- `terms`: every technical term, abbreviation or acronym that the section's existing text uses and a beginner
  would not know (typically 3–7 per section). Define each term once per unit — in the first section that
  uses it; later sections may skip it. Abbreviations: expand them (e.g. "RAG — Retrieval-Augmented Generation:
  التوليد المعزَّز بالاسترجاع").
- Read each section's existing blocks (tables, formulas) before writing, so the simple layer prepares the reader
  for exactly what follows. When a section has a formula or a calculation, the `example` should walk a tiny
  version of it in words, step by step.
- Accuracy: plain does not mean wrong. Do not invent facts, official names or numbers; analogies must not
  mislead (say where an analogy stops working if it matters).
- Arabic: clear modern standard Arabic, short sentences, English term in parentheses on first use only.
  **bold** is allowed for the key idea. No HTML.
- Validate with `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>` and check that
  the set of keys equals the unit's section numbers.
