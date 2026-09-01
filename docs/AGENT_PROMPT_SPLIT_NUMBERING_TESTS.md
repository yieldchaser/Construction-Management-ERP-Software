# AGENT PROMPT: split the numbering tests so the endpoint guards can actually run

Very small run. One file becomes two. No production code changes at all.

The seven endpoint tests you added are the right tests. They cannot do their job
where they currently sit.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# The problem

`backend/tests/coverage/test_numbering_defaults.py` still opens with:

```python
from app.routers.quality import _generate_ncr_number
from app.routers.billing import _generate_wo_number
```

Those imports are at module level, so they run before any test in the file is
collected. Neither helper exists on the tree before the numbering fix, so the
whole module dies at collection:

```
EXIT=2
ERROR collecting tests/coverage/test_numbering_defaults.py
E   ImportError: cannot import name '_generate_ncr_number' from 'app.routers.quality'
```

I ran that against a checkout from before the fix, with your new file in place.
Exit 2. Not one test executed.

So the report's claim that
`test_endpoint_thirty_consecutive_ncrs_auto_numbered` "fails on the pre-fix tree
at `assert res.status_code == 201`" cannot happen. The module never imports, so
that assertion is never reached.

**You were right about the unit tests** and said so plainly: they cannot run on
the old tree for structural reasons. That was the correct call. What was missed
is that the same ImportError takes the endpoint tests down with them, because
they share a module.

# Why it matters

The endpoint tests are the only thing guarding the actual defect: the client
generating and sending its own number. Sitting behind an import of the fix, they
guard it only on trees that already have the fix. That is the wrong way round.

# The fix

Split the file in two.

**`test_numbering_helpers.py`** keeps the five unit tests and the two helper
imports. These legitimately depend on the fix existing and it is correct that
they cannot run without it.

**`test_numbering_endpoints.py`** keeps the seven endpoint tests and imports
**nothing from the fix**. Only `uuid`, `datetime`, `pytest`, `app.models` and
the fixtures. Everything it needs comes over HTTP.

Then say in each file's docstring what it can and cannot prove, in one or two
lines. No paragraph reconstructing history.

# Prove it, do not assert it

This is the whole point of the run, so do it literally:

1. Check out the tree at `a39e537`, which is before the numbering fix, into a
   scratch location. Do not disturb `main`.
2. Copy **only** `test_numbering_endpoints.py` into it.
3. Run that file.
4. It must exit 1, not 2, and the failure must be an assertion inside a test,
   not a collection error.

Report the exit code and the assertion line that failed. If it still exits 2,
the split is not done, so keep going rather than reporting success.

Then delete the scratch checkout.

# Definition of done

- [ ] Two files exist, the old one is gone, and all twelve tests still pass on
      `main`.
- [ ] `test_numbering_endpoints.py` imports nothing from `app.routers.quality`
      or `app.routers.billing`. Confirm with the import block.
- [ ] The pre-fix run described above, with its **exit code** and the specific
      assertion that failed. Exit 1 with an assertion, not exit 2.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts. It is 1165 passed, 4 skipped today.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, 544 routes, exemptions still 30.
- [ ] **Commit and push to `origin/main`.**
