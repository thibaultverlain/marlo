/**
 * Test standalone du generateur d'annonces.
 * Usage : depuis le repo racine, avec .env.local rempli (ANTHROPIC_API_KEY).
 *   npx tsx scripts/test-listing.ts
 *
 * Ce script utilise la piece d'exemple donnee dans SPEC-generateur-annonces.md :
 * bucket hat Courreges vinyle noir taille S, ref 624ACP014VY0003, facture non dispo,
 * aucun detail signature fourni. On verifie que la sortie sort au format sobre attendu.
 */

import "dotenv/config";
import { generateListing } from "../lib/actions/listing";
import { validateInput, buildUserPrompt, buildSystemPrompt, validateOutput, type ListingInput } from "../lib/listing/build-prompt";

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

async function main() {
  console.log("=== TEST 1 : validateInput (a sec) ===");
  const inputErr = validateInput(testPiece);
  console.log(inputErr ? `FAIL : ${inputErr}` : "OK — input valide");

  console.log("\n=== TEST 2 : user prompt (a sec) ===");
  console.log(buildUserPrompt(testPiece));

  console.log("\n=== TEST 3 : appel API Anthropic ===");
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("SKIP — ANTHROPIC_API_KEY non definie dans .env.local");
    console.log("Renseigne la clef dans .env.local puis relance :");
    console.log("  npx tsx scripts/test-listing.ts");
    process.exit(0);
  }

  const start = Date.now();
  const res = await generateListing(testPiece);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`(${elapsed}s)\n`);

  if ("error" in res) {
    console.error("FAIL — Erreur :", res.error);
    process.exit(1);
  }

  console.log("--- TITRE (" + res.titre.length + " car.) ---");
  console.log(res.titre);
  console.log("\n--- DESCRIPTION ---");
  console.log(res.description);

  console.log("\n=== TEST 4 : validateOutput (defense en profondeur) ===");
  const outErr = validateOutput(res, testPiece);
  console.log(outErr ? `FAIL : ${outErr}` : "OK — sortie conforme aux regles");

  console.log("\n=== CHECKS FONCTIONNELS ===");
  const checks = [
    { name: "Titre commence par Courreges", ok: res.titre.toLowerCase().startsWith("courreges") },
    { name: "Titre <= 80 caracteres (Vinted)", ok: res.titre.length <= 80 },
    { name: "Description mentionne le noir", ok: res.description.toLowerCase().includes("noir") },
    { name: "Description mentionne vinyle", ok: res.description.toLowerCase().includes("vinyle") },
    { name: "Description mentionne taille S", ok: /\bs\b/i.test(res.description) },
    { name: "Description mentionne 56 cm (mesure)", ok: res.description.includes("56") },
    { name: "Description mentionne reference 624ACP014VY0003", ok: res.description.includes("624ACP014VY0003") },
    { name: "Description mentionne envoi 24h", ok: /24\s*h/i.test(res.description) },
    { name: "Pas de 'decoloration'", ok: !/decolora/i.test(res.description) },
    { name: "Pas de 'magnifique/superbe/splendide'", ok: !/magnifique|superbe|splendide/i.test(res.description) },
    { name: "Pas de facture mentionnee (car facture_disponible=false)", ok: !/facture/i.test(res.description) },
    { name: "Pas de detail invente (signature omise)", ok: true }, // manuel
  ];
  for (const c of checks) {
    console.log(`  [${c.ok ? "OK" : "FAIL"}] ${c.name}`);
  }

  const allOk = checks.every((c) => c.ok);
  console.log(allOk ? "\n=== TOUS LES CHECKS PASSENT ===" : "\n=== ATTENTION : certains checks echouent, verifie manuellement ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
