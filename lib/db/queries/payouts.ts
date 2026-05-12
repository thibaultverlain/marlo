import { db } from "../client";
import { payouts, payoutSales, sales, type NewPayout, type Payout } from "../schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function getPayouts(shopId: string): Promise<(Payout & { saleCount: number })[]> {
  const rows = await db
    .select({
      id: payouts.id,
      shopId: payouts.shopId,
      platform: payouts.platform,
      expectedAmount: payouts.expectedAmount,
      receivedAmount: payouts.receivedAmount,
      expectedDate: payouts.expectedDate,
      receivedDate: payouts.receivedDate,
      status: payouts.status,
      reference: payouts.reference,
      notes: payouts.notes,
      createdAt: payouts.createdAt,
      saleCount: sql<number>`count(ps.id)::int`,
    })
    .from(payouts)
    .leftJoin(payoutSales, eq(payoutSales.payoutId, payouts.id))
    .where(eq(payouts.shopId, shopId))
    .groupBy(payouts.id)
    .orderBy(desc(payouts.createdAt));

  return rows as any;
}

export async function getPayoutStats(shopId: string) {
  const rows = await db
    .select({
      totalExpected: sql<number>`coalesce(sum(expected_amount), 0)::numeric`,
      totalReceived: sql<number>`coalesce(sum(received_amount), 0)::numeric`,
      pending: sql<number>`count(*) filter (where status = 'en_attente')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(payouts)
    .where(eq(payouts.shopId, shopId));

  return rows[0];
}

export async function createPayout(data: NewPayout): Promise<Payout> {
  const rows = await db.insert(payouts).values(data).returning();
  return rows[0];
}

export async function updatePayout(id: string, shopId: string, data: Partial<NewPayout>): Promise<Payout | undefined> {
  const rows = await db
    .update(payouts)
    .set(data)
    .where(and(eq(payouts.id, id), eq(payouts.shopId, shopId)))
    .returning();
  return rows[0];
}

export async function deletePayout(id: string, shopId: string): Promise<void> {
  await db.delete(payoutSales).where(eq(payoutSales.payoutId, id));
  await db.delete(payouts).where(and(eq(payouts.id, id), eq(payouts.shopId, shopId)));
}

export async function linkSaleToPayout(payoutId: string, saleId: string): Promise<void> {
  await db.insert(payoutSales).values({ payoutId, saleId }).onConflictDoNothing();
  // Update sale payment status
  await db.update(sales).set({ paymentStatus: "recu" }).where(eq(sales.id, saleId));
}

export async function unlinkSaleFromPayout(payoutId: string, saleId: string): Promise<void> {
  await db.delete(payoutSales).where(and(eq(payoutSales.payoutId, payoutId), eq(payoutSales.saleId, saleId)));
}

export async function getPayoutSales(payoutId: string) {
  return db
    .select({
      id: payoutSales.id,
      saleId: payoutSales.saleId,
    })
    .from(payoutSales)
    .where(eq(payoutSales.payoutId, payoutId));
}

// Get unlinked sales for a platform that are awaiting payment
export async function getUnlinkedSalesForPlatform(shopId: string, platform: string) {
  const linked = await db.select({ saleId: payoutSales.saleId }).from(payoutSales)
    .innerJoin(payouts, eq(payouts.id, payoutSales.payoutId));
  const linkedIds = linked.map((r) => r.saleId);

  const query = db.select({
    id: sales.id,
    salePrice: sales.salePrice,
    netRevenue: sales.netRevenue,
    soldAt: sales.soldAt,
    channel: sales.channel,
  })
  .from(sales)
  .where(and(eq(sales.shopId, shopId), eq(sales.channel, platform as any), eq(sales.paymentStatus, "en_attente")));

  return query;
}
