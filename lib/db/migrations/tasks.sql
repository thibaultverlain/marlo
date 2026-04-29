-- ============================================================
-- MIGRATION: Tasks & Notifications
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('a_faire', 'en_cours', 'fait');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('haute', 'normale', 'basse');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  assigned_to UUID,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'a_faire',
  priority task_priority NOT NULL DEFAULT 'normale',
  related_entity TEXT,
  related_entity_id UUID,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_shop_status_idx ON tasks(shop_id, status);
CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON tasks(assigned_to, status);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_tasks_access" ON tasks;
CREATE POLICY "team_tasks_access" ON tasks FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
