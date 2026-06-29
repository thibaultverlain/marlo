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
      prepChecklist: sales.prepChecklist,
      disputeStatus: sales.disputeStatus,
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

export async function updateShippingStatus(saleId: string, shopId: string, status: string, trackingNumber?: string, restock: boolean = false) {
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
  // Handle return: restock product if requested + mark payment as refunded
  if (status === "retourne") {
    const [sale] = await db.select({ productId: sales.productId }).from(sales).where(eq(sales.id, saleId)).limit(1);
    if (sale?.productId && restock) {
      const { updateProduct } = await import("./products");
      await updateProduct(sale.productId, { status: "en_stock" });
    }
    data.paymentStatus = "rembourse";
  }
  await db.update(sales).set(data).where(and(eq(sales.id, saleId), eq(sales.shopId, shopId)));
}

export async function updatePaymentStatus(saleId: string, shopId: string, status: string) {
  await db.update(sales).set({ paymentStatus: status as any }).where(and(eq(sales.id, saleId), eq(sales.shopId, shopId)));
}

export async function getOrderDetail(shopId: string, saleId: string) {
  const rows = await db
    .select({
      id: sales.id,
      shopId: sales.shopId,
      productId: sales.productId,
      customerId: sales.customerId,
      channel: sales.channel,
      salePrice: sales.salePrice,
      platformFees: sales.platformFees,
      shippingCost: sales.shippingCost,
      netRevenue: sales.netRevenue,
      margin: sales.margin,
      marginPct: sales.marginPct,
      paymentMethod: sales.paymentMethod,
      paymentStatus: sales.paymentStatus,
      shippingStatus: sales.shippingStatus,
      trackingNumber: sales.trackingNumber,
      invoiceNumber: sales.invoiceNumber,
      soldAt: sales.soldAt,
      notes: sales.notes,
      prepChecklist: sales.prepChecklist,
      disputeStatus: sales.disputeStatus,
      disputeReason: sales.disputeReason,
      disputeOpenedAt: sales.disputeOpenedAt,
      disputeResolvedAt: sales.disputeResolvedAt,
      shippingPhotos: sales.shippingPhotos,
      productTitle: products.title,
      productBrand: products.brand,
      productSku: products.sku,
      productImages: products.images,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      customerCity: customers.city,
      customerPostalCode: customers.postalCode,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(eq(sales.shopId, shopId), eq(sales.id, saleId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updatePrepChecklist(saleId: string, shopId: string, checklist: Record<string, boolean>) {
  await db.update(sales).set({ prepChecklist: checklist }).where(and(eq(sales.id, saleId), eq(sales.shopId, shopId)));
}

export async function setDispute(
  saleId: string, shopId: string,
  status: string | null, reason: string | null
) {
  const now = new Date();
  const update: any = { disputeStatus: status, disputeReason: reason };
  if (status === "ouvert") update.disputeOpenedAt = now;
  if (status === null || (status && status !== "ouvert")) update.disputeResolvedAt = now;
  await db.update(sales).set(update).where(and(eq(sales.id, saleId), eq(sales.shopId, shopId)));
}

export async function setShippingPhotos(saleId: string, shopId: string, photos: string[]) {
  await db.update(sales).set({ shippingPhotos: photos }).where(and(eq(sales.id, saleId), eq(sales.shopId, shopId)));
}
