> **SUPERSEDED. Do not run this file.** Everything in it is in
> `docs/AGENT_PROMPT_SCREEN_AND_FORMS.md` as Group C. Run that instead.

# AGENT PROMPT: three screens reading fields the API never sends

A sweep for the mechanism behind the workforce library defect: a screen reading a
field off an API response that no backend model can carry. The read is always
undefined, so the column, the badge or the count is blank or zero forever, and
nothing errors.

I compared every snake_case property read in the frontend against every field
name the backend could put in a response: **2,523 reads against 1,698 known
backend names.** Seven came back unknown. Four are real, one is already covered
in `AGENT_PROMPT_SCREEN_AND_FORMS.md`, and two are harmless. The three below are
the new ones.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# PART 1: the geofence distance is measured, returned, and never shown

This is the one worth doing first, because the data already exists.

`p/[project_id]/attendance/page.tsx:839`:

```jsx
<td>{log.distance_meters != null ? `${log.distance_meters.toFixed(0)}m` : …}</td>
```

There is no `distance_meters` anywhere in the backend. The field is called
**`distance_from_site_m`**:

```
backend/app/models.py:786   distance_from_site_m = Column(Numeric(10, 2), nullable=True)
backend/app/routers/hr.py:182   distance_from_site_m: Optional[float]
backend/app/routers/hr.py:439   distance_from_site_m=Decimal(str(distance_m)) if distance_m is not None else None
```

So the backend computes how far from the site a punch was made, stores it,
and returns it in the response. The attendance table asks for the wrong name and
renders the fallback on every row.

**On this product that matters.** The whole point of a geofenced punch is
knowing whether the worker was actually at site. The number that answers it is
being fetched and thrown away at the last step.

Fix the read to `distance_from_site_m`. Then check the other attendance surfaces
for the same mistake, and check whether anything filters or flags on distance,
since a filter reading the wrong name would silently match nothing.

# PART 2: the DPR "Subcon Updates" card always counts zero

`d/dpr/page.tsx:268`:

```js
{ label: "Subcon Updates",
  value: logs.filter((l: any) => l.subcon_name).length > 0 ? … : … }
```

`subcon_name` does not exist anywhere in the backend, and `DPRLogResponse` at
`dpr.py:43` has no subcontractor field of any name: it carries
`reported_by`, `dpr_date`, `weather`, `executed_qty`, `workers_deployed`,
`materials_consumed`, `photos`, `notes`, `issues`, `status`.

So the filter matches nothing, always, and the card is a permanent zero next to
three cards that show real numbers. A site manager reads it as "no subcontractor
worked today", which is a statement about the world, not a missing feature.

**Decide and say which you chose.** Either:

- **Remove the card**, if a daily progress report is not meant to carry a
  subcontractor. Three honest cards beat four with one lying.
- **Add the link**, if it is. A DPR that records who did the work is normal on
  this kind of product, and the subcontractor is already a first-class entity.
  That is a feature, so if you pick it, say so plainly and do it end to end
  rather than half.

I lean to removing it in this run and letting the founder decide whether the
link is wanted, because inventing a data model on a stat card is the wrong place
to start.

# PART 3: the rate library shows a components column that cannot fill

`d/library/page.tsx:1138`:

```jsx
<td className="px-6 py-4 text-center text-muted">{formatLibraryCell(item.component_count)}</td>
```

No backend field of that name. The column header sits above a row of dashes on
every rate card item, forever.

Either count the components server side and return it, or drop the column. If
rate card items genuinely have components in this product, returning the count
is a small query and the column becomes useful; if they do not, the column is
noise. Say which you found and which you did.

---

# What this sweep clears

So you do not spend time re-deriving these.

**Edit forms are sound.** I ran the required-field comparison against
`PUT` and `PATCH` as well as `POST`: **11 update endpoints with required fields,
50 frontend update calls, zero mismatches.** Whatever is wrong in this product,
it is not that edit forms omit required fields.

**The creator-name fallback chain is fine.** `d/library/page.tsx:1044` reads
`item.creator_name || item.creatorName || item.created_by_name || …` through
seven names. Only the first two resolve; the rest are defensive dead ends, not
defects. Leave that chain alone.

---

# Rules

- No authoring scripts.
- Semantic tokens only.
- Plain language in UI copy. No endpoint paths, table names or permission keys.
  No em dashes in prose.
- Part 1 is a frontend rename. Parts 2 and 3 may touch the backend only if you
  choose the "add it" branch, and then with a migration.

# Verify in a browser, because a grep cannot see any of this

State what you observed:

- [ ] An attendance punch with a recorded distance shows the distance, not the
      fallback. Use `AK Construction`, which has real attendance data.
- [ ] The DPR stat cards no longer include a card that is structurally always
      zero.
- [ ] The rate library either shows a real component count or no such column.

# Definition of done

- [ ] `distance_meters` reads 0 in the frontend; the attendance table shows the
      real value. Report whether any filter or flag also read the wrong name.
- [ ] The DPR subcon card removed or backed by real data, with your reasoning.
- [ ] The rate library components column removed or populated, with your
      reasoning.
- [ ] Re-run the phantom-field comparison yourself and report the remaining
      count. Parse backend model fields and columns, collect every snake_case
      property read in the frontend, subtract the names the frontend declares
      itself, and report what is left. **Self-test it first**: `salary_per_shift`
      must come back unknown and `company_id` must not.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, exemptions still 30. Report the route total.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] **Commit and push to `origin/main`.**
