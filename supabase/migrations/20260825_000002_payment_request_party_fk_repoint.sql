-- R2-052: payment_requests.party_company_user_id pointed at users(id) while the
-- same-named column on bills/debit_notes/credit_notes/payments references
-- company_team(id). Repoint the constraint to company_team and map legacy rows
-- that carry a login-user id onto that user's company_team row. Guarded and
-- re-runnable; never destructive to data (constraint swap only, with NOTICE +
-- skip when orphaned values would fail the new FK).

DO $$
DECLARE
    fk_name text;
    orphans int;
BEGIN
    -- Legacy rows may store the login user's id where a company_team id now
    -- belongs; remap each onto that user's team row before touching constraints.
    UPDATE payment_requests pr
       SET party_company_user_id = ct.id
      FROM company_team ct
     WHERE ct.user_id = pr.party_company_user_id
       AND NOT EXISTS (
           SELECT 1 FROM company_team t2 WHERE t2.id = pr.party_company_user_id
       );

    -- Drop the mis-pointed FK (whichever name it was created under).
    SELECT conname INTO fk_name
      FROM pg_constraint
     WHERE conrelid = 'payment_requests'::regclass
       AND contype = 'f'
       AND confrelid = 'users'::regclass
     LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE payment_requests DROP CONSTRAINT %I', fk_name);
    END IF;

    SELECT count(*) INTO orphans
      FROM payment_requests pr
     WHERE NOT EXISTS (
         SELECT 1 FROM company_team ct WHERE ct.id = pr.party_company_user_id
     );

    IF orphans > 0 THEN
        RAISE NOTICE 'R2-052: skipping company_team FK on payment_requests: % orphaned party value(s)', orphans;
        RETURN;
    END IF;

    ALTER TABLE payment_requests
        ADD CONSTRAINT fk_payment_requests_party_company_user_id
        FOREIGN KEY (party_company_user_id) REFERENCES company_team(id);
END $$;
