# Audit Marlo — 8 juillet 2026

Audit du code (repo local), du schéma Drizzle, de la base Supabase de production et des déploiements Vercel. Angle : est-ce que Marlo sait piloter le plan 12 mois (1k → 10k €/mois) ?

## Verdict global

Marlo est en bon état. Le schéma est propre, les calculs de marge sont corrects dans leur structure, la tréso a exactement les garde-fous du plan (capital total, ratio d'immobilisation 65 %, budget max d'achat), et l'hygiène des données en base est bonne : 0 produit sans date d'achat, 0 vente sans marge calculée, 0 vente Vestiaire sans frais renseignés. Sur les 9 KPIs de la revue mensuelle, 8 sont sortables aujourd'hui.

Mais il y a un trou fonctionnel qui fausse tes marges, deux biais de calcul, et du nettoyage.

## 1. Le trou : les frais annexes n'existent pas (sévérité haute)

La table `purchases` est prévue pour ça (catégories transport, emballage, outils) et elle est **vide**. Tes allers-retours Paris/Italie pour les ventes privées, l'emballage, le port d'approvisionnement — rien n'est saisi. Conséquences : marges par pièce surestimées, compte de résultat faux, et le vrai coût du canal "ventes privées" est invisible alors que c'est précisément le canal que le plan veut développer.

Le code est déjà prêt (le registre d'achats fusionne `purchases` + achats implicites depuis `products`). C'est un problème de discipline de saisie, pas de code. Règle : chaque dépense liée à l'activité entre dans `purchases` le jour même. Un déplacement Milan à 150 € réparti sur 4 pièces, c'est 37,50 € de marge en moins par pièce — à ton niveau de capital, tu ne peux pas te permettre de ne pas le savoir.

## 2. Biais de calcul

**Rotation calculée sur `created_at`, pas sur `purchase_date`.** Les analytics velocity et les dormants utilisent la date de création de la fiche, pas la date d'achat. Tant que tu saisis le jour de l'achat, ça passe. Le jour où tu saisis en retard, ta rotation est sous-estimée et tes dormants détectés trop tard. Fix trivial : `coalesce(purchase_date, created_at)` dans `sales-analytics.ts` (velocityByColumn, bestSellersByColumn, getTopFastestProducts) et `products.ts` (getDormantProducts, getDormantStats, getStockStats). Toutes tes fiches ont une `purchase_date` — aucun backfill nécessaire.

**Frais Vestiaire approximés à 15 % plat.** `lib/data.ts` ignore les frais de traitement de paiement (historiquement ~3 %) et la grille réelle (frais fixe sous un certain prix, dégressif au-dessus). Vestiaire est ton canal majoritaire : une erreur de 3 % sur chaque vente VC fausse ta marge là où tu vends le plus. Je ne suis pas certain de la grille 2026 — vérifie-la dans ton compte vendeur VC et recale `PLATFORM_FEES`.

## 3. Écarts schéma / base (sévérité basse)

- `orderGroups` est défini dans `schema.ts` mais la table `order_groups` **n'existe pas en base** (vérifié : `to_regclass` renvoie null). Aucun autre fichier ne l'utilise : code mort, à supprimer du schéma.
- `authenticity_checks` existe en base mais a été retirée du code (le commit le disait : DROP manuel à faire). À droper.
- StockX traîne encore dans les enums et `PLATFORM_FEES` alors que tu as arrêté. Inoffensif (l'historique peut en avoir besoin), mais tu peux le retirer du sélecteur de canal à la vente.
- `AGENTS.md` mentionne encore MaisonRoseLin.

## 4. Bug latent : génération de SKU

`getNextSku` fait `count(*) + 1`. Si tu supprimes un produit, le compteur redescend et le prochain SKU peut dupliquer un existant. Il n'y a **pas d'index unique sur `products.sku`** pour te protéger. Fix : index unique sur (shop_id, sku) + compteur séquentiel dans `shop_settings` (comme `invoiceCounter`), ou max(sku) + 1.

## 5. Ce qui manque pour piloter le plan (le seul vrai ajout)

Le plan repose sur deux disciplines mensuelles : réinvestissement 100 % des marges et injection fixe depuis le salaire Leclerc. **Rien dans Marlo ne trace les apports ni les prélèvements.** Le cash est un champ manuel écrasé à chaque mise à jour — aucune traçabilité de la composition du capital (constaté : 984,40 € en base au 3 juillet vs 1 054,40 € annoncé le 8 — écart de 70 € que personne ne peut expliquer, c'est exactement le problème).

Ajout minimal, pas de sur-ingénierie : une table `treasury_movements` (type apport/prélèvement/ajustement, montant, date, note) dont la somme alimente le cash au lieu du champ écrasé manuellement. Ça donne : discipline d'injection vérifiable, écart de caisse détectable, et la courbe de capital du plan traçable mois par mois.

## Priorités proposées

1. Discipline de saisie des frais annexes dans `purchases` — dès aujourd'hui, zéro code.
2. Fix rotation sur `purchase_date` — 30 minutes de code.
3. Recaler les frais Vestiaire sur la grille réelle — 15 minutes après vérification dans ton compte VC.
4. `treasury_movements` — le seul vrai chantier, à faire avant fin T1 pour que les revues mensuelles soient fiables.
5. Nettoyage (orderGroups, authenticity_checks, SKU unique) — en fond de tâche.
