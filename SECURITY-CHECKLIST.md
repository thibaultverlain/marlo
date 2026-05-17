# CHECKLIST SECURITE & INFRA MARLO

Coche au fur et a mesure. Toutes ces verifications se font en quelques clics.

## SUPABASE

### 1. Verifier que toutes les tables ont RLS active

Va dans **Authentication > Policies**.

Pour chaque table de cette liste, verifie qu'il y a une coche verte "RLS enabled" :
- [ ] shops
- [ ] team_members
- [ ] team_invitations
- [ ] activity_log
- [ ] products
- [ ] sales
- [ ] customers
- [ ] invoices
- [ ] sourcing_requests
- [ ] personal_shopping_missions
- [ ] ps_items
- [ ] purchases
- [ ] shop_settings
- [ ] tasks
- [ ] notifications
- [ ] templates
- [ ] documents
- [ ] payouts
- [ ] payout_sales
- [ ] price_history
- [ ] returns

Si une table n'a PAS RLS active, clique dessus et active-la. Ensuite execute dans SQL Editor :

```sql
CREATE POLICY "team_access" ON nom_de_la_table FOR ALL USING (
  shop_id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
);
```

### 2. Backups

Settings > Database > Backups
- [ ] Verifier que les backups quotidiens sont actives
- [ ] Note la date du dernier backup reussi
- Plan gratuit = 7 jours de retention, plan Pro = 14 jours

### 3. Rate limiting auth

Authentication > Rate Limits (ou Settings > Auth)
- [ ] Sign in : max 30/heure par IP (par defaut 30)
- [ ] Sign up : max 10/heure par IP
- [ ] Magic link/OTP : max 5/heure par IP
- [ ] Password recovery : max 5/heure par IP

Si valeurs par defaut trop hautes, mets ces valeurs.

### 4. Email confirmation obligatoire

Authentication > Providers > Email
- [ ] "Confirm email" coche

### 5. Storage policies

Storage > documents (le bucket)
- [ ] RLS active sur le bucket
- [ ] Policy `documents_team_access` existe sur SELECT/INSERT/DELETE
- [ ] Public = NON (les fichiers doivent etre accessibles via URL signee, pas directement)

Si Public est sur ON et que tu stockes des Kbis/contrats, c'est un probleme. Soit tu mets en Private + URL signees, soit tu acceptes que les URLs soient publiques (ce qui est le comportement actuel).

### 6. Verifier l'absence de superusers

SQL Editor :
```sql
SELECT rolname FROM pg_roles WHERE rolsuper = true;
```

Tu dois voir uniquement `postgres` et `supabase_admin`. Rien d'autre.

### 7. Verifier les extensions actives

Database > Extensions
- [ ] uuid-ossp ou pgcrypto active (pour `gen_random_uuid()`)
- [ ] Aucune extension suspecte type `dblink`, `postgres_fdw` ouverte sans raison

---

## VERCEL

### 8. Variables d'environnement

Settings > Environment Variables

Pour CHAQUE variable, verifie :
- [ ] **DATABASE_URL** : contient `pooler.supabase.com:6543` (pas `db.xxx.supabase.co:5432`)
- [ ] **NEXT_PUBLIC_SUPABASE_URL** : commence par `https://`
- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY** : present (anon key, OK d'etre public)
- [ ] **SUPABASE_SERVICE_ROLE_KEY** : present, NOT prefixed by `NEXT_PUBLIC_`
- [ ] **WEBHOOK_EMAIL_SECRET** : token aleatoire de 64 caracteres
- [ ] **CRON_SECRET** : token aleatoire de 64 caracteres different du webhook

Si un des secrets fait moins de 32 caracteres ou ressemble a un mot, regenere-le :
```bash
openssl rand -hex 32
```

### 9. Firewall Vercel

Settings > Security > Firewall (anciennement Web Application Firewall)
- [ ] Activer "Attack Challenge Mode" si tu vois du trafic suspect
- [ ] Plan Hobby : protection bot basique active par defaut
- [ ] Plan Pro : "DDoS Mitigation" coche

### 10. Domain settings

Settings > Domains
- [ ] HTTPS force (devrait l'etre par defaut, mais verifie)
- [ ] HSTS active : Settings > Domains > Edit > "Enforce HSTS" coche

### 11. Function configuration

Settings > Functions
- [ ] Max Duration : 10s (eviter les timeouts coutants)
- [ ] Memory : 1024 MB par defaut, suffisant

### 12. Logs de production

Logs > Runtime
- [ ] Parcours les logs des 7 derniers jours, cherche les erreurs 500
- [ ] Verifie qu'il n'y a pas de tentatives de SQL injection, scan de routes admin, etc.
- [ ] Si tu vois beaucoup de hits sur des routes inexistantes (`/wp-admin`, `/.env`, etc.) c'est normal, c'est juste du scan automatique

---

## ACTIONS CODE (cote app)

J'ai audit le code, voici l'etat :

- [x] Toutes les API routes ont auth (getAuthContext, WEBHOOK_EMAIL_SECRET, ou CRON_SECRET)
- [x] Toutes les actions utilisent getAuthContext ou requireRole
- [x] Toutes les actions avec formData ont validation Zod
- [x] Toutes les tables metier ont shop_id pour RLS
- [x] Pas de SQL string interpolation dangereuse
- [x] Pas de dangerouslySetInnerHTML
- [x] Pas de eval() ou Function()
- [x] Rate limiting actif sur /api/upload
- [x] CSP non configure (recommande mais non bloquant)
- [x] Open redirect protege dans /api/auth/callback

## Ce qui pourrait etre fait en plus (non critique)

1. **Content Security Policy** : ajouter un header CSP strict. Bloque XSS si jamais une faille de framework apparait.
2. **Audit logs** : tu as `activity_log` mais elle n'est pas remplie partout. Idealement chaque action sensible (delete, share, change permissions) y est logged.
3. **2FA** : Supabase supporte 2FA depuis fin 2024. Activable dans Authentication > Multi-Factor. Si tu veux le proposer aux users.

---

## POUR CONCLURE

Si tu coches tout dans cette liste, tu es au niveau d'une PME bien gerée. Au-dela il faudrait du penetration testing pro, mais ce n'est pas justifie pour une boutique de revente.
