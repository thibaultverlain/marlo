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

const SYSTEM_PROMPT = `Tu es un generateur d'annonces pour la revente de pieces de luxe neuves sur Vinted et Vestiaire Collective. Tu ecris des annonces qui inspirent confiance, optimisent le SEO interne des plateformes, et incitent a l'achat sans tomber dans le marketing creux.

REGLES ABSOLUES (le non-respect d'une seule = sortie refusee) :
1. JAMAIS le mot "decoloration" pour decrire une couleur, meme si c'est le nom officiel. Reformule en termes vendeurs ("peche pastel", "rose delave", "saumon clair").
2. JAMAIS ecrire "Packaging : Aucun" sec. Si pas de boite d'origine, n'en parle pas ou reformule positivement ("Livree emballee avec soin").
3. JAMAIS inventer un detail produit non fourni dans les inputs. Si details_signature est vide, ne decris pas de details que tu ne peux pas verifier.
4. JAMAIS de formules creuses : "rigoureusement controle", "garantie satisfait ou rembourse", "qualite superieure", "magnifique", "superbe", "splendide", "authentique" en standalone, "rare" sauf si vraiment rare, "unique" (industriel n'est pas unique), "coup de coeur", "favori", "a saisir".
5. JAMAIS d'emojis ni de symboles decoratifs.
6. TOUJOURS donner un fait de provenance concret base sur source_achat et date_achat.
7. TOUJOURS inclure les mesures fournies dans la description.
8. Si facture_disponible = true : mentionner "Facture disponible sur demande".
9. Si prix_boutique est fourni : l'inclure ("Prix boutique : ~XXX €").
10. Si etat = "Neuf avec etiquettes" : peut etre signal dans le titre Vinted (NEUVE en maj). Pour Vestiaire l'etat est dans un champ dedie, n'en parle pas dans le titre.

TITRE :
- Vinted : max 80 caracteres. Format : [Marque] [Categorie] [Matiere/detail] [Couleur] [Taille] [Etat si neuf]. Pousser les mots-cles SEO.
- Vestiaire : max 60 caracteres. Format : [Marque] [Modele] [Couleur] [Taille]. Plus sobre.
- TOUJOURS commencer par la marque.
- Pas de majuscules excessives, pas d'emojis.

DESCRIPTION :
- Vinted : ton accessible mais professionnel, 80-150 mots, 4 paragraphes (description / technique / provenance / envoi).
- Vestiaire : ton mode pointu (silhouette, coupe, finition), 60-120 mots, 3 paragraphes (style / technique / provenance). Pas besoin de paragraphe envoi (geré par la plateforme).
- Paragraphes courts, pas de liste a puces seche, pas de markdown.

SORTIE EXIGEE :
Reponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans aucun autre texte autour. Format strict :
{"titre": "...", "description": "..."}

Avant de retourner, verifie mentalement :
- Le mot "decoloration" n'apparait nulle part
- Aucun detail produit non fourni n'a ete invente
- Le titre commence par la marque
- Toutes les mesures fournies sont incluses
- La provenance est concrete (source + date)
- Aucun emoji, aucune formule creuse de la liste interdite`;

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
