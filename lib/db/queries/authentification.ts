import { db } from "../client";
import { authenticityChecks, type AuthenticityCheck, type NewAuthenticityCheck } from "../schema";
import { eq, and, desc } from "drizzle-orm";

export async function getShopAuthChecks(shopId: string): Promise<AuthenticityCheck[]> {
  return db
    .select()
    .from(authenticityChecks)
    .where(eq(authenticityChecks.shopId, shopId))
    .orderBy(desc(authenticityChecks.createdAt));
}

export async function getAuthCheckById(id: string): Promise<AuthenticityCheck | undefined> {
  const rows = await db
    .select()
    .from(authenticityChecks)
    .where(eq(authenticityChecks.id, id))
    .limit(1);
  return rows[0];
}

export async function getProductAuthChecks(productId: string, shopId: string): Promise<AuthenticityCheck[]> {
  return db
    .select()
    .from(authenticityChecks)
    .where(and(eq(authenticityChecks.productId, productId), eq(authenticityChecks.shopId, shopId)))
    .orderBy(desc(authenticityChecks.createdAt));
}

export async function createAuthCheck(data: NewAuthenticityCheck): Promise<AuthenticityCheck> {
  const rows = await db.insert(authenticityChecks).values(data).returning();
  return rows[0];
}

export async function deleteAuthCheck(id: string, shopId: string): Promise<void> {
  await db
    .delete(authenticityChecks)
    .where(and(eq(authenticityChecks.id, id), eq(authenticityChecks.shopId, shopId)));
}
