-- ============================================================================
-- SiteFlow — LAUNCH CLEANUP
-- Removes the demo/test tenants and everything hanging off them.
--
-- Written 2026-08-27 by the verification agent. HOLD UNTIL LAUNCH.
-- DRY-RUN VERIFIED against production 2026-08-27 (rolled back, nothing changed).
--
-- HOW TO RUN
--   1. Take a Supabase snapshot first. Non-negotiable.
--   2. Run PART 1 as-is. It ends in RAISE EXCEPTION, so Postgres rolls the
--      whole thing back. It deletes NOTHING. Read its report.
--   3. Only if the report looks right: comment out the RAISE EXCEPTION line
--      marked ">>> DRY RUN GUARD <<<" and run again. That run commits.
--   4. Supabase will show a "destructive operations" warning both times.
--      Confirm it - the guard, not the warning, is what protects you on run 2.
--
-- WHY A RETRY LOOP AND NOT AN ORDERED DELETE LIST
--   Measured on this schema: 142 tables, 81 carrying company_id, and only 200
--   of 267 foreign keys are ON DELETE CASCADE. 67 are not. A hand-written list
--   would need exact reverse-topological order and would rot the next time a
--   table is added. This retries every company_id table, swallowing FK
--   violations, until a full pass deletes nothing. It converges by
--   construction, and aborts rather than looping if it has not converged in 25.
--
-- THE BUG THE DRY RUN CAUGHT (do not reintroduce)
--   The first version deleted company_team inside the loop and only afterwards
--   looked for "users whose only membership is the demo tenant". By then the
--   memberships were gone, so it matched zero users and would have left two
--   orphaned user rows behind. The doomed-user ids are now captured BEFORE the
--   loop runs. This is why the report prints captured_users.
--
-- DRY RUN RESULT, 2026-08-27, demo tenant only:
--   captured_users=2 | PASS1=43 PASS2=0 | user_otps=4 users=2 companies=1
--   | LEFT companies=4 demo_user=0 demo_otp=0   (grand total 50 rows)
-- ============================================================================

do $$
declare
  t          record;
  pass       int    := 0;
  n          bigint;
  pass_total bigint;
  grand      bigint := 0;
  rpt        text   := '';
  doomed     uuid[];

  -- ---------------------------------------------------------------------
  -- CONFIGURE: which tenants are being removed.
  --
  -- Demo Construction Ltd is D-V1 step 3 / R2-735. Its application code
  -- paths were already deleted, so it is unreachable and cannot serve as a
  -- demo. It is safe to remove.
  --
  -- The two test tenants are listed but commented. Add them at launch when
  -- you no longer want a scratch company to test against.
  -- ---------------------------------------------------------------------
  targets uuid[] := array[
      'e0000000-0000-0000-0000-000000000000'   -- Demo Construction Ltd
--  , '1776c887-5552-4611-aad5-f4899aad0f87'   -- Test Claude B2 Construction
--  , '1fa705a4-7aa6-42f2-9906-65902c96916f'   -- ZZ R8 Throwaway
  ]::uuid[];
begin
  -- Capture users whose ONLY membership is in a target company, BEFORE the
  -- loop deletes company_team. A user with any other membership is left alone.
  select array_agg(u.id) into doomed
    from users u
   where exists (
           select 1 from company_team ct
            where ct.user_id = u.id and ct.company_id = any(targets))
     and not exists (
           select 1 from company_team c2
            where c2.user_id = u.id and not (c2.company_id = any(targets)));
  rpt := rpt || 'captured_users=' || coalesce(array_length(doomed, 1), 0) || ' || ';

  loop
    pass := pass + 1;
    pass_total := 0;

    for t in
      select c.table_name
        from information_schema.columns c
        join information_schema.tables tb
          on tb.table_schema = c.table_schema and tb.table_name = c.table_name
       where c.table_schema = 'public'
         and c.column_name  = 'company_id'
         and tb.table_type  = 'BASE TABLE'
       order by c.table_name
    loop
      begin
        execute format('delete from %I where company_id = any($1)', t.table_name)
          using targets;
        get diagnostics n = row_count;
        pass_total := pass_total + n;
      exception
        when foreign_key_violation then
          -- a child elsewhere still references these rows; a later pass clears
          -- the child first. Ordering, not an error.
          null;
      end;
    end loop;

    grand := grand + pass_total;
    rpt   := rpt || 'PASS' || pass || '=' || pass_total || ' ';
    exit when pass_total = 0;

    if pass > 25 then
      raise exception 'cleanup did not converge after 25 passes - stop and inspect';
    end if;
  end loop;

  if doomed is not null then
    -- OTP codes are keyed by email/mobile, not by company_id, so the loop
    -- above never sees them.
    delete from otp_codes o
     using users u
     where u.id = any(doomed)
       and o.identifier in (u.email, u.mobile);
    get diagnostics n = row_count; grand := grand + n;
    rpt := rpt || '|| user_otps=' || n || ' ';

    delete from users where id = any(doomed);
    get diagnostics n = row_count; grand := grand + n;
    rpt := rpt || 'users=' || n || ' ';
  end if;

  delete from companies where id = any(targets);
  get diagnostics n = row_count; grand := grand + n;
  rpt := rpt || 'companies=' || n || ' ';

  -- Post-state, still inside the transaction. Every "left" count must be 0.
  rpt := rpt
      || '|| LEFT companies='  || (select count(*) from companies where id = any(targets))
      || ' projects='          || (select count(*) from projects  where company_id = any(targets))
      || ' demo_user='         || (select count(*) from users     where lower(email) = 'demo@siteflow.co')
      || ' demo_otp='          || (select count(*) from otp_codes where identifier   = 'demo@siteflow.co')
      || ' || companies_remaining=' || (select count(*) from companies);

  -- >>> DRY RUN GUARD <<<
  -- This aborts the transaction, so nothing above is persisted.
  -- COMMENT OUT THE NEXT LINE (and uncomment the RAISE NOTICE) to run for real.
  raise exception 'DRY RUN - ROLLED BACK. grand=% :: %', grand, rpt;
--raise notice    'CLEANUP COMMITTED. grand=% :: %', grand, rpt;
end $$;
