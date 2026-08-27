-- Additive: face_recognition_logs had no timestamp column; legacy rows stay NULL
-- (no false time stamped on records whose creation time is unknowable).
ALTER TABLE face_recognition_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
