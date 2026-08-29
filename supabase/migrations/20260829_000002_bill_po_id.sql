-- R2-371: bills.po_id -- the purchase order a bill is raised against.
--
-- Problem: Bill carries wo_id (subcontractor work orders) and match_id, but no
--   purchase-order reference. Billed-vs-ordered was therefore uncomputable for
--   materials and over-invoicing against a PO was structurally undetectable --
--   a vendor could bill far more than the PO committed and no query in the
--   product could relate the two documents. The only indirect path,
--   Bill.match_id -> ThreeWayMatch.po_id, was empty in practice: of 7 purchase
--   bills in production, zero carried a match_id.
--
-- Fix shape (as filed): a nullable FK with ON DELETE SET NULL, populated when a
--   bill is raised against a PO, plus a derived cumulative-billed check at bill
--   creation (implemented in billing.create_bill, mirroring the wo_id ceiling
--   added by R2-253).
--
-- Schema-additive: one nullable column and one index. Existing rows keep NULL,
--   which the application treats as "not raised against a PO" -- nothing is
--   backfilled and no value is invented.
--
-- Replay-safe: IF NOT EXISTS on both objects.
-- ==============================================================================

ALTER TABLE bills
    ADD COLUMN IF NOT EXISTS po_id UUID
    REFERENCES purchase_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_bills_po_id ON bills (po_id);
