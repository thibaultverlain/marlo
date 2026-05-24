import { db } from "../client";
import { products, sales } from "../schema";
import { sql, eq, and, gte, isNotNull, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

const SECONDS_PER_DAY = 86400;

export type VelocityRow = {
  key: string;
  label: string;
  salesCount: number;
  avgDaysToSell: number;
  medianDaysToSell: number;
  fastestDays: number;
  slowestDays: number;
  totalRevenue: number;
  avgMargin: number;
  avgMarginPct: number;
};

async function velocityByColumn(
  shopId: string,
  groupCol: PgColumn,
  sinceMonths: number,
): Promise<VelocityRow[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - sinceMonths);

  const rows = await db
    .select({
      key: sql<string>`${groupCol}::text`,
      salesCount: sql<number>`count(*)::int`,
      avgDaysToSell: sql<number>`coalesce(avg(extract(epoch from (${sales.soldAt} - ${products.createdAt})) / ${SECONDS_PER_DAY}), 0)::float`,
      medianDaysToSell: sql<number>`coalesce(percentile_cont(0.5) within group (order by extract(epoch from (${sales.soldAt} - ${products.createdAt})) / ${SECONDS_PER_DAY}), 0)::float`,
      fastestDays: sql<number>`coalesce(min(extract(epoch from (${sales.soldAt} - ${products.createdAt})) / ${SECONDS_PER_DAY}), 0)::float`,
      slowestDays: sql<number>`coalesce(max(extract(epoch from (${sales.soldAt} - ${products.createdAt})) / ${SECONDS_PER_DAY}), 0)::float`,
      totalRevenue: sql<number>`coalesce(sum(${sales.salePrice}), 0)::numeric`,
      avgMargin: sql<number>`coalesce(avg(${sales.margin}), 0)::numeric`,
      avgMarginPct: sql<number>`coalesce(avg(${sales.marginPct}), 0)::numeric`,
    })
    .from(sales)
    .innerJoin(products, eq(products.id, sales.productId))
    .where(
      and(
        eq(sales.shopId, shopId),
        isNotNull(sales.productId),
        gte(sales.soldAt, since),
      ),
    )
    .groupBy(groupCol);

  return rows
    .filter((r) => r.key)
    .map((r) => ({
      key: r.key,
      label: r.key,
      salesCount: Number(r.salesCount),
      avgDaysToSell: Math.round(Number(r.avgDaysToSell) * 10) / 10,
      medianDaysToSell: Math.round(Number(r.medianDaysToSell) * 10) / 10,
      fastestDays: Math.round(Number(r.fastestDays)),
      slowestDays: Math.round(Number(r.slowestDays)),
      totalRevenue: Number(r.totalRevenue),
      avgMargin: Number(r.avgMargin),
      avgMarginPct: Number(r.avgMarginPct),
    }));
}

export async function getVelocityByBrand(shopId: string, sinceMonths = 12): Promise<VelocityRow[]> {
  return velocityByColumn(shopId, products.brand, sinceMonths);
}

export async function getVelocityByCategory(shopId: string, sinceMonths = 12): Promise<VelocityRow[]> {
  return velocityByColumn(shopId, products.category, sinceMonths);
}

export async function getVelocityByChannel(shopId: string, sinceMonths = 12): Promise<VelocityRow[]> {
  return velocityByColumn(shopId, sales.channel, sinceMonths);
}

export async function getVelocityOverview(shopId: string, sinceMonths = 12) {
  const since = new Date();
  since.setMonth(since.getMonth() - sinceMonths);

  const [overview] = await db
    .select({
      totalSales: sql<number>`count(*)::int`,
      matchedSales: sql<number>`count(${sales.productId})::int`,
      avgDaysToSell: sql<number>`coalesce(avg(extract(epoch from (${sales.soldAt} - ${products.createdAt})) / ${SECONDS_PER_DAY}), 0)::float`,
      totalRevenue: sql<number>`coalesce(sum(${sales.salePrice}), 0)::numeric`,
    })
    .from(sales)
    .leftJoin(products, eq(products.id, sales.productId))
    .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, since)));

  return {
    totalSales: Number(overview?.totalSales ?? 0),
    matchedSales: Number(overview?.matchedSales ?? 0),
    avgDaysToSell: Math.round(Number(overview?.avgDaysToSell ?? 0) * 10) / 10,
    totalRevenue: Number(overview?.totalRevenue ?? 0),
    sinceMonths,
  };
}

// ─── Best Sellers ──────────────────────────────────────

export type BestSellerRow = {
  key: string;
  label: string;
  unitsSold: number;
  totalRevenue: number;
  totalMargin: number;
  avgDaysToSell: number;
  avgSalePrice: number;
  rotationScore: number;
};

async function bestSellersByColumn(
  shopId: string,
  groupCol: PgColumn,
  sinceMonths: number,
): Promise<BestSellerRow[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - sinceMonths);

  const rows = await db
    .select({
      key: sql<string>`${groupCol}::text`,
      unitsSold: sql<number>`count(*)::int`,
      totalRevenue: sql<number>`coalesce(sum(${sales.salePrice}), 0)::numeric`,
      totalMargin: sql<number>`coalesce(sum(${sales.margin}), 0)::numeric`,
      avgDaysToSell: sql<number>`coalesce(avg(extract(epoch from (${sales.soldAt} - ${products.createdAt})) / ${SECONDS_PER_DAY}), 0)::float`,
      avgSalePrice: sql<number>`coalesce(avg(${sales.salePrice}), 0)::numeric`,
    })
    .from(sales)
    .innerJoin(products, eq(products.id, sales.productId))
    .where(
      and(
        eq(sales.shopId, shopId),
        isNotNull(sales.productId),
        gte(sales.soldAt, since),
      ),
    )
    .groupBy(groupCol);

  return rows
    .filter((r) => r.key)
    .map((r) => {
      const avgDays = Math.max(Number(r.avgDaysToSell), 1);
      const totalRevenue = Number(r.totalRevenue);
      return {
        key: r.key,
        label: r.key,
        unitsSold: Number(r.unitsSold),
        totalRevenue,
        totalMargin: Number(r.totalMargin),
        avgDaysToSell: Math.round(Number(r.avgDaysToSell) * 10) / 10,
        avgSalePrice: Number(r.avgSalePrice),
        rotationScore: Math.round((totalRevenue / avgDays) * 100) / 100,
      };
    })
    .sort((a, b) => b.rotationScore - a.rotationScore);
}

export async function getBestSellersByBrand(shopId: string, sinceMonths = 12): Promise<BestSellerRow[]> {
  return bestSellersByColumn(shopId, products.brand, sinceMonths);
}

export async function getBestSellersByCategory(shopId: string, sinceMonths = 12): Promise<BestSellerRow[]> {
  return bestSellersByColumn(shopId, products.category, sinceMonths);
}

// ─── Top produits individuels (les plus rapides a vendre) ─────────

export type TopProductRow = {
  productId: string;
  title: string;
  brand: string;
  category: string;
  daysToSell: number;
  salePrice: number;
  purchasePrice: number;
  margin: number;
  marginPct: number;
  channel: string;
  soldAt: Date;
};

export async function getTopFastestProducts(
  shopId: string,
  sinceMonths = 12,
  limit = 20,
): Promise<TopProductRow[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - sinceMonths);

  const rows = await db
    .select({
      productId: products.id,
      title: products.title,
      brand: products.brand,
      category: products.category,
      daysToSell: sql<number>`extract(epoch from (${sales.soldAt} - ${products.createdAt})) / ${SECONDS_PER_DAY}`,
      salePrice: sales.salePrice,
      purchasePrice: products.purchasePrice,
      margin: sales.margin,
      marginPct: sales.marginPct,
      channel: sales.channel,
      soldAt: sales.soldAt,
    })
    .from(sales)
    .innerJoin(products, eq(products.id, sales.productId))
    .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, since)))
    .orderBy(sql`extract(epoch from (${sales.soldAt} - ${products.createdAt})) asc`)
    .limit(limit);

  return rows.map((r) => ({
    productId: r.productId,
    title: r.title,
    brand: r.brand,
    category: r.category as string,
    daysToSell: Math.round(Number(r.daysToSell) * 10) / 10,
    salePrice: Number(r.salePrice),
    purchasePrice: Number(r.purchasePrice),
    margin: Number(r.margin ?? 0),
    marginPct: Number(r.marginPct ?? 0),
    channel: r.channel as string,
    soldAt: r.soldAt,
  }));
}
