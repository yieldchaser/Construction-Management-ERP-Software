# HY3 PROMPT 13 — Complete the untested security hubs (Firebase / Google OAuth / handoff / SQLite schema sync)

> **Audience:** a HY3 coding agent acting as an implementer.
> **Repo:** `C:\Users\Dell\Github\Construction-Management-ERP-Software`
> **Stack:** FastAPI backend (`backend/app/...`), pytest suite in `backend/tests/coverage/` (follow its `conftest.py` fixtures: `client`, `db`, `make_tenant`, `auth_headers`).
> **Model:** same intelligence that wrote PROMPT_5/10/11/12 — match that precision. Every "verified" claim below was read from the code on `main` (HEAD = `7146da5`); trust it but **verify each item yourself before writing a test** (if the code differs, stop and report — do not guess).

---

## CONTEXT — what is ALREADY covered (do NOT duplicate)

PROMPT_5 (commit `defd302`) already closed the bulk of the "65 untested security functions" claim. The following hubs have passing tests in `backend/tests/coverage/` and must NOT be re-tested (avoid churn):
- Tenant/RBAC chokepoints: `test_auth_chokepoints.py` (15 tests) covers `get_company_membership`, `require_permission`, `verify_company_access`, `verify_project_access`, `require_module_view` — including the documented fail-open / partner-bypass behaviour.
- Crypto: `test_crypto.py` (7 tests) covers `crypto.encrypt_token` / `decrypt_token`.
- OTP core: `test_otp_core.py` + `test_auth_security.py` (7 tests) cover hashing, TTL, attempt cap, single-use, constant-time.
- Integration guards (Zoho/BI key): `test_integration_guards.py` covers `_require_oauth_config` 503 + BI key scoping.

This prompt closes ONLY the **remaining untested hubs** named in the original risk read:
1. **Firebase phone auth** (`backend/app/firebase_auth.py` + `backend/app/routers/auth.py:443 /firebase/verify`).
2. **Google identity OAuth** (`backend/app/routers/google_auth.py`) + the **single-use handoff exchange** (`backend/app/routers/auth.py:712 /oauth/exchange`, model `OAuthHandoff`).
3. **Runtime SQLite schema sync** (`backend/app/main.py` `ensure_sqlite_*` — 9 functions; `ensure_sqlite_schema_sync()` orchestrates them).

No product code is changed by this prompt. Tests only.

---

## CURRENT STATE — AUDIT (verified against HEAD `7146da5`)

### Firebase (`app/firebase_auth.py`, `app/routers/auth.py:443`)
- `firebase_auth.is_configured()` → True when `settings.FIREBASE_SERVICE_ACCOUNT_JSON` or `settings.FIREBASE_SERVICE_ACCOUNT_PATH` is set; else False.
- `verify_id_token(token)` → `ValueError("Missing Firebase ID token")` if empty; else calls `firebase_admin.auth.verify_id_token(token, app=_app)`; on ANY exception normalises to `ValueError("Invalid or expired Firebase ID token")`. (The function does NOT touch the network itself — the Admin SDK does the crypto verify locally once initialised; init reads the SA credential.)
- `auth.py:443 @router.post("/firebase/verify")`:
  - If `not firebase_auth.is_configured()` → **503** `detail="Firebase phone login is not configured on this server. Please contact support."`.
  - Else `claims = firebase_auth.verify_id_token(payload.id_token)`; `ValueError` → **401** `detail="Invalid or expired verification. Please try again."`.
  - `mobile = (claims.get("phone_number") or "").strip()`; if empty → **400** `detail="This Firebase account has no verified phone number."`.
  - Find-or-create `User` by `mobile`; then `_post_auth(db, user, provider="firebase_phone")` which mints a session and returns `{access_token, token_type:"bearer", user, company, companies, ...}` (200).
- `FirebaseVerifyRequest` (auth.py, near `:430`) has field `id_token: str`.
- External dependency: `firebase_admin.auth.verify_id_token`. **Must be monkeypatched** — never init a real Firebase app / never hit network.

### Google identity OAuth (`app/routers/google_auth.py`)
- `_require_oauth_config()` → **503** when `settings.google_login_client_id` or `settings.google_login_client_secret` is unset.
- `_sign_state()` → a signed JWT via `create_access_token({"nonce":..., "purpose":"google_login"}, expires_delta=15min)`. `_verify_state(state)` → `jwt.decode` with `settings.SECRET_KEY`/`settings.ALGORITHM`; `JWTError` OR `purpose != "google_login"` → **400** `detail="Invalid OAuth state"`. (This is pure, testable offline — no network.)
- `@router.get("/authorize")` → calls `_require_oauth_config()` then returns a **307** `RedirectResponse` to Google's consent URL (builds it via `requests.models.PreparedRequest`). The redirect URL contains `state=...`.
- `@router.get("/callback")` → the full flow hits Google's HTTP endpoints (`requests.post(GOOGLE_TOKEN_URL)`, `requests.get(GOOGLE_USERINFO_URL)`). On success it requires `email_verified` truthy (else **307** `?error=google_unverified`); if `user` exists with a password (`_has_password`) → **307** `?error=use_password_login`; else find-or-create user, then `_create_handoff(db, user, company_id, onboarding, provider="google")` and **307** `?code={handoff_code}`. The **real session JWT is NEVER in the URL** — only the handoff code.
- External HTTP: `requests.post`/`requests.get` to Google. **Must be monkeypatched** in tests.
- `STATE_PURPOSE = "google_login"`.

### Handoff exchange (`app/routers/auth.py:712 @router.post("/oauth/exchange")`, model `OAuthHandoff`)
- `OAuthExchangeRequest` has field `code: str`. Looks up `OAuthHandoff` by `_hash_handoff(code.strip())` where `consumed.is_(False)`, newest first.
- If not found OR `expires_at < now` (UTC-aware compare) → **400** `detail="Invalid or expired login code."`.
- On success: sets `handoff.consumed = True`, commits, mints session via `_mint_session_response(db, user, handoff.company_id, onboarding=bool(handoff.onboarding))` → 200 with `access_token`. **Single-use**: replay with the same code → 400 (already consumed).
- `OAuthHandoff` model fields (verify in `models.py`): `id`, `user_id`, `company_id`, `code_hash`, `consumed`, `expires_at`, `onboarding`, `created_at`. `_hash_handoff(code)` is in `auth.py` (import it or replicate the same hash — prefer importing `_hash_handoff` from `app.routers.auth`).
- This is **pure DB + hashing — fully testable offline** by inserting an `OAuthHandoff` row directly via the ORM.

### Runtime SQLite schema sync (`app/main.py`)
- 9 functions: `ensure_sqlite_library_party_columns`, `ensure_sqlite_company_team_party_link`, `ensure_sqlite_library_cost_code_columns`, `ensure_sqlite_company_slug_column`, `ensure_sqlite_company_parent_column`, `ensure_sqlite_project_tab_columns`, `ensure_sqlite_bill_columns`, `ensure_sqlite_task_columns`, and `ensure_sqlite_schema_sync()` (calls the 8 in order).
- Each runs additive raw SQL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`) against the **SQLite** engine. They are guarded so they no-op on Postgres (prod uses Supabase/Postgres, so they only matter for local SQLite dev). They are currently **0% tested** — the dev SQLite boot path is unverified.
- Test approach: monkeypatch `app.database` (or the engine used by `main.py`) to a fresh in-memory/file SQLite engine, call `ensure_sqlite_schema_sync()`, and assert it returns without raising and that the target columns now exist (introspect via SQLAlchemy `inspect(engine).get_columns(...)`). Do NOT require a real DB file; a temp SQLite path is fine.

---

## THE WORK — write 3 new test files (tests only)

### T1 — `tests/coverage/test_firebase_auth.py`
Use fixtures `client`, `db`, `make_tenant`, `auth_headers` (from `conftest.py`). Monkeypatch `app.firebase_auth.verify_id_token` (and `is_configured` where needed) — never init real Firebase.
- `test_firebase_unconfigured_returns_503`: with `firebase_auth.is_configured` returning False (monkeypatch), `POST /apis/v3/auth/firebase/verify` with a dummy `id_token` → **503**.
- `test_firebase_invalid_token_returns_401`: configured; `verify_id_token` raises `ValueError`; same POST → **401** `detail="Invalid or expired verification. Please try again."`.
- `test_firebase_no_phone_returns_400`: configured; `verify_id_token` returns `{"sub":"x"}` (no `phone_number`); POST → **400** `detail="This Firebase account has no verified phone number."`.
- `test_firebase_valid_token_creates_user_and_mints_session`: configured; `verify_id_token` returns `{"phone_number":"+919999999999", "sub":"abc"}`; POST → **200** with `access_token` present; a `User` with `mobile="+919999999999"` and `auth_providers` containing `firebase_phone` exists in `db` (use a UNIQUE mobile to avoid the shared-DB `users.mobile` UNIQUE collision — see Rules).
- `test_firebase_valid_token_links_existing_user`: configured; seed an existing `User` with that mobile first; POST → 200 and the SAME user is returned (find-or-create by verified phone), not a duplicate.
- `test_verify_id_token_unit_empty_raises`: unit test `firebase_auth.verify_id_token("")` → raises `ValueError` with "Missing Firebase ID token".
- `test_verify_id_token_unit_normalises_exception`: monkeypatch `firebase_admin.auth.verify_id_token` to raise; `verify_id_token("tok")` → raises `ValueError` with "Invalid or expired Firebase ID token".

### T2 — `tests/coverage/test_google_oauth.py`
Monkeypatch `requests.post` / `requests.get` (Google HTTP) and `settings.google_login_client_id/secret` where needed. Reuse `client`/`db`/`make_tenant`/`auth_headers`.
- `test_google_oauth_unconfigured_503`: `POST`/direct call to `google_auth._require_oauth_config` (or hit `/auth/google/authorize` with config unset) → **503**.
- `test_google_state_roundtrip_and_verify`: unit test `_sign_state()` then `_verify_state(state)` does NOT raise; a tampered/garbage state → `_verify_state` raises **400** `detail="Invalid OAuth state"`; a state whose `purpose` is not `"google_login"` → **400**.
- `test_google_authorize_redirects_with_state`: configured; `GET /apis/v3/auth/google/authorize` → **307** and `Location` contains `state=` and `accounts.google.com`. (Monkeypatch `requests.models.PreparedRequest.prepare_url` if needed, or just assert status 307 + a `Location` header is present.)
- `test_google_callback_happy_path_issues_handoff`: configured; monkeypatch `requests.post` → 200 `{"access_token":"tok"}`; `requests.get` → 200 `{"email":"verified@example.com","email_verified":true,"name":"V"}`; call `GET /apis/v3/auth/google/callback?code=xyz&state=<valid_signed_state>` → **307** and `Location` contains `?code=` (a handoff code), and an `OAuthHandoff` row was created in `db` for the resolved user. Assert the URL does NOT contain `access_token`/`bearer` (session JWT must never be in the URL).
- `test_google_callback_unverified_email_redirects`: configured; `requests.get` → 200 `{"email":"x@y.com","email_verified":false}`; callback → **307** `?error=google_unverified`.
- `test_google_callback_denied_redirects`: configured; callback with `error=access_denied` (no code) → **307** `?error=google_denied`.
- `test_handoff_exchange_success_and_single_use` (pure DB, no Google network): insert an `OAuthHandoff(user_id, company_id, code_hash=_hash_handoff(CODE), consumed=False, expires_at=future, onboarding=False)` directly via ORM; `POST /apis/v3/auth/oauth/exchange` `{"code": CODE}` → **200** with `access_token`; a SECOND identical POST → **400** `detail="Invalid or expired login code."` (single-use burn). Use a real `user_id`/`company_id` from `make_tenant`.
- `test_handoff_exchange_expired_400`: insert an `OAuthHandoff` with `expires_at` in the past; POST → **400**.
- `test_handoff_exchange_unknown_400`: POST with a code that matches no row → **400**.

### T3 — `tests/coverage/test_ensure_sqlite_schema_sync.py`
- `test_ensure_sqlite_schema_sync_runs_on_sqlite`: monkeypatch the engine used by `main.py` to a fresh temp SQLite DB (e.g. patch `app.database.engine` — verify the exact symbol `main.py` imports; if `main.py` calls these at import/boot, instead import `app.main` AFTER patching, or call the functions directly against a temp SQLite engine you create). Call `ensure_sqlite_schema_sync()` and assert it returns without raising. Then introspect the temp engine (`from sqlalchemy import inspect`; `inspect(engine).get_columns("company_team")`, etc.) and assert the columns the functions are supposed to add actually exist (e.g. `party_id` on `company_team`, `company_parent`/relevant columns, `company_slug` on `company`, `cost_code` on `library_cost_code`, `bill` columns, `task` columns, `project` tab columns). Read each `ensure_sqlite_*` function to learn the exact column/table names and assert only those (do not assert columns the code does not add).
- `test_ensure_sqlite_idempotent`: call `ensure_sqlite_schema_sync()` twice on the same temp engine; second call must not raise (ADD COLUMN IF NOT EXISTS is idempotent) — confirms no crash on re-boot.
- Keep this test hermetic: use a temp file path (e.g. `tempfile.mkstemp` / `:memory:`); never touch the repo's real `backend/*.db` or `test_phase*.db`.

---

## RULES
- **Tests only.** Do NOT change product code. If a test reveals a REAL bug, do NOT fix it silently: report it with evidence (inputs → expected vs actual) in the "REAL BUGS FOUND" section for orchestrator triage. (Past sweeps found genuine bugs this way — that is the win condition.)
- **Assert DOCUMENTED behaviour**, not what you assume. Read each function before testing it (the exact status codes / detail strings above are quotes from the source).
- **Mock all externals**: `firebase_admin.auth.verify_id_token`, `requests.post`/`requests.get` (Google), and any network. Never hit the network, never init a real Firebase app, never require real Google creds.
- **SQLite shared-DB gotcha**: the suite uses one shared SQLite session DB. Every test that creates a `User` MUST use a **unique `mobile`** (e.g. `+91988879XXXX`) to avoid `UNIQUE constraint failed: users.mobile` collisions that cascade-fail unrelated tests. The Firebase/Google tests that create users must honour this.
- **Bearer token**: any endpoint requiring auth must send one (use `auth_headers`). Note `/firebase/verify` and `/oauth/exchange` and `/auth/google/*` — check whether they require a bearer (the auth routers generally do NOT require a prior session for login endpoints; verify by reading the handler signatures — if no `Depends(get_current_user)`, do not send a token).
- **Import, don't reinvent**: prefer `from app.routers.auth import _hash_handoff`, `from app.routers import google_auth`, `from app import firebase_auth`, `from app.main import ensure_sqlite_schema_sync` over copying internals.
- **No schema breakage / no migration**: these are tests; do not add migrations.
- Match the existing PROMPT_5 convention: follow `conftest.py` fixtures; keep tests in `tests/coverage/`.

## GATE + REPORT
- `cd backend && python -m pytest tests/coverage -q` fully green (baseline before this prompt = 154 passing). Your new tests add to that; no regression in the existing 154.
- Confirm the pre-existing suite still passes (no regressions) — run the whole `tests/coverage` directory, not just your files.
- Report: files added, what each test covers, pass counts (new + total), and a **"REAL BUGS FOUND"** section (empty is a good result) with evidence for each.
- Do NOT commit or push yourself. Report back; the orchestrator verifies and commits/pushes.

## WHY THIS PROMPT
This is the remaining slice of the original security-test-coverage gap (the `Read then delete.docx` / BUG_SWEEP note "65 untested security-relevant functions — focus on require_permission, get_company_membership, crypto.py, firebase/google OAuth"). PROMPT_5 already covered `require_permission`/`get_company_membership`/`crypto`/OTP/integration guards + money math. This prompt closes the **firebase_auth + google OAuth + handoff exchange + runtime SQLite schema sync** slice so the entire named gap is test-covered. After this, item #1 of that note is fully closed.
