<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Marlo — Profil cible actuel

Marlo est utilise en mode **solo** par Thibault pour piloter Nayren.
- **Pas de multi-user, pas de SaaS**. Pas d'invitations, pas de gestion d'equipe a developper.
- **Un seul shop par user** : pas de complexite multi-tenant a ajouter dans les nouvelles features.
- Les tables `team_members`, `team_invitations`, `shops` restent en place (l'auth context en depend) mais leurs UI sont cachees.
- L'utilisateur a TOUJOURS le role `owner` sur son shop. Pas besoin de checker des permissions granulaires dans les nouvelles features — juste `getAuthContext()` pour recuperer le `shopId` et filtrer dessus.

**Priorite produit** : tout ce qui aide a "vendre plus vite" — stock dormants, suggestion baisse de prix, stats vitesse de vente par marque, alertes.

**A ne PAS ajouter sans validation explicite** :
- Features SaaS (multi-tenant, billing, signup public, etc.)
- Onboarding pour de nouveaux users
- Roles ou permissions granulaires
- Notifications par email/push pour des tiers
