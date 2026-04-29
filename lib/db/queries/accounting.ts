import { db } from "../client";
import { sales, products, customers, purchases } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

export type RecipeEntry = { date: Date; invoiceNumber: string | null; customerName: string | null; productTitle: string | null; channel: string; amount: number; paymentMethod: string | null };
export type PurchaseEntry = { id: string; date: Date | null; description: string; supplier: string | null; amount: number; paymentMethod: string | null; category: string | null; productSku: string | null; productTitle?: string | null };

export async function getRecipeBook(shopId: string, year?: number): Promise<RecipeEntry[]> {
  const y = year ?? new Date().getFullYear();
  const startOfYear = new Date(y, 0, 1);
  const endOfYear = new Date(y, 11, 31, 23, 59, 59);

  const rows = await db
    .select({
      soldAt: sales.soldAt, invoiceNumber: sales.invoiceNumber, channel: sales.channel,
      amount: sales.salePrice, paymentMethod: sales.paymentMethod,
      productTitle: products.title, customerFirstName: customers.firstName, customerLastName: customers.lastName,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, startOfYear), lte(sales.soldAt, endOfYear)))
    .orderBy(sales.soldAt);

  return rows.map((r) => ({
    date: r.soldAt, invoiceNumber: r.invoiceNumber,
    customerName: r.customerFirstName && r.customerLastName ? `${r.customerFirstName} ${r.customerLastName}` : null,
    productTitle: r.productTitle, channel: r.channel, amount: Number(r.amount), paymentMethod: r.paymentMethod,
  }));
}

export async function getPurchasesRegister(shopId: string, year?: number): Promise<PurchaseEntry[]> {
  const y = year ?? new Date().getFullYear();
  const startOfYear = new Date(y, 0, 1);
  const endOfYear = new Date(y, 11, 31, 23, 59, 59);

  const explicitPurchases = await db
    .select({
      id: purchases.id, purchasedAt: purchases.purchasedAt, description: purchases.description,
      supplier: purchases.supplier, amount: purchases.amount, paymentMethod: purchases.paymentMethod,
      category: purchases.category, productSku: products.sku,
    })
    .from(purchases)
    .leftJoin(products, eq(purchases.productId, products.id))
    .where(eq(purchases.shopId, shopId))
    .orderBy(desc(purchases.createdAt));

  const productPurchases = await db
    .select({
      id: products.id, purchasedAt: products.purchaseDate, description: products.title,
      supplier: products.purchaseSource, amount: products.purchasePrice, productSku: products.sku,
    })
    .from(products)
    .where(and(
      eq(products.shopId, shopId),
      gte(products.purchaseDate, startOfYear.toISOString().split("T")[0]),
      lte(products.purchaseDate, endOfYear.toISOString().split("T")[0])
    ))
    .orderBy(desc(products.purchaseDate));

  const explicit: PurchaseEntry[] = explicitPurchases
    .filter((p) => { if (!p.purchasedAt) return false; const d = new Date(p.purchasedAt); return d >= startOfYear && d <= endOfYear; })
    .map((p) => ({ id: p.id, date: p.purchasedAt ? new Date(p.purchasedAt) : null, description: p.description, supplier: p.supplier, amount: Number(p.amount), paymentMethod: p.paymentMethod, category: p.category, productSku: p.productSku }));

  const implicit: PurchaseEntry[] = productPurchases.map((p) => ({
    id: `prod-${p.id}`, date: p.purchasedAt ? new Date(p.purchasedAt) : null, description: p.description,
    supplier: p.supplier, amount: Number(p.amount), paymentMethod: null, category: "stock", productSku: p.productSku,
  }));

  return [...explicit, ...implicit].sort((a, b) => { if (!a.date) return 1; if (!b.date) return -1; return a.date.getTime() - b.date.getTime(); });
}

export async function getAccountingStats(shopId: string, year?: number) {
  const y = year ?? new Date().getFullYear();
  const startOfYear = new Date(y, 0, 1);
  const endOfYear = new Date(y, 11, 31, 23, 59, 59);

  const [recipesStats, purchasesStats, productsStats] = await Promise.all([
    db.select({ totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`, count: sql<number>`count(*)::int` })
      .from(sales).where(and(eq(sales.shopId, shopId), gte(sales.soldAt, startOfYear), lte(sales.soldAt, endOfYear))),
    db.select({ totalExpenses: sql<number>`coalesce(sum(amount), 0)::numeric`, count: sql<number>`count(*)::int` })
      .from(purchases).where(eq(purchases.shopId, shopId)),
    db.select({ totalPurchases: sql<number>`coalesce(sum(purchase_price), 0)::numeric`, count: sql<number>`count(*)::int` })
      .from(products).where(and(
        eq(products.shopId, shopId),
        gte(products.purchaseDate, startOfYear.toISOString().split("T")[0]),
        lte(products.purchaseDate, endOfYear.toISOString().split("T")[0])
      )),
  ]);

  return {
    revenue: Number(recipesStats[0]?.totalRevenue ?? 0), salesCount: recipesStats[0]?.count ?? 0,
    expenses: Number(purchasesStats[0]?.totalExpenses ?? 0) + Number(productsStats[0]?.totalPurchases ?? 0),
    expensesCount: (purchasesStats[0]?.count ?? 0) + (productsStats[0]?.count ?? 0),
  };
}
