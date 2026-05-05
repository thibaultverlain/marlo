import { db } from "../client";
import { sales, products, customers } from "../schema";
import { eq, and, inArray, desc, sql, isNotNull } from "drizzle-orm";

export async function getOrdersByStatus(shopId: string, status?: string) {
  const conditions = [eq(sales.shopId, shopId), isNotNull(sales.shippingStatus)];
  if (status && status !== "all") {
    conditions.push(eq(sales.shippingStatus, status as any));
  }

  return db
    .select({
      id: sales.id,
      productId: sales.productId,
      customerId: sales.customerId,
      channel: sales.channel,
      salePrice: sales.salePrice,
      shippingStatus: sales.shippingStatus,
      paymentStatus: sales.paymentStatus,
      trackingNumber: sales.trackingNumber,
      soldAt: sales.soldAt,
      notes: sales.notes,
      productTitle: products.title,
      productBrand: products.brand,
      productSku: products.sku,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(
      sql`CASE WHEN shipping_status = 'a_expedier' THEN 0 WHEN shipping_status = 'expedie' THEN 1 WHEN shipping_status = 'livre' THEN 2 ELSE 3 END`,
      desc(sales.soldAt)
    );
}

export async function getOrderCounts(shopId: string) {
  const rows = await db
    .select({
      total: sql<number>`count(*) filter (where shipping_status is not null)::int`,
      aExpedier: sql<number>`count(*) filter (where shipping_status = 'a_expedier')::int`,
      expedie: sql<number>`count(*) filter (where shipping_status = 'expedie')::int`,
      livre: sql<number>`count(*) filter (where shipping_status = 'livre')::int`,
      retourne: sql<number>`count(*) filter (where shipping_status = 'retourne')::int`,
      enAttentePaiement: sql<number>`count(*) filter (where payment_status = 'en_attente' and shipping_status is not null)::int`,
    })
    .from(sales)
    .where(eq(sales.shopId, shopId));

  return rows[0] ?? { total: 0, aExpedier: 0, expedie: 0, livre: 0, retourne: 0, enAttentePaiement: 0 };
}

export async function updateShippingStatus(saleId: string, shopId: string, status: string, trackingNumber?: string) {
  const data: any = { shippingStatus: status };
  if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
  // Auto-update product status when shipped/delivered
  if (status === "expedie" || status === "livre") {
    const [sale] = await db.select({ productId: sales.productId }).from(sales).where(eq(sales.id, saleId)).limit(1);
    if (sale?.productId) {
      const { updateProduct } = await import("./products");
      await updateProduct(sale.productId, { status: status === "livre" ? "livre" : "expedie" });
    }
  }
  await db.update(sales).set(data).where(and(eq(sales.id, saleId), eq(sales.shopId, shopId)));
}

export async function updatePaymentStatus(saleId: string, shopId: string, status: string) {
  await db.update(sales).set({ paymentStatus: status as any }).where(and(eq(sales.id, saleId), eq(sales.shopId, shopId)));
}
