# AGENT PROMPT — Launch closeout: live bugs, the bevel purge, help content, README

Paste this whole file as the task. Do not stop until the Definition of Done is met.

**This supersedes `docs/AGENT_PROMPT_HELP_AND_README.md`.** Parts 3 and 4 below are that document, unchanged in substance. Do Parts 1 and 2 first.

---

## Standing rules

**You do not stop between parts or phases.** One continuous run, Part 1 through Part 4 in order. Do not ask "shall I continue?", do not summarise and wait. A blocker surviving two independent attempts → record in `docs/BACKLOG.md` as a new `D-0xx`, skip it, **continue**.

**Report every phase, including unfinished ones.** Two previous rounds on this project reported phases complete when the counting command had not moved, and one summary table silently omitted the four rows that had not moved. An honest "Phase X: 30 → 12, ran out of road" is worth more than a table with the row dropped. You will not be penalised for an incomplete phase you report. You will be for one you hide.

**Creating a component is not the deliverable. Replacing the call sites is.** Three times on this project a shared component was built, reported done, and left with zero adopters.

---

# PART 1 — Live production bugs (Sentry)

Sentry is logging real errors from the reports API in production. Two are confirmed; there may be more.

## Bug 1.1 — `cost-code-expense-analysis` is broken in production. CONFIRMED.

Sentry: `AttributeError: 'Bill' object has no attribute 'cost_code'`, `app.routers.reports`, `/apis/v3/reports/data/{slug}`.

Diagnosed. `_rep_cost_code_expense_analysis` in `backend/app/routers/reports.py` (~line 2210) iterates `Bill` rows and does:

```python
key = b.cost_code or b.category or "General Expense"
```

**`Bill` has neither `cost_code` nor `category`.** Its columns are: `id, company_id, project_id, party_company_user_id, invoice_number, invoice_date, due_date, invoice_type, status, cancelled_at, cancelled_by, subtotal, gst_amount, total_payable, paid_amount, approval_flag, is_milestone_fixed_amount, tally_synced, zoho_bill_id, boq_document_id, quotation_id, wo_id, po_id, match_id, items_json, payment_mode, payment_bank_name, payment_ref, ship_to, terms, created_at, updated_at`.

So the loop raises on the first bill, the `except Exception` swallows it, Sentry records it, and the endpoint returns `rows: []`. Verified live just now against company `d3724ec3-edac-4b5f-b296-fc6a013b7b5d`: **200 with `rows: []`**.

Fix it properly. Find where cost code actually lives for an expense (check the `CostCode` model and how other handlers resolve it — `_rep_company_payments` and `_rep_project_payment` both read `p.cost_code` off a payment object successfully, so follow that path), and join correctly. Do not paper over it with `getattr(b, "cost_code", None)`; that silently returns "General Expense" for every row and produces a report that looks fine and means nothing.

## Bug 1.2 — `indent_date` — already fixed, verify only.

Sentry: `AttributeError: 'MaterialIndent' object has no attribute 'indent_date'`, 3 events, ~3h old.

`indent_date` entered in commit `346e438` and was removed in `1191042`. It no longer exists anywhere in `backend/`. I probed `material-request-item` live and it returns real rows, which also confirms Render is running current `main`.

**This is a stale Sentry event.** Confirm, then resolve it in Sentry rather than changing code. Do not "fix" code that is already correct.

## Phase 1.3 — Sweep for the rest of this bug class

**This bug class is invisible to column-matching probes**, which is why it survived verification. A handler that crashes returns `rows: []`, and an empty result is indistinguishable from "this tenant has no such data". Sentry is the only oracle that separates them.

There are **16 reports that return 200 with 0 rows**:

```
boq-bom  boq-item  boq-measurement-book  budget-vs-actual-cost-code
budget-vs-actual-material-cost  budget-vs-actual-material-qty  cost-code-library
item-wise-sales  material-received-without-po  material-request-item  payment-request
quotation  quotation-item  rate-card-library  subcon-material-issue  todo-report
```

Some are genuinely empty. At least one (`cost-code-expense-analysis`, which is not even in this list) was crashing. Find out which.

Do this **statically, for all 82 handlers, not just the 16**: for every attribute access on a model instance in `backend/app/routers/reports.py`, assert the attribute exists on that model class. Write it as a test in `tests/coverage/` so it keeps holding. A reflection-based test over `_REPORT_HANDLERS` plus the SQLAlchemy model metadata will catch every instance of this class at once, including the ones no tenant's data has reached yet.

Then re-run the seeded suite in `tests/coverage/test_unproven_16_reports.py` and confirm nothing regressed.

Also: the API response carries an `errors` key alongside `rows`. Check whether it is populated on these failures and surfaced in the UI. A report that fails should say so, not render an empty table that reads as "no data".

## Phase 1.4 — Clear the board

Re-probe all 82 reports live after the fixes. Then check Sentry again and confirm the feed is clean. Report the before/after Sentry issue count.

---

# PART 2 — Remove the bevel (founder-rejected design)

## What is being rejected

The founder has pointed at three places — the active tab, a content card, and the active sidebar item — and identified the **faint dark edge / bevel** on them as a hallmark of AI-generated design. He is right, and this one is my fault: I specified it in the round-2 prompt as an "inset highlight plus soft drop shadow". It was implemented exactly as asked. The specification was wrong.

The offending treatment:

```
[box-shadow:inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.4)]
```

He estimated three instances. **There are 25, across 12 files:**

```
components/Sidebar.tsx            components/ui/Tabs.tsx
components/ProjectSettingsModal.tsx
app/c/[company_id]/settings/page.tsx
app/c/[company_id]/d/attendance/page.tsx     .../d/chat/page.tsx
app/c/[company_id]/d/drawings/page.tsx       .../d/finance/page.tsx
app/c/[company_id]/d/reports/calculators/page.tsx
app/c/[company_id]/p/[project_id]/layout.tsx
app/c/[company_id]/p/[project_id]/attendance/page.tsx
app/c/[company_id]/p/[project_id]/transaction/page.tsx
```

Separately, console shadow usage overall is heavy and worth pruning: `shadow-2xl` 59, `shadow-lg` 52, `shadow-sm` 49, `shadow-md` 35, `shadow-xs` 32, `shadow-xl` 17.

## What to build instead — this is decided, do not redesign it

Four candidates were prototyped and compared side by side in both themes, using the real token values, and the founder's architect picked one. **You are implementing a decision, not making one.** Do not substitute your own approach.

The bevel is skeuomorphic: a fake light source, a fake raised edge. The replacement takes its separation from a genuine surface change and nothing else.

### The treatment: background step only

For any **selected or active inline element** — sidebar row, tab, segmented-control thumb, selected list row, selected card:

- **Background:** steps to `--elevated`. That step alone carries the separation.
- **Text:** `--foreground` at `font-semibold` when selected; `--muted` at `font-medium` when not.
- **Accent:** the icon only, in `--primary`.
- **Shadow:** none. No `box-shadow` of any kind.
- **Border:** none added. The element keeps whatever container border it already had; you are not adding one.

That is the whole spec. Removing the `[box-shadow:...]` and letting `bg-elevated` do the work is most of the change.

### Containers and floating elements

- **Cards, panels, table containers:** keep their existing `1px solid --border-custom`. Drop the shadow. A card is defined by its hairline, not by a glow.
- **Genuinely floating elements only** — modals, drawers, popovers, the collapsed-rail flyout — keep exactly one soft drop shadow. These detach from the page and need it.
- **Everything inline** — sidebar rows, tabs, cards, table rows, stat tiles — gets no shadow at all.

Audit the 244 generic `shadow-*` uses against that inline-versus-floating rule and remove the ones that fail it.

### Why not the alternatives (do not re-propose these)

- **Step plus a stronger hairline.** Crisp, but in dark mode the hairline reads as a light rim around the selected row. The founder has now rejected two edge treatments; a third rim is a bad bet.
- **Recessed — selected row darker than the rail.** Distinctive in dark, but a darker-than-background row reads as *disabled* rather than selected, and the effect inverts between themes.
- **Any border-only treatment.** Makes a nav row look like an input field.

### Fix this token collision as part of the work

In `:root.light-theme`, `--elevated` and `--border` are **the same value**, `#E5E7EB`. So any element that uses `bg-elevated` together with `border-border-custom` has an **invisible border in light mode**. Since the new treatment leans on `--elevated` everywhere, this matters more now than it did.

Give light `--border` a value one step darker than `--elevated` — around `#D1D5DB` — so hairlines stay visible against an elevated surface. Verify the contrast of the border against both `--card` (`#FFFFFF`) and `--elevated` (`#E5E7EB`), and confirm the dark theme is unaffected.

### Verify

- `grep -rn "inset_0_1px_0\|inset 0 1px 0" frontend/src` → **0**.
- No `box-shadow` on any selected/active inline element.
- Screenshot the sidebar with an item selected, a tab control, and a card, in **light and dark**, and confirm no rim or halo on any of them.
- Confirm the light-mode hairline is visible on an elevated surface after the token fix.

## Still banned, from previous rounds

No accent bars (`border-l-2` / `border-b-2` as selection). No accent-tinted selected surfaces (`bg-primary/10`). No outer glows (`shadow-[0_0_...]`). No decorative `animate-pulse`. No unicode arrows as controls. No new hardcoded hex, `rgba()`, or raw Tailwind palette classes.

---

# PART 3 — Help content

## Why this exists

The founder built this product and **cannot use it from the help content.** His words: he does not know how to create a PO, or record attendance, from reading the app's own help. If he cannot, no customer can.

This is not a copy-editing task. It is a **verification** task with a writing deliverable. Every claim must be true of the code as it exists today, and every workflow must be completable by someone who has never seen the product.

**This project has been burned by fabricated content before** — a content-integrity audit previously found and fixed 81 fabricated CMS files. Do not add to that. An unverifiable step gets deleted, never guessed.

## What exists

| System | Location | Size |
|---|---|---|
| **Console help** (`/c/{id}/d/help`) | `frontend/src/app/c/[company_id]/d/help/helpContent.tsx` | 36 Q&A entries, 8 areas, 810 lines |
| **Marketing help** (`/help/...`) | `frontend/src/content/help/**/*.json` | 86 articles, 15 categories |

Marketing shape: `{title, metaTitle, metaDescription, canonical, slug, category, type, author, publishDate, body}`. Console shape: `{q, a: JSX, text}` where `text` is the search keyword blob.

### The problem, concretely

The console's entire answer to "How do I create a purchase order?":

> In Procurement, choose New PO. Select the vendor, add line items with quantities and rates, set payment and delivery terms, and issue the PO.

No field named, no required-vs-optional, no precondition (you need a vendor and a project first), no indication of what happens after. And the UI does not clearly match: the procurement page's visible buttons include `"+ Material Indent"` and `"+ Purchase Order"`; the string `"New PO"` appears once in that file and may not be what the user sees.

**This would pass a naive "is it accurate?" check and still fails the founder completely.** Grade for usefulness, not just truth.

## Method: derive, verify, reconcile, fill

Do not start from the existing help and check it. Start from the code, build the truth, then judge the help against it. Working the other way inherits the existing content's blind spots — you confirm what is written and never notice what is missing.

### Phase 3.1 — Workflow truth map from code

For **every module in the sidebar** (7 domain groups, ~41 modules; `frontend/src/components/Sidebar.tsx` is authoritative), read the router in `backend/app/routers/` **and** the UI page. For each workflow record:

- **Entity and action.**
- **Preconditions** — what must already exist. A PO needs a vendor and a project. Attendance needs employees or a labour contractor. This is the most common reason a user gets stuck.
- **Exact UI path** — sidebar group → page → tab → button, with labels **copied verbatim from the JSX**, in quotes.
- **Required vs optional fields** — from the form and from backend validation. If the backend 422s without it, it is required whatever the UI implies.
- **Endpoints** called.
- **State transitions and approvals** — starting status, what moves it forward, who approves.
- **Permission** required (`can(...)` in UI, the router's check).
- **What success looks like** — where the record appears, what it unlocks.

Write to `docs/WORKFLOW_TRUTH_MAP.md`, one section per module. **This is the file everything else is checked against**, and it is the first honest description of what this product does.

Use the knowledge-graph MCP tools (`semantic_search_nodes`, `query_graph`) before grepping.

### Phase 3.2 — Walk every workflow in the running app

A map derived only from source will still be wrong: rendering conditions, permission gates and disabled states are not obvious from code.

**Actually perform each workflow end to end.** Confirm every label and step order. Reality wins over the map.

Where a workflow cannot be completed — missing prerequisite, genuine bug, dead end — record it in `docs/BACKLOG.md` as a `D-0xx` and mark the workflow `UNVERIFIED`. Do not write help for a workflow you could not complete. **This phase is also the real bug pass**, and its findings matter as much as the help.

### Phase 3.3 — Grade all 122 items

One verdict each:

- **ACCURATE** — true and sufficient. Leave it.
- **INACCURATE** — contradicts code or the running app. Fix.
- **VAGUE** — technically true, reader still cannot do the task. *This is the founder's actual complaint; expect it to dominate.* Rewrite.
- **OUTDATED** — describes something gone. Delete.
- **REDUNDANT** — duplicates another. Merge and delete one.

Record in `docs/HELP_CONTENT_AUDIT.md` with a one-line reason each. Report verdict counts.

### Phase 3.4 — Fix, delete, fill

Rewrite everything not ACCURATE. Delete OUTDATED and REDUNDANT. Then fill gaps: **every module needs at least one how-to for its primary workflow.** Report the coverage fraction.

## The bar every article must clear

> **Someone who has never seen SiteFlow can complete the task using only this article, without guessing.**

1. **Preconditions first.** "Before you start you need: an active project, and at least one vendor in Party Library."
2. **Exact navigation.** "Sidebar → Procurement & Materials → Procurement → the 'Purchase Orders' tab → click '+ Purchase Order'." Labels quoted, copied from the UI.
3. **Every required field named**, what goes in it, which are optional.
4. **What happens on save** — status, where it appears, what it unlocks.
5. **The next step in the chain.** Indent → PO → GRN → three-way match is a chain; each article hands off.

### Anti-fabrication rule

**Every step traces to code.** Keep the trace in a sidecar field or comment — `file:line` or the endpoint — not necessarily in user-facing copy. If you cannot point at the code implementing a step, it does not go in. Delete it; do not guess.

Before finishing, re-read every article and ask: *did I verify this, or infer it from the module name?* Anything in the second category comes out.

### Style

- **No em dashes.** Period or comma instead. They read as AI-generated.
- No emoji in help copy.
- Plain, direct, second person. "Click Save."
- Console entries short and scannable; depth in marketing articles; link across.
- Update the `text` search blob on every console entry you touch or search stops finding it.

---

# PART 4 — README

Do this **after** Part 3. After the truth map you will actually know what this product does, and the feature inventory can be verified rather than restated.

`README.md` is 344 lines. Headings today:

```
# SiteFlow
## Live deployments   ## Tech stack   ## Architecture
### Multi-tenant model   ### Console vs marketing site   ### Theming
## Authentication   ## Feature inventory
### Project and execution   ### Procurement and inventory
### Billing, finance, and compliance   ### Subcontractor and labour
### Quality, safety, equipment, production   ### CRM, library, and reporting
### Cross-cutting
## Getting started   ### Backend   ### Frontend
### Local dev vs production data
## Environment variables   ## Database and migrations
## Deployment & Infrastructure Scaling
## Security posture   ## Conventions   ## License
```

### Do

1. **Read it whole, section by section.** Judge each on: does this belong in a professional README, and is it still true?
2. **Remove what does not belong.** Every heading carries a decorative emoji — strip them all. Remove marketing voice, internal scratch notes, aspirational claims, filler.
3. **Keep and correct what does.** Tech stack, architecture, multi-tenant model, auth, getting started, env vars, migrations, deployment, security posture, conventions, license are all legitimate. Verify each against current code and fix drift.
4. **Update for what changed.** The console now has a 7-group domain sidebar with a collapsible icon rail and portaled flyouts; a shared `PageShell` / `PageHeader` / `Tabs` / `Skeleton` / `EmptyState` layer; a full semantic design-token system in `globals.css` with light and dark variants that all clear WCAG AA, plus an 8-colour categorical chart palette; and **82 working reports** (was 24) via `_REPORT_HANDLERS` against `REPORT_METADATA`. The feature inventory should reflect the truth map.
5. **Verify every command and path.** A README whose setup steps do not run is worse than none. Actually run getting-started.

Do not invent benchmarks, user counts, or roadmap promises.

---

## Cross-cutting rules

- Parts 3 and 4 are **content changes only** — no application refactors. Bugs found there go to `docs/BACKLOG.md`. Parts 1 and 2 are the code-change parts.
- Run `pytest -n 4` (from `backend/`, `PYTHONPATH=.`) and `npm run build` after each part. **Do not delete or skip tests to go faster.** Editing a test is allowed only when the code it asserts against was legitimately renamed, and the assertion's strength must not change.
- Delete `.next/` before any build you verify against — Next.js otherwise serves stale pre-edit HTML and you will confirm your own old output.
- `pkill` does not kill the Windows `node.exe` holding a port. Use `Get-NetTCPConnection -LocalPort <port> -State Listen | Stop-Process`.
- Commit and push to `origin/main`. Verify with `git merge-base --is-ancestor HEAD origin/main` — mind the argument order; the reverse gives a false positive and once left 48 commits unpushed here.

## Definition of Done

**Part 1**
- [ ] `cost-code-expense-analysis` returns real grouped rows, with cost code resolved from where it actually lives, not a `getattr` default.
- [ ] `indent_date` confirmed already fixed; Sentry issue resolved, no code change.
- [ ] A reflection test over all 82 handlers asserts every model attribute access exists on its model class. Committed and passing.
- [ ] The 16 empty reports classified: genuinely empty vs crashing. Table reported.
- [ ] Report failures surface as errors in the UI, not as an empty table.
- [ ] All 82 re-probed live; Sentry feed clean. Before/after issue count reported.

**Part 2**
- [ ] All 25 bevel sites converted to the background-step treatment; `grep -rn "inset_0_1px_0\|inset 0 1px 0" frontend/src` returns 0.
- [ ] No `box-shadow` on any selected/active inline element; the 244 generic `shadow-*` uses audited against inline-versus-floating.
- [ ] Light `--border` darkened so hairlines stay visible on `--elevated`; dark theme unchanged.
- [ ] Screenshots of a selected sidebar row, a tab control and a card in light and dark, showing no rim or halo.

**Part 3**
- [ ] `docs/WORKFLOW_TRUTH_MAP.md` covers every sidebar module with verbatim labels, preconditions, required fields, endpoints, permissions, success criteria.
- [ ] Every workflow walked in the running app; divergences corrected; uncompletable ones `UNVERIFIED` and filed as `D-0xx`.
- [ ] `docs/HELP_CONTENT_AUDIT.md` grades all 122 items with reasons; counts reported.
- [ ] All non-ACCURATE items rewritten, deleted or merged; every module has a verified how-to; coverage fraction reported.
- [ ] Every article clears the five-point bar; every step traces to code; `text` blobs updated.

**Part 4**
- [ ] README: emoji stripped, non-professional sections removed, remaining verified against code, updated for the design system and 82 reports, every command actually run.

**All**
- [ ] `pytest -n 4` green; `npm run build` clean; `npx tsc --noEmit` clean.
- [ ] Pushed to `origin/main`, ancestry verified.

## Final report

Part 1: what was broken, the fix, the 16-report classification table, Sentry before/after.
Part 2: the bevel count before and after, and the light/dark screenshots.
Part 3: verdict counts, coverage fraction, every `D-0xx` filed with what was broken.
Part 4: what you removed and why.

Do not claim a number you did not measure. If a phase is partly done, give the fraction.
