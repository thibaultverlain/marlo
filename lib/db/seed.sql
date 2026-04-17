-- Marlo - Fichier de seed pour tester rapidement
-- A exécuter UNE SEULE FOIS dans le SQL Editor de Supabase après avoir fait `drizzle-kit push`

-- ── Shop settings (obligatoire pour émettre des factures) ──
INSERT INTO shop_settings (legal_name, commercial_name, legal_status, siret, ape_code, address, postal_code, city, country, email, phone, vat_subject, vat_rate, invoice_prefix, payment_terms)
VALUES (
  'Dupont Thibault',
  'Marlo Luxury',
  'Micro-entrepreneur (EI)',
  '12345678900012',
  '4771Z',
  '12 rue de Rivoli',
  '75001',
  'Paris',
  'France',
  'contact@marlo.fr',
  '0612345678',
  false,
  '0',
  'F',
  'Paiement comptant'
);

-- ── Customers ──────────────────────────────────────────
INSERT INTO customers (id, first_name, last_name, email, phone, instagram, city, address, preferred_brands, budget_range, vip, notes)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Marie', 'Dupont', 'marie.d@email.com', '0612345678', '@marie_luxe', 'Paris', '45 avenue des Champs-Élysées, 75008 Paris', ARRAY['Chanel', 'Hermès', 'Dior'], '1000-3000', true, 'Préfère WhatsApp. Achète surtout des sacs.'),
  ('22222222-2222-2222-2222-222222222222', 'Lucas', 'Martin', 'lucas.m@email.com', '0698765432', '@lucas.snkrs', 'Lyon', '12 rue de la République, 69002 Lyon', ARRAY['Jordan', 'Nike', 'Yeezy'], '300-800', true, 'Sneakerhead, connait très bien les tailles US/EU.'),
  ('33333333-3333-3333-3333-333333333333', 'Sophie', 'Bertrand', 'sophie.b@email.com', NULL, '@sophie_vintage', 'Bordeaux', '8 cours Pasteur, 33000 Bordeaux', ARRAY['Louis Vuitton', 'Gucci'], '500-1500', false, NULL);

-- ── Products ──────────────────────────────────────────
INSERT INTO products (sku, title, brand, model, category, size, color, condition, purchase_price, target_price, purchase_source, purchase_date, status, listed_on, created_at)
VALUES
  ('MAR-0001', 'Chanel Classic Flap Medium Noir', 'Chanel', 'Classic Flap', 'sacs', 'Medium', 'Noir', 'tres_bon', 2800, 4200, 'Vente privée', CURRENT_DATE - 15, 'en_vente', ARRAY['vestiaire'], NOW() - INTERVAL '15 days'),
  ('MAR-0002', 'Nike Air Jordan 1 Retro High Chicago', 'Jordan', 'Air Jordan 1', 'chaussures', '42', 'Rouge/Blanc/Noir', 'neuf_avec_etiquettes', 180, 350, 'StockX achat', CURRENT_DATE - 10, 'reserve', ARRAY['stockx'], NOW() - INTERVAL '10 days'),
  ('MAR-0003', 'Hermès Birkin 25 Gold Togo', 'Hermès', 'Birkin', 'sacs', '25', 'Gold', 'tres_bon', 7500, 9800, 'Particulier', CURRENT_DATE - 45, 'en_vente', ARRAY['vestiaire', 'prive'], NOW() - INTERVAL '45 days'),
  ('MAR-0004', 'Louis Vuitton Pochette Métis Monogram', 'Louis Vuitton', 'Pochette Métis', 'sacs', NULL, 'Monogram', 'comme_neuf', 750, 1100, 'Friperie', CURRENT_DATE - 5, 'en_vente', ARRAY['vinted', 'vestiaire'], NOW() - INTERVAL '5 days'),
  ('MAR-0005', 'Dior Book Tote Medium Oblique', 'Dior', 'Book Tote', 'sacs', 'Medium', 'Bleu', 'comme_neuf', 1600, 2200, 'Vente privée', CURRENT_DATE - 20, 'vendu', ARRAY[]::text[], NOW() - INTERVAL '20 days'),
  ('MAR-0006', 'Sandro Blazer laine noir', 'Sandro', 'Classic Blazer', 'vetements', 'M', 'Noir', 'bon', 45, 85, 'Vinted', CURRENT_DATE - 8, 'en_vente', ARRAY['vinted'], NOW() - INTERVAL '8 days'),
  ('MAR-0007', 'Nike Dunk Low Panda', 'Nike', 'Dunk Low', 'chaussures', '41', 'Noir/Blanc', 'comme_neuf', 90, 160, 'StockX', CURRENT_DATE - 12, 'vendu', ARRAY[]::text[], NOW() - INTERVAL '12 days'),
  ('MAR-0008', 'LV Neverfull MM Damier', 'Louis Vuitton', 'Neverfull', 'sacs', 'MM', 'Damier Ebène', 'tres_bon', 900, 1400, 'Vinted Pro', CURRENT_DATE - 3, 'vendu', ARRAY[]::text[], NOW() - INTERVAL '3 days');

-- ── Sales ─────────────────────────────────────────────
INSERT INTO sales (product_id, customer_id, channel, sale_price, platform_fees, shipping_cost, shipping_paid_by, net_revenue, margin, margin_pct, payment_method, payment_status, sold_at)
SELECT id, '22222222-2222-2222-2222-222222222222', 'prive', 2200, 0, 0, 'acheteur', 2200, 600, 37.5, 'virement', 'recu', NOW() - INTERVAL '20 days'
FROM products WHERE sku = 'MAR-0005';

INSERT INTO sales (product_id, customer_id, channel, sale_price, platform_fees, shipping_cost, shipping_paid_by, net_revenue, margin, margin_pct, payment_method, payment_status, sold_at)
SELECT id, NULL, 'stockx', 160, 20, 0, 'acheteur', 140, 50, 55.6, 'plateforme', 'recu', NOW() - INTERVAL '12 days'
FROM products WHERE sku = 'MAR-0007';

INSERT INTO sales (product_id, customer_id, channel, sale_price, platform_fees, shipping_cost, shipping_paid_by, net_revenue, margin, margin_pct, payment_method, payment_status, shipping_status, sold_at)
SELECT id, '33333333-3333-3333-3333-333333333333', 'vinted', 1400, 0, 0, 'acheteur', 1400, 500, 55.6, 'plateforme', 'recu', 'a_expedier', NOW() - INTERVAL '3 days'
FROM products WHERE sku = 'MAR-0008';

UPDATE customers SET total_spent = 2200, total_orders = 1, last_purchase_at = NOW() - INTERVAL '20 days' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE customers SET total_spent = 1400, total_orders = 1, last_purchase_at = NOW() - INTERVAL '3 days' WHERE id = '33333333-3333-3333-3333-333333333333';

-- ── Sourcing requests ─────────────────────────────────
INSERT INTO sourcing_requests (customer_id, description, brand, model, target_budget, commission_rate, status, deadline, notes)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Birkin 25 Gold Togo', 'Hermès', 'Birkin 25', 10000, 0.15, 'en_recherche', CURRENT_DATE + 20, 'Cliente prête à monter à 11000€ si pièce exceptionnelle'),
  ('22222222-2222-2222-2222-222222222222', 'Jordan 1 Travis Scott Mocha', 'Jordan', 'Air Jordan 1 Travis Scott', 500, 0.10, 'ouvert', CURRENT_DATE + 5, 'Taille 43 impérative');
