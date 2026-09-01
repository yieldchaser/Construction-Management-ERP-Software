# AGENT PROMPT: the statutory year means two different things

One defect, plus two small defaults beside it. **This corrects an instruction of
mine that you followed correctly.** The previous run did what the prompt asked;
the prompt was wrong.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# The defect

`d/statutory/page.tsx` holds a single `genYear`:

```js
const [genYear, setGenYear] = useState<number>(() => {
  const now = new Date();
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
});
```

That value is sent to three different endpoints, and they do not agree on what a
year is:

```
statutory.py:289   gstr1     datetime(year, month, 1)                  calendar year
statutory.py:356   pf-ecr    return_period = f"{year}-{month:02d}"     calendar year
statutory.py:449   tds-26q   "Q4": (datetime(year + 1, 1, 1), ...)     financial year label
```

GSTR-1 and PF ECR pair `year` with `genMonth` as a plain calendar month. TDS 26Q
uses `year` as the financial-year label, which is why its Q4 window is written
as `year + 1`.

So from January to March, when the financial year is one behind the calendar
year, the page asks for the wrong period. In February 2027 it sends
`month=2&year=2026` and generates **February 2026's** GSTR-1, a year stale, with
nothing on screen saying so.

The endpoints are right. Do not change them. Note that the `Query` description
on `gstr1` and `pf-ecr` says "Financial year" while the code treats it as a
calendar year; correct those two description strings so they stop misleading the
next reader, but leave the behaviour alone.

# The fix

**The month-based tabs and the quarter-based tab need different year state.**
Do not try to make one variable serve both.

- For GSTR-1 and PF ECR, the year must be the **calendar** year that goes with
  `genMonth`. Default it to the calendar year of the month being filed.
- For TDS 26Q, the year stays the **financial** year label, defaulting to the
  current financial year: if the month is January, February or March, the
  previous calendar year.

Label them in the UI so the difference is visible to whoever is filing. The
quarter dropdown already reads "Q4 (Jan - Mar)"; the year control on that tab
should read as a financial year, for example "2026 to 27", while the year control
on the monthly tabs stays a plain year. Keep the shape of the controls the same.

# Two defaults beside it

**1. The quarter defaults to a literal.**

```js
const [genQuarter, setGenQuarter] = useState<string>("Q1");
```

Every user lands on Q1 regardless of today. Default to the quarter the current
date falls in, using the same April to March mapping the dropdown already
declares.

**2. The month defaults to the current month.**

```js
const [genMonth, setGenMonth] = useState<number>(new Date().getMonth() + 1);
```

You file the month that has closed, not the one you are standing in. GSTR-1 for
a month is due on the 11th of the following month, which the endpoint itself
computes at `statutory.py:329`. Default `genMonth` to the previous month, and
default the paired calendar year to that month's year so December rolls back to
the previous year correctly.

---

# Rules

- No authoring scripts.
- Semantic tokens only.
- Plain language in UI copy. No endpoint paths, table names or permission keys.
  No em dashes in prose.
- No backend behaviour change. The only backend edit permitted is the two
  `Query` description strings named above.

# Verify it in a browser, because a grep cannot see this

State what you observed for each:

- [ ] On the GSTR-1 tab, the month and year shown are the month that just closed
      and its own calendar year.
- [ ] On the TDS 26Q tab, the year reads as a financial year and the quarter is
      the current one.
- [ ] Generate a GSTR-1 and confirm the returned `return_period` in the response
      matches the month and year on screen.

# Definition of done

- [ ] Month-based and quarter-based year state are separate, with the defaults
      above. State what each returns in February.
- [ ] The quarter defaults to the current quarter, not a literal.
- [ ] The month defaults to the previous month, with the year rolling back
      correctly in January.
- [ ] The two misleading `Query` descriptions are corrected, behaviour unchanged.
- [ ] The three browser checks above.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, 544 routes, exemptions still 30.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] **Commit and push to `origin/main`.**
