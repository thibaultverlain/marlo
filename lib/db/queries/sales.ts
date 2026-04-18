import { db } from "../client";
import { sales, products, customers, type NewSale, type Sale } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

export type SaleWithDetails = Sale & {
  productTitle: string | null;
  customerName: string | null;
};

export async function getAllSales(): Promise<SaleWithDetails[]> {
  const rows = await db
    .select({
      id: sales.id,
      productId: sales.productId,
      customerId: sales.customerId,
      channel: sales.channel,
      salePrice: sales.salePrice,
      platformFees: sales.platformFees,
      shippingCost: sales.shippingCost,
      shippingPaidBy: sales.shippingPaidBy,
      netRevenue: sales.netRevenue,
      margin: sales.margin,
      marginPct: sales.marginPct,
      paymentMethod: sales.paymentMethod,
      paymentStatus: sales.paymentStatus,
      trackingNumber: sales.trackingNumber,
      shippingStatus: sales.shippingStatus,
      invoiceNumber: sales.invoiceNumber,
      soldAt: sales.soldAt,
      notes: sales.notes,
      createdAt: sales.createdAt,
      productTitle: products.title,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .orderBy(desc(sales.soldAt));

  return rows.map((r) => ({
    ...r,
    customerName: r.customerFirstName && r.customerLastName ? `${r.customerFirstName} ${r.customerLastName}` : null,
  }));
}

export async function getSaleById(id: string): Promise<Sale | undefined> {
  const rows = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  return rows[0];
}

export async function createSale(data: NewSale): Promise<Sale> {
  // Create sale and update product status in transaction
  return db.transaction(async (tx) => {
    const [sale] = await tx.insert(sales).values(data).returning();

    // Update product status to "vendu"
    if (data.productId) {
      await tx
        .update(products)
        .set({ status: "vendu", updatedAt: new Date() })
        .where(eq(products.id, data.productId));
    }

    // Update customer stats
    if (data.customerId && data.salePrice) {
      await tx
        .update(customers)
        .set({
          totalSpent: sql`coalesce(total_spent, 0) + ${data.salePrice}`,
          totalOrders: sql`coalesce(total_orders, 0) + 1`,
          lastPurchaseAt: new Date(),
        })
        .where(eq(customers.id, data.customerId));
    }

    return sale;
  });
}

export async function updateSale(id: string, data: Partial<NewSale>): Promise<Sale | undefined> {
  const rows = await db.update(sales).set(data).where(eq(sales.id, id)).returning();
  return rows[0];
}

export async function getCurrentMonthStats() {
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
    .where(gte(sales.soldAt, startOfMonth));

  const previousMonth = await db
    .select({
      revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
      margin: sql<number>`coalesce(sum(margin), 0)::numeric`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(and(gte(sales.soldAt, startOfPrevMonth), lte(sales.soldAt, endOfPrevMonth)));

  return {
    current: {
      revenue: Number(currentMonth[0]?.revenue ?? 0),
      margin: Number(currentMonth[0]?.margin ?? 0),
      count: currentMonth[0]?.count ?? 0,
      avgMargin: Number(currentMonth[0]?.avgMargin ?? 0),
    },
    previous: {
      revenue: Number(previousMonth[0]?.revenue ?? 0),
      margin: Number(previousMonth[0]?.margin ?? 0),
      count: previousMonth[0]?.count ?? 0,
    },
  };
}

export async function getMarginByChannel() {
  const rows = await db
    .select({
      channel: sales.channel,
      avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
      totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .groupBy(sales.channel)
    .orderBy(desc(sql`avg(margin_pct)`));

  return rows.map((r) => ({
    channel: r.channel,
    avgMarginPct: Number(r.avgMarginPct),
    totalMargin: Number(r.totalMargin),
    count: r.count,
  }));
}

export async function getTopBrands(limit: number = 5) {
  const rows = await db
    .select({
      brand: products.brand,
      avgMarginPct: sql<number>`coalesce(avg(sales.margin_pct), 0)::numeric`,
      count: sql<number>`count(sales.id)::int`,
    })
    .from(sales)
    .innerJoin(products, eq(sales.productId, products.id))
    .groupBy(products.brand)
    .orderBy(desc(sql`avg(sales.margin_pct)`))
    .limit(limit);

  return rows.map((r) => ({
    brand: r.brand,
    avgMarginPct: Number(r.avgMarginPct),
    count: r.count,
  }));
}

export async function getRecentSales(limit: number = 5): Promise<SaleWithDetails[]> {
  const all = await getAllSales();
  return all.slice(0, limit);
}

export async function getPendingShipments() {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sales)
    .where(eq(sales.shippingStatus, "a_expedier"));
  return rows[0]?.count ?? 0;
}
