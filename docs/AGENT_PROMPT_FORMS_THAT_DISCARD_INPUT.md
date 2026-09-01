# AGENT PROMPT: a form that cannot submit, and two that throw input away

An interaction-level sweep: not "does the page render" but "does the form on it
actually do what it says". Three findings, and the first one means a whole
feature has never worked.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# PART 1: applying for leave returns 422 from both entry points

`backend/app/routers/hr.py:1167` requires an employee id, and the comment above
it explains exactly why it was made mandatory:

```python
# R2-527: employee_id is mandatory. An optional id let one approved leave
# be counted against every employee sharing the name ...
employee_id: uuid.UUID
```

No `Optional`, no default. **Neither of the two screens that apply for leave
sends it.**

`d/hr/page.tsx:1978`:

```js
body: JSON.stringify({
  project_id: projectId || null,
  employee_name: emp.name,
  leave_type: leaveForm.leaveType,
  start_date: new Date(leaveForm.startDate).toISOString(),
  end_date: new Date(leaveForm.endDate).toISOString(),
  days_count: isNaN(diff) ? 1.0 : parseFloat(diff.toString())
})
```

`d/payroll-attendance/page.tsx:1442` sends the same six fields, also without it.

So `POST /hr/leaves/{company_id}` should reject every submission with a 422 for a
missing required field. The user fills the form, presses apply, and gets an
error, or worse a silent failure if the screen does not surface it.

**Note the shape of the bug.** `d/hr` already has the employee id in hand at that
moment: it looks up `emp` to read `emp.name`, and `emp` is the record whose id is
required. It is one property away.

## What to do

Send `employee_id` from both screens. In `d/hr` use the employee already
resolved for `employee_name`. In `d/payroll-attendance` the applicant is the
signed-in user, so resolve their staff record rather than sending only
`userName`; if that cannot be resolved, block the submit with a clear message
instead of posting something the API will reject.

**Confirm the 422 first.** I did not test this live because it would mean
writing to the founder's production data, so this is read from the code and the
schema. Reproduce it yourself against a scratch company before you fix it, and
report the status code you got. If it does not 422, say so and tell me what I
missed rather than fixing something that is not broken.

Then check whether the failure is even visible: does the screen show the error,
or does the modal close as though it worked? Say which.

# PART 2: the reason for leave is collected and discarded

The Apply Leave modal has a Reason field, bound at `d/hr/page.tsx:1955`. The
submit body above does not include it, `LeaveRequestCreate` has no field for it,
and `LeaveRequest` in `models.py:1508` has no column for it.

A person types why they need the leave, and it goes nowhere. On a product where
an approver decides from that screen, the one piece of context that would inform
the decision is the piece being dropped.

Add it end to end: a nullable column, the schema field, and show it to the
approver. It is optional input, so keep it optional.

# PART 3: the workforce library keeps one field out of five

`d/hr/page.tsx` opens an Add Workforce modal collecting five things: worker type,
rate type, salary per shift, shift hours and cost code. All five are bound to
inputs at `:2067` through `:2117`.

The submit at `:599` sends two:

```js
body: JSON.stringify({ company_id: companyId, name: workforceForm.workerType }),
```

`WorkforceCreate` at `library.py:87` accepts exactly `company_id` and `name`, and
`LibraryWorkforce` at `models.py:2120` has columns for `id`, `company_id`, `name`
and `created_at`. There is nowhere for the other four to go.

**And the library table renders them anyway.** `d/library/page.tsx:930`:

```jsx
<td>{formatLibraryCell(item.salary_per_shift ?? item.salaryPerShift)}</td>
```

reading a field the API cannot return. The Workforce Library tab shows columns
for Cost Code, Salary Per Shift and Shift Hours that are structurally guaranteed
to be blank on every row, forever.

So the loop is: ask for five values, keep one, then display four empty columns
for the four that were dropped.

## What to do

Decide and say which you chose. Either:

- **Complete it.** Add the four columns, extend the create and update schemas,
  send all five from the form, and the table starts working. This is the option
  I would pick, because rate and shift hours on a workforce type are the inputs
  that make labour costing work, and the table already promises them.
- **Cut it back.** Remove the four inputs from the modal and the four columns
  from the table, so the screen stops asking for things it discards.

Do not leave it as it is. A form that quietly drops four of five fields is worse
than either option.

---

# What this sweep found nothing of

So you know where not to spend time. Across every console page:

```
buttons with no handler at all          0
onClick handlers that are empty         0
onClick handlers that only log or alert 0
href="#" placeholder links              0
"coming soon" / "not implemented" copy  0
```

I self-tested the dead-button detector against a file containing one dead button,
one wired button and one disabled button, and it correctly reported only the
dead one. So that zero is a real result, not a broken tool.

The remaining incompleteness in this product is not stub buttons. It is forms
that look finished and quietly drop what you typed, which is why this sweep
looked at whether each field reaches a request body rather than at whether each
button has a handler.

# Rules

- No authoring scripts.
- Semantic tokens only.
- Plain language in UI copy. No endpoint paths, table names or permission keys.
  No em dashes in prose.
- Migrations for any new column, following the existing ledger convention.
- Do not create records in the founder's production data to test. Use a scratch
  company.

# Definition of done

- [ ] The 422 reproduced and reported with its status code, then fixed, with
      `employee_id` sent from both screens.
- [ ] Whether the failure was visible to the user before the fix, stated plainly.
- [ ] Leave reason stored and shown to the approver.
- [ ] Workforce library either completed or cut back, with your reasoning.
- [ ] A test that **fails against the current tree** for the leave 422, at the
      assertion. Report that it failed first and what it said.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, exemptions still 30. Report the route total.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts. It is 1165 passed, 4 skipped today.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] **Commit and push to `origin/main`.**
