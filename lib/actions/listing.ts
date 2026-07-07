"use server";

/**
 * Server action pour generer une annonce Vinted / Vestiaire.
 *
 * Implementation : templates statiques (lib/listing/build-template.ts).
 * Pas d'appel LLM, pas de reseau, pas de cout. Deterministe.
 *
 * Flow :
 *   1. validateInput(input) — reject si un champ obligatoire manque
 *   2. generateListingFromTemplate(input) — assemble titre + description
 *   3. validateOutput(result, input) — defense en profondeur
 *      Si violation : c'est un bug du template, on log + retourne l'erreur.
 */

import { validateInput, validateOutput, type ListingInput } from "@/lib/listing/build-prompt";
import { generateListingFromTemplate } from "@/lib/listing/build-template";

export type ListingResult =
  | { titre: string; description: string }
  | { error: string };

export async function generateListing(input: ListingInput): Promise<ListingResult> {
  const inputError = validateInput(input);
  if (inputError) return { error: inputError };

  const result = generateListingFromTemplate(input);

  const violation = validateOutput(result, input);
  if (violation) {
    console.error("[generateListing] Template a produit une violation :", violation);
    console.error("[generateListing] Input :", input);
    console.error("[generateListing] Sortie :", result);
    return { error: `Bug template : ${violation}` };
  }

  return result;
}
