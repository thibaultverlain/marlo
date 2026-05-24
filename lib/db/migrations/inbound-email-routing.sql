-- Multi-tenant inbound email routing
-- Chaque shop a une adresse email unique : ventes-{token}@inbound.marlo.app

ALTER TABLE shops ADD COLUMN IF NOT EXISTS inbound_email_token UUID;
UPDATE shops SET inbound_email_token = gen_random_uuid() WHERE inbound_email_token IS NULL;
ALTER TABLE shops ALTER COLUMN inbound_email_token SET NOT NULL;
ALTER TABLE shops ALTER COLUMN inbound_email_token SET DEFAULT gen_random_uuid();
ALTER TABLE shops ADD CONSTRAINT shops_inbound_email_token_key UNIQUE (inbound_email_token);
CREATE INDEX IF NOT EXISTS shops_inbound_email_token_idx ON shops(inbound_email_token);

CREATE TABLE IF NOT EXISTS processed_inbound_emails (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id),
  message_id    TEXT NOT NULL UNIQUE,
  sale_id       UUID,
  received_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS processed_inbound_emails_shop_idx ON processed_inbound_emails(shop_id);
CREATE INDEX IF NOT EXISTS processed_inbound_emails_received_idx ON processed_inbound_emails(received_at DESC);

ALTER TABLE processed_inbound_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_processed_emails_access" ON processed_inbound_emails
  FOR ALL USING (
    shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
  );
