# AGENT PROMPT: finish the combined run

The previous run landed A1, A2, A3, A5, A6 and part of A4 from
`docs/AGENT_PROMPT_COMBINED_PRESENTATION_AND_PUBLIC_SITE.md`. That work is
currently **uncommitted in the working tree and was never pushed**. Read that
file for context; this one lists only what is left plus three defects found
while verifying it.

**Commit the existing working tree changes first**, as one Group A commit,
before starting anything below. They pass every gate. Do not redo them.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# PART 1: three tests have expired

Three tests fail today on a clean tree. They are not product bugs, they are
hardcoded calendars that ran out.

```
tests/coverage/test_r2_303_497_burn_curve_monthly_delta.py::test_month_with_no_bills_leaves_series_flat
tests/coverage/test_r2_303_497_burn_curve_monthly_delta.py::test_each_month_adds_only_its_own_bills
tests/coverage/test_r2_606_payroll_backdating_window.py::test_backdated_payroll_period_is_rejected
```

The burn curve one asserts `labels == ["Jul 2026", "Aug 2026"]` and now gets
`['Jul 2026', 'Aug 2026', 'Sep 2026']`. The chart correctly extends to the
current month; the test froze the calendar at August.

**Fix the tests, not the endpoint.** The behaviour is right. Rewrite all three
so their fixture dates are derived from the current date rather than written as
literals, so they keep testing the same property in any month. Check the whole
`tests/coverage` directory for other literal-year fixtures with the same rot and
fix those too, so this does not come back next quarter. Report how many files
you changed.

# PART 2: A4 is only half applied

The last run took raw status renders from 88 to 69, but roughly 18 genuine
display sites still render a raw lowercase value. Excluding `res.status` HTTP
codes and `value={...}` form bindings, which are correct as they are:

```
d/hr/page.tsx            1062, 1119, 1249, 1549, 1703
d/billing/page.tsx        984, 1433
d/crm/page.tsx           1143, 1292
d/finance/page.tsx       1519, 1861
d/home/page.tsx           635,  838
d/attendance/page.tsx     805
d/payment-approval/page.tsx 220
d/payroll-attendance/page.tsx 1292
d/integrations/tally/page.tsx 530
d/dpr/page.tsx            349
```

Route each through `formatLabel`. **Do not touch `value={...}` on a select or
input**, because those must stay the raw stored value or the control breaks.
`nb.state` in settings is a postal address field, not a status; leave it.

Report the count before and after using a command that excludes `res.status`.

# PART 3: the statutory default is a calendar year, not a financial year

`d/statutory/page.tsx` now reads:

```js
const [genYear, setGenYear] = useState<number>(() => new Date().getFullYear());
```

Deriving the range from the current date was right. The default is not. Indian
statutory filing runs on a financial year of April to March, so from January to
March the calendar year is one ahead of the financial year actually being filed.
A user filing Q4 in February 2027 is filing for FY 2026 to 27.

Default to the current **financial** year: if the month is January, February or
March, use the previous calendar year. Leave the range and the control shape as
they are.

# PART 4: the profile endpoint has six decorators for two operations

`backend/app/routers/profile.py` now stacks:

```python
@router.get("/me")
@router.get("")
...
@router.patch("/me")
@router.put("/me")
@router.patch("")
@router.put("")
```

Two operations, six registered routes. The reachability gate went from 542 to
548 carrying the spares. Keep **one** path and one verb per operation: `GET /me`
and `PATCH /me`. Update the frontend call in `settings/page.tsx` to match
whichever verb you keep. Route count must come back down; report the new total.

---

# PART 5: Group B, untouched

Nothing in Group B was done. `/dev/icons` still exists, there is no `robots.ts`
and no `sitemap.ts`, and the seven duplicate titles are still live.

**Do all four items exactly as written in Group B of
`docs/AGENT_PROMPT_COMBINED_PRESENTATION_AND_PUBLIC_SITE.md`.** They have not
changed. Land them as a separate commit from Group A.

The one rule worth repeating because breaking it is silent: **do not touch the
marketing help article JSON `body` fields.** They are rendered with
`dangerouslySetInnerHTML` and parsed by `annotateHeadingsForToc()`, so editing
the markup breaks the in-page table of contents without any error.

---

# Rules

- No authoring scripts.
- Semantic tokens only.
- Plain language in UI copy. No endpoint paths, table names or permission keys.
  No em dashes in prose.
- Group B touches the public site only.

# Definition of done

- [ ] The existing working tree work is committed as Group A before anything else.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` is **fully green**.
      Report the passed and skipped counts. It was 1152 passed, 4 skipped before
      the calendar rolled over, and the three failures above are the only known
      gap.
- [ ] Literal-year fixtures swept across `tests/coverage`. Report file count.
- [ ] Raw status renders routed through `formatLabel`, excluding form bindings.
      Report before and after with the command used.
- [ ] Statutory default is the financial year. State what it returns in February.
- [ ] `profile.py` has one path and one verb per operation, frontend updated.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**. Report the new route total; it should drop below 548.
- [ ] `/dev/icons` is gone. Report the HTTP status after deploy.
- [ ] `/robots.txt` returns 200 and disallows the five application paths.
- [ ] `/sitemap.xml` returns 200. Report how many URLs it contains.
- [ ] All twelve public titles listed, duplicates visibly gone.
- [ ] No marketing help article `body` field modified. Confirm with a diff summary.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] **Commit and push to `origin/main`**, Group A and Group B separate.
