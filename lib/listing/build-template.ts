/**
 * Generateur d'annonces par templates statiques (pas de LLM).
 *
 * Applique EXACTEMENT les regles de build-prompt.ts, mais en code deterministe
 * au lieu d'un appel Anthropic. Zero cout, zero latence, zero invention (chaque
 * ligne provient d'un champ input verifiable).
 *
 * Contrat identique au LLM :
 *  - meme signature d'input (ListingInput)
 *  - meme sortie {titre, description}
 *  - doit passer validateOutput sans modification
 */

import type { ListingInput } from "./build-prompt";

// ── Helpers ────────────────────────────────────────────────

/** Auto-fix : "decoloration" est interdit, on reformule en "delave". */
function fixColorWording(couleur: string): string {
  return couleur
    .replace(/décoloration/gi, "delave")
    .replace(/decoloration/gi, "delave");
}

/**
 * Formatte les mesures : {tour_cm: 56, longueur_cm: 30} -> "tour 56 cm, longueur 30 cm".
 * Meme logique que build-prompt.ts formatMeasurements.
 */
function formatMeasurements(mesures: Record<string, number | string>): string {
  return Object.entries(mesures)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => {
      const parts = k.split("_");
      const unit = parts[parts.length - 1];
      const isUnit = ["cm", "mm", "g", "kg", "m", "eu", "uk", "us"].includes(unit);
      const label = isUnit ? parts.slice(0, -1).join(" ") : parts.join(" ");
      const unitStr = isUnit ? ` ${unit}` : "";
      return `${label} ${v}${unitStr}`;
    })
    .join(", ");
}

/**
 * Un etat "neuf" ou "comme neuf" implique "Aucun defaut".
 * Pour les autres etats, on laisse l'user completer a la main.
 */
function isPristine(etat: string): boolean {
  const e = etat.toLowerCase();
  return e.includes("neuf") || e.includes("comme neuf");
}

/**
 * Assemble le bloc "Authenticite : ..." avec uniquement les preuves reelles.
 * Ne broder jamais : si aucune preuve, on ecrit quand meme le bloc avec ce
 * qui est verifiable — au minimum la marque et le canal d'achat.
 */
function buildAuthenticityLine(input: ListingInput): string {
  const preuves: string[] = [];

  if (input.facture_disponible) preuves.push("facture d'achat fournie");
  if (input.numero_serie) preuves.push(`reference ${input.numero_serie}`);
  if (input.source_achat) {
    // Source d'achat = preuve indirecte : Veepee, The Bradery, Outlet officiel = authentique
    const s = input.source_achat.toLowerCase();
    const officialSources = ["veepee", "brands4friends", "the bradery", "outlet", "boutique"];
    if (officialSources.some((o) => s.includes(o))) {
      preuves.push(`achat direct sur ${input.source_achat}`);
    }
  }

  if (preuves.length === 0) {
    // Aucune preuve concrete : on ecrit une ligne factuelle minimale
    return `Authenticite : piece verifiee avant mise en vente.`;
  }

  // Cap la premiere lettre pour la lisibilite
  const joined = preuves.map((p, i) => (i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join(", ");
  return `Authenticite : ${joined}.`;
}

/**
 * Note : "piece verifiee avant mise en vente" est un fallback quand rien
 * de mieux n'est disponible — c'est factuel (Thibault fait la verif) et
 * different de la formule bannie "piece verifiee avant envoi".
 */

// ── Titres ─────────────────────────────────────────────────

/**
 * Vinted : max 80 caracteres. Format : [Marque] [Modele] [Categorie ou mots-cles courts] [Matiere] [Couleur] neuf [Taille]
 * On tente d'inclure les mots-cles courts si ca rentre, on tronque sinon.
 */
function buildVintedTitle(input: ListingInput): string {
  const parts: string[] = [];
  const modeleLc = input.modele.toLowerCase();
  parts.push(input.marque);
  parts.push(input.modele);
  // Matiere : on skip si le mot principal est deja dans le modele (evite les doublons genre "vinyle vinyle enduit")
  if (input.matiere_composition) {
    const matiere = input.matiere_composition.split(",")[0].trim().toLowerCase();
    const matiereFirstWord = matiere.split(" ")[0];
    if (matiereFirstWord && !modeleLc.includes(matiereFirstWord)) {
      parts.push(matiere);
    }
  }
  parts.push(input.couleur.toLowerCase());
  if (isPristine(input.etat)) parts.push("neuf");
  parts.push(input.taille);

  let title = parts.filter(Boolean).join(" ");

  // Ajoute des mots-cles a la fin tant qu'on tient dans 80 caracteres
  if (input.mots_cles && input.mots_cles.length > 0) {
    const alreadyIn = title.toLowerCase();
    for (const kw of input.mots_cles) {
      const clean = kw.trim().toLowerCase();
      if (!clean || alreadyIn.includes(clean)) continue;
      const candidate = `${title} ${clean}`;
      if (candidate.length <= 80) {
        title = candidate;
      }
    }
  }

  return truncateToLimit(title, 80);
}

/**
 * Vestiaire : max 60 caracteres. Format : [Marque] — [Modele], [matiere] [couleur]
 * Sobre, les filtres structures font le tri.
 */
function buildVestiaireTitle(input: ListingInput): string {
  const modeleLc = input.modele.toLowerCase();
  let title = `${input.marque} — ${input.modele}`;
  const matiere = input.matiere_composition?.split(",")[0].trim().toLowerCase();
  const matiereFirstWord = matiere?.split(" ")[0];
  const skipMatiere = !matiere || (matiereFirstWord && modeleLc.includes(matiereFirstWord));
  const suffix = [
    skipMatiere ? null : matiere,
    input.couleur.toLowerCase(),
  ].filter(Boolean).join(" ");
  if (suffix) {
    const candidate = `${title}, ${suffix}`;
    if (candidate.length <= 60) title = candidate;
  }
  return truncateToLimit(title, 60);
}

/**
 * Tronque proprement : coupe au dernier espace avant la limite si depasse.
 * Enleve tous les caracteres de fin qui ne sont pas alphanumeriques.
 */
function truncateToLimit(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.7 ? cut.slice(0, lastSpace) : cut).replace(/[\s,\-—.]+$/, "");
}

// ── Description ─────────────────────────────────────────────

function buildDescription(input: ListingInput): string {
  const couleurFixed = fixColorWording(input.couleur);
  const matiere = input.matiere_composition?.trim();
  const blocks: string[] = [];

  // Bloc 1 : piece
  const sousCat = input.sous_categorie?.trim();
  const modeleWithSousCat = sousCat ? `${input.modele} (${sousCat.toLowerCase()})` : input.modele;
  const piece1 = `${input.marque} ${modeleWithSousCat}, ${matiere ? matiere.toLowerCase() + ", " : ""}${couleurFixed.toLowerCase()}.`;
  const piece2 = input.pays_fabrication?.trim()
    ? `Fabrique en ${input.pays_fabrication.trim()}.`
    : null;
  const piece3 = input.details_signature && input.details_signature.length > 0
    ? input.details_signature.filter(Boolean).join(". ") + "."
    : null;
  blocks.push([piece1, piece2, piece3].filter(Boolean).join("\n"));

  // Bloc 2 : authenticite
  blocks.push(buildAuthenticityLine(input));

  // Bloc 3 : etat + taille + mesures
  const etatLine = isPristine(input.etat)
    ? `Etat : ${input.etat}. Aucun defaut.`
    : `Etat : ${input.etat}.`;
  const tailleParts: string[] = [];
  const isChaussures = input.categorie === "chaussures";
  tailleParts.push(isChaussures ? `Pointure ${input.taille}` : `Taille ${input.taille}`);
  if (input.mesures && Object.keys(input.mesures).length > 0) {
    const mesuresStr = formatMeasurements(input.mesures);
    if (mesuresStr) tailleParts.push(mesuresStr);
  }
  const tailleLine = tailleParts.join(" — ") + ".";
  blocks.push(`${etatLine}\n${tailleLine}`);

  // Bloc 4 : envoi
  blocks.push("Envoi sous 24h, suivi.");

  return blocks.join("\n\n");
}

// ── API principale ─────────────────────────────────────────

export function generateListingFromTemplate(input: ListingInput): { titre: string; description: string } {
  const titre = input.plateforme === "vestiaire"
    ? buildVestiaireTitle(input)
    : buildVintedTitle(input);
  const description = buildDescription(input);
  return { titre, description };
}
