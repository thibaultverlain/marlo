import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  buildSystemPrompt, buildUserPrompt, validateInput, validateOutput,
  type ListingInput,
} from "@/lib/listing/build-prompt";
import { CATEGORIES, CONDITIONS } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "llama-3.2-90b-vision-preview";
const TEXT_MODEL = "llama-3.3-70b-versatile";
const MAX_RETRIES = 1;

function formatDateFr(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx;
  try { ctx = await getAuthContext(); } catch {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY non configuree" }, { status: 500 });
  }

  const { id: productId } = await params;
  const body = await req.json();
  const platform: "vinted" | "vestiaire" = body.platform === "vestiaire" ? "vestiaire" : "vinted";
  const useImages: boolean = body.useImages !== false;

  // 1. Charger le produit
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.shopId, ctx.shopId)))
    .limit(1);

  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  // 2. Mapping vers ListingInput (structure du prompt)
  const categoryLabel = CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category;
  const conditionLabel = CONDITIONS.find((c) => c.value === product.condition)?.label ?? product.condition;

  const input: ListingInput = {
    marque: product.brand,
    modele: product.model ?? product.title,
    categorie: categoryLabel,
    sous_categorie: product.subcategory ?? undefined,
    taille: product.size ?? "Taille unique",
    couleur: product.color ?? "",
    etat: conditionLabel,
    source_achat: product.purchaseSource ?? "Non renseignee",
    date_achat: product.purchaseDate ? formatDateFr(product.purchaseDate) : "",
    facture_disponible: product.hasInvoice ?? false,
    matiere_composition: product.material ?? undefined,
    pays_fabrication: product.countryOfOrigin ?? undefined,
    mesures: (product.measurements && typeof product.measurements === "object")
      ? (product.measurements as Record<string, number | string>)
      : undefined,
    numero_serie: product.serialNumber ?? undefined,
    prix_boutique: product.retailPrice ? Number(product.retailPrice) : undefined,
    prix_vente: Number(product.targetPrice ?? product.purchasePrice),
    details_signature: product.signatureDetails ?? undefined,
    mots_cles: product.keywords ?? undefined,
    plateforme: platform,
  };

  // 3. Validation des champs obligatoires
  const validationError = validateInput(input);
  if (validationError) {
    return NextResponse.json({
      error: `Champ requis manquant : ${validationError}. Complete la fiche produit avant de generer.`,
    }, { status: 400 });
  }

  // 4. Construire les messages LLM
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  const images = (product.images ?? []).slice(0, 3);
  const hasImages = useImages && images.length > 0;

  function buildMessages(retryReason?: string) {
    const userContent = retryReason
      ? `${userPrompt}\n\nIMPORTANT — Ta reponse precedente a ete refusee : ${retryReason}\nGenere une nouvelle version qui respecte strictement les regles.`
      : userPrompt;

    if (hasImages) {
      return [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userContent },
            ...images.map((url: string) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ];
    }
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];
  }

  // 5. Appel LLM avec retry si validation post-generation echoue
  async function callLLM(retryReason?: string) {
    const resp = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: hasImages ? VISION_MODEL : TEXT_MODEL,
        messages: buildMessages(retryReason),
        temperature: 0.6,
        max_tokens: 1500,
        response_format: hasImages ? undefined : { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("Groq API error:", resp.status, errBody);
      throw new Error(`Erreur IA : ${resp.status}`);
    }
    return resp.json();
  }

  function parseResponse(content: string): { titre: string; description: string } {
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Reponse IA invalide");
      parsed = JSON.parse(match[0]);
    }
    // Le prompt utilise titre/description, on accepte aussi title/description
    const titre = parsed.titre ?? parsed.title;
    const description = parsed.description;
    if (!titre || !description) throw new Error("Reponse IA incomplete");
    return { titre, description };
  }

  try {
    // Premier essai
    let data = await callLLM();
    let content = data.choices?.[0]?.message?.content ?? "";
    let result = parseResponse(content);

    // Validation post-generation
    let violation = validateOutput(result, input);

    // Un retry si violation detectee
    if (violation && MAX_RETRIES > 0) {
      console.warn("[generate-listing] Violation detectee, retry:", violation);
      data = await callLLM(violation);
      content = data.choices?.[0]?.message?.content ?? "";
      result = parseResponse(content);
      violation = validateOutput(result, input);
    }

    if (violation) {
      console.error("[generate-listing] Violation apres retry:", violation, result);
      return NextResponse.json({
        error: `IA a viole les regles : ${violation}. Reessaie ou ajuste manuellement.`,
      }, { status: 500 });
    }

    return NextResponse.json({
      title: result.titre,
      description: result.description,
      platform,
      withImages: hasImages,
    });

  } catch (err: any) {
    console.error("Generate listing error:", err);
    return NextResponse.json({
      error: err.message ?? "Erreur de generation",
    }, { status: 500 });
  }
}
