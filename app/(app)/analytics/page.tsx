import { getAuthContext } from "@/lib/auth/require-role";
import AnalyticsClient from "@/components/analytics/analytics-client";
export const dynamic = "force-dynamic";

async function fetchAnalyticsData(shopId: string) {
  // Import the same logic the API route uses, but call it directly server-side
  // This avoids an HTTP round-trip
  const { db } = await import("@/lib/db/client");
  const { products, sales } = await import("@/lib/db/schema");
  const { eq, desc, sql, and, inArray, gte } = await import("drizzle-orm");

  try {
    const now = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [[curMonth], [prevMonth]] = await Promise.all([
      db.select({
        revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        margin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      }).from(sales).where(and(eq(sales.shopId, shopId), gte(sales.soldAt, curStart))),
      db.select({
        revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        margin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      }).from(sales).where(and(eq(sales.shopId, shopId), gte(sales.soldAt, prevStart), sql`sold_at < ${curStart}`)),
    ]);

    const comparison = {
      currentRevenue: Number(curMonth?.revenue ?? 0),
      previousRevenue: Number(prevMonth?.revenue ?? 0),
      revenueChange: Number(prevMonth?.revenue) > 0 ? ((Number(curMonth?.revenue ?? 0) - Number(prevMonth.revenue)) / Number(prevMonth.revenue)) * 100 : 0,
      currentMargin: Number(curMonth?.margin ?? 0),
      previousMargin: Number(prevMonth?.margin ?? 0),
      marginChange: Number(prevMonth?.margin) > 0 ? ((Number(curMonth?.margin ?? 0) - Number(prevMonth.margin)) / Number(prevMonth.margin)) * 100 : 0,
      currentCount: curMonth?.count ?? 0,
      previousCount: prevMonth?.count ?? 0,
    };

    const salesFilter = eq(sales.shopId, shopId);

    const [velocityRows, seasonalityRows, topArticles, brandPerf, categoryPerf, channelMargin] = await Promise.all([
      db.select({ brand: products.brand, category: products.category,
        avgDays: sql<number>`coalesce(avg(extract(epoch from (s.sold_at - p.created_at)) / 86400), 0)::numeric`, count: sql<number>`count(*)::int` })
        .from(sales).innerJoin(products, eq(sales.productId, products.id)).where(salesFilter)
        .groupBy(products.brand, products.category).orderBy(sql`avg(extract(epoch from (s.sold_at - p.created_at)) / 86400)`).limit(15),
      db.select({ month: sql<number>`extract(month from sold_at)::int`, year: sql<number>`extract(year from sold_at)::int`,
        revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`, margin: sql<number>`coalesce(sum(margin), 0)::numeric`, count: sql<number>`count(*)::int` })
        .from(sales).where(salesFilter).groupBy(sql`extract(year from sold_at)`, sql`extract(month from sold_at)`)
        .orderBy(sql`extract(year from sold_at)`, sql`extract(month from sold_at)`),
      db.select({ title: products.title, brand: products.brand, salePrice: sales.salePrice, margin: sales.margin, marginPct: sales.marginPct, purchasePrice: products.purchasePrice })
        .from(sales).innerJoin(products, eq(sales.productId, products.id)).where(salesFilter).orderBy(desc(sales.margin)).limit(10),
      db.select({ brand: products.brand, totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`, totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`, count: sql<number>`count(*)::int`,
        avgVelocity: sql<number>`coalesce(avg(extract(epoch from (s.sold_at - p.created_at)) / 86400), 0)::numeric` })
        .from(sales).innerJoin(products, eq(sales.productId, products.id)).where(salesFilter).groupBy(products.brand).orderBy(desc(sql`sum(margin)`)).limit(10),
      db.select({ category: products.category, totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`, totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
        avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`, count: sql<number>`count(*)::int` })
        .from(sales).innerJoin(products, eq(sales.productId, products.id)).where(salesFilter).groupBy(products.category).orderBy(desc(sql`sum(margin)`)),
      db.select({ channel: sales.channel, avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
        avgMargin: sql<number>`coalesce(avg(margin), 0)::numeric`, count: sql<number>`count(*)::int` })
        .from(sales).where(salesFilter).groupBy(sales.channel).orderBy(desc(sql`avg(margin_pct)`)),
    ]);

    return {
      comparison,
      velocity: velocityRows.map((r) => ({ ...r, avgDays: Math.round(Number(r.avgDays)) })),
      seasonality: seasonalityRows.map((r) => ({ ...r, revenue: Number(r.revenue), margin: Number(r.margin) })),
      topArticles: topArticles.map((r) => ({ ...r, salePrice: Number(r.salePrice), margin: Number(r.margin), marginPct: Number(r.marginPct), purchasePrice: Number(r.purchasePrice) })),
      brandPerf: brandPerf.map((r) => ({ ...r, totalRevenue: Number(r.totalRevenue), totalMargin: Number(r.totalMargin), avgMarginPct: Number(r.avgMarginPct), avgVelocity: Math.round(Number(r.avgVelocity)) })),
      categoryPerf: categoryPerf.map((r) => ({ ...r, totalRevenue: Number(r.totalRevenue), totalMargin: Number(r.totalMargin), avgMarginPct: Number(r.avgMarginPct) })),
      channelMargin: channelMargin.map((r) => ({ ...r, avgMarginPct: Number(r.avgMarginPct), avgMargin: Number(r.avgMargin) })),
    };
  } catch (err) {
    console.error("Analytics SSR error:", err);
    return null;
  }
}

export default async function AnalyticsPage() {
  const { shopId } = await getAuthContext();
  const data = await fetchAnalyticsData(shopId);

  return (
    <div className="space-y-6 page-enter">
      <AnalyticsClient initialData={data} />
    </div>
  );
}
