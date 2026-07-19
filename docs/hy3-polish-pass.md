# HY-3 task — per-page-TYPE polish pass (BATCHED, one type per run)

Polish is per TEMPLATE, not per instance — fixing a template propagates to every page that uses it.
No compromise on beauty. Match or surpass the stitch reference every time.

```
ROLE: Design-QA and polish ONE page-type per run against its stitch reference, then STOP. Resume from a ledger.
FIRST read frontend/AGENTS.md.

REPO ROOT: C:/Users/Dell/Github/Construction-Management-ERP-Software
STAGING OUTPUT: docs/hy3-output/polish/<type>/ (changed files + NOTES.md: target paths + a before/after list of
every fix made).
LEDGER: docs/hy3-output/polish/_progress.json = { "done": [...] }

PAGE-TYPES (do the first not-yet-done one, then STOP):
  product      -> frontend/src/components/marketing/product/* + one live page /products/construction-erp-software
  calculator   -> frontend/src/components/resources/CalcArticle,CalcGuide,CalculatorTools + /resources/construction-calculators/concrete-mix-calculator
  comparison   -> frontend/src/components/resources/comparison/* + /resources/feature-comparisons/SiteFlow-vs-buildern
  glossary     -> frontend/src/app/resources/glossary/* + /resources/glossary
  help         -> frontend/src/app/help/* + /help and one article
  blog         -> frontend/src/components/blog/BlogArticle + frontend/src/app/blog/page.tsx + one article
  legal        -> frontend/src/app/privacy,terms
  indexes      -> resource index pages

FOR THE CHOSEN TYPE:
1. Open its stitch reference screen(s) in temp-stitch/ and the live rendered page. Compare side by side.
2. Fix design nits WITHOUT changing the architecture: spacing/rhythm, type hierarchy and sizes, alignment,
   card padding/borders/shadows, hover/focus states, section dividers, empty-state handling, responsive
   behavior (mobile), consistent stroke icons (NO emoji), consistent CTA styling, balanced whitespace.
3. Ensure it MATCHES OR SURPASSES the stitch reference in polish. Keep blue Alexandria + all hard rules.
4. Append the type to the ledger, SAVE. STOP (one type per run).

HARD RULES: no fabricated metrics; no numeric comparison scores; no em dashes; monochrome stroke icons only;
blue not purple; no stitch export glitches; TypeScript strict; build stays green. Do NOT restructure data
schemas or break other page-types.

VERIFY: build green; the polished page renders 200; list the exact before/after fixes.
REPORT: type polished, files changed (target paths), before/after fix list, screenshots-worth-of-diffs described.
```
```
