-- Party IDs must be unique within a company.
--
-- next_party_id_custom() has a collision loop, but a supplied party_id_custom
-- was stored unchecked and two concurrent creates could still pick the same
-- candidate. AK Construction ended up with two parties both showing PID-2.
--
-- Renumber any existing duplicates before adding the index, keeping the oldest
-- row's ID and giving later ones the next free number. Parties with no ID at
-- all are left alone; the partial index ignores NULLs.
DO $$
DECLARE
    dup RECORD;
    candidate text;
    n integer;
BEGIN
    FOR dup IN
        SELECT id, company_id, party_id_custom
        FROM (
            SELECT id, company_id, party_id_custom,
                   ROW_NUMBER() OVER (
                       PARTITION BY company_id, party_id_custom
                       ORDER BY created_at, id
                   ) AS rn
            FROM library_parties
            WHERE party_id_custom IS NOT NULL AND party_id_custom <> ''
        ) ranked
        WHERE rn > 1
    LOOP
        SELECT COUNT(*) INTO n FROM library_parties WHERE company_id = dup.company_id;
        LOOP
            n := n + 1;
            candidate := 'PID-' || n;
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM library_parties
                WHERE company_id = dup.company_id AND party_id_custom = candidate
            );
        END LOOP;
        UPDATE library_parties SET party_id_custom = candidate WHERE id = dup.id;
        RAISE NOTICE 'library_parties: % renumbered % -> %', dup.id, dup.party_id_custom, candidate;
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS library_parties_company_party_id_uniq
    ON library_parties (company_id, party_id_custom)
    WHERE party_id_custom IS NOT NULL AND party_id_custom <> '';
