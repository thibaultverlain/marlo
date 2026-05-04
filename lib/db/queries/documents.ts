import { db } from "../client";
import { documents, type NewDocument } from "../schema";
import { eq, and, desc } from "drizzle-orm";

export type Doc = typeof documents.$inferSelect;

export async function getShopDocuments(shopId: string): Promise<Doc[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.shopId, shopId))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentsByCategory(shopId: string, category: string): Promise<Doc[]> {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.shopId, shopId), eq(documents.category, category)))
    .orderBy(desc(documents.createdAt));
}

export async function createDocument(data: NewDocument): Promise<Doc> {
  const rows = await db.insert(documents).values(data).returning();
  return rows[0];
}

export async function deleteDocument(id: string, shopId: string): Promise<void> {
  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.shopId, shopId)));
}
