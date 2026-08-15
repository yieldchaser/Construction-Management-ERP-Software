# Blast-radius template — copy this for every fix

```
================================================================================
R2-XXX — <one-line title>
================================================================================
Wave: Wxx  |  Severity: CRITICAL/HIGH/MEDIUM/LOW  |  Primary file: <path>
Register line: register L<row>  |  Raw log: AUDIT_ROUND2_FINDINGS.md L<line>

--------------------------------------------------------------------------------
1. WHAT THE BUG IS
--------------------------------------------------------------------------------
<1-2 sentences in your own words. Don't just quote the register.>

--------------------------------------------------------------------------------
2. WHY IT HAPPENED (root cause)
--------------------------------------------------------------------------------
<The actual code defect. Quote the exact line(s).>

--------------------------------------------------------------------------------
3. BLAST RADIUS — pre-fix
--------------------------------------------------------------------------------
Direct callers / importers / consumers (file:line):
  - <path>:<line>  — <what it does with this>
  - <path>:<line>  — <what it does with this>
  - ...

Affected tests:
  - <test-file> — <what it asserts>
  - ...

Affected frontend files (if backend change):
  - <path> — <what it reads from the response>
  - ...

Count: N callers, M tests, K frontend files.

--------------------------------------------------------------------------------
4. PROPOSED FIX
--------------------------------------------------------------------------------
Schema change?  Yes / No
If yes: migration file = supabase/migrations/<YYYYMMDD>_<name>.sql

API contract change?  Yes / No
If yes: frontend/src/types/ updates required

Smallest unit test that would have caught this:
  - <test name>
  - <what it asserts>

--------------------------------------------------------------------------------
5. ACTUAL DIFF
--------------------------------------------------------------------------------
<the patch, file by file>

--------------------------------------------------------------------------------
6. BLAST RADIUS — post-fix
--------------------------------------------------------------------------------
Count: N' callers, M' tests, K' frontend files.
(Are these the same as before? If they shrank, why? If they grew, why?)

--------------------------------------------------------------------------------
7. VERIFICATION
--------------------------------------------------------------------------------
[ ] pytest tests/coverage/ -q  → green
[ ] npm run build (if frontend) → green
[ ] manual curl / live probe (if founder has confirmed) → green
[ ] Other: <...>

--------------------------------------------------------------------------------
8. REGISTER UPDATE
--------------------------------------------------------------------------------
STATUS: TODO → FIXED
Commit: <hash>
Notes: blast-radius N→N' files, M→M' tests, K→K' frontend. Test added: <y/n>.
Wave: Wxx. Audit: R2-XXX (and R2-YYY if covered).

--------------------------------------------------------------------------------
9. SESSION_LOG ENTRY
--------------------------------------------------------------------------------
- <one-line summary of what this fix did, written for the next session>
```

---

## Example of a filled-in template (R2-028, the 1-line fix already shipped)

```
================================================================================
R2-028 — NameError: name 'models' is not defined in billing.py
================================================================================
Wave: W07  |  Severity: CRITICAL  |  Primary file: backend/app/routers/billing.py
Register line: register L182  |  Raw log: AUDIT_ROUND2_FINDINGS.md L1330

--------------------------------------------------------------------------------
1. WHAT THE BUG IS
--------------------------------------------------------------------------------
POST /apis/v3/billing/subcontractor and POST /apis/v3/billing/work-order return
500 because the handler references the SQLAlchemy `models` module which was
never imported in billing.py.

--------------------------------------------------------------------------------
2. WHY IT HAPPENED (root cause)
--------------------------------------------------------------------------------
billing.py line 1-N: no `from app import models` at module top.
The handler at line ~180 calls `models.Subcontractor(...)` which raises
NameError → FastAPI returns 500.

--------------------------------------------------------------------------------
3. BLAST RADIUS — pre-fix
--------------------------------------------------------------------------------
Direct callers:
  - frontend/src/app/c/[company_id]/d/subcontractor/page.tsx (>1 site)
  - frontend/src/app/c/[company_id]/d/work-order/page.tsx (>1 site)

Affected tests: none (this was live-only).
Affected frontend files: 2.
Count: 0 callers in tests, 2 in frontend.

--------------------------------------------------------------------------------
4. PROPOSED FIX
--------------------------------------------------------------------------------
Schema change? No
API contract change? No
Smallest test: pytest that calls the endpoint and asserts 200/201.

--------------------------------------------------------------------------------
5. ACTUAL DIFF
--------------------------------------------------------------------------------
--- a/backend/app/routers/billing.py
+++ b/backend/app/routers/billing.py
@@ -1,3 +1,4 @@
+from app import models
 from typing import ...

--------------------------------------------------------------------------------
6. BLAST RADIUS — post-fix
--------------------------------------------------------------------------------
Count: 0 → 0 callers, 0 → 0 tests, 2 → 2 frontend files. (unchanged)

--------------------------------------------------------------------------------
7. VERIFICATION
--------------------------------------------------------------------------------
[ ] pytest tests/coverage/ -q  → green
[ ] live curl POST /apis/v3/billing/subcontractor → 201 (founder to verify)

--------------------------------------------------------------------------------
8. REGISTER UPDATE
--------------------------------------------------------------------------------
STATUS: TODO → FIX_VERIFIED (founder confirmed live)
Commit: 50a4c89
Notes: blast-radius 0 files in backend, 2 in frontend. Live-verified by founder.
Wave: W07. Audit: R2-028.

--------------------------------------------------------------------------------
9. SESSION_LOG ENTRY
--------------------------------------------------------------------------------
- R2-028 (W07 billing.py): added `from app import models`. Live-verified by
  founder in commit 50a4c89.
```
