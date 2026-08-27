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
