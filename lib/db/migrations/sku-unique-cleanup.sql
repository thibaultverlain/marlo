-- Audit 2026-07 : garde-fou SKU + nettoyage
-- 1. Index unique (shop_id, sku) : protege contre les doublons de SKU
--    (getNextSku faisait count+1, vulnerable apres suppression ; passe en max+1,
--    l'index est la ceinture de securite).
-- 2. DROP authenticity_checks : module supprime du code, table vide restee en base.

CREATE UNIQUE INDEX IF NOT EXISTS products_shop_sku_idx ON products (shop_id, sku);

DROP TABLE IF EXISTS authenticity_checks;
DROP TYPE IF EXISTS authenticity_verdict;
