import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "llama-3.2-90b-vision-preview";
const TEXT_MODEL = "llama-3.3-70b-versatile";

function buildPrompt(platform: "vinted" | "vestiaire", product: any, useVision: boolean): string {
  const productInfo = `
Article :
- Marque : ${product.brand ?? "Non renseigne"}
- Modele : ${product.model ?? product.title ?? "Non renseigne"}
- Categorie : ${product.category ?? "Non renseigne"}
- Couleur : ${product.color ?? "Non renseignee"}
- Taille : ${product.size ?? "Non renseignee"}
- Etat : ${product.condition ?? "Non renseigne"}
- Prix de vente prevu : ${product.sale_price ?? product.purchase_price ?? "?"} EUR
- Notes internes (utilise-les pour adapter le ton ou ajouter des details) : ${product.notes ?? "Aucune"}
`.trim();

  const visionInstruction = useVision
    ? "\nTu as aussi acces aux photos du produit. Utilise-les pour ajouter des details visuels precis (signes d'usure visibles, accessoires inclus, details d'esthetique). N'invente rien que tu ne vois pas."
    : "";

  if (platform === "vinted") {
    return `Tu es un expert en redaction d'annonces Vinted pour des articles de luxe.

Genere une annonce pour cet article :
${productInfo}
${visionInstruction}

Contraintes Vinted :
- Titre : MAX 60 caracteres, marque + modele/categorie + detail distinctif. Pas de majuscules systematiques.
- Description : 200-400 mots, structuree, professionnelle mais chaleureuse.

Structure ideale de la description :
1. Une phrase d'accroche qui met en valeur l'article
2. Description detaillee (matiere, couleur, dimensions si applicable)
3. Etat precis (signes d'usure honnetement, ou "tres bon etat")
4. Authenticite garantie (mentionner si carte/dustbag/facture)
5. Conditions (envoi soigne sous 24-48h, vente entre particuliers)

Style :
- Professionnel mais chaleureux, ton bienveillant
- Phrases courtes et claires
- Vocabulaire mode/luxe maitrise
- Pas de fautes
- Pas d'emojis
- Pas de hashtags

Reponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans aucun autre texte :
{"title": "...", "description": "..."}`;
  }

  // Vestiaire Collective
  return `Tu es un expert en redaction d'annonces Vestiaire Collective pour des articles de luxe.

Genere une annonce pour cet article :
${productInfo}
${visionInstruction}

Contraintes Vestiaire :
- Titre : MAX 80 caracteres, format "Marque Modele Couleur" ou similaire. Pro et factuel.
- Description : 150-300 mots, ton sobre et expert, accent sur les details d'authenticite et la provenance.

Structure ideale de la description :
1. Description detaillee de l'article (matiere noble, savoir-faire, design)
2. Caracteristiques techniques (dimensions, materiau exact, finitions)
3. Etat detaille et honnete
4. Informations d'authenticite (annee, collection, references si connues)
5. Provenance (achete en boutique, garde dans dressing soigne, etc.)

Style :
- Plus sobre et expert que Vinted, vocabulaire luxe pointu
- Ton professionnel mais chaleureux
- Phrases riches mais pas trop longues
- Pas de fautes
- Pas d'emojis
- Pas de hashtags

Reponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans aucun autre texte :
{"title": "...", "description": "..."}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await getAuthContext();
  } catch {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY non configuree dans Vercel" }, { status: 500 });
  }

  const { id: productId } = await params;
  const body = await req.json();
  const platform: "vinted" | "vestiaire" = body.platform === "vestiaire" ? "vestiaire" : "vinted";
  const useImages: boolean = body.useImages !== false; // default true

  // Get product
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.shopId, ctx.shopId)))
    .limit(1);

  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  // Map snake_case for prompt
  const productData = {
    brand: product.brand,
    model: product.model,
    title: product.title,
    category: product.category,
    color: product.color,
    size: product.size,
    condition: product.condition,
    sale_price: product.targetPrice,
    purchase_price: product.purchasePrice,
    notes: product.notes,
  };

  const images = (product.images ?? []).slice(0, 3); // Max 3 photos pour eviter trop de tokens
  const hasImages = useImages && images.length > 0;

  const prompt = buildPrompt(platform, productData, hasImages);

  // Build messages with optional images
  let messages: any[];
  if (hasImages) {
    messages = [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        ...images.map((url: string) => ({
          type: "image_url",
          image_url: { url },
        })),
      ],
    }];
  } else {
    messages = [{ role: "user", content: prompt }];
  }

  try {
    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: hasImages ? VISION_MODEL : TEXT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1500,
        response_format: hasImages ? undefined : { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errorBody);
      return NextResponse.json({ error: `Erreur IA : ${groqResponse.status}` }, { status: 500 });
    }

    const data = await groqResponse.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Extract JSON from content (might be wrapped in markdown sometimes)
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Reponse IA invalide");
      }
    }

    if (!parsed.title || !parsed.description) {
      throw new Error("Reponse IA incomplete");
    }

    return NextResponse.json({
      title: parsed.title,
      description: parsed.description,
      platform,
      withImages: hasImages,
    });
  } catch (err: any) {
    console.error("Generate listing error:", err);
    return NextResponse.json({ error: err.message ?? "Erreur de generation" }, { status: 500 });
  }
}
