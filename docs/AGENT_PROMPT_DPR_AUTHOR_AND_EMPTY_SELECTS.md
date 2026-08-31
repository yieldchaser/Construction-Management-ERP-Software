# AGENT PROMPT: a cross-tenant count, a raw UUID author, and 28 dead-end dropdowns

Three parts, one run. Part 1 is the important one and is a tenant isolation defect, so do it first and do not fold it into the others.

---

# PART 1: the User Activity Leaderboard counts other companies' DPRs

## The defect

`_rep_company_user_activity_leaderboard` in `backend/app/routers/reports.py:3190`:

```python
for ct in q.all():
    user_name = _team_user_name(db, ct.id)
    dpr_cnt = db.query(DailyProgressReport).filter(DailyProgressReport.reported_by == user_name).count()
    todo_cnt = db.query(Todo).filter(Todo.company_id == cid, Todo.created_by == ct.id).count()
```

The DPR count filters on **nothing but the author's display name**. There is no company filter, no project filter, and no join. `DailyProgressReport` has no `company_id` column; it is scoped only through `project_id`, and that relationship is never used here.

So the number counts daily progress reports from **every company in the database** whose author name happens to match. Two tenants each employing a "Rajesh Kumar" contaminate each other's leaderboard. The `todo_cnt` on the very next line scopes correctly to `cid`, which shows the intent and makes this a plain omission rather than a design choice.

This is a tenant isolation defect. It leaks an aggregate rather than row content, which is why the earlier cross-tenant probes over 106 routes did not catch it: the response body looks perfectly normal, only the number is wrong.

The function already receives `pid: Optional[uuid.UUID]` and ignores it for this count.

## The fix

Scope the count through the project relationship, exactly as the surrounding report code scopes its own queries:

- Join `DailyProgressReport` to `Project` and filter `Project.company_id == cid`.
- When `pid` is provided, additionally filter `DailyProgressReport.project_id == pid`, so the project-filtered view of this report means what it says.
- Keep matching the author, but see Part 2: the match must accept both the stored name and a legacy UUID.

## Prove it

Write a test in `backend/tests/coverage/` that seeds **two companies**, each with a user of the **same display name**, and a DPR under each company's project. Assert the leaderboard for company A reports **1**, not 2.

**Run it against the unfixed tree first and watch it return 2.** Paste that failure into your report. This is the whole point of the test; a test that has never failed proves nothing here.

---

# PART 2: a raw UUID is shown as the author of a site record

## What the founder saw

The DPR activity feed shows:

```
Reported By: 7f6c0bcf-fb15-4de1-b1ad-9acbfc02c7a1
```

## Why

`reported_by` is a `String(255)`. Finding R2-408 changed `create_dpr` to store the authenticated user's name (`dpr.py:129`), but rows written before that change hold a raw user UUID, and there is no migration.

The backend already knows this. The CSV export at `dpr.py:248` resolves legacy UUIDs to names in a batch and falls back to `"Unknown"`:

```python
author_uuids = [...]
users_by_id = {u.id: u.name for u in db.query(User).filter(User.id.in_(set(author_uuids))).all()}
```

**Two other endpoints do not:**

| Endpoint | Line | Problem |
|---|---|---|
| `get_dprs` (the feed) | `dpr.py:191` | returns ORM rows straight through, so the UI prints the UUID |
| `get_dpr_summary` | `dpr.py:206` | `"reporter": d.reported_by` raw, same leak into the flagged-issues list |

This is the same shape as the Safety `Fatality` bug: the backend carries legacy tolerance in one code path and not the sibling paths.

## The fix

Extract the export's resolution into **one shared helper** in `dpr.py`, something like `resolve_dpr_authors(db, reports) -> dict[str, str]`, taking the report rows and returning a mapping from the stored `reported_by` string to a display name. Batch the user lookup in a single query; do not resolve per row.

Use it in all three places: the feed, the summary, and the export. Replacing the export's inline block with the helper is part of the work, so the three cannot drift apart again.

Behaviour to preserve exactly: a value that is not a UUID is already a name and passes through unchanged; a UUID with no matching user renders `"Unknown"`, which is what the export does today.

**Then apply the same tolerance to Part 1's author match**, so a legacy UUID row still counts toward its author's total instead of silently scoring zero.

---

# PART 3: 28 dropdowns that dead-end on a new company

## What the founder saw

On a fresh tenant, Create Purchase Order shows **Select Vendor** with no vendors and **Select Material** with no materials. The form cannot be completed, and nothing on screen says why or where to go.

**The code is correct.** The fetch works, the tenant genuinely has no records. This is a missing empty state, not a bug. But the effect on a first-time user is the same as a broken screen, and it is the exact dead-end pattern already fixed for empty *lists*. Empty *dropdowns* were never covered, and my earlier sweep explicitly excluded `<option>` placeholders as correct, which was too broad a judgement.

Two specifics worth knowing, because they are not guessable from the PO screen:

- Vendors come from `GET /apis/v3/billing/subcontractors`, and are registered on **Procurement & Materials, Subcontractors** (`/c/{companyId}/d/subcon`).
- Materials come from `GET /apis/v3/library/materials/{companyId}`, and are registered on **Library** (`/c/{companyId}/d/library`).

## The scope

There are **99 data-backed `<select>` elements across 37 files**. Most are filter toolbars where "no options" is harmless and no hint is wanted. **Do not touch those.**

The ones in scope are the **28 that ask for a required choice**, identified by a placeholder reading "Select ...", "Choose ...", or similar. The full list, by the state array each one maps over:

```
d/procurement/page.tsx:1210  vendorOptions    Select Vendor
d/procurement/page.tsx:1057  materials        Select Material
d/billing/page.tsx:903       subcontractors   Select subcontractor
d/billing/page.tsx:686       matchOptions     Select approved match
d/subcon/page.tsx:353        subcontractors   Select subcontractor
d/three-way/page.tsx:264     pos              Select PO
d/three-way/page.tsx:271     grns             Select GRN
d/three-way/page.tsx:278     bills            Select bill
d/hr/page.tsx:1233           employees        Select Employee
d/hr/page.tsx:1771           employees        Select employee
d/hr/page.tsx:1982           costCodes        Select Cost Code
d/hr/page.tsx:1294           projectTasks     Select Project Task (Optional)
d/finance/page.tsx:3407      usersList        Select party to debit
d/finance/page.tsx:3422      usersList        Select party to credit
d/finance/page.tsx:3969      usersList        Search or select party
d/crm/page.tsx:982           leads            Select Lead
d/crm/page.tsx:1083          banks            Select bank
d/chat/page.tsx:901          teamOptions      Select a team member
d/quality/page.tsx:935       checklists       Choose Template
d/planning/gantt/page.tsx:857 tasks           Choose Task
d/payroll-attendance/page.tsx:349 templates   Select a saved template
```

plus the remainder of the 28. Find them with the same shape: a `<select>` whose `<option>` list is produced by `.map()` over a state array, carrying a "Select"/"Choose" placeholder.

**Excluded, and do not add a hint to these:** any select backed by a **constant** rather than fetched data, because it can never be empty. `d/library/page.tsx:1152` (`UNITS`), `d/crm/page.tsx:920` (`PRIORITY_OPTS`), `d/crm/page.tsx:852` (`COUNTRY_CODES`) and `d/delete-logs/page.tsx:139` (`ENTITY_TYPES`) are the known cases. Also leave every filter-toolbar select alone: `Assignee`, `Priority`, `Status`, `Source`, `Category`, `All Projects` and the like.

## What to build, decided

Add one small shared component, `frontend/src/components/ui/FieldHint.tsx`: a single muted line rendered under a form control, at `text-[10px] text-muted mt-1`, accepting text and an optional `href` plus link label rendered with `next/link`.

For each in-scope select, when its source array is empty, render a `FieldHint` beneath it naming what is missing and linking to the page where that record is created. For the two known cases:

- Vendor: `No vendors yet. Add one in Subcontractors.` linking to `/c/{companyId}/d/subcon`.
- Material: `No materials yet. Add one in Library.` linking to `/c/{companyId}/d/library`.

**Do not guess a destination.** For each remaining select, read what populates the array, follow the endpoint to the page that creates that record, and link there. Where the record is created on the same page in a different drawer, open that drawer instead of navigating. If you genuinely cannot determine where a record is created, leave that select alone and list it in your report rather than inventing a route.

**Keep the select enabled.** A disabled control with no explanation is worse than an empty one with a hint.

Plain language only, per the help-copy rule: no endpoint paths, no table names, no permission keys in anything a user reads.

---

# Definition of done

- [ ] The leaderboard DPR count is scoped by company through `Project`, and honours `pid` when given.
- [ ] A two-company same-name test exists, was **watched failing** against the unfixed tree returning 2, and now returns 1. Paste the failure.
- [ ] One shared author-resolution helper is used by the feed, the summary and the export. The export's inline block is gone.
- [ ] A legacy UUID row renders a name, or `Unknown` when the user is missing. A non-UUID value is unchanged.
- [ ] Legacy UUID rows count toward their author in the leaderboard.
- [ ] `FieldHint` exists and every in-scope empty select shows a hint with a correct destination. Report the count and each destination you chose.
- [ ] Constant-backed and filter selects are untouched. Report that count too.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes with the new test included.
- [ ] `cd frontend && npx tsc --noEmit` clean, `npm run build` completes.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels.
- [ ] **Commit and push to `origin/main`.**

Report a measured number with the command that produced it for every box. Do not write a script that rewrites files; edit in place.
