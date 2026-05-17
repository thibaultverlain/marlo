-- ============================================================
-- MIGRATION: Performance indexes
-- Run this in Supabase SQL Editor
-- ============================================================

-- Indexes les plus importants : colonnes filtrees a chaque query

-- Products: filtre par shop + status quasi systematique
CREATE INDEX IF NOT EXISTS products_shop_status_idx ON products(shop_id, status);
CREATE INDEX IF NOT EXISTS products_shop_created_idx ON products(shop_id, created_at DESC);

-- Sales: tri par sold_at, filtre par shop, lookup par product/customer
CREATE INDEX IF NOT EXISTS sales_shop_sold_idx ON sales(shop_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS sales_product_idx ON sales(product_id);
CREATE INDEX IF NOT EXISTS sales_customer_idx ON sales(customer_id);
CREATE INDEX IF NOT EXISTS sales_shipping_status_idx ON sales(shop_id, shipping_status) WHERE shipping_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS sales_payment_status_idx ON sales(shop_id, payment_status);

-- Customers: filtre par shop
CREATE INDEX IF NOT EXISTS customers_shop_idx ON customers(shop_id);

-- Team members: lookup par user_id ultra frequent (auth)
CREATE INDEX IF NOT EXISTS team_members_user_idx ON team_members(user_id);
CREATE INDEX IF NOT EXISTS team_members_shop_idx ON team_members(shop_id);

-- Tasks: tri par due_date, filtre par status
CREATE INDEX IF NOT EXISTS tasks_shop_status_idx ON tasks(shop_id, status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(shop_id, due_date) WHERE due_date IS NOT NULL;

-- Notifications: lookup par user + tri par created_at
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, read);

-- Invoices: filtre par shop
CREATE INDEX IF NOT EXISTS invoices_shop_idx ON invoices(shop_id, created_at DESC);

-- Sourcing requests
CREATE INDEX IF NOT EXISTS sourcing_shop_status_idx ON sourcing_requests(shop_id, status);

-- Personal shopping
CREATE INDEX IF NOT EXISTS ps_missions_shop_status_idx ON personal_shopping_missions(shop_id, status);

-- Activity log: lookup recent par shop
CREATE INDEX IF NOT EXISTS activity_log_shop_created_idx ON activity_log(shop_id, created_at DESC);

-- Returns
CREATE INDEX IF NOT EXISTS returns_sale_idx ON returns(sale_id);

ANALYZE;
