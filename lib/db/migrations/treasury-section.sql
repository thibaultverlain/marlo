-- Tresorerie : solde cash manuel + ventes en attente de credit plateforme

ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS cash_balance DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS cash_updated_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS pending_payouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id),
  label       TEXT NOT NULL,
  amount      DECIMAL(10, 2) NOT NULL,
  platform    TEXT NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS pending_payouts_shop_idx ON pending_payouts(shop_id);

ALTER TABLE pending_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_pending_payouts_access" ON pending_payouts
  FOR ALL USING (
    shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
  );
