# Round 2 of founder-gated decisions — decided

**Written 2026-08-27 by the verification agent, at the founder's instruction to decide rather than
hand back a menu, judging each against the end goal: an ERP that Indian construction companies run
their money on.**

**Register status first, because it frames everything below.** `campaign/waves` at `272d93a` has
**zero TODO rows** — 502 FIXED, 93 FIX_VERIFIED, 3 WONTFIX, 1 RETRACTED. `origin/main` still shows
12 TODO, but every one of them is closed on `campaign/waves`; they are stale rows that clear when
`campaign/waves-decisions-resolved` merges into `main`. **No decision-gated bug remains in the
register.** Everything below comes from the live verification pass, not from the register.

---

## The correction that reframes this whole file

I filed R2-731 as CRITICAL on the reading that eight migrations had silently failed to apply. The
founder's actual plan is to run the migration SQL **as one deliberate batch at the end**, rather
than file by file. Eight unapplied migrations is that plan working, not eight mistakes.

**R2-731 is re-rated HIGH and re-scoped.** What survives the correction is not "migrations did not
run". It is three narrower things, and the first of them is the reason this file exists.

---

## F-1 · The batch run will silently under-apply. Fix before it is run. → **CRITICAL**

**What is true, measured 2026-08-27 against production.**

`20260825_000003_duplicate_purge_and_constraints.sql` and
`20260825_000004_missing_unique_constraints.sql` are `DO` blocks of this shape:

```
IF dup_groups > 0 THEN
    RAISE NOTICE 'skipping <constraint>: % duplicate group(s) present', dup_groups;
    RETURN;
END IF;
```

`RAISE NOTICE` is not an error. The block returns, the statement succeeds, the editor reports
success. And the duplicate counts are **no longer zero**:

| pair | duplicate groups today |
|---|---|
| `bills(company_id, invoice_number)` | 0 |
| `purchase_orders(company_id, po_number)` | 0 |
| **`company_team(company_id, user_id)`** | **1** |
| **`three_way_matches(po_id, grn_id)`** | **2** |

So on the batch run as it stands: seven of the nine constraints land, **`uq_company_team_company_id_user_id`
and `uq_three_way_matches_po_grn` skip**, and nothing in the output distinguishes the two outcomes.
The founder would come away believing document-number uniqueness is enforced everywhere. It would
not be.

**Decision.**

1. The purge in `7e8b54d` must execute **before** the constraint blocks in the same batch, not
   beside them. Order the batch: backup tables → purge → constraints → verify.
2. Change every skip branch from `RAISE NOTICE ... RETURN` to `RAISE EXCEPTION`. A migration that
   cannot do what it says must fail the run, not narrate past it.
3. Ship a `verify.sql` alongside the batch that asserts each named object now exists and **fails
   loudly if any is missing**. Run it immediately after the batch.

**Why, against the end goal.** Two purchase orders numbered `PO-2026-043` is a dispute with a
vendor that the system cannot adjudicate. The whole point of the constraint is that the database,
not the application, is the last line. A constraint that was reported as applied and was not is
worse than one known to be missing, because nobody will look again.

**Blast radius.** Small and contained — it is migration SQL, not application code. The purge writes
to backup tables first (already designed that way in `7e8b54d`).

**Sequence.** Before the founder runs the batch. This is the one item that is genuinely blocking.

---

## F-2 · A migration ledger and a runner → **HIGH**

**What is true.** No Alembic, no CI step, no entrypoint reads `supabase/migrations/`. The only
consumer is `test_dv4_constraint_migration_gate.py:106`, which asserts a constraint name *appears
in a file* — the condition that was already true for the migration R2-730 proved had not run. There
is no record anywhere of which files have been applied. Today that is answerable only by querying
the database object by object, which is what I did.

**Decision.** Build the minimum that makes the batch plan safe, and no more:

1. A `schema_migrations` table — `filename` PK, `applied_at`, `checksum`.
2. A script `scripts/migrate.py` with two modes: `--apply` (runs every file not in the ledger, in
   filename order, each in its own transaction, recording it) and `--verify` (prints what is
   pending, applies nothing). Read-only `--verify` is the mode that matters most.
3. Replace the D-V4 gate's file-existence assertion with one that fails if a named constraint in
   `Base.metadata` has no corresponding migration **and** is absent from the ledger.

**Why not more.** No branching, no down-migrations, no Alembic. Down-migrations on a production
ERP holding a client's cost data are a liability, not a feature — additive-only is the right policy
and the READMEs already say so. This is a ledger, not a framework.

**Why at all, given the founder runs the batch by hand.** One person running it by hand works
exactly as long as it is one person. The moment a second environment exists — a staging copy, a
second customer's database, a re-provision after an incident — "which migrations has this database
had" becomes unanswerable without one. For an ERP that will be sold to more than one company, that
day is scheduled.

**Blast radius.** New files only. The ledger starts by recording the migrations already applied
(the probe result in `VERIFICATION_NEW_FINDINGS.md` under R2-731 lists them), so the first
`--apply` does not re-run history.

---

## F-3 · Renumber the colliding prefix → **LOW, but do it inside F-2**

`20260825_000004_missing_unique_constraints.sql` and `20260825_000004_po_cancelled_columns.sql`
share a sequence number. Harmless while a human types them in; the moment F-2's runner sorts by
filename, one of two files with an identical prefix orders non-deterministically. Renumber the
second to `20260825_000005` **before** the runner exists, not after.

---

## F-4 · R2-728 — fix it, do not prove it live → **CRITICAL, and I am withdrawing my own ask**

I asked for approval to write attendance data in the test company to prove the punch-out 500. On
reflection that is the wrong trade. The defect is a naive `datetime` subtracted from an aware one:
it is a certainty on Postgres and a certainty *not* to reproduce on SQLite, which is why the suite
cannot see it. A live reproduction would cost a production-adjacent write and tell me something I
already know from reading.

**Decision.** Fix it directly. The gate must be a test that runs against **Postgres**, not SQLite —
otherwise the same class recurs invisibly, which is the actual lesson of this finding. Withdraw the
approval request; the founder has one less thing to answer.

**Second-order note worth carrying.** `flushQueue` (`attendance/page.tsx:495`) now retains failed
punches rather than destroying them, so R2-105's data loss is genuinely fixed. But every offline
**punch-out** sync will fail against production until R2-728 lands. The queue degrades honestly
instead of lying, which is the right failure — but site supervisors syncing a day's punches will
see every OUT punch fail. That raises R2-728's practical priority above where it sat.

---

## F-5 · Delete the demo tenant → **HIGH. Needs the founder, because it writes to production.**

D-V1 had three steps. Steps 1 and 2 are done and verified — `_ensure_demo_company` and
`_seed_demo_projects` are gone, the 11 sentinel fallbacks are now guards, and the OTP demo defaults
are empty strings. Step 3 was to delete the rows. It has not happened:

```
e0000000-0000-0000-0000-000000000000 = Demo Construction Ltd   <- still live
demo user e0000000-...-100 = present
projects under the demo company = 5
```

**Decision.** Delete them. A demo tenant sitting in the same `companies` table as real customers is
a multi-tenancy hazard in a product whose entire proposition is that one firm's costs are that
firm's — and with F-1's RLS predicates still pending, the isolation between those rows and the real
ones is currently "any authenticated user".

**But this is a production delete and I will not run it unasked.** I will write the SQL as a
cascade-check first, then the deletes, and hand it over. The founder runs it, or explicitly tells me
to. Sequence it **after** the F-1 batch, so the RLS predicates are live first.

---

## F-6 · Google sign-in is failing in production → **HIGH, new**

Observed live on `site-flow-omega.vercel.app/auth/callback?error=google_token` — "Could not
complete Google sign-in. Please try again."

`backend/app/routers/google_auth.py:140-148` emits `google_token` in exactly two cases: Google's
token endpoint returned non-200, or it returned 200 with no `access_token`. The three real causes
are a wrong `client_secret`, a `redirect_uri` that does not match the one registered in the Google
console, or a re-used authorization code.

**Decision, two parts.**

1. **Code (agent).** The handler discards `token_resp.text` and redirects. Log the upstream status
   and body server-side before redirecting. Right now a live auth outage is undiagnosable from the
   outside, which is why this sat unnoticed. Do not put the detail in the redirect URL.
2. **Config (founder).** Check `GOOGLE_LOGIN_CLIENT_SECRET` and the registered redirect URI on
   Render against the Google console. Most likely a redirect-URI mismatch after the Vercel domain
   settled.

**Why HIGH.** Every user who signs in with Google currently cannot. That is a live outage on a
login path, not a defect in a module.

---

## F-7 · D-V5 · The demo OTP severity question → **decided as far as code goes; two env values left**

The fix already shipped and I verified it: `config.py:44-45` defaults `OTP_DEMO_ALLOWLIST` and
`OTP_DEMO_CODE` to empty strings, so an unset variable no longer enables a known credential. That
was always the right change regardless of the answer.

What remains is only the **severity** question: if Render has `OTP_DEMO_ALLOWLIST` set with a real
number and no SMS provider configured, the demo credential was live in production and this becomes
an incident with a disclosure question attached. If both are empty, it was hardening.

**I could not answer it myself** — navigation to the Render dashboard is blocked for me. It is two
values on one page: `OTP_DEMO_ALLOWLIST` and `MSG91_AUTH_KEY`.

**Decision on the answer's consequence, pre-committed so the founder does not have to weigh it:**
if the allowlist was non-empty and MSG91 was unset, treat it as a live credential exposure — check
`users` for logins from the allowlisted number, and say so plainly to any customer whose data sat
behind it. If either condition fails, it is hardening and needs no further action.

---

## F-8 · The Render free tier → **decided: upgrade, and it is not really a technical call**

The backend runs on Render's **Free** instance. Its own banner: *"Your free instance will spin down
with inactivity, which can delay requests by 50 seconds or more."* R2-080 closed with a keep-alive
workflow and an acknowledged residual — GitHub Actions cron throttling — deferred to the founder.

**Decision.** Move to a paid instance before any customer other than the founder uses this.

**Why, stated as the business fact rather than the engineering one.** A site engineer opening the
attendance screen at 7am is the first request of the day. On a spun-down free instance they wait
~50 seconds, conclude the app is broken, and go back to the paper muster. That is not a latency
number, it is the adoption failure mode for site-level software specifically, where the user has a
working paper alternative one metre away. No amount of keep-alive cron hackery is worth more than
the smallest paid tier here.

**This one costs money, so it is genuinely the founder's**, but I am not neutral on it and should
not pretend to be.

---

## F-9 · What I do next with the verification pass → **decided: stop reading rows one by one**

**The evidence for stopping.** 218 closed rows worked so far. **211 of 214 closure claims verified
exactly as written.** The three exceptions all came from one structural cause (orphan lineage,
R2-727), which the campaign is now sweeping itself. Meanwhile every single one of the six class
findings — R2-712, R2-717, R2-718, R2-719, R2-727, R2-731 — came from a **register-wide sweep or a
live probe**, never from reading the next row in order.

The maths is not close. Row-by-row E1 has found roughly one real miss per seventy rows read.
Sweeps and live probes have found six class defects in the same span, one of which
(R2-731 → F-1) changes what happens on the founder's next production action.

**Decision.** Stop the ordered E1 walk of the remaining 281 rows. Spend the pass on, in order:

1. **Post-batch verification** — run the F-1 `verify.sql` the moment the migration batch is applied,
   and re-run the RLS probe. Production currently has 139 policies and every one is the permissive
   `*_authenticated_all` shape, with zero `FORCE ROW LEVEL SECURITY`. Confirming tenant isolation
   actually became real is the single highest-value measurement left in this project.
2. **Live E3 on the money paths only** — bills, POs, payments, payroll. Where a wrong number is a
   wrong invoice, reading the code is not enough.
3. **Two more sweeps** of the kind that keep paying: the cancelled-exclusion sweep across every
   aggregate (`cancelsweep.py` already exists), and a sweep for naive/aware datetime arithmetic —
   the R2-728 mechanism, which SQLite structurally cannot catch and which therefore has no reason
   to be a single instance.

I will note the 281 unwalked rows honestly in the register rather than implying they were checked.

---

## What is actually needed from the founder

Four things. Two are one-click, one is a decision I cannot make with your money, one is a
production write.

| # | what | why it is yours |
|---|---|---|
| **1** | Read two env values on Render: `OTP_DEMO_ALLOWLIST` and `MSG91_AUTH_KEY` | I am blocked from that dashboard. Sets F-7's severity; the fix already shipped either way |
| **2** | Check `GOOGLE_LOGIN_CLIENT_SECRET` and the registered redirect URI against the Google console | Google sign-in is failing live right now (F-6) |
| **3** | Approve the Render paid instance (F-8) | Costs money |
| **4** | Run — or tell me to run — the demo-tenant deletion (F-5), **after** the migration batch | Production delete. I will write it as a cascade check first |

## What the fixing agent can start on immediately

In this order. F-1 first and it is not close — everything else can wait behind it.

1. **F-1** — reorder the batch (purge → constraints), turn every `RAISE NOTICE ... RETURN` skip
   into `RAISE EXCEPTION`, ship `verify.sql`. **Blocks the founder's migration run.**
2. **F-4** — R2-728 punch-out TypeError, with a Postgres-backed test. No live proof needed.
3. **F-6 part 1** — log the upstream Google token error server-side.
4. **F-2 + F-3** — `schema_migrations` ledger, `migrate.py --apply/--verify`, renumber the colliding
   prefix, replace the D-V4 file-existence gate.

**Nothing here is decision-gated any more.** Every item above has a decision attached.

---
---

# Founder answers, 2026-08-27 — resolutions

The founder answered all four asks. Three close. One turned up something the question was not
looking for.

## F-7 · RESOLVED, and it found a real past exposure — bounded to the demo tenant

**Founder:** neither `OTP_DEMO_ALLOWLIST` nor `MSG91_AUTH_KEY` exists on Render.

That closes the question I asked. The **SMS** demo path was never live: `OTP_DEMO_ALLOWLIST`
defaulted to `""` even before `847ba45`, so an unset env meant an empty allowlist meant no bypass.

**But checking it surfaced the sibling I had not asked about.** Pre-fix,
`EMAIL_OTP_DEMO_ALLOWLIST` defaulted to **`"demo@siteflow.co"`** (`config.py:66` at `847ba45^`), not
to empty. And with SMTP unconfigured, `_deliver_email_code` (`auth.py:564-586`) takes the
`use_demo_code` branch and **returns the code in the HTTP response body** as `mock_code`. So any
unauthenticated caller could `POST /auth/email-otp/send` with `demo@siteflow.co`, read the code
straight out of the JSON, and verify it.

Measured in production:

| fact | value |
|---|---|
| `users` row for `demo@siteflow.co` | **exists** — "Demo Engineer", created 2026-07-10 |
| its company memberships | **1** — Demo Construction Ltd only |
| `otp_codes` rows for that identifier | **1** — the path was exercised at least once |
| is `847ba45` (the fix) deployed? | **yes** — it is an ancestor of `376eeeb`, which Render runs |

**Decision: no customer disclosure, no incident.** The credential led to one user whose only
membership is the demo tenant, which holds five seeded projects and no customer data. The window is
closed — the fix is live. Two things follow, neither urgent:

1. The demo user goes in the launch cleanup (F-5), which now removes its `otp_codes` row too.
2. **Add a test that fails if any `*_DEMO_*` setting has a non-empty default.** That is the class,
   and it is one assertion. The SMS pair was safe by luck of a different default, not by design.

**One caveat I will not paper over.** A session as that user was an *authenticated* session, and
production RLS is still the permissive `*_authenticated_all` shape with no `FORCE ROW LEVEL
SECURITY`. So the boundary that kept this inside the demo tenant was the application's own company
scoping, not the database. That is the argument for F-1's RLS predicates, stated concretely.

## F-6 · REVISED DOWN to MEDIUM — and the founder's guess was wrong in a useful way

**Founder:** it fails only for `upadhyayprateek574@gmail.com`, which may have been deleted; new
accounts sign in fine.

**The account is not deleted.** Verified in production: one `users` row, created 2026-07-11, with
**2 company memberships**. So a missing user is not the cause — and it could not have been anyway:
`error=google_token` is raised at `google_auth.py:140-148`, during the **token exchange with
Google**, which happens before any user lookup. Nothing about the local database can reach it.

That leaves a re-used or expired authorization `code` (Google returns `invalid_grant`), or a
redirect-URI mismatch. A mismatch would break every account, and new accounts work — so **the
leading explanation is a replayed callback**, which fits an account whose sign-in the founder has
retried many times in one browser.

**Decision.** Not an outage; new signups work. Downgrade to MEDIUM. The fix is still F-6 part 1 and
it is now the whole of it: **log `token_resp.status_code` and `token_resp.text` server-side before
redirecting.** Right now the handler throws away the only sentence Google sends that would name the
cause. Reproduce once with that logging in place and the answer is a one-line read. The founder does
not need to check the Google console yet.

## F-8 · ACCEPTED AS DEFERRED — with the trigger written down

**Founder:** not needed now; will pay when a real company signs up.

Correct call, and I withdraw the urgency. The cost of a cold start is zero while the only user is
the person who built it. **Recorded trigger: provision the paid instance before the first
non-founder user logs in, not after they report the app is broken.** Same decision, one step
earlier, and it costs nothing to hold.

## F-5 · DECIDED — the demo tenant serves no testing purpose, so it goes in the cleanup

**Founder:** keep it if it is still needed for testing until launch; otherwise remove it from the
code and everything.

**It is not needed, and it cannot serve that purpose even if wanted.** Three reasons:

1. Its code paths are already gone. `_ensure_demo_company` and `_seed_demo_projects` were deleted
   and the 11 sentinel fallbacks are now guards. **Nothing in the application can reach that
   tenant**, so it cannot be logged into or demoed.
2. Two working test tenants already exist — `ZZ R8 Throwaway` and `Test Claude B2 Construction`.
3. Leaving it costs the one thing that matters: it is a row in `companies` next to real customers,
   and until F-1's RLS lands the database itself does not separate them.

**Decision: it goes into the launch cleanup script, not before, and not as a separate action.**
Written now, held until launch, as requested.

## The combined cleanup script — written and preview-tested

`scripts/verification/launch_cleanup.sql`. One file. Two parts: a **read-only preview** that counts
what would go, and a delete pass that **ends in `ROLLBACK`** until the founder changes one line.

**Why it is a loop and not a list of deletes.** Measured: 142 tables, **81 carrying `company_id`**,
267 foreign keys of which only **200 are `ON DELETE CASCADE`** — 67 are not. A hand-written delete
list would need exact reverse-topological order and would rot the next time a table is added. The
script instead retries every `company_id`-bearing table, swallowing FK violations, until a full pass
deletes nothing. It converges on the right order by construction, and aborts if it has not converged
in 25 passes rather than looping forever.

**The preview was run against production. It works.** Read-only, nothing written:

```
tables carrying company_id        81
demo projects                      5
demo company_team rows             2
users ONLY in demo company         2     <- two, not one
demo otp_codes                     1
SANITY companies total (expect 5)  5
```

Two demo-only users, not one — the user-scoping clause is doing real work rather than passing
trivially. Users with any other membership are deliberately left alone.

The two audit test companies are in the file **commented out**. Uncomment them at launch when the
scratch tenants are no longer wanted.

## NEW · The default login tab may be dead in production — needs one answer

Raised by the founder's own remark that MSG91 was dropped for Firebase, which "is not yet done".

`login/page.tsx:46` sets the default method to **`"phone"`**. `:155` routes it to Firebase
`signInWithPhoneNumber` **when the public Firebase config is present**, and otherwise falls back to
the backend `/auth/otp/send` (`:160`) — which, with MSG91 unset, returns a 503 for every
non-allowlisted number.

So if `NEXT_PUBLIC_FIREBASE_*` is not set on Vercel, **the tab every visitor lands on cannot
succeed**, and they have to notice the email or password tab themselves. I could not check the live
page — navigation to the Vercel domain is blocked for me.

**Decision, which does not depend on the answer:** the login page must not default to a method it
can detect it cannot perform. If the Firebase config is absent at build time, default to email OTP
and either hide the phone tab or label it unavailable. Failing silently into a 503 on the default
tab is the worst of the three options. **Founder: is `NEXT_PUBLIC_FIREBASE_API_KEY` set on Vercel?**
That decides whether this is theoretical or live.

## Updated instruction for the fixing agent

Unchanged order, with two additions:

1. **F-1** — batch ordering, `RAISE EXCEPTION` on skip, `verify.sql`. Still first, still blocking.
2. **F-4** — R2-728 punch-out, Postgres-backed test.
3. **F-6** — log the Google token-exchange status and body server-side. **Now the whole of F-6.**
4. **F-2 + F-3** — ledger, runner, renumber the colliding prefix, replace the D-V4 gate.
5. **NEW** — a test asserting no `*_DEMO_*` setting has a non-empty default (from F-7).
6. **NEW** — login page must not default to phone when the Firebase config is absent.

**F-5 and F-8 are held deliberately**: the cleanup script waits for launch, the paid instance waits
for the first real signup.

---
---

# Review of `7428b14` (R2-731 migration runner) + merge assessment — 2026-08-27

## The headline: the startup runner cannot work in production

`backend/Dockerfile` is built with **Docker Build Context Directory = `backend/`** (confirmed in the
Render dashboard, service `srv-d92lidfavr4c738i29kg`; there is no `render.yaml`). The Dockerfile is
`WORKDIR /app` + `COPY . .`, so the image contains `backend/`'s contents at `/app` — and
**`supabase/migrations/` lives at the repo root, outside the build context. It is not in the image.**

At runtime `_resolve_migrations_dir()` probes, in order: `$SUPABASE_MIGRATIONS_DIR`,
`parents[2]` → `/supabase/migrations`, `parents[1]` → `/app/supabase/migrations`, `parents[3]`,
then CWD variants → `/app/supabase/migrations`, `/app/backend/../supabase/migrations`,
`/supabase/migrations`. **None of them exist in the container.** The runner then:

```
print(f"[migration_runner] migrations dir not found: {migrations_dir} (skipping)")
return []
```

Boot continues, the service reports healthy, and no migration is ever applied. **This is R2-730's
exact failure mode reproduced one level up** — the mechanism exists, is committed, is even tested,
and does nothing where it matters.

**The CI workflow is the path that actually works.** `.github/workflows/migrate.yml` does
`actions/checkout@v4` (full repo, so the directory is present), then
`python scripts/apply_migrations.py --strict` with `MIGRATION_RUNNER_STRICT=1` and
`DATABASE_URL: ${{ secrets.DATABASE_URL }}`. That design is right. Two consequences:

1. **The startup hook should be removed from the Postgres path**, or at minimum must log the
   "directory not found" case as an error rather than an info line. As written it creates the
   impression of coverage it does not provide. Keep it for SQLite, where it also does the
   `_ensure_sqlite_unique_constraints()` dev remediation.
2. **`secrets.DATABASE_URL` must exist on the GitHub repo** or the workflow runs against nothing.
   Founder action — I cannot see repository secrets.

## Defects in the runner itself

| id | sev | what |
|---|---|---|
| **M-1** | CRITICAL | Startup runner silently no-ops in production — migrations dir absent from the image (above) |
| **M-2** | CRITICAL | Failure is swallowed **twice**. The runner catches per-file exceptions and `continue`s unless `MIGRATION_RUNNER_STRICT`; `main.py:481-488` then wraps the whole call in `try/except` printing "non-fatal". A migration that errors on a production boot leaves the schema missing and the API up. This directly contradicts F-1 |
| **M-3** | CRITICAL | No lock. Render overlaps old and new instances during deploy, and a free instance cold-boots on demand. Two boots read the same `applied` set and execute the same file concurrently. `IF NOT EXISTS` files survive it; bare `ALTER TABLE ... ADD CONSTRAINT` and `DO` blocks do not. Needs `pg_advisory_lock(<key>)` around the whole pass |
| **M-4** | HIGH | The ledger records F-1's skip-on-duplicate migrations as **applied**. `20260825_000003/4` `RAISE NOTICE` + `RETURN` when duplicates exist, so the file *succeeds*, the runner writes the row, and it is never retried. Without the runner you would re-paste and notice. With it, the constraint is skipped permanently and the ledger says done. **F-1 must land before or with this** |
| **M-5** | MEDIUM | `checksum` is computed and stored but never compared. A migration edited after application is undetectable — the one thing a checksum column exists to catch |
| **M-6** | MEDIUM | `_get_applied_filenames` catches every exception and returns an **empty set**. A transient read failure means "nothing applied", so the next pass re-runs every migration from the beginning |
| **M-7** | LOW | SQLite path marks files applied without executing them. Correct for dev, but it means the D-V4 live-DB gate is satisfied on SQLite by rows the runner wrote itself |

## Merge assessment: `campaign/waves` → `main`

Tested in a throwaway detached worktree, then aborted and removed. Nothing was pushed.

**24 commits ahead. 11 conflicts. All of them are trivial.**

Four are add/add — the same work landed independently on both branches:

| file | difference |
|---|---|
| `backend/app/calc_shared.py` | 609 vs 609 lines. **Differs only in em-dash → " - "** (the campaign ran the no-em-dash pass) |
| `frontend/src/lib/calc-shared.ts` | 903 vs 903 lines. Same, em-dash only |
| `tests/calculators-contract.test.ts` | waves is +10 lines |
| `backend/tests/coverage/test_dv4_constraint_migration_gate.py` | waves is +182 lines — the live-DB gate replacing the file-existence one |

Six are code, and every hunk is a pure addition or a comment:

| file | hunks | content |
|---|---|---|
| `backend/app/main.py` | 1 | the runner call block; HEAD side is empty |
| `backend/app/models.py` | 2 | CD-9 docstring wording only |
| `backend/app/routers/billing.py` | 1 | one D-013 comment line |
| `backend/app/routers/projects.py` | 1 | one D-013 comment line |
| `.../d/attendance/page.tsx` | 1 | adds `if (lat < -90 \|\| lat > 90 \|\| lng < -180 \|\| lng > 180) return false;` |
| `.../p/[project_id]/attendance/page.tsx` | 1 | same bounds check |

Plus `audit/AUDIT_FIX_REGISTER.md`, which is register bookkeeping.

**Resolution is `--theirs` on all eleven.** In every case the `campaign/waves` side is a strict
superset or a cosmetic reformat of `main`'s. There is no semantic divergence to adjudicate — the two
`calc_shared` implementations are byte-identical apart from punctuation, which was the one outcome
that could have made this merge dangerous.

**I did not perform the merge.** Two reasons: resolving conflicts is the fixing agent's file
ownership, and merging to `main` **auto-deploys to both Vercel and Render**, which is a production
deploy that needs the founder's explicit go-ahead rather than being a side effect of a review.

## Ordering that matters

`7428b14` should not reach production before F-1. The runner turns F-1's silent skip into a
*permanent* silent skip by recording it as applied. Correct order:

1. F-1 — purge before constraints, `RAISE EXCEPTION` on skip, `verify.sql`
2. M-2 / M-3 — strict-by-default in production, `pg_advisory_lock`
3. M-1 — drop the Postgres startup hook or make its absent-directory case loud
4. Merge to `main`, which deploys
5. Confirm `secrets.DATABASE_URL` is set, then let the workflow run
6. Re-run my probe to confirm the objects actually landed

---

## R2-736 · HIGH · Firebase OTP verify collapses every failure into "Invalid code"

**Observed live 2026-08-27** by the founder, on `site-flow-omega.vercel.app/login`, with the one
number approved in Firebase (`+917667359544`): no SMS arrived, and `123456` returned
**"Invalid code. Please try again."**

**What the screen proves.** The page reached the code-entry stage with a running "Resend in 9s"
timer. That stage is only entered at `login/page.tsx:190-192`, *after*
`signInWithPhoneNumber(auth, fmtMobile(), recaptchaRef.current)` resolves. Had the send failed, the
catch at `:199-206` would have shown "Could not send the code" and left the user on the input
stage. **So Firebase accepted the send request.** The reCAPTCHA badge visible in the corner
confirms the Firebase path, not the MSG91 fallback.

That narrows the cause to two, and neither is a code defect:

1. The number is registered in Firebase Console under **Authentication → Sign-in method → Phone →
   "Phone numbers for testing"**. Firebase never sends a real SMS for those; only the preset code
   works, and there is no reason for it to be `123456`. Given the founder's account that "one
   number has been approved", this is the leading explanation.
2. A real SMS was attempted and not delivered — plausible for Indian numbers, where carrier
   delivery is subject to DLT registration and Spark-plan quota.

**The actual defect is that this could not be told apart from the outside.**
`handleFirebaseOtpVerify` (`login/page.tsx:284-286`) ends in:

```js
} catch {
  setError("Invalid code. Please try again.");
}
```

A bare catch with no binding and no logging. Wrong code, expired code, exhausted quota, network
failure, misconfigured Firebase project, and an already-consumed confirmation all render as the
same four words. Note the asymmetry: the *send* path deliberately logs the real Firebase
`err.code`/`err.message` to the console (`:199`, with a comment explaining exactly why swallowing it
was bad) — and the *verify* path, added in the same file, does not.

**Fix.** Bind the error and `console.error("[firebase otp] confirm failed:", err?.code,
err?.message)` exactly as the send path does. Then map the codes users can act on:
`auth/invalid-verification-code` → "That code is not right", `auth/code-expired` → "That code has
expired, request a new one", `auth/too-many-requests` → "Too many attempts, try again later".
Keep the detail out of the URL and out of the response body.

**Same class as F-6** (`google_auth.py:140-148` discarding `token_resp.text`). Two auth paths, two
discarded upstream diagnoses, two live incidents that took a founder's manual test to notice. Worth
one sweep across every auth handler rather than two point fixes.

**Founder action, 30 seconds, definitive:** open Firebase Console → Authentication → Sign-in method
→ Phone → "Phone numbers for testing" and read the code set against `+91 7667359544`. If the number
is listed, that code is the only one that will ever work and no SMS will ever arrive - which is
correct behaviour, not a bug.

---
---

# Post-merge verification — 2026-08-27, `origin/main` @ `378c13c`

## What landed correctly

Verified by reading `origin/main`, not by trusting the report:

- **F-1 is fixed, and better than I specified.** I asked for `RAISE NOTICE` → `RAISE EXCEPTION`.
  The agent instead restructured each block: the "constraint already exists" guard still returns
  early (correct idempotency), the duplicate branch now **backs up to a timestamped table and
  collapses to the earliest row inline**, and `ALTER TABLE ... ADD CONSTRAINT` sits *after* `END IF`,
  unconditionally. There is no longer any path that declines to add the constraint — if duplicates
  survive the purge, `ADD CONSTRAINT` itself throws. That is the right shape, and my prescription is
  moot. `supabase/migrations/20260825_000006_verify.sql` exists.
- **M-3 fixed.** The CI log shows `[migration_runner] acquired pg_advisory_lock 727310731`.
- **M-2 fixed.** The workflow failed loudly — `Status: Failure`, exit code 1 — instead of printing
  a warning and going green. This is the single most important behavioural change of the batch, and
  it worked on its first real run.
- **F-3** landed (`20260825_000005_po_cancelled_columns.sql`, prefix collision gone).

## What did not land: the migrations still have not applied

Probed production immediately after the deploy. Ground truth:

| check | result |
|---|---|
| the 11 `uq_*` constraints | **all still missing** |
| `_tenant_scoped` RLS policies | **0** |
| tables with `FORCE ROW LEVEL SECURITY` | **0** |
| `purchase_orders.cancelled_at` | absent |
| `boq_items.cost_code` | still `varchar(50)` |
| `tally_connections.voucher_number_template` default | still unset |
| duplicate-purge backup tables | none created |
| `fk_payment_requests_party_company_user_id` | **now present** |
| `supabase_migrations` ledger | **27 rows, every one dated before 2026-08-15. Zero August files.** |
| sanity: `companies` | 5 |

## Root cause — confirmed from the CI log, not inferred

```
[apply_migrations] run failed: (psycopg2.errors.DuplicateColumn)
column "created_at" of relation "face_recognition_logs" already exists
[SQL: ALTER TABLE face_recognition_logs ADD COLUMN created_at TIMESTAMPTZ;]
```

That is `20260815_000001_face_recognition_log_created_at.sql`, and the statement has **no
`IF NOT EXISTS`**.

**The ledger started empty against a database that already had most of the schema.** Every
migration before 2026-08-15 happens to be written idempotently, so replaying all 27 of them was
harmless — they applied, recorded, and cost 38 seconds. The first *non-idempotent* file then hit a
column that `ensure_postgres_schema_sync()` had already created at boot, threw, and `--strict`
correctly aborted the run. Everything after it — including the RLS migration — never got a chance.

**So the run order is the whole story.** `20260824_000001_rls_tenant_predicates_and_force.sql` is
not failing. It is queued behind a file from nine days earlier that cannot replay.

## The remaining landmines, audited across all 21 August migrations

Every `ADD CONSTRAINT` is wrapped in a `DO` block with an existence guard — except one. Two files
need work; the rest will apply or no-op cleanly:

| file | problem | why it fires |
|---|---|---|
| **`20260815_000001_face_recognition_log_created_at.sql`** | `ALTER TABLE ... ADD COLUMN created_at TIMESTAMPTZ;` with no `IF NOT EXISTS` | the column already exists in production. **This is the current failure** |
| **`20260816_000005_material_wastage_reported_by_team.sql`** | bare `ADD CONSTRAINT material_wastage_reported_by_fkey` (no `DO` guard) **and** `ALTER COLUMN reported_by TYPE UUID USING (CASE WHEN reported_by ~ '^[0-9a-f]{8}-...' ...)` | I verified on 2026-08-27 that this FK is **already present** and the column is already `uuid`. The FK add will throw "already exists"; the `USING` clause applies the regex operator `~` to a column that is now `uuid`, which has no such operator. **This is the next failure once the first is fixed** |

`20260816_000004` (`SET DEFAULT`) and `20260821_000005` (`ALTER COLUMN ... TYPE VARCHAR(100)`) are
naturally idempotent and safe to replay.

## Fix — for the agent, two files, then re-run

Do **not** baseline the ledger by inserting rows for already-applied files. That unblocks
production but leaves both migrations broken for any fresh database — a new customer instance, a
staging copy, a restore. Make them replay-safe instead; it fixes both cases at once.

1. `20260815_000001`: `ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;`
2. `20260816_000005`: wrap both statements in a `DO` block — skip the `ALTER COLUMN ... TYPE` when
   `information_schema.columns` already reports `uuid`, and skip the FK when `pg_constraint`
   already holds `material_wastage_reported_by_fkey`. Same guard shape the other files already use.
3. Re-run **Apply Supabase Migrations** (it has a `workflow_dispatch` trigger, so it can be started
   from the Actions tab without another push).
4. I re-probe and confirm the objects — especially the RLS predicates and `FORCE ROW LEVEL
   SECURITY`, which are the reason any of this matters.

**Add a standing rule while the runner is young:** every migration must be safe to replay against a
database that already has the change. The runner replays everything not in the ledger, and the
ledger is new, so "it worked when I pasted it by hand" is no longer sufficient. A grep for
`ADD COLUMN` / `ADD CONSTRAINT` / `ALTER COLUMN ... TYPE` without a guard is a cheap CI check and
would have caught both of these before the merge.

---

## Run #2 (`26c6cc4`) — the replay fixes worked; a runner bug is now the blocker

**The two migration fixes are correct.** `20260815_000001` is now `ADD COLUMN IF NOT EXISTS`, and
`20260816_000005` wraps both operations in `DO` blocks that check `information_schema.columns` for
`data_type <> 'uuid'` and `pg_constraint` for the FK, with a safe `::text` cast inside the `USING`.
Both replay cleanly now and would also work on a fresh database.

**Measured progress.** Ledger went **27 → 36 rows**; **9 of the 21 August migrations applied**.
`tally_connections.voucher_number_template` now has its default — the first August migration to
actually change production. The advisory lock was acquired again.

**Then it failed again**, exit 1, and this time it is not a migration:

```
[apply_migrations] run failed:
sqlalchemy.cyextension.immutabledict.immutabledict is not a sequence
```

### Root cause: `%` in the SQL is being read as a psycopg2 parameter placeholder

`apply_pending_migrations` executes each file with `conn.exec_driver_sql(content)`. SQLAlchemy hands
psycopg2 its empty `immutabledict` as the parameter set; psycopg2 sees a `%` in the statement,
decides interpolation is required, and rejects the parameter object. The fallback
`conn.execute(text(content))` fails for its own reasons, and the handler re-raises the original —
so the message names the symptom and not the `%`.

**Verified, not inferred.** Counting `%` across the 21 August migrations in filename order:

| position | file | `%` count |
|---|---|---|
| 1-9 | `20260815_000001` … `20260821_000002` | **0 each** |
| **10** | **`20260821_000003_three_way_match_unique_pair.sql`** | **1** |
| 13 | `20260823_000002_orphan_unique_constraints.sql` | 7 |
| 17 | `20260825_000002_payment_request_party_fk_repoint.sql` | 2 |
| 18 | `20260825_000003_duplicate_purge_and_constraints.sql` | 16 |
| 19 | `20260825_000004_missing_unique_constraints.sql` | 4 |

Exactly nine files applied. The tenth is the first one containing a `%`. Every `%` is inside a
`RAISE NOTICE '... % ...', var` format string — ordinary, correct PL/pgSQL.

**This is why the constraint work specifically is blocked.** The files carrying the unique
constraints and the duplicate purge are the `%`-heavy ones. The RLS migration
(`20260824_000001`) has no `%` at all and is not failing — it is simply queued behind
`20260823_000002`, which has seven.

### Fix — one function, in `backend/app/migration_runner.py`

Bypass DBAPI parameter interpolation entirely. Replace the execute-with-fallback block with the raw
cursor, called with a **single argument**, which makes psycopg2 skip interpolation altogether:

```python
raw = conn.connection            # SQLAlchemy connection fairy
cur = raw.cursor()
cur.execute(content)             # one arg -> no % interpolation, no params
```

Do **not** fix this by escaping `%` to `%%` in the migration files. The `%` is legitimate PL/pgSQL,
escaping it means every future migration author must remember an invisible rule, and it would need
undoing the day the runner is fixed properly. Fix the runner, leave the SQL alone.

Keep the `text(content)` fallback if you like, but it must not mask the real error — the current
`raise first_err` is what turned a `%`-quoting problem into a message about immutabledicts.

### Worth saying plainly

`--strict` has now caught two distinct real failures on its first two runs, and both would have gone
green under the old behaviour: a non-replayable migration, and a runner that cannot execute
`RAISE NOTICE`. M-2 has already paid for itself twice.

---

## Run #3 (`1568092`) — the `%` fix worked; an ordering deadlock is the blocker

**The runner bug is fixed.** Run #3 got past `RAISE NOTICE` and reached the `DO` block's own logic,
which is what the raw-cursor change was for. It now fails with a real message from the migration
rather than a SQLAlchemy internal:

```
[migration_runner] FAILED to apply 20260821_000003_three_way_match_unique_pair.sql:
migration failed: constraint uq_three_way_matches_po_grn missing:
2 duplicate (po_id, grn_id) group(s) present - purge required
```

Ledger unchanged at **36 total / 9 August** — run #3 applied nothing new, but it failed for an
honest reason and the new fallback message surfaces both errors as asked.

### The deadlock

The file's own comment says: *"purge duplicates via
`20260825_000003_duplicate_purge_and_constraints.sql` first, then re-run."*

**That file runs four days later in filename order.** The runner applies in sorted order, so
`20260821_000003` is always reached first, always throws, and `20260825_000003` can never run. The
instruction in the comment is unreachable by construction.

Measured across the five constraint-bearing migrations:

| file | `RAISE EXCEPTION` | inline purge | constraints | runs |
|---|---|---|---|---|
| `20260821_000003_three_way_match_unique_pair` | 1 | **none** | 1 | 1st |
| `20260823_000001_payroll_runs_unique_month` | 1 | **none** | 1 | 2nd |
| `20260823_000002_orphan_unique_constraints` | 7 | **none** | 7 | 3rd |
| `20260825_000003_duplicate_purge_and_constraints` | 0 | **yes (32 refs)** | 8 | 4th |
| `20260825_000004_missing_unique_constraints` | 0 | **yes (8 refs)** | 2 | 5th |

F-1's restructure was applied to the two `20260825` files, which now purge inline and therefore need
no exception. The three earlier files got the *other* half of F-1 — `RAISE EXCEPTION` instead of a
silent skip — without a purge to make the exception avoidable. Correct individually, deadlocked
together.

### Duplicate counts, measured now

| pair | groups | note |
|---|---|---|
| `three_way_matches(po_id, grn_id)` | **2** | blocks `20260821_000003` |
| `payroll_runs(company_id, project_id, payroll_month)` | **2** | blocks `20260823_000001` — and the table has only **4 rows total**, so every row is part of a duplicate pair |
| `company_team(company_id, user_id)` | 1 | handled inline by `20260825_000004` |
| `library_cost_codes(company_id, code)` | 0 | fine |
| bills, purchase_orders, GRN, work_orders, NCRs, payments, material_indents | 0 | fine |

### The overlap that makes the fix cheap

`20260825_000003` re-declares **8** constraints, and they cover **8 of the 9** in the three early
files — all 7 from `20260823_000002` plus `uq_three_way_matches_po_grn` from `20260821_000003`.
Only `uq_payroll_runs_company_project_month` is unique to `20260823_000001`.

**Fix.**

1. `20260821_000003` and `20260823_000002` are **superseded** by `20260825_000003`. Reduce them to
   no-ops with a comment naming the owner file. Keep the files so the ledger stays stable. This is
   *not* the silent-skip antipattern F-1 removed: the later migration in the same batch creates
   those constraints and fails loudly if it cannot.
2. `20260823_000001` (payroll) is the one nothing else owns. Give it the same inline purge shape as
   `20260825_000003` — back the duplicate rows into a timestamped table, collapse to earliest, then
   `ADD CONSTRAINT` unconditionally after `END IF`.

### Separately, worth the founder's eye

`payroll_runs` holds **4 rows forming 2 duplicate `(company_id, project_id, payroll_month)`
groups** — i.e. every payroll run in the database is duplicated. If any of those belong to a real
company rather than the test tenants, a duplicated payroll run is a double-counted salary figure.
The purge keeps the earliest row of each pair, which is the right default, but the *reason* two runs
exist for the same month is worth knowing before it is collapsed. Check which company they belong to
first.

---

## Run #4 (`2a34f76`) — GREEN. All 21 August migrations applied to production.

Probed immediately after the run. This is the measurement the whole verification pass was driving
at, and it is the first time production has matched the repository.

| check | before (2026-08-27 morning) | after run #4 |
|---|---|---|
| the 12 named constraints | **all 12 missing** | **all 12 present** |
| `_tenant_scoped` RLS policies | **0** | **108** |
| tables with `FORCE ROW LEVEL SECURITY` | **0** | **141** |
| legacy `*_authenticated_all` policies | 139 | 33 |
| `purchase_orders.cancelled_at` / `cancelled_by` | absent | both present |
| `boq_items.cost_code` | `varchar(50)` | **`varchar(100)`** |
| ledger: total / August | 27 / 0 | **48 / 21** |
| sanity: `companies` | 5 | 5 |

**R2-701, R2-702, R2-703's constraint family, and the 2026-08-24 RLS migration are now closed
against production, not against a file.** Tenant isolation in the database is no longer "any
authenticated user".

Policy arithmetic checks out: 108 tenant-scoped + 33 deliberately-permissive = 141 total, matching
141 RLS-enabled tables exactly. The remaining 33 `*_authenticated_all` are the ones the migration
deliberately left non-tenant-scoped (chat, checklists, drawing pins and similar), not residue.

### The purge did real work, and it is recoverable

Four backup tables were created, all timestamped `20260827_0939`:

```
_audit_backup_payroll_runs_20260827_093903773508
_audit_backup_ncrs_20260827_093908167991
_audit_backup_payments_20260827_093908174143
_audit_backup_three_way_matches_20260827_093908183946
```

So `ncrs` and `payments` also carried duplicates — I had not measured those two, and would have
reported "duplicates only in three_way_matches and payroll_runs" had the purge not surfaced them.
Every collapsed row is retrievable from its backup table. Do not drop these until the founder has
looked at them.

Duplicate groups after the purge: `three_way_matches` **0**, `payroll_runs` **0**.

### Correction to something I told the founder earlier

I reported `company_team(company_id, user_id)` as having **1 duplicate group**, and used it as
evidence that D-V2's zero-duplicate window had begun to close. **That was my query's fault, not the
data's.**

```
dup_groups_naive   = 1     <- my original GROUP BY, counts NULLs as equal
dup_groups_nonnull = 0     <- excluding NULL user_id
null_user_rows     = 2
constraint_present = 1     <- uq_company_team_company_id_user_id exists
```

The "duplicate" is two rows with `user_id IS NULL`. Postgres `UNIQUE` permits multiple NULLs, so
there was never a conflict — which is why the constraint created cleanly. The claim that
`company_team` had a real duplicate was wrong and is withdrawn. `three_way_matches` (2 groups) was
genuine and is now purged.

Two `company_team` rows with a NULL `user_id` are a separate, minor question — a team member record
with no linked user. Worth a look, not urgent, not a blocker.

### What this closes

- **F-1** — verified working end to end: the purge ran, backups exist, constraints created.
- **F-2 / M-1** — the ledger is real and populated (48 rows), and the CI path is the one that
  applied them.
- **M-2** — `--strict` caught **three** distinct real failures across runs #1-#3, every one of
  which would have gone green under the old swallow-and-continue behaviour: a non-replayable
  migration, a runner that could not execute `%`, and an ordering deadlock.
- **M-3** — advisory lock acquired on every run.
- **R2-731** — closed. The mechanism now exists *and* demonstrably applies to production.

### Still open

The policy **count** is a schema fact. It is not yet proof that a user of company A cannot read
company B's rows — that needs a session-level test against the live API with two tenants. That is
the next thing worth doing, and it is now worth doing, because before today there was nothing to
test.

---

## R2-737 · MEDIUM · CRM `expected_closure` validator 500s on any timezone-aware date

**The naive/aware datetime sweep I promised after R2-728.** Swept `backend/app` at `origin/main`
`2a34f76`: **35 naive `utcnow()` / `datetime.now()` call sites**, of which **24** participate in
arithmetic or comparison. Most of those 24 are *writes* — a naive value assigned into a
`TIMESTAMPTZ` column. Those are fragile but not defects today (Supabase's session `TimeZone` is UTC
and the value is `utcnow()`, so it lands correctly).

**Two are the R2-728 mechanism proper**, and they are the same two lines duplicated:

- `backend/app/routers/crm.py:121` — `LeadCreateRequest._reject_past_closure`
- `backend/app/routers/crm.py:152` — `LeadUpdateRequest._reject_past_closure`

```python
@field_validator("expected_closure")
@classmethod
def _reject_past_closure(cls, v: Optional[datetime]) -> Optional[datetime]:
    if v is not None and v < datetime.utcnow():
        raise ValueError("expected_closure must not be in the past")
    return v
```

`v` is parsed by Pydantic from the request body. If the caller sends an offset-bearing ISO string —
`"2027-03-01T00:00:00+05:30"`, which is what any correct Indian client would send — Pydantic
produces an **aware** `datetime`. Comparing it to naive `datetime.utcnow()` raises
`TypeError: can't compare offset-naive and offset-aware datetimes`.

**And a `TypeError` is not a validation failure.** Pydantic v2 converts `ValueError` and
`AssertionError` inside a validator into a `ValidationError` (HTTP 422). Anything else propagates,
so FastAPI returns **500**. The caller gets a server error instead of "expected_closure must not be
in the past", and the request is indistinguishable from an outage.

**Why it has not been noticed.** The console almost certainly posts a naive or date-only value, so
the app itself never trips it. It fires for any other API consumer — and the product ships BI API
keys (`bi_api_keys`), so third-party callers are an intended surface. It is also invisible to the
test suite for the same structural reason R2-728 was: nothing in the suite sends an offset-bearing
datetime to this endpoint.

**The fix is already in the codebase, three files away.** `routers/todos.py:57-61` does it correctly:

```python
now = datetime.utcnow()
if t.due_date.tzinfo is not None:
    now = now.replace(tzinfo=timezone.utc)
is_overdue = t.due_date < now
```

Apply the same normalisation in both CRM validators — or better, normalise `v` to UTC-aware once
and compare against `datetime.now(timezone.utc)`.

**Gate.** A test that POSTs a lead with `expected_closure` carrying a `+05:30` offset and asserts
**422, not 500**. Both the create and the update path.

### Cleared by the same sweep

- `routers/hr.py:1517` — `now = datetime.utcnow()` is used only for `.year`; never compared to a
  column value. Safe.
- `routers/todos.py:59` — already handles the aware case explicitly, as quoted above.
- The remaining 21 sites are assignments into `TIMESTAMPTZ` columns. Correct today. Worth a
  standing preference for `datetime.now(timezone.utc)` in new code so the class stops recurring,
  but not worth 21 edits now.

---
---

# RLS isolation test — 2026-08-27. The policies do not isolate anything.

Run against production after the migrations landed. **This retracts the framing I gave earlier
today** ("tenant isolation in your database is no longer 'any authenticated user'"). The policies
did change. They were never load-bearing, and as written they cannot become so.

## R2-738 · CRITICAL · `company_team_tenant_scoped` is self-referential — infinite recursion

The simulation was one statement: `begin; set local role authenticated; select count(*) from
projects, bills, companies; rollback;` — read-only, rolled back.

```
ERROR: 42P17: infinite recursion detected in policy for relation "company_team"
```

Not "zero rows". A hard error. The cause, read straight from `pg_policies`:

```
company_team_tenant_scoped  ON company_team  FOR ALL  TO authenticated
USING (company_id IN (SELECT ct.company_id FROM company_team ct WHERE ct.user_id = auth.uid()))
```

**The policy on `company_team` queries `company_team`.** Evaluating it requires reading the table,
which requires evaluating the policy. Postgres detects the cycle and aborts.

And because ~108 tenant policies all subquery `company_team`, this is not confined to one table:
**every tenant-scoped table errors for the `authenticated` role.** The classic Supabase fix is a
`SECURITY DEFINER` helper function that reads the membership table outside RLS, with the
`company_team` policy itself keyed directly on `user_id = auth.uid()` rather than on a subquery
over itself.

**Why this is CRITICAL rather than cosmetic.** Today nothing connects as `authenticated`, so nothing
breaks. The moment anyone does the obvious hardening step — move the backend off the superuser role
so RLS actually applies — **the entire API returns 500 on every tenant table.** The work that looks
like a safety net is a tripwire under the next safety improvement.

## R2-739 · HIGH · The policies cannot engage for application traffic, on two independent counts

**1. The app bypasses RLS by role.** `pg_roles` reports `rolbypassrls` on: `service_role`,
`supabase_admin`, `supabase_etl_admin`, `supabase_read_only_user`, **`postgres`**. Render's
`DATABASE_URL` is a Supabase Postgres connection string, i.e. the `postgres` user, and the backend
also holds `SUPABASE_SERVICE_ROLE_KEY`. Both bypass. `FORCE ROW LEVEL SECURITY` does not help —
it forces policies on the table *owner*, not on `BYPASSRLS` roles.

**2. The predicate is structurally unsatisfiable for this app.** Every policy keys on `auth.uid()`,
which returns the **Supabase Auth** user id. Measured:

| | |
|---|---|
| `auth.users` rows | **0** |
| `public.users` rows | **8** |
| ids overlapping between them | **0** |
| `company_team.user_id` foreign key target | **`public.users`** |

SiteFlow has its own authentication — OTP and password against `public.users`, signed with the
app's own `SECRET_KEY`. It has never used Supabase Auth; that table is empty. So `auth.uid()` is
`NULL` in every session, and `WHERE ct.user_id = auth.uid()` can never match. Even without the
recursion bug, the policies would deny everything rather than scope anything.

**Net effect: the 108 `_tenant_scoped` policies and 141 `FORCE ROW LEVEL SECURITY` tables provide
zero protection today.** Tenant isolation in this product is enforced **entirely** by the
`company_id` filters in the FastAPI query layer. That is the honest statement, and it is where audit
attention belongs.

**If database-level defence-in-depth is wanted**, the shape has to match the architecture: the
backend sets a per-request session variable (`SET LOCAL app.current_user_id = ...`), policies read
`current_setting('app.current_user_id', true)` instead of `auth.uid()`, and the backend connects as
a role **without** `BYPASSRLS`. That is a real project, not a migration.

## R2-740 · HIGH · `companies` and `users` are still `USING (true)`

Of the 33 legacy `*_authenticated_all` policies left in place, two are on the tables that matter
most:

```
companies_authenticated_all   ON companies  FOR ALL  TO authenticated  USING (true)
users_authenticated_all       ON users      FOR ALL  TO authenticated  USING (true)
```

The migration tenant-scoped 108 tables and left the company registry and the user registry
unrestricted. In a working RLS deployment, any authenticated principal could read **every company
and every user row in the system** — names, emails, mobiles. They are inert today for the same two
reasons above, which is the only thing keeping this from being an exposure.

`company_team` is also the correct place to break the recursion, and `companies`/`users` are the
correct place to scope by membership. All three want fixing together.

## What was actually verified, stated precisely

| claim | status |
|---|---|
| the 12 constraints exist in production | **verified true** |
| 108 `_tenant_scoped` policies and 141 `FORCE RLS` tables exist | **verified true** |
| those policies isolate tenant data | **verified FALSE** — inert by role, unsatisfiable by predicate, and recursive when reached |
| the FastAPI layer isolates tenants by `company_id` | **still untested** — needs two live sessions against the API |

The last row is now the highest-value open item in the project. It requires two logins, which needs
either the Firebase test-number code or a password account in two test tenants.

---

## RLS re-test after `9b1a5d6` — R2-738, R2-739, R2-740 all verified fixed in production

`origin/main` `9b1a5d6`. Both migrations applied — ledger **50 rows**, `20260825_000007_rls_correctness`
and `20260825_000008_rls_tenant_member_ids` recorded.

**Schema state:**

| check | result |
|---|---|
| helper functions | `current_app_user_id` [invoker], `current_company_ids` [SECDEF], `tenant_member_user_ids` [SECDEF] |
| `company_team` policy | `USING (user_id = current_app_user_id())` — no self-subquery |
| policies still `USING (true)` for `authenticated` | **31** (was 33; `companies` and `users` now scoped) |

**Behavioural test.** One `DO` block: pick a user with a membership, `set_config('app.current_user_id', …, true)`,
`SET LOCAL ROLE authenticated`, count what is visible, then `RAISE EXCEPTION` so the whole thing
rolls back. Nothing was written.

```
user=de7193b6-59fa-4485-bb24-6f34c9169020  company=Demo Construction Ltd
company_team readable (no 42P17) = 1
projects: sees 5 of 7 total, expected 5
FOREIGN projects visible = 0
companies: sees 1 of 5
users visible = 2
bills visible = 0
```

Every line is what it should be:

- **R2-738 fixed** — `company_team` is readable as `authenticated`. The 42P17 recursion that
  previously aborted every tenant-scoped query is gone, confirmed against production rather than
  against the migration text.
- **Isolation is real** — 5 of 7 projects visible, and **0 foreign projects**. The two projects
  belonging to other tenants are invisible to this session.
- **R2-740 fixed** — `companies` returns 1 of 5, not all 5.
- **The `users` directory works** — 2 users visible, which is the demo tenant's membership, not
  self-only. That confirms `20260825_000008`'s `tenant_member_user_ids()` SECURITY DEFINER helper
  actually solved the collapse I flagged before the push. Had it not, this would read 1.

### What this does and does not prove

**Proved:** the policies are correct. Given a session whose identity is set and whose role is
subject to RLS, the database enforces tenant isolation.

**Not proved, and still true:** RLS is **inert for application traffic**. Render connects as a
`BYPASSRLS` role and `RLS_SESSION_CONTEXT` defaults to `False`, both deliberately. So today the
database is not enforcing anything for real requests — the FastAPI `company_id` filters still carry
the entire load.

The difference from this morning is that the safety net now exists and is known to work. Turning it
on is a separate, sequenced change:

1. Create a database role **without** `BYPASSRLS`, granted the same table privileges.
2. Set `RLS_SESSION_CONTEXT=1` on Render.
3. Point `DATABASE_URL` at the new role.
4. Re-run this exact test, plus a full smoke pass of the console.

Steps 1-3 in the wrong order, or without step 4, take the API down. I would do it on a Supabase
branch first, not on production.

### Still open

The **API-layer isolation test** — whether the FastAPI query filters keep tenant A out of tenant B's
data — remains the highest-value untested claim, because it is the layer actually protecting the
product today. It needs two live logins in different test tenants.

---

## API-layer tenant isolation — static audit, 2026-08-27, `origin/main` `9b1a5d6`

No login required. This does not replace the live probe, but it narrows what the live probe has to
prove from "does the whole API leak" to "does a specific guard behave as written".

### Every company-scoped surface is guarded

Swept all 49 router modules, matching each `@router.*` decorator to its handler body.

**Endpoints with `{company_id}` in the path — 108 total:**

| | count | how |
|---|---|---|
| membership-guarded | **103** | `require_module_view` / `require_permission` / `verify_company_access` / `get_company_membership` / `get_verified_company_user` |
| BI feed | 3 | `_resolve_key`, see below |
| admin migrations | 2 | `_require_admin_secret` (`X-Admin-Secret`, 403 when the secret is unset) |
| **unguarded** | **0** | — |

**Endpoints taking `company_id` from query or body rather than the path — 267 total:**

| | count |
|---|---|
| guarded | **260** |
| exempt by design, each verified individually | **7** |

The seven exemptions are `auth.py /my-companies`, `/oauth/exchange`, `/onboarding/create-company`,
and the four OAuth `/callback` routes. None of them accept a caller-supplied `company_id`:
`/my-companies` derives the list from `current_user.id`; `/oauth/exchange` resolves a single-use
hashed handoff code and burns it; the callbacks run before any company context exists.

### The BI feed was the one worth checking, and it is correct

`bi_export.py` exposes `/feed/{company_id}/projects`, `/budget-variance` and `/labour-productivity`
to third-party API keys — the one surface deliberately reachable without a user session. It is the
natural place for a cross-tenant leak, and `_resolve_key` (`bi_export.py:60-78`) closes it:

```python
key = db.query(models.BiApiKey).filter(
    models.BiApiKey.company_id == company_id,     # from the URL path
    models.BiApiKey.key_hash == _hash_key(raw),
    models.BiApiKey.revoked == False,
).first()
if not key:
    raise HTTPException(401, "Invalid or revoked API key")
```

The lookup is keyed on the path `company_id` **and** the hash together, so a key issued for company
A returns no row when pointed at company B, and 401s. Revocation is honoured in the same query.

### The guards themselves are correctly written

Presence is not correctness, so I read all four implementations in `auth.py`. Each filters on both
sides of the relationship and fails closed:

- `get_company_membership` (`:118`) — `user_id == user.id AND company_id == company_id`, else 403.
- `verify_company_access` (`:332`) — same pair as a FastAPI dependency, else 403.
- `verify_project_in_company` (`:132`) — loads the project, 404 if absent, **403 if
  `project.company_id != company_id`**.
- `verify_project_access` (`:350`) — resolves the project's owning company, then checks membership
  against *that*, not against a caller-supplied value.

None of them trusts a company id from the request without joining it to the caller's membership row.

### Standing, stated honestly

**Verified:** every company-scoped endpoint invokes an authorisation guard, and the guards are
written correctly.

**Not verified:** that each of the 363 call sites passes the *right* company id into its guard. A
handler could guard `company_id` and then query on a different variable. Static analysis cannot see
that; only a live cross-tenant probe can.

**Context that lowers the stakes:** the founder confirms there are no real customer companies yet —
all five tenants are test data. A leak found now costs nothing, which is the right time to look.

### The live probe, and why it needs only one login

The attack is not "log in as tenant B". It is **"log in as tenant A and ask for tenant B's data by
id"** — and all five company UUIDs are already known. One session is sufficient.

Method, which keeps credentials out of my hands entirely: the founder logs into the live app **in
the Browser pane**, types the OTP themselves, and I then drive `fetch()` from the page origin using
the session already in that tab. I never see the password, the OTP or the token. This is the same
method used in the Rounds 6-9 browser audit.

Probe list, once a session exists — for each, substitute a company id the session does **not**
belong to and assert **403**, not 200:

```
GET /apis/v3/finance/transactions/{other_company_id}
GET /apis/v3/finance/parties/{other_company_id}
GET /apis/v3/billing/bills/{other_company_id}
GET /apis/v3/procurement/purchase-orders/{other_company_id}
GET /apis/v3/hr/employees/{other_company_id}
GET /apis/v3/settings/company/{other_company_id}
GET /apis/v3/projects/{other_company_id}
```

Plus one project-scoped probe using a `project_id` owned by another tenant, to exercise
`verify_project_access` rather than `verify_company_access`.

---

## R2-741 · CRITICAL · LIVE OUTAGE — 4 model columns have no migration; every login 500s

**Reported by the founder 2026-08-27 ~17:10: every account, new or old, returns
`{"detail":"Internal server error"}` at `/apis/v3/auth/google/callback`.**

Not a Google problem. From the Render logs:

```
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedColumn)
column companies.assume_full_month_when_no_attendance does not exist
[SQL: SELECT companies.id, companies.name, ... ]
```

Any query that selects `Company` fails. Every login path resolves company context, so
**all authentication is down**, not just Google.

### The four columns, confirmed missing in production

| table | column | model line | type |
|---|---|---|---|
| `companies` | `assume_full_month_when_no_attendance` | 103 | `Boolean, nullable=True, server_default="0"` |
| `companies` | `pf_wage_ceiling` | 105 | `Numeric(14,2), nullable=True, default=15000` |
| `company_payroll_settings` | `pf_wage_ceiling` | 279 | `Numeric(14,2), nullable=True, default=15000` |
| `payroll_line_items` | `attendance_source` | 889 | `String(20), nullable=True, default="recorded"` |

All four were added by `4418a54` (D2/CD-4, the zero-attendance payroll work). **No migration
under `supabase/migrations/` mentions any of them** - grep for `assume_full_month` returns nothing.

### Why nothing caught it

1. **No migration.** This is R2-711 exactly: a model column with no migration. The D-V4 gate
   asserts named *constraints* appear in a migration file; it says nothing about columns.
2. **`ensure_postgres_schema_sync()` should have covered it** (`main.py:271`) - it walks
   `Base.metadata` and issues `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for nullable/defaulted
   columns, which all four are. It did not. Its per-table body is wrapped in `try/except: continue`,
   so a failure is silent. That swallow is now the second-order defect worth fixing.
3. **SQLite cannot see it.** The test suite builds the schema from `Base.metadata`, so the column
   always exists locally. Same structural blindness as R2-728 and R2-737.

### Fix

Immediate unblock (additive, nullable, defaulted, reversible):

```sql
ALTER TABLE companies                ADD COLUMN IF NOT EXISTS assume_full_month_when_no_attendance BOOLEAN DEFAULT false;
ALTER TABLE companies                ADD COLUMN IF NOT EXISTS pf_wage_ceiling NUMERIC(14,2) DEFAULT 15000;
ALTER TABLE company_payroll_settings ADD COLUMN IF NOT EXISTS pf_wage_ceiling NUMERIC(14,2) DEFAULT 15000;
ALTER TABLE payroll_line_items       ADD COLUMN IF NOT EXISTS attendance_source VARCHAR(20) DEFAULT 'recorded';
```

Proper fix: the same statements as a numbered migration so a fresh database gets them, plus
(a) find out why the boot sync skipped them and stop it swallowing exceptions, and (b) a gate that
fails when a `Base.metadata` column is absent from both the migrations and the live DB - the column
equivalent of the D-V4 constraint gate.

---

## R2-742 · HIGH · `/tally/pending` UnboundLocalError for any company without a Tally connection

Surfaced by **Sentry** (`mit-manipal-u5.sentry.io`), not by my sweeps:
`UnboundLocalError: cannot access local variable "excluded_bills" where it is not associated with a value`
at `/apis/v3/tally/pending`. Age 6 days, 1 event, unresolved.

`routers/tally.py:649-691`. Three locals are pre-initialised before the branch:

```python
bill_ids: List[str] = []      # 653
payment_ids: List[str] = []   # 654
vouchers = []                 # 655
if conn:
    ...
    excluded_bills = ...      # 669  <-- assigned ONLY inside the branch
    excluded_payments = ...   # 675  <-- same
```

and the return references all five:

```python
"excluded_before_window": {"bills": excluded_bills, "payments": excluded_payments}   # 690
```

So the endpoint raises `UnboundLocalError` -> 500 whenever `conn` is falsy, i.e. **for every company
that has not configured Tally** - which is the default state for a new tenant. The three locals that
were pre-initialised prove the author knew the branch could be skipped; the two counters added later
with the sync-window feature were simply missed.

**Fix.** Initialise `excluded_bills = 0` and `excluded_payments = 0` alongside the other three at
line 655. One line each.

**Gate.** Call `/tally/pending` for a company with no `TallyConnection` row and assert 200 with
`excluded_before_window == {"bills": 0, "payments": 0}`.

### Sentry is configured, working, and I should have looked at it sooner

`SENTRY_DSN` is set on Render and the project is live. Two unresolved issues in 14 days across the
whole backend - this one and R2-741. That is a genuinely good runtime-stability signal, and it is a
better first stop than any static sweep for "what is actually breaking in production".

It also **dates R2-741 precisely**: first seen ~7 hours before 17:14 IST, so ~10:14 - not the 14:19
merge. 7 events, 0 users affected. My earlier assumption that the merge caused it was wrong; the
columns were already missing before today.
