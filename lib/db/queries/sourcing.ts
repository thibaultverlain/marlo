import { db } from "../client";
import { sourcingRequests, customers, products, type SourcingRequest } from "../schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";

type NewSourcingRequest = typeof sourcingRequests.$inferInsert;

export type SourcingWithCustomer = SourcingRequest & {
  customerName: string | null;
  customerEmail: string | null;
  foundProductTitle: string | null;
  foundProductSku: string | null;
};

export async function getAllSourcing(): Promise<SourcingWithCustomer[]> {
  const rows = await db
    .select({
      req: sourcingRequests,
      customer: customers,
      product: products,
    })
    .from(sourcingRequests)
    .leftJoin(customers, eq(sourcingRequests.customerId, customers.id))
    .leftJoin(products, eq(sourcingRequests.foundProductId, products.id))
    .orderBy(desc(sourcingRequests.createdAt));

  return rows.map((r) => ({
    ...r.req,
    customerName: r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : null,
    customerEmail: r.customer?.email ?? null,
    foundProductTitle: r.product?.title ?? null,
    foundProductSku: r.product?.sku ?? null,
  }));
}

export async function getSourcingById(id: string): Promise<SourcingWithCustomer | undefined> {
  const rows = await db
    .select({
      req: sourcingRequests,
      customer: customers,
      product: products,
    })
    .from(sourcingRequests)
    .leftJoin(customers, eq(sourcingRequests.customerId, customers.id))
    .leftJoin(products, eq(sourcingRequests.foundProductId, products.id))
    .where(eq(sourcingRequests.id, id))
    .limit(1);

  const r = rows[0];
  if (!r) return undefined;
  return {
    ...r.req,
    customerName: r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : null,
    customerEmail: r.customer?.email ?? null,
    foundProductTitle: r.product?.title ?? null,
    foundProductSku: r.product?.sku ?? null,
  };
}

export async function getActiveSourcingCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sourcingRequests)
    .where(inArray(sourcingRequests.status, ["ouvert", "en_recherche"]));
  return rows[0]?.count ?? 0;
}

export async function getUpcomingSourcingDeadlines(daysAhead: number = 7): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sourcingRequests)
    .where(
      and(
        inArray(sourcingRequests.status, ["ouvert", "en_recherche"]),
        sql`deadline IS NOT NULL AND deadline <= NOW() + INTERVAL '${sql.raw(String(daysAhead))} days'`
      )
    );
  return rows[0]?.count ?? 0;
}

export async function createSourcingRequest(data: NewSourcingRequest): Promise<SourcingRequest> {
  const rows = await db.insert(sourcingRequests).values(data).returning();
  return rows[0];
}

export async function updateSourcingRequest(id: string, data: Partial<NewSourcingRequest>): Promise<SourcingRequest | undefined> {
  const rows = await db
    .update(sourcingRequests)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(sourcingRequests.id, id))
    .returning();
  return rows[0];
}

export async function deleteSourcingRequest(id: string): Promise<void> {
  await db.delete(sourcingRequests).where(eq(sourcingRequests.id, id));
}

export async function getSourcingStats() {
  const stats = await db
    .select({
      active: sql<number>`count(*) filter (where status in ('ouvert', 'en_recherche'))::int`,
      found: sql<number>`count(*) filter (where status in ('trouve', 'achete', 'livre'))::int`,
      invoiced: sql<number>`count(*) filter (where status = 'facture')::int`,
      totalCommissions: sql<number>`coalesce(sum(commission_amount), 0)::numeric`,
    })
    .from(sourcingRequests);

  return {
    active: stats[0]?.active ?? 0,
    found: stats[0]?.found ?? 0,
    invoiced: stats[0]?.invoiced ?? 0,
    totalCommissions: Number(stats[0]?.totalCommissions ?? 0),
  };
}
