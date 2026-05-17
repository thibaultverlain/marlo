-- ============================================================
-- MIGRATION: Drop unused automations table (OPTIONAL)
-- The feature was removed from the app.
-- Run this AFTER you've confirmed the new deploy works correctly.
-- ============================================================

DROP TABLE IF EXISTS automations CASCADE;
