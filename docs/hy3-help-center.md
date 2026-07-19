# HY-3 task — build Help Center index + article shell

```
ROLE: Build the SiteFlow Help Center (knowledge-base index + article reading shell) in the customized
Next.js frontend. FIRST read frontend/AGENTS.md + the relevant node_modules/next/dist/docs guide.

REPO ROOT: C:/Users/Dell/Github/Construction-Management-ERP-Software
STITCH REFERENCE: temp-stitch/stitch_siteflow_erp_help_page/{screen.png, code.html}
EXISTING CODE: frontend/src/app/help/page.tsx and frontend/src/app/help/[...slug]/page.tsx (upgrade these),
  frontend/src/content/help/*.json (or wherever help content lives — locate it), MarketingShell,
  frontend/src/components/blog/BlogArticle.tsx (REUSE its reading-shell pattern for help articles).
STAGING OUTPUT: docs/hy3-output/help/ (all created/changed files + NOTES.md mapping to target src paths).

DESIGN (blue Alexandria, alx- tokens, serif headings):
INDEX (/help):
- Search hero ("How can we help?") with a search input over help articles. Honest subhead.
- "Browse by Category" grid: one card per help category (icon, category name, count of guides, a few
  sub-links to top articles). Derive categories/counts from the ACTUAL help content — do not invent numbers.
- A "Contact Support" band at the bottom.
- DROP the stitch "Resolution Efficiency 94.2% / 1,200+ articles" card entirely (fabricated metrics).
ARTICLE (/help/<slug>): reuse the editorial reading shell (byline optional, serif H1, prose body via the
  existing .help-article class, auto TOC like BlogArticle, sidebar with related articles, closing CTA).

HARD RULES: blue not purple; ZERO fabricated metrics (real counts derived from content only); no em dashes
in copy you write; brand = SiteFlow; TypeScript strict; must build. Reuse existing components; do not
duplicate prose styling.

VERIFY: build green; /help and one /help/<real-slug> return 200 with the category grid / reading shell.
REPORT: files created (target paths), how categories+counts are derived, gaps.
```
