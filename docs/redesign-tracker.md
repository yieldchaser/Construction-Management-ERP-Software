# SiteFlow marketing redesign — master tracker

Single source of truth so nothing is forgotten. Order does NOT matter; ALL of this ships.
Every page must **match or exceed** its stitch reference in `temp-stitch/` (main checkout).

## Global rules (apply to EVERY page)
- **Blue Alexandria light theme** using `alx-` tokens. Stitch is purple — convert to blue.
- **ZERO fabricated metrics.** Kill every invented number: `98.2%`, `10x`, "billions in project value",
  "500+/thousands of…", and the comparison `9.8/10 vs 7.5` scores. Convert stats → qualitative value-props.
- **Comparison scores DROPPED** (founder decision) — keep the feature matrix only (check / dash / "Native ERP").
- **Do NOT copy stitch export glitches:** mirrored/reversed text ("expand_more"), stray `arrow`/`filter_list`
  tokens, overlapping labels, or the "ConstructCRM" branding slip. Brand is always SiteFlow.
- **Mini-UI cards are in-code CSS components**, NOT images (crisp, no expiring URLs). Only true images =
  hero product screenshots, calculator illustration diagrams, blog hero photos, house render.
- **Images are LAST** — build with clean image slots; wire real images after everything else.
- No em dashes in body copy (founder pref).

## Templates to build (I design/spec; coder implements; verifier checks)
- [ ] **Shared component library** — StatStrip, FAQAccordion, DataTable, FeatureBlock (text↔mini-UI),
      mini-UI cards (ticket, checklist, statusList, progressBars, lineChart, ganttBars, dependencyGraph,
      ledgerRow), light CalculatorConsole, ComparisonMatrix, EditorialReadingShell, CTABand, HeroWithImage.
- [~] **Product `[slug]`** (×20) — PILOT DONE + verified (construction-erp-software live via structured schema;
      component library built under components/marketing/product/). Hardening TODO on rollout: hero `<img>` alt
      when real image lands; guard FeatureBlock icon type assertion. Remaining 19 = HY-3 content fill.
      full structured port. hero+image / 3 qualitative stats / 2-3 feature
      blocks / optional persona cards / data table / FAQ / CTA. NEW structured JSON schema (below).
- [~] **Calculator `[slug]`** (×7) — PILOT DONE + verified. CalculatorTools console restyled LIGHT (shared,
      compute math untouched); structured calc template (CalcArticle/CalcGuide) w/ formula strip, guide,
      reference table, FAQ, CTA; concrete-mix migrated, India/GCC bloat dropped. Remaining 6 = HY-3 fill.
      Cleanup TODO: orphaned legacy `body` in migrated calc JSON. Original:
      restyle `CalculatorTools` to LIGHT console; formula/factor strip;
      how-to steps (numbered, image slots); reference table; FAQ; CTA. Rip out the black console + the
      bloated India/GCC rate panels that aren't in stitch. Keep real compute logic.
- [~] **Comparison `[slug]`** (×6) — PILOT DONE + verified + pushed (8841ed1). SiteFlow-vs-buildern: scores
      dropped, matrix (check/en-dash/chip), verdict cards, blue CTA; dead body stripped; metaDescription fixed.
      Remaining 5 = HY-3 fill. Original spec:
      hero / dual verdict cards (NO numeric scores) / "Two Approaches"
      mock consoles / "What is X/Y" / module comparison matrix / FAQ / CTA (blue, not purple).
- [ ] **Index pages** — products, construction-calculators, feature-comparisons, resources hub. Light card grids.
- [ ] **Glossary** — A-Z searchable (preview built). ADD: hero image slot + "Featured terms" band
      (4 ERP-linked accordions) above the full 200-term A-Z, to match stitch's featured treatment.
- [~] **Blog article shell** (×130) — IN PROGRESS (coder building BlogArticle: byline, hero band, auto TOC,
      blue newsletter card, closing CTA; applies to all posts, no per-file migration). Original spec:
      editorial reading template: hero image, byline, sticky TOC sidebar,
      newsletter capture card, section headings, pull-quotes, formula/callout blocks, mid-article CTA.
- [ ] **Blog index** — featured-report card, digest panel, category filter pills, image article cards, newsletter band.
- [ ] **Help center** — search hero + category grid; + help-article reading shell (reuse blog shell).

## Discrete fixes
- [ ] **Legal alignment bug** — privacy/terms H1 + LEGAL chip hang left of content column. Share one container.
- [ ] Glossary: place `construction-erp-glossary-200.md` into content pipeline (after preview approved).

## Placement / housekeeping
- [ ] Move `Long Screenshots of current state of website/` → gitignored recon folder (confirm path w/ founder).
- [ ] Confirm `construction-erp-glossary-200.md` staging location.

## Product JSON schema (pilot — HY-3 fills this)
```
{ ...existing title/slug/metaTitle/metaDescription/category,
  hero:      { eyebrow, headline, subhead, checklist[0-3], heroImageSlot: "<path>|null" },
  stats:     [ x3 { value (QUALITATIVE, no number), caption } ],
  features:  [ x2-3 { icon, title, body, bullets[], mock:{ type, data } } ],
  personas:  [ x0-3 { title, body } ],
  dataTable: { title, subtitle, columns[], rows[][] },
  faqs:      [ x2-4 { q, a } ],
  cta:       { heading, body } }
```
mock.type ∈ ticket|checklist|statusList|progressBars|lineChart|ganttBars|dependencyGraph|ledgerRow

## HY-3 handoff status
- Product content-extraction prompt: READY (see session / below). Runs AFTER product template + schema land.
- Later HY-3 batches: calculators data, comparison matrices, 130 blog → shell field mapping, help articles.

## Per-page checklist (all must reach parity)
Products (20): construction-erp-software · construction-project-management · construction-project-planning ·
construction-progress-tracking · construction-quality-management · construction-equipment-management ·
construction-labour-management · construction-production-management · construction-design-management ·
construction-financial-management · construction-budgeting-cost-control · construction-procurement-management ·
construction-supply-chain-management · sub-contractor-management · crm-for-construction ·
client-invoicing-software · vendor-billing-software · best-material-management ·
reports-analytics-software · whats-new-in-SiteFlow-erp
Calculators (7): concrete-mix · concrete-volume · steel · bar-bending-schedule · brick · paint-quantity · house-construction-cost
Comparisons (6): SiteFlow-vs-buildern · -buildertrend · -fieldwire · -raken · powerplay-vs-SiteFlow · (procore/rdash/nway per content)
Indexes (4): /products · /resources · /resources/construction-calculators · /resources/feature-comparisons
Legal (2): /privacy · /terms
Glossary (1) · Blog index (1) · Blog articles (~130) · Help center + articles (~40)

_Status: recon COMPLETE (every stitch screen reviewed). Pilot = product template + component library._
