import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { products, sales } from "@/lib/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    // 1. Velocity: avg days between purchase and sale per product
    const velocityRows = await db
      .select({
        brand: products.brand,
        category: products.category,
        avgDays: sql<number>`coalesce(avg(extract(epoch from (s.sold_at - p.created_at)) / 86400), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .groupBy(products.brand, products.category)
      .orderBy(sql`avg(extract(epoch from (s.sold_at - p.created_at)) / 86400)`)
      .limit(15);

    // 2. Monthly revenue for seasonality (last 12 months)
    const seasonalityRows = await db
      .select({
        month: sql<number>`extract(month from sold_at)::int`,
        year: sql<number>`extract(year from sold_at)::int`,
        revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        margin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(sales)
      .groupBy(sql`extract(year from sold_at)`, sql`extract(month from sold_at)`)
      .orderBy(sql`extract(year from sold_at)`, sql`extract(month from sold_at)`);

    // 3. Best performing articles (highest margin)
    const topArticles = await db
      .select({
        title: products.title,
        brand: products.brand,
        salePrice: sales.salePrice,
        margin: sales.margin,
        marginPct: sales.marginPct,
        soldAt: sales.soldAt,
        purchasePrice: products.purchasePrice,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .orderBy(desc(sales.margin))
      .limit(10);

    // 4. Brand performance summary
    const brandPerf = await db
      .select({
        brand: products.brand,
        totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
        count: sql<number>`count(*)::int`,
        avgVelocity: sql<number>`coalesce(avg(extract(epoch from (s.sold_at - p.created_at)) / 86400), 0)::numeric`,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .groupBy(products.brand)
      .orderBy(desc(sql`sum(margin)`))
      .limit(10);

    // 5. Category performance
    const categoryPerf = await db
      .select({
        category: products.category,
        totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .groupBy(products.category)
      .orderBy(desc(sql`sum(margin)`));

    // 6. Margin prediction: avg margin by channel
    const channelMargin = await db
      .select({
        channel: sales.channel,
        avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
        avgMargin: sql<number>`coalesce(avg(margin), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(sales)
      .groupBy(sales.channel)
      .orderBy(desc(sql`avg(margin_pct)`));

    // 7. Stock at risk (in stock > 30 days)
    const atRisk = await db
      .select({
        id: products.id,
        title: products.title,
        brand: products.brand,
        purchasePrice: products.purchasePrice,
        targetPrice: products.targetPrice,
        daysInStock: sql<number>`extract(day from NOW() - created_at)::int`,
      })
      .from(products)
      .where(
        and(
          inArray(products.status, ["en_stock", "en_vente"]),
          sql`created_at < NOW() - INTERVAL '30 days'`
        )
      )
      .orderBy(products.createdAt);

    return NextResponse.json({
      velocity: velocityRows.map((r) => ({ ...r, avgDays: Math.round(Number(r.avgDays)) })),
      seasonality: seasonalityRows.map((r) => ({
        month: r.month, year: r.year, revenue: Number(r.revenue), margin: Number(r.margin), count: r.count,
      })),
      topArticles: topArticles.map((r) => ({
        title: r.title, brand: r.brand, salePrice: Number(r.salePrice), margin: Number(r.margin),
        marginPct: Number(r.marginPct), purchasePrice: Number(r.purchasePrice),
      })),
      brandPerf: brandPerf.map((r) => ({
        brand: r.brand, totalRevenue: Number(r.totalRevenue), totalMargin: Number(r.totalMargin),
        avgMarginPct: Number(r.avgMarginPct), count: r.count, avgVelocity: Math.round(Number(r.avgVelocity)),
      })),
      categoryPerf: categoryPerf.map((r) => ({
        category: r.category, totalRevenue: Number(r.totalRevenue), totalMargin: Number(r.totalMargin),
        avgMarginPct: Number(r.avgMarginPct), count: r.count,
      })),
      channelMargin: channelMargin.map((r) => ({
        channel: r.channel, avgMarginPct: Number(r.avgMarginPct), avgMargin: Number(r.avgMargin), count: r.count,
      })),
      atRisk: atRisk.map((r) => ({
        id: r.id, title: r.title, brand: r.brand, purchasePrice: Number(r.purchasePrice),
        targetPrice: r.targetPrice ? Number(r.targetPrice) : null, daysInStock: r.daysInStock,
      })),
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
