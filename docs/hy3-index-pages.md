# HY-3 task — rebuild resource index pages as stitch card grids

```
ROLE: Rebuild the calculator-index and comparison-index pages to match their stitch designs (structured
card grids), replacing the current legacy body-blob prose. FIRST read frontend/AGENTS.md.

REPO ROOT: C:/Users/Dell/Github/Construction-Management-ERP-Software
STAGING OUTPUT: docs/hy3-output/indexes/ (changed files + NOTES.md with target src paths + wiring notes).

CURRENT PROBLEM: /resources/construction-calculators and /resources/feature-comparisons render via
frontend/src/components/resources/ResourceIndexProse.tsx (scraped body HTML in `.help-article`), NOT the
stitch card grid. Also check /resources (app/resources/page.tsx) — if it is legacy prose, rebuild it too;
if it is already a proper hub, leave it.

STITCH REFERENCES (read screenshot + code.html):
- Calc index:  temp-stitch/stitch_siteflow_erp_resources_page/sub-pages/stitch_siteflow_erp_resourcesconstruction-calculators_page/
- Comparison index: temp-stitch/stitch_siteflow_erp_resources_page/sub-pages/stitch_siteflow_erp_resourcesfeature-comparisons_page/
- Resource hub: temp-stitch/stitch_siteflow_erp_resources_page/main resource/
Design cues: serif H1 + subhead, filter/category pills, a grid of cards (each: icon/eyebrow, title linking
to the sub-page, short description), FAQ accordion, blue CTA band. The comparison index also has a
"Competitor Landscape" capability-matrix table. DROP the fabricated "Platform Selection Index 9.2/10" and
"Estimation Safety 9.8" cards (invented metrics) — keep the useful structure without the fake numbers.

BUILD: structured index components (reuse existing FaqAccordion, CtaBand, DataTable, and the stroke-icon set).
Derive the card lists from the ACTUAL content items (getContentItems("resources") filtered by section), so
titles/links stay in sync. Wire so /resources/construction-calculators and /resources/feature-comparisons
render the new components instead of ResourceIndexProse (keep the catch-all fallback for other slugs).

HARD RULES: blue Alexandria, no purple; ZERO fabricated metrics (no 9.2/10, 9.8, no invented counts); no em
dashes; monochrome stroke icons only (no emoji); brand SiteFlow; TypeScript strict; must build. Cards must
link to the real existing sub-pages.

VERIFY: build green; each index returns 200 with a card grid (not .help-article), correct links to real
sub-pages, FAQ + CTA present, no fabricated numbers. REPORT: files (target paths), how card lists are
derived, wiring, any gaps.
```
