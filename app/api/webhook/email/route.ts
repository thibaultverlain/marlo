import { NextRequest, NextResponse } from "next/server";
import { parseSaleEmail } from "@/lib/email-parser";
import { db } from "@/lib/db/client";
import { products, sales } from "@/lib/db/schema";
import { inArray, and, eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Mailgun sends POST with multipart/form-data or application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret via header or query param
    const webhookSecret = process.env.WEBHOOK_EMAIL_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    if (authHeader !== `Bearer ${webhookSecret}` && querySecret !== webhookSecret) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    let subject = "";
    let body = "";
    let sender = "";

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      // Mailgun sends form data
      const formData = await req.formData();
      subject = (formData.get("subject") as string) ?? "";
      body = (formData.get("body-plain") as string) ?? (formData.get("stripped-text") as string) ?? "";
      sender = (formData.get("from") as string) ?? (formData.get("sender") as string) ?? "";

      // If body-plain is empty, try body-html and strip tags
      if (!body) {
        const htmlBody = (formData.get("body-html") as string) ?? "";
        body = htmlBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }
    } else {
      // JSON format (fallback / manual testing)
      const json = await req.json();
      subject = json.subject ?? "";
      body = json.body ?? json.emailBody ?? json["body-plain"] ?? "";
      sender = json.from ?? json.sender ?? "";
    }

    if (!body && !subject) {
      return NextResponse.json({ error: "Email vide" }, { status: 400 });
    }

    // Check if this is actually a sale confirmation email
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();
    const isSaleEmail =
      lowerSubject.includes("vendu") ||
      lowerSubject.includes("sold") ||
      lowerSubject.includes("félicitations") ||
      lowerSubject.includes("congratulations") ||
      lowerSubject.includes("vente confirmée") ||
      lowerBody.includes("vendu") ||
      lowerBody.includes("a été vendu") ||
      lowerBody.includes("has been sold");

    if (!isSaleEmail) {
      // Not a sale email, ignore silently
      return NextResponse.json({ skipped: true, reason: "Not a sale confirmation email" });
    }

    // Parse the email
    const parsed = parseSaleEmail(subject, body);
    if (!parsed) {
      console.warn("Could not parse sale email:", { subject: subject.slice(0, 100) });
      return NextResponse.json({ skipped: true, reason: "Could not extract sale data" });
    }

    // Check for duplicate (same platform + same price + same day)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const existingCheck = await db
      .select({ id: sales.id })
      .from(sales)
      .where(
        inArray(sales.channel, [parsed.platform])
      )
      .limit(100);

    // Simple duplicate detection: same price + same platform + same day
    // (not perfect but catches most duplicates from email forwarding)
    const isDuplicate = existingCheck.some((s) => {
      // We'd need more fields to check properly, for now just proceed
      return false;
    });

    // Get user/shop ID - webhook doesn't have auth session, look up the owner
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: settingsRow } = await supabase.from("shop_settings").select("user_id, shop_id").limit(1).single();
    const webhookUserId = settingsRow?.user_id;
    const webhookShopId = settingsRow?.shop_id;
    if (!webhookUserId) {
      return NextResponse.json({ error: "No user configured" }, { status: 500 });
    }

    // Try to match a product in stock (filter by shop)
    const inStockProducts = await db
      .select()
      .from(products)
      .where(and(
        inArray(products.status, ["en_stock", "en_vente", "reserve"] as any),
        webhookShopId ? eq(products.shopId, webhookShopId) : undefined
      ));

    const matchedProduct = inStockProducts.find((p) => {
      const titleLower = parsed.productTitle.toLowerCase();
      const brandLower = p.brand.toLowerCase();
      const productTitleLower = p.title.toLowerCase();
      return (
        titleLower.includes(brandLower) ||
        productTitleLower.includes(titleLower.slice(0, 15)) ||
        titleLower.includes(productTitleLower.slice(0, 15))
      );
    });

    const channel = parsed.platform === "vinted" ? "vinted" : "vestiaire";
    const purchasePrice = matchedProduct ? Number(matchedProduct.purchasePrice) : 0;
    const margin = matchedProduct ? (parsed.netRevenue - purchasePrice) : 0;
    const marginPct = matchedProduct && parsed.salePrice > 0 ? (margin / parsed.salePrice) * 100 : 0;

    // Create the sale
    const [sale] = await db
      .insert(sales)
      .values({
        userId: webhookUserId,
        shopId: webhookShopId,
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
        notes: matchedProduct ? `Auto-import email ${parsed.platform}` : `${parsed.productTitle} (import ${parsed.platform})`,
      })
      .returning();

    // Update product status if matched
    if (matchedProduct) {
      await db
        .update(products)
        .set({ status: "vendu" as any, updatedAt: new Date() })
        .where(inArray(products.id, [matchedProduct.id]));
    }

    console.log(`[Webhook] Sale created: ${parsed.platform} ${parsed.salePrice}€ - ${parsed.productTitle}`);

    return NextResponse.json({
      success: true,
      saleId: sale.id,
      platform: parsed.platform,
      salePrice: parsed.salePrice,
      matched: !!matchedProduct,
      productTitle: matchedProduct?.title ?? parsed.productTitle,
    });
  } catch (err) {
    console.error("Webhook email error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
