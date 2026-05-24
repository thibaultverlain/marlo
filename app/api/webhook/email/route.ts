import { NextRequest, NextResponse } from "next/server";
import { parseSaleEmail } from "@/lib/email-parser";
import { db } from "@/lib/db/client";
import { products, sales } from "@/lib/db/schema";
import { inArray, and, eq } from "drizzle-orm";
import {
  verifyMailgunSignature,
  extractShopTokenFromRecipient,
} from "@/lib/webhook/mailgun";
import {
  getShopByInboundToken,
  isMessageAlreadyProcessed,
  recordProcessedEmail,
} from "@/lib/db/queries/inbound-emails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ParsedPayload = {
  recipient: string | null;
  subject: string;
  body: string;
  sender: string;
  messageId: string | null;
  // Champs Mailgun pour la signature
  mgTimestamp: string | null;
  mgToken: string | null;
  mgSignature: string | null;
};

async function extractPayload(req: NextRequest): Promise<ParsedPayload> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const subject = (form.get("subject") as string | null) ?? "";
    let body = (form.get("body-plain") as string | null) ?? (form.get("stripped-text") as string | null) ?? "";
    if (!body) {
      const html = (form.get("body-html") as string | null) ?? "";
      body = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
    return {
      recipient: (form.get("recipient") as string | null) ?? (form.get("To") as string | null),
      subject,
      body,
      sender: (form.get("from") as string | null) ?? (form.get("sender") as string | null) ?? "",
      messageId: (form.get("Message-Id") as string | null) ?? (form.get("message-id") as string | null),
      mgTimestamp: form.get("timestamp") as string | null,
      mgToken: form.get("token") as string | null,
      mgSignature: form.get("signature") as string | null,
    };
  }

  // JSON (test manuel / curl)
  const json = await req.json();
  return {
    recipient: json.recipient ?? json.to ?? null,
    subject: json.subject ?? "",
    body: json.body ?? json["body-plain"] ?? "",
    sender: json.from ?? json.sender ?? "",
    messageId: json["Message-Id"] ?? json.messageId ?? null,
    mgTimestamp: null,
    mgToken: null,
    mgSignature: null,
  };
}

function isAuthenticated(req: NextRequest, payload: ParsedPayload): boolean {
  const signingKey = process.env.MAILGUN_SIGNING_KEY;

  // 1) Signature Mailgun (chemin nominal en prod)
  if (signingKey) {
    if (verifyMailgunSignature(payload.mgTimestamp, payload.mgToken, payload.mgSignature, signingKey)) {
      return true;
    }
    // Si signing key configure, on accepte aussi le Bearer en fallback (test/curl)
  }

  // 2) Bearer secret (fallback test ou si Mailgun signing key pas encore configure)
  const bearerSecret = process.env.WEBHOOK_EMAIL_SECRET;
  if (bearerSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader === `Bearer ${bearerSecret}`) return true;
  }

  return false;
}

function isSaleEmail(subject: string, body: string): boolean {
  const s = subject.toLowerCase();
  const b = body.toLowerCase();
  return (
    s.includes("vendu") || s.includes("sold") ||
    s.includes("felicitations") || s.includes("félicitations") ||
    s.includes("congratulations") || s.includes("vente confirmée") ||
    b.includes("a ete vendu") || b.includes("a été vendu") ||
    b.includes("has been sold")
  );
}

export async function POST(req: NextRequest) {
  try {
    const payload = await extractPayload(req);

    // 1. Authentification
    if (!isAuthenticated(req, payload)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // 2. Routing multi-tenant : extraire le shop token du recipient
    const shopToken = extractShopTokenFromRecipient(payload.recipient);
    if (!shopToken) {
      console.warn("[Webhook] Recipient invalide:", payload.recipient);
      return NextResponse.json({ error: "Recipient invalide" }, { status: 400 });
    }

    const shopCtx = await getShopByInboundToken(shopToken);
    if (!shopCtx) {
      console.warn("[Webhook] Shop introuvable pour token:", shopToken);
      return NextResponse.json({ error: "Shop introuvable" }, { status: 404 });
    }

    // 3. Dedup par Message-Id (idempotence)
    if (payload.messageId) {
      const alreadyProcessed = await isMessageAlreadyProcessed(payload.messageId);
      if (alreadyProcessed) {
        return NextResponse.json({ skipped: true, reason: "Already processed", messageId: payload.messageId });
      }
    }

    // 4. Filtre : c'est bien un email de vente ?
    if (!payload.body && !payload.subject) {
      return NextResponse.json({ error: "Email vide" }, { status: 400 });
    }
    if (!isSaleEmail(payload.subject, payload.body)) {
      return NextResponse.json({ skipped: true, reason: "Not a sale confirmation email" });
    }

    // 5. Parse du contenu
    const parsed = parseSaleEmail(payload.subject, payload.body);
    if (!parsed) {
      console.warn("[Webhook] Impossible de parser:", payload.subject.slice(0, 100));
      return NextResponse.json({ skipped: true, reason: "Could not extract sale data" });
    }

    // 6. Matching produit (SCOPED AU SHOP)
    const inStockProducts = await db
      .select()
      .from(products)
      .where(and(
        eq(products.shopId, shopCtx.shopId),
        inArray(products.status, ["en_stock", "en_vente", "reserve"]),
      ));

    const titleLower = parsed.productTitle.toLowerCase();
    const matchedProduct = inStockProducts.find((p) => {
      const brandLower = p.brand.toLowerCase();
      const productTitleLower = p.title.toLowerCase();
      return (
        titleLower.includes(brandLower) ||
        productTitleLower.includes(titleLower.slice(0, 15)) ||
        titleLower.includes(productTitleLower.slice(0, 15))
      );
    });

    // 7. Calcul marge
    const channel = parsed.platform === "vinted" ? "vinted" : "vestiaire";
    const purchasePrice = matchedProduct ? Number(matchedProduct.purchasePrice) : 0;
    const margin = matchedProduct ? (parsed.netRevenue - purchasePrice) : 0;
    const marginPct = matchedProduct && parsed.salePrice > 0 ? (margin / parsed.salePrice) * 100 : 0;

    // 8. Insertion de la vente, scope au shop + owner
    const [sale] = await db
      .insert(sales)
      .values({
        userId: shopCtx.ownerId,
        shopId: shopCtx.shopId,
        productId: matchedProduct?.id ?? null,
        channel: channel as any,
        salePrice: String(parsed.salePrice),
        platformFees: String(parsed.platformFees),
        shippingCost: "0",
        shippingPaidBy: "acheteur",
        netRevenue: String(parsed.netRevenue),
        margin: String(margin),
        marginPct: String(Math.round(marginPct * 100) / 100),
        paymentMethod: "plateforme",
        paymentStatus: "en_attente",
        shippingStatus: "a_expedier",
        soldAt: parsed.date,
        notes: matchedProduct
          ? `Auto-import email ${parsed.platform}`
          : `${parsed.productTitle} (import ${parsed.platform})`,
      })
      .returning();

    // 9. Marquer le produit comme vendu (scope shop pour defense en profondeur)
    if (matchedProduct) {
      await db
        .update(products)
        .set({ status: "vendu", updatedAt: new Date() })
        .where(and(eq(products.id, matchedProduct.id), eq(products.shopId, shopCtx.shopId)));
    }

    // 10. Enregistrer le Message-Id pour bloquer les re-traitements
    if (payload.messageId) {
      await recordProcessedEmail(shopCtx.shopId, payload.messageId, sale.id);
    }

    console.log(`[Webhook] Sale created shop=${shopCtx.shopId} ${parsed.platform} ${parsed.salePrice}EUR matched=${!!matchedProduct}`);

    return NextResponse.json({
      success: true,
      saleId: sale.id,
      shopId: shopCtx.shopId,
      platform: parsed.platform,
      salePrice: parsed.salePrice,
      matched: !!matchedProduct,
      productTitle: matchedProduct?.title ?? parsed.productTitle,
    });
  } catch (err) {
    console.error("[Webhook] Erreur:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
