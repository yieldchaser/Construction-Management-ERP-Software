# AGENT PROMPT — Close the label gap, fix two content bugs, file three backlog items

Paste this whole file as the task. Do not stop until the Definition of Done is met.

---

## Context

The previous run closed the endpoint-fabrication hole properly. Verified independently against all 471 real `@router` decorators: **38 endpoint claims in `helpContent.tsx`, 0 nonexistent** (it was 14 of 29 before). All 45 `file:line` citations resolve to real files and real lines. That work is good and stays.

**But the validator never checks UI labels**, even though the prompt required it, so the other half of the fabrication problem survived untouched.

## Standing rules

**You do not stop between parts.** A blocker surviving two attempts → `docs/BACKLOG.md` as a `D-0xx`, skip, continue. Report every part with its number, including anything unfinished.

**You have no browser and no Sentry.** Running the backend locally and calling `localhost` is yours and is expected. Visual confirmation is handled separately.

**Do not generate content with a writer script.** The last two runs used `write_help_content.py` to emit the whole help file from a template. That is what produces fabrication. Edit entries individually, in place, each one immediately after reading the code it describes. Scripts for *checking* are required. Scripts for *authoring* are banned.

---

# PART 1 — Teach the validator to check labels, then fix what it catches

## 1.1 — The gap

`scripts/verification/verify_help_claims.py` validates endpoints and citation existence. It contains **no logic that checks whether a quoted UI label actually appears in the file it cites.**

Measured consequence: of the 20 `"+ X"` button labels quoted in `helpContent.tsx`, **7 do not exist anywhere in the frontend**:

```
+ Add Task          + Create Bill        + Create Quotation
+ Daily Muster Roll + Generate API Key   + New DPR
+ New RFQ
```

Others exist but are quoted in the wrong form, which is just as misleading to a user hunting for the control:

| Help says | Actual control | Where |
|---|---|---|
| `"+ New Lead"` | `New Lead +` — the plus is on the **right** | `d/crm/page.tsx:747` |
| `"+ Log Fuel"` | `Log Fuel Refill` | `d/equipment/page.tsx:792` |
| `"+ Add Employee"` | only a `{/* Add Employee modal stub */}` comment | `d/hr/page.tsx:1704` |

Note that last row. Investigate whether the Add Employee control is actually implemented or is a stub. If it is a stub, the honest help text says so, or the entry goes. Do not document a control that does not work.

## 1.2 — Extend the validator

Add label verification to `verify_help_claims.py`:

1. For each entry, extract every double-quoted string in the answer body that looks like a UI control or navigation target (button text, tab name, field label, page name).
2. For each, assert the string appears in **at least one** of that entry's cited `file:line` files. Not merely somewhere in the repo — in a file that entry actually cites. That is what makes the citation meaningful.
3. Report the entry, the label, and the cited files it was not found in.
4. Exit non-zero on any violation.

Ignore the obvious non-controls: the entry's own `q` text, endpoint strings, and prose in quotes. Bias toward flagging: a false positive costs you one manual check, a false negative ships another invented button.

**Self-test it before you trust it.** Insert a deliberately wrong label into one entry, confirm the validator fails, remove it, confirm it passes. Paste both outputs. A validator you have not tested against a known-positive is worth nothing — that lesson is already written into this project's history, and the endpoint half of this same script was only trustworthy because it was self-tested.

## 1.3 — Fix every violation

For each label the validator flags, open the cited file, read the real control text, and correct the help to match **verbatim**, including the position of any `+`. Where the control does not exist at all, either find the real one or remove the claim.

Then re-run and show it clean.

---

# PART 2 — Two marketing content bugs. Metadata only.

`frontend/src/content/help/**/*.json` remains **out of scope for body edits**. Their `body` fields are ~31KB of WordPress-exported HTML rendered via `dangerouslySetInnerHTML` and parsed by `annotateHeadingsForToc()` for the in-page table of contents; editing that markup can silently break the TOC or styling.

**You may edit `title`, `metaTitle`, `metaDescription` and `slug`. You may not edit `body`.** Both fixes below are metadata-only.

## 2.1 — An article's title does not match its content

`frontend/src/content/help/mobile-app/` contains an article titled **"Steps to Set Up and Manage To Do Items in SiteFlow"** whose body is entirely about **facial-recognition punch-in, face photo upload, and marking daily attendance**. The title is simply wrong for the content.

Read the body, then retitle the article to describe what it actually covers. Update `metaTitle` and `metaDescription` to match. Leave `body` untouched. If `slug` is used in URLs that may already be indexed, leave the slug alone and note that in your report rather than breaking a live URL.

## 2.2 — A duplicate title

The title **"Steps to Set Up and Manage To Do Items in SiteFlow"** appears on **two** articles. Once 2.1 is fixed, confirm the remaining one is the article that genuinely covers To-Do items. Verify no other duplicate titles exist across all 86 files and report the check.

## 2.3 — Leave the mobile-app articles alone

There are 6 articles describing a SiteFlow mobile app. There is no native Android or iOS project in this repo — only a PWA. **This is intentional and founder-approved: the native apps are planned, and the content stays.** Do not delete, rewrite or reframe those articles. Do not "correct" them to describe the PWA. The only mobile-app change you make is the retitle in 2.1.

---

# PART 3 — File three backlog items. Do not implement them.

Add these to `docs/BACKLOG.md` in the existing table format, with a new `D-0xx` id each. **These are records, not work.** Do not write code for any of them.

## 3.1 — Subscription billing is documented but not built

There is **no payment processor anywhere in the backend** — no Stripe, no Razorpay, no gateway integration of any kind. Meanwhile the marketing help ships articles on "Pricing and Renewal in SiteFlow", "SiteFlow Subscription and Refund Policy Explained", and "TDS on SiteFlow Subscription Payment — Section 194J Guide", and Settings has a Subscription tab.

Record: payment collection is currently a manual, out-of-product process. Before launch, either wire a payment provider or confirm that manual invoicing is the intended model. Priority MEDIUM, founder decision.

## 3.2 — One party flag serves two different commercial relationships

A works subcontractor and a labour contractor are different relationships. A works subcontractor takes a Work Order for a scope and is paid on RA bills against measured progress. A labour contractor supplies daily headcount and is paid on muster roll against attendance.

The codebase models the **activities** separately but the **party** as one thing:

- `CompanyTeam.priority_type` has only two values in use: `"partner"` and `"subcontractor"`.
- `/apis/v3/billing/subcontractors` filters solely on `priority_type == "subcontractor"` (`billing.py:1804`).
- Works behaviour hangs off Work Orders; labour behaviour off `SubcontractorAttendance` (`labor_role`, `worker_count`, `shift_multiplier`, `overtime_hours`) and `MusterRoll`.

Consequence: **every works subcontractor appears in the Attendance → Labour Contractor list, and every labour thekedar appears in the works-subcontractor list.** Nothing breaks, and one firm often is both in Indian practice, so the shared party master is defensible. The missing piece is a capability flag.

Record the suggested fix so it is on the record but **do not build it**: add a capability field to the party (works / labour / both), default every existing row to `both` so nothing disappears from any list, and filter each surface by it. Priority MEDIUM.

## 3.3 — Two parallel tables model the same labour event

`SubcontractorAttendance` and `MusterRoll` both record daily labour supply, with near-identical semantics and different column names:

```
SubcontractorAttendance : subcontractor_id, attendance_date, labor_role,
                          worker_count, shift_multiplier, overtime_hours
MusterRoll              : contractor_id,   date,            labor_role,
                          workers_present, workers_absent,  hours_worked, overtime_hours
```

Both foreign-key to `company_team.id`, so `subcontractor_id` and `contractor_id` point at the same entity under different names. Both are live: `SubcontractorAttendance` is written through the subcon routes, `MusterRoll` through `POST /apis/v3/labour/muster-roll`.

Record the risk: the same day's labour can be entered in both places, and any report that sums across them will double-count. **Investigate before consolidating** — they may have diverged deliberately, and `MusterRoll` additionally feeds the statutory `BOCWRecord` register. Priority MEDIUM. Do not consolidate them in this run.

---

## Cross-cutting rules

- Content and validator changes only. No application refactors. Anything else you find goes to `docs/BACKLOG.md`.
- No em dashes in help copy; use a period or comma. No emoji.
- Update the `text` search blob on every console entry you touch or search stops finding it.
- Run `pytest -n 4` (from `backend/`, `PYTHONPATH=.`), `npx tsc --noEmit`, `npm run build`. Do not delete or skip tests.
- Delete `.next/` before any build you verify against.
- `pkill` does not kill the Windows `node.exe` holding a port. Use `Get-NetTCPConnection -LocalPort <port> -State Listen | Stop-Process`.
- Push to `origin/main`; verify with `git merge-base --is-ancestor HEAD origin/main` (mind the argument order).

## Definition of Done

- [ ] Validator checks quoted labels against each entry's own cited files, **self-tested against a known-positive**, both outputs pasted.
- [ ] All 7 nonexistent labels fixed; the wrong-form ones (`New Lead +`, `Log Fuel Refill`) corrected verbatim.
- [ ] The Add Employee control investigated: real, or the entry corrected/removed. State which.
- [ ] Validator passes clean; `test_help_claims_valid.py` green.
- [ ] Mistitled mobile-app article retitled; `body` untouched. Duplicate-title check across all 86 files reported.
- [ ] `git status` shows **no changes to any `body` field** under `frontend/src/content/help/`.
- [ ] The 6 mobile-app articles otherwise unchanged.
- [ ] Three `D-0xx` rows added to `docs/BACKLOG.md`. No code written for any of them.
- [ ] `pytest -n 4` green; `tsc --noEmit` clean; `npm run build` clean; pushed and ancestry-verified.

## Final report

The validator self-test output, before and after. Every label you changed, with the file:line you read it from. What you found about Add Employee. The duplicate-title check result. The three backlog ids.

State plainly what you did not finish. Do not claim a number you did not measure.
