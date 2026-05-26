-- Champs additionnels pour le generateur d'annonces premium
-- Permet d'envoyer au LLM toutes les infos structurees du prompt :
-- matiere, mesures, pays de fabrication, prix boutique, details signature,
-- mots-cles, sous-categorie, presence de facture.

ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_invoice BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS country_of_origin TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS measurements JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS signature_details TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS keywords TEXT[];
