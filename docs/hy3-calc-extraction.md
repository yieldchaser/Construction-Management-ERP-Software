# HY-3 task — calculator structured-content extraction (BATCHED + RESUMABLE)

Same pattern as the product task. Fills the surrounding page sections for each calculator.
The interactive console itself (compute logic) already exists in code — HY-3 only supplies the
structured sections around it. Output → `docs/hy3-output/calculators/<slug>.json` + `_progress.json`.

```
ROLE: Extract structured content for SiteFlow CALCULATOR pages. Batches of 3. Resume from a ledger.
Do ONE batch per run, then STOP. Output DATA only.

REPO ROOT: C:/Users/Dell/Github/Construction-Management-ERP-Software
OUTPUT DIR (create if missing): docs/hy3-output/calculators/
LEDGER: docs/hy3-output/calculators/_progress.json  = { "done": [...], "failed": [...] }
BATCH SIZE: 3

RESUME:
1. If ledger missing, create { "done": ["concrete-mix-calculator"], "failed": [] } (already migrated).
2. REMAINING = FULL_LIST minus ledger.done. If empty -> report ALL DONE, STOP.
3. THIS_BATCH = first 3 of REMAINING.

FULL_LIST (6 remaining):
  concrete-volume-calculator
  steel-calculator-for-construction
  bar-bending-schedule-calculator
  brick-calculator-for-wall
  paint-quantity-calculator
  house-construction-cost-calculator

FOR EACH slug:
a. Read stitch design: temp-stitch/stitch_siteflow_erp_resources_page/sub-pages/stitch_siteflow_erp_resourcesconstruction-calculators<slug>_page/{screen.png, code.html}
b. Read existing content: frontend/src/content/resources/construction-calculators/<slug>.json
c. Build the `calcStructured` object (SCHEMA below).
d. Write the COMPLETE JSON (all existing fields UNCHANGED + new `calcStructured`) to docs/hy3-output/calculators/<slug>.json
e. Append slug to ledger.done, SAVE ledger immediately.
AFTER BATCH: report done/remaining, STOP.

SCHEMA (calcStructured):
{
  "hero": { "subhead": "", "points": ["","",""] },
  "formulaStrip": [ {"value":"","caption":""}, {..}, {..} ],
  "guide": [ {"title":"","body":"","imageSlot": null} ],
  "referenceTable": { "title":"", "subtitle":"", "columns":["",""], "rows":[["",""]] },
  "faqs": [ {"q":"","a":""} ],
  "cta": { "heading":"", "body":"" }
}
- hero.subhead: describe what the tool ACTUALLY does (grade/volume/etc). hero.points: 2-3 accurate proof points.
- formulaStrip: EXACTLY 3 real engineering constants/factors (e.g. steel W=D^2/162, density 7850 kg/m3, IS-code
  values). These are legitimate constants, NOT marketing metrics.
- guide: 2-4 numbered steps grounded in how the real calculator works. imageSlot ALWAYS null.
- referenceTable: a real reference table from the stitch design (grade table, bar weights, coverage rates, etc).
- faqs: 2-4 from the stitch FAQ section.

HARD RULES:
- The calculator INPUTS/OUTPUTS are fixed in code — describe them accurately. Do NOT invent inputs the tool
  lacks (e.g. no slab/column/beam tabs unless the tool has them). If unsure, keep the subhead generic-but-true.
- ZERO fabricated marketing metrics. Real IS-code constants are fine.
- No em dashes. No stitch glitches (mirrored text, stray tokens, ConstructCRM). Brand = SiteFlow.
- Do NOT touch styling/components. Valid JSON only, no markdown fences.
REPORT: slug -> #guide steps / #faqs, ledger path.
```
