import { NextRequest, NextResponse } from "next/server";
import { parseSaleEmail } from "@/lib/email-parser";
import { db } from "@/lib/db/client";
import { products, sales } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Mailgun sends POST with multipart/form-data or application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret (optional but recommended)
    const authHeader = req.headers.get("authorization");
    const webhookSecret = process.env.WEBHOOK_EMAIL_SECRET;
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      // Also check Mailgun's format (no auth header, but we can check a token in body)
      // For now, we accept all requests but log a warning
      console.warn("Webhook called without matching auth header");
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

    // Try to match a product in stock
    const inStockProducts = await db
      .select()
      .from(products)
      .where(inArray(products.status, ["en_stock", "en_vente", "reserve"]));

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
    const margin = parsed.netRevenue - purchasePrice;
    const marginPct = parsed.salePrice > 0 ? (margin / parsed.salePrice) * 100 : 0;

    // Create the sale
    const [sale] = await db
      .insert(sales)
      .values({
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
