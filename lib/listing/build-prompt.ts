/**
 * Construit le prompt LLM pour le generateur d'annonces.
 * Suit exactement les regles du brief Marlo :
 *   - Inputs structures, outputs JSON
 *   - Regles absolues (pas de "decoloration", pas d'invention, ton factuel)
 *   - Differenciation Vinted vs Vestiaire
 *   - Validation finale (checklist anti-faute)
 */

export type ListingInput = {
  marque: string;
  modele: string;
  categorie: string;
  sous_categorie?: string;
  taille: string;
  couleur: string;
  etat: string;
  source_achat: string;
  date_achat: string;
  facture_disponible: boolean;
  matiere_composition?: string;
  pays_fabrication?: string;
  mesures?: Record<string, number | string>;
  numero_serie?: string;
  prix_boutique?: number;
  prix_vente: number;
  details_signature?: string[];
  mots_cles?: string[];
  plateforme: "vinted" | "vestiaire";
};

const REQUIRED_FIELDS: Array<keyof ListingInput> = [
  "marque", "modele", "categorie", "taille", "couleur", "etat",
  "source_achat", "date_achat", "prix_vente", "plateforme",
];

export function validateInput(input: Partial<ListingInput>): string | null {
  for (const field of REQUIRED_FIELDS) {
    const v = input[field];
    if (v === undefined || v === null || v === "") {
      return `Champ obligatoire manquant : ${field}`;
    }
  }
  if (typeof input.facture_disponible !== "boolean") {
    return "Champ obligatoire manquant : facture_disponible";
  }
  return null;
}

const SYSTEM_PROMPT = `Tu es un generateur d'annonces pour la revente de pieces de luxe neuves sur Vinted et Vestiaire Collective, pour la marque Nayren. Le style est sobre, factuel, dense. Chaque ligne porte une information utile a l'acheteur. Aucun remplissage, aucun marketing.

PRINCIPE : une annonce qui vend sur du luxe seconde main neuve, c'est une annonce qui tue les trois peurs de l'acheteur, dans cet ordre : 1) est-ce authentique, 2) taille/dimensions, 3) etat reel. La preuve concrete vaut mieux que l'affirmation vague.

REGLES ABSOLUES (le non-respect d'une seule = sortie refusee) :
1. JAMAIS inventer un detail produit non fourni dans les inputs. Si details_signature est vide, n'ecris aucun detail de finition, de matiere ou d'authentification que tu ne peux pas verifier depuis les inputs. Un champ manquant = ligne omise, jamais comblee par une supposition.
2. JAMAIS le mot "decoloration" pour une couleur, meme si c'est le nom officiel. Reformule ("peche pastel", "rose delave", "saumon clair").
3. JAMAIS de formules creuses ou marketing : "rigoureusement controle", "garantie satisfait ou rembourse", "qualite superieure", "magnifique", "superbe", "splendide", "authentique" en standalone, "rare" sauf si vraiment rare, "unique", "coup de coeur", "favori", "a saisir", "piece verifiee avant envoi", "sourcing France & Europe" en signature decorative.
4. JAMAIS d'emojis ni de symboles decoratifs.
5. JAMAIS de champ absent affiche en dur (pas de "Reference : non disponible", pas de "Packaging : Aucun"). Si l'info n'est pas fournie, la ligne n'existe pas.
6. Si facture_disponible = true : mentionner "Facture fournie". Si false : ne rien ecrire sur la facture.
7. Si prix_boutique est fourni : l'inclure sobrement ("Prix boutique : ~XXX EUR").
8. TOUJOURS inclure les mesures fournies. Toujours indiquer la taille/pointure.

TITRE :
- Vinted : max 80 caracteres. Format : [Marque] [Modele] [Categorie] [Matiere] [Couleur] neuf. Pousser les mots-cles reellement tapes par les acheteurs ; si un objet a deux noms courants (ex : "bob" et "bucket hat"), inclure les deux si ca rentre. Pas de synonymes tires par les cheveux.
- Vestiaire : max 60 caracteres. Format : [Marque] — [Modele], [matiere] [couleur]. Sobre, les filtres structures font le tri.
- TOUJOURS commencer par la marque. Pas de majuscules excessives, pas d'emojis.

DESCRIPTION (identique dans l'esprit pour les deux plateformes, sobre et structuree) :
Structure fixe, dans cet ordre, une ou deux lignes par bloc, ligne vide entre les blocs :

[Marque] [modele complet], [matiere], [couleur].
[Detail signature UNIQUEMENT si fourni dans details_signature. Sinon cette ligne n'existe pas.]

Authenticite : [preuves reelles a partir des inputs — facture si fournie, numero de serie si fourni, reference verifiable, accessoires d'origine si fournis]. 
[Reference si fournie.]

Etat : [etat exact]. ["Aucun defaut" ou le defaut s'il est fourni].
[Taille/pointure] — [mesures fournies / conseil de taille si pertinent].

Envoi sous 24h, suivi.

Contraintes de style : pas de paragraphe marketing, pas de storytelling, pas de liste a puces avec tirets markdown, pas de gras. Des phrases courtes et factuelles. Le bloc "Authenticite" ne s'ecrit que s'il y a au moins une preuve reelle a donner ; sinon l'ecrire quand meme mais uniquement avec ce qui est verifiable (ne jamais broder).

SORTIE EXIGEE :
Reponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans aucun autre texte autour. Format strict :
{"titre": "...", "description": "..."}

Avant de retourner, verifie mentalement :
- Aucun detail produit non fourni n'a ete invente
- Aucun champ manquant n'est affiche en dur
- Le titre commence par la marque
- Toutes les mesures fournies sont incluses
- Aucun emoji, aucune formule creuse de la liste interdite
- La description suit la structure fixe (piece / authenticite / etat-taille / envoi)`;

function formatMeasurements(mesures: Record<string, number | string>): string {
  return Object.entries(mesures)
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => {
      // taille_cm → "taille : 38 cm"
      const parts = k.split("_");
      const unit = parts[parts.length - 1];
      const isUnit = ["cm", "mm", "g", "kg", "m", "eu", "uk", "us"].includes(unit);
      const label = isUnit ? parts.slice(0, -1).join(" ") : parts.join(" ");
      const unitStr = isUnit ? ` ${unit}` : "";
      return `${label} ${v}${unitStr}`;
    })
    .join(", ");
}

function formatInputForLLM(input: ListingInput): string {
  const lines: string[] = [];
  lines.push(`Marque : ${input.marque}`);
  lines.push(`Modele : ${input.modele}`);
  lines.push(`Categorie : ${input.categorie}${input.sous_categorie ? ` (${input.sous_categorie})` : ""}`);
  lines.push(`Couleur : ${input.couleur}`);
  lines.push(`Taille : ${input.taille}`);
  lines.push(`Etat : ${input.etat}`);
  lines.push(`Prix de vente : ${input.prix_vente} EUR`);

  if (input.prix_boutique) {
    lines.push(`Prix boutique d'origine : ${input.prix_boutique} EUR`);
  }
  if (input.matiere_composition) {
    lines.push(`Matiere : ${input.matiere_composition}`);
  }
  if (input.pays_fabrication) {
    lines.push(`Pays de fabrication : ${input.pays_fabrication}`);
  }
  if (input.mesures && Object.keys(input.mesures).length > 0) {
    lines.push(`Mesures : ${formatMeasurements(input.mesures)}`);
  }
  if (input.numero_serie) {
    lines.push(`Numero de serie : ${input.numero_serie}`);
  }
  if (input.details_signature && input.details_signature.length > 0) {
    lines.push(`Details signature : ${input.details_signature.join(", ")}`);
  }
  if (input.mots_cles && input.mots_cles.length > 0) {
    lines.push(`Mots-cles strategiques : ${input.mots_cles.join(", ")}`);
  }

  lines.push(`Source d'achat : ${input.source_achat}`);
  lines.push(`Date d'achat : ${input.date_achat}`);
  lines.push(`Facture disponible : ${input.facture_disponible ? "oui" : "non"}`);
  lines.push(`Plateforme cible : ${input.plateforme}`);

  return lines.join("\n");
}

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildUserPrompt(input: ListingInput): string {
  return `Genere l'annonce pour cette piece :

${formatInputForLLM(input)}

Reponds UNIQUEMENT en JSON : {"titre": "...", "description": "..."}`;
}

/**
 * Validation post-generation : detecte les violations des regles absolues
 * pour catch les hallucinations du LLM. Retourne null si OK, sinon le motif.
 */
export function validateOutput(result: { titre: string; description: string }, input: ListingInput): string | null {
  const all = `${result.titre}\n${result.description}`.toLowerCase();

  if (all.includes("decoloration") || all.includes("décoloration")) {
    return "Le mot 'decoloration' est interdit. Reformule.";
  }
  if (all.includes("packaging : aucun") || all.includes("packaging: aucun")) {
    return "Formulation 'Packaging : Aucun' interdite.";
  }
  // Detection de formules creuses
  const banned = [
    "rigoureusement controlé", "rigoureusement controle",
    "garantie satisfait ou rembourse",
    "coup de coeur", "coup de cœur",
    "a saisir", "à saisir",
    "piece verifiee avant envoi", "pièce vérifiée avant envoi",
    "qualite superieure", "qualité supérieure",
    "magnifique", "superbe", "splendide",
  ];
  for (const phrase of banned) {
    if (all.includes(phrase)) return `Formule creuse interdite detectee : "${phrase}".`;
  }
  // Titre doit commencer par la marque
  if (!result.titre.toLowerCase().startsWith(input.marque.toLowerCase().split(" ")[0])) {
    return `Le titre doit commencer par la marque (${input.marque}).`;
  }
  // Detection d'emojis (range Unicode emoji basique)
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  if (emojiRegex.test(all)) {
    return "Le titre ou la description contient un emoji.";
  }
  return null;
}
