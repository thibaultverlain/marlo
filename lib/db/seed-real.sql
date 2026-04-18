-- Marlo - Import des vraies données de Thibault
-- Exécuter dans Supabase SQL Editor
-- Supprime d'abord les données existantes :

DELETE FROM sales;
DELETE FROM invoices;
DELETE FROM sourcing_requests;
DELETE FROM ps_items;
DELETE FROM personal_shopping_missions;
DELETE FROM purchases;
DELETE FROM products;
DELETE FROM customers;

-- ── Produits ──────────────────────────────────────────
-- purchase_price = Prix TTC (prix achat + frais)

INSERT INTO products (id, sku, title, brand, model, category, condition, purchase_price, purchase_source, purchase_date, status, listed_on, created_at) VALUES
('a0000001-0001-0001-0001-000000000001', 'MAR-0001', 'Gucci mocassins en cuir Jordaan', 'Gucci', 'Jordaan', 'chaussures', 'tres_bon', 230.84, 'Vinted', '2026-02-20', 'vendu', ARRAY[]::text[], '2026-02-20'),
('a0000001-0001-0001-0001-000000000002', 'MAR-0002', 'Sac Louis Vuitton Alma PM cuir Épi', 'Louis Vuitton', 'Alma PM', 'sacs', 'tres_bon', 335.49, 'Vinted', '2025-12-06', 'vendu', ARRAY[]::text[], '2025-12-06'),
('a0000001-0001-0001-0001-000000000003', 'MAR-0003', 'Gucci écharpe en laine', 'Gucci', 'Écharpe laine', 'accessoires', 'tres_bon', 0, 'Revendeur', '2026-01-06', 'vendu', ARRAY[]::text[], '2026-01-06'),
('a0000001-0001-0001-0001-000000000004', 'MAR-0004', 'Gucci écharpe en laine', 'Gucci', 'Écharpe laine', 'accessoires', 'tres_bon', 170, 'Revendeur', '2026-01-20', 'vendu', ARRAY[]::text[], '2026-01-20'),
('a0000001-0001-0001-0001-000000000005', 'MAR-0005', 'Gucci écharpe en laine', 'Gucci', 'Écharpe laine', 'accessoires', 'tres_bon', 129.97, 'Vinted', '2026-01-06', 'vendu', ARRAY[]::text[], '2026-01-06'),
('a0000001-0001-0001-0001-000000000006', 'MAR-0006', 'Gucci X Adidas mocassins en cuir', 'Gucci X Adidas', 'Mocassins', 'chaussures', 'tres_bon', 244.56, 'Vinted', '2026-02-06', 'vendu', ARRAY[]::text[], '2026-02-06'),
('a0000001-0001-0001-0001-000000000007', 'MAR-0007', 'Balenciaga crocs boot', 'Balenciaga', 'Crocs Boot', 'chaussures', 'tres_bon', 217.05, 'Vinted', '2026-02-23', 'vendu', ARRAY[]::text[], '2026-02-23'),
('a0000001-0001-0001-0001-000000000008', 'MAR-0008', 'Tong Gucci Double G', 'Gucci', 'Tong Double G', 'chaussures', 'tres_bon', 97.69, 'Vinted', '2026-02-23', 'vendu', ARRAY[]::text[], '2026-02-23'),
('a0000001-0001-0001-0001-000000000009', 'MAR-0009', 'Bottega Veneta Stride Lace-Up Boots Noir', 'Bottega Veneta', 'Stride', 'chaussures', 'tres_bon', 105.94, 'Vinted', '2026-02-16', 'en_stock', ARRAY[]::text[], '2026-02-16'),
('a0000001-0001-0001-0001-000000000010', 'MAR-0010', 'Gucci Grip Quartz Argenté Vert foncé 38mm', 'Gucci', 'Grip', 'montres', 'tres_bon', 300, 'Revendeur', '2026-02-25', 'vendu', ARRAY[]::text[], '2026-02-25'),
('a0000001-0001-0001-0001-000000000011', 'MAR-0011', 'Gucci Princetown mules toile GG', 'Gucci', 'Princetown', 'chaussures', 'tres_bon', 198.50, 'Vinted', '2026-01-09', 'vendu', ARRAY[]::text[], '2026-01-09'),
('a0000001-0001-0001-0001-000000000012', 'MAR-0012', 'Balenciaga Track Rouge', 'Balenciaga', 'Track', 'chaussures', 'tres_bon', 200, 'Revendeur', '2026-03-09', 'vendu', ARRAY[]::text[], '2026-03-09'),
('a0000001-0001-0001-0001-000000000013', 'MAR-0013', 'Hermès foulard bandana In The Mountain', 'Hermès', 'Foulard', 'accessoires', 'tres_bon', 118.75, 'Vinted', '2026-03-20', 'vendu', ARRAY[]::text[], '2026-03-20'),
('a0000001-0001-0001-0001-000000000014', 'MAR-0014', 'Balenciaga crocs boot rose', 'Balenciaga', 'Crocs Boot', 'chaussures', 'tres_bon', 99.85, 'Vinted', '2026-03-28', 'en_stock', ARRAY[]::text[], '2026-03-28');

-- ── Ventes ────────────────────────────────────────────
-- CA = sale_price (prix brut affiché)
-- net_revenue = sale_price - platform_fees
-- margin = net_revenue - purchase_price
-- margin_pct = (margin / sale_price) * 100  (marge sur vente, pas sur achat)

INSERT INTO sales (product_id, channel, sale_price, platform_fees, shipping_cost, shipping_paid_by, net_revenue, margin, margin_pct, payment_method, payment_status, shipping_status, sold_at) VALUES
-- Fév 2026
('a0000001-0001-0001-0001-000000000005', 'vestiaire', 191.30, 28.69, 0, 'acheteur', 162.61, 32.64, 17.06, 'plateforme', 'recu', 'livre', '2026-02-02'),
('a0000001-0001-0001-0001-000000000003', 'vestiaire', 195.00, 29.25, 0, 'acheteur', 165.75, 165.75, 84.99, 'plateforme', 'recu', 'livre', '2026-02-03'),
('a0000001-0001-0001-0001-000000000004', 'vestiaire', 212.00, 31.80, 0, 'acheteur', 180.20, 10.20, 4.81, 'plateforme', 'recu', 'livre', '2026-02-05'),
('a0000001-0001-0001-0001-000000000002', 'vinted', 250.00, 0.00, 0, 'acheteur', 250.00, -85.49, -34.20, 'plateforme', 'recu', 'livre', '2026-02-06'),
('a0000001-0001-0001-0001-000000000006', 'vestiaire', 335.00, 50.25, 0, 'acheteur', 284.75, 40.19, 12.00, 'plateforme', 'recu', 'livre', '2026-02-12'),
('a0000001-0001-0001-0001-000000000001', 'vestiaire', 330.00, 49.50, 0, 'acheteur', 280.50, 49.66, 15.05, 'plateforme', 'recu', 'livre', '2026-02-26'),
-- Mars 2026
('a0000001-0001-0001-0001-000000000010', 'vestiaire', 389.00, 58.35, 0, 'acheteur', 330.65, 30.65, 7.88, 'plateforme', 'recu', 'livre', '2026-03-10'),
('a0000001-0001-0001-0001-000000000008', 'vestiaire', 145.00, 21.75, 0, 'acheteur', 123.25, 25.56, 17.63, 'plateforme', 'recu', 'livre', '2026-03-15'),
('a0000001-0001-0001-0001-000000000012', 'vestiaire', 336.52, 50.48, 0, 'acheteur', 286.04, 86.04, 25.57, 'plateforme', 'recu', 'livre', '2026-03-16'),
('a0000001-0001-0001-0001-000000000007', 'vestiaire', 300.00, 45.00, 0, 'acheteur', 255.00, 37.95, 12.65, 'plateforme', 'recu', 'livre', '2026-03-23'),
('a0000001-0001-0001-0001-000000000013', 'vestiaire', 205.00, 30.75, 0, 'acheteur', 174.25, 55.50, 27.07, 'plateforme', 'recu', 'livre', '2026-03-31'),
-- Avril 2026
('a0000001-0001-0001-0001-000000000011', 'vestiaire', 260.87, 39.13, 0, 'acheteur', 221.74, 23.24, 8.91, 'plateforme', 'recu', 'livre', '2026-04-01');

-- Résumé attendu :
-- CA total (sum sale_price) : 3 149,69 €
-- Frais total : 434,95 €
-- Net total : 2 714,74 €
-- Marge totale : 471,89 €
-- Février : CA 1 513,30 € | Marge 212,95 € | 6 ventes
-- Mars : CA 1 375,52 € | Marge 235,70 € | 5 ventes
-- Avril : CA 260,87 € | Marge 23,24 € | 1 vente
