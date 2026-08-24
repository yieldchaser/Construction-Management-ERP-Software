-- R2-527: leave_requests.employee_id became mandatory at the API layer; rows
-- created before it existed carry NULL and were previously counted by name
-- only. Backfill each NULL row from its employee_name exactly when that name
-- resolves to ONE staff employee in the same company. Ambiguous duplicate
-- names stay NULL on purpose (the merged balance lookup keeps counting them
-- by name) because guessing an id among duplicates would fabricate data.

UPDATE leave_requests AS lr
SET employee_id = se.id
FROM staff_employees AS se
WHERE lr.employee_id IS NULL
  AND se.company_id = lr.company_id
  AND lower(se.name) = lower(lr.employee_name)
  AND (
        SELECT count(*)
        FROM staff_employees AS s2
        WHERE s2.company_id = lr.company_id
          AND lower(s2.name) = lower(lr.employee_name)
      ) = 1;
