import { db } from "../client";
import { shopSettings, type ShopSettings, type NewShopSettings } from "../schema";
import { eq, sql } from "drizzle-orm";

export async function getShopSettings(userId: string): Promise<ShopSettings | undefined> {
  const rows = await db.select().from(shopSettings).where(eq(shopSettings.userId, userId)).limit(1);
  return rows[0];
}

export async function upsertShopSettings(userId: string, data: Omit<NewShopSettings, "userId">): Promise<ShopSettings> {
  const existing = await getShopSettings(userId);

  if (existing) {
    const rows = await db
      .update(shopSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shopSettings.id, existing.id))
      .returning();
    return rows[0];
  }

  const rows = await db.insert(shopSettings).values({ ...data, userId }).returning();
  return rows[0];
}

export async function getNextInvoiceNumber(userId: string): Promise<string> {
  const settings = await getShopSettings(userId);
  if (!settings) {
    throw new Error("Paramètres de facturation manquants. Configure d'abord tes informations légales dans Réglages.");
  }

  const result = await db
    .update(shopSettings)
    .set({ invoiceCounter: sql`${shopSettings.invoiceCounter} + 1`, updatedAt: new Date() })
    .where(eq(shopSettings.id, settings.id))
    .returning({ counter: shopSettings.invoiceCounter });

  const counter = result[0]?.counter ?? 1;
  const year = new Date().getFullYear();
  const prefix = settings.invoicePrefix || "F";
  return `${prefix}-${year}-${String(counter).padStart(4, "0")}`;
}
