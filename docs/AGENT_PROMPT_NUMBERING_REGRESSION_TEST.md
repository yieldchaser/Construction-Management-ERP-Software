# AGENT PROMPT: the numbering tests do not guard the defect they describe

Small run, one test file. The fix from the last run is correct and stays. The
regression guard around it does not hold, and its docstring states a failure
that could not have happened.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# What is wrong

`backend/tests/coverage/test_numbering_defaults.py` opens with:

```python
from app.routers.quality import _generate_ncr_number
from app.routers.billing import _generate_wo_number
```

Both helpers were created by the fix. Every one of the five tests calls one of
them. So against the tree before the fix, the module cannot import and pytest
exits 2 at collection:

```
E   ImportError: cannot import name '_generate_ncr_number' from 'app.routers.quality'
```

I ran that myself against a checkout from before the fix. It fails at import,
not at any assertion.

That matters because of what the file claims in its own docstring:

```
The collision assertion in
test_thirty_consecutive_ncrs_do_not_collide fails with:
  AssertionError: Collision on create N: 'NCR-2026-XYZ' already used
```

That test calls `_generate_ncr_number` in a loop. On the unfixed tree it cannot
run, so it cannot produce that message. Whatever produced it was a different
draft that is not what got committed. **Delete that paragraph from the
docstring.** A test file must not describe a failure it cannot produce; the next
person to read it will trust it.

# The real gap

These five are unit tests of the new helpers. They prove the helpers count
correctly. They do not test the defect.

The defect was that **the frontend generated the number and sent it**. If
someone reintroduces `NCR-2026-${Math.floor(100 + Math.random() * 900)}` in
`d/quality/page.tsx` tomorrow, all five tests still pass. The guard sits on the
wrong side of the boundary that broke.

# What to write instead

Keep the existing five. Add endpoint level tests that go through the API the way
the screen does, and that would fail on the unfixed tree at an assertion rather
than at an import.

For NCR, against `POST /apis/v3/quality/ncr`:

- Create thirty NCRs in one project **omitting `ncr_number` entirely**. Assert
  every response is 201 and that the thirty returned numbers are thirty distinct
  values. On the unfixed tree `ncr_number` was a required field, so omitting it
  returned 422, and that is a real assertion failure rather than a collection
  error.
- Create one NCR passing an explicit `ncr_number` and assert it is honoured, so
  the new optional field does not quietly ignore user input.
- Create an NCR with a number that already exists in that project and assert the
  409 still fires with its existing message. That path must survive.

For work orders, the same three shapes against `POST /apis/v3/billing/work-orders`.

Prove the sequence is per project for NCRs: two projects in one company each get
their own `NCR-0001`. The helper filters on `project_id`, so this should already
hold; assert it so a later change to company wide scoping cannot pass silently.

# Do not

- Do not change `_generate_ncr_number` or `_generate_wo_number`. They are right.
- Do not change the frontend. This run is tests and one docstring.
- Do not weaken or delete the existing five tests.

# Definition of done

- [ ] The false paragraph is gone from the docstring, and what replaces it
      describes only what the file actually verifies.
- [ ] Endpoint level tests exist for NCR and work order numbering, covering
      omitted, explicit and duplicate numbers, plus per project scoping.
- [ ] State plainly whether each new test **fails against the tree before the
      last run's fix**, and at which assertion. If a test cannot fail there for a
      structural reason, say so rather than claiming it did.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts. It is 1158 passed, 4 skipped today and
      must only go up.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, 544 routes, exemptions still 30.
- [ ] **Commit and push to `origin/main`.**
