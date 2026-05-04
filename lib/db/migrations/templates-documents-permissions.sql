-- ============================================================
-- MIGRATION: Templates, Documents, Permissions
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add permissions column to team_members
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS permissions TEXT;

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS templates_shop_type_idx ON templates(shop_id, type);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_shop_cat_idx ON documents(shop_id, category);

-- RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_templates_access" ON templates;
CREATE POLICY "team_templates_access" ON templates FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "team_documents_access" ON documents;
CREATE POLICY "team_documents_access" ON documents FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
