import { requireAuth } from "@/lib/auth/require-auth";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { getShopSettings } from "@/lib/db/queries/settings";
import { StockCatalogPDF } from "@/lib/stock/pdf-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const includeAll = req.nextUrl.searchParams.get("all") === "1";
    const statuses = includeAll
      ? ["en_stock", "en_vente", "reserve", "vendu", "livre", "retourne"] as const
      : ["en_stock", "en_vente", "reserve"] as const;

    const rows = await db
      .select()
      .from(products)
      .where(inArray(products.status, [...statuses]));

    const userId = (auth as any).user.id;
    const settings = await getShopSettings(userId);

    const pdfProducts = rows.map((p) => ({
      sku: p.sku,
      title: p.title,
      brand: p.brand,
      category: p.category,
      purchasePrice: Number(p.purchasePrice),
      targetPrice: p.targetPrice ? Number(p.targetPrice) : null,
      status: p.status,
    }));

    // @ts-ignore - react-pdf type mismatch with React 19
    const doc = <StockCatalogPDF products={pdfProducts} shopName={settings?.commercialName ?? settings?.legalName ?? "Marlo"} generatedAt={new Date()} />;
    const buffer = await renderToBuffer(doc as any);

    const download = req.nextUrl.searchParams.get("download") === "1";
    const filename = `stock-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": download
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Stock PDF error:", err);
    return NextResponse.json({ error: "Erreur génération PDF" }, { status: 500 });
  }
}
