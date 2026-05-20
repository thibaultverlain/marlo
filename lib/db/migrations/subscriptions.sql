-- ============================================================
-- MIGRATION: Shop subscriptions (Stripe integration)
-- ============================================================

CREATE TYPE IF NOT EXISTS subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete'
);

CREATE TYPE IF NOT EXISTS subscription_plan AS ENUM (
  'mensuel',
  'annuel'
);

CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status subscription_status NOT NULL DEFAULT 'trialing',
  plan subscription_plan,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT shop_subscriptions_shop_id_unique UNIQUE (shop_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_shop_id ON shop_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_status ON shop_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_trial_ends ON shop_subscriptions(trial_ends_at) WHERE status = 'trialing';
CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_customer ON shop_subscriptions(stripe_customer_id);

-- RLS
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY shop_subscriptions_select ON shop_subscriptions
  FOR SELECT USING (
    shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
  );

-- Only service role can modify (webhooks)
CREATE POLICY shop_subscriptions_modify ON shop_subscriptions
  FOR ALL USING (false);

-- ============================================================
-- Init subscriptions for existing shops (start trial NOW)
-- ============================================================
INSERT INTO shop_subscriptions (shop_id, status, trial_ends_at)
SELECT id, 'trialing', NOW() + INTERVAL '14 days'
FROM shops
WHERE id NOT IN (SELECT shop_id FROM shop_subscriptions);
