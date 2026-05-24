import { db } from "../client";
import { shopEmailCredentials, type ShopEmailCredentials, type NewShopEmailCredentials, teamMembers } from "../schema";
import { eq, and } from "drizzle-orm";

export async function getCredentialsByShop(shopId: string): Promise<ShopEmailCredentials | undefined> {
  const rows = await db
    .select()
    .from(shopEmailCredentials)
    .where(eq(shopEmailCredentials.shopId, shopId))
    .limit(1);
  return rows[0];
}

export async function upsertCredentials(
  shopId: string,
  data: Omit<NewShopEmailCredentials, "shopId" | "id" | "createdAt" | "updatedAt">,
): Promise<ShopEmailCredentials> {
  const existing = await getCredentialsByShop(shopId);
  if (existing) {
    const rows = await db
      .update(shopEmailCredentials)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shopEmailCredentials.shopId, shopId))
      .returning();
    return rows[0];
  }
  const rows = await db
    .insert(shopEmailCredentials)
    .values({ ...data, shopId })
    .returning();
  return rows[0];
}

export async function deleteCredentials(shopId: string): Promise<void> {
  await db.delete(shopEmailCredentials).where(eq(shopEmailCredentials.shopId, shopId));
}

export async function setActive(shopId: string, active: boolean): Promise<void> {
  await db
    .update(shopEmailCredentials)
    .set({ active, updatedAt: new Date() })
    .where(eq(shopEmailCredentials.shopId, shopId));
}

export async function updatePollResult(
  shopId: string,
  status: string,
  error: string | null,
): Promise<void> {
  await db
    .update(shopEmailCredentials)
    .set({
      lastPollAt: new Date(),
      lastPollStatus: status,
      lastError: error,
      updatedAt: new Date(),
    })
    .where(eq(shopEmailCredentials.shopId, shopId));
}

/**
 * Charge tous les shops actifs + le owner_id pour creer les ventes.
 * Utilise par le cron.
 */
export async function getActiveCredentialsForPolling(): Promise<
  Array<{ creds: ShopEmailCredentials; ownerId: string }>
> {
  const rows = await db
    .select({
      creds: shopEmailCredentials,
      ownerId: teamMembers.userId,
    })
    .from(shopEmailCredentials)
    .innerJoin(
      teamMembers,
      and(
        eq(teamMembers.shopId, shopEmailCredentials.shopId),
        eq(teamMembers.role, "owner"),
      ),
    )
    .where(eq(shopEmailCredentials.active, true));
  return rows;
}
