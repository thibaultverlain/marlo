-- ============================================================
-- MIGRATION: Payouts, Price History, Returns
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('en_attente', 'recu', 'partiel', 'litige');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE return_status AS ENUM ('en_cours', 'recu', 'rembourse', 'refuse');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payouts
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  expected_amount DECIMAL(10,2) NOT NULL,
  received_amount DECIMAL(10,2),
  expected_date DATE,
  received_date DATE,
  status payout_status NOT NULL DEFAULT 'en_attente',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payouts_shop_status_idx ON payouts(shop_id, status);

-- Payout <-> Sales link
CREATE TABLE IF NOT EXISTS payout_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  UNIQUE(payout_id, sale_id)
);

-- Price history
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2) NOT NULL,
  field TEXT NOT NULL DEFAULT 'target_price',
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);
CREATE INDEX IF NOT EXISTS price_history_product_idx ON price_history(product_id, changed_at DESC);

-- Returns
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id),
  product_id UUID REFERENCES products(id),
  reason TEXT NOT NULL,
  status return_status NOT NULL DEFAULT 'en_cours',
  refund_amount DECIMAL(10,2),
  restock_product BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS returns_shop_status_idx ON returns(shop_id, status);

-- RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_payouts_access" ON payouts;
CREATE POLICY "team_payouts_access" ON payouts FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "team_payout_sales_access" ON payout_sales;
CREATE POLICY "team_payout_sales_access" ON payout_sales FOR ALL USING (
  payout_id IN (SELECT id FROM payouts WHERE shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "team_price_history_access" ON price_history;
CREATE POLICY "team_price_history_access" ON price_history FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "team_returns_access" ON returns;
CREATE POLICY "team_returns_access" ON returns FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
