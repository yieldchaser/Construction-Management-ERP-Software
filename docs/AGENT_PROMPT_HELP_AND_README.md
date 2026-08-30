# AGENT PROMPT — Verify and rebuild the help content, then the README

Paste this whole file as the task. Do not stop until the Definition of Done is met.

---

## Why this exists

The founder built this product and **cannot use it from the help content.** His words: he does not know how to create a PO, or record attendance, from reading the app's own help. If he cannot, no customer can.

So this is not a copy-editing task. It is a **verification** task with a writing deliverable. Every claim in the help must be true of the code as it exists today, and every workflow must be completable by someone who has never seen the product.

**This project has been burned by fabricated content before** — a content-integrity audit previously found and fixed 81 fabricated CMS files. Do not add to that. An unverifiable step gets deleted, never guessed.

**You do not stop between phases.** One continuous run. Blocker surviving two attempts → record in `docs/BACKLOG.md` as a `D-0xx` row, skip it, **continue**. Report every phase including unfinished ones.

---

## What exists today

Two separate help systems. Both are in scope.

| System | Location | Size |
|---|---|---|
| **Console help** (in-app, `/c/{id}/d/help`) | `frontend/src/app/c/[company_id]/d/help/helpContent.tsx` | 36 Q&A entries, 8 areas, 810 lines |
| **Marketing help** (public, `/help/...`) | `frontend/src/content/help/**/*.json` | 86 articles, 15 categories |

Marketing article shape: `{title, metaTitle, metaDescription, canonical, slug, category, type, author, publishDate, body}`.

Console entry shape: `{q, a: JSX, text}` where `text` is the search keyword blob.

### The problem, concretely

The console's answer to "How do I create a purchase order?" reads, in full:

> In Procurement, choose New PO. Select the vendor, add line items with quantities and rates, set payment and delivery terms, and issue the PO.

That is the entire answer. It names no field, no required-vs-optional distinction, no precondition (you need a vendor and a project first), and no indication of what happens after. And the UI it describes does not clearly match: the procurement page's visible action buttons include `"+ Material Indent"` and `"+ Purchase Order"`; the string `"New PO"` appears once in that file and may not be the button the user sees.

**This entry would pass a naive "is it accurate?" check and still fails the founder completely.** Grade for usefulness, not just truth.

---

## The method: derive, verify, reconcile, fill

Do not start from the existing help and check it. Start from the code, build the truth, and only then judge the help against it. Working the other way round means you inherit the existing content's blind spots — you will confirm what is written and never notice what is missing.

### PHASE A1 — Build the workflow truth map from code

For **every module in the sidebar** (7 domain groups, ~41 modules — see `frontend/src/components/Sidebar.tsx` for the authoritative list), read the backend router in `backend/app/routers/` **and** the UI page under `frontend/src/app/c/`. For each user-facing workflow, record:

- **Entity and action** — what the user is actually creating or doing.
- **Preconditions** — what must already exist. A PO needs a vendor and a project. Attendance needs employees or a labour contractor. State these; they are the single most common reason a user gets stuck.
- **Exact UI path** — sidebar group → page → tab → button, with **button and field labels copied verbatim from the JSX**, in quotes. Not paraphrased.
- **Required vs optional fields** — from the form and from the backend's validation. If the backend 422s without a field, it is required, whatever the UI implies.
- **The endpoint(s)** it calls.
- **State transitions and approvals** — what status the record starts in, what moves it forward, who can approve.
- **Permission** required to see and to do it (`can(...)` in the UI, the permission check in the router).
- **What success looks like** — where the record appears afterwards, what changes downstream.

Write this to `docs/WORKFLOW_TRUTH_MAP.md`, one section per module. **This file is the deliverable that everything else is checked against**, and it is valuable on its own — it is the first honest description of what this product actually does.

Use the knowledge-graph MCP tools (`semantic_search_nodes`, `query_graph`) before grepping; they are faster and cheaper here.

### PHASE A2 — Walk every workflow in the running app

A truth map derived only from reading code will still be wrong, because rendering conditions, permission gates and disabled states are not obvious from source.

Start the app and **actually perform each workflow end to end.** Confirm every button label, field label and step order matches what you wrote. Correct the map where reality differs — reality wins.

Where a workflow cannot be completed (missing prerequisite data, a genuine bug, a dead end), **record it in `docs/BACKLOG.md` as a new `D-0xx`** and mark that workflow `UNVERIFIED` in the map. Do not write help for a workflow you could not complete. This phase doubles as a bug pass and its findings are as valuable as the help itself.

### PHASE A3 — Grade all 122 existing items against the map

Every console entry and every marketing article gets exactly one verdict:

- **ACCURATE** — true and sufficient. Leave it.
- **INACCURATE** — contradicts the code or the running app. Fix it.
- **VAGUE** — technically true but the reader still cannot do the task. *This is the founder's actual complaint; expect it to be the most common verdict.* Rewrite it.
- **OUTDATED** — describes something that no longer exists. Delete it.
- **REDUNDANT** — duplicates another item. Merge and delete one.

Record the verdict table in `docs/HELP_CONTENT_AUDIT.md` with a one-line reason each. Report the verdict counts in your final summary.

### PHASE A4 — Fix, delete, and fill the gaps

Rewrite everything not ACCURATE. Delete OUTDATED and REDUNDANT. Then **fill the gaps**: every module in the truth map must have at least one how-to covering its primary workflow. The founder should be able to open help and find "how do I create a PO" answered properly, for every module.

Coverage target: **every module × its primary workflow has a verified article.** Report the fraction.

---

## The bar every article must clear

> **Someone who has never seen SiteFlow can complete the task using only this article, without guessing.**

Concretely, every how-to must have:

1. **Preconditions first.** "Before you start, you need: an active project, and at least one vendor in Party Library."
2. **Exact navigation.** "Sidebar → Procurement & Materials → Procurement → the 'Purchase Orders' tab → click '+ Purchase Order'." Labels in quotes, copied from the UI.
3. **Every required field named**, with what to put in it, and which are optional.
4. **What happens on save** — the status it lands in, where it now appears, what it unlocks.
5. **The next step in the chain**, where one exists. Indent → PO → GRN → three-way match is a chain; each article should hand off to the next.

### The anti-fabrication rule

**Every step must trace to code.** Keep the trace in a sidecar field or a comment — `file:line` or the endpoint — not necessarily in the user-facing copy. If you cannot point at the code that implements a step, the step does not go in the article. Delete it; do not guess it.

Before you finish, re-read every article you wrote and ask: *did I verify this, or did I infer it from the module name?* Anything in the second category comes out.

### Writing style

- **No em dashes.** Use a period or a comma. They read as AI-generated.
- No emoji in help copy.
- Plain, direct, second person. "Click Save." Not "You may wish to proceed by clicking Save."
- Keep the console entries short and scannable; put depth in the marketing articles and link across.
- Update the `text` search-keyword blob on every console entry you touch, or search will stop finding it.

---

## PHASE B — The README

Do this **after** Phase A, not before. After the truth map you will actually know what this product does, and the README's feature inventory can be verified rather than restated.

`README.md` is 344 lines. Current headings:

```
# SiteFlow
## Live deployments        ## Tech stack           ## Architecture
### Multi-tenant model     ### Console vs marketing site   ### Theming
## Authentication          ## Feature inventory
### Project and execution  ### Procurement and inventory
### Billing, finance, and compliance    ### Subcontractor and labour
### Quality, safety, equipment, production
### CRM, library, and reporting         ### Cross-cutting
## Getting started         ### Backend    ### Frontend
### Local dev vs production data
## Environment variables   ## Database and migrations
## Deployment & Infrastructure Scaling
## Security posture        ## Conventions    ## License
```

### Do

1. **Read it whole, section by section.** Then judge each section on: does this belong in a professional README, and is it still true?
2. **Remove what does not belong.** Every heading currently carries a decorative emoji. Strip them. Remove marketing voice, internal scratch notes, aspirational claims, and anything that reads as filler.
3. **Keep and correct what does belong.** Tech stack, architecture, multi-tenant model, auth, getting started, environment variables, migrations, deployment, security posture, conventions, license are all legitimate README sections. Verify each against the current code and fix what has drifted.
4. **Update for what actually changed.** The console now has: a 7-group domain sidebar with a collapsible icon rail and portaled flyouts; a shared `PageShell` / `PageHeader` / `Tabs` / `Skeleton` / `EmptyState` component layer; a full semantic design-token system in `globals.css` with light and dark variants that all clear WCAG AA, plus an 8-colour categorical chart palette; and **82 working reports** (was 24) driven by `_REPORT_HANDLERS` in `backend/app/routers/reports.py` against `REPORT_METADATA` in the reports slug page. The feature inventory should reflect the truth map you just built.
5. **Verify every command and path you leave in it.** A README whose setup steps do not run is worse than no README. Actually run the getting-started steps.

Do not invent benchmarks, user counts, or roadmap promises.

---

## Cross-cutting rules

- **Content changes only.** Do not refactor application code. If Phase A2 uncovers a bug, record it in `docs/BACKLOG.md` and keep going. Fixing bugs is a separate run.
- Run `pytest -n 4` (from `backend/`, `PYTHONPATH=.`) and `npm run build` at the end. Do not delete or skip tests.
- Delete `.next/` before any build you verify against.
- `pkill` does not kill the Windows `node.exe` holding a port. Use `Get-NetTCPConnection -LocalPort <port> -State Listen | Stop-Process`.
- Commit and push to `origin/main`. Verify with `git merge-base --is-ancestor HEAD origin/main` — mind the argument order; the reverse gives a false positive and once left 48 commits unpushed here.

## Definition of Done

- [ ] `docs/WORKFLOW_TRUTH_MAP.md` covers every sidebar module, with verbatim UI labels, preconditions, required fields, endpoints, permissions and success criteria.
- [ ] Every workflow walked in the running app; divergences corrected; uncompletable ones marked `UNVERIFIED` and filed as `D-0xx`.
- [ ] `docs/HELP_CONTENT_AUDIT.md` grades all 122 items with a reason each; verdict counts reported.
- [ ] All non-ACCURATE items rewritten, deleted or merged.
- [ ] Every module has at least one verified how-to; coverage fraction reported.
- [ ] Every article clears the five-point bar above; every step traces to code.
- [ ] Console `text` search blobs updated for every touched entry.
- [ ] README: emoji stripped, non-professional sections removed, remaining sections verified against code, updated for the design system and the 82 reports, and every command actually run.
- [ ] `pytest -n 4` green; `npm run build` clean.
- [ ] Pushed to `origin/main`, ancestry verified.

## Final report

Verdict counts from the audit. Module coverage fraction. Every `D-0xx` you filed from Phase A2, with what was broken. What you removed from the README and why. Anything left unverified, named.

Do not claim a number you did not measure. If a phase is partly done, say so and give the fraction. An honest partial beats a table with the incomplete rows quietly dropped.
