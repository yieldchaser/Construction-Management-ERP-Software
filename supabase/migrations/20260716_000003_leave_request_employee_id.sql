-- PROMPT_9 / E3: add employee_id FK to leave_requests for collision-proof leave matching.
-- Existing rows keep employee_id = NULL and continue to be matched by employee_name.
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES staff_employees(id) ON DELETE SET NULL;
