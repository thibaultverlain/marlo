import { db } from "../client";
import { shopSettings, type ShopSettings, type NewShopSettings } from "../schema";
import { eq, sql } from "drizzle-orm";

export async function getShopSettings(): Promise<ShopSettings | undefined> {
  const rows = await db.select().from(shopSettings).limit(1);
  return rows[0];
}

export async function upsertShopSettings(data: NewShopSettings): Promise<ShopSettings> {
  const existing = await getShopSettings();

  if (existing) {
    const rows = await db
      .update(shopSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shopSettings.id, existing.id))
      .returning();
    return rows[0];
  }

  const rows = await db.insert(shopSettings).values(data).returning();
  return rows[0];
}

// Atomically increments counter and returns next invoice number
// Format: F-2026-0001
export async function getNextInvoiceNumber(): Promise<string> {
  const settings = await getShopSettings();
  if (!settings) {
    throw new Error(
      "Paramètres de facturation manquants. Configure d'abord tes informations légales dans Réglages."
    );
  }

  // Atomic increment
  const result = await db
    .update(shopSettings)
    .set({
      invoiceCounter: sql`${shopSettings.invoiceCounter} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(shopSettings.id, settings.id))
    .returning({ counter: shopSettings.invoiceCounter });

  const counter = result[0]?.counter ?? 1;
  const year = new Date().getFullYear();
  const prefix = settings.invoicePrefix || "F";
  return `${prefix}-${year}-${String(counter).padStart(4, "0")}`;
}
