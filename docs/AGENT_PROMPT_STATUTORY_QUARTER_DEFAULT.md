# AGENT PROMPT: the TDS quarter should default to the quarter that closed

One small defect in `d/statutory/page.tsx`. **This corrects an instruction of
mine, not your work.** The previous run did exactly what I asked; what I asked
was inconsistent.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# The defect

The monthly tabs default to the month that **closed**:

```js
const [genMonth, setGenMonth] = useState<number>(() => {
  const now = new Date();
  const m = now.getMonth();
  return m === 0 ? 12 : m;
});
```

That is right. You file a period after it ends.

The TDS tab defaults to the quarter you are **standing in**:

```js
const [genQuarter, setGenQuarter] = useState<string>(() => {
  const m = new Date().getMonth();
  if (m >= 3 && m <= 5) return "Q1";
  ...
});
```

So in April a user lands on Q1 of the new financial year, three days old and
almost empty, when what is actually due is Q4 of the year that just ended. Its
own due date says so: `statutory.py:455` puts Q4 at `{year+1}-05-31`, the end of
May. Two controls on one screen, two different ideas of which period you file.

# The fix, and the trap in it

Default the quarter to the one that has closed.

**The financial year has to move with it.** This is the part that will bite if
you change only the quarter. `genFinancialYear` is currently `y - 1` from January
to March and `y` otherwise. That is correct for the *current* quarter. It is
wrong for the *closed* quarter from April to June: the closed quarter there is
Q4, and `statutory.py:452` defines Q4 as `(datetime(year + 1, 1, 1),
datetime(year + 1, 4, 1))`, so Q4 of FY `y` is January to March of `y + 1`, which
has not happened yet. Leaving the year alone would default the page to a quarter
in the future and return an empty file.

This is the whole table. Derive both values together, in one place:

| Today | Closed quarter | Financial year |
|---|---|---|
| Jan, Feb, Mar | Q3 | `y - 1` |
| Apr, May, Jun | Q4 | `y - 1` |
| Jul, Aug, Sep | Q1 | `y` |
| Oct, Nov, Dec | Q2 | `y` |

Read across: the financial year is `y - 1` from January to June and `y` from July
to December. That is not the same rule as the current-quarter one, which is why
the two must be computed as a pair rather than separately.

Sanity check the result against the backend windows at `statutory.py:449-453`.
In April 2027 the page should default to Q4 with financial year 2026, and the
endpoint should return a window of 1 January 2027 to 1 April 2027. If your
defaults produce a window that has not finished yet, they are wrong.

Change nothing else. The monthly defaults, the split state, the dropdown labels
and the endpoints are all correct as they stand.

---

# Rules

- No authoring scripts.
- Semantic tokens only.
- No backend change at all in this run.
- Plain language. No em dashes in prose.

# Verify across the calendar, not just today

Today is September, so a single check proves almost nothing about a rule that
only misbehaves in other months. Evaluate your default expressions for all
twelve months and report the quarter and financial year each produces, as a
twelve line table. Every row must name a quarter whose window has already closed.

# Definition of done

- [ ] The quarter defaults to the closed quarter, and the financial year is
      derived with it in one place.
- [ ] The twelve month table above, with what each month produces.
- [ ] State explicitly what April and what January produce, since those are the
      two rollover edges.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, 544 routes, exemptions still 30.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] **Commit and push to `origin/main`.**
