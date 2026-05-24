-- Authenticity checks (Chantier 4)

DO $$ BEGIN
  CREATE TYPE authenticity_verdict AS ENUM ('authentique', 'suspect', 'faux', 'non_conclu');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS authenticity_checks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  shop_id        UUID REFERENCES shops(id),
  product_id     UUID REFERENCES products(id),
  brand          TEXT NOT NULL,
  model          TEXT,
  points         JSONB NOT NULL DEFAULT '[]',
  verdict        authenticity_verdict NOT NULL DEFAULT 'non_conclu',
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS authenticity_checks_user_idx ON authenticity_checks(user_id);
CREATE INDEX IF NOT EXISTS authenticity_checks_shop_idx ON authenticity_checks(shop_id);
CREATE INDEX IF NOT EXISTS authenticity_checks_product_idx ON authenticity_checks(product_id);
