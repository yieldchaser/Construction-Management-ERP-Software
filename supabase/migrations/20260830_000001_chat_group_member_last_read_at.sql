-- R2-765: persist chat read watermark in ChatGroupMember.last_read_at
-- Additive column, nullable, no backfill needed.
-- NULL means "never read" — identical to the current treatment of a
-- missing entry in the now-deleted in-memory dict.
ALTER TABLE chat_group_members
    ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NULL;
