import { db } from "../client";
import { returns, sales, products, type NewReturn, type Return } from "../schema";
import { eq, and, desc } from "drizzle-orm";

export async function getReturns(shopId: string) {
  return db
    .select({
      id: returns.id,
      shopId: returns.shopId,
      saleId: returns.saleId,
      productId: returns.productId,
      reason: returns.reason,
      status: returns.status,
      refundAmount: returns.refundAmount,
      restockProduct: returns.restockProduct,
      notes: returns.notes,
      createdAt: returns.createdAt,
      resolvedAt: returns.resolvedAt,
    })
    .from(returns)
    .where(eq(returns.shopId, shopId))
    .orderBy(desc(returns.createdAt));
}

export async function createReturn(data: NewReturn): Promise<Return> {
  const rows = await db.insert(returns).values(data).returning();
  return rows[0];
}

export async function resolveReturn(id: string, shopId: string, status: "rembourse" | "refuse", refundAmount?: string): Promise<void> {
  const returnRow = await db.select().from(returns).where(and(eq(returns.id, id), eq(returns.shopId, shopId))).limit(1);
  if (!returnRow[0]) throw new Error("Retour introuvable");

  await db.update(returns).set({
    status,
    resolvedAt: new Date(),
    refundAmount: refundAmount ?? returnRow[0].refundAmount,
  }).where(eq(returns.id, id));

  // If accepted + restock, put product back in stock
  if (status === "rembourse" && returnRow[0].restockProduct && returnRow[0].productId) {
    const { updateProduct } = await import("./products");
    await updateProduct(returnRow[0].productId, { status: "en_stock" });
  }

  // Update sale payment status if refunded
  if (status === "rembourse") {
    await db.update(sales).set({ paymentStatus: "rembourse" }).where(eq(sales.id, returnRow[0].saleId));
  }
}

export async function getReturnsBySale(saleId: string) {
  return db.select().from(returns).where(eq(returns.saleId, saleId));
}
