-- Derogation vente privee (decision du 27/07/2026).
-- Tant que vp_mode_until est dans le futur, le seuil d'immobilisation du capital
-- passe de 65% a 80%. Justification : en VP les pieces sont achetees a -70/-80%
-- du prix boutique, rotation rapide et forte marge — le garde-fou anti-sur-stockage
-- se retournerait contre son objectif en bloquant la meilleure opportunite de
-- marge de l'annee. Contrepartie : duree limitee (60 j max), retour automatique
-- a 65%, et la regle des 30% max sur une seule piece reste absolue.

ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS vp_mode_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS vp_mode_label TEXT;
