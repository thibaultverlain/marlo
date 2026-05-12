import { db } from "../client";
import { priceHistory, products } from "../schema";
import { eq, and, desc } from "drizzle-orm";

export async function getPriceHistory(productId: string) {
  return db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.productId, productId))
    .orderBy(desc(priceHistory.changedAt));
}

export async function recordPriceChange(
  productId: string,
  shopId: string,
  changedBy: string,
  oldPrice: string | null,
  newPrice: string,
  field: "target_price" | "purchase_price" = "target_price",
  reason?: string
) {
  await db.insert(priceHistory).values({
    productId,
    shopId,
    oldPrice,
    newPrice,
    field,
    changedBy,
    reason: reason || null,
  });
}
