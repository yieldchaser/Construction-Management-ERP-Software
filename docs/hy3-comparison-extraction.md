# HY-3 task — comparison structured-content extraction (BATCHED + RESUMABLE)

Fills the structured comparison template. SCORES ARE DROPPED (founder decision) — verdict cards keep
badge + tagline + proof points but NO number. Output → `docs/hy3-output/comparisons/<slug>.json` + `_progress.json`.

```
ROLE: Extract structured content for SiteFlow COMPARISON pages. Batches of 3. Resume from a ledger.
One batch per run, then STOP. Output DATA only.

REPO ROOT: C:/Users/Dell/Github/Construction-Management-ERP-Software
OUTPUT DIR (create if missing): docs/hy3-output/comparisons/
LEDGER: docs/hy3-output/comparisons/_progress.json = { "done": [...], "failed": [...] }
BATCH SIZE: 3

RESUME:
1. If ledger missing, create { "done": ["SiteFlow-vs-buildern"], "failed": [] } (already migrated).
2. REMAINING = FULL_LIST minus ledger.done. If empty -> report ALL DONE, STOP.
3. THIS_BATCH = first 3 of REMAINING.

FULL_LIST (7 remaining):
  SiteFlow-vs-buildertrend
  SiteFlow-vs-fieldwire
  SiteFlow-vs-raken
  powerplay-vs-SiteFlow
  SiteFlow-vs-procore
  rdash-vs-SiteFlow
  SiteFlow-vs-nway-erp

FOR EACH slug:
a. Stitch design (ONLY these 4 have one: buildertrend, fieldwire, raken, powerplay-vs-SiteFlow):
     temp-stitch/stitch_siteflow_erp_resources_page/sub-pages/stitch_siteflow_erp_resourcesfeature-comparisons<slug>_page/{screen.png, code.html}
   For procore / rdash / nway-erp there is NO stitch design — adapt the SAME structure using facts from the
   file's own existing `body` HTML (real modules/features/FAQs already there).
b. Read existing content: frontend/src/content/resources/feature-comparisons/<slug>.json
c. Build `comparisonStructured` (SCHEMA below) from real facts.
d. Write COMPLETE JSON to docs/hy3-output/comparisons/<slug>.json. Keep existing fields, but REPLACE the
   long scored `body` blob with a short plain-text summary (2-3 sentences, no scores, no HTML) since the
   structured block is now authoritative. Also correct `metaDescription` if it claims fabricated counts.
e. Append slug to ledger.done, SAVE ledger immediately.
AFTER BATCH: report, STOP.

SCHEMA (comparisonStructured):
{
  "hero": { "eyebrow":"", "headline":"SiteFlow vs X: Construction Software Comparison", "subhead":"", "chips":["","",""] },
  "verdict": [
    { "name":"SiteFlow", "badge":"", "tagline":"", "points":["","",""], "highlighted": true },
    { "name":"<Competitor>", "badge":"", "tagline":"", "points":["","",""], "highlighted": false }
  ],
  "approaches": [ { "label":"", "title":"", "body":"", "bullets":["",""], "mock": { "type":"statusList", "data": { "title":"", "rows":[ {"label":"","status":""} ] } } } ],
  "whatIs": [ { "name":"SiteFlow", "body":"", "bullets":["",""] }, { "name":"<Competitor>", "body":"", "bullets":["",""] } ],
  "matrix": { "groups": [ { "label":"PROJECT PLANNING & CONTROLS", "rows": [ { "capability":"", "siteflow":"check", "competitor":"dash" } ] } ] },
  "faqs": [ {"q":"","a":""} ],
  "cta": { "heading":"", "body":"" }
}
- verdict: EXACTLY 2, SiteFlow first (highlighted:true). NO score field, NO numbers in badge/tagline.
- matrix cell values: use the sentinels "check" (has it), "dash" (not available), or "chip:Label" for a
  short pill (e.g. "chip:Native ERP", "chip:Tally & Zoho"), or plain descriptive text ("Manual Mapping").
- approaches[].mock.type must be one of: statusList | checklist | ticket | progressBars (others render a
  placeholder). Keep mocks simple; illustrative labels only.

HARD RULES:
- NO numeric scores anywhere (no 9.1, 7.5, /10). NO fabricated metrics.
- No em dashes. No stitch glitches. Brand = SiteFlow. Blue theme is handled by the template, not you.
- Valid JSON only, no markdown fences.
REPORT: slug -> #matrix groups / #faqs, ledger path.
```
