import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { products, sales } from "@/lib/db/schema";
import { eq, desc, sql, and, inArray, gte } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

function getDateFilter(period: string): Date | null {
  const now = new Date();
  if (period === "30d") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  if (period === "90d") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
  if (period === "6m") return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return null; // "all"
}

export async function GET(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(); } catch { return NextResponse.json({ error: "Non autorise" }, { status: 401 }); }
  const shopId = ctx.shopId;
  const period = req.nextUrl.searchParams.get("period") ?? "all";
  const dateFrom = getDateFilter(period);

  try {
    const salesFilter = dateFrom
      ? and(eq(sales.shopId, shopId), gte(sales.soldAt, dateFrom))
      : eq(sales.shopId, shopId);

    // Month comparison: current vs previous
    const now = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [curMonth] = await db
      .select({
        revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        margin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(sales)
      .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, curStart)));

    const [prevMonth] = await db
      .select({
        revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        margin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(sales)
      .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, prevStart), sql`sold_at < ${curStart}`));

    const comparison = {
      currentRevenue: Number(curMonth?.revenue ?? 0),
      previousRevenue: Number(prevMonth?.revenue ?? 0),
      revenueChange: prevMonth && Number(prevMonth.revenue) > 0
        ? ((Number(curMonth?.revenue ?? 0) - Number(prevMonth.revenue)) / Number(prevMonth.revenue)) * 100 : 0,
      currentMargin: Number(curMonth?.margin ?? 0),
      previousMargin: Number(prevMonth?.margin ?? 0),
      marginChange: prevMonth && Number(prevMonth.margin) > 0
        ? ((Number(curMonth?.margin ?? 0) - Number(prevMonth.margin)) / Number(prevMonth.margin)) * 100 : 0,
      currentCount: curMonth?.count ?? 0,
      previousCount: prevMonth?.count ?? 0,
    };
    const velocityRows = await db
      .select({ brand: products.brand, category: products.category,
        avgDays: sql<number>`coalesce(avg(extract(epoch from (s.sold_at - p.created_at)) / 86400), 0)::numeric`, count: sql<number>`count(*)::int` })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(salesFilter)
      .groupBy(products.brand, products.category)
      .orderBy(sql`avg(extract(epoch from (s.sold_at - p.created_at)) / 86400)`)
      .limit(15);

    const seasonalityRows = await db
      .select({ month: sql<number>`extract(month from sold_at)::int`, year: sql<number>`extract(year from sold_at)::int`,
        revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`, margin: sql<number>`coalesce(sum(margin), 0)::numeric`, count: sql<number>`count(*)::int` })
      .from(sales)
      .where(salesFilter)
      .groupBy(sql`extract(year from sold_at)`, sql`extract(month from sold_at)`)
      .orderBy(sql`extract(year from sold_at)`, sql`extract(month from sold_at)`);

    const topArticles = await db
      .select({ title: products.title, brand: products.brand, salePrice: sales.salePrice, margin: sales.margin, marginPct: sales.marginPct, purchasePrice: products.purchasePrice })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(salesFilter)
      .orderBy(desc(sales.margin))
      .limit(10);

    const brandPerf = await db
      .select({ brand: products.brand, totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`, totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`, count: sql<number>`count(*)::int`,
        avgVelocity: sql<number>`coalesce(avg(extract(epoch from (s.sold_at - p.created_at)) / 86400), 0)::numeric` })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(salesFilter)
      .groupBy(products.brand)
      .orderBy(desc(sql`sum(margin)`))
      .limit(10);

    const categoryPerf = await db
      .select({ category: products.category, totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`, totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`, count: sql<number>`count(*)::int` })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(salesFilter)
      .groupBy(products.category)
      .orderBy(desc(sql`sum(margin)`));

    const channelMargin = await db
      .select({ channel: sales.channel, avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
        avgMargin: sql<number>`coalesce(avg(margin), 0)::numeric`, count: sql<number>`count(*)::int` })
      .from(sales)
      .where(salesFilter)
      .groupBy(sales.channel)
      .orderBy(desc(sql`avg(margin_pct)`));

    const atRisk = await db
      .select({ id: products.id, title: products.title, brand: products.brand, purchasePrice: products.purchasePrice,
        targetPrice: products.targetPrice, daysInStock: sql<number>`extract(day from NOW() - created_at)::int` })
      .from(products)
      .where(and(eq(products.shopId, shopId), inArray(products.status, ["en_stock", "en_vente"]), sql`created_at < NOW() - INTERVAL '30 days'`))
      .orderBy(products.createdAt);

    return NextResponse.json({
      comparison,
      velocity: velocityRows.map((r) => ({ ...r, avgDays: Math.round(Number(r.avgDays)) })),
      seasonality: seasonalityRows.map((r) => ({ month: r.month, year: r.year, revenue: Number(r.revenue), margin: Number(r.margin), count: r.count })),
      topArticles: topArticles.map((r) => ({ title: r.title, brand: r.brand, salePrice: Number(r.salePrice), margin: Number(r.margin), marginPct: Number(r.marginPct), purchasePrice: Number(r.purchasePrice) })),
      brandPerf: brandPerf.map((r) => ({ brand: r.brand, totalRevenue: Number(r.totalRevenue), totalMargin: Number(r.totalMargin), avgMarginPct: Number(r.avgMarginPct), count: r.count, avgVelocity: Math.round(Number(r.avgVelocity)) })),
      categoryPerf: categoryPerf.map((r) => ({ category: r.category, totalRevenue: Number(r.totalRevenue), totalMargin: Number(r.totalMargin), avgMarginPct: Number(r.avgMarginPct), count: r.count })),
      channelMargin: channelMargin.map((r) => ({ channel: r.channel, avgMarginPct: Number(r.avgMarginPct), avgMargin: Number(r.avgMargin), count: r.count })),
      atRisk: atRisk.map((r) => ({ id: r.id, title: r.title, brand: r.brand, purchasePrice: Number(r.purchasePrice), targetPrice: r.targetPrice ? Number(r.targetPrice) : null, daysInStock: r.daysInStock })),
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
