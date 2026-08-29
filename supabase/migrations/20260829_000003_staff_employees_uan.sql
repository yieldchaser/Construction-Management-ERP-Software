-- R2-756: Add 12-digit UAN column to staff_employees for EPFO ECR filing
ALTER TABLE staff_employees ADD COLUMN IF NOT EXISTS uan VARCHAR(12);
