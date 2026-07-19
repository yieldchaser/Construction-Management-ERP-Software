# HY-3 task — product structured-content extraction (BATCHED + RESUMABLE)

Paste everything in the fenced block below into HY-3. It does ONE batch of 5 products, saves
output where the main agent can read it, updates a progress ledger, then STOPS. Run it again
to do the next batch. Repeat until it reports ALL DONE (4 runs total: 5+5+5+4).

Output the main agent reads back: `docs/hy3-output/products/<slug>.json` + `_progress.json`.

---

```
ROLE: Extract structured marketing content for SiteFlow PRODUCT pages. You work in BATCHES and
you RESUME from a ledger. Do exactly ONE batch per run, then STOP. Output DATA only — never touch
styling, theme, or component code.

REPO ROOT (all paths below are relative to this):
C:/Users/Dell/Github/Construction-Management-ERP-Software

OUTPUT DIR (create if missing): docs/hy3-output/products/
LEDGER FILE: docs/hy3-output/products/_progress.json
  shape: { "done": ["<slug>", ...], "failed": [ { "slug": "...", "reason": "..." } ] }
BATCH SIZE: 5

=== RESUME LOGIC (do this first, every run) ===
1. If the ledger file does not exist, create it as: { "done": ["construction-erp-software"], "failed": [] }
   (construction-erp-software is already migrated — never redo it.)
2. Read the ledger. REMAINING = FULL_LIST (below) minus ledger.done.
3. If REMAINING is empty: write nothing, report "ALL DONE", STOP.
4. THIS_BATCH = first 5 slugs of REMAINING (fewer if <5 left).

FULL_LIST (19 remaining product slugs):
  SiteFlow-construction-supply-chain-management-software
  best-material-management-software
  client-invoicing-software-for-construction
  construction-budgeting-cost-control-software
  construction-design-management-software
  construction-equipment-management-software
  construction-financial-management-software
  construction-labour-management-software
  construction-procurement-management-software
  construction-production-management-software
  construction-progress-tracking-software
  construction-project-management-software
  construction-project-planning-software
  construction-quality-management-software
  crm-for-construction
  reports-analytics-software-for-construction-projects
  sub-contractor-management
  vendor-billing-software-for-construction
  whats-new-in-SiteFlow-erp

=== FOR EACH slug IN THIS_BATCH ===
a. Read the stitch reference (the design to match):
     temp-stitch/products page & its sub-pages/sub-pages/stitch_siteflow_erp_products<slug>_page/screen.png
     temp-stitch/products page & its sub-pages/sub-pages/stitch_siteflow_erp_products<slug>_page/code.html
   (The folder is literally "stitch_siteflow_erp_products" + the slug + "_page". Read BOTH the
   screenshot and the html — extract the real section copy, feature themes, table rows, FAQs.)
b. Read the existing content JSON for real product facts:
     frontend/src/content/products/<slug>.json
c. Build the `structured` object per SCHEMA below, grounded in the stitch design + real SiteFlow facts.
d. Write the COMPLETE product JSON (ALL existing fields UNCHANGED + the new `structured` key) to:
     docs/hy3-output/products/<slug>.json
   Valid JSON only. No markdown fences, no comments.
e. Immediately append <slug> to ledger.done and SAVE the ledger (so a crash mid-batch still resumes).
   If a slug fails, add { slug, reason } to ledger.failed and move on.

=== AFTER THE BATCH ===
Report: the slugs done this run, running total done/remaining, and the absolute path of the output dir.
Then STOP. Do NOT start the next batch.

=== SCHEMA (the `structured` object) ===
{
  "hero":      { "eyebrow": "", "headline": "", "subhead": "", "checklist": ["", "", ""], "heroImageSlot": null },
  "stats":     [ { "value": "", "caption": "" }, {..}, {..} ],
  "features":  [ { "icon": "", "title": "", "body": "", "bullets": ["",""], "mock": { "type": "", "data": {} } } ],
  "personas":  [ { "title": "", "body": "" } ],
  "dataTable": { "title": "", "subtitle": "", "columns": ["",""], "rows": [ ["",""], ["",""] ] },
  "faqs":      [ { "q": "", "a": "" } ],
  "cta":       { "heading": "", "body": "" }
}
- hero.checklist: 0-3 short proof points. heroImageSlot: always null (real images wired later).
- stats: EXACTLY 3. value is a QUALITATIVE phrase, NEVER an invented number/%/multiplier/currency.
- features: 2-3. icon ∈ architecture | receiptLong | resources | checkCircle | chart | gantt | nodes | checklist | ticket
- mock.type ∈ statusList | checklist | ticket | progressBars | lineChart | ganttBars | dependencyGraph | ledgerRow
    mock.data shape by type:
      statusList / checklist / ticket → { "title": "", "rows": [ { "label": "", "status": "" } ] }
      progressBars                    → { "title": "", "rows": [ { "label": "", "percent": 0 } ] }
      ledgerRow / (lineChart/gantt/nodes) → { "title": "", "rows": [ { ... } ] }  (illustrative sample rows OK inside widgets/tables)
- personas: 0-3 (only if the stitch page has a "Built for X" band).
- dataTable: realistic SAMPLE rows drawn from the stitch design (project codes, ₹ values). Mark nothing as a real headline metric.
- faqs: 2-4, from the stitch FAQ section.

=== HARD RULES ===
- ZERO fabricated headline metrics. Stitch's "98.2%", "10x", "billions", "500+" are INVENTED —
  replace stat values with qualitative value-props (e.g. "One connected workspace", "BOQ-linked to every bill").
- Do NOT copy stitch export glitches: mirrored/reversed text, stray "arrow"/"filter_list"/"expand_more"
  tokens, or the "ConstructCRM" branding slip. Brand is always SiteFlow.
- Ground copy in real SiteFlow features (BOQ, DPR, RA bills, GST/TDS, geofenced attendance, Tally/Zoho).
- No em dashes in any copy. Output valid JSON only. Do NOT edit styling/theme/components.
```

---

## Main-agent integration (what I do after each HY-3 batch)
1. Read `docs/hy3-output/products/*.json` (the batch) + `_progress.json`.
2. Validate each against the schema; spot-check for fabricated metrics / glitches.
3. Copy the validated `structured` block into the real `frontend/src/content/products/<slug>.json` in the worktree.
4. Build + verify (build green, curl the pages), commit, push to the Vercel branch.
