/**
 * Test standalone du generateur d'annonces (templates statiques, pas de LLM).
 * Usage : npx tsx scripts/test-listing.ts
 *
 * Utilise la piece d'exemple donnee dans SPEC-generateur-annonces.md :
 * bucket hat Courreges vinyle noir taille S, ref 624ACP014VY0003,
 * facture non dispo, aucun detail signature fourni.
 */

import { generateListingFromTemplate } from "../lib/listing/build-template";
import { validateInput, validateOutput, type ListingInput } from "../lib/listing/build-prompt";

const testPiece: ListingInput = {
  marque: "Courreges",
  modele: "Bucket Hat vinyle",
  categorie: "accessoires",
  sous_categorie: "bob",
  taille: "S",
  couleur: "Noir",
  etat: "neuf sans etiquettes",
  source_achat: "The Bradery",
  date_achat: "2026-05-15",
  facture_disponible: false,
  matiere_composition: "Vinyle enduit",
  pays_fabrication: "Italie",
  mesures: { tour_cm: 56 },
  numero_serie: "624ACP014VY0003",
  prix_boutique: 290,
  prix_vente: 149,
  // details_signature volontairement omis (rien fourni)
  mots_cles: ["bob", "bucket hat", "casquette", "vinyle"],
  plateforme: "vinted",
};

console.log("=== TEST 1 : validateInput ===");
const inputErr = validateInput(testPiece);
console.log(inputErr ? `FAIL : ${inputErr}` : "OK — input valide");

console.log("\n=== TEST 2 : generation Vinted ===");
const vinted = generateListingFromTemplate(testPiece);
console.log(`--- TITRE (${vinted.titre.length} car.) ---`);
console.log(vinted.titre);
console.log("\n--- DESCRIPTION ---");
console.log(vinted.description);

console.log("\n=== TEST 3 : validateOutput Vinted ===");
const outErrV = validateOutput(vinted, testPiece);
console.log(outErrV ? `FAIL : ${outErrV}` : "OK — sortie conforme aux regles");

console.log("\n=== TEST 4 : generation Vestiaire ===");
const vestiaire = generateListingFromTemplate({ ...testPiece, plateforme: "vestiaire" });
console.log(`--- TITRE (${vestiaire.titre.length} car.) ---`);
console.log(vestiaire.titre);
console.log("\n--- DESCRIPTION ---");
console.log(vestiaire.description);

console.log("\n=== TEST 5 : validateOutput Vestiaire ===");
const outErrVs = validateOutput(vestiaire, { ...testPiece, plateforme: "vestiaire" });
console.log(outErrVs ? `FAIL : ${outErrVs}` : "OK — sortie conforme aux regles");

console.log("\n=== CHECKS FONCTIONNELS ===");
const checks = [
  { name: "Titre Vinted commence par Courreges", ok: vinted.titre.toLowerCase().startsWith("courreges") },
  { name: "Titre Vinted <= 80 caracteres", ok: vinted.titre.length <= 80 },
  { name: "Description mentionne le noir", ok: vinted.description.toLowerCase().includes("noir") },
  { name: "Description mentionne vinyle", ok: vinted.description.toLowerCase().includes("vinyle") },
  { name: "Description mentionne taille S", ok: /taille\s*s\b/i.test(vinted.description) },
  { name: "Description mentionne 56 cm (mesure)", ok: vinted.description.includes("56") },
  { name: "Description mentionne reference 624ACP014VY0003", ok: vinted.description.includes("624ACP014VY0003") },
  { name: "Description mentionne envoi 24h", ok: /24\s*h/i.test(vinted.description) },
  { name: "Pas de 'decoloration' (auto-fix)", ok: !/decolora/i.test(vinted.description) && !/décolora/i.test(vinted.description) },
  { name: "Pas de 'magnifique/superbe/splendide'", ok: !/magnifique|superbe|splendide/i.test(vinted.description) },
  { name: "Pas de 'facture' mentionnee (car facture_disponible=false)", ok: !/facture/i.test(vinted.description) },
  { name: "Pas de champ vide affiche en dur", ok: !/aucun\s*:|non\s*disponible|non renseigne/i.test(vinted.description) },
  { name: "Titre Vestiaire <= 60 caracteres", ok: vestiaire.titre.length <= 60 },
  { name: "Titre Vestiaire commence par Courreges", ok: vestiaire.titre.toLowerCase().startsWith("courreges") },
];
let allOk = true;
for (const c of checks) {
  console.log(`  [${c.ok ? "OK" : "FAIL"}] ${c.name}`);
  if (!c.ok) allOk = false;
}

console.log(allOk ? "\n=== TOUS LES CHECKS PASSENT ===" : "\n=== ECHEC : voir les FAIL ci-dessus ===");
process.exit(allOk ? 0 : 1);
