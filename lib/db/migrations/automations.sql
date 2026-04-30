-- ============================================================
-- MIGRATION: Automations
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  trigger_value TEXT,
  action TEXT NOT NULL,
  action_value TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automations_shop_trigger_idx ON automations(shop_id, trigger, enabled);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_automations_access" ON automations;
CREATE POLICY "team_automations_access" ON automations FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
