import { db } from "../client";
import { sales, products, customers, type NewSale, type Sale } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

export type SaleWithDetails = Sale & {
  productTitle: string | null;
  customerName: string | null;
};

export async function getAllSales(shopId: string): Promise<SaleWithDetails[]> {
  const rows = await db
    .select({
      id: sales.id, userId: sales.userId, productId: sales.productId, customerId: sales.customerId,
      channel: sales.channel, salePrice: sales.salePrice, platformFees: sales.platformFees,
      shippingCost: sales.shippingCost, shippingPaidBy: sales.shippingPaidBy, netRevenue: sales.netRevenue,
      margin: sales.margin, marginPct: sales.marginPct, paymentMethod: sales.paymentMethod,
      paymentStatus: sales.paymentStatus, trackingNumber: sales.trackingNumber,
      shippingStatus: sales.shippingStatus, invoiceNumber: sales.invoiceNumber,
      soldAt: sales.soldAt, notes: sales.notes, createdAt: sales.createdAt,
      productTitle: products.title,
      customerFirstName: customers.firstName, customerLastName: customers.lastName,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.shopId, shopId))
    .orderBy(desc(sales.soldAt));

  return rows.map((r) => ({
    ...r,
    productTitle: r.productTitle ?? null,
    customerName: r.customerFirstName && r.customerLastName ? `${r.customerFirstName} ${r.customerLastName}` : null,
  })) as any;
}

export async function getSaleById(id: string) {
  const rows = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  return rows[0];
}

export async function createSale(data: NewSale): Promise<Sale> {
  const rows = await db.insert(sales).values(data).returning();
  return rows[0];
}

export async function getRecentSales(shopId: string, limit: number = 5) {
  const rows = await db
    .select({
      id: sales.id, salePrice: sales.salePrice, margin: sales.margin,
      marginPct: sales.marginPct, channel: sales.channel, soldAt: sales.soldAt, notes: sales.notes,
      productTitle: products.title,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.shopId, shopId))
    .orderBy(desc(sales.soldAt))
    .limit(limit);

  return rows;
}

export async function getCurrentMonthStats(shopId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const currentMonth = await db
    .select({
      revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
      margin: sql<number>`coalesce(sum(margin), 0)::numeric`,
      count: sql<number>`count(*)::int`,
      avgMargin: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
    })
    .from(sales)
    .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, startOfMonth)));

  const previousMonth = await db
    .select({
      revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
      margin: sql<number>`coalesce(sum(margin), 0)::numeric`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, startOfPrevMonth), lte(sales.soldAt, endOfPrevMonth)));

  return { current: currentMonth[0], previous: previousMonth[0] };
}

export async function getMarginByChannel(shopId: string) {
  const rows = await db
    .select({
      channel: sales.channel,
      avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
      totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(eq(sales.shopId, shopId))
    .groupBy(sales.channel)
    .orderBy(desc(sql`avg(margin_pct)`));

  return rows;
}

export async function getPendingShipments(shopId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sales)
    .where(and(eq(sales.shopId, shopId), eq(sales.shippingStatus, "a_expedier")));
  return rows[0]?.count ?? 0;
}

export async function deleteSale(id: string) {
  await db.delete(sales).where(eq(sales.id, id));
}
