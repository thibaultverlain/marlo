-- ============================================================
-- MIGRATION: Team Management (Phase B)
-- Run this in Supabase SQL Editor BEFORE running drizzle-kit push
-- ============================================================

-- 1. Create new enums
DO $$ BEGIN
  CREATE TYPE team_role AS ENUM ('owner', 'manager', 'seller');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create shops table
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role team_role NOT NULL DEFAULT 'seller',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS team_members_shop_user_idx ON team_members(shop_id, user_id);

-- 4. Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'seller',
  invited_by UUID NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_shop_created_idx ON activity_log(shop_id, created_at DESC);

-- 6. Add shop_id column to all existing data tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);
ALTER TABLE sourcing_requests ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);
ALTER TABLE personal_shopping_missions ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);
ALTER TABLE ps_items ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);

-- 7. Auto-migrate existing data: create a shop for each unique user_id and assign
-- This handles backward compatibility for existing single-user data
DO $$
DECLARE
  r RECORD;
  new_shop_id UUID;
BEGIN
  -- Find all distinct user_ids that have data but no shop
  FOR r IN
    SELECT DISTINCT user_id FROM products WHERE shop_id IS NULL
    UNION
    SELECT DISTINCT user_id FROM sales WHERE shop_id IS NULL
    UNION
    SELECT DISTINCT user_id FROM customers WHERE shop_id IS NULL
  LOOP
    -- Check if this user already has a shop
    SELECT s.id INTO new_shop_id
    FROM shops s
    INNER JOIN team_members tm ON tm.shop_id = s.id
    WHERE tm.user_id = r.user_id
    LIMIT 1;

    -- Create shop if none exists
    IF new_shop_id IS NULL THEN
      INSERT INTO shops (name, owner_id) VALUES ('Ma boutique', r.user_id)
      RETURNING id INTO new_shop_id;

      INSERT INTO team_members (shop_id, user_id, role)
      VALUES (new_shop_id, r.user_id, 'owner');
    END IF;

    -- Update all tables for this user
    UPDATE products SET shop_id = new_shop_id WHERE user_id = r.user_id AND shop_id IS NULL;
    UPDATE sales SET shop_id = new_shop_id WHERE user_id = r.user_id AND shop_id IS NULL;
    UPDATE customers SET shop_id = new_shop_id WHERE user_id = r.user_id AND shop_id IS NULL;
    UPDATE invoices SET shop_id = new_shop_id WHERE user_id = r.user_id AND shop_id IS NULL;
    UPDATE sourcing_requests SET shop_id = new_shop_id WHERE user_id = r.user_id AND shop_id IS NULL;
    UPDATE personal_shopping_missions SET shop_id = new_shop_id WHERE user_id = r.user_id AND shop_id IS NULL;
    UPDATE ps_items SET shop_id = new_shop_id WHERE user_id = r.user_id AND shop_id IS NULL;
    UPDATE purchases SET shop_id = new_shop_id WHERE user_id = r.user_id AND shop_id IS NULL;
    UPDATE shop_settings SET shop_id = new_shop_id WHERE user_id = r.user_id AND shop_id IS NULL;
  END LOOP;
END $$;

-- 8. Add indexes for shop_id queries
CREATE INDEX IF NOT EXISTS products_shop_id_idx ON products(shop_id);
CREATE INDEX IF NOT EXISTS sales_shop_id_idx ON sales(shop_id);
CREATE INDEX IF NOT EXISTS customers_shop_id_idx ON customers(shop_id);
CREATE INDEX IF NOT EXISTS invoices_shop_id_idx ON invoices(shop_id);
CREATE INDEX IF NOT EXISTS sourcing_requests_shop_id_idx ON sourcing_requests(shop_id);

-- 9. RLS policies for team-based access
-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_shopping_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (clean slate)
DROP POLICY IF EXISTS "team_products_access" ON products;
DROP POLICY IF EXISTS "team_sales_access" ON sales;
DROP POLICY IF EXISTS "team_customers_access" ON customers;
DROP POLICY IF EXISTS "team_invoices_access" ON invoices;
DROP POLICY IF EXISTS "team_sourcing_access" ON sourcing_requests;
DROP POLICY IF EXISTS "team_ps_missions_access" ON personal_shopping_missions;
DROP POLICY IF EXISTS "team_ps_items_access" ON ps_items;
DROP POLICY IF EXISTS "team_purchases_access" ON purchases;
DROP POLICY IF EXISTS "team_shop_settings_access" ON shop_settings;
DROP POLICY IF EXISTS "team_shops_access" ON shops;
DROP POLICY IF EXISTS "team_members_access" ON team_members;
DROP POLICY IF EXISTS "team_invitations_access" ON team_invitations;
DROP POLICY IF EXISTS "team_activity_access" ON activity_log;

-- Team-based RLS: a user can access data in any shop they belong to
CREATE POLICY "team_products_access" ON products FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_sales_access" ON sales FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_customers_access" ON customers FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_invoices_access" ON invoices FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_sourcing_access" ON sourcing_requests FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_ps_missions_access" ON personal_shopping_missions FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_ps_items_access" ON ps_items FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_purchases_access" ON purchases FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_shop_settings_access" ON shop_settings FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_shops_access" ON shops FOR ALL USING (
  id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_members_access" ON team_members FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_invitations_access" ON team_invitations FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "team_activity_access" ON activity_log FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
