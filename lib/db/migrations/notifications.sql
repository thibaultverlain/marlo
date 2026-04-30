-- ============================================================
-- MIGRATION: Notifications
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_shop_idx ON notifications(shop_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_user_access" ON notifications;
CREATE POLICY "notifications_user_access" ON notifications FOR ALL USING (
  user_id = auth.uid()
);
