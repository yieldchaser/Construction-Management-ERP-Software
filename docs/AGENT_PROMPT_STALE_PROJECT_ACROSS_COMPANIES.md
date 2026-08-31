# AGENT PROMPT: one company's pages show another company's money

Single defect. Found while verifying the previous run in a browser against production.

Report as before: command, exit code, one sentence. No pasted output. "Not run" is acceptable.

---

# The defect

`last_project_id` is persisted in `localStorage` and is **not cleared or validated when the company changes**.

Reproduced against production with an account that belongs to two companies:

1. Visit a project in company A (`AK Construction`), which stores `last_project_id` for that project.
2. Navigate to a page in company B (`ZZ R8 Throwaway`), which has **zero projects**.
3. `d/towers` and `d/budget` render company A's figures: `₹166,380`, `₹150,000`, `₹118,000`, while the URL, the sidebar and the company name all say company B.

Confirmed the cause directly. With the URL on company B, storage held:

```
company_id      d3724ec3-...   (company A)
last_project_id a1376092-...   (company A's project)
```

Clearing `last_project_id` and reloading the same URL produced the correct result: "No project selected. No active projects."

So the pages are not leaking through a backend authorisation hole. The backend answers correctly for the project it is asked about, and the user is a member of both companies. **The frontend simply asks for the wrong project**, then renders the answer under the wrong company's name.

## Why this is worse than a display bug

The same stale id feeds **writes**. A user in this state who creates a tower, a budget line, an indent or a bill will have it created against company A's project while the screen says company B. That is data landing in the wrong company, and nothing on screen would tell them.

**Do not test that by creating records in the founder's production data.** Reason about it from the code and fix the cause.

## A note on the previous run

Part 5 of the last prompt added an `isValidUuid` guard so project fetches wait for a resolved id. That was correct and should stay. But it may have made this defect more visible rather than less: before, an unresolved id went out as `undefined` and got a 422, so nothing rendered. Now a **stale but structurally valid** id passes the guard and returns 200 with another company's data.

**Keep the guard. Add an ownership check on top of it.** Valid-looking is not the same as belonging here.

---

# The fix

**1. Scope the stored project to its company.** `last_project_id` alone is ambiguous. Either store it per company, keyed by company id, or store the pair and treat a mismatch as no selection. Pick one and say which.

**2. Validate on resolve.** When `ProjectContext` resolves a company, a persisted project id must be confirmed to belong to that company before it is used. The company's project list is already fetched at `ProjectContext.tsx:167`; if the stored id is not in it, clear the selection and fall back to no project selected rather than to an arbitrary one.

**3. Clear on company change.** When the company in the URL differs from the stored `company_id`, drop the stored project selection as part of switching, before any project-scoped fetch fires.

**4. Never send a project id that failed the ownership check**, on reads or writes.

Do not solve this by removing persistence. Remembering the last project inside a company is good behaviour and should still work.

---

# Verify in a browser, because a grep cannot see this

State the result of each step:

- [ ] Open a project in company A, then navigate to a page in company B. `d/towers` and `d/budget` must show company B's own state, not company A's figures.
- [ ] Return to company A. The previously selected project should still be remembered there.
- [ ] Confirm `localStorage` no longer holds a project id belonging to a different company than the one in the URL.
- [ ] With no project selected, the pages fixed in the last run still show "No project selected", unchanged.

# Definition of done

- [ ] The four browser checks above, each with what you observed.
- [ ] `python scripts/verification/check_route_reachability.py` reports **0 unreachable**, exemption file still 30.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. It is **1152 passed, 4 skipped** today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both run and both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 / 38 / 73 / 116.
- [ ] Design counts unchanged: raw palette 0, gradients 0, `hover:bg-white/N` 0, inline shadows 0, hand-rolled pills 13. **Use one command that actually covers all five.** The last two runs used a command that checked hex or `shadow-[` only and then asserted all five; the claims happened to be true, but the command did not show it.
- [ ] **Commit and push to `origin/main`.**
