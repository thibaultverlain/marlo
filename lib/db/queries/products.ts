import { db } from "../client";
import { products, sales, type NewProduct, type Product } from "../schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";

export async function getAllProducts(shopId: string): Promise<Product[]> {
  return db.select().from(products).where(eq(products.shopId, shopId)).orderBy(desc(products.createdAt));
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return rows[0];
}

export async function getInStockProducts(shopId: string): Promise<Product[]> {
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.shopId, shopId),
        inArray(products.status, ["en_stock", "en_vente", "reserve"])
      )
    )
    .orderBy(desc(products.createdAt));
}

export async function getDormantProducts(shopId: string, thresholdDays: number = 30): Promise<Product[]> {
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.shopId, shopId),
        inArray(products.status, ["en_stock", "en_vente"]),
        sql`${products.createdAt} < NOW() - make_interval(days => ${thresholdDays})`
      )
    )
    .orderBy(products.createdAt);
}

export async function getNextSku(shopId: string): Promise<string> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.shopId, shopId));
  const count = result[0]?.count ?? 0;
  return `MAR-${String(count + 1).padStart(4, "0")}`;
}

export async function createProduct(data: Omit<NewProduct, "sku"> & { sku?: string }): Promise<Product> {
  const sku = data.sku ?? (await getNextSku(data.shopId ?? data.userId));
  const rows = await db
    .insert(products)
    .values({ ...data, sku })
    .returning();
  return rows[0];
}

export async function updateProduct(id: string, data: Partial<NewProduct>): Promise<Product | undefined> {
  const rows = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return rows[0];
}

export async function deleteProduct(id: string, shopId?: string): Promise<void> {
  await db.update(sales).set({ productId: null }).where(eq(sales.productId, id));
  const conditions = shopId
    ? and(eq(products.id, id), eq(products.shopId, shopId))
    : eq(products.id, id);
  await db.delete(products).where(conditions);
}

export async function getStockStats(shopId: string) {
  const stats = await db
    .select({
      total: sql<number>`count(*)::int`,
      inStock: sql<number>`count(*) filter (where status in ('en_stock', 'en_vente', 'reserve'))::int`,
      sold: sql<number>`count(*) filter (where status in ('vendu', 'expedie', 'livre'))::int`,
      totalValue: sql<number>`coalesce(sum(purchase_price) filter (where status in ('en_stock', 'en_vente', 'reserve')), 0)::numeric`,
      targetValue: sql<number>`coalesce(sum(target_price) filter (where status in ('en_stock', 'en_vente', 'reserve')), 0)::numeric`,
      dormant: sql<number>`count(*) filter (where status in ('en_stock', 'en_vente') and created_at < NOW() - INTERVAL '30 days')::int`,
    })
    .from(products)
    .where(eq(products.shopId, shopId));

  return stats[0];
}
