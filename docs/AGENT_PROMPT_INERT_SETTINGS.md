# AGENT PROMPT: settings that save but never do anything

A different class from the frozen defaults. These are controls the customer can
find, read, change and save, that no code anywhere consults. The value round
trips to the database and back to the screen, so the setting looks like it
worked. Nothing changes.

Found by listing all 51 `Company` columns and checking each for a reader outside
`settings.py`, on both the backend and the frontend. The method is in the
report section at the end; run it again yourself before you start, because the
list must be true on the day you fix it, not the day I wrote it.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# The finding

Seven controls are inert. Each has a visible control in Settings and no reader:

```
quantity_decimal_places        Field  "Quantity Decimal Places"
back_dated_limit_days          Field  (Workflow Controls)
bom_restriction                Toggle "Restrict BOM Material"
                                      desc "Restrict edits to Bills of Material"
material_request_restriction   Toggle "Material Request Restriction"
                                      desc "Restrict the Material Request flow"
negative_balance_warning       Toggle (Workflow Controls)
google_sheets_enabled          Toggle (Integrations)
weekly_off                     (superseded, see below)
```

**What makes this bad is the company they keep.** The same Workflow Controls
panel holds toggles that genuinely work:

```
po_restriction                 enforced at procurement.py:613
negative_stock_lock            enforced at workflow_controls.py, dpr.py
restrict_entry_creation_days   enforced at workflow_controls.py
```

A site manager reading that panel has no way to tell "Restrict BOM Material"
from "PO Restriction". They look identical, they save identically, and one of
them protects the books while the other does nothing at all. A customer who
turns on a restriction and believes it is on is worse off than one who never
found the setting.

---

# What to do with each

Do not assume the answer is "wire it up". For some of these the honest fix is to
take the control off the screen. Decide per item and **state your reasoning for
each in the report.**

## 1. `quantity_decimal_places`

`CompanySettingsContext` already fetches it and exposes `quantityDecimalPlaces`.
No component reads that value. Meanwhile `currencyDecimalPlaces` from the same
context is consumed by `d/crm`, `d/payroll-attendance`, `enterprise` and
`p/[project_id]/boq`, so the plumbing works and only this one is unconnected.

**Wire it.** Quantities are rendered with hardcoded precision in roughly 71
places across the console. You do not need to convert all of them in this run,
and you should not try. Convert the quantity displays that matter most on a
material heavy product: stock on hand, reserved and available in `d/procurement`
and `d/production`, and DPR consumption. Report how many call sites you changed
and how many remain.

## 2. `back_dated_limit_days`

Look closely before touching this. `restrict_entry_creation_enabled` and
`restrict_entry_creation_days` already implement a back dating window and are
enforced. `back_dated_limit_days` looks like an earlier attempt at the same idea
that was superseded and left behind.

**If it is a duplicate, remove the control from the screen** rather than wiring a
second competing window, and say so in your report. Two settings that both claim
to limit back dating, where one works and one does not, is worse than one
setting. Leave the column in the database; dropping it is a migration and is not
this run.

If you find it is genuinely distinct from the entry creation window, wire it, and
explain what the difference is.

## 3. `bom_restriction` and `material_request_restriction`

Both are toggles promising to restrict a flow. Neither is read anywhere.

Work out what each is supposed to restrict by reading how `po_restriction` does
its job at `procurement.py:613`, which blocks a purchase order that has no
originating indent. Then either enforce the equivalent rule for bills of material
and for material requests, or remove the toggles.

**Prefer enforcing.** These are exactly the controls a customer buys this
product for. But if the flow they name does not exist in a form that can be
restricted, say that plainly and take the toggle off the screen rather than
inventing a rule nobody asked for.

## 4. `negative_balance_warning`

This one is now entangled with recent work. The procurement and production
screens were just changed to show negative stock in the danger tone with a
"needs reconciling" label, unconditionally.

So the behaviour this setting names is currently always on. Either make the
warning honour the toggle, or remove the toggle because the warning is now
standard behaviour. **I lean to removing it**, because a warning about a broken
ledger is not something a company should be able to switch off, and that was the
reasoning behind showing negatives in the first place. Make the call, do it, and
say which you chose.

## 5. `google_sheets_enabled` and `google_sheets_auth_phone`

Note that `google_sheets_authorized_phones`, the plural one, **is** read and
enforced. The enable toggle and the singular phone field are not.

That is the worst arrangement of the three: a customer can turn the integration
"off" while the authorised phone list continues to work. Find out whether the
enable toggle is meant to gate the integration, and if so gate it. If the plural
list is the real control and the other two are leftovers, remove them from the
screen.

## 6. `weekly_off`

`weekly_off_days`, the plural, is read and used. The singular `weekly_off` is
not. Same shape as the phone fields. Remove the dead one from the screen.

---

# Not in scope

Leave these alone. They came up in the same sweep and are not defects:

- `subscription_plan`, `subscription_start`, `subscription_end`,
  `subscription_renewal`. Billing is deliberately deferred and is the founder's
  own work, tracked as D-023. Do not build anything here.
- `business_segment`, `company_size`, `construction_types`, and the
  `onboarding_*` fields. These are descriptive profile data. Storing them
  without acting on them is the point.

---

# Rules

- No authoring scripts.
- Semantic tokens only.
- Plain language in UI copy. No endpoint paths, table names or permission keys.
  No em dashes in prose.
- Do not drop any database column. Removing a control from the screen means
  removing the control, not the data.
- Every rule you enforce needs a test that fails against the current tree.

# How I found these, so you can re-run it

Parse the `Company` model for its columns. For each column, search the backend
excluding `models.py`, `settings.py` and `schemas.py`, and search the frontend
excluding the settings page itself and `CompanySettingsContext`. Check both the
snake_case name and its camelCase form, because the frontend renames them. A
column with no hit on either side is inert.

**Self test it before you believe it.** Feed it `po_restriction`,
`negative_stock_lock` and `restrict_entry_creation_days`, which must come back
wired, and a column name that does not exist, which must come back inert. I
built this and got the wrong answer on the first pass because I searched only the
backend, which made `currency_decimal_places` look dead when it is enforced in
the frontend. Search both sides or you will report a working setting as broken.

# Definition of done

- [ ] The sweep re-run by you, with its self test, and the current inert list
      reported. Say whether it matches the seven above.
- [ ] A decision stated for each of the seven: enforced, or control removed, with
      one line of reasoning.
- [ ] `quantity_decimal_places` reaches the stock and consumption displays.
      Report call sites changed and remaining.
- [ ] For every setting you enforced, a test that **fails against the current
      tree** at the enforcement assertion. Report that it failed first and what
      the failure said.
- [ ] For every control you removed, confirmation the column still exists and
      only the UI changed.
- [ ] No `subscription_*` or profile field touched. Confirm with a diff summary.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, exemptions still 30. Report the route total.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] **Commit and push to `origin/main`.**
