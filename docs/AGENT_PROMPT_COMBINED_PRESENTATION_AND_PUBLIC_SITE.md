# AGENT PROMPT: presentation defects and public site hygiene

**This file supersedes `AGENT_PROMPT_DATES_STOCK_LABELS.md` and `AGENT_PROMPT_PUBLIC_SITE_HYGIENE.md`.** Both were written but never run. Everything in them is here, plus two further defects found since. Run this one and ignore those two.

Ten items in two groups. Group A is the console, Group B is the public site. They do not overlap, so order does not matter, but do not interleave the commits: land Group A, then Group B.

Report as before: command, exit code, one sentence. No pasted output. "Not run" is acceptable.

---

# GROUP A: console presentation

## A1. The same date renders in two different formats

```
32 calls   toLocaleDateString()          browser locale, renders 7/1/2026 on a US-locale browser
15 calls   toLocaleDateString("en-IN")   renders 01 Jul 2026
```

Seen live in one session: the depreciation schedule shows `7/1/2026`, safety shows `26 Jul 2026`.

**Not cosmetic here.** `7/1/2026` is 7 January or 1 July depending on the reader, and these dates sit on bills, statutory filings, muster rolls and work orders. Two people reading the same screen in different browsers read a different date.

Add one shared date formatter beside `formatLabel` in `lib/siteflow.ts`. Format `DD Mon YYYY`, explicitly `en-IN`, never the browser default. Replace all 32 bare calls, and route the 15 explicit ones through the helper too so there is a single definition.

**Leave `<input type="date">` values alone.** Those must stay ISO.

Report the bare-call count before and after. It must reach 0.

## A2. Negative stock is hidden on one screen and shown on another

```
d/procurement/page.tsx:922,1126   Math.max(0, onHand - reserved)   clamps, shows 0
d/production/page.tsx:489         formatQty(item.available_qty)     shows -500 available
```

Live, `ZZ R8 Phantom Sand` reads **"-500 available"** on Production and would read 0 on Procurement.

**This reverses an earlier instruction of mine.** A previous prompt told you to clamp procurement with `Math.max(0, ...)`. That was the wrong call. Hiding a negative hides a broken ledger: a storekeeper who sees zero assumes an empty bin, one who sees minus 500 raises it.

**Show the true value on both screens. Remove the clamp from procurement.** When available stock is negative, render it in the danger tone with a short label saying the recorded stock is negative and needs reconciling. No blocking dialog, and no backend change.

Negative stock is reachable by design, because `enforce_stock_availability` is opt-in per company.

## A3. `formatLabel` mangles acronyms

`lib/siteflow.ts:98` maps known snake_case values and title-cases the rest, so a depreciation method stored as `slm` renders as **`Slm`**. It is SLM.

Add an acronym set that is upper-cased rather than title-cased, covering at least:

```
SLM  WDV  GST  IGST  CGST  SGST  TDS  PF  ESI  BOCW  HSN  SAC
PO   WO   GRN  RFQ   BOQ   NCR   DPR  RA   MOM  LTI   PPE  WBS  CPM
```

Check each against how the product already writes it in headings before adding. Do not invent expansions the product does not use.

## A4. The label helper is not applied everywhere

`p/[project_id]/three-way` renders a match status as a bare lowercase `pending`. The earlier run applied `formatLabel` to task statuses, entity types and planning records but not here.

Sweep for remaining raw renders of `status`, `type`, `state`, `priority` and `entity_type` and route them through `formatLabel`. The count was 70 sites; report it before and after. Single-word values still need the helper, because `pending` should read `Pending`.

## A5. The statutory year list expires

`d/statutory/page.tsx:140`:

```js
const YEARS = [2024, 2025, 2026, 2027];
const [genYear, setGenYear] = useState<number>(2026);
```

A hardcoded list on a statutory filing tool. In January 2028 nobody can file for 2028, and the default year is frozen at 2026 regardless of today's date.

Derive the range from the current date instead: a few years back for late filings and at least the current year forward. Default `genYear` to the current financial year rather than a literal. Keep the shape of the control the same.

## A6. A user cannot set their own display name

`backend/app/routers/auth.py:540` sets `name=email.split("@")[0]` when no name is supplied. So an account created that way is called `upadhyayprateek574`, and that string is what colleagues see in assignee dropdowns, DPR authorship, audit trails and delete logs.

**There is no way to change it.** `backend/app/routers/profile.py` exposes only `company_name`; nothing lets a user edit their own name.

Add it. A `name` field the signed-in user can update on their own profile, with the same permission pattern as its siblings, and a place in the UI to set it. Keep the email-local-part as the fallback for accounts that never set one; the defect is that it is permanent, not that it exists.

---

# GROUP B: public site

## B1. An internal developer page is live in production

`https://site-flow-omega.vercel.app/dev/icons` returns **200 to anyone**, unauthenticated, and prints internal source paths:

> INTERNAL DEVELOPMENT REFERENCE. Every icon in the stroke-icon set (`frontend/src/components/marketing/...`)

Its own comment says "Internal development reference only. Not linked from any user-facing navigation." **Not linked is not the same as not reachable.** The URL is short and guessable, and there is no `robots.txt` to discourage a crawler.

**Delete the route.** It was scaffolding for the emoji conversion, which finished long ago. Do not gate it behind an env check and do not move it.

Then report whether anything else exists under `src/app/dev/`, and whether any other route renders text containing "INTERNAL" or a `frontend/src/` path.

## B2. There is no robots.txt

`GET /robots.txt` returns **404** and no source file exists. Every crawler is free to index everything, including the console and the auth pages.

Add a `robots.ts`. Allow the marketing surface, disallow the application surface:

```
Disallow: /c/
Disallow: /login
Disallow: /onboarding
Disallow: /auth/
Disallow: /profile/
```

and point at the sitemap from B3.

## B3. There is no sitemap.xml

`GET /sitemap.xml` returns **404** and no source file exists.

This costs more here than on most products. The marketing site is a real content investment: a **200 term glossary**, a knowledge base, a blog, product pages, comparison pages and calculators, none of it offered to a crawler in a structured way.

Add a `sitemap.ts` emitting the public marketing routes including the dynamic ones already generated: `/blog/[slug]`, `/products/[slug]`, `/who-we-serve/[segment]`, `/resources/[...slug]`, `/help/[...slug]` and the glossary. Read how those slugs are enumerated at build time and reuse that source rather than hardcoding a list that will rot. Exclude whatever `robots.ts` disallows.

## B4. Seven public pages share one title and description

Fetched from production. Seven of twelve emit the root layout metadata verbatim:

```
/  /SiteFlow-pricing  /about  /contact  /who-we-serve  /help  /privacy  /terms
    all titled: SiteFlow | Premium Construction Management & Operations Portal
    all described: Next-generation site tracking, resource coordination, and re...
```

Five already do it properly and are the model to copy: `/products`, `/resources`, `/blog`, `/integrations` and the glossary.

**Pricing and help are the expensive ones.** They are the highest-intent pages on the site and both look identical to the homepage in a search result.

Give each a `metadata` export with a distinct title and a description written for that page.

**Do not touch the marketing help article JSON `body` fields.** They are rendered with `dangerouslySetInnerHTML` and parsed by `annotateHeadingsForToc()`, so editing the markup silently breaks the in-page table of contents. Title and description fields are safe; body is not.

---

# A correction to the record

An earlier prompt said `d/finance` and `p/[project_id]/finance` sit on "Loading transactions..." permanently. **That was wrong.** After 15 seconds the transactions load and render real invoices. The page is slow, not hung, and the previous run's sub-fetch isolation works. Do not spend time on it.

---

# Rules

- No authoring scripts.
- Semantic tokens only; use the existing danger tone for the negative stock case.
- Plain language. No endpoint paths, table names or permission keys in UI copy. No em dashes in prose.
- Group A changes no backend behaviour except adding the profile name field in A6.
- Group B touches the public site only. Do not change the console in those commits.
- Do not add tracking, analytics or third-party scripts.

# Definition of done

- [ ] Bare `toLocaleDateString()` calls: **32 to 0**, with one shared helper. Report both counts.
- [ ] Procurement no longer clamps; both screens show the same figure and a negative reads as a warning.
- [ ] `formatLabel` upper-cases the acronym set. State what `slm` renders as now.
- [ ] Raw status renders routed through `formatLabel`. Report count before and after.
- [ ] Statutory year range is derived from the current date, and the default year is not a literal.
- [ ] A user can set their own display name, and it is used where the name is shown.
- [ ] `/dev/icons` is gone. Report the HTTP status after deploy and whether any sibling dev route existed.
- [ ] `/robots.txt` returns 200 and disallows the five application paths.
- [ ] `/sitemap.xml` returns 200. Report how many URLs it contains.
- [ ] All twelve public titles listed, duplicates visibly gone.
- [ ] No marketing help article `body` field modified. Confirm with a diff summary.
- [ ] `python scripts/verification/check_route_reachability.py` reports **0 unreachable**, exemptions still 30.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. It is **1152 passed, 4 skipped** today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both run and both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 / 38 / 73 / 116.
- [ ] Design counts unchanged: raw palette 0, gradients 0, `hover:bg-white/N` 0, inline shadows 0, hand-rolled pills 13, with **one command covering all five**.
- [ ] **Commit and push to `origin/main`**, Group A and Group B as separate commits.
