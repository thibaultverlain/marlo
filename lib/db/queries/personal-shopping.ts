import { db } from "../client";
import { personalShoppingMissions, psItems, customers } from "../schema";
import { eq, desc, sql } from "drizzle-orm";

type NewMission = typeof personalShoppingMissions.$inferInsert;
type NewItem = typeof psItems.$inferInsert;

export type PsItemWithCustomer = {
  id: string;
  missionId: string;
  customerId: string;
  customerName: string | null;
  description: string;
  brand: string | null;
  purchasePrice: number;
  commissionRate: number | null;
  commissionAmount: number | null;
  invoiced: boolean | null;
  notes: string | null;
};

export async function getAllMissions(shopId: string) {
  const rows = await db
    .select({
      mission: personalShoppingMissions,
      itemCount: sql<number>`count(${psItems.id})::int`,
    })
    .from(personalShoppingMissions).where(eq(personalShoppingMissions.shopId, shopId))
    .leftJoin(psItems, eq(psItems.missionId, personalShoppingMissions.id))
    .groupBy(personalShoppingMissions.id)
    .orderBy(desc(personalShoppingMissions.eventDate));

  return rows.map((r) => ({
    ...r.mission,
    itemCount: r.itemCount,
  }));
}

export async function getMissionById(id: string) {
  const rows = await db
    .select()
    .from(personalShoppingMissions)
    .where(eq(personalShoppingMissions.id, id))
    .limit(1);
  return rows[0];
}

export async function getMissionItems(missionId: string): Promise<PsItemWithCustomer[]> {
  const rows = await db
    .select({
      item: psItems,
      customer: customers,
    })
    .from(psItems)
    .leftJoin(customers, eq(psItems.customerId, customers.id))
    .where(eq(psItems.missionId, missionId))
    .orderBy(desc(psItems.createdAt));

  return rows.map((r) => ({
    id: r.item.id,
    missionId: r.item.missionId,
    customerId: r.item.customerId,
    customerName: r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : null,
    description: r.item.description,
    brand: r.item.brand,
    purchasePrice: Number(r.item.purchasePrice),
    commissionRate: r.item.commissionRate ? Number(r.item.commissionRate) : null,
    commissionAmount: r.item.commissionAmount ? Number(r.item.commissionAmount) : null,
    invoiced: r.item.invoiced,
    notes: r.item.notes,
  }));
}

export async function createMission(data: NewMission) {
  const rows = await db.insert(personalShoppingMissions).values(data).returning();
  return rows[0];
}

export async function updateMission(id: string, data: Partial<NewMission>) {
  const rows = await db
    .update(personalShoppingMissions)
    .set(data)
    .where(eq(personalShoppingMissions.id, id))
    .returning();
  return rows[0];
}

export async function deleteMission(id: string) {
  await db.delete(personalShoppingMissions).where(eq(personalShoppingMissions.id, id));
}

export async function createPsItem(data: NewItem) {
  const rows = await db.insert(psItems).values(data).returning();

  // Recompute mission totals
  await recomputeMissionTotals(data.missionId);

  return rows[0];
}

export async function deletePsItem(itemId: string) {
  // Get the missionId first
  const item = await db.select().from(psItems).where(eq(psItems.id, itemId)).limit(1);
  const missionId = item[0]?.missionId;

  await db.delete(psItems).where(eq(psItems.id, itemId));

  if (missionId) {
    await recomputeMissionTotals(missionId);
  }
}

async function recomputeMissionTotals(missionId: string) {
  const totals = await db
    .select({
      totalPurchased: sql<number>`coalesce(sum(purchase_price), 0)::numeric`,
      totalCommission: sql<number>`coalesce(sum(commission_amount), 0)::numeric`,
    })
    .from(psItems)
    .where(eq(psItems.missionId, missionId));

  await db
    .update(personalShoppingMissions)
    .set({
      totalPurchased: String(totals[0]?.totalPurchased ?? 0),
      totalCommission: String(totals[0]?.totalCommission ?? 0),
    })
    .where(eq(personalShoppingMissions.id, missionId));
}

export async function getMissionStats(shopId: string) {
  const stats = await db
    .select({
      total: sql<number>`count(*)::int`,
      planned: sql<number>`count(*) filter (where status = 'planifie')::int`,
      completed: sql<number>`count(*) filter (where status in ('termine', 'facture'))::int`,
      totalCommissions: sql<number>`coalesce(sum(total_commission), 0)::numeric`,
    })
    .from(personalShoppingMissions)
    .where(eq(personalShoppingMissions.shopId, shopId));

  return {
    total: stats[0]?.total ?? 0,
    planned: stats[0]?.planned ?? 0,
    completed: stats[0]?.completed ?? 0,
    totalCommissions: Number(stats[0]?.totalCommissions ?? 0),
  };
}
