import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { db } from "@/lib/db/client";
import { products, sales } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { CHANNELS, CATEGORIES } from "@/lib/data";

export const dynamic = "force-dynamic";

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  try {
    const { shopId } = await getAuthContext();
    const salesFilter = eq(sales.shopId, shopId);

    const [brandPerf, categoryPerf, channelMargin] = await Promise.all([
      db.select({
        brand: products.brand,
        count: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
        avgVelocity: sql<number>`coalesce(avg(extract(epoch from (s.sold_at - p.created_at)) / 86400), 0)::numeric`,
      })
      .from(sales).innerJoin(products, eq(sales.productId, products.id))
      .where(salesFilter).groupBy(products.brand).orderBy(desc(sql`sum(margin)`)),
      db.select({
        category: products.category,
        count: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
      })
      .from(sales).innerJoin(products, eq(sales.productId, products.id))
      .where(salesFilter).groupBy(products.category).orderBy(desc(sql`sum(margin)`)),
      db.select({
        channel: sales.channel,
        count: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
      })
      .from(sales).where(salesFilter).groupBy(sales.channel).orderBy(desc(sql`sum(margin)`)),
    ]);

    let csv = "\uFEFF";
    csv += "PERFORMANCE PAR MARQUE\n";
    csv += ["Marque", "Ventes", "CA", "Marge totale", "Marge %", "Vitesse (j)"].map(escapeCsv).join(",") + "\n";
    brandPerf.forEach((b) => {
      csv += [
        b.brand,
        b.count,
        Number(b.totalRevenue).toFixed(2).replace(".", ","),
        Number(b.totalMargin).toFixed(2).replace(".", ","),
        Number(b.avgMarginPct).toFixed(1).replace(".", ","),
        Math.round(Number(b.avgVelocity)),
      ].map(escapeCsv).join(",") + "\n";
    });

    csv += "\nPERFORMANCE PAR CATEGORIE\n";
    csv += ["Categorie", "Ventes", "CA", "Marge totale", "Marge %"].map(escapeCsv).join(",") + "\n";
    categoryPerf.forEach((c) => {
      csv += [
        CATEGORIES.find((x) => x.value === c.category)?.label ?? c.category,
        c.count,
        Number(c.totalRevenue).toFixed(2).replace(".", ","),
        Number(c.totalMargin).toFixed(2).replace(".", ","),
        Number(c.avgMarginPct).toFixed(1).replace(".", ","),
      ].map(escapeCsv).join(",") + "\n";
    });

    csv += "\nPERFORMANCE PAR CANAL\n";
    csv += ["Canal", "Ventes", "CA", "Marge totale", "Marge %"].map(escapeCsv).join(",") + "\n";
    channelMargin.forEach((c) => {
      csv += [
        CHANNELS.find((x) => x.value === c.channel)?.label ?? c.channel,
        c.count,
        Number(c.totalRevenue).toFixed(2).replace(".", ","),
        Number(c.totalMargin).toFixed(2).replace(".", ","),
        Number(c.avgMarginPct).toFixed(1).replace(".", ","),
      ].map(escapeCsv).join(",") + "\n";
    });

    const filename = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Analytics export error:", err);
    return NextResponse.json({ error: err.message || "Erreur" }, { status: 500 });
  }
}
