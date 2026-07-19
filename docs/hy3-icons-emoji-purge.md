# HY-3 task — monochrome stroke icons everywhere, purge all emojis

```
ROLE: Replace ALL emoji with monochrome stroke icons across the marketing frontend, and give the Help
Center category grid a proper stroke-icon set. FIRST read frontend/AGENTS.md.

REPO ROOT: C:/Users/Dell/Github/Construction-Management-ERP-Software
STAGING OUTPUT: docs/hy3-output/icons/ (all changed files + NOTES.md mapping each to its target src path).

CONTEXT: The site uses a stroke-icon style (24px viewBox, currentColor stroke, strokeWidth 2) — see
frontend/src/components/marketing/product/icons.tsx (ProductIcon) and frontend/src/components/marketing/Icon.tsx.
Emojis must NOT appear anywhere in the UI. The Help Center (frontend/src/app/help/page.tsx +
HelpSearchClient.tsx) currently uses emoji for the 15 category cards and a 📖 in the eyebrow — replace them.

TASKS:
1. Build a stroke-icon set for the 15 help categories (a HelpIcon component in frontend/src/app/help/, OR
   extend the existing ProductIcon set — your call, keep the SAME visual style: 24px, none-fill, currentColor
   stroke, strokeWidth ~2, rounded caps). One distinct, tasteful glyph per category:
   getting-started, attendance-payroll, billing-invoicing, budgeting-cost-control, company-features,
   crm-leads, design-files, finance-transactions, mobile-app, procurement-warehouse, project-management,
   reports, settings-configuration, tasks-to-dos, user-management.
2. In help/page.tsx change CATEGORY_META `icon` values from emoji to icon KEYS; in HelpSearchClient render
   <HelpIcon name={...}/> inside a subtle rounded chip (bg-alx-primary-fixed/40, text-alx-primary) matching
   the product FeatureBlock icon-chip style. Remove the 📖 from the eyebrow (use a small stroke icon or nothing).
3. SWEEP the whole frontend for any other emoji in UI copy/components (grep the src tree for emoji characters)
   and replace each with an appropriate stroke icon or remove it. Report every emoji found + how it was handled.

HARD RULES: monochrome stroke icons only, style-consistent with ProductIcon; blue alx- tokens; no fabricated
metrics; no em dashes; TypeScript strict; must build. Do not change copy meaning.

VERIFY: build green; /help renders category cards with stroke icons; grep the rendered /help HTML for emoji
returns none. REPORT: files changed (target paths), the 15 category glyphs chosen, every emoji found+removed.
```
