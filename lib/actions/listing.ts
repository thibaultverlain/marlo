"use server";

/**
 * Server action pour generer une annonce Vinted / Vestiaire.
 *
 * Flow :
 *   1. validateInput(input) — reject si un champ obligatoire manque
 *   2. Appel API Anthropic (system + user prompt depuis build-prompt.ts)
 *   3. Parse JSON strict (le modele DOIT retourner du JSON pur, mais on tolere le wrap ```json)
 *   4. validateOutput(result, input) — anti-hallucination / anti-formules creuses
 *   5. Si violation : relance UNE fois en indiquant la violation precise. Si echec au 2e essai, retourne l'erreur.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  validateInput,
  buildSystemPrompt,
  buildUserPrompt,
  validateOutput,
  type ListingInput,
} from "@/lib/listing/build-prompt";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 1200; // titre court + description ~400-800 tokens, marge

export type ListingResult =
  | { titre: string; description: string }
  | { error: string };

function extractJson(text: string): { titre: string; description: string } | null {
  let cleaned = text.trim();
  // Tolerer un wrap ```json ... ``` au cas ou
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.titre === "string" &&
      typeof parsed.description === "string"
    ) {
      return { titre: parsed.titre, description: parsed.description };
    }
    return null;
  } catch {
    return null;
  }
}

async function callAnthropic(
  client: Anthropic,
  system: string,
  userMessages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: userMessages,
  });
  const block = res.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Reponse Anthropic sans bloc texte");
  }
  return block.text;
}

export async function generateListing(input: ListingInput): Promise<ListingResult> {
  // 1. Validation input
  const inputError = validateInput(input);
  if (inputError) return { error: inputError };

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Clef API Anthropic manquante (ANTHROPIC_API_KEY dans .env.local)" };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  try {
    // 2. Premier essai
    let text = await callAnthropic(client, system, [{ role: "user", content: userPrompt }]);
    let parsed = extractJson(text);
    if (!parsed) {
      return { error: "Reponse Anthropic non parsable en JSON. Reponse brute : " + text.slice(0, 200) };
    }

    // 3. Validation output
    let violation = validateOutput(parsed, input);
    if (!violation) return parsed;

    // 4. Retry UNE fois avec la violation dans le message
    const retryText = await callAnthropic(client, system, [
      { role: "user", content: userPrompt },
      { role: "assistant", content: JSON.stringify(parsed) },
      {
        role: "user",
        content:
          `Violation detectee : ${violation}\n\n` +
          `Corrige uniquement cette violation en respectant TOUTES les regles absolues. ` +
          `Reponds a nouveau UNIQUEMENT en JSON : {"titre": "...", "description": "..."}`,
      },
    ]);
    parsed = extractJson(retryText);
    if (!parsed) {
      return { error: "Retry Anthropic non parsable. Brut : " + retryText.slice(0, 200) };
    }
    violation = validateOutput(parsed, input);
    if (violation) {
      return { error: `Violation persistante apres retry : ${violation}` };
    }
    return parsed;
  } catch (err: any) {
    console.error("generateListing error:", err);
    return { error: err?.message ?? "Erreur inconnue lors de l'appel Anthropic" };
  }
}
