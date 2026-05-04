import { db } from "../client";
import { templates, type NewTemplate, type Template } from "../schema";
import { eq, and, desc } from "drizzle-orm";

export async function getShopTemplates(shopId: string): Promise<Template[]> {
  return db
    .select()
    .from(templates)
    .where(eq(templates.shopId, shopId))
    .orderBy(desc(templates.createdAt));
}

export async function getTemplatesByType(shopId: string, type: string): Promise<Template[]> {
  return db
    .select()
    .from(templates)
    .where(and(eq(templates.shopId, shopId), eq(templates.type, type)))
    .orderBy(desc(templates.createdAt));
}

export async function getTemplateById(id: string): Promise<Template | undefined> {
  const rows = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return rows[0];
}

export async function createTemplate(data: NewTemplate): Promise<Template> {
  const rows = await db.insert(templates).values(data).returning();
  return rows[0];
}

export async function updateTemplate(id: string, shopId: string, data: Partial<NewTemplate>): Promise<Template | undefined> {
  const rows = await db
    .update(templates)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(templates.id, id), eq(templates.shopId, shopId)))
    .returning();
  return rows[0];
}

export async function deleteTemplate(id: string, shopId: string): Promise<void> {
  await db.delete(templates).where(and(eq(templates.id, id), eq(templates.shopId, shopId)));
}
