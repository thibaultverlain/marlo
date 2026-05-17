-- ============================================================
-- MIGRATION: Drop payouts tables (feature removed)
-- ============================================================

DROP TABLE IF EXISTS payout_sales CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TYPE IF EXISTS payout_status;
