# AGENT PROMPT — Console help, redone with enforcement. Plus login page and two leftovers.

Paste this whole file as the task. Do not stop until the Definition of Done is met.

---

## Read this first: the previous attempt was fabricated, and here is the proof

The previous run produced `helpContent.tsx`, `docs/WORKFLOW_TRUTH_MAP.md`, `docs/HELP_CONTENT_AUDIT.md` and the README. **The README and the code work were good. The help content and the truth map were largely invented.**

Measured against all **471 real `@router` decorators** in `backend/app/routers/`:

- **14 of 29** endpoint claims in `helpContent.tsx` do not exist. 48%.
- **15 of 27** endpoint claims in `docs/WORKFLOW_TRUTH_MAP.md` do not exist. 56%.

Examples, claimed versus real:

```
POST /apis/v3/procurement/orders   ->  real: POST /apis/v3/procurement/pos
POST /apis/v3/finance/bills        ->  real: POST /apis/v3/finance/payments
POST /apis/v3/crm/quotations       ->  real: POST /apis/v3/crm/leads/{lead_id}/quotations
POST /apis/v3/attendance/punch     POST /apis/v3/payroll/run     POST /apis/v3/boq/import
POST /apis/v3/materials/transfer   POST /apis/v3/equipment/fuel  POST /apis/v3/budget
POST /apis/v3/companies            POST /apis/v3/company-team    PUT  /apis/v3/roles/{id}
POST /apis/v3/rfq
```

UI labels were invented too. The purchase-order entry instructs the user to click **`"+ New Purchase Order"`**. That string exists **nowhere in the frontend except inside the help file itself.** The real button is `"+ Purchase Order"` at `frontend/src/app/c/[company_id]/d/procurement/page.tsx:592`.

Meanwhile `WORKFLOW_TRUTH_MAP.md` opens by claiming it "establishes the verified, application-wide ground truth ... exact endpoints."

### Why it happened, so you do not repeat it

**Cause 1: the content was bulk-generated.** The previous run wrote `write_help_content.py`, `write_workflow_truth_map.py` and `write_help_audit.py` — Python scripts that emit the whole file from a template. Generating prose about code you have not read produces plausible-looking invention every time.

> **You may not use a script to generate help or truth-map content.** Write each entry individually, immediately after reading the code it describes. Scripts for *checking* are required (see below); scripts for *authoring* are banned.

**Cause 2: the verification phase was skipped.** The previous prompt required standing up the backend and executing each workflow over HTTP. That never happened. Executing a single PO creation would have returned 404 on `/procurement/orders` immediately.

**Cause 3, and this one is on the prompt, not the agent:** "every step must trace to code" was written as a *rule* with nothing checking it. A rule with no artifact and no validator is a suggestion. This prompt fixes that — see Part 1.

---

## Standing rules

**You do not stop between parts.** One continuous run. A blocker surviving two independent attempts → record in `docs/BACKLOG.md` as a `D-0xx`, skip it, **continue**.

**Report every phase, including unfinished ones, with the number.** An honest "22 of 36 entries done, the rest untouched" is a good outcome. A claim of 36 that measures 22 is the failure being corrected.

**You have no browser and no Sentry access.** Do not attempt either, and never claim a result that needs one. Running the backend locally, seeding a local database, and calling `localhost` over HTTP are all yours and are required below. Visual confirmation and production probes are handled separately.

---

# PART 1 — The enforcement mechanism. Build this FIRST, before writing any content.

This is the most important part of the task. It makes fabrication mechanically unable to ship.

## 1.1 — Every claim carries a citation

Extend the console help entry shape in `frontend/src/app/c/[company_id]/d/help/helpContent.tsx` with a required `sources` field:

```ts
{
  q: string,
  a: JSX,
  text: string,
  sources: string[],   // REQUIRED. Every factual claim in `a` must be covered here.
}
```

Each entry in `sources` is one of exactly two forms:

- `"path/to/file.tsx:LINE"` — for a UI label, button text, tab name, field name, or navigation path.
- `"POST /apis/v3/some/route"` — for an endpoint claim.

Every quoted UI string and every endpoint mentioned in the answer must be covered by a citation. If you cannot cite it, it does not go in the answer.

## 1.2 — Write the validator

Create `scripts/verification/verify_help_claims.py`. It must:

1. Parse `helpContent.tsx` and extract, per entry: every double-quoted UI label inside the answer body, every `<code>METHOD /path</code>` endpoint, and the `sources` array.
2. Build the real endpoint set by scanning **all** `@router.<method>("...")` decorators in `backend/app/routers/*.py`, prefixing each with its router's `prefix=` and with `/apis/v3`. There are **471** such routes; if your scan finds far fewer, your scan is broken — fix it before trusting it.
3. For every endpoint claim: assert it matches a real route, treating `{param}` segments as wildcards.
4. For every `file:LINE` citation: assert the file exists, the line exists, and **the quoted label actually appears in that file**.
5. For every entry: assert `sources` is non-empty.
6. Exit non-zero listing every violation.

**Self-test the validator before you trust it.** Feed it one deliberately wrong endpoint and one deliberately wrong label, confirm it fails on both, then remove them and confirm it passes. A validator you have not tested against a known-positive is worth nothing — that lesson is already written into this project's history.

## 1.3 — Wire it into the suite

Add `backend/tests/coverage/test_help_claims_valid.py` that shells out to the validator and fails the suite on any violation. This keeps the property true for every future change, which is the entire point.

---

# PART 2 — Redo the workflow truth map, verified by execution

Delete the existing `docs/WORKFLOW_TRUTH_MAP.md` and rebuild it. Do not edit around the old one; over half its endpoints are wrong and the errors are not visually distinguishable from the correct entries.

## 2.1 — Derive from code, one module at a time

For **every module in the sidebar** (`frontend/src/components/Sidebar.tsx` is authoritative), read the router in `backend/app/routers/` and the UI page. Record per workflow:

- **Preconditions** — what must already exist.
- **Exact UI path** — sidebar group → page → tab → button, every label **copied verbatim from the JSX with its `file:line`**.
- **Required vs optional fields**, from the form and from backend validation.
- **The real endpoint**, read off the `@router` decorator, with the router prefix applied.
- **State transitions and approvals.**
- **Permission** required.
- **What success looks like.**

Write each module's section immediately after reading that module. Do not batch. Do not template.

## 2.2 — Execute every workflow. This is a hard gate.

Stand up the backend locally against a seeded database. For each workflow, **perform it over HTTP in the UI's call order**: create the prerequisites, create the record, run the transition.

- Confirm each precondition by **omitting it** and checking the call actually fails.
- Confirm each required field by **omitting it** and observing the 422.
- Confirm the record lands in the status you claim.

**Write the results to `docs/WORKFLOW_EXECUTION_LOG.md`** — per workflow: the calls made, the status codes returned, and pass/fail. This file is a required deliverable.

> **You may not write a help article for a workflow that has no passing entry in that log.** If a workflow cannot be executed, mark it `UNVERIFIED` in the truth map, file a `D-0xx` in `docs/BACKLOG.md`, and write no help for it. Coverage of 20 verified workflows beats 41 invented ones.

---

# PART 3 — Rewrite the console help

Scope is **only** `frontend/src/app/c/[company_id]/d/help/helpContent.tsx` (36 entries).

**`frontend/src/content/help/**/*.json` — the 86 marketing articles — remain strictly OUT of scope. Do not edit, reformat, or "clean up" a single one.** Their bodies are ~31KB of WordPress-exported HTML with generated classes, rendered via `dangerouslySetInnerHTML` and parsed by `annotateHeadingsForToc()` for the in-page table of contents; edits can silently break the TOC or the styling. Factual problems you notice go in a "Marketing help — flagged, not changed" section of the audit and nowhere else.

## The bar

> **Someone who has never seen SiteFlow can complete the task using only this entry, without guessing.**

1. **Preconditions first.**
2. **Exact navigation**, labels quoted verbatim and cited.
3. **Every required field named**, plus which are optional.
4. **What happens on save** — status, where it appears, what it unlocks.
5. **The next step in the chain**, where one exists.

The previous rewrite got this *structure* right and the *facts* wrong. Structure without verified facts is worse than the vague text it replaced, because it reads authoritative.

## Regrade honestly

Rebuild `docs/HELP_CONTENT_AUDIT.md` against the new truth map, one verdict per entry — ACCURATE / INACCURATE / VAGUE / OUTDATED / REDUNDANT — with a one-line reason. Report the counts.

## Style

No em dashes; use a period or comma. No emoji. Plain second person. Update the `text` search blob on every entry you touch or search stops finding it.

---

# PART 4 — Login page

`frontend/src/app/login/page.tsx`. The primary path is **Google sign-in**, which already sits above the divider; leave it prominent.

## 4.1 — Swap the tab order

Lines ~609-611 currently render:

```tsx
{tabBtn("phone", "Phone OTP")}
{tabBtn("email_otp", "Email OTP")}
{tabBtn("password", "Password")}
```

Reorder so **Email OTP comes before Phone OTP**. Whichever tab is first must also be the default `method` on load; check the `useState` initialiser and update it to match, otherwise the first tab renders unselected.

## 4.2 — Rename the "Password" tab

"Password" is ambiguous next to two OTP options, and it is inaccurate: `handlePasswordLogin` posts `{ email, password }` to `/auth/login`, and the form's first input is `type="email"` with placeholder `you@company.com`. It is an **email and password** sign-in.

Rename the tab to **"Email & Password"**.

Keep the label short enough that all three tabs fit on one row at 375px width without wrapping or overflowing. If they do not fit, shorten all three consistently rather than truncating one.

## 4.3 — Do not change behaviour

No change to auth logic, endpoints, validation, or the Firebase phone path. Labels and order only.

---

# PART 5 — Two leftovers

## 5.1 — Correct the light `--border` claim, and fix the right thing

The previous run set light `--border` to `#D1D5DB` and reported it as "WCAG AA compliance" with ratios of 1.47:1, 1.19:1 and 1.34:1. **Those ratios are accurate and the label is wrong.** AA is 4.5:1 for text and 3:1 for UI components; 1.19:1 against `--elevated` clears neither.

Do not simply darken every border. WCAG 1.4.11's 3:1 applies to **boundaries a user must perceive to operate a control** — input fields, focus indicators, checkboxes, toggles, selected states. It does **not** apply to decorative hairlines between cards. Only `#6B7280` clears 3:1 against `#E5E7EB`, which is far too heavy for every divider in the app.

So:

1. Leave decorative hairlines at `#D1D5DB` and **remove the "WCAG AA" claim** from the comment in `globals.css`. Describe it as a visible divider, which is what it is.
2. Separately audit **control boundaries** in light theme — input borders, focus rings, checkbox and toggle outlines, selected-state outlines. Each must clear **3:1** against whatever it sits on. Give them their own token if needed rather than overloading `--border`.
3. Report the computed ratio for every control boundary you touch, against both `#FFFFFF` and `#E5E7EB`.

## 5.2 — Not yours

`D-021` (GitHub Actions billing-blocked) is founder-owned. Do not attempt it, do not treat it as a regression, do not work around it.

---

## Cross-cutting rules

- Parts 3, 4, 5.1 touch content and styling. Do not refactor application logic. Bugs found go to `docs/BACKLOG.md`.
- Run `pytest -n 4` (from `backend/`, `PYTHONPATH=.`), `npx tsc --noEmit`, and `npm run build` at the end. **Do not delete or skip tests.** Editing a test is allowed only when the code it asserts against was legitimately renamed, and the assertion's strength must not change.
- Delete `.next/` before any build you verify against.
- `pkill` does not kill the Windows `node.exe` holding a port. Use `Get-NetTCPConnection -LocalPort <port> -State Listen | Stop-Process`.
- Push to `origin/main`; verify with `git merge-base --is-ancestor HEAD origin/main` (mind the argument order).

## Definition of Done

**Part 1 — enforcement**
- [ ] `sources` field added and populated on every help entry.
- [ ] `scripts/verification/verify_help_claims.py` exists, and you have **self-tested it against a deliberately wrong endpoint and a deliberately wrong label** and shown it fails on both.
- [ ] Its endpoint scan finds ~471 routes. State the number.
- [ ] `backend/tests/coverage/test_help_claims_valid.py` runs it and passes.

**Part 2 — truth map**
- [ ] `docs/WORKFLOW_TRUTH_MAP.md` rebuilt, every endpoint verified against a real decorator, every label carrying `file:line`.
- [ ] `docs/WORKFLOW_EXECUTION_LOG.md` exists with real calls and status codes.
- [ ] Zero help articles exist for workflows without a passing log entry.

**Part 3 — help**
- [ ] Every entry clears the five-point bar and passes the validator.
- [ ] `docs/HELP_CONTENT_AUDIT.md` regraded with counts reported.
- [ ] Marketing JSON untouched — confirm with `git status` showing no changes under `frontend/src/content/help/`.

**Part 4 — login**
- [ ] Email OTP before Phone OTP; default `method` matches the first tab.
- [ ] "Password" renamed to "Email & Password"; three tabs fit at 375px.
- [ ] No auth behaviour changed.

**Part 5**
- [ ] "WCAG AA" claim removed from the `--border` comment.
- [ ] Control boundaries audited at 3:1 with ratios reported.

**All**
- [ ] `pytest -n 4` green; `tsc --noEmit` clean; `npm run build` clean; pushed and ancestry-verified.

## Final report

The validator's self-test output. The route count it found. Per-workflow execution results. Help verdict counts and how many entries you actually rewrote. The login diff. The control-boundary ratios.

State plainly what you did not finish. Do not claim a number you did not measure.
