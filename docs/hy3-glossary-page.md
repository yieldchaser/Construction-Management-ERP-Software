# HY-3 task — build the Construction & ERP Glossary page

Build a real Next.js glossary page from the 200-term source file, matching the approved design.
Write NEW/changed files to a staging dir the main agent will review + move into the worktree.

```
ROLE: Build the SiteFlow glossary page (A-Z, searchable) in the customized Next.js frontend.
FIRST read frontend/AGENTS.md + the relevant node_modules/next/dist/docs guide (this Next.js differs).

REPO ROOT: C:/Users/Dell/Github/Construction-Management-ERP-Software
SOURCE (200 terms): docs/construction-erp-glossary-200.md  (each entry = Term + definition,
  some cross-ref "See X", a few are SiteFlow-specific like Tally integration, PWA, geofenced attendance)
STAGING OUTPUT (write here, do NOT edit worktree src directly):
  docs/hy3-output/glossary/  (create it; put every file you create/change here, preserving the
  intended src path in the filename or a small README mapping, e.g. glossary_page.tsx, GlossaryClient.tsx,
  glossary-data.ts, plus a NOTES.md listing exact target paths under frontend/src/).

DESIGN (blue Alexandria light, alx- tokens, serif font-headline):
- Breadcrumb: Resources / Glossary.
- Eyebrow chip "200 TERMS · A-Z REFERENCE", serif H1 "Construction & ERP Glossary", honest subhead.
- A HERO construction PHOTO slot on the right of the header (image path prop; render a clean in-code
  placeholder band if no image yet, NOT a broken img).
- Sticky toolbar: a search input that LIVE-filters terms, + an A-Z pill rail; clicking a letter jumps to
  that section, typing filters across all terms and shows a result count. Disable letters with no matches.
- A "Formula Spotlight" card (Retention Money Release: R_held = P_certified x R_rate; R_net = R_held - D_deductions).
- A "Featured terms" band: ~4 cards for the SiteFlow-specific/ERP-linked terms (e.g. BOQ, DPR, Retention,
  RA Bill) with a small "In SiteFlow" chip and a short "how SiteFlow automates this" line (accordion optional).
- The FULL 200-term list grouped A-Z: each letter section has a big serif letter + rule + count, then term
  cards (serif term + definition; "In SiteFlow" chip on the genuinely product-specific ones; cross-refs
  like "See Variation Order" are clickable to filter to that term).
- Closing blue CTA (qualitative copy). NO fabricated metrics (NO "Join 500+ enterprises").
- Search/filter needs a small "use client" component; the 200-term data can be a generated TS/JSON module.

WIRE: add a route so the page renders at /resources/glossary (and/or keep /resources/construction-terms-meanings
pointing to it). Note the exact wiring in NOTES.md; the main agent will finalize routing.

HARD RULES: blue not purple; ZERO fabricated metrics; no em dashes in copy you write; brand = SiteFlow;
TypeScript strict; must build. Transcribe the 200 definitions faithfully from the source file.

VERIFY (in a scratch copy is fine): describe how search + A-Z filtering work and confirm the data module
parses all 200 terms. REPORT: files created (with target src paths), how many terms parsed, any gaps.
```
