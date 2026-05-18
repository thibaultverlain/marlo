-- ============================================================
-- MIGRATION: Drop returns table (feature integrated into sale detail)
-- ============================================================

DROP TABLE IF EXISTS returns CASCADE;
DROP TYPE IF EXISTS return_status;
