# Spec — Brancher le générateur d'annonces

## Contexte
La logique du générateur existe déjà et vient d'être alignée sur le style Nayren (sobre, factuel, anti-invention) :
- `lib/listing/build-prompt.ts` — types, validation input, system prompt, user prompt, validation output
- `lib/listing/measurement-fields.ts` — champs de mesures par catégorie

**NE PAS réécrire ces deux fichiers.** Le prompt et les règles sont validés. Il faut seulement les brancher.

## Ce qui manque (3 briques)

### 1. Server action — `lib/actions/listing.ts`
Créer une server action `generateListing(input: ListingInput)` qui :
- valide l'input avec `validateInput()` (déjà dans build-prompt.ts) ; si erreur, retourne l'erreur
- appelle l'API Anthropic avec `buildSystemPrompt()` comme system et `buildUserPrompt(input)` comme message user
- parse la réponse JSON `{titre, description}` (la sortie est du JSON pur, sans markdown — gérer quand même le cas où le modèle wrappe en ```json)
- passe le résultat dans `validateOutput(result, input)` (déjà dans build-prompt.ts)
- si `validateOutput` retourne une erreur : relancer UNE fois avec un message ajouté demandant de corriger la violation précise ; si échec au 2e essai, retourner l'erreur à l'UI (ne jamais renvoyer une annonce qui viole les règles)
- retourner `{titre, description}` en cas de succès

Modèle API : utiliser un modèle Claude récent adapté (à confirmer dans la doc Anthropic à jour — ne pas coder un nom de modèle en dur sans vérifier qu'il existe). Clé API dans les variables d'environnement (`.env.local`), jamais en dur.

### 2. Interface de saisie + résultat
Deux options — choisir la plus simple à intégrer à l'existant :
- soit une page dédiée `app/(app)/listing/page.tsx`
- soit un bouton "Générer l'annonce" sur la fiche produit existante qui pré-remplit l'input depuis les données du produit

Le formulaire doit :
- couvrir les champs de `ListingInput` (obligatoires + optionnels)
- afficher les champs de mesures dynamiquement selon la catégorie via `getMeasurementFields(category)`
- proposer le choix de plateforme (vinted / vestiaire)
- afficher titre + description générés, avec un bouton copier pour chacun
- afficher clairement l'erreur si la génération échoue

Réutiliser les composants UI existants (`components/ui/`). Respecter le style de l'app.

### 3. Config
- vérifier que la clé API Anthropic est dans `.env.local` (l'ajouter aux variables si absente)
- vérifier que le package SDK Anthropic est installé, sinon l'ajouter

## Contraintes
- Ne pas inventer de champ produit ni de règle : tout est déjà défini dans build-prompt.ts
- Toujours faire passer la sortie par `validateOutput` avant de l'afficher
- Tester avec une pièce réelle (ex : bucket hat Courrèges vinyle noir, taille S, réf 624ACP014VY0003, facture non dispo, aucun détail signature fourni) et vérifier que la description sort au format sobre attendu, sans invention
- Style de sortie attendu : bloc pièce / bloc authenticité / bloc état-taille / ligne envoi. Sec, factuel.
