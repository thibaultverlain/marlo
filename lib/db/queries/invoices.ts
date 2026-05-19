import { db } from "../client";
import { invoices, customers, sales, sourcingRequests, personalShoppingMissions, type Invoice, type NewInvoice } from "../schema";
import { eq, desc, sql } from "drizzle-orm";

export type InvoiceWithDetails = Invoice & { customerName: string | null; customerEmail: string | null };

export async function getAllInvoices(shopId: string): Promise<InvoiceWithDetails[]> {
  const rows = await db
    .select({ inv: invoices, customer: customers })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.shopId, shopId))
    .orderBy(desc(invoices.createdAt));
  return rows.map((r) => ({ ...r.inv, customerName: r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : null, customerEmail: r.customer?.email ?? null }));
}

export async function getInvoiceById(id: string): Promise<Invoice | undefined> {
  const rows = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return rows[0];
}

export async function getInvoiceWithSale(id: string) {
  const rows = await db
    .select({ invoice: invoices, customer: customers, sale: sales, sourcing: sourcingRequests, psMission: personalShoppingMissions })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(sales, eq(invoices.relatedSaleId, sales.id))
    .leftJoin(sourcingRequests, eq(invoices.relatedSourcingId, sourcingRequests.id))
    .leftJoin(personalShoppingMissions, eq(invoices.relatedPsMissionId, personalShoppingMissions.id))
    .where(eq(invoices.id, id)).limit(1);
  return rows[0];
}

export async function createInvoice(data: NewInvoice): Promise<Invoice> {
  const rows = await db.insert(invoices).values(data).returning();
  return rows[0];
}

export async function updateInvoice(id: string, data: Partial<NewInvoice>): Promise<Invoice | undefined> {
  const rows = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
  return rows[0];
}

export async function getInvoiceStats(shopId: string) {
  const stats = await db
    .select({
      total: sql<number>`count(*)::int`,
      totalAmount: sql<number>`coalesce(sum(amount_ttc), 0)::numeric`,
      paid: sql<number>`count(*) filter (where status = 'payee')::int`,
      paidAmount: sql<number>`coalesce(sum(amount_ttc) filter (where status = 'payee'), 0)::numeric`,
      sent: sql<number>`count(*) filter (where status = 'envoyee')::int`,
      sentAmount: sql<number>`coalesce(sum(amount_ttc) filter (where status = 'envoyee'), 0)::numeric`,
      draft: sql<number>`count(*) filter (where status = 'brouillon')::int`,
      draftAmount: sql<number>`coalesce(sum(amount_ttc) filter (where status = 'brouillon'), 0)::numeric`,
      overdueCount: sql<number>`count(*) filter (where status = 'envoyee' and created_at < NOW() - INTERVAL '30 days')::int`,
    })
    .from(invoices)
    .where(eq(invoices.shopId, shopId));
  return {
    total: stats[0]?.total ?? 0,
    totalAmount: Number(stats[0]?.totalAmount ?? 0),
    paid: stats[0]?.paid ?? 0,
    paidAmount: Number(stats[0]?.paidAmount ?? 0),
    sent: stats[0]?.sent ?? 0,
    sentAmount: Number(stats[0]?.sentAmount ?? 0),
    draft: stats[0]?.draft ?? 0,
    draftAmount: Number(stats[0]?.draftAmount ?? 0),
    overdueCount: stats[0]?.overdueCount ?? 0,
  };
}
