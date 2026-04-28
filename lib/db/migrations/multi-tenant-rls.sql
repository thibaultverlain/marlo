-- ============================================
-- MARLO - Multi-tenant migration + RLS
-- Run in Supabase SQL Editor
-- ============================================

-- Step 1: Add user_id columns (if not already present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'user_id') THEN
    ALTER TABLE products ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'user_id') THEN
    ALTER TABLE sales ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'user_id') THEN
    ALTER TABLE customers ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'user_id') THEN
    ALTER TABLE invoices ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sourcing_requests' AND column_name = 'user_id') THEN
    ALTER TABLE sourcing_requests ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_shopping_missions' AND column_name = 'user_id') THEN
    ALTER TABLE personal_shopping_missions ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ps_items' AND column_name = 'user_id') THEN
    ALTER TABLE ps_items ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'user_id') THEN
    ALTER TABLE purchases ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'user_id') THEN
    ALTER TABLE shop_settings ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Step 2: Backfill existing data with YOUR user_id
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from Supabase Auth > Users
-- Example: UPDATE products SET user_id = 'a1b2c3d4-...' WHERE user_id IS NULL;

-- IMPORTANT: Uncomment and run these lines after replacing the UUID:
-- UPDATE products SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE sales SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE customers SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE invoices SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE sourcing_requests SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE personal_shopping_missions SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE ps_items SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE purchases SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE shop_settings SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL (only after backfill!)
-- Uncomment after running the UPDATE statements above:
-- ALTER TABLE products ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE sales ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE customers ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE sourcing_requests ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE personal_shopping_missions ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE ps_items ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE purchases ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE shop_settings ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_shopping_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Each user can only SELECT, INSERT, UPDATE, DELETE their own rows

-- Products
DROP POLICY IF EXISTS "Users see own products" ON products;
CREATE POLICY "Users see own products" ON products FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own products" ON products;
CREATE POLICY "Users insert own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own products" ON products;
CREATE POLICY "Users update own products" ON products FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own products" ON products;
CREATE POLICY "Users delete own products" ON products FOR DELETE USING (auth.uid() = user_id);

-- Sales
DROP POLICY IF EXISTS "Users see own sales" ON sales;
CREATE POLICY "Users see own sales" ON sales FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own sales" ON sales;
CREATE POLICY "Users insert own sales" ON sales FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own sales" ON sales;
CREATE POLICY "Users update own sales" ON sales FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own sales" ON sales;
CREATE POLICY "Users delete own sales" ON sales FOR DELETE USING (auth.uid() = user_id);

-- Customers
DROP POLICY IF EXISTS "Users see own customers" ON customers;
CREATE POLICY "Users see own customers" ON customers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own customers" ON customers;
CREATE POLICY "Users insert own customers" ON customers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own customers" ON customers;
CREATE POLICY "Users update own customers" ON customers FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own customers" ON customers;
CREATE POLICY "Users delete own customers" ON customers FOR DELETE USING (auth.uid() = user_id);

-- Invoices
DROP POLICY IF EXISTS "Users see own invoices" ON invoices;
CREATE POLICY "Users see own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own invoices" ON invoices;
CREATE POLICY "Users insert own invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own invoices" ON invoices;
CREATE POLICY "Users update own invoices" ON invoices FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own invoices" ON invoices;
CREATE POLICY "Users delete own invoices" ON invoices FOR DELETE USING (auth.uid() = user_id);

-- Sourcing requests
DROP POLICY IF EXISTS "Users see own sourcing" ON sourcing_requests;
CREATE POLICY "Users see own sourcing" ON sourcing_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own sourcing" ON sourcing_requests;
CREATE POLICY "Users insert own sourcing" ON sourcing_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own sourcing" ON sourcing_requests;
CREATE POLICY "Users update own sourcing" ON sourcing_requests FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own sourcing" ON sourcing_requests;
CREATE POLICY "Users delete own sourcing" ON sourcing_requests FOR DELETE USING (auth.uid() = user_id);

-- Personal shopping missions
DROP POLICY IF EXISTS "Users see own PS missions" ON personal_shopping_missions;
CREATE POLICY "Users see own PS missions" ON personal_shopping_missions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own PS missions" ON personal_shopping_missions;
CREATE POLICY "Users insert own PS missions" ON personal_shopping_missions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own PS missions" ON personal_shopping_missions;
CREATE POLICY "Users update own PS missions" ON personal_shopping_missions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own PS missions" ON personal_shopping_missions;
CREATE POLICY "Users delete own PS missions" ON personal_shopping_missions FOR DELETE USING (auth.uid() = user_id);

-- PS items
DROP POLICY IF EXISTS "Users see own PS items" ON ps_items;
CREATE POLICY "Users see own PS items" ON ps_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own PS items" ON ps_items;
CREATE POLICY "Users insert own PS items" ON ps_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own PS items" ON ps_items;
CREATE POLICY "Users update own PS items" ON ps_items FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own PS items" ON ps_items;
CREATE POLICY "Users delete own PS items" ON ps_items FOR DELETE USING (auth.uid() = user_id);

-- Purchases
DROP POLICY IF EXISTS "Users see own purchases" ON purchases;
CREATE POLICY "Users see own purchases" ON purchases FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own purchases" ON purchases;
CREATE POLICY "Users insert own purchases" ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own purchases" ON purchases;
CREATE POLICY "Users update own purchases" ON purchases FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own purchases" ON purchases;
CREATE POLICY "Users delete own purchases" ON purchases FOR DELETE USING (auth.uid() = user_id);

-- Shop settings
DROP POLICY IF EXISTS "Users see own settings" ON shop_settings;
CREATE POLICY "Users see own settings" ON shop_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own settings" ON shop_settings;
CREATE POLICY "Users insert own settings" ON shop_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own settings" ON shop_settings;
CREATE POLICY "Users update own settings" ON shop_settings FOR UPDATE USING (auth.uid() = user_id);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_user_id ON sourcing_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ps_missions_user_id ON personal_shopping_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_ps_items_user_id ON ps_items(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_settings_user_id ON shop_settings(user_id);

-- DONE!
-- After running this:
-- 1. Find your user ID in Supabase > Auth > Users
-- 2. Uncomment and run Step 2 (UPDATE statements) with your UUID
-- 3. Uncomment and run Step 3 (ALTER TABLE NOT NULL)
-- 4. Deploy updated web app code
-- 5. Run drizzle-kit push
