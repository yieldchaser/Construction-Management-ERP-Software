-- ============================================================================
-- SiteFlow — LAUNCH CLEANUP
-- Removes the demo/test tenants and everything hanging off them.
--
-- Written 2026-08-27 by the verification agent. HOLD THIS UNTIL LAUNCH.
--
-- READ BEFORE RUNNING
--   * Run PART 1 (preview) first. It only counts. Nothing is deleted.
--   * PART 2 deletes. It runs inside an explicit transaction and ENDS WITH
--     ROLLBACK. Change the last line to COMMIT only when the preview counts
--     look right to you.
--   * Take a Supabase backup/snapshot first regardless.
--
-- WHY A LOOP INSTEAD OF A LIST OF DELETES
--   The schema has 142 tables, 81 of them carrying company_id, and 267 foreign
--   keys of which only 200 are ON DELETE CASCADE. 67 are not. A hand-written
--   delete list would have to be in exact reverse-topological order and would
--   rot the moment a table is added. The loop below repeatedly attempts every
--   company_id-bearing table, swallowing FK violations, until a whole pass
--   deletes nothing new. That converges on the correct order by construction.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- CONFIGURE: which tenants are being removed.
--
-- Row 1 is the demo tenant (D-V1 step 3 / R2-735). Its application code paths
-- were already deleted, so it is unreachable and serves no demo purpose today.
--
-- Rows 2 and 3 are the audit's test companies. UNCOMMENT them only when you no
-- longer need a scratch tenant to test against.
-- ---------------------------------------------------------------------------
create temporary table _purge_companies (id uuid primary key, label text);

insert into _purge_companies (id, label) values
  ('e0000000-0000-0000-0000-000000000000', 'Demo Construction Ltd')
--, ('1776c887-5552-4611-aad5-f4899aad0f87', 'Test Claude B2 Construction')
--, ('1fa705a4-7aa6-42f2-9906-65902c96916f', 'ZZ R8 Throwaway')
;


-- ===========================================================================
-- PART 1 — PREVIEW. Read-only. Run this alone first.
-- ===========================================================================
do $$
declare
  t   record;
  n   bigint;
  tot bigint := 0;
  rpt text := '';
begin
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
    execute format(
      'select count(*) from %I where company_id in (select id from _purge_companies)',
      t.table_name
    ) into n;
    if n > 0 then
      rpt := rpt || format('%-40s %s', t.table_name, n) || E'\n';
      tot := tot + n;
    end if;
  end loop;

  -- users are not company-scoped by a company_id column; they hang off company_team
  select count(*) into n
    from users u
   where exists (
     select 1 from company_team ct
      where ct.user_id = u.id
        and ct.company_id in (select id from _purge_companies)
   )
     and not exists (
     select 1 from company_team ct2
      where ct2.user_id = u.id
        and ct2.company_id not in (select id from _purge_companies)
   );
  rpt := rpt || format('%-40s %s', 'users (ONLY in purged companies)', n) || E'\n';
  tot := tot + n;

  raise notice E'\n--- ROWS THAT WOULD BE DELETED ---\n%\nTOTAL: %', rpt, tot;
end $$;


-- ===========================================================================
-- PART 2 — THE DELETE. Ends in ROLLBACK. Change to COMMIT deliberately.
-- ===========================================================================
begin;

do $$
declare
  t         record;
  pass      int := 0;
  deleted   bigint;
  pass_total bigint;
  grand     bigint := 0;
begin
  loop
    pass       := pass + 1;
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
        execute format(
          'delete from %I where company_id in (select id from _purge_companies)',
          t.table_name
        );
        get diagnostics deleted = row_count;
        pass_total := pass_total + deleted;
      exception
        when foreign_key_violation then
          -- a child in another table still references these rows; a later
          -- pass will clear the child first. Not an error, just ordering.
          null;
      end;
    end loop;

    grand := grand + pass_total;
    raise notice 'pass % deleted % rows', pass, pass_total;

    exit when pass_total = 0;
    if pass > 25 then
      raise exception 'cleanup did not converge after 25 passes - stop and inspect';
    end if;
  end loop;

  -- Users that belonged ONLY to the purged tenants. A user with any other
  -- membership is left alone.
  delete from users u
   where exists (
     select 1 from company_team ct
      where ct.user_id = u.id
        and ct.company_id in (select id from _purge_companies)
   )
     and not exists (
     select 1 from company_team ct2
      where ct2.user_id = u.id
        and ct2.company_id not in (select id from _purge_companies)
   );
  get diagnostics deleted = row_count;
  raise notice 'deleted % orphaned users', deleted;
  grand := grand + deleted;

  -- Any OTP codes issued to the demo identifiers. These are not company-scoped.
  delete from otp_codes where identifier in ('demo@siteflow.co');
  get diagnostics deleted = row_count;
  raise notice 'deleted % demo otp_codes', deleted;
  grand := grand + deleted;

  delete from companies where id in (select id from _purge_companies);
  get diagnostics deleted = row_count;
  raise notice 'deleted % companies', deleted;
  grand := grand + deleted;

  raise notice 'GRAND TOTAL: % rows', grand;
end $$;


-- ---------------------------------------------------------------------------
-- VERIFY inside the same transaction, before you decide to commit.
-- Every count below must be 0.
-- ---------------------------------------------------------------------------
select
  (select count(*) from companies where id in (select id from _purge_companies))          as companies_left,
  (select count(*) from users where lower(email) = 'demo@siteflow.co')                    as demo_user_left,
  (select count(*) from otp_codes where identifier = 'demo@siteflow.co')                  as demo_otps_left,
  (select count(*) from projects where company_id in (select id from _purge_companies))   as demo_projects_left,
  (select count(*) from companies)                                                        as companies_remaining;


-- CHANGE THIS TO commit; WHEN THE COUNTS ABOVE READ 0 AND YOU ARE READY.
rollback;
