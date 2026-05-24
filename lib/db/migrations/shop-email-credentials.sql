-- Stockage des credentials IMAP par shop (mots de passe chiffres AES-256-GCM cote app)

CREATE TABLE IF NOT EXISTS shop_email_credentials (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                  UUID NOT NULL REFERENCES shops(id) UNIQUE,
  imap_host                TEXT NOT NULL,
  imap_port                INTEGER NOT NULL DEFAULT 993,
  imap_use_tls             BOOLEAN NOT NULL DEFAULT TRUE,
  imap_username            TEXT NOT NULL,
  imap_password_encrypted  TEXT NOT NULL,
  imap_folder              TEXT NOT NULL DEFAULT 'INBOX',
  active                   BOOLEAN NOT NULL DEFAULT TRUE,
  last_poll_at             TIMESTAMP WITH TIME ZONE,
  last_poll_status         TEXT,
  last_error               TEXT,
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS shop_email_credentials_active_idx ON shop_email_credentials(active) WHERE active = TRUE;

ALTER TABLE shop_email_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_email_credentials_access" ON shop_email_credentials
  FOR ALL USING (
    shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
  );
