import { requireAuth } from "@/lib/auth/require-auth";
import { NextRequest, NextResponse } from "next/server";
import { parseSaleEmail } from "@/lib/email-parser";
import { db } from "@/lib/db/client";
import { products, sales } from "@/lib/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { subject, emailBody } = body;

    if (!subject && !emailBody) {
      return NextResponse.json({ error: "subject et emailBody requis" }, { status: 400 });
    }

    const parsed = parseSaleEmail(subject ?? "", emailBody ?? "");
    if (!parsed) {
      return NextResponse.json(
        { error: "Impossible de parser cet email. Format non reconnu." },
        { status: 422 }
      );
    }

    // Try to find a matching product in stock by title similarity
    const inStockProducts = await db
      .select()
      .from(products)
      .where(inArray(products.status, ["en_stock", "en_vente", "reserve"]));

    let matchedProduct = inStockProducts.find((p) =>
      parsed.productTitle.toLowerCase().includes(p.brand.toLowerCase()) ||
      p.title.toLowerCase().includes(parsed.productTitle.toLowerCase().slice(0, 20))
    );

    const channel = parsed.platform === "vinted" ? "vinted" : "vestiaire";
    const purchasePrice = matchedProduct ? Number(matchedProduct.purchasePrice) : 0;
    const margin = parsed.netRevenue - purchasePrice;
    const marginPct = parsed.salePrice > 0 ? (margin / parsed.salePrice) * 100 : 0;

    // Create the sale
    const [sale] = await db
      .insert(sales)
      .values({
        productId: matchedProduct?.id ?? null,
        channel,
        salePrice: String(parsed.salePrice),
        platformFees: String(parsed.platformFees),
        shippingCost: "0",
        shippingPaidBy: "acheteur",
        netRevenue: String(parsed.netRevenue),
        margin: String(margin),
        marginPct: String(marginPct),
        paymentMethod: "plateforme",
        paymentStatus: "en_attente",
        shippingStatus: "a_expedier",
        soldAt: parsed.date,
        notes: `Import auto depuis email ${parsed.platform}`,
      })
      .returning();

    // Update product status if matched
    if (matchedProduct) {
      await db
        .update(products)
        .set({ status: "vendu", updatedAt: new Date() })
        .where(eq(products.id, matchedProduct.id));
    }

    return NextResponse.json({
      success: true,
      sale: {
        id: sale.id,
        productTitle: matchedProduct?.title ?? parsed.productTitle,
        salePrice: parsed.salePrice,
        netRevenue: parsed.netRevenue,
        margin,
        platform: parsed.platform,
        matched: !!matchedProduct,
      },
    });
  } catch (err) {
    console.error("Email parse API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
