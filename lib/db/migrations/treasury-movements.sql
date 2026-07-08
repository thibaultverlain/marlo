-- Mouvements de tresorerie : tracabilite de chaque variation du cash.
-- Le solde cash_balance reste la source de lecture, mais toute modification
-- passe desormais par un mouvement (apport, prelevement, encaissement plateforme,
-- ajustement manuel). Permet de verifier la discipline de reinvestissement
-- (injection mensuelle) et de detecter les ecarts de caisse.

CREATE TYPE treasury_movement_type AS ENUM ('apport', 'prelevement', 'encaissement', 'ajustement');

CREATE TABLE IF NOT EXISTS treasury_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id),
  type          treasury_movement_type NOT NULL,
  -- Delta SIGNE applique au solde : apport +, prelevement -, ajustement +/-
  amount        DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2),
  label         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS treasury_movements_shop_idx ON treasury_movements(shop_id, created_at DESC);

ALTER TABLE treasury_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_treasury_movements_access" ON treasury_movements
  FOR ALL USING (
    shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
  );
